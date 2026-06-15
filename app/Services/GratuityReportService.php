<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeGratuityPayment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class GratuityReportService
{
    public function __construct(
        protected EmployeeGratuityService $gratuityService,
    ) {}

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public function build(string $slug, array $config, array $filters): array
    {
        $report = $config['report'] ?? $slug;

        return match ($report) {
            'gratuity_ledger' => $this->buildGratuityLedger($filters),
            'eligible_employees' => $this->buildEntitlementsTable($filters, $config, true, false),
            'unpaid_liability' => $this->buildUnpaidTable($filters),
            'liability_by_branch' => $this->buildLiabilityGrouped($filters, 'branch'),
            'liability_by_department' => $this->buildLiabilityGrouped($filters, 'department'),
            'settlement_history' => $this->buildSettlementHistory($filters),
            'payment_summary' => $this->buildPaymentSummary($filters),
            'gratuity_rules' => $this->buildRulesTable(),
            default => $this->buildEntitlementsTable($filters, $config, false, false),
        };
    }

    /**
     * @return array<string, string>
     */
    public function filtersFromRequest(Request $request): array
    {
        return [
            'as_of' => $request->input('as_of', date('Y-m-d')),
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
            'branch_id' => $request->input('branch_id', ''),
            'department_id' => $request->input('department_id', ''),
            'employee_id' => $request->input('employee_id', ''),
            'eligibility' => $request->input('eligibility', 'all'),
            'payment_status' => $request->input('payment_status', 'all'),
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @param  array<string, mixed>  $config
     */
    public function periodLabel(array $filters, array $config): string
    {
        $report = $config['report'] ?? '';

        if (in_array($report, ['settlement_history', 'payment_summary'], true)) {
            $from = $filters['date_from'] ?: '—';
            $to = $filters['date_to'] ?: '—';

            return "From {$from} to {$to}";
        }

        if ($report === 'gratuity_ledger') {
            return 'All time · As of '.Carbon::today()->format('d M Y');
        }

        $asOf = $filters['as_of'] ?: date('Y-m-d');

        return 'As of '.Carbon::parse($asOf)->format('d M Y');
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildGratuityLedger(array $filters): array
    {
        $asOf = Carbon::today();

        $employees = Employee::query()
            ->with(['branch:id,name', 'department:id,name', 'designation:id,name', 'salaryStep:id,basic_salary'])
            ->forGratuity()
            ->when($filters['branch_id'], fn ($q) => $q->where('current_branch_id', (int) $filters['branch_id']))
            ->when($filters['department_id'], fn ($q) => $q->where('department_id', (int) $filters['department_id']))
            ->when($filters['employee_id'], fn ($q) => $q->whereKey((int) $filters['employee_id']))
            ->where('status', 'active')
            ->orderBy('pin')
            ->limit(2000)
            ->get();

        $employeeIds = $employees->pluck('id');
        $paymentsByEmployee = $employeeIds->isEmpty()
            ? collect()
            : EmployeeGratuityPayment::query()
                ->whereIn('employee_id', $employeeIds)
                ->orderBy('payment_date')
                ->orderBy('id')
                ->get()
                ->groupBy('employee_id');

        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'confirmation', 'label' => 'Confirmation', 'align' => 'center'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'years', 'label' => 'Years', 'align' => 'center'],
            ['key' => 'basic', 'label' => 'Basic', 'align' => 'right', 'numeric' => true],
            ['key' => 'multiplier', 'label' => '×', 'align' => 'center'],
            ['key' => 'credit', 'label' => 'Credit', 'align' => 'right', 'numeric' => true],
            ['key' => 'debit', 'label' => 'Debit', 'align' => 'right', 'numeric' => true],
            ['key' => 'balance', 'label' => 'Balance', 'align' => 'right', 'numeric' => true],
            ['key' => 'notes', 'label' => 'Notes'],
        ];

        $rows = [];
        $sl = 0;
        $totalCredit = 0.0;
        $totalDebit = 0.0;
        $singleEmployeeHeader = null;

        foreach ($employees as $employee) {
            $calc = $this->gratuityService->calculate($employee, $asOf);
            $entitlement = $calc['eligible'] ? (float) $calc['gratuity_amount'] : 0.0;
            $balance = $entitlement;
            $payments = $paymentsByEmployee->get($employee->id, collect());
            $paidTotal = (float) $payments->where('status', 'paid')->sum('gratuity_amount');

            if ($employees->count() === 1) {
                $singleEmployeeHeader = [
                    'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
                    'pin' => $employee->pin,
                    'branch' => $employee->branch?->name,
                    'department' => $employee->department?->name,
                    'designation' => $employee->designation?->name,
                    'confirmation_date' => $employee->confirmation_date?->format('d-m-Y') ?? '',
                    'service_end' => Carbon::parse($calc['service_end'])->format('d-m-Y'),
                    'years' => $calc['completed_years'],
                    'basic' => (float) $calc['basic_salary'],
                    'multiplier' => $calc['basic_multiplier'],
                    'gratuity' => $entitlement,
                    'eligible' => $calc['eligible'] ? 'Yes' : 'No',
                    'paid_total' => $paidTotal,
                    'outstanding' => max(0, $entitlement - $paidTotal),
                ];
            }

            $confirmation = $employee->confirmation_date?->format('d-m-Y') ?? '';

            $sl++;
            $rows[] = [
                'sl' => $sl,
                'pin' => $employee->pin,
                'name' => $employee->name_en,
                'confirmation' => $confirmation,
                'branch' => $employee->branch?->name,
                'date' => $asOf->format('d-M-Y'),
                'years' => $calc['completed_years'],
                'basic' => (float) $calc['basic_salary'],
                'multiplier' => $calc['basic_multiplier'],
                'credit' => $entitlement,
                'debit' => 0,
                'balance' => $balance,
                'notes' => $calc['label'],
            ];
            $totalCredit += $entitlement;

            foreach ($payments as $payment) {
                $sl++;
                $debit = $payment->status === 'paid' ? (float) $payment->gratuity_amount : 0.0;
                if ($debit > 0) {
                    $balance = max(0, $balance - $debit);
                    $totalDebit += $debit;
                }

                $rows[] = [
                    'sl' => $sl,
                    'pin' => $employee->pin,
                    'name' => $employee->name_en,
                    'confirmation' => $confirmation,
                    'branch' => $employee->branch?->name,
                    'date' => $payment->payment_date?->format('d-M-Y') ?? $payment->created_at?->format('d-M-Y') ?? '—',
                    'years' => $payment->completed_years,
                    'basic' => (float) $payment->basic_salary_used,
                    'multiplier' => $payment->basic_multiplier,
                    'credit' => 0,
                    'debit' => $debit,
                    'balance' => $balance,
                    'notes' => $payment->notes ?? '',
                ];
            }
        }

        return [
            'template' => 'gratuity-ledger',
            'employee' => $singleEmployeeHeader,
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'sl' => 'Total',
                'pin' => $employees->count().' employees',
                'credit' => $totalCredit,
                'debit' => $totalDebit,
            ],
            'meta' => [
                'row_count' => count($rows),
                'employee_count' => $employees->count(),
            ],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    protected function buildEntitlementsTable(array $filters, array $config, bool $eligibleOnly, bool $unpaidOnly): array
    {
        $asOf = Carbon::parse($filters['as_of'] ?: today());
        $rows = $this->employeeRows($filters, $asOf);

        if ($eligibleOnly || ! empty($config['eligible_only'])) {
            $rows = $rows->filter(fn (array $r) => $r['_eligible']);
        }

        if ($filters['eligibility'] === 'eligible') {
            $rows = $rows->filter(fn (array $r) => $r['_eligible']);
        } elseif ($filters['eligibility'] === 'not_eligible') {
            $rows = $rows->filter(fn (array $r) => ! $r['_eligible']);
        }

        if ($filters['payment_status'] === 'paid') {
            $rows = $rows->filter(fn (array $r) => $r['_payment_state'] === 'paid');
        } elseif ($filters['payment_status'] === 'unpaid') {
            $rows = $rows->filter(fn (array $r) => in_array($r['_payment_state'], ['unpaid', 'pending'], true));
        } elseif ($filters['payment_status'] === 'pending') {
            $rows = $rows->filter(fn (array $r) => $r['_payment_state'] === 'pending');
        }

        if ($unpaidOnly) {
            $rows = $rows->filter(fn (array $r) => $r['_eligible'] && $r['_payment_state'] !== 'paid');
        }

        $mapped = $rows->values()->map(fn (array $r, int $i) => [
            'sl' => $i + 1,
            'pin' => $r['pin'],
            'name' => $r['name'],
            'branch' => $r['branch'],
            'department' => $r['department'],
            'designation' => $r['designation'],
            'joining_date' => $r['joining_date'],
            'service_end' => $r['service_end'],
            'years' => $r['years'],
            'basic' => $r['basic'],
            'multiplier' => $r['multiplier'],
            'gratuity' => $r['gratuity'],
            'eligible' => $r['eligible'],
            'payment' => $r['payment'],
        ]);

        $eligibleRows = $rows->filter(fn (array $r) => $r['eligible'] === 'Yes');

        return [
            'template' => 'gratuity-table',
            'columns' => $this->entitlementColumns(),
            'rows' => $mapped->all(),
            'totals' => [
                'sl' => 'Total',
                'pin' => '',
                'name' => $mapped->count().' employees',
                'branch' => '',
                'department' => '',
                'designation' => '',
                'joining_date' => '',
                'service_end' => '',
                'years' => '',
                'basic' => $eligibleRows->sum('basic'),
                'multiplier' => '',
                'gratuity' => $eligibleRows->sum('gratuity'),
                'eligible' => $eligibleRows->count().' eligible',
                'payment' => '',
            ],
            'meta' => [
                'row_count' => $mapped->count(),
                'total_liability' => $eligibleRows->sum('gratuity'),
            ],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildUnpaidTable(array $filters): array
    {
        return $this->buildEntitlementsTable($filters, ['report' => 'unpaid_liability'], true, true);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildLiabilityGrouped(array $filters, string $groupBy): array
    {
        $asOf = Carbon::parse($filters['as_of'] ?: today());
        $rows = $this->employeeRows($filters, $asOf)->filter(fn (array $r) => $r['_eligible']);

        $key = $groupBy === 'department' ? 'department' : 'branch';

        $sections = $rows
            ->groupBy(fn (array $r) => $r[$key] ?: '—')
            ->map(function (Collection $group, string $title) {
                return [
                    'title' => $title,
                    'employee_count' => $group->count(),
                    'total_basic' => $group->sum('basic'),
                    'total_gratuity' => $group->sum('gratuity'),
                ];
            })
            ->sortKeys()
            ->values()
            ->all();

        return [
            'template' => 'gratuity-grouped',
            'sections' => $sections,
            'totals' => [
                'title' => 'Grand total',
                'employee_count' => $rows->count(),
                'total_basic' => $rows->sum('basic'),
                'total_gratuity' => $rows->sum('gratuity'),
            ],
            'meta' => ['row_count' => count($sections)],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildSettlementHistory(array $filters): array
    {
        $query = EmployeeGratuityPayment::query()
            ->with(['employee.branch:id,name', 'employee.department:id,name'])
            ->whereHas('employee', fn ($q) => $q->forGratuity())
            ->when($filters['branch_id'], fn ($q) => $q->whereHas(
                'employee',
                fn ($e) => $e->where('current_branch_id', (int) $filters['branch_id'])
            ))
            ->when($filters['department_id'], fn ($q) => $q->whereHas(
                'employee',
                fn ($e) => $e->where('department_id', (int) $filters['department_id'])
            ))
            ->when($filters['employee_id'], fn ($q) => $q->where('employee_id', (int) $filters['employee_id']))
            ->when($filters['date_from'], fn ($q) => $q->whereDate('payment_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn ($q) => $q->whereDate('payment_date', '<=', $filters['date_to']))
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->limit(2000);

        $records = $query->get();

        $mapped = $records->map(function (EmployeeGratuityPayment $p, int $i) {
            $emp = $p->employee;

            return [
                'sl' => $i + 1,
                'pin' => $emp?->pin ?? '—',
                'name' => $emp?->name_en ?? '—',
                'branch' => $emp?->branch?->name ?? '—',
                'department' => $emp?->department?->name ?? '—',
                'service_end' => $p->service_end_date?->format('d-m-Y') ?? '—',
                'years' => $p->completed_years,
                'multiplier' => $p->basic_multiplier,
                'basic' => (float) $p->basic_salary_used,
                'gratuity' => (float) $p->gratuity_amount,
                'status' => ucfirst($p->status),
                'paid_on' => $p->payment_date?->format('d-m-Y') ?? '—',
                'reference' => $p->payment_reference ?? '—',
            ];
        });

        return [
            'template' => 'gratuity-table',
            'columns' => $this->settlementColumns(),
            'rows' => $mapped->all(),
            'totals' => [
                'sl' => 'Total',
                'pin' => '',
                'name' => $mapped->count().' records',
                'branch' => '',
                'department' => '',
                'service_end' => '',
                'years' => '',
                'multiplier' => '',
                'basic' => '',
                'gratuity' => $mapped->sum('gratuity'),
                'status' => '',
                'paid_on' => '',
                'reference' => '',
            ],
            'meta' => ['row_count' => $mapped->count()],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPaymentSummary(array $filters): array
    {
        $query = EmployeeGratuityPayment::query()
            ->whereHas('employee', fn ($q) => $q->forGratuity())
            ->when($filters['branch_id'], fn ($q) => $q->whereHas(
                'employee',
                fn ($e) => $e->where('current_branch_id', (int) $filters['branch_id'])
            ))
            ->when($filters['date_from'], fn ($q) => $q->whereDate('created_at', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn ($q) => $q->whereDate('created_at', '<=', $filters['date_to']));

        $grouped = $query->get()->groupBy('status');

        $rows = collect(['paid', 'approved', 'calculated'])->map(function (string $status, int $i) use ($grouped) {
            $items = $grouped->get($status, collect());

            return [
                'sl' => $i + 1,
                'status' => ucfirst($status),
                'count' => $items->count(),
                'total' => $items->sum('gratuity_amount'),
            ];
        })->filter(fn (array $r) => $r['count'] > 0)->values();

        return [
            'template' => 'gratuity-table',
            'columns' => [
                ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
                ['key' => 'status', 'label' => 'Status', 'align' => 'left'],
                ['key' => 'count', 'label' => 'Records', 'align' => 'right'],
                ['key' => 'total', 'label' => 'Total amount', 'align' => 'right', 'numeric' => true],
            ],
            'rows' => $rows->all(),
            'totals' => [
                'sl' => '',
                'status' => 'Total',
                'count' => $rows->sum('count'),
                'total' => $rows->sum('total'),
            ],
            'meta' => ['row_count' => $rows->count()],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildRulesTable(): array
    {
        $tiers = collect(config('payroll.gratuity_tiers', []))->sortBy('min_years')->values();

        $rows = $tiers->map(fn (array $t, int $i) => [
            'sl' => $i + 1,
            'min_years' => $t['min_years'],
            'multiplier' => $t['basic_multiplier'],
            'description' => $t['min_years'].'+ years completed → basic × years × '.$t['basic_multiplier'].' gratuity',
        ])->all();

        $rows[] = [
            'sl' => '',
            'min_years' => 'Below 5 years',
            'multiplier' => '0',
            'description' => 'Not eligible for gratuity',
        ];

        return [
            'template' => 'gratuity-rules',
            'rows' => $rows,
            'meta' => ['row_count' => count($rows)],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    protected function employeeRows(array $filters, Carbon $asOf): Collection
    {
        $employees = Employee::query()
            ->with(['branch:id,name', 'department:id,name', 'designation:id,name', 'salaryStep:id,basic_salary'])
            ->forGratuity()
            ->when($filters['branch_id'], fn ($q) => $q->where('current_branch_id', (int) $filters['branch_id']))
            ->when($filters['department_id'], fn ($q) => $q->where('department_id', (int) $filters['department_id']))
            ->when($filters['employee_id'], fn ($q) => $q->whereKey((int) $filters['employee_id']))
            ->whereIn('status', ['active', 'on_leave', 'inactive', 'terminated'])
            ->whereNotNull('joining_date')
            ->orderBy('pin')
            ->limit(2000)
            ->get();

        $payments = EmployeeGratuityPayment::query()
            ->whereIn('employee_id', $employees->pluck('id'))
            ->orderByDesc('id')
            ->get()
            ->groupBy('employee_id');

        return $employees->map(function (Employee $employee) use ($asOf, $payments) {
            $calc = $this->gratuityService->calculate($employee, $asOf);
            $empPayments = $payments->get($employee->id, collect());
            $paidRecord = $empPayments->firstWhere('status', 'paid');
            $pendingRecord = $empPayments->first(
                fn (EmployeeGratuityPayment $p) => in_array($p->status, ['calculated', 'approved'], true)
            );

            $paymentState = $paidRecord ? 'paid' : ($pendingRecord ? 'pending' : 'unpaid');

            return [
                'pin' => $employee->pin ?? '—',
                'name' => $employee->name_en ?? '—',
                'branch' => $employee->branch?->name ?? '—',
                'department' => $employee->department?->name ?? '—',
                'designation' => $employee->designation?->name ?? '—',
                'joining_date' => $employee->joining_date?->format('d-m-Y') ?? '—',
                'service_end' => Carbon::parse($calc['service_end'])->format('d-m-Y'),
                'years' => $calc['completed_years'],
                'basic' => $calc['basic_salary'],
                'multiplier' => $calc['basic_multiplier'],
                'gratuity' => $calc['gratuity_amount'],
                'eligible' => $calc['eligible'] ? 'Yes' : 'No',
                'payment' => match ($paymentState) {
                    'paid' => 'Paid'.($paidRecord?->payment_date ? ' ('.$paidRecord->payment_date->format('d-m-Y').')' : ''),
                    'pending' => 'Pending',
                    default => 'Unpaid',
                },
                '_eligible' => $calc['eligible'],
                '_payment_state' => $paymentState,
            ];
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function entitlementColumns(): array
    {
        return [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN', 'align' => 'left'],
            ['key' => 'name', 'label' => 'Employee name', 'align' => 'left'],
            ['key' => 'branch', 'label' => 'Branch', 'align' => 'left'],
            ['key' => 'department', 'label' => 'Department', 'align' => 'left'],
            ['key' => 'designation', 'label' => 'Designation', 'align' => 'left'],
            ['key' => 'joining_date', 'label' => 'Joining', 'align' => 'center'],
            ['key' => 'service_end', 'label' => 'Service end', 'align' => 'center'],
            ['key' => 'years', 'label' => 'Years', 'align' => 'right'],
            ['key' => 'basic', 'label' => 'Basic salary', 'align' => 'right', 'numeric' => true],
            ['key' => 'multiplier', 'label' => '×', 'align' => 'center'],
            ['key' => 'gratuity', 'label' => 'Gratuity', 'align' => 'right', 'numeric' => true],
            ['key' => 'eligible', 'label' => 'Eligible', 'align' => 'center'],
            ['key' => 'payment', 'label' => 'Payment', 'align' => 'center'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function settlementColumns(): array
    {
        return [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN', 'align' => 'left'],
            ['key' => 'name', 'label' => 'Employee name', 'align' => 'left'],
            ['key' => 'branch', 'label' => 'Branch', 'align' => 'left'],
            ['key' => 'department', 'label' => 'Department', 'align' => 'left'],
            ['key' => 'service_end', 'label' => 'Service end', 'align' => 'center'],
            ['key' => 'years', 'label' => 'Years', 'align' => 'right'],
            ['key' => 'multiplier', 'label' => '×', 'align' => 'center'],
            ['key' => 'basic', 'label' => 'Basic used', 'align' => 'right', 'numeric' => true],
            ['key' => 'gratuity', 'label' => 'Amount paid', 'align' => 'right', 'numeric' => true],
            ['key' => 'status', 'label' => 'Status', 'align' => 'center'],
            ['key' => 'paid_on', 'label' => 'Paid on', 'align' => 'center'],
            ['key' => 'reference', 'label' => 'Reference', 'align' => 'left'],
        ];
    }
}
