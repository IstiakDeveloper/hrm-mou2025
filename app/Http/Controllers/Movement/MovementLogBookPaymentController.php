<?php

namespace App\Http\Controllers\Movement;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Movement\Concerns\ResolvesLogBookScopeView;
use App\Models\Employee;
use App\Models\MovementLogBook;
use App\Models\MovementLogBookPayment;
use App\Models\User;
use App\Services\LogBookPaymentWorkflowService;
use App\Services\OrganogramAccessService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MovementLogBookPaymentController extends Controller
{
    use PaginatesForInertia;
    use ResolvesLogBookScopeView;

    public function __construct(private LogBookPaymentWorkflowService $workflow)
    {
    }

    private function ratePerKm(): float
    {
        return (float) config('movement_log_book.rate_per_km', 5);
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);

        $scope = $this->resolveLogBookScopeView($request, $user);

        $query = MovementLogBookPayment::query()
            ->with([
                'employee:id,employee_id,pin,name_en,current_branch_id,designation_id',
                'employee.designation:id,name',
                'employee.branch:id,name,regional_office_id,is_head_office,branch_head_designation_id,head_employee_id',
                'employee.branch.regionalOffice:id,zone_id,regional_manager_employee_id',
                'processor:id,name',
                'recommender:id,name',
                'approver:id,name',
            ]);

        $this->constrainVisiblePayments($query, $user);
        $this->applyLogBookScopeView($query, $user, $scope['view'], $scope['showTabs']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('period_year') && $request->period_year !== 'all') {
            $query->where('period_year', (int) $request->period_year);
        }

        if ($request->filled('period_month') && $request->period_month !== 'all') {
            $query->where('period_month', (int) $request->period_month);
        }

        if ($request->search) {
            $search = trim((string) $request->search);
            $query->where(function ($q) use ($search) {
                $q->where('voucher_no', 'like', "%{$search}%")
                    ->orWhereHas('employee', function ($eq) use ($search) {
                        $eq->where('name_en', 'like', "%{$search}%")
                            ->orWhere('pin', 'like', "%{$search}%")
                            ->orWhere('employee_id', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $payments = $query->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $summaryQuery = clone $query;
        $summary = [
            'total' => (clone $summaryQuery)->count(),
            'pending' => (clone $summaryQuery)->where('status', 'pending')->count(),
            'recommended' => (clone $summaryQuery)->where('status', 'recommended')->count(),
            'approved' => (clone $summaryQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $summaryQuery)->where('status', 'rejected')->count(),
            'totalAmount' => round((float) (clone $summaryQuery)->where('status', 'approved')->sum('total_amount'), 2),
            'pendingAmount' => round((float) (clone $summaryQuery)->whereIn('status', ['pending', 'recommended'])->sum('total_amount'), 2),
        ];

        foreach ($payments->items() as $payment) {
            $payment->setAttribute('can_recommend', $this->workflow->userCanRecommend($user, $payment));
            $payment->setAttribute('can_approve', $this->workflow->userCanApprove($user, $payment));
            $payment->setAttribute('can_reject', $this->workflow->userCanReject($user, $payment));
            $payment->setAttribute('can_delete', $user->isSuperAdmin());
            $payment->setAttribute('next_action_label', $this->workflow->nextActionLabel($payment));
        }

        return Inertia::render('movement/log-book/payment/index', [
            'payments' => $this->inertiaPagination($payments),
            'summary' => $summary,
            'filters' => $request->only(['status', 'period_year', 'period_month', 'search', 'per_page', 'view']),
            'ratePerKm' => $this->ratePerKm(),
            'canProcess' => $this->userCanProcessPayments($user),
            'canDelete' => $user->isSuperAdmin(),
            'scopeView' => $scope['view'],
            'showScopeTabs' => $scope['showTabs'],
            'viewerEmployeeId' => (int) $user->employee_id,
        ]);
    }

    public function show(MovementLogBookPayment $payment)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);
        abort_unless($this->userCanViewPayment($user, $payment), 403);

        $payment->load([
            'employee.department',
            'employee.designation',
            'employee.branch.regionalOffice',
            'processor:id,name',
            'recommender:id,name',
            'approver:id,name',
            'logBooks.movement:id,movement_type,status',
        ]);

        return Inertia::render('movement/log-book/payment/show', [
            'payment' => $payment,
            'canRecommend' => $this->workflow->userCanRecommend($user, $payment),
            'canApprove' => $this->workflow->userCanApprove($user, $payment),
            'canReject' => $this->workflow->userCanReject($user, $payment),
            'canDelete' => $user->isSuperAdmin(),
            'nextActionLabel' => $this->workflow->nextActionLabel($payment),
            'companyName' => config('payroll_reports.company_name', config('app.name')),
            'companyAddress' => config('payroll_reports.company_address', ''),
        ]);
    }

    public function process(Request $request)
    {
        $user = Auth::user();
        abort_unless($this->userCanProcessPayments($user), 403);

        $request->validate([
            'period_year' => 'required|integer|min:2020|max:2100',
            'period_month' => 'required|integer|min:1|max:12',
            'employee_id' => 'nullable|exists:employees,id',
        ]);

        $year = (int) $request->period_year;
        $month = (int) $request->period_month;

        $employeeId = $request->filled('employee_id')
            ? (int) $request->employee_id
            : (int) $user->employee_id;

        abort_unless($employeeId > 0, 403, 'Employee record is required to process monthly log book payment.');

        if (! $user->isSuperAdmin() && ! $user->hasPermission('movements.edit') && ! $user->hasPermission('employees.admin')) {
            abort_unless((int) $user->employee_id === $employeeId, 403);
        } else {
            abort_unless(OrganogramAccessService::userCanSeeEmployee($user, $employeeId), 403);
        }

        if (MovementLogBookPayment::where('employee_id', $employeeId)
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->exists()) {
            return redirect()->back()->with('error', 'This month is already processed for this employee.');
        }

        // Settlement month label only — include ALL unpaid entries on/before month end
        // (carry-forward: e.g. entries after a mid-month process go into the next process).
        $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();

        $entries = MovementLogBook::query()
            ->where('employee_id', $employeeId)
            ->where('payment_status', 'unpaid')
            ->whereNull('log_book_payment_id')
            ->whereDate('date', '<=', $periodEnd->toDateString())
            ->orderBy('date')
            ->get();

        if ($entries->isEmpty()) {
            return redirect()->back()->with('error', 'No unpaid log book entries found up to the selected month.');
        }

        $employee = Employee::with(['branch', 'designation'])->findOrFail($employeeId);
        $isHeadOffice = (bool) ($employee->branch?->is_head_office);
        $tier = $this->workflow->resolveSubmitterTier($employee);
        $totalOfficialKm = round((float) $entries->sum('official_km'), 2);
        $rate = $this->ratePerKm();
        $totalAmount = round($totalOfficialKm * $rate, 2);

        DB::beginTransaction();
        try {
            $payment = MovementLogBookPayment::create([
                'employee_id' => $employeeId,
                'period_year' => $year,
                'period_month' => $month,
                'total_official_km' => $totalOfficialKm,
                'rate_per_km' => $rate,
                'total_amount' => $totalAmount,
                'entry_count' => $entries->count(),
                'approval_scope' => $isHeadOffice ? 'head_office' : 'branch',
                'submitter_tier' => $tier,
                'needs_recommendation' => $this->workflow->needsRecommendation($tier),
                'status' => 'pending',
                'processed_by' => $user->id,
                'processed_at' => now(),
            ]);

            MovementLogBook::whereIn('id', $entries->pluck('id'))
                ->update(['log_book_payment_id' => $payment->id]);

            DB::commit();

            return redirect()->route('movement-log-book-payments.show', $payment)
                ->with('success', 'Monthly log book payment submitted.');
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Could not process monthly log book payment.');
        }
    }

    public function recommend(Request $request, MovementLogBookPayment $payment)
    {
        $user = Auth::user();
        abort_unless($this->workflow->userCanRecommend($user, $payment), 403);

        $request->validate(['recommendation_remarks' => 'nullable|string|max:1000']);

        $payment->update([
            'status' => 'recommended',
            'recommended_by' => $user->id,
            'recommended_at' => now(),
            'recommendation_remarks' => $request->recommendation_remarks,
        ]);

        return redirect()->back()->with('success', 'Log book payment recommended for approval.');
    }

    public function approve(Request $request, MovementLogBookPayment $payment)
    {
        $user = Auth::user();
        abort_unless($this->workflow->userCanApprove($user, $payment), 403);

        $request->validate(['approval_remarks' => 'nullable|string|max:1000']);

        DB::beginTransaction();
        try {
            $voucherNo = $this->generateVoucherNo($payment);

            $payment->update([
                'status' => 'approved',
                'voucher_no' => $voucherNo,
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_remarks' => $request->approval_remarks,
            ]);

            MovementLogBook::where('log_book_payment_id', $payment->id)
                ->update(['payment_status' => 'paid']);

            DB::commit();

            return redirect()->back()->with('success', 'Log book payment approved. Voucher: '.$voucherNo);
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Could not approve payment.');
        }
    }

    public function reject(Request $request, MovementLogBookPayment $payment)
    {
        $user = Auth::user();
        abort_unless($this->workflow->userCanReject($user, $payment), 403);

        if (! in_array($payment->status, ['pending', 'recommended'], true)) {
            return redirect()->back()->with('error', 'This payment is already processed.');
        }

        $request->validate(['approval_remarks' => 'required|string|min:3|max:1000']);

        DB::beginTransaction();
        try {
            MovementLogBook::where('log_book_payment_id', $payment->id)
                ->update(['log_book_payment_id' => null]);

            $payment->update([
                'status' => 'rejected',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_remarks' => $request->approval_remarks,
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Log book payment rejected. Entries are unpaid again.');
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Could not reject payment.');
        }
    }

    public function destroy(MovementLogBookPayment $payment)
    {
        /** @var User $user */
        $user = Auth::user();
        abort_unless($user && $user->isSuperAdmin(), 403, 'Only Super Admin can delete log book payments.');

        DB::beginTransaction();
        try {
            MovementLogBook::where('log_book_payment_id', $payment->id)
                ->update([
                    'log_book_payment_id' => null,
                    'payment_status' => 'unpaid',
                ]);

            $payment->delete();

            DB::commit();

            return redirect()->route('movement-log-book-payments.index')
                ->with('success', 'Log book payment deleted successfully. Unpaid entries are restored and can be processed again.');
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()->back()
                ->with('error', 'Could not delete log book payment: '.$e->getMessage());
        }
    }

    public function voucher(MovementLogBookPayment $payment)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);
        abort_unless($this->userCanViewPayment($user, $payment), 403);
        abort_unless(in_array($payment->status, ['pending', 'recommended', 'approved'], true), 404);

        $payment->load([
            'employee.department',
            'employee.designation',
            'employee.branch',
            'recommender:id,name',
            'approver:id,name',
            'processor:id,name',
        ]);

        $kmSummary = MovementLogBook::query()
            ->where('log_book_payment_id', $payment->id)
            ->selectRaw('COUNT(*) as entry_count')
            ->selectRaw('COALESCE(SUM(distance_km), 0) as total_km')
            ->selectRaw('COALESCE(SUM(COALESCE(personal_km, 0)), 0) as personal_km')
            ->selectRaw('COALESCE(SUM(official_km), 0) as official_km')
            ->first();

        return Inertia::render('movement/log-book/payment/voucher', [
            'payment' => $payment,
            'displayVoucherNo' => $payment->voucher_no ?: $this->generateVoucherNo($payment),
            'kmSummary' => [
                'entry_count' => (int) ($kmSummary->entry_count ?? 0),
                'total_km' => round((float) ($kmSummary->total_km ?? 0), 2),
                'personal_km' => round((float) ($kmSummary->personal_km ?? 0), 2),
                'official_km' => round((float) ($kmSummary->official_km ?? 0), 2),
            ],
            'companyName' => config('payroll_reports.company_name', config('app.name')),
            'companyAddress' => config('payroll_reports.company_address', ''),
            'generatedAt' => now()->toIso8601String(),
        ]);
    }

    private function generateVoucherNo(MovementLogBookPayment $payment): string
    {
        $prefix = config('movement_log_book.voucher_prefix', 'LB');

        return sprintf(
            '%s-%04d-%02d-%05d',
            $prefix,
            $payment->period_year,
            $payment->period_month,
            $payment->id
        );
    }

    private function constrainVisiblePayments($query, User $user): void
    {
        if ($user->isSuperAdmin() || $user->hasPermission('employees.admin') || $user->hasPermission('movements.edit')) {
            return;
        }

        if ($user->hasPermission('movements.view')) {
            OrganogramAccessService::constrainViaEmployeeRelation($query, $user, 'employee');

            return;
        }

        if ($user->employee_id) {
            $query->where('employee_id', $user->employee_id);

            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function userCanViewPayment(User $user, MovementLogBookPayment $payment): bool
    {
        if ($user->isSuperAdmin() || $user->hasPermission('employees.admin') || $user->hasPermission('movements.edit')) {
            return true;
        }

        return OrganogramAccessService::userCanSeeEmployee($user, (int) $payment->employee_id);
    }

    private function userCanProcessPayments(User $user): bool
    {
        return $user->hasPermission('movements.view') && ($user->employee_id || $user->hasPermission('movements.edit') || $user->hasPermission('employees.admin'));
    }
}
