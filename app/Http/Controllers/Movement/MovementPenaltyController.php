<?php

namespace App\Http\Controllers\Movement;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Movement;
use App\Models\MovementLogBook;
use App\Models\MovementPenalty;
use App\Services\MovementPenaltySyncService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MovementPenaltyController extends Controller
{
    use PaginatesForInertia;

    /**
     * Display the fine payment page for an employee with an active unpaid penalty.
     */
    public function showPaymentPage(Request $request)
    {
        $user = Auth::user();

        $penalty = MovementPenalty::with(['movement', 'employee.branch'])
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->employee_id) {
                    $query->orWhere('employee_id', $user->employee_id);
                }
            })
            ->whereIn('status', ['unpaid', 'pending_verification', 'rejected'])
            ->latest()
            ->first();

        // If no active penalty found, redirect to dashboard/home
        if (! $penalty && ! $user->isSuperAdmin()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('movement/penalty-payment', [
            'penalty' => $penalty,
            'merchantNumbers' => [
                'bkash' => config('services.payment.bkash_number', '01717893432'),
                'nagad' => config('services.payment.nagad_number', '01717893432'),
            ],
        ]);
    }

    /**
     * Submit payment bKash/Nagad Sender Number / Transaction ID.
     */
    public function submitTransaction(Request $request)
    {
        $validated = $request->validate([
            'penalty_id' => 'required|exists:movement_penalties,id',
            'payment_method' => 'required|in:bkash,nagad',
            'sender_number' => 'nullable|string|max:14',
            'transaction_id' => 'nullable|string|max:30',
        ]);

        if (empty($validated['sender_number']) && empty($validated['transaction_id'])) {
            return redirect()->back()->with('error', 'প্রেরকের মোবাইল নম্বর অথবা Transaction ID (TrxID) এর যেকোনো একটি প্রদান করুন।');
        }

        $user = Auth::user();

        $penalty = MovementPenalty::with(['movement.employee.branch'])
            ->where('id', $validated['penalty_id'])
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->employee_id) {
                    $query->orWhere('employee_id', $user->employee_id);
                }
            })
            ->firstOrFail();

        // Update Penalty Record to pending_verification
        $penalty->update([
            'payment_method' => $validated['payment_method'],
            'sender_number' => trim($validated['sender_number'] ?? ''),
            'transaction_id' => strtoupper(trim($validated['transaction_id'] ?? '')),
            'payment_submitted_at' => now(),
            'status' => 'pending_verification',
        ]);

        return redirect()->back()->with('success', 'আপনার জরিমানা পেমেন্ট তথ্য জমা নেওয়া হয়েছে। এডমিন ভেরিফাই করে আপনার আইডি আনলক করবেন।');
    }

    /**
     * Admin view to manage and verify all movement penalties.
     */
    public function adminIndex(Request $request)
    {
        $this->authorizeAdmin($request);

        $perPage = $this->resolvePerPage($request->get('per_page'), 15);

        $baseQuery = MovementPenalty::with(['movement', 'employee.branch', 'user', 'approver']);

        // 1. Search Filter
        if ($request->filled('search')) {
            $search = trim($request->search);
            $baseQuery->where(function ($q) use ($search) {
                $q->where('sender_number', 'like', "%{$search}%")
                    ->orWhere('transaction_id', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($empQ) use ($search) {
                        $empQ->where('name_en', 'like', "%{$search}%")
                            ->orWhere('name_bn', 'like', "%{$search}%")
                            ->orWhere('employee_id', 'like', "%{$search}%")
                            ->orWhere('pin', 'like', "%{$search}%");
                    });
            });
        }

        // 2. Branch Filter
        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $branchId = $request->branch_id;
            $baseQuery->whereHas('employee', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        }

        // 3. Date Range Filter
        if ($request->filled('start_date')) {
            $baseQuery->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $baseQuery->whereDate('created_at', '<=', $request->end_date);
        }

        // Default tab selection
        $pendingCount = (clone $baseQuery)->where('status', 'pending_verification')->count();
        $defaultTab = $pendingCount > 0 ? 'pending' : 'all';
        $tab = $request->input('tab', $defaultTab);

        if ($request->filled('status') && $request->status !== 'all') {
            $tab = 'all';
        }

        // Tab 1: Pending Payment Submissions Query (tab = pending)
        $pendingQuery = (clone $baseQuery)->where('status', 'pending_verification');
        $pendingPaginator = $pendingQuery->orderByDesc('id')->paginate($perPage, ['*'], 'pending_page')->withQueryString();
        $pendingPenalties = $this->inertiaPagination($pendingPaginator);

        // Tab 2: Paid Penalties Query (tab = paid -> approved WITH payment info)
        $paidQuery = (clone $baseQuery)->where('status', 'approved')->where(function ($q) {
            $q->where(function ($sq) {
                $sq->whereNotNull('sender_number')->where('sender_number', '!=', '');
            })->orWhere(function ($sq) {
                $sq->whereNotNull('transaction_id')->where('transaction_id', '!=', '');
            });
        });
        $paidStats = [
            'count' => (clone $paidQuery)->count(),
            'total_amount' => (float) (clone $paidQuery)->sum('total_fine'),
            'total_overdue_days' => (int) (clone $paidQuery)->sum('overdue_days'),
        ];
        $allPaidPenalties = (clone $paidQuery)->orderByDesc('id')->get();
        $paidPaginator = $paidQuery->orderByDesc('id')->paginate($perPage, ['*'], 'paid_page')->withQueryString();
        $paidPenalties = $this->inertiaPagination($paidPaginator);

        // Tab 3: Waived Penalties Query (tab = waived -> approved WITHOUT payment info)
        $waivedQuery = (clone $baseQuery)->where('status', 'approved')->where(function ($q) {
            $q->where(function ($sq) {
                $sq->whereNull('sender_number')->orWhere('sender_number', '');
            })->where(function ($sq) {
                $sq->whereNull('transaction_id')->orWhere('transaction_id', '');
            });
        });
        $waivedStats = [
            'count' => (clone $waivedQuery)->count(),
            'total_amount' => (float) (clone $waivedQuery)->sum('total_fine'),
            'total_overdue_days' => (int) (clone $waivedQuery)->sum('overdue_days'),
        ];
        $waivedPaginator = $waivedQuery->orderByDesc('id')->paginate($perPage, ['*'], 'waived_page')->withQueryString();
        $waivedPenalties = $this->inertiaPagination($waivedPaginator);

        // Tab 4: Rejected Penalties Query (tab = rejected -> status = rejected)
        $rejectedQuery = (clone $baseQuery)->where('status', 'rejected');
        $rejectedPaginator = $rejectedQuery->orderByDesc('id')->paginate($perPage, ['*'], 'rejected_page')->withQueryString();
        $rejectedPenalties = $this->inertiaPagination($rejectedPaginator);

        // Tab 5: Unpaid Penalties Query (tab = unpaid -> status = unpaid)
        $unpaidQuery = (clone $baseQuery)->where('status', 'unpaid');
        $unpaidPaginator = $unpaidQuery->orderByDesc('id')->paginate($perPage, ['*'], 'unpaid_page')->withQueryString();
        $unpaidPenalties = $this->inertiaPagination($unpaidPaginator);

        // Tab 6: All Penalties Query (tab = all)
        $allQuery = clone $baseQuery;
        if ($request->filled('status') && $request->status !== 'all') {
            $allQuery->where('status', $request->status);
        }
        $allPaginator = $allQuery->orderByDesc('id')->paginate($perPage, ['*'], 'all_page')->withQueryString();
        $allPenalties = $this->inertiaPagination($allPaginator);

        // Comprehensive Stats - Using (clone $baseQuery) so filters update counts dynamically
        $stats = [
            'unpaid_count' => (clone $baseQuery)->where('status', 'unpaid')->count(),
            'pending_count' => (clone $baseQuery)->where('status', 'pending_verification')->count(),
            'approved_count' => (clone $baseQuery)->where('status', 'approved')->count(),
            'paid_count' => (clone $baseQuery)->where('status', 'approved')->where(function ($q) {
                $q->where(function ($sq) {
                    $sq->whereNotNull('sender_number')->where('sender_number', '!=', '');
                })->orWhere(function ($sq) {
                    $sq->whereNotNull('transaction_id')->where('transaction_id', '!=', '');
                });
            })->count(),
            'waived_count' => (clone $baseQuery)->where('status', 'approved')->where(function ($q) {
                $q->where(function ($sq) {
                    $sq->whereNull('sender_number')->orWhere('sender_number', '');
                })->where(function ($sq) {
                    $sq->whereNull('transaction_id')->orWhere('transaction_id', '');
                });
            })->count(),
            'rejected_count' => (clone $baseQuery)->where('status', 'rejected')->count(),
            'total_count' => (clone $baseQuery)->count(),
            'total_fine_amount' => (float) (clone $baseQuery)->sum('total_fine'),
        ];

        // Branches list for filter dropdown
        $branches = \App\Models\Branch::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('movement/penalty-admin', [
            'pendingPenalties' => $pendingPenalties,
            'paidPenalties' => $paidPenalties,
            'allPaidPenalties' => $allPaidPenalties,
            'waivedPenalties' => $waivedPenalties,
            'rejectedPenalties' => $rejectedPenalties,
            'unpaidPenalties' => $unpaidPenalties,
            'allPenalties' => $allPenalties,
            'stats' => $stats,
            'paidStats' => $paidStats,
            'waivedStats' => $waivedStats,
            'branches' => $branches,
            'tab' => $tab,
            'filters' => [
                'status' => $request->get('status', 'all'),
                'search' => $request->get('search', ''),
                'branch_id' => $request->get('branch_id', 'all'),
                'start_date' => $request->get('start_date', ''),
                'end_date' => $request->get('end_date', ''),
                'tab' => $tab,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Admin approves penalty (or waives fine without payment) and unlocks the user.
     */
    public function approvePenalty(Request $request, $id)
    {
        $this->authorizeAdmin($request);

        $penalty = MovementPenalty::with('movement')->findOrFail($id);
        $wasUnpaidOrRejected = in_array($penalty->status, ['unpaid', 'rejected'], true);

        DB::beginTransaction();
        try {
            $defaultRemark = $wasUnpaidOrRejected
                ? 'Waived by Admin without payment and account unlocked.'
                : 'Payment verified and account unlocked.';

            // If waiving a rejected/unpaid penalty, clear invalid transaction details so it ranks as waived
            if ($wasUnpaidOrRejected) {
                $penalty->sender_number = null;
                $penalty->transaction_id = null;
            }

            $penalty->update([
                'status' => 'approved',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'admin_remarks' => $request->input('admin_remarks', $defaultRemark),
            ]);

            $movement = $penalty->movement;
            if ($movement) {
                // Note: The movement remains active (open) as per requirements.
                // The employee will close their movement normally when they complete it.
                $this->applyAttendanceOnPenaltyApproval(
                    $movement->fresh(),
                    $penalty->fresh(),
                    $wasUnpaidOrRejected
                );
            }

            DB::commit();

            $message = $wasUnpaidOrRejected
                ? 'Penalty waived without payment and account unlocked successfully.'
                : 'Penalty payment approved successfully and account unlocked.';

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error approving penalty: '.$e->getMessage());
        }
    }

    /**
     * Admin rejects penalty payment submission.
     */
    public function rejectPenalty(Request $request, $id)
    {
        $this->authorizeAdmin($request);

        $penalty = MovementPenalty::findOrFail($id);

        if ($penalty->status !== 'pending_verification') {
            return redirect()->back()->with('error', 'Cannot reject a penalty that has no submitted transaction.');
        }

        $request->validate([
            'admin_remarks' => 'required|string|max:255',
        ]);

        $penalty->update([
            'status' => 'rejected',
            'admin_remarks' => $request->admin_remarks,
        ]);

        return redirect()->back()->with('success', 'Payment submission rejected. The employee has been instructed to resubmit valid TrxID.');
    }

    /**
     * Admin sync method to calculate and generate penalties for all unclosed past movements.
     */
    public function syncPenalties(Request $request, MovementPenaltySyncService $syncService)
    {
        $this->authorizeAdmin($request);

        $count = $syncService->sync();

        return redirect()->back()->with('success', "Overdue penalties synced successfully! {$count} overdue movement(s) processed.");
    }

    private function authorizeAdmin(Request $request): void
    {
        $user = Auth::user();
        if (! $user->isSuperAdmin() && ! $user->hasPermission('movements.approve') && ! $user->hasPermission('movements.edit')) {
            abort(403, 'Unauthorized access to movement penalties administration.');
        }
    }

    /**
     * Apply attendance after penalty is approved.
     *
     * Attendance time = when the employee paid (payment_submitted_at),
     * NOT the movement return time and NOT the admin approval time.
     *
     * Example: yesterday's movement open → today 7:00 AM they pay (any return time in form)
     * → pending: no payment-day attendance yet → approve → today's attendance at 7:00 AM.
     */
    private function applyAttendanceOnPenaltyApproval(
        Movement $movement,
        MovementPenalty $penalty,
        bool $wasWaivedWithoutPayment
    ): void {
        if ($movement->movement_type !== 'official') {
            return;
        }

        $movementStart = Carbon::parse($movement->from_datetime);

        // Always keep/confirm movement start-day mark (from movement create) — never on weekend
        $this->upsertOfficialMovementAttendance(
            $movement,
            $movementStart->toDateString(),
            $movementStart->format('H:i:s'),
            null,
            'On official movement: '.$movement->purpose
        );

        // Waive without payment: no payment-time attendance day
        if ($wasWaivedWithoutPayment) {
            return;
        }

        $paidAt = $penalty->payment_submitted_at
            ? Carbon::parse($penalty->payment_submitted_at)
            : Carbon::parse($penalty->updated_at ?? now());

        // Weekend payment day: no attendance mark
        if (AttendanceSetting::isWeekendForEmployee($paidAt, (int) $movement->employee_id)) {
            return;
        }

        $remark = 'Penalty payment attendance: '.$paidAt->format('Y-m-d H:i:s');

        if ($paidAt->isSameDay($movementStart)) {
            // Paid on movement day — use payment time as check-out on start day
            $this->upsertOfficialMovementAttendance(
                $movement,
                $movementStart->toDateString(),
                $movementStart->format('H:i:s'),
                $paidAt->format('H:i:s'),
                $remark
            );

            return;
        }

        // Paid on a later day — mark that payment day's attendance at payment time
        $this->upsertOfficialMovementAttendance(
            $movement,
            $paidAt->toDateString(),
            $paidAt->format('H:i:s'),
            null,
            $remark
        );
    }

    private function upsertOfficialMovementAttendance(
        Movement $movement,
        string $dateStr,
        string $checkInTime,
        ?string $checkOutTime,
        string $remark
    ): void {
        if (AttendanceSetting::isWeekendForEmployee($dateStr, (int) $movement->employee_id)) {
            return;
        }

        $attendance = Attendance::where('employee_id', $movement->employee_id)
            ->where('date', $dateStr)
            ->first();

        if (! $attendance) {
            $attendance = new Attendance;
            $attendance->employee_id = $movement->employee_id;
            $attendance->date = $dateStr;
            $attendance->status = 'on_duty';
        } elseif ($attendance->status === 'absent') {
            $attendance->status = 'on_duty';
        }

        if (! $attendance->check_in) {
            $attendance->check_in = $checkInTime;
        }

        if ($checkOutTime) {
            if (! $attendance->check_out || Carbon::parse($attendance->check_out)->format('H:i:s') < $checkOutTime) {
                $attendance->check_out = $checkOutTime;
            }
        }

        $attendance->movement_id = $movement->id;

        if (! $attendance->remarks) {
            $attendance->remarks = $remark;
        } elseif (stripos($attendance->remarks, $remark) === false) {
            // Avoid duplicating the same penalty-payment note
            $isPaymentRemark = str_starts_with($remark, 'Penalty payment attendance');
            $alreadyHasPaymentRemark = stripos($attendance->remarks, 'Penalty payment attendance') !== false;
            if (! ($isPaymentRemark && $alreadyHasPaymentRemark)) {
                $attendance->remarks .= ' | '.$remark;
            }
        }

        $attendance->save();
    }
}
