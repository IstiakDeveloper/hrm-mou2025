<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\SalaryHead;
use App\Models\SalaryStep;
use App\Models\SalaryStructure;
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

        return $this->mapSalarySheet($payslips, $config);
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function salarySheetGrouped(array $config, array $filters): array
    {
        $payslips = $this->fetchPayslips($config, $filters);
        $groupBy = $config['group_by'] ?? 'branch';
        $sheet = $this->mapSalarySheet($payslips, $config);

        $groups = [];
        foreach ($sheet['rows'] as $row) {
            $key = match ($groupBy) {
                'month' => $row['period'] ?? 'Unknown',
                'designation' => $row['designation'] ?? 'Unassigned',
                default => $row['branch'] ?? 'Unassigned',
            };
            $groups[$key]['label'] = $key;
            $groups[$key]['rows'][] = $row;
        }

        $sections = [];
        foreach ($groups as $group) {
            $totals = $this->sumSheetRows($group['rows'], $sheet['heads']);
            $sections[] = [
                'label' => $group['label'],
                'rows' => $group['rows'],
                'totals' => $totals,
            ];
        }

        usort($sections, fn ($a, $b) => strcmp($a['label'], $b['label']));

        return [
            'template' => 'salary-sheet-grouped',
            'heads' => $sheet['heads'],
            'sections' => $sections,
            'meta' => $sheet['meta'],
        ];
    }

    /**
     * @param  Collection<int, Payslip>  $payslips
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    protected function mapSalarySheet(Collection $payslips, array $config): array
    {
        $headNames = [];
        foreach ($payslips as $payslip) {
            foreach ($payslip->lines as $line) {
                if ((float) $line->computed_amount !== 0.0 || $line->head_name === 'Basic') {
                    $headNames[$line->head_name] = $line->sort_order;
                }
            }
        }
        asort($headNames);
        $heads = array_keys($headNames);
        if (! in_array('Basic', $heads, true)) {
            array_unshift($heads, 'Basic');
        }

        $rows = [];
        foreach ($payslips as $payslip) {
            $employee = $payslip->employee;
            $run = $payslip->payrollRun;
            $components = array_fill_keys($heads, 0.0);
            foreach ($payslip->lines as $line) {
                if (isset($components[$line->head_name])) {
                    $components[$line->head_name] += (float) $line->computed_amount;
                }
            }
            $components['Basic'] = (float) $payslip->basic_salary;

            $rows[] = [
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'designation' => $employee?->designation?->name,
                'department' => $employee?->department?->name,
                'branch' => $employee?->branch?->name ?? $run?->branch?->name,
                'grade' => $payslip->grade_label,
                'step' => $payslip->step_number,
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
            'rows' => $rows,
            'totals' => $this->sumSheetRows($rows, $heads),
            'meta' => [
                'row_count' => count($rows),
                'status' => $config['status'] ?? null,
                'salary_type' => $config['salary_type'] ?? 'salary',
            ],
        ];
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
            'components' => $components,
            'gross' => round($gross, 2),
            'deduction' => round($deduction, 2),
            'net' => round($net, 2),
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
                'lines',
                'payrollRun.branch:id,name',
                'payrollRun.bonusConfiguration:id,name',
                'employee:id,pin,name_en,designation_id,department_id,current_branch_id',
                'employee.designation:id,name',
                'employee.department:id,name',
                'employee.branch:id,name',
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
            ->orderBy('id');

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
                $q->whereHas('payrollRun', $runQuery);
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
                $q->whereHas('payrollRun', $runQuery);
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
            $employee = $payslip->employee;
            $run = $payslip->payrollRun;
            $bonusLine = $payslip->lines->where('type', 'earning')->sortByDesc('computed_amount')->first();
            $amount = $payslip->is_withheld ? 0.0 : (float) $payslip->net_payable;

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
