<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\SalaryHead;
use App\Models\SalaryStep;
use App\Models\SalaryStructure;
use App\Models\SeparationFinalPayment;
use App\Support\BranchOrganogram;
use App\Support\HeadOfficeOrganogram;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PayrollReportService
{
    /**
     * @return array<string, mixed>
     */
    public function filtersFromRequest(Request $request): array
    {
        return [
            'branch_id' => $request->filled('branch_id') ? (int) $request->input('branch_id') : null,
            'department_id' => $request->filled('department_id') ? (int) $request->input('department_id') : null,
            'designation_id' => $request->filled('designation_id') ? (int) $request->input('designation_id') : null,
            'program_id' => $request->filled('program_id') ? (int) $request->input('program_id') : null,
            'project_id' => $request->filled('project_id') ? (int) $request->input('project_id') : null,
            'employee_id' => $request->filled('employee_id') ? (int) $request->input('employee_id') : null,
            'salary_head_id' => $request->filled('salary_head_id') ? (int) $request->input('salary_head_id') : null,
            'payscale_id' => $request->filled('payscale_id') ? (int) $request->input('payscale_id') : null,
            'year' => $request->filled('year') ? (int) $request->input('year') : null,
            'month' => $request->filled('month') ? (int) $request->input('month') : null,
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'payment_status' => in_array($request->input('payment_status'), ['pending', 'paid'], true)
                ? $request->input('payment_status')
                : 'all',
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function build(string $slug, array $config, array $filters): array
    {
        $template = $config['template'] ?? 'generic';

        return match ($template) {
            'grade-step' => $this->gradeStepCalculation($filters),
            'salary-sheet' => $this->salarySheet($config, $filters),
            'salary-sheet-grouped' => $this->salarySheetGrouped($config, $filters),
            'bank-advice' => $this->bankAdvice($config, $filters),
            'head-register' => $this->headRegister($config, $filters),
            'advance-salary' => $this->advanceSalary($config, $filters),
            'bonus-register' => $this->bonusRegister($config, $filters),
            'final-payment' => $this->finalPayment($filters),
            'salary-certificate' => $this->salaryCertificate($config, $filters),
            default => ['rows' => [], 'meta' => ['message' => 'Unknown report type.'], 'template' => 'generic'],
        };
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function gradeStepCalculation(array $filters): array
    {
        $salaryHeads = SalaryHead::query()
            ->where('is_active', true)
            ->where('is_basic_head', false)
            ->orderByRaw("CASE WHEN type = 'earning' THEN 0 ELSE 1 END")
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $heads = $salaryHeads
            ->map(fn (SalaryHead $head) => $head->short_name ?? $head->name)
            ->values()
            ->all();

        $structures = SalaryStructure::query()
            ->with([
                'payscale:id,name,code',
                'grade:id,name,code,payscale_id',
                'step:id,step_number,basic_salary,salary_grade_id',
                'lines' => fn ($q) => $q->orderBy('sort_order'),
                'lines.head:id,name,short_name,type,is_basic_head',
            ])
            ->where('is_active', true)
            ->whereNotNull('salary_step_id')
            ->when($filters['payscale_id'], fn ($q, $id) => $q->where('payscale_id', $id))
            ->get()
            ->keyBy(fn (SalaryStructure $s) => "{$s->payscale_id}-{$s->salary_grade_id}-{$s->salary_step_id}");

        $rows = [];
        $steps = SalaryStep::query()
            ->with(['grade:id,name,code,payscale_id', 'grade.payscale:id,name'])
            ->where('is_active', true)
            ->when($filters['payscale_id'], fn ($q, $id) => $q->whereHas(
                'grade',
                fn (Builder $gq) => $gq->where('payscale_id', $id)
            ))
            ->orderBy('salary_grade_id')
            ->orderBy('step_number')
            ->get();

        foreach ($steps as $step) {
            $grade = $step->grade;
            if (! $grade?->payscale_id) {
                continue;
            }

            $structureKey = "{$grade->payscale_id}-{$step->salary_grade_id}-{$step->id}";
            $structure = $structures->get($structureKey);

            $basic = $structure && $structure->basic_salary !== null
                ? (float) $structure->basic_salary
                : (float) $step->basic_salary;

            $linesByHeadId = $structure
                ? $structure->lines->keyBy('salary_head_id')
                : collect();

            $components = [];
            foreach ($salaryHeads as $head) {
                $label = $head->short_name ?? $head->name;
                $line = $linesByHeadId->get($head->id);

                if ($line && $line->head) {
                    $components[$label] = SalaryStructureCalculator::computeLineAmount(
                        $line->head,
                        $line->amount_type ?? 'fixed',
                        (float) $line->value,
                        $basic
                    );
                } else {
                    $components[$label] = 0.0;
                }
            }

            if ($structure && $structure->lines->isNotEmpty()) {
                $totals = SalaryStructureCalculator::totalsFromLines($structure->lines, $basic);
            } else {
                $totals = [
                    'total_addition' => round($basic, 2),
                    'total_deduction' => 0.0,
                    'net_payable' => round($basic, 2),
                ];
            }

            $rows[] = [
                'payscale' => $grade->payscale?->name,
                'grade' => $grade->name,
                'step' => $step->step_number,
                'basic' => $basic,
                'components' => $components,
                'gross' => $totals['total_addition'],
                'deduction' => $totals['total_deduction'],
                'net' => $totals['net_payable'],
            ];
        }

        return [
            'template' => 'grade-step',
            'heads' => $heads,
            'rows' => $rows,
            'meta' => [
                'row_count' => count($rows),
                'component_count' => count($heads),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function salarySheet(array $config, array $filters): array
    {
        $payslips = $this->fetchPayslips($config, $filters);
        $sheet = $this->mapSalarySheet($payslips, $config);
        $sheet['salary_month'] = $this->periodLabel($filters, $config);

        if ($config['branch_wise'] ?? false) {
            return $this->groupSalarySheetRows($sheet, 'branch');
        }

        return $sheet;
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function salarySheetGrouped(array $config, array $filters): array
    {
        $payslips = $this->fetchPayslips($config, $filters);
        $sheet = $this->mapSalarySheet($payslips, $config);
        $sheet['salary_month'] = $this->periodLabel($filters, $config);

        return $this->groupSalarySheetRows($sheet, $config['group_by'] ?? 'branch');
    }

    /**
     * @param  array<string, mixed>  $sheet
     * @return array<string, mixed>
     */
    protected function groupSalarySheetRows(array $sheet, string $groupBy = 'branch'): array
    {
        $groups = [];
        foreach ($sheet['rows'] as $row) {
            $key = match ($groupBy) {
                'month' => $row['period'] ?? 'Unknown',
                'designation' => $row['designation'] ?? 'Unassigned',
                default => $row['branch_code'] ?? '__unassigned__',
            };

            if (! isset($groups[$key])) {
                $branch = $this->resolveSalarySheetBranch($row);
                $groups[$key] = [
                    'label' => $row['branch_label'] ?? $row['branch'] ?? 'Unassigned',
                    'sort_tuple' => BranchOrganogram::branchHierarchySortTuple($branch),
                    'rows' => [],
                ];
            }

            $groups[$key]['rows'][] = $row;
        }

        uasort($groups, function (array $a, array $b) use ($groupBy) {
            if ($groupBy === 'branch') {
                return ($a['sort_tuple'] ?? []) <=> ($b['sort_tuple'] ?? []);
            }

            return strcmp($a['label'], $b['label']);
        });

        $sections = [];
        foreach ($groups as $group) {
            $sections[] = [
                'label' => $group['label'],
                'rows' => $group['rows'],
                'totals' => $this->sumSheetRows($group['rows'], $sheet['heads']),
            ];
        }

        return array_merge($sheet, [
            'template' => 'salary-sheet-grouped',
            'sections' => $sections,
            'rows' => [],
            'totals' => null,
        ]);
    }

    /**
     * @param  Collection<int, Payslip>  $payslips
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    protected function mapSalarySheet(Collection $payslips, array $config): array
    {
        $columnMeta = [
            'Basic' => [
                'label' => 'Basic',
                'sort_order' => $this->salarySheetEarningSortOrder('Basic', 'Basic'),
                'category' => 'earning',
            ],
        ];

        foreach ($payslips as $payslip) {
            if ($payslip->is_withheld) {
                continue;
            }

            foreach ($payslip->lines as $line) {
                if ((float) $line->computed_amount === 0.0 && $line->head_name !== 'Basic') {
                    continue;
                }

                if ($line->head_name === 'Basic') {
                    continue;
                }

                $key = $this->salarySheetColumnKey($line);
                $label = $this->salarySheetColumnLabel($line);
                $category = $this->salarySheetColumnCategory($line);
                $sortOrder = $category === 'deduction'
                    ? $this->salarySheetDeductionSortOrder($key, $label)
                    : $this->salarySheetEarningSortOrder($key, $label);

                if (! isset($columnMeta[$key]) || $sortOrder < $columnMeta[$key]['sort_order']) {
                    $columnMeta[$key] = [
                        'label' => $label,
                        'sort_order' => $sortOrder,
                        'category' => $category,
                    ];
                }
            }
        }

        $earningMeta = array_filter($columnMeta, fn (array $meta) => ($meta['category'] ?? 'earning') === 'earning');
        $deductionMeta = array_filter($columnMeta, fn (array $meta) => ($meta['category'] ?? '') === 'deduction');

        $earningHeads = $this->orderSalarySheetHeads($earningMeta, 'earning');
        $deductionHeads = $this->orderSalarySheetHeads($deductionMeta, 'deduction');
        $heads = array_merge($earningHeads, $deductionHeads);
        $headLabels = array_map(fn (array $meta) => $meta['label'], $columnMeta);

        $banks = $this->loadPrimaryBanks($payslips->pluck('employee_id')->filter()->unique()->values());

        $rows = [];
        foreach ($payslips as $payslip) {
            if ($payslip->is_withheld) {
                continue;
            }

            $employee = $payslip->employee;
            $run = $payslip->payrollRun;
            $components = array_fill_keys($heads, 0.0);

            foreach ($payslip->lines as $line) {
                if ($line->head_name === 'Basic') {
                    continue;
                }

                $key = $this->salarySheetColumnKey($line);
                if (! isset($components[$key])) {
                    continue;
                }

                $components[$key] += (float) $line->computed_amount;
            }

            $components['Basic'] = (float) $payslip->basic_salary;
            $bank = $banks[$payslip->employee_id] ?? null;
            $branch = $employee?->branch ?? $run?->branch;
            $branchName = $branch?->name;
            $branchCode = $branch?->branch_code;

            $rows[] = [
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'designation' => $employee?->designation?->name,
                'department' => $employee?->department?->name,
                'branch' => $branchName,
                'branch_code' => $branchCode,
                'branch_id' => $branch?->id,
                'branch_model' => $branch,
                'branch_label' => $this->formatBranchLabel($branchName, $branchCode),
                'grade' => $payslip->grade_label,
                'step' => $payslip->step_number,
                'grade_step' => $this->formatGradeStep($payslip->grade_label, $payslip->step_number),
                'account_no' => $bank?->account_no,
                'period' => $run ? sprintf('%s %d', date('F', mktime(0, 0, 0, (int) $run->month, 1)), $run->year) : '',
                'components' => $components,
                'gross' => (float) $payslip->gross_salary,
                'deduction' => (float) $payslip->total_deduction,
                'net' => $payslip->is_withheld ? 0.0 : (float) $payslip->net_payable,
                'withheld' => $payslip->is_withheld,
            ];
        }

        return [
            'template' => 'salary-sheet',
            'heads' => $heads,
            'earning_heads' => $earningHeads,
            'deduction_heads' => $deductionHeads,
            'head_labels' => $headLabels,
            'rows' => $rows,
            'totals' => $this->sumSheetRows($rows, $heads),
            'meta' => [
                'row_count' => count($rows),
                'status' => $config['status'] ?? null,
                'salary_type' => $config['salary_type'] ?? 'salary',
            ],
        ];
    }

    protected function salarySheetColumnCategory(PayslipLine $line): string
    {
        if ($line->type === 'deduction' || $this->isLoanPayslipLine($line)) {
            return 'deduction';
        }

        return 'earning';
    }

    protected function formatGradeStep(?string $grade, int|string|null $step): string
    {
        if ($grade && $step !== null && $step !== '') {
            return sprintf('%s (%s)', $grade, $step);
        }

        if ($grade) {
            return $grade;
        }

        if ($step !== null && $step !== '') {
            return (string) $step;
        }

        return '';
    }

    protected function formatBranchLabel(?string $name, ?string $code): string
    {
        $name = trim((string) $name);
        $code = trim((string) $code);

        if ($name !== '' && $code !== '') {
            return sprintf('%s (%s)', $name, $code);
        }

        if ($name !== '') {
            return $name;
        }

        if ($code !== '') {
            return $code;
        }

        return 'Unassigned';
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function resolveSalarySheetBranch(array $row): ?\App\Models\Branch
    {
        $branch = null;

        if (! empty($row['branch_model']) && $row['branch_model'] instanceof \App\Models\Branch) {
            $branch = $row['branch_model'];
        }

        return $branch;
    }

    protected function isLoanPayslipLine(PayslipLine $line): bool
    {
        return (bool) ($line->head?->is_loan_head ?? preg_match('/\s—\sLN-/', $line->head_name));
    }

    protected function resolveLoanHeadType(PayslipLine $line): ?string
    {
        if (! $this->isLoanPayslipLine($line) || $line->type !== 'deduction') {
            return null;
        }

        if (filled($line->head?->loan_head_type)) {
            return $line->head->loan_head_type;
        }

        foreach (config('employee_loans.loan_types', []) as $type => $meta) {
            $shortName = $meta['short_name'] ?? '';
            if ($shortName !== '' && str_starts_with($line->head_name, $shortName)) {
                return $type;
            }
        }

        return 'other';
    }

    protected function loanTypeLabel(?string $loanHeadType): string
    {
        if (! $loanHeadType) {
            return 'Loan';
        }

        return config("employee_loans.loan_types.{$loanHeadType}.label")
            ?? ucfirst(str_replace('_', ' ', $loanHeadType));
    }

    protected function salarySheetColumnKey(PayslipLine $line): string
    {
        if ($this->isLoanPayslipLine($line)) {
            return 'loan:'.($this->resolveLoanHeadType($line) ?? 'other');
        }

        if ($line->type === 'earning' && in_array($line->head_name, ['Fixed Salary', 'Probation Salary'], true)) {
            return 'earn:others';
        }

        if ($line->salary_head_id) {
            return $line->type.':head:'.$line->salary_head_id;
        }

        return $line->type.':name:'.$line->head_name;
    }

    protected function salarySheetColumnLabel(PayslipLine $line): string
    {
        if ($this->isLoanPayslipLine($line)) {
            $type = $this->resolveLoanHeadType($line) ?? 'other';

            return config("employee_loans.loan_types.{$type}.short_name")
                ?? $this->loanTypeLabel($type);
        }

        if ($line->type === 'earning' && in_array($line->head_name, ['Fixed Salary', 'Probation Salary'], true)) {
            return 'Others';
        }

        return $line->head?->name ?? $line->head_name;
    }

    /**
     * @param  array<string, array{label: string, sort_order: int, category: string}>  $columnMeta
     * @return list<string>
     */
    protected function orderSalarySheetHeads(array $columnMeta, string $category): array
    {
        $matchers = $category === 'earning'
            ? [
                fn (string $key, string $label) => $key === 'Basic',
                fn (string $key, string $label) => str_contains($label, 'house rent'),
                fn (string $key, string $label) => str_contains($label, 'medical'),
                fn (string $key, string $label) => str_contains($label, 'conveyance'),
                fn (string $key, string $label) => str_contains($label, 'entertainment'),
                fn (string $key, string $label) => $key === 'earn:others' || $label === 'others',
            ]
            : [
                fn (string $key, string $label) => ! str_starts_with($key, 'loan:')
                    && (in_array($label, ['pf', 'provident fund'], true) || str_contains($label, 'provident fund')),
                fn (string $key, string $label) => ! str_starts_with($key, 'loan:') && str_contains($label, 'welfare'),
                fn (string $key, string $label) => ! str_starts_with($key, 'loan:')
                    && (in_array($label, ['income tax', 'tax'], true) || str_contains($label, 'income tax')),
                fn (string $key, string $label) => $key === 'loan:pf_loan',
                fn (string $key, string $label) => $key === 'loan:motorcycle_loan',
                fn (string $key, string $label) => $key === 'loan:laptop_loan',
                fn (string $key, string $label) => $key === 'loan:other',
            ];

        $ordered = [];
        $used = [];

        foreach ($matchers as $matcher) {
            foreach ($columnMeta as $key => $meta) {
                if (isset($used[$key])) {
                    continue;
                }

                $label = strtolower(trim($meta['label']));
                if ($matcher($key, $label)) {
                    $ordered[] = $key;
                    $used[$key] = true;
                    break;
                }
            }
        }

        foreach (array_keys($columnMeta) as $key) {
            if (! isset($used[$key])) {
                $ordered[] = $key;
            }
        }

        return $ordered;
    }

    protected function salarySheetEarningSortOrder(string $key, string $label): int
    {
        if ($key === 'Basic') {
            return 10;
        }

        if ($key === 'earn:others') {
            return 60;
        }

        $normalized = strtolower(trim($label));

        return match (true) {
            str_contains($normalized, 'house rent') => 20,
            str_contains($normalized, 'medical') => 30,
            str_contains($normalized, 'conveyance') => 40,
            str_contains($normalized, 'entertainment') => 50,
            $normalized === 'others' => 60,
            default => 100 + (abs(crc32($key)) % 900),
        };
    }

    protected function salarySheetDeductionSortOrder(string $key, string $label): int
    {
        if (str_starts_with($key, 'loan:')) {
            $type = substr($key, 5);

            return match ($type) {
                'pf_loan' => 410,
                'motorcycle_loan' => 420,
                'laptop_loan' => 430,
                'other' => 440,
                default => 450,
            };
        }

        $normalized = strtolower(trim($label));

        return match (true) {
            in_array($normalized, ['pf', 'provident fund'], true) => 100,
            str_contains($normalized, 'welfare') => 200,
            in_array($normalized, ['income tax', 'tax'], true) => 300,
            str_contains($normalized, 'income tax') => 300,
            default => 350,
        };
    }

    protected function loanColumnSortOrder(PayslipLine $line): int
    {
        $type = $this->resolveLoanHeadType($line) ?? 'other';
        $order = ['pf_loan', 'motorcycle_loan', 'laptop_loan', 'other'];
        $index = array_search($type, $order, true);

        return 50_000 + (($index === false ? 99 : $index) * 100) + (int) $line->sort_order;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<string>  $heads
     * @return array<string, mixed>
     */
    public function sumSalarySheetRows(array $rows, array $heads): array
    {
        return $this->sumSheetRows($rows, $heads);
    }

    /**
     * Employee data rows per printed page (Sub Total / Total, In Words, and signature footer reserved separately).
     */
    protected function salarySheetDataRowsForPage(): int
    {
        $rows = (int) (config('payroll_reports.print.rows_per_page') ?? 30);

        return max(1, $rows);
    }

    /**
     * Paginate branch rows for print/PDF. Fixed rows per page; Sub Total on each non-final page.
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  list<string>  $heads
     * @return list<array{rows: list<array<string, mixed>>, totals: array<string, mixed>|null, totals_label: string, serial_start: int}>
     */
    public function paginateSalarySheetSectionPages(array $rows, array $heads, ?array $sectionTotals, ?int $rowsPerPage = null): array
    {
        if ($rows === []) {
            return [];
        }

        $pages = [];
        $offset = 0;
        $serialStart = 0;
        $total = count($rows);
        $regularBudget = max(1, $rowsPerPage ?? $this->salarySheetDataRowsForPage());
        $lastPageBudget = max(1, $regularBudget - 1);

        while ($offset < $total) {
            $remaining = $total - $offset;

            if ($remaining <= $lastPageBudget) {
                $take = $remaining;
                $isLastPage = true;
            } elseif ($remaining <= $regularBudget) {
                $take = $remaining;
                $isLastPage = true;
            } else {
                $take = $regularBudget;
                $isLastPage = false;
            }

            $chunk = array_slice($rows, $offset, $take);

            $pages[] = [
                'rows' => $chunk,
                'totals' => $isLastPage ? $sectionTotals : $this->sumSalarySheetRows($chunk, $heads),
                'totals_label' => $isLastPage ? 'Total' : 'Sub Total',
                'serial_start' => $serialStart,
            ];

            $serialStart += $take;
            $offset += $take;
        }

        return $pages;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<string>  $heads
     * @return array<string, mixed>
     */
    protected function sumSheetRows(array $rows, array $heads): array
    {
        $components = array_fill_keys($heads, 0.0);
        $gross = 0.0;
        $deduction = 0.0;
        $net = 0.0;

        foreach ($rows as $row) {
            foreach ($heads as $head) {
                $components[$head] += (float) ($row['components'][$head] ?? 0);
            }
            $gross += (float) $row['gross'];
            $deduction += (float) $row['deduction'];
            $net += (float) $row['net'];
        }

        return [
            'components' => array_map(fn (float $v) => round($v, 0), $components),
            'gross' => round($gross, 0),
            'deduction' => round($deduction, 0),
            'net' => round($net, 0),
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return Collection<int, Payslip>
     */
    protected function fetchPayslips(array $config, array $filters): Collection
    {
        $runQuery = $this->payrollRunQuery($config, $filters);

        $query = Payslip::query()
            ->with([
                'lines.head:id,name,short_name,type,is_loan_head,loan_head_type',
                'payrollRun.branch:id,name,branch_code,is_head_office,regional_office_id',
                'payrollRun.branch.regionalOffice.zone:id,code,name',
                'payrollRun.bonusConfiguration:id,name',
                'employee:id,pin,name_en,designation_id,department_id,current_branch_id',
                'employee.designation:id,name',
                'employee.department:id,name',
                'employee.branch:id,name,branch_code,is_head_office,regional_office_id',
                'employee.branch.regionalOffice.zone:id,code,name',
            ])
            ->whereHas('payrollRun', fn (Builder $q) => $runQuery($q))
            ->when($filters['employee_id'], fn ($q, $id) => $q->where('employee_id', $id))
            ->when($filters['department_id'], fn ($q, $id) => $q->whereHas(
                'employee',
                fn (Builder $eq) => $eq->where('department_id', $id)
            ))
            ->when($filters['designation_id'], fn ($q, $id) => $q->whereHas(
                'employee',
                fn (Builder $eq) => $eq->where('designation_id', $id)
            ))
            ->when($filters['program_id'], fn ($q, $id) => $q->whereHas(
                'employee',
                fn (Builder $eq) => $eq->where('program_id', $id)
            ))
            ->when($filters['project_id'], fn ($q, $id) => $q->whereHas(
                'employee',
                fn (Builder $eq) => $eq->where('project_id', $id)
            ))
            ->whereHas('employee', fn (Builder $eq) => $eq->whereHas(
                'branch',
                fn (Builder $bq) => $bq->where('is_active', true)
            ))
            ->whereHas('payrollRun', fn (Builder $rq) => $rq->whereHas(
                'branch',
                fn (Builder $bq) => $bq->where('is_active', true)
            ));

        HeadOfficeOrganogram::applyToPayslipQuery($query);

        if ($filters['branch_id']) {
            $branchId = $filters['branch_id'];
            $query->where(function (Builder $q) use ($branchId) {
                $q->whereHas('payrollRun', fn (Builder $rq) => $rq->where('branch_id', $branchId))
                    ->orWhereHas('employee', fn (Builder $eq) => $eq->where('current_branch_id', $branchId));
            });
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     */
    protected function payrollRunQuery(array $config, array $filters): \Closure
    {
        return function (Builder $q) use ($config, $filters) {
            $q->where('salary_type', $config['salary_type'] ?? 'salary');

            if (! empty($config['status'])) {
                $q->where('status', $config['status']);
            }

            if (! empty($config['date_range'])) {
                if ($filters['date_from']) {
                    $q->whereDate('process_date', '>=', $filters['date_from']);
                }
                if ($filters['date_to']) {
                    $q->whereDate('process_date', '<=', $filters['date_to']);
                }
            } else {
                if ($filters['year']) {
                    $q->where('year', $filters['year']);
                }
                if ($filters['month']) {
                    $q->where('month', $filters['month']);
                }
            }
        };
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function bankAdvice(array $config, array $filters): array
    {
        $payslips = $this->fetchPayslips($config, $filters);
        $employeeIds = $payslips->pluck('employee_id')->unique()->filter()->values();
        $banks = $this->loadPrimaryBanks($employeeIds);

        $rows = [];
        $total = 0.0;
        foreach ($payslips as $payslip) {
            if ($payslip->is_withheld) {
                continue;
            }
            $net = (float) $payslip->net_payable;
            if ($net <= 0) {
                continue;
            }
            $employee = $payslip->employee;
            $bank = $banks[$payslip->employee_id] ?? null;
            $rows[] = [
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'branch' => $employee?->branch?->name ?? $payslip->payrollRun?->branch?->name,
                'bank_name' => $bank?->bank_name,
                'bank_branch' => $bank?->branch_name,
                'account_no' => $bank?->account_no,
                'account_type' => $bank?->account_type,
                'amount' => $net,
            ];
            $total += $net;
        }

        return [
            'template' => 'bank-advice',
            'rows' => $rows,
            'meta' => [
                'row_count' => count($rows),
                'total' => round($total, 2),
                'salary_type' => $config['salary_type'] ?? 'salary',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function headRegister(array $config, array $filters): array
    {
        $lineType = $config['line_type'] ?? 'earning';
        $runQuery = $this->payrollRunQuery($config, $filters);

        $lines = PayslipLine::query()
            ->with([
                'payslip.employee:id,pin,name_en,designation_id,current_branch_id',
                'payslip.employee.designation:id,name',
                'payslip.employee.branch:id,name',
                'payslip.payrollRun:id,year,month,branch_id',
                'payslip.payrollRun.branch:id,name',
            ])
            ->where('type', $lineType)
            ->where('computed_amount', '>', 0)
            ->when($filters['salary_head_id'], fn ($q, $id) => $q->where('salary_head_id', $id))
            ->whereHas('payslip', function (Builder $q) use ($runQuery, $filters) {
                $q->where('is_withheld', false)
                    ->whereHas('payrollRun', $runQuery);
                if ($filters['branch_id']) {
                    $branchId = $filters['branch_id'];
                    $q->where(function (Builder $inner) use ($branchId) {
                        $inner->whereHas('payrollRun', fn (Builder $rq) => $rq->where('branch_id', $branchId))
                            ->orWhereHas('employee', fn (Builder $eq) => $eq->where('current_branch_id', $branchId));
                    });
                }
            })
            ->orderBy('head_name')
            ->get();

        $rows = [];
        $byHead = [];
        foreach ($lines as $line) {
            $payslip = $line->payslip;
            $employee = $payslip?->employee;
            $amount = (float) $line->computed_amount;
            $rows[] = [
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'designation' => $employee?->designation?->name,
                'branch' => $employee?->branch?->name ?? $payslip?->payrollRun?->branch?->name,
                'head_name' => $line->head_name,
                'amount' => $amount,
                'period' => $payslip?->payrollRun
                    ? sprintf('%s %d', date('F', mktime(0, 0, 0, (int) $payslip->payrollRun->month, 1)), $payslip->payrollRun->year)
                    : '',
            ];
            $byHead[$line->head_name] = ($byHead[$line->head_name] ?? 0) + $amount;
        }

        return [
            'template' => 'head-register',
            'line_type' => $lineType,
            'rows' => $rows,
            'summary' => collect($byHead)->map(fn ($total, $name) => ['head_name' => $name, 'total' => round($total, 2)])->values()->all(),
            'meta' => [
                'row_count' => count($rows),
                'grand_total' => round(array_sum($byHead), 2),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function advanceSalary(array $config, array $filters): array
    {
        $runQuery = $this->payrollRunQuery($config, $filters);

        $lines = PayslipLine::query()
            ->with([
                'payslip.employee:id,pin,name_en,designation_id,current_branch_id',
                'payslip.employee.designation:id,name',
                'payslip.employee.branch:id,name',
                'payslip.payrollRun:id,year,month',
                'head:id,name,is_loan_head,loan_head_type',
            ])
            ->where('type', 'deduction')
            ->where('computed_amount', '>', 0)
            ->where(function (Builder $q) {
                $q->whereHas('head', fn (Builder $hq) => $hq->where('is_loan_head', true))
                    ->orWhere('head_name', 'like', '%loan%')
                    ->orWhere('head_name', 'like', '%advance%');
            })
            ->whereHas('payslip', function (Builder $q) use ($runQuery, $filters) {
                $q->where('is_withheld', false)
                    ->whereHas('payrollRun', $runQuery);
                if ($filters['employee_id']) {
                    $q->where('employee_id', $filters['employee_id']);
                }
                if ($filters['branch_id']) {
                    $branchId = $filters['branch_id'];
                    $q->whereHas('employee', fn (Builder $eq) => $eq->where('current_branch_id', $branchId));
                }
            })
            ->orderBy('head_name')
            ->get();

        $rows = [];
        $total = 0.0;
        foreach ($lines as $line) {
            $payslip = $line->payslip;
            $employee = $payslip?->employee;
            $amount = (float) $line->computed_amount;
            $rows[] = [
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'designation' => $employee?->designation?->name,
                'branch' => $employee?->branch?->name,
                'head_name' => $line->head_name,
                'loan_type' => $line->head?->loan_head_type ?? 'n_a',
                'amount' => $amount,
                'period' => $payslip?->payrollRun
                    ? sprintf('%s %d', date('F', mktime(0, 0, 0, (int) $payslip->payrollRun->month, 1)), $payslip->payrollRun->year)
                    : '',
            ];
            $total += $amount;
        }

        return [
            'template' => 'advance-salary',
            'rows' => $rows,
            'meta' => [
                'row_count' => count($rows),
                'total' => round($total, 2),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function bonusRegister(array $config, array $filters): array
    {
        $payslips = $this->fetchPayslips($config, $filters);
        $rows = [];
        $total = 0.0;

        foreach ($payslips as $payslip) {
            if ($payslip->is_withheld) {
                continue;
            }

            $employee = $payslip->employee;
            $run = $payslip->payrollRun;
            $bonusLine = $payslip->lines->where('type', 'earning')->sortByDesc('computed_amount')->first();
            $amount = (float) $payslip->net_payable;

            $rows[] = [
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'branch' => $employee?->branch?->name ?? $run?->branch?->name,
                'basic' => (float) $payslip->basic_salary,
                'bonus_name' => $bonusLine?->head_name ?? $run?->bonusConfiguration?->name ?? 'Bonus',
                'percentage' => $bonusLine?->input_value,
                'amount' => $amount,
                'withheld' => $payslip->is_withheld,
            ];
            $total += $amount;
        }

        return [
            'template' => 'bonus-register',
            'rows' => $rows,
            'meta' => [
                'row_count' => count($rows),
                'total' => round($total, 2),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function finalPayment(array $filters): array
    {
        $query = SeparationFinalPayment::query()
            ->with([
                'employee:id,pin,employee_id,name_en,department_id,designation_id,current_branch_id,last_branch_id,program_id,project_id',
                'employee.department:id,name',
                'employee.designation:id,name',
                'employee.branch:id,name,branch_code',
                'employee.lastBranch:id,name,branch_code',
                'separation:id,separation_date,reason',
            ])
            ->when(($filters['payment_status'] ?? 'all') !== 'all', fn ($q) => $q->where('status', $filters['payment_status']))
            ->when($filters['branch_id'], function ($q, $branchId) {
                $q->whereHas('employee', function ($employeeQuery) use ($branchId) {
                    $employeeQuery->where('current_branch_id', $branchId)
                        ->orWhere(function ($lastBranchQuery) use ($branchId) {
                            $lastBranchQuery->whereNull('current_branch_id')
                                ->where('last_branch_id', $branchId);
                        });
                });
            })
            ->when($filters['department_id'], fn ($q, $id) => $q->whereHas('employee', fn ($eq) => $eq->where('department_id', $id)))
            ->when($filters['designation_id'], fn ($q, $id) => $q->whereHas('employee', fn ($eq) => $eq->where('designation_id', $id)))
            ->when($filters['program_id'], fn ($q, $id) => $q->whereHas('employee', fn ($eq) => $eq->where('program_id', $id)))
            ->when($filters['project_id'], fn ($q, $id) => $q->whereHas('employee', fn ($eq) => $eq->where('project_id', $id)));

        $query
            ->when($filters['date_from'], fn ($q, $date) => $q->whereDate('payment_date', '>=', $date))
            ->when($filters['date_to'], fn ($q, $date) => $q->whereDate('payment_date', '<=', $date));

        $records = $query->orderByDesc('id')->get();
        $rows = $records->map(function (SeparationFinalPayment $record) {
            $employee = $record->employee;
            $branch = $employee?->branch ?? $employee?->lastBranch;
            $gross = (float) $record->pf_balance + (float) $record->gratuity_amount;
            $paymentDate = $record->getRawOriginal('payment_date');

            return [
                'pin' => $employee?->pin ?? $employee?->employee_id,
                'name' => $employee?->name_en,
                'designation' => $employee?->designation?->name,
                'department' => $employee?->department?->name,
                'branch' => $branch?->name,
                'branch_code' => $branch?->branch_code,
                'separation_date' => $record->separation?->separation_date?->format('d M Y'),
                'payment_date' => $paymentDate ? Carbon::parse((string) $paymentDate)->format('d M Y') : null,
                'pf_balance' => (float) $record->pf_balance,
                'gratuity_amount' => (float) $record->gratuity_amount,
                'gross' => round($gross, 2),
                'loan_outstanding' => (float) $record->loan_outstanding,
                'net_payable' => (float) $record->net_payable,
                'status' => ucfirst($record->status),
            ];
        })->values()->all();

        $totals = [
            'pf_balance' => round((float) $records->sum('pf_balance'), 2),
            'gratuity_amount' => round((float) $records->sum('gratuity_amount'), 2),
            'gross' => round((float) $records->sum(
                fn (SeparationFinalPayment $record) => (float) $record->pf_balance + (float) $record->gratuity_amount
            ), 2),
            'loan_outstanding' => round((float) $records->sum('loan_outstanding'), 2),
            'net_payable' => round((float) $records->sum('net_payable'), 2),
        ];

        return [
            'template' => 'final-payment',
            'date_basis' => 'payment',
            'rows' => $rows,
            'totals' => $totals,
            'meta' => [
                'row_count' => count($rows),
                'pending_count' => $records->where('status', SeparationFinalPayment::STATUS_PENDING)->count(),
                'paid_count' => $records->where('status', SeparationFinalPayment::STATUS_PAID)->count(),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function salaryCertificate(array $config, array $filters): array
    {
        if (! $filters['employee_id']) {
            return [
                'template' => 'salary-certificate',
                'employee' => null,
                'lines' => [],
                'meta' => ['message' => 'Select an employee.'],
            ];
        }

        $employee = Employee::query()
            ->with(['designation:id,name', 'department:id,name', 'branch:id,name', 'payscale:id,name', 'salaryGrade:id,name'])
            ->find($filters['employee_id']);

        $payslip = $this->fetchPayslips($config, $filters)->first();

        if (! $employee || ! $payslip) {
            return [
                'template' => 'salary-certificate',
                'employee' => $employee ? [
                    'pin' => $employee->pin,
                    'name' => $employee->name_en,
                    'designation' => $employee->designation?->name,
                    'department' => $employee->department?->name,
                    'branch' => $employee->branch?->name,
                ] : null,
                'lines' => [],
                'meta' => ['message' => 'No posted payslip found for the selected period.'],
            ];
        }

        $run = $payslip->payrollRun;
        $earnings = $payslip->lines->where('type', 'earning')->values();
        $deductions = $payslip->lines->where('type', 'deduction')->values();

        return [
            'template' => 'salary-certificate',
            'employee' => [
                'pin' => $employee->pin,
                'name' => $employee->name_en,
                'designation' => $employee->designation?->name,
                'department' => $employee->department?->name,
                'branch' => $employee->branch?->name,
                'grade' => $payslip->grade_label,
                'step' => $payslip->step_number,
                'payscale' => $employee->payscale?->name,
            ],
            'period' => sprintf('%s %d', date('F', mktime(0, 0, 0, (int) $run->month, 1)), $run->year),
            'earnings' => $earnings->map(fn ($l) => [
                'name' => $l->head_name,
                'amount' => (float) $l->computed_amount,
            ])->all(),
            'deductions' => $deductions->map(fn ($l) => [
                'name' => $l->head_name,
                'amount' => (float) $l->computed_amount,
            ])->all(),
            'basic' => (float) $payslip->basic_salary,
            'gross' => (float) $payslip->gross_salary,
            'deduction' => (float) $payslip->total_deduction,
            'net' => (float) $payslip->net_payable,
            'issued_at' => Carbon::now()->format('d F Y'),
            'meta' => [],
        ];
    }

    /**
     * @param  Collection<int, int>  $employeeIds
     * @return array<int, object>
     */
    protected function loadPrimaryBanks(Collection $employeeIds): array
    {
        if ($employeeIds->isEmpty()) {
            return [];
        }

        $accounts = DB::table('employee_bank_accounts')
            ->whereIn('employee_id', $employeeIds)
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->get();

        $map = [];
        foreach ($accounts as $account) {
            if (! isset($map[$account->employee_id])) {
                $map[$account->employee_id] = $account;
            }
        }

        return $map;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function periodLabel(array $filters, array $config): string
    {
        if (! empty($config['date_range']) && ($filters['date_from'] || $filters['date_to'])) {
            $from = $filters['date_from'] ? Carbon::parse($filters['date_from'])->format('d M Y') : '…';
            $to = $filters['date_to'] ? Carbon::parse($filters['date_to'])->format('d M Y') : '…';

            return "{$from} to {$to}";
        }

        if ($filters['year'] && $filters['month']) {
            return date('F Y', mktime(0, 0, 0, $filters['month'], 1, $filters['year']));
        }

        if ($filters['year']) {
            return (string) $filters['year'];
        }

        return 'All periods';
    }
}
