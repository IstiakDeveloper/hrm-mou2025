<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\SeparationFinalPayment;
use App\Models\User;
use App\Services\FinalPaymentSettlementService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use InvalidArgumentException;
use Throwable;

class FinalPaymentController extends Controller
{
    use PaginatesForInertia;
    use ProvidesPayrollFilters;

    public function __construct(
        protected FinalPaymentSettlementService $settlementService,
    ) {}

    public function index(Request $request)
    {
        $status = (string) $request->input('status', 'all');
        if (! in_array($status, ['all', 'pending', 'paid'], true)) {
            $status = 'all';
        }
        $search = trim((string) $request->input('search', ''));

        $query = SeparationFinalPayment::query()
            ->with([
                'employee:id,employee_id,pin,name_en,name_bn,department_id,designation_id,current_branch_id,last_branch_id',
                'employee.department:id,name',
                'employee.designation:id,name',
                'employee.branch:id,name',
                'employee.lastBranch:id,name',
                'separation:id,separation_date,reason',
            ])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $branchId = $request->integer('branch_id');
                $q->whereHas('employee', function ($eq) use ($branchId) {
                    $eq->where('current_branch_id', $branchId)
                        ->orWhere(function ($branchQuery) use ($branchId) {
                            $branchQuery->whereNull('current_branch_id')
                                ->where('last_branch_id', $branchId);
                        });
                });
            })
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
            ->when($search !== '', function ($q) use ($search) {
                $q->whereHas('employee', function ($eq) use ($search) {
                    $eq->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%");
                });
            });

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $records = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        $pendingCount = SeparationFinalPayment::query()->where('status', 'pending')->count();
        /** @var User|null $user */
        $user = Auth::user();

        return Inertia::render('payroll/final-payment/index', [
            'records' => $records,
            'pendingCount' => $pendingCount,
            'filters' => [
                'status' => $status,
                'branch_id' => (string) $request->input('branch_id', ''),
                'employee_id' => (string) $request->input('employee_id', ''),
                'search' => $search,
                'per_page' => (string) $perPage,
            ],
            'canGenerate' => $user?->hasPermission('staff-fund.edit') ?? false,
            ...$this->payrollFilterOptions(),
        ]);
    }

    public function generate(Request $request)
    {
        /** @var User|null $user */
        $user = Auth::user();
        if (! $user?->hasPermission('staff-fund.edit')) {
            return back()->with('error', 'You do not have permission to generate final payments.');
        }

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $employee = Employee::query()->findOrFail((int) $validated['employee_id']);
        if ($employee->status !== 'inactive') {
            return back()->withErrors([
                'employee_id' => 'Only inactive employees can receive a final payment.',
            ]);
        }

        try {
            $finalPayment = $this->settlementService->generateForEmployee(
                $employee,
                (int) Auth::id(),
            );
        } catch (InvalidArgumentException $exception) {
            return back()->withErrors(['employee_id' => $exception->getMessage()]);
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'employee_id' => 'Final payment could not be generated. Please try again or contact the administrator.',
            ]);
        }

        return redirect()
            ->route('final-payments.show', $finalPayment)
            ->with('success', 'Final payment generated successfully.');
    }

    public function inactiveEmployeeLookup(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 25);

        $employees = Employee::query()
            ->select([
                'id',
                'pin',
                'employee_id',
                'name_en',
                'name_bn',
                'status',
                'dropout_date',
                'resignation_date',
            ])
            ->where('status', 'inactive')
            ->whereNotExists(function ($sub) {
                $sub->selectRaw('1')
                    ->from('separation_final_payments')
                    ->whereColumn('separation_final_payments.employee_id', 'employees.id');
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->orderBy('pin')
            ->limit($limit)
            ->get();

        return response()->json($employees->map(function (Employee $employee) {
            $separationDate = $employee->getRawOriginal('dropout_date')
                ?: $employee->getRawOriginal('resignation_date');

            return [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'employee_id' => $employee->employee_id,
                'name_en' => $employee->name_en,
                'name_bn' => $employee->name_bn,
                'status' => $employee->status,
                'separation_date' => $separationDate ? (string) $separationDate : null,
            ];
        })->values());
    }

    public function show(SeparationFinalPayment $final_payment)
    {
        $final_payment->load([
            'employee.department',
            'employee.designation',
            'employee.branch',
            'separation',
            'payer:id,name',
            'creator:id,name',
        ]);

        if ($final_payment->isPending()) {
            $this->settlementService->refreshSnapshot($final_payment);
            $final_payment->refresh();
        }

        $settlementDetails = $this->buildSettlementDetails($final_payment);
        /** @var User|null $user */
        $user = Auth::user();

        return Inertia::render('payroll/final-payment/show', [
            'finalPayment' => $final_payment,
            'settlementDetails' => $settlementDetails,
            'canProcess' => $user?->hasPermission('staff-fund.edit') ?? false,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildSettlementDetails(SeparationFinalPayment $finalPayment): array
    {
        $refs = $finalPayment->settlement_refs ?? $finalPayment->breakdown['settlement_refs'] ?? [];

        if ($refs === []) {
            return ['applied' => false, 'items' => []];
        }

        $items = [];

        if (! empty($refs['pf_transaction_id'])) {
            $items[] = [
                'type' => 'pf',
                'label' => 'PF withdrawal recorded',
                'href' => route('provident-fund.withdrawals.index', ['employee_id' => $finalPayment->employee_id]),
            ];
        }

        if (! empty($refs['gratuity_payment_id'])) {
            $items[] = [
                'type' => 'gratuity',
                'label' => 'Gratuity payment recorded',
                'href' => route('gratuity.show', $finalPayment->employee_id),
            ];
        }

        foreach ($refs['loan_collection_batch_ids'] ?? [] as $batchId) {
            $items[] = [
                'type' => 'loan',
                'label' => 'Loan recovery batch #'.$batchId,
                'href' => route('loan-collection.show', $batchId),
            ];
        }

        return [
            'applied' => $finalPayment->settlementsApplied(),
            'applied_at' => $finalPayment->settlement_applied_at?->toDateTimeString(),
            'items' => $items,
        ];
    }

    public function refresh(SeparationFinalPayment $final_payment)
    {
        /** @var User|null $user */
        $user = Auth::user();
        if (! $user?->hasPermission('staff-fund.edit')) {
            return back()->with('error', 'You do not have permission to refresh final payment calculations.');
        }

        if ($final_payment->isPaid()) {
            return back()->with('error', 'Paid final payments cannot be recalculated.');
        }

        $this->settlementService->refreshSnapshot($final_payment);

        return back()->with('success', 'Final payment settlement recalculated.');
    }

    public function markPaid(Request $request, SeparationFinalPayment $final_payment)
    {
        /** @var User|null $user */
        $user = Auth::user();
        if (! $user?->hasPermission('staff-fund.edit')) {
            return back()->with('error', 'You do not have permission to process final payments.');
        }

        if ($final_payment->isPaid()) {
            return back()->with('error', 'This final payment has already been processed.');
        }

        $validated = $request->validate([
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $this->settlementService->markPaid(
            $final_payment,
            Carbon::parse($validated['payment_date']),
            $validated['notes'] ?? null,
            (int) Auth::id(),
        );

        return redirect()
            ->route('final-payments.show', $final_payment)
            ->with('success', 'Final payment marked as paid.');
    }
}
