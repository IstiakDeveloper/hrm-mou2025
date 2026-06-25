<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\SeparationFinalPayment;
use App\Services\FinalPaymentSettlementService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

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

        $query = SeparationFinalPayment::query()
            ->with([
                'employee:id,employee_id,pin,name_en,name_bn,department_id,designation_id,current_branch_id',
                'employee.department:id,name',
                'employee.designation:id,name',
                'employee.branch:id,name',
                'separation:id,separation_date,reason',
            ])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('employee', fn ($eq) => $eq->where('current_branch_id', $request->integer('branch_id')));
            })
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
            ->when($request->filled('search'), function ($q, $search) {
                $q->whereHas('employee', function ($eq) use ($search) {
                    $eq->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%");
                });
            });

        $perPage = $this->resolvePerPage($request->get('per_page'), 15);

        $records = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        $pendingCount = SeparationFinalPayment::query()->where('status', 'pending')->count();

        return Inertia::render('payroll/final-payment/index', [
            'records' => $records,
            'pendingCount' => $pendingCount,
            'filters' => [
                'status' => $status,
                'branch_id' => (string) $request->input('branch_id', ''),
                'employee_id' => (string) $request->input('employee_id', ''),
                'search' => (string) $request->input('search', ''),
                'per_page' => (string) $request->input('per_page', ''),
            ],
            ...$this->payrollFilterOptions(),
        ]);
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

        return Inertia::render('payroll/final-payment/show', [
            'finalPayment' => $final_payment,
            'settlementDetails' => $settlementDetails,
            'canProcess' => Auth::user()?->hasPermission('payroll.edit') ?? false,
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
        if (! Auth::user()?->hasPermission('payroll.edit')) {
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
        if (! Auth::user()?->hasPermission('payroll.edit')) {
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
