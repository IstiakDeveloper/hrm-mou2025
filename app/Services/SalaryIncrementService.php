<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\SalaryHead;
use App\Models\SalaryHeadModification;
use App\Models\SalaryIncrement;
use App\Models\SalaryIncrementLine;
use App\Models\SalaryStep;
use App\Models\SalaryStructure;
use App\Support\BangladeshDate;
use App\Support\HeadOfficeOrganogram;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalaryIncrementService
{
    public const SERVICE_MONTHS = 12;

    /**
     * @param  array<string, mixed>  $filters
     * @return array{eligible: list<array<string, mixed>>, held: list<array<string, mixed>>}
     */
    public function preview(array $filters, Carbon $effectiveDate, ?int $branchLock = null): array
    {
        $effectiveDate = $effectiveDate->copy()->startOfDay();
        $employees = $this->candidateQuery($filters, $branchLock)->get();

        if ($employees->isEmpty()) {
            return ['eligible' => [], 'held' => []];
        }

        $context = $this->loadScaleContext($employees, $effectiveDate);
        $eligible = [];
        $held = [];
        $sort = 0;

        foreach ($employees as $employee) {
            $row = $this->classify($employee, $effectiveDate, $context);
            $row['payload']['sort_index'] = $sort++;
            if ($row['kind'] === 'eligible') {
                $eligible[] = $row['payload'];
            } else {
                $held[] = $row['payload'];
            }
        }

        return ['eligible' => $eligible, 'held' => $held];
    }

    /**
     * @param  array<string, mixed>  $header
     * @param  list<array{employee_id: int, action: string, steps: int}>  $requestedLines
     */
    public function createOrder(array $header, array $requestedLines, int $userId, ?int $branchLock = null): SalaryIncrement
    {
        $effectiveDate = Carbon::parse($header['effective_date'])->startOfDay();
        $ids = collect($requestedLines)->pluck('employee_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        $preview = $this->preview(['employee_ids' => $ids], $effectiveDate, $branchLock);
        $rows = collect($preview['eligible'])
            ->merge($preview['held'])
            ->keyBy('employee_id');
        $arrearMonths = (int) $header['arrear_months'];
        $built = [];

        foreach ($requestedLines as $requested) {
            $employeeId = (int) $requested['employee_id'];
            $row = $rows->get($employeeId);
            if (! is_array($row) || empty($row['grantable'])) {
                $name = is_array($row) ? (string) $row['name'] : 'Employee '.$employeeId;
                $why = is_array($row) && ! empty($row['reason'])
                    ? (string) $row['reason']
                    : 'This employee cannot receive a step on the published scale.';
                throw ValidationException::withMessages([
                    'lines' => $name.': '.$why,
                ]);
            }

            if ($requested['action'] === SalaryIncrementLine::ACTION_STOP) {
                $built[] = $this->stopPayload($row);
                continue;
            }

            $steps = (int) $requested['steps'];
            $proposal = $row['proposals'][$steps] ?? null;
            if (! is_array($proposal)) {
                throw ValidationException::withMessages([
                    'lines' => $row['name'].' cannot receive '.$steps.' step(s) on this grade.',
                ]);
            }

            $built[] = $this->grantPayload($row, $steps, $proposal, $arrearMonths);
        }

        return DB::transaction(function () use ($header, $built, $userId) {
            $order = SalaryIncrement::query()->create([
                'order_no' => $header['order_no'],
                'increment_date' => $header['increment_date'],
                'effective_date' => $header['effective_date'],
                'arrear_months' => (int) $header['arrear_months'],
                'status' => SalaryIncrement::STATUS_SCHEDULED,
                'notes' => $header['notes'] ?: null,
                'branch_id' => $header['branch_id'] ?: null,
                'program_id' => $header['program_id'] ?: null,
                'project_id' => $header['project_id'] ?: null,
                'employee_type_id' => $header['employee_type_id'] ?: null,
                'created_by' => $userId,
            ]);

            foreach ($built as $line) {
                $order->lines()->create($line);
            }

            if (BangladeshDate::isDue($order->effective_date)) {
                $this->apply($order, $userId);
            }

            return $order;
        });
    }

    public function apply(SalaryIncrement $increment, ?int $actorId): void
    {
        if ($increment->status === SalaryIncrement::STATUS_APPLIED) {
            return;
        }

        if (! in_array($increment->status, SalaryIncrement::openStatuses(), true)) {
            throw ValidationException::withMessages([
                'status' => 'Only a scheduled order can be applied.',
            ]);
        }

        if (! BangladeshDate::isDue($increment->effective_date)) {
            throw ValidationException::withMessages([
                'effective_date' => 'Salary updates on '.$increment->effective_date->toDateString().'.',
            ]);
        }

        DB::transaction(function () use ($increment, $actorId) {
            $increment->refresh();
            if ($increment->status === SalaryIncrement::STATUS_APPLIED) {
                return;
            }

            $increment->load(['lines.employee']);
            $history = app(EmployeeAssignmentHistoryService::class);

            foreach ($increment->lines as $line) {
                if ($line->status !== SalaryIncrementLine::STATUS_PENDING) {
                    continue;
                }

                $employee = $line->employee;
                if (! $employee) {
                    $line->update([
                        'status' => SalaryIncrementLine::STATUS_SKIPPED,
                        'skip_reason' => 'Employee record is missing.',
                    ]);
                    continue;
                }

                if ($line->action === SalaryIncrementLine::ACTION_STOP) {
                    $employee->increment_stopped = true;
                    $employee->increment_stop_reason = 'Withheld on '.$increment->order_no;
                    $employee->save();
                    $line->update(['status' => SalaryIncrementLine::STATUS_WITHHELD]);
                    continue;
                }

                if ((int) $employee->salary_step_id !== (int) $line->from_salary_step_id
                    || (int) $employee->salary_grade_id !== (int) $line->salary_grade_id) {
                    $line->update([
                        'status' => SalaryIncrementLine::STATUS_SKIPPED,
                        'skip_reason' => 'Grade or step changed after this order was prepared.',
                    ]);
                    continue;
                }

                $history->queueContext($employee, [
                    'effective_from' => Carbon::parse($increment->effective_date)->toDateString(),
                    'source_type' => EmployeeAssignmentHistory::SOURCE_INCREMENT,
                    'source_id' => $increment->id,
                    'created_by' => $actorId,
                    'notes' => 'Annual increment '.$increment->order_no,
                ]);

                $employee->salary_step_id = $line->to_salary_step_id;
                $employee->basic_salary = $line->to_basic;
                $employee->last_increment_date = $increment->effective_date;
                $employee->increment_stopped = false;
                $employee->increment_stop_reason = null;
                $employee->save();

                $line->update(['status' => SalaryIncrementLine::STATUS_APPLIED]);
            }

            $increment->status = SalaryIncrement::STATUS_APPLIED;
            $increment->applied_at = now();
            $increment->save();
        });
    }

    public function rollback(SalaryIncrement $increment, ?int $actorId): void
    {
        $reversible = [
            ...SalaryIncrement::openStatuses(),
            SalaryIncrement::STATUS_APPLIED,
        ];

        if (! in_array($increment->status, $reversible, true)) {
            throw ValidationException::withMessages([
                'status' => 'This order cannot be rolled back.',
            ]);
        }

        DB::transaction(function () use ($increment, $actorId) {
            $increment->refresh();
            if (! in_array($increment->status, [
                ...SalaryIncrement::openStatuses(),
                SalaryIncrement::STATUS_APPLIED,
            ], true)) {
                return;
            }

            if ($increment->status === SalaryIncrement::STATUS_APPLIED) {
                $this->reverseAppliedLines($increment, $actorId);
            }

            $increment->lines()
                ->where('status', '!=', SalaryIncrementLine::STATUS_ROLLED_BACK)
                ->update(['status' => SalaryIncrementLine::STATUS_ROLLED_BACK]);

            $increment->status = SalaryIncrement::STATUS_ROLLED_BACK;
            $increment->rolled_back_by = $actorId;
            $increment->rolled_back_at = now();
            $increment->save();
        });
    }

    public function releaseStop(Employee $employee): void
    {
        $employee->increment_stopped = false;
        $employee->increment_stop_reason = null;
        $employee->save();
    }

    public function activateDue(?int $actorId = null): int
    {
        $activated = 0;

        SalaryIncrement::query()
            ->whereIn('status', SalaryIncrement::dueStatuses())
            ->whereDate('effective_date', '<=', BangladeshDate::todayString())
            ->orderBy('id')
            ->each(function (SalaryIncrement $increment) use ($actorId, &$activated) {
                $increment->refresh();
                if (! in_array($increment->status, SalaryIncrement::dueStatuses(), true)) {
                    return;
                }

                $this->apply($increment, $actorId ?? $increment->created_by);
                $activated++;
            });

        return $activated;
    }

    public function nextOrderNo(): string
    {
        $year = BangladeshDate::now()->year;
        $prefix = 'INC-'.$year.'-';
        $last = SalaryIncrement::query()
            ->where('order_no', 'like', $prefix.'%')
            ->orderByDesc('order_no')
            ->value('order_no');

        $sequence = 1;
        if (is_string($last) && preg_match('/(\d+)$/', $last, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function candidateQuery(array $filters, ?int $branchLock)
    {
        $query = Employee::query()
            ->select('employees.*')
            ->with([
                'branch:id,name',
                'employeeType:id,name,probation_months',
                'salaryGrade:id,code,name',
                'salaryStep:id,salary_grade_id,step_number,basic_salary',
            ])
            ->where('employees.status', 'active')
            ->whereNotNull('employees.salary_grade_id')
            ->whereNotNull('employees.salary_step_id')
            ->whereHas('employeeType', fn ($q) => $q->where('probation_months', 0));

        $branchId = $branchLock ?: (int) ($filters['branch_id'] ?? 0);
        if ($branchId > 0) {
            $query->where('employees.current_branch_id', $branchId);
        }
        if (! empty($filters['program_id'])) {
            $query->where('employees.program_id', (int) $filters['program_id']);
        }
        if (! empty($filters['project_id'])) {
            $query->where('employees.project_id', (int) $filters['project_id']);
        }
        if (! empty($filters['employee_type_id'])) {
            $query->where('employees.employee_type_id', (int) $filters['employee_type_id']);
        }
        if (! empty($filters['employee_ids']) && is_array($filters['employee_ids'])) {
            $query->whereIn('employees.id', $filters['employee_ids']);
        }

        HeadOfficeOrganogram::applyToEmployeeQuery($query);

        return $query;
    }

    /**
     * @param  Collection<int, Employee>  $employees
     * @return array{
     *   steps: Collection<int, Collection<int, SalaryStep>>,
     *   structures: Collection<int, SalaryStructure>,
     *   heads: Collection<int, SalaryHead>,
     *   modifications: Collection<int, Collection<int, SalaryHeadModification>>,
     *   openOrders: Collection<int, SalaryIncrementLine>
     * }
     */
    private function loadScaleContext(Collection $employees, Carbon $effectiveDate): array
    {
        $gradeIds = $employees->pluck('salary_grade_id')->unique()->filter()->values();
        $steps = SalaryStep::query()
            ->whereIn('salary_grade_id', $gradeIds)
            ->where('is_active', true)
            ->orderBy('step_number')
            ->get()
            ->groupBy('salary_grade_id');

        $stepIds = $steps->flatten()->pluck('id')
            ->merge($employees->pluck('salary_step_id'))
            ->unique()
            ->filter()
            ->values();

        $structures = SalaryStructure::query()
            ->with(['lines.head'])
            ->whereIn('salary_step_id', $stepIds)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->get()
            ->unique('salary_step_id')
            ->keyBy('salary_step_id');

        $heads = SalaryHead::query()
            ->where('is_active', true)
            ->where('is_basic_head', false)
            ->where('is_pf_head', false)
            ->where('is_income_tax_head', false)
            ->where('is_loan_head', false)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $employeeIds = $employees->pluck('id');
        $modifications = SalaryHeadModification::query()
            ->with('head')
            ->whereIn('employee_id', $employeeIds)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $effectiveDate->toDateString())
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->get()
            ->groupBy('employee_id')
            ->map(fn (Collection $rows) => $rows->unique('salary_head_id')->keyBy(fn (SalaryHeadModification $mod) => (int) $mod->salary_head_id));

        $openOrders = SalaryIncrementLine::query()
            ->with('salaryIncrement:id,order_no,status')
            ->whereIn('employee_id', $employeeIds)
            ->whereHas('salaryIncrement', fn ($q) => $q->whereIn('status', SalaryIncrement::openStatuses()))
            ->get()
            ->keyBy('employee_id');

        return [
            'steps' => $steps,
            'structures' => $structures,
            'heads' => $heads,
            'modifications' => $modifications,
            'openOrders' => $openOrders,
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array{kind: string, payload: array<string, mixed>}
     */
    private function classify(Employee $employee, Carbon $effectiveDate, array $context): array
    {
        $base = $this->identity($employee);
        $open = $context['openOrders']->get($employee->id);
        if ($open?->salaryIncrement) {
            return $this->held($base, 'open_order', 'Already included in order '.$open->salaryIncrement->order_no.'.', false);
        }

        /** @var Collection<int, SalaryStep> $gradeSteps */
        $gradeSteps = $context['steps']->get($employee->salary_grade_id, collect());
        $byNumber = $gradeSteps->keyBy('step_number');
        $currentStep = $employee->salaryStep;
        if (! $currentStep || ! $byNumber->has($currentStep->step_number)) {
            return $this->held($base, 'missing_step', 'Current step is not on the published salary scale.', false);
        }

        $maxStep = (int) $gradeSteps->max('step_number');
        $mods = $context['modifications']->get($employee->id, collect());
        $currentBasic = $this->currentBasic($employee);
        $currentGross = $this->grossFor($employee, $currentBasic, (int) $currentStep->id, $mods, $context['structures'], $context['heads']);
        $proposals = [];
        $steps = 1;

        while ($target = $byNumber->get($currentStep->step_number + $steps)) {
            $toBasic = SalaryStructureCalculator::roundTaka((float) $target->basic_salary);
            $toGross = $this->grossFor($employee, $toBasic, (int) $target->id, $mods, $context['structures'], $context['heads']);
            $proposals[$steps] = [
                'to_step_id' => (int) $target->id,
                'to_step' => (int) $target->step_number,
                'to_basic' => $toBasic,
                'to_gross' => $toGross,
                'increment_amount' => SalaryStructureCalculator::roundTaka($toGross - $currentGross),
            ];
            $steps++;
        }

        if (! isset($proposals[1])) {
            return $this->held(
                $base,
                'ceiling',
                'Already at step '.$currentStep->step_number.', the last step of this grade.',
                false,
            );
        }

        $reason = $this->eligibilityReason($employee, $effectiveDate);
        $scaleBasic = SalaryStructureCalculator::roundTaka((float) $currentStep->basic_salary);
        $payload = $base + [
            'eligible' => $reason === null,
            'grantable' => true,
            'reason_code' => $reason['code'] ?? null,
            'reason' => $reason['text'] ?? null,
            'can_release' => ($reason['code'] ?? null) === 'stopped',
            'current_step_id' => (int) $currentStep->id,
            'current_step' => (int) $currentStep->step_number,
            'max_step' => $maxStep,
            'current_basic' => $currentBasic,
            'current_gross' => $currentGross,
            'basic_off_scale' => abs($currentBasic - $scaleBasic) > 1,
            'proposals' => $proposals,
        ];

        return [
            'kind' => $reason === null ? 'eligible' : 'held',
            'payload' => $payload,
        ];
    }

    /**
     * @return array{code: string, text: string}|null
     */
    private function eligibilityReason(Employee $employee, Carbon $effectiveDate): ?array
    {
        if ($employee->increment_stopped) {
            return [
                'code' => 'stopped',
                'text' => $employee->increment_stop_reason
                    ? (string) $employee->increment_stop_reason
                    : 'Increment is withheld.',
            ];
        }

        if (! $employee->joining_date) {
            return [
                'code' => 'no_joining',
                'text' => 'No joining date on file.',
            ];
        }

        $dueFrom = $effectiveDate->copy()->subMonths(self::SERVICE_MONTHS);
        $joining = Carbon::parse($employee->joining_date)->startOfDay();
        if ($joining->gt($dueFrom)) {
            return [
                'code' => 'short_service',
                'text' => 'Joining date '.$joining->toDateString().' is under 12 months before the effective date.',
            ];
        }

        if ($employee->last_increment_date) {
            $last = Carbon::parse($employee->last_increment_date)->startOfDay();
            if ($last->gt($dueFrom)) {
                return [
                    'code' => 'recent_increment',
                    'text' => 'Last increment was '.$last->toDateString().'. The next one is due after '.$last->copy()->addMonths(self::SERVICE_MONTHS)->toDateString().'.',
                ];
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $base
     * @return array{kind: string, payload: array<string, mixed>}
     */
    private function held(array $base, string $code, string $text, bool $grantable, bool $canRelease = false): array
    {
        return [
            'kind' => 'held',
            'payload' => $base + [
                'eligible' => false,
                'grantable' => $grantable,
                'reason_code' => $code,
                'reason' => $text,
                'can_release' => $canRelease,
                'proposals' => [],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function identity(Employee $employee): array
    {
        $grade = $employee->salaryGrade;
        $gradeLabel = $grade?->name ?: ($grade?->code ? strtoupper((string) $grade->code) : '—');

        return [
            'employee_id' => (int) $employee->id,
            'employee_code' => (string) $employee->employee_id,
            'name' => trim((string) ($employee->name_en ?: $employee->name_bn ?: 'Employee')),
            'branch' => $employee->branch?->name ?: '—',
            'employee_type' => $employee->employeeType?->name ?: '—',
            'grade' => $gradeLabel,
            'grade_id' => $employee->salary_grade_id ? (int) $employee->salary_grade_id : null,
            'joining_date' => $employee->joining_date?->toDateString(),
            'last_increment_date' => $employee->last_increment_date?->toDateString(),
            'increment_stopped' => (bool) $employee->increment_stopped,
            'increment_stop_reason' => $employee->increment_stop_reason,
            'current_step' => $employee->salaryStep?->step_number,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function stopPayload(array $row): array
    {
        return [
            'employee_id' => $row['employee_id'],
            'action' => SalaryIncrementLine::ACTION_STOP,
            'salary_grade_id' => $row['grade_id'],
            'from_salary_step_id' => $row['current_step_id'],
            'to_salary_step_id' => null,
            'from_step_number' => $row['current_step'],
            'to_step_number' => null,
            'steps' => 0,
            'from_basic' => $row['current_basic'],
            'to_basic' => null,
            'from_gross' => $row['current_gross'],
            'to_gross' => null,
            'increment_amount' => 0,
            'arrear_amount' => 0,
            'status' => SalaryIncrementLine::STATUS_PENDING,
            'previous_last_increment_date' => $row['last_increment_date'] ?? null,
            'previous_increment_stopped' => (bool) ($row['increment_stopped'] ?? false),
            'previous_increment_stop_reason' => $row['increment_stop_reason'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, mixed>  $proposal
     * @return array<string, mixed>
     */
    private function grantPayload(array $row, int $steps, array $proposal, int $arrearMonths): array
    {
        $increment = (float) $proposal['increment_amount'];

        return [
            'employee_id' => $row['employee_id'],
            'action' => SalaryIncrementLine::ACTION_GRANT,
            'salary_grade_id' => $row['grade_id'],
            'from_salary_step_id' => $row['current_step_id'],
            'to_salary_step_id' => $proposal['to_step_id'],
            'from_step_number' => $row['current_step'],
            'to_step_number' => $proposal['to_step'],
            'steps' => $steps,
            'from_basic' => $row['current_basic'],
            'to_basic' => $proposal['to_basic'],
            'from_gross' => $row['current_gross'],
            'to_gross' => $proposal['to_gross'],
            'increment_amount' => $increment,
            'arrear_amount' => SalaryStructureCalculator::roundTaka($increment * $arrearMonths),
            'status' => SalaryIncrementLine::STATUS_PENDING,
            'previous_last_increment_date' => $row['last_increment_date'] ?? null,
            'previous_increment_stopped' => (bool) ($row['increment_stopped'] ?? false),
            'previous_increment_stop_reason' => $row['increment_stop_reason'] ?? null,
        ];
    }

    private function reverseAppliedLines(SalaryIncrement $increment, ?int $actorId): void
    {
        $increment->load(['lines.employee']);

        if ($increment->lines->contains(fn (SalaryIncrementLine $line) => $line->arrear_payslip_id)) {
            throw ValidationException::withMessages([
                'status' => 'Rollback stopped. Arrear from this order is already on a salary payroll. Remove that arrear before finalize, or roll the payroll back first.',
            ]);
        }

        $blockers = [];

        foreach ($increment->lines as $line) {
            if ($line->action !== SalaryIncrementLine::ACTION_GRANT || $line->status !== SalaryIncrementLine::STATUS_APPLIED) {
                continue;
            }

            $employee = $line->employee;
            $stillOnGrantedStep = $employee
                && (int) $employee->salary_step_id === (int) $line->to_salary_step_id
                && (int) $employee->salary_grade_id === (int) $line->salary_grade_id;

            if (! $stillOnGrantedStep) {
                $blockers[] = trim((string) ($employee?->name_en ?: $employee?->employee_id ?: 'Employee '.$line->employee_id));
            }
        }

        if ($blockers !== []) {
            $shown = array_slice($blockers, 0, 8);
            $extra = count($blockers) > 8 ? ' and '.(count($blockers) - 8).' more' : '';
            throw ValidationException::withMessages([
                'status' => 'Rollback stopped. These staff are no longer on the step this order set: '.implode(', ', $shown).$extra.'.',
            ]);
        }

        $history = app(EmployeeAssignmentHistoryService::class);
        $effective = Carbon::parse($increment->effective_date)->toDateString();

        foreach ($increment->lines as $line) {
            $employee = $line->employee;
            if (! $employee) {
                continue;
            }

            if ($line->action === SalaryIncrementLine::ACTION_GRANT && $line->status === SalaryIncrementLine::STATUS_APPLIED) {
                EmployeeAssignmentHistory::query()
                    ->where('employee_id', $employee->id)
                    ->where('source_type', EmployeeAssignmentHistory::SOURCE_INCREMENT)
                    ->where('source_id', $increment->id)
                    ->delete();

                $later = EmployeeAssignmentHistory::query()
                    ->where('employee_id', $employee->id)
                    ->whereDate('effective_from', '>=', $effective)
                    ->where('salary_step_id', $line->to_salary_step_id)
                    ->get();

                foreach ($later as $row) {
                    if ($line->salary_grade_id && $row->salary_grade_id && (int) $row->salary_grade_id !== (int) $line->salary_grade_id) {
                        continue;
                    }

                    $row->salary_step_id = $line->from_salary_step_id;
                    if ($row->basic_salary !== null && $line->to_basic !== null && abs((float) $row->basic_salary - (float) $line->to_basic) < 1) {
                        $row->basic_salary = $line->from_basic;
                    }
                    $row->save();
                }

                $history->queueContext($employee, [
                    'effective_from' => $effective,
                    'source_type' => EmployeeAssignmentHistory::SOURCE_INCREMENT_ROLLBACK,
                    'source_id' => $increment->id,
                    'created_by' => $actorId,
                    'notes' => 'Rollback of annual increment '.$increment->order_no,
                ]);

                $employee->salary_step_id = $line->from_salary_step_id;
                $employee->basic_salary = $line->from_basic;
                $employee->last_increment_date = $line->previous_last_increment_date;
                $employee->increment_stopped = (bool) $line->previous_increment_stopped;
                $employee->increment_stop_reason = $line->previous_increment_stop_reason;
                $employee->save();
            }

            if ($line->action === SalaryIncrementLine::ACTION_STOP && $line->status === SalaryIncrementLine::STATUS_WITHHELD) {
                $employee->increment_stopped = (bool) $line->previous_increment_stopped;
                $employee->increment_stop_reason = $line->previous_increment_stop_reason;
                $employee->save();
            }
        }
    }

    private function currentBasic(Employee $employee): float
    {
        if ($employee->basic_salary !== null && (float) $employee->basic_salary > 0) {
            return SalaryStructureCalculator::roundTaka((float) $employee->basic_salary);
        }

        return SalaryStructureCalculator::roundTaka((float) ($employee->salaryStep?->basic_salary ?? 0));
    }

    /**
     * Gross earnings for a basic/step, using the same allowance rules as payroll.
     * PF, tax, and loans are left out — they are not part of the increment amount.
     *
     * @param  Collection<int, SalaryHeadModification>  $mods
     * @param  Collection<int, SalaryStructure>  $structures
     * @param  Collection<int, SalaryHead>  $heads
     */
    private function grossFor(
        Employee $employee,
        float $basic,
        int $stepId,
        Collection $mods,
        Collection $structures,
        Collection $heads,
    ): float {
        $basic = SalaryStructureCalculator::roundTaka($basic);
        $total = $basic;
        $processed = [];

        $assignmentMods = $mods->filter(
            fn (SalaryHeadModification $mod) => $mod->reason === EmployeeSalaryAssignmentService::ASSIGNMENT_REASON
                && $mod->head
                && ! $mod->head->is_basic_head
                && ! $this->isStatutory($mod->head)
        );

        $hasCustomComponents = $employee->custom_salary_assigned_at !== null
            && $employee->basic_salary !== null
            && $assignmentMods->isNotEmpty();

        if ($hasCustomComponents) {
            foreach ($assignmentMods as $mod) {
                $this->addEarning($total, $processed, $mod->head, (string) ($mod->amount_type ?: 'fixed'), (float) $mod->amount, $basic);
            }

            return SalaryStructureCalculator::roundTaka($total);
        }

        $structure = $structures->get($stepId);
        if ($structure && $structure->lines->isNotEmpty()) {
            foreach ($structure->lines as $line) {
                $head = $line->head;
                if (! $head) {
                    continue;
                }

                $mod = $mods->get((int) $head->id);
                if ($mod && $mod->reason === EmployeeSalaryAssignmentService::ASSIGNMENT_REASON) {
                    $mod = null;
                }

                $amountType = $mod?->amount_type ?: ($line->amount_type ?: ($line->calculation_type ?: 'fixed'));
                $amount = $mod ? (float) $mod->amount : (float) $line->value;
                $this->addEarning($total, $processed, $head, (string) $amountType, $amount, $basic);
            }
        } else {
            foreach ($heads as $head) {
                $mod = $mods->get((int) $head->id);
                if ($mod && $mod->reason === EmployeeSalaryAssignmentService::ASSIGNMENT_REASON) {
                    $mod = null;
                }

                $amountType = $mod?->amount_type ?: ($head->default_amount_type ?: 'fixed');
                $amount = $mod ? (float) $mod->amount : (float) $head->default_amount;
                $this->addEarning($total, $processed, $head, (string) $amountType, $amount, $basic);
            }
        }

        foreach ($mods as $headId => $mod) {
            if ($mod->reason === EmployeeSalaryAssignmentService::ASSIGNMENT_REASON) {
                continue;
            }
            if (in_array((int) $headId, $processed, true) || ! $mod->head) {
                continue;
            }

            $this->addEarning(
                $total,
                $processed,
                $mod->head,
                (string) ($mod->amount_type ?: 'fixed'),
                (float) $mod->amount,
                $basic,
            );
        }

        return SalaryStructureCalculator::roundTaka($total);
    }

    /**
     * @param  list<int>  $processed
     */
    private function addEarning(float &$total, array &$processed, SalaryHead $head, string $amountType, float $amount, float $basic): void
    {
        if ($head->is_basic_head || $this->isStatutory($head)) {
            return;
        }

        $id = (int) $head->id;
        if (in_array($id, $processed, true)) {
            return;
        }
        $processed[] = $id;

        if ($head->type !== 'earning') {
            return;
        }

        $total += SalaryStructureCalculator::computeLineAmount($head, $amountType !== '' ? $amountType : 'fixed', $amount, $basic);
    }

    private function isStatutory(SalaryHead $head): bool
    {
        return (bool) ($head->is_pf_head || $head->is_income_tax_head || $head->is_loan_head);
    }
}
