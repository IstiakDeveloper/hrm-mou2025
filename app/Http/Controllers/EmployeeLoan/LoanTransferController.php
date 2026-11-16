<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\LoanTransfer;
use App\Services\LoanTransferService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanTransferController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected LoanTransferService $transferService,
    ) {}

    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));

        $transfers = LoanTransfer::query()
            ->with([
                'loan:id,loan_number,loan_type',
                'fromEmployee:id,pin,name_en',
                'toEmployee:id,pin,name_en',
                'creator:id,name',
            ])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('transfer_number', 'like', "%{$search}%")
                        ->orWhere('reference_no', 'like', "%{$search}%")
                        ->orWhereHas('loan', fn ($lq) => $lq->where('loan_number', 'like', "%{$search}%"))
                        ->orWhereHas('fromEmployee', function ($eq) use ($search) {
                            $eq->where('pin', 'like', "%{$search}%")
                                ->orWhere('name_en', 'like', "%{$search}%");
                        })
                        ->orWhereHas('toEmployee', function ($eq) use ($search) {
                            $eq->where('pin', 'like', "%{$search}%")
                                ->orWhere('name_en', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('transfer_date')
            ->orderByDesc('id')
            ->paginate(25)
            ->through(fn (LoanTransfer $t) => $this->mapSummary($t));

        return Inertia::render('employee-loan/transfer/index', [
            'filters' => ['search' => $search],
            'transfers' => $transfers,
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('employee-loan/transfer/create', $this->formPayload($request));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_loan_id' => 'required|integer|exists:employee_loans,id',
            'to_employee_id' => 'required|integer|exists:employees,id',
            'transfer_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $transfer = $this->transferService->transfer($validated, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['transfer' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-transfer.show', $transfer)
            ->with('success', "Loan transferred — {$transfer->transfer_number}.");
    }

    public function show(LoanTransfer $loan_transfer)
    {
        $loan_transfer->load([
            'loan.policy',
            'fromEmployee.branch',
            'toEmployee.branch',
            'creator',
        ]);

        return Inertia::render('employee-loan/transfer/show', [
            'transfer' => [
                'id' => $loan_transfer->id,
                'transfer_number' => $loan_transfer->transfer_number,
                'transfer_date' => $loan_transfer->transfer_date?->format('d-M-Y'),
                'reference_no' => $loan_transfer->reference_no,
                'notes' => $loan_transfer->notes,
                'outstanding_at_transfer' => (float) $loan_transfer->outstanding_at_transfer,
                'pending_installments_at_transfer' => $loan_transfer->pending_installments_at_transfer,
                'created_by' => $loan_transfer->creator?->name,
                'created_at' => $loan_transfer->created_at?->format('d-M-Y H:i'),
                'loan' => [
                    'id' => $loan_transfer->loan->id,
                    'loan_number' => $loan_transfer->loan->loan_number,
                    'loan_type_label' => $loan_transfer->loan->typeLabel(),
                    'policy_name' => $loan_transfer->loan->policy?->name,
                    'outstanding_balance' => (float) $loan_transfer->loan->outstanding_balance,
                ],
                'from_employee' => $this->mapEmployee($loan_transfer->fromEmployee),
                'to_employee' => $this->mapEmployee($loan_transfer->toEmployee),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function formPayload(Request $request): array
    {
        $loans = EmployeeLoan::query()
            ->with(['employee:id,pin,name_en,current_branch_id', 'policy:id,name,code'])
            ->where('status', 'active')
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('employee', fn ($eq) => $eq->where('current_branch_id', $request->integer('branch_id')));
            })
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
            ->withCount([
                'installments as pending_installments' => fn ($q) => $q->where('status', 'pending'),
                'installments as scheduled_installments' => fn ($q) => $q->where('status', 'scheduled'),
            ])
            ->orderByDesc('disbursement_date')
            ->limit(500)
            ->get()
            ->map(fn (EmployeeLoan $loan) => [
                'id' => $loan->id,
                'loan_number' => $loan->loan_number,
                'employee_id' => $loan->employee_id,
                'employee_label' => trim(($loan->employee?->pin ?? '').' — '.($loan->employee?->name_en ?? '')),
                'loan_type_label' => $loan->typeLabel(),
                'policy_name' => $loan->policy?->name,
                'policy_code' => $loan->policy?->code,
                'outstanding_balance' => (float) $loan->outstanding_balance,
                'installment_amount' => (float) $loan->installment_amount,
                'pending_installments' => (int) $loan->pending_installments,
                'has_scheduled_installments' => (int) $loan->scheduled_installments > 0,
                'disbursement_date' => $loan->disbursement_date?->format('d-M-Y'),
            ])
            ->values();

        return [
            ...$this->payrollFilterOptions(),
            'employees' => Employee::query()
                ->where('status', 'active')
                ->orderBy('pin')
                ->get(['id', 'pin', 'name_en', 'current_branch_id']),
            'filters' => $this->payrollFilterValues($request),
            'loans' => $loans,
            'defaultTransferDate' => now()->toDateString(),
        ];
    }

    protected function mapSummary(LoanTransfer $transfer): array
    {
        return [
            'id' => $transfer->id,
            'transfer_number' => $transfer->transfer_number,
            'transfer_date' => $transfer->transfer_date?->format('d-M-Y'),
            'loan_number' => $transfer->loan?->loan_number,
            'from_employee_label' => trim(($transfer->fromEmployee?->pin ?? '').' — '.($transfer->fromEmployee?->name_en ?? '')),
            'to_employee_label' => trim(($transfer->toEmployee?->pin ?? '').' — '.($transfer->toEmployee?->name_en ?? '')),
            'outstanding_at_transfer' => (float) $transfer->outstanding_at_transfer,
            'created_by' => $transfer->creator?->name,
            'created_at' => $transfer->created_at?->format('d-M-Y H:i'),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function mapEmployee(?\App\Models\Employee $employee): ?array
    {
        if (! $employee) {
            return null;
        }

        return [
            'id' => $employee->id,
            'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
            'branch' => $employee->branch?->name,
        ];
    }
}
