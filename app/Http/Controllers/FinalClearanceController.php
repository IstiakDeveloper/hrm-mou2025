<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\CorrectsWorkflowComments;
use App\Models\Employee;
use App\Models\FinalClearance;
use App\Models\FinalClearanceSignature;
use App\Services\FinalClearanceService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class FinalClearanceController extends Controller
{
    use CorrectsWorkflowComments;

    public function __construct(private readonly FinalClearanceService $clearances) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $this->authorizeView($user);

        $status = (string) $request->query('status', '');
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 15);
        if (! in_array($perPage, [10, 15, 25, 50, 100], true)) {
            $perPage = 15;
        }

        $scope = $this->clearances->visibleQuery($user);
        $metrics = [
            'total' => (clone $scope)->count(),
            'pending' => (clone $scope)->whereNotIn('status', [FinalClearance::STATUS_APPROVED, FinalClearance::STATUS_REJECTED])->count(),
            'approved' => (clone $scope)->where('status', FinalClearance::STATUS_APPROVED)->count(),
            'rejected' => (clone $scope)->where('status', FinalClearance::STATUS_REJECTED)->count(),
        ];

        $rows = (clone $scope)
            ->with('signatures')
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('employee_name', 'like', "%{$search}%")
                        ->orWhere('staff_id', 'like', "%{$search}%")
                        ->orWhere('designation_name', 'like', "%{$search}%");
                });
            })
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (FinalClearance $row) use ($user) {
                $sentBack = $row->status === FinalClearance::STATUS_DRAFT
                    ? $row->signatures->where('action', 'sent_back')->sortByDesc('id')->first()
                    : null;

                return [
                    'id' => $row->id,
                    'staff_id' => $row->staff_id,
                    'employee_name' => $row->employee_name,
                    'designation_name' => $row->designation_name,
                    'workplace' => $row->workplace,
                    'status' => $row->status,
                    'status_label' => $this->clearances->stageLabel($row->status),
                    'net_payable' => $row->net_payable,
                    'initiator_name' => $row->initiator?->name,
                    'created_at' => optional($row->created_at)->toDateString(),
                    'can_act' => $this->clearances->canAct($user, $row),
                    'sent_back_reason' => $sentBack?->comments,
                ];
            });

        $user->loadMissing('employee');

        return Inertia::render('final-clearances/index', [
            'clearances' => $rows,
            'filters' => ['status' => $status, 'search' => $search, 'per_page' => (string) $perPage],
            'metrics' => $metrics,
            'canCreate' => $this->clearances->canOpenCreate($user),
            'userHasSignature' => $user->hasSignature(),
            'isSuperAdmin' => $user->isSuperAdmin(),
        ]);
    }

    public function lookup(Request $request)
    {
        $user = $request->user();
        $this->authorizeView($user);

        $search = trim((string) $request->query('q', ''));
        $limit = max(1, min((int) $request->query('limit', 20), 25));
        $employees = $this->clearances->creatorScopedQuery($user)
            ->with(['designation:id,name', 'branch:id,name,regional_office_id'])
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(function ($inner) use ($like) {
                    $inner->where('name_en', 'like', $like)
                        ->orWhere('name_bn', 'like', $like)
                        ->orWhere('pin', 'like', $like)
                        ->orWhere('employee_id', 'like', $like);
                });
            })
            ->orderBy('name_en')
            ->limit($search === '' ? 80 : 40)
            ->get()
            ->filter(fn (Employee $employee) => $this->clearances->matchesCreator($user, $employee))
            ->take($limit)
            ->values()
            ->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'pin' => $employee->pin ?: $employee->employee_id,
                'name_en' => $employee->name_en,
                'name_bn' => $employee->name_bn,
                'designation' => $employee->designation ? ['name' => $employee->designation->name] : null,
                'branch' => $employee->branch ? ['name' => $employee->branch->name] : null,
            ]);

        return response()->json($employees);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $this->authorizeView($user);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        return Inertia::render('final-clearances/create', [
            'userHasSignature' => true,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $this->authorizeView($user);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $employee = Employee::query()->findOrFail($validated['employee_id']);
        $clearance = $this->clearances->createDraft($user, $employee);

        return redirect()->route('final-clearances.show', $clearance);
    }

    public function show(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->authorizeRecord($user, $finalClearance);

        $finalClearance->load(['signatures.user.employee', 'signatures.commentEditor:id,name', 'initiator:id,name']);
        $user->loadMissing('employee');

        return Inertia::render('final-clearances/show', [
            'clearance' => $this->payload($finalClearance),
            'canAct' => $this->clearances->canAct($user, $finalClearance),
            'userHasSignature' => $user->hasSignature(),
            'isSuperAdmin' => $user->isSuperAdmin(),
        ]);
    }

    public function print(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->authorizeRecord($user, $finalClearance);
        $finalClearance->load(['signatures.user.employee', 'signatures.commentEditor:id,name', 'initiator:id,name']);

        return Inertia::render('final-clearances/print', [
            'clearance' => $this->payload($finalClearance),
        ]);
    }

    public function update(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->assertCanAct($user, $finalClearance);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        if ($finalClearance->status === FinalClearance::STATUS_DRAFT) {
            $data = $request->validate([
                'id_card_returned' => ['nullable', 'boolean'],
                'sim_returned' => ['nullable', 'boolean'],
                'member_loan_outstanding' => ['nullable', 'numeric', 'min:0'],
                'savings_outstanding' => ['nullable', 'numeric', 'min:0'],
                'total_member' => ['nullable', 'integer', 'min:0'],
                'total_borrower' => ['nullable', 'integer', 'min:0'],
                'preparer_comments' => ['nullable', 'string', 'max:2000'],
            ]);
            $finalClearance->fill($data);
        } elseif ($finalClearance->status === FinalClearance::STATUS_HR) {
            $data = $request->validate([
                'joining_date' => ['nullable', 'date'],
                'confirmation_date' => ['nullable', 'date'],
                'dropout_date' => ['nullable', 'date'],
                'leave_balance' => ['nullable', 'numeric'],
                'hr_issue' => ['nullable', 'boolean'],
                'hr_issue_note' => ['nullable', 'string', 'max:2000'],
            ]);
            $finalClearance->fill($data);
            $this->clearances->recomputeService($finalClearance);
        } elseif ($finalClearance->status === FinalClearance::STATUS_ACCOUNTS) {
            $data = $request->validate($this->moneyRules());
            $finalClearance->fill($data);
            $this->clearances->recomputeTotals($finalClearance);
        } else {
            throw ValidationException::withMessages(['status' => 'This stage has no editable fields.']);
        }

        $finalClearance->save();

        return back()->with('success', 'Saved.');
    }

    public function submit(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->assertCanAct($user, $finalClearance);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        if ($finalClearance->status !== FinalClearance::STATUS_DRAFT) {
            abort(403);
        }

        $data = $request->validate([
            'id_card_returned' => ['required', 'boolean'],
            'sim_returned' => ['required', 'boolean'],
            'member_loan_outstanding' => ['required', 'numeric', 'min:0'],
            'savings_outstanding' => ['required', 'numeric', 'min:0'],
            'total_member' => ['required', 'integer', 'min:0'],
            'total_borrower' => ['required', 'integer', 'min:0'],
            'preparer_comments' => ['required', 'string', 'max:2000'],
        ], $this->requiredMessages([
            'id_card_returned' => 'ID card returned',
            'sim_returned' => 'SIM returned',
            'member_loan_outstanding' => 'Member loan outstanding',
            'savings_outstanding' => 'Savings outstanding',
            'total_member' => 'Total member',
            'total_borrower' => 'Total borrower',
            'preparer_comments' => "Preparer's comments",
        ]));

        $finalClearance->fill($data);
        $finalClearance->status = FinalClearance::STATUS_HR;
        $finalClearance->save();
        $this->clearances->sign($finalClearance, $user, 'field', 'submitted', $data['preparer_comments'] ?? null);

        return back()->with('success', 'Submitted to HR.');
    }

    public function forward(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->assertCanAct($user, $finalClearance);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        if ($finalClearance->status === FinalClearance::STATUS_HR) {
            $data = $request->validate([
                'joining_date' => ['required', 'date'],
                'confirmation_date' => ['required', 'date'],
                'dropout_date' => ['required', 'date'],
                'leave_balance' => ['required', 'numeric', 'min:0'],
                'hr_issue' => ['required', 'boolean'],
                'hr_issue_note' => ['required', 'string', 'max:2000'],
                'comments' => ['nullable', 'string', 'max:2000'],
            ], $this->requiredMessages([
                'joining_date' => 'Joining date',
                'confirmation_date' => 'Confirmation date',
                'dropout_date' => 'Dropout date',
                'leave_balance' => 'Leave balance',
                'hr_issue' => 'Any HR issue',
                'hr_issue_note' => 'HR note',
            ]));
            $finalClearance->fill(collect($data)->except('comments')->all());
            $this->clearances->recomputeService($finalClearance);
            $finalClearance->status = FinalClearance::STATUS_ACCOUNTS;
            $finalClearance->save();
            $this->clearances->sign($finalClearance, $user, 'hr', 'forwarded', $data['comments'] ?? null);

            return back()->with('success', 'Submitted to Accounts.');
        }

        if ($finalClearance->status === FinalClearance::STATUS_ACCOUNTS) {
            $data = $request->validate($this->moneyRules(required: true) + [
                'comments' => ['nullable', 'string', 'max:2000'],
            ], $this->requiredMessages([
                'unpaid_salary' => 'Unpaid salary',
                'unpaid_salary_remarks' => 'Unpaid salary remarks',
                'pf_amount' => 'Provident fund',
                'pf_remarks' => 'Provident fund remarks',
                'gratuity_amount' => 'Gratuity',
                'gratuity_remarks' => 'Gratuity remarks',
                'staff_security' => 'Staff security',
                'staff_security_remarks' => 'Staff security remarks',
                'other_payable' => 'Other payable',
                'other_payable_remarks' => 'Other payable remarks',
                'pf_loan' => 'PF loan',
                'pf_loan_remarks' => 'PF loan remarks',
                'motorcycle_loan' => 'Motorcycle loan',
                'motorcycle_loan_remarks' => 'Motorcycle loan remarks',
                'laptop_loan' => 'Laptop loan',
                'laptop_loan_remarks' => 'Laptop loan remarks',
                'other_loan' => 'Other loan',
                'other_loan_remarks' => 'Other loan remarks',
                'advance_received' => 'Advance received',
                'advance_remarks' => 'Advance remarks',
                'accounts_comments' => 'Accounts comments',
            ]));
            $finalClearance->fill(collect($data)->except('comments')->all());
            $this->clearances->recomputeTotals($finalClearance);
            $finalClearance->status = FinalClearance::STATUS_DIRECTOR_FA;
            $finalClearance->save();
            $this->clearances->sign($finalClearance, $user, 'accounts', 'forwarded', $data['comments'] ?? $finalClearance->accounts_comments);

            return back()->with('success', 'Submitted to Director Finance and Accounts.');
        }

        abort(403);
    }

    public function sendBack(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->assertCanAct($user, $finalClearance);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        $data = $request->validate([
            'comments' => ['required', 'string', 'max:2000'],
        ]);

        $previous = match ($finalClearance->status) {
            FinalClearance::STATUS_HR => FinalClearance::STATUS_DRAFT,
            FinalClearance::STATUS_ACCOUNTS => FinalClearance::STATUS_HR,
            FinalClearance::STATUS_DIRECTOR_FA => FinalClearance::STATUS_ACCOUNTS,
            FinalClearance::STATUS_ED => FinalClearance::STATUS_DIRECTOR_FA,
            default => null,
        };

        if ($previous === null) {
            abort(403);
        }

        $stage = $finalClearance->status;
        $finalClearance->status = $previous;
        $finalClearance->save();
        $this->clearances->sign($finalClearance, $user, $stage, 'sent_back', $data['comments']);

        return back()->with('success', 'Sent back.');
    }

    public function approve(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->assertCanAct($user, $finalClearance);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        $data = $request->validate([
            'comments' => ['required', 'string', 'max:2000'],
        ], $this->requiredMessages([
            'comments' => 'Comment',
        ]));

        if ($finalClearance->status === FinalClearance::STATUS_DIRECTOR_FA) {
            $finalClearance->status = FinalClearance::STATUS_ED;
            $finalClearance->save();
            $this->clearances->sign($finalClearance, $user, 'director_fa', 'approved', $data['comments'] ?? null);

            return back()->with('success', 'Approved and sent to the Executive Director.');
        }

        if ($finalClearance->status === FinalClearance::STATUS_ED) {
            $this->clearances->approve($finalClearance, $user, $data['comments'] ?? null);

            return back()->with('success', 'Final payment approved.');
        }

        abort(403);
    }

    public function reject(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->assertCanAct($user, $finalClearance);
        if ($redirect = $this->requireSignature($user)) {
            return $redirect;
        }

        if (! in_array($finalClearance->status, [FinalClearance::STATUS_DIRECTOR_FA, FinalClearance::STATUS_ED], true)) {
            abort(403);
        }

        $data = $request->validate([
            'comments' => ['required', 'string', 'max:2000'],
        ]);

        $stage = $finalClearance->status === FinalClearance::STATUS_ED ? 'ed' : 'director_fa';
        $finalClearance->status = FinalClearance::STATUS_REJECTED;
        $finalClearance->rejected_reason = $data['comments'];
        $finalClearance->save();
        $this->clearances->sign($finalClearance, $user, $stage, 'rejected', $data['comments']);

        return back()->with('success', 'Rejected.');
    }

    public function destroy(Request $request, FinalClearance $finalClearance)
    {
        $user = $request->user();
        $this->authorizeRecord($user, $finalClearance);

        if (! $user->isSuperAdmin()) {
            abort(403);
        }

        $request->validate([
            'password' => ['required', 'string', 'current_password'],
        ], [
            'password.required' => 'মুছে ফেলতে আপনার পাসওয়ার্ড দিন।',
            'password.current_password' => 'পাসওয়ার্ড সঠিক নয়।',
        ]);

        $finalClearance->delete();

        return redirect()->route('final-clearances.index')->with('success', 'Final clearance deleted.');
    }

    private function requiredMessages(array $labels): array
    {
        $messages = [];
        foreach ($labels as $field => $label) {
            $messages["{$field}.required"] = "{$label} is required before submit.";
        }

        return $messages;
    }

    private function moneyRules(bool $required = false): array
    {
        $money = [$required ? 'required' : 'nullable', 'numeric', 'min:0'];
        $note = [$required ? 'required' : 'nullable', 'string', 'max:255'];

        return [
            'unpaid_salary' => $money,
            'unpaid_salary_remarks' => $note,
            'pf_amount' => $money,
            'pf_remarks' => $note,
            'gratuity_amount' => $money,
            'gratuity_remarks' => $note,
            'staff_security' => $money,
            'staff_security_remarks' => $note,
            'other_payable' => $money,
            'other_payable_remarks' => $note,
            'pf_loan' => $money,
            'pf_loan_remarks' => $note,
            'motorcycle_loan' => $money,
            'motorcycle_loan_remarks' => $note,
            'laptop_loan' => $money,
            'laptop_loan_remarks' => $note,
            'other_loan' => $money,
            'other_loan_remarks' => $note,
            'advance_received' => $money,
            'advance_remarks' => $note,
            'accounts_comments' => [$required ? 'required' : 'nullable', 'string', 'max:2000'],
        ];
    }

    private function payload(FinalClearance $clearance): array
    {
        $data = $clearance->toArray();
        foreach (['joining_date', 'confirmation_date', 'dropout_date'] as $date) {
            $value = $clearance->getAttribute($date);
            $data[$date] = $value ? $value->format('Y-m-d') : null;
        }
        $clearance->loadMissing('employee');
        if ($clearance->employee) {
            $address = $this->clearances->addressFields($clearance->employee);
            foreach (['village', 'post_office', 'upazila', 'district'] as $field) {
                if (blank($data[$field] ?? null)) {
                    $data[$field] = $address[$field];
                }
            }
        }
        $data = array_merge($data, $this->clearances->lengthLabels($clearance));
        $data['status_label'] = $this->clearances->stageLabel($clearance->status);
        $data['initiator_name'] = $clearance->initiator?->name;
        $data['signatures'] = $clearance->signatures->map(function ($sig) {
            $path = $sig->user?->signature ?: $sig->user?->employee?->signature;

            return [
                'id' => $sig->id,
                'stage' => $sig->stage,
                'action' => $sig->action,
                'comments' => $sig->comments,
                'comment_updated_by_name' => $sig->comment_updated_by_name,
                'signed_at' => optional($sig->signed_at)->toDateString(),
                'user_name' => $sig->user?->name,
                'signature' => $path,
            ];
        })->values();

        return $data;
    }

    private function requireSignature($user): ?\Illuminate\Http\RedirectResponse
    {
        $user->loadMissing('employee');
        if ($user->hasSignature()) {
            return null;
        }

        return redirect()->route('settings.profile.edit')->with(
            'error',
            'চূড়ান্ত ছাড়পত্রের কোনো কাজ করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।'
        );
    }

    private function authorizeView($user): void
    {
        if (! $this->clearances->canViewModule($user)) {
            abort(403);
        }
    }

    private function authorizeRecord($user, FinalClearance $clearance): void
    {
        $this->authorizeView($user);
        if ($user->isSuperAdmin()) {
            return;
        }

        $visible = $this->clearances->visibleQuery($user)->whereKey($clearance->id)->exists();
        if (! $visible) {
            abort(403);
        }
    }

    private function assertCanAct($user, FinalClearance $clearance): void
    {
        $this->authorizeRecord($user, $clearance);
        if (! $this->clearances->canAct($user, $clearance)) {
            abort(403);
        }
    }

    public function correctComment(Request $request, FinalClearance $finalClearance, FinalClearanceSignature $signature)
    {
        return $this->correctSignatureComment(
            $request,
            $signature,
            (int) $finalClearance->id,
            'final_clearance_id',
            function (FinalClearanceSignature $saved) use ($finalClearance) {
                if ($saved->stage === 'field') {
                    $finalClearance->preparer_comments = $saved->comments;
                    $finalClearance->save();
                } elseif ($saved->stage === 'accounts') {
                    $finalClearance->accounts_comments = $saved->comments;
                    $finalClearance->save();
                }
            }
        );
    }
}
