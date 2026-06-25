<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\SalaryHead;
use App\Models\SalaryHeadModification;
use App\Models\SalaryStructure;
use App\Models\SalaryWithheld;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PayrollCalculationService
{
    /** @var Collection<int, SalaryHead>|null */
    protected ?Collection $activeComponentHeads = null;

    protected ?SalaryHead $pfHead = null;

    protected ?SalaryHead $taxHead = null;

    /** @var Collection<int, Collection<int, SalaryHeadModification>>|null */
    protected ?Collection $batchModificationsByEmployee = null;

    /** @var Collection<string, SalaryStructure>|null */
    protected ?Collection $batchStructures = null;

    /** @var array<int, true> */
    protected array $batchWithheldEmployeeIds = [];

    protected bool $batchMode = false;

    public function __construct(
        protected TaxSlabService $taxSlabService,
        protected EmployeeProvidentFundService $pfService,
        protected EmployeeLoanService $loanService,
        protected ProbationSalaryService $probationSalaryService,
        protected FixedSalaryService $fixedSalaryService,
        protected SeparationPayrollService $separationPayrollService,
    ) {}

    /**
     * @return array{
     *   basic_salary: float,
     *   gross_salary: float,
     *   total_deduction: float,
     *   net_payable: float,
     *   pf_employee_contribution: float,
     *   pf_employer_contribution: float,
     *   income_tax: float,
     *   loan_deductions: list<array{installment: \App\Models\EmployeeLoanInstallment, loan: \App\Models\EmployeeLoan, amount: float, salary_head_id: int, head_name: string}>,
     *   lines: list<array{salary_head_id: ?int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}>,
     *   grade_label: ?string,
     *   step_number: ?int,
     *   warnings: list<string>
     * }
     */
    public function calculateForEmployee(
        Employee $employee,
        Carbon $processDate,
        string $salaryType = 'salary',
        ?int $payrollYear = null,
        ?int $payrollMonth = null,
    ): array {
        if ($salaryType !== 'salary') {
            return $this->calculateWithoutStatutory($employee, $processDate, $salaryType);
        }

        $warnings = [];
        $lines = [];
        $sort = 0;

        if ($this->probationSalaryService->isOnProbation($employee, $processDate)) {
            $probationAmount = (float) ($this->probationSalaryService->resolveAmount($employee, $processDate) ?? 0);
            $result = $this->calculateProbationSalary(
                $employee,
                $processDate,
                $probationAmount,
                $salaryType,
                $payrollYear,
                $payrollMonth,
            );

            if ($probationAmount <= 0) {
                $result['warnings'][] = 'Employee is on probation but no probation salary matched (configure rules or override in Payroll → Probation Salary).';
            }

            return $this->finalizePayrollResult($employee, $salaryType, $payrollYear, $payrollMonth, $result);
        }

        if ($this->fixedSalaryService->applies($employee, $processDate)) {
            $fixedAmount = (float) ($this->fixedSalaryService->resolveAmount($employee) ?? 0);
            $result = $this->calculateFixedSalary(
                $employee,
                $processDate,
                $fixedAmount,
                $salaryType,
            );

            if ($fixedAmount <= 0) {
                $result['warnings'][] = 'Employee has no grade assignment and no fixed salary (configure in Payroll → Fixed Salary).';
            }

            return $this->finalizePayrollResult($employee, $salaryType, $payrollYear, $payrollMonth, $result);
        }

        $structure = null;
        $basic = $employee->resolveBasicSalary();
        $gradeLabel = null;
        $stepNumber = null;
        $hasPayrollAssignment = $employee->payscale_id
            && $employee->salary_grade_id
            && $employee->salary_step_id;

        if ($hasPayrollAssignment) {
            $structure = $this->resolveSalaryStructure($employee);

            $gradeLabel = $structure?->grade?->name ?? $employee->salaryGrade?->name;
            $stepNumber = $structure?->step?->step_number ?? $employee->salaryStep?->step_number;

            if ($structure) {
                $basic = $structure->basic_salary !== null
                    ? (float) $structure->basic_salary
                    : (float) ($structure->step?->basic_salary ?? $basic);
            } else {
                $basic = (float) ($employee->salaryStep?->basic_salary ?? $basic);
            }
        } else {
            $warnings[] = 'Employee missing payscale/grade/step assignment.';
        }

        $basic = SalaryStructureCalculator::roundTaka($basic);

        $lines[] = [
            'salary_head_id' => null,
            'head_name' => 'Basic',
            'type' => 'earning',
            'amount_type' => 'fixed',
            'input_value' => $basic,
            'computed_amount' => $basic,
            'sort_order' => $sort++,
        ];

        $modifications = $this->activeModifications($employee->id, $processDate);

        if ($structure) {
            foreach ($structure->lines as $line) {
                $head = $line->head;
                if (! $head || $head->is_basic_head || $this->isStatutoryHead($head)) {
                    continue;
                }

                $mod = $modifications->get($head->id);
                $lines[] = $this->buildComponentLine(
                    $head,
                    $mod?->amount_type ?? ($line->amount_type ?? 'fixed'),
                    $mod ? (float) $mod->amount : (float) $line->value,
                    $basic,
                    $sort++
                );
            }
        } elseif ($hasPayrollAssignment) {
            foreach ($this->activeComponentHeads() as $head) {
                $mod = $modifications->get($head->id);
                $lines[] = $this->buildComponentLine(
                    $head,
                    $mod?->amount_type ?? ($head->default_amount_type ?? 'fixed'),
                    $mod ? (float) $mod->amount : (float) $head->default_amount,
                    $basic,
                    $sort++
                );
            }
        }

        $gross = 0.0;
        foreach ($lines as $line) {
            if ($line['type'] === 'earning') {
                $gross += $line['computed_amount'];
            }
        }
        $gross = SalaryStructureCalculator::roundTaka($gross);

        $pf = ['employee' => 0.0, 'employer' => 0.0];
        if ($this->pfService->isEligible($employee)) {
            $pf = $this->pfService->contributionFromBasic($basic);
            $pfHead = $this->resolvePfHead();
            $lines[] = [
                'salary_head_id' => $pfHead->id,
                'head_name' => $pfHead->short_name ?? $pfHead->name,
                'type' => 'deduction',
                'amount_type' => 'percentage',
                'input_value' => (float) config('payroll.pf_employee_percent', 10),
                'computed_amount' => $pf['employee'],
                'sort_order' => $sort++,
            ];
        }

        $incomeTax = $this->taxSlabService->taxForGross($gross);
        if ($incomeTax > 0) {
            $taxHead = $this->resolveTaxHead();
            $lines[] = [
                'salary_head_id' => $taxHead->id,
                'head_name' => $taxHead->short_name ?? $taxHead->name,
                'type' => 'deduction',
                'amount_type' => 'fixed',
                'input_value' => $incomeTax,
                'computed_amount' => $incomeTax,
                'sort_order' => $sort++,
            ];
        }

        $loanYear = $payrollYear ?? (int) $processDate->year;
        $loanMonth = $payrollMonth ?? (int) $processDate->month;

        $loanDeductions = $this->loanService->deductionsForPayroll(
            $employee,
            $loanYear,
            $loanMonth
        );
        foreach ($loanDeductions as $loanRow) {
            $lines[] = [
                'salary_head_id' => $loanRow['salary_head_id'],
                'head_name' => $loanRow['head_name'],
                'type' => 'deduction',
                'amount_type' => 'fixed',
                'input_value' => $loanRow['amount'],
                'computed_amount' => $loanRow['amount'],
                'sort_order' => $sort++,
            ];
        }

        $deduction = 0.0;
        foreach ($lines as $line) {
            if ($line['type'] === 'deduction') {
                $deduction += $line['computed_amount'];
            }
        }

        $isWithheld = $this->isSalaryWithheld($employee->id, $processDate, $salaryType);

        $net = $isWithheld ? 0.0 : SalaryStructureCalculator::roundTaka($gross - $deduction);

        return $this->finalizePayrollResult($employee, $salaryType, $payrollYear, $payrollMonth, [
            'basic_salary' => $basic,
            'gross_salary' => $gross,
            'total_deduction' => SalaryStructureCalculator::roundTaka($deduction),
            'net_payable' => $net,
            'pf_employee_contribution' => $pf['employee'],
            'pf_employer_contribution' => $pf['employer'],
            'income_tax' => $incomeTax,
            'loan_deductions' => $loanDeductions,
            'lines' => $lines,
            'grade_label' => $gradeLabel,
            'step_number' => $stepNumber,
            'is_withheld' => $isWithheld,
            'warnings' => $warnings,
        ]);
    }

    /**
     * Preload shared payroll data for a branch run to avoid per-employee query storms.
     *
     * @param  Collection<int, Employee>  $employees
     */
    public function preloadBatch(
        Collection $employees,
        Carbon $processDate,
        string $salaryType,
        int $year,
        int $month,
    ): void {
        $this->clearBatch();
        $this->batchMode = true;

        $employeeIds = $employees->pluck('id')->filter()->values();
        if ($employeeIds->isEmpty()) {
            return;
        }

        $this->batchModificationsByEmployee = SalaryHeadModification::query()
            ->whereIn('employee_id', $employeeIds)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $processDate)
            ->orderByDesc('effective_from')
            ->get()
            ->groupBy('employee_id')
            ->map(fn (Collection $rows) => $rows->unique('salary_head_id')->keyBy('salary_head_id'));

        $structureKeys = $employees
            ->filter(fn (Employee $employee) => $employee->payscale_id && $employee->salary_grade_id && $employee->salary_step_id)
            ->map(fn (Employee $employee) => [
                'payscale_id' => $employee->payscale_id,
                'salary_grade_id' => $employee->salary_grade_id,
                'salary_step_id' => $employee->salary_step_id,
            ])
            ->unique(fn (array $key) => "{$key['payscale_id']}-{$key['salary_grade_id']}-{$key['salary_step_id']}")
            ->values();

        if ($structureKeys->isNotEmpty()) {
            $this->batchStructures = SalaryStructure::query()
                ->with(['lines.head', 'grade', 'step'])
                ->where(function ($query) use ($structureKeys) {
                    foreach ($structureKeys as $key) {
                        $query->orWhere(function ($inner) use ($key) {
                            $inner->where('payscale_id', $key['payscale_id'])
                                ->where('salary_grade_id', $key['salary_grade_id'])
                                ->where('salary_step_id', $key['salary_step_id']);
                        });
                    }
                })
                ->get()
                ->keyBy(fn (SalaryStructure $structure) => "{$structure->payscale_id}-{$structure->salary_grade_id}-{$structure->salary_step_id}");
        } else {
            $this->batchStructures = collect();
        }

        $this->batchWithheldEmployeeIds = SalaryWithheld::query()
            ->whereIn('employee_id', $employeeIds)
            ->where('year', $processDate->year)
            ->where('month', $processDate->month)
            ->where('salary_type', $salaryType)
            ->pluck('employee_id')
            ->mapWithKeys(fn ($id) => [(int) $id => true])
            ->all();

        $this->loanService->preloadDeductionsForPayroll($employeeIds, $year, $month);
    }

    public function clearBatch(): void
    {
        $this->batchMode = false;
        $this->batchModificationsByEmployee = null;
        $this->batchStructures = null;
        $this->batchWithheldEmployeeIds = [];
        $this->loanService->clearDeductionsBatch();
    }

    protected function resolveSalaryStructure(Employee $employee): ?SalaryStructure
    {
        if (! $employee->payscale_id || ! $employee->salary_grade_id || ! $employee->salary_step_id) {
            return null;
        }

        $key = "{$employee->payscale_id}-{$employee->salary_grade_id}-{$employee->salary_step_id}";

        if ($this->batchStructures !== null) {
            return $this->batchStructures->get($key);
        }

        return SalaryStructure::query()
            ->where('payscale_id', $employee->payscale_id)
            ->where('salary_grade_id', $employee->salary_grade_id)
            ->where('salary_step_id', $employee->salary_step_id)
            ->with(['lines.head', 'grade', 'step'])
            ->first();
    }

    protected function isSalaryWithheld(int $employeeId, Carbon $processDate, string $salaryType): bool
    {
        if ($this->batchMode) {
            return isset($this->batchWithheldEmployeeIds[$employeeId]);
        }

        return SalaryWithheld::query()
            ->where('employee_id', $employeeId)
            ->where('year', $processDate->year)
            ->where('month', $processDate->month)
            ->where('salary_type', $salaryType)
            ->exists();
    }

    /**
     * Fixed probation salary — flat gross only; no salary components, PF, tax, or loans.
     *
     * @return array{
     *   basic_salary: float,
     *   gross_salary: float,
     *   total_deduction: float,
     *   net_payable: float,
     *   pf_employee_contribution: float,
     *   pf_employer_contribution: float,
     *   income_tax: float,
     *   loan_deductions: list<array{installment: \App\Models\EmployeeLoanInstallment, loan: \App\Models\EmployeeLoan, amount: float, salary_head_id: int, head_name: string}>,
     *   lines: list<array{salary_head_id: ?int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}>,
     *   grade_label: ?string,
     *   step_number: ?int,
     *   is_withheld: bool,
     *   warnings: list<string>
     * }
     */
    protected function calculateProbationSalary(
        Employee $employee,
        Carbon $processDate,
        float $probationAmount,
        string $salaryType,
        ?int $payrollYear,
        ?int $payrollMonth,
    ): array {
        return $this->calculateFlatMonthlySalary(
            $employee,
            $processDate,
            $probationAmount,
            $salaryType,
            'Probation Salary',
            $probationAmount > 0 ? 'Probation salary only — no salary components or deductions.' : null,
        );
    }

    protected function calculateFixedSalary(
        Employee $employee,
        Carbon $processDate,
        float $fixedAmount,
        string $salaryType,
    ): array {
        return $this->calculateFlatMonthlySalary(
            $employee,
            $processDate,
            $fixedAmount,
            $salaryType,
            'Fixed Salary',
            $fixedAmount > 0 ? 'Fixed salary only — no grade structure, components, or deductions.' : null,
        );
    }

    /**
     * @return array{
     *   basic_salary: float,
     *   gross_salary: float,
     *   total_deduction: float,
     *   net_payable: float,
     *   pf_employee_contribution: float,
     *   pf_employer_contribution: float,
     *   income_tax: float,
     *   loan_deductions: list<array{installment: \App\Models\EmployeeLoanInstallment, loan: \App\Models\EmployeeLoan, amount: float, salary_head_id: int, head_name: string}>,
     *   lines: list<array{salary_head_id: ?int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}>,
     *   grade_label: ?string,
     *   step_number: ?int,
     *   is_withheld: bool,
     *   warnings: list<string>
     * }
     */
    protected function calculateFlatMonthlySalary(
        Employee $employee,
        Carbon $processDate,
        float $amount,
        string $salaryType,
        string $headLabel,
        ?string $warningNote,
    ): array {
        $warnings = $warningNote ? [$warningNote] : [];
        $sort = 0;
        $basic = SalaryStructureCalculator::roundTaka($amount);
        $gross = $basic;

        $lines = [[
            'salary_head_id' => null,
            'head_name' => $headLabel,
            'type' => 'earning',
            'amount_type' => 'fixed',
            'input_value' => $basic,
            'computed_amount' => $basic,
            'sort_order' => $sort++,
        ]];

        $pf = ['employee' => 0.0, 'employer' => 0.0];
        $incomeTax = 0.0;
        $loanDeductions = [];
        $deduction = 0.0;

        $isWithheld = $this->isSalaryWithheld($employee->id, $processDate, $salaryType);

        return [
            'basic_salary' => $basic,
            'gross_salary' => $gross,
            'total_deduction' => SalaryStructureCalculator::roundTaka($deduction),
            'net_payable' => $isWithheld ? 0.0 : SalaryStructureCalculator::roundTaka($gross - $deduction),
            'pf_employee_contribution' => $pf['employee'],
            'pf_employer_contribution' => $pf['employer'],
            'income_tax' => $incomeTax,
            'loan_deductions' => $loanDeductions,
            'lines' => $lines,
            'grade_label' => $headLabel,
            'step_number' => null,
            'is_withheld' => $isWithheld,
            'warnings' => $warnings,
        ];
    }

    /**
     * Bonus/arrear: earnings only (no PF/tax slab in this pass).
     *
     * @return array{
     *   basic_salary: float,
     *   gross_salary: float,
     *   total_deduction: float,
     *   net_payable: float,
     *   pf_employee_contribution: float,
     *   pf_employer_contribution: float,
     *   income_tax: float,
     *   lines: list<array{salary_head_id: ?int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}>,
     *   grade_label: ?string,
     *   step_number: ?int,
     *   warnings: list<string>
     * }
     */
    protected function calculateWithoutStatutory(Employee $employee, Carbon $processDate, string $salaryType): array
    {
        $result = $this->calculateForEmployee($employee, $processDate, 'salary');
        // Strip statutory lines for non-salary types — reuse core earnings only
        $earningLines = array_values(array_filter(
            $result['lines'],
            fn ($line) => $line['type'] === 'earning'
        ));

        $gross = SalaryStructureCalculator::roundTaka(array_sum(array_column($earningLines, 'computed_amount')));
        $isWithheld = $this->isSalaryWithheld($employee->id, $processDate, $salaryType);

        return [
            'basic_salary' => $result['basic_salary'],
            'gross_salary' => $gross,
            'total_deduction' => 0.0,
            'net_payable' => $isWithheld ? 0.0 : $gross,
            'pf_employee_contribution' => 0.0,
            'pf_employer_contribution' => 0.0,
            'income_tax' => 0.0,
            'loan_deductions' => [],
            'lines' => $earningLines,
            'grade_label' => $result['grade_label'],
            'step_number' => $result['step_number'],
            'is_withheld' => $isWithheld,
            'warnings' => $result['warnings'],
        ];
    }

    /**
     * @return Collection<int, SalaryHead>
     */
    protected function activeComponentHeads(): Collection
    {
        if ($this->activeComponentHeads === null) {
            $this->activeComponentHeads = SalaryHead::query()
                ->where('is_active', true)
                ->where('is_basic_head', false)
                ->where('is_pf_head', false)
                ->where('is_income_tax_head', false)
                ->where('is_loan_head', false)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
        }

        return $this->activeComponentHeads;
    }

    protected function resolvePfHead(): SalaryHead
    {
        if ($this->pfHead === null) {
            $this->pfHead = SalaryHead::query()
                ->where('code', StatutoryDeductionHeadsService::PF_CODE)
                ->first();

            if ($this->pfHead === null) {
                app(StatutoryDeductionHeadsService::class)->seed();
                $this->pfHead = SalaryHead::query()
                    ->where('code', StatutoryDeductionHeadsService::PF_CODE)
                    ->firstOrFail();
            }
        }

        return $this->pfHead;
    }

    protected function resolveTaxHead(): SalaryHead
    {
        if ($this->taxHead === null) {
            $this->taxHead = SalaryHead::query()
                ->where('code', StatutoryDeductionHeadsService::TAX_CODE)
                ->first();

            if ($this->taxHead === null) {
                app(StatutoryDeductionHeadsService::class)->seed();
                $this->taxHead = SalaryHead::query()
                    ->where('code', StatutoryDeductionHeadsService::TAX_CODE)
                    ->firstOrFail();
            }
        }

        return $this->taxHead;
    }

    protected function isStatutoryHead(SalaryHead $head): bool
    {
        return $head->is_pf_head || $head->is_income_tax_head || $head->is_loan_head;
    }

    /**
     * @return array{salary_head_id: int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}
     */
    protected function buildComponentLine(
        SalaryHead $head,
        string $amountType,
        float $inputValue,
        float $basic,
        int $sortOrder
    ): array {
        $computed = SalaryStructureCalculator::computeLineAmount(
            $head,
            $amountType,
            $inputValue,
            $basic
        );

        return [
            'salary_head_id' => $head->id,
            'head_name' => $head->short_name ?? $head->name,
            'type' => $head->type,
            'amount_type' => $amountType,
            'input_value' => $inputValue,
            'computed_amount' => $computed,
            'sort_order' => $sortOrder,
        ];
    }

    /**
     * Preview value for a single head (modification screen).
     */
    public function previewHeadValue(Employee $employee, SalaryHead $head, Carbon $asOfDate): array
    {
        $calc = $this->calculateForEmployee($employee, $asOfDate);
        $basic = $calc['basic_salary'];

        foreach ($calc['lines'] as $line) {
            if ($line['salary_head_id'] === $head->id) {
                return [
                    'amount_type' => $line['amount_type'],
                    'amount' => (string) $line['input_value'],
                    'computed' => $line['computed_amount'],
                    'basic_salary' => $basic,
                ];
            }
        }

        $amountType = $head->default_amount_type;
        $inputValue = (float) $head->default_amount;
        $computed = SalaryStructureCalculator::computeLineAmount($head, $amountType, $inputValue, $basic);

        return [
            'amount_type' => $amountType,
            'amount' => (string) $inputValue,
            'computed' => $computed,
            'basic_salary' => $basic,
        ];
    }

    /**
     * @return Collection<int, SalaryHeadModification>
     */
    protected function activeModifications(int $employeeId, Carbon $asOfDate): Collection
    {
        if ($this->batchModificationsByEmployee !== null) {
            return $this->batchModificationsByEmployee->get($employeeId, collect());
        }

        return SalaryHeadModification::query()
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $asOfDate)
            ->orderByDesc('effective_from')
            ->get()
            ->unique('salary_head_id')
            ->keyBy('salary_head_id');
    }

    /**
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    protected function finalizePayrollResult(
        Employee $employee,
        string $salaryType,
        ?int $payrollYear,
        ?int $payrollMonth,
        array $result,
    ): array {
        if ($salaryType !== 'salary' || ! $payrollYear || ! $payrollMonth) {
            return $result;
        }

        $proration = $this->separationPayrollService->resolveForPayrollMonth($employee, $payrollYear, $payrollMonth);

        if (! $proration['eligible']) {
            $result['warnings'][] = 'Employee has no payable days in this salary month due to separation timing.';
            $result['basic_salary'] = 0.0;
            $result['gross_salary'] = 0.0;
            $result['total_deduction'] = 0.0;
            $result['net_payable'] = 0.0;
            $result['pf_employee_contribution'] = 0.0;
            $result['pf_employer_contribution'] = 0.0;
            $result['income_tax'] = 0.0;
            $result['loan_deductions'] = [];
            $result['lines'] = [];

            return $result;
        }

        if ($proration['factor'] >= 1.0) {
            return $result;
        }

        return $this->scalePayrollResultBySeparationFactor($result, $proration);
    }

    /**
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $proration
     * @return array<string, mixed>
     */
    protected function scalePayrollResultBySeparationFactor(array $result, array $proration): array
    {
        $factor = (float) $proration['factor'];

        foreach ($result['lines'] as &$line) {
            $line['computed_amount'] = SalaryStructureCalculator::roundTaka((float) $line['computed_amount'] * $factor);
            if (($line['amount_type'] ?? '') === 'fixed') {
                $line['input_value'] = SalaryStructureCalculator::roundTaka((float) $line['input_value'] * $factor);
            }
        }
        unset($line);

        $gross = 0.0;
        $deduction = 0.0;
        $pfEmployee = 0.0;
        $incomeTax = 0.0;

        foreach ($result['lines'] as $line) {
            if ($line['type'] === 'earning') {
                $gross += (float) $line['computed_amount'];
            } elseif ($line['type'] === 'deduction') {
                $deduction += (float) $line['computed_amount'];
            }
        }

        $gross = SalaryStructureCalculator::roundTaka($gross);
        $deduction = SalaryStructureCalculator::roundTaka($deduction);

        foreach ($result['lines'] as $line) {
            $headName = strtolower((string) ($line['head_name'] ?? ''));
            if ($line['type'] !== 'deduction') {
                continue;
            }
            if (str_contains($headName, 'pf') || str_contains($headName, 'provident')) {
                $pfEmployee += (float) $line['computed_amount'];
            }
            if (str_contains($headName, 'tax')) {
                $incomeTax += (float) $line['computed_amount'];
            }
        }

        $loanDeductions = [];
        foreach ($result['loan_deductions'] ?? [] as $loanRow) {
            $loanDeductions[] = array_merge($loanRow, [
                'amount' => SalaryStructureCalculator::roundTaka((float) $loanRow['amount'] * $factor),
            ]);
        }

        $isWithheld = (bool) ($result['is_withheld'] ?? false);
        $net = $isWithheld ? 0.0 : SalaryStructureCalculator::roundTaka($gross - $deduction);

        $warnings = $result['warnings'] ?? [];
        if (! empty($proration['note'])) {
            $warnings[] = (string) $proration['note'];
        }

        $basic = SalaryStructureCalculator::roundTaka((float) ($result['basic_salary'] ?? 0) * $factor);

        return array_merge($result, [
            'basic_salary' => $basic,
            'gross_salary' => $gross,
            'total_deduction' => $deduction,
            'net_payable' => $net,
            'pf_employee_contribution' => SalaryStructureCalculator::roundTaka($pfEmployee),
            'pf_employer_contribution' => SalaryStructureCalculator::roundTaka((float) ($result['pf_employer_contribution'] ?? 0) * $factor),
            'income_tax' => SalaryStructureCalculator::roundTaka($incomeTax),
            'loan_deductions' => $loanDeductions,
            'lines' => $result['lines'],
            'warnings' => $warnings,
            'payable_days' => $proration['payable_days'],
            'days_in_month' => $proration['days_in_month'],
            'separation_proration_factor' => $factor,
            'payroll_remark' => $proration['payroll_remark'] ?? $proration['note'] ?? null,
        ]);
    }
}
