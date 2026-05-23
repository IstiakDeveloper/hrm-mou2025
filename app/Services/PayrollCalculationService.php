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

    public function __construct(
        protected TaxSlabService $taxSlabService,
        protected EmployeeProvidentFundService $pfService,
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
     *   lines: list<array{salary_head_id: ?int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}>,
     *   grade_label: ?string,
     *   step_number: ?int,
     *   warnings: list<string>
     * }
     */
    public function calculateForEmployee(Employee $employee, Carbon $processDate, string $salaryType = 'salary'): array
    {
        if ($salaryType !== 'salary') {
            return $this->calculateWithoutStatutory($employee, $processDate, $salaryType);
        }

        $warnings = [];
        $lines = [];
        $sort = 0;

        $structure = null;
        $basic = (float) ($employee->basic_salary ?? 0);
        $gradeLabel = null;
        $stepNumber = null;
        $hasPayrollAssignment = $employee->payscale_id
            && $employee->salary_grade_id
            && $employee->salary_step_id;

        if ($hasPayrollAssignment) {
            $structure = SalaryStructure::query()
                ->where('payscale_id', $employee->payscale_id)
                ->where('salary_grade_id', $employee->salary_grade_id)
                ->where('salary_step_id', $employee->salary_step_id)
                ->with(['lines.head', 'grade', 'step'])
                ->first();

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

        $deduction = 0.0;
        foreach ($lines as $line) {
            if ($line['type'] === 'deduction') {
                $deduction += $line['computed_amount'];
            }
        }

        $isWithheld = SalaryWithheld::query()
            ->where('employee_id', $employee->id)
            ->where('year', $processDate->year)
            ->where('month', $processDate->month)
            ->where('salary_type', $salaryType)
            ->exists();

        $net = $isWithheld ? 0.0 : SalaryStructureCalculator::roundTaka($gross - $deduction);

        return [
            'basic_salary' => $basic,
            'gross_salary' => $gross,
            'total_deduction' => SalaryStructureCalculator::roundTaka($deduction),
            'net_payable' => $net,
            'pf_employee_contribution' => $pf['employee'],
            'pf_employer_contribution' => $pf['employer'],
            'income_tax' => $incomeTax,
            'lines' => $lines,
            'grade_label' => $gradeLabel,
            'step_number' => $stepNumber,
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
        $isWithheld = SalaryWithheld::query()
            ->where('employee_id', $employee->id)
            ->where('year', $processDate->year)
            ->where('month', $processDate->month)
            ->where('salary_type', $salaryType)
            ->exists();

        return [
            'basic_salary' => $result['basic_salary'],
            'gross_salary' => $gross,
            'total_deduction' => 0.0,
            'net_payable' => $isWithheld ? 0.0 : $gross,
            'pf_employee_contribution' => 0.0,
            'pf_employer_contribution' => 0.0,
            'income_tax' => 0.0,
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
        return $head->is_pf_head || $head->is_income_tax_head;
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
        return SalaryHeadModification::query()
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $asOfDate)
            ->orderByDesc('effective_from')
            ->get()
            ->unique('salary_head_id')
            ->keyBy('salary_head_id');
    }
}
