<?php

namespace App\Services;

use App\Models\Confirmation;
use App\Models\Demotion;
use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\Promotion;
use App\Models\Separation;
use App\Models\Transfer;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EmployeeAssignmentHistoryService
{
    /** @var list<string> */
    public const TRACKED_EMPLOYEE_FIELDS = [
        'current_branch_id',
        'department_id',
        'designation_id',
        'program_id',
        'project_id',
        'employee_type_id',
        'payscale_id',
        'salary_grade_id',
        'salary_step_id',
        'basic_salary',
        'fixed_salary',
        'probation_salary',
        'custom_salary_assigned_at',
        'status',
    ];

    protected bool $suppressRecording = false;

    /**
     * Temporarily skip observer/auto recording (e.g. during bulk sync).
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public function withoutRecording(callable $callback): mixed
    {
        $previous = $this->suppressRecording;
        $this->suppressRecording = true;

        try {
            return $callback();
        } finally {
            $this->suppressRecording = $previous;
        }
    }

    public function isRecordingSuppressed(): bool
    {
        return $this->suppressRecording;
    }

    /**
     * Attach metadata so the next employee save records history with the correct effective date.
     *
     * @param  array{effective_from?: mixed, source_type?: string, source_id?: ?int, created_by?: ?int, notes?: ?string}  $context
     */
    public function queueContext(Employee $employee, array $context): void
    {
        $employee->assignmentHistoryContext = array_merge(
            is_array($employee->assignmentHistoryContext) ? $employee->assignmentHistoryContext : [],
            $context,
        );
    }

    public function periodEndDate(int $year, int $month): Carbon
    {
        return Carbon::create($year, $month, 1)->endOfMonth()->startOfDay();
    }

    public function periodStartDate(int $year, int $month): Carbon
    {
        return Carbon::create($year, $month, 1)->startOfDay();
    }

    /**
     * Assignment / payroll-rules as-of for a salary month.
     * process_date inside the month wins; dates after month-end clamp to month-end
     * so late August processing of July cannot pick up August HR/salary changes.
     */
    public function asOfForPayrollPeriod(int $year, int $month, Carbon|string $processDate): Carbon
    {
        $process = Carbon::parse($processDate)->startOfDay();
        $start = $this->periodStartDate($year, $month);
        $end = $this->periodEndDate($year, $month);

        if ($process->lt($start)) {
            return $start;
        }

        if ($process->gt($end)) {
            return $end;
        }

        return $process;
    }

    public function employeeHasTrackedChanges(Employee $employee): bool
    {
        if ($employee->wasRecentlyCreated) {
            return true;
        }

        foreach (self::TRACKED_EMPLOYEE_FIELDS as $field) {
            if ($employee->wasChanged($field)) {
                return true;
            }
        }

        return false;
    }

    public function recordFromEmployee(
        Employee $employee,
        Carbon|string|null $effectiveFrom = null,
        string $sourceType = EmployeeAssignmentHistory::SOURCE_EMPLOYEE_UPDATE,
        ?int $sourceId = null,
        ?int $createdBy = null,
        ?string $notes = null,
        bool $skipIfUnchanged = true,
    ): ?EmployeeAssignmentHistory {
        if ($this->suppressRecording) {
            return null;
        }

        $context = is_array($employee->assignmentHistoryContext) ? $employee->assignmentHistoryContext : [];
        $employee->assignmentHistoryContext = null;

        $sourceType = (string) ($context['source_type'] ?? $sourceType);
        $sourceId = array_key_exists('source_id', $context) ? $context['source_id'] : $sourceId;
        $createdBy = array_key_exists('created_by', $context) ? $context['created_by'] : $createdBy;
        $notes = array_key_exists('notes', $context) ? $context['notes'] : $notes;

        // Initial snapshots start at joining. Later employee edits must NOT reuse
        // joining_date — that would overlay today's branch onto the whole past and
        // hide completed transfers for payroll as-of.
        $fallbackDate = $sourceType === EmployeeAssignmentHistory::SOURCE_INITIAL
            ? ($employee->joining_date ?? now())
            : now();

        $effective = $this->normalizeDate(
            $context['effective_from']
                ?? $effectiveFrom
                ?? $fallbackDate
        );

        $payload = $this->snapshotPayloadFromEmployee($employee, $effective, $sourceType, $sourceId, $createdBy, $notes);

        if ($skipIfUnchanged) {
            $latest = $this->latestRow($employee->id);
            if ($latest && $this->payloadMatchesHistory($payload, $latest)) {
                return null;
            }
        }

        return EmployeeAssignmentHistory::query()->create($payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshotPayloadFromEmployee(
        Employee $employee,
        Carbon|string $effectiveFrom,
        string $sourceType,
        ?int $sourceId = null,
        ?int $createdBy = null,
        ?string $notes = null,
    ): array {
        return [
            'employee_id' => $employee->id,
            'effective_from' => $this->normalizeDate($effectiveFrom)->toDateString(),
            'branch_id' => $employee->current_branch_id,
            'department_id' => $employee->department_id,
            'designation_id' => $employee->designation_id,
            'program_id' => $employee->program_id,
            'project_id' => $employee->project_id,
            'employee_type_id' => $employee->employee_type_id,
            'payscale_id' => $employee->payscale_id,
            'salary_grade_id' => $employee->salary_grade_id,
            'salary_step_id' => $employee->salary_step_id,
            'basic_salary' => $employee->hasEffectiveCustomBasic() ? $employee->basic_salary : null,
            'fixed_salary' => $employee->fixed_salary,
            'probation_salary' => $employee->probation_salary,
            'custom_salary_assigned_at' => $employee->hasEffectiveCustomBasic() ? $employee->custom_salary_assigned_at : null,
            'status' => $employee->status ?: 'active',
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'created_by' => $createdBy,
            'notes' => $notes,
        ];
    }

    /**
     * Employee IDs whose as-of assignment (or live fallback) is at the given branch.
     *
     * @return list<int>
     */
    public function employeeIdsForBranchAsOf(int $branchId, Carbon|string $asOf): array
    {
        $date = $this->normalizeDate($asOf);

        $candidateIds = Employee::query()
            ->where(function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId)
                    ->orWhereHas('assignmentHistories', fn ($h) => $h->where('branch_id', $branchId));
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($candidateIds === []) {
            return [];
        }

        $histories = $this->resolveManyAsOf($candidateIds, $date);
        $liveBranches = Employee::query()
            ->whereIn('id', $candidateIds)
            ->pluck('current_branch_id', 'id');

        $matched = [];
        foreach ($candidateIds as $employeeId) {
            $history = $histories->get($employeeId);
            $asOfBranch = $history?->branch_id ?? $liveBranches->get($employeeId);
            if ((int) $asOfBranch === $branchId) {
                $matched[] = $employeeId;
            }
        }

        return $matched;
    }

    public function resolveAsOf(int $employeeId, Carbon|string $asOf): ?EmployeeAssignmentHistory
    {
        $date = $this->normalizeDate($asOf)->toDateString();

        return EmployeeAssignmentHistory::query()
            ->where('employee_id', $employeeId)
            ->whereDate('effective_from', '<=', $date)
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @param  list<int>|Collection<int, int>  $employeeIds
     * @return Collection<int, EmployeeAssignmentHistory>
     */
    public function resolveManyAsOf(array|Collection $employeeIds, Carbon|string $asOf): Collection
    {
        $ids = collect($employeeIds)->map(fn ($id) => (int) $id)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        $date = $this->normalizeDate($asOf)->toDateString();

        $rows = EmployeeAssignmentHistory::query()
            ->whereIn('employee_id', $ids)
            ->whereDate('effective_from', '<=', $date)
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->get();

        /** @var Collection<int, EmployeeAssignmentHistory> $latest */
        $latest = collect();
        foreach ($rows as $row) {
            if (! $latest->has($row->employee_id)) {
                $latest->put($row->employee_id, $row);
            }
        }

        return $latest;
    }

    public function applyToEmployee(Employee $employee, ?EmployeeAssignmentHistory $history): Employee
    {
        if (! $history) {
            return $employee;
        }

        $employee->current_branch_id = $history->branch_id;
        $employee->department_id = $history->department_id;
        $employee->designation_id = $history->designation_id;
        $employee->program_id = $history->program_id;
        $employee->project_id = $history->project_id;
        $employee->employee_type_id = $history->employee_type_id;
        $employee->payscale_id = $history->payscale_id;
        $employee->salary_grade_id = $history->salary_grade_id;
        $employee->salary_step_id = $history->salary_step_id;
        $employee->basic_salary = $history->basic_salary;
        // History null means "never recorded", not "clear the live override".
        // Payroll → Probation/Fixed Salary used to update employees via query builder
        // (no observer), so live 25,000 could sit next to an initial history row of null.
        $employee->fixed_salary = $history->fixed_salary ?? $employee->fixed_salary;
        $employee->probation_salary = $history->probation_salary ?? $employee->probation_salary;
        $employee->custom_salary_assigned_at = $history->custom_salary_assigned_at;
        $employee->status = $history->status ?: $employee->status;

        $employee->unsetRelation('branch');
        $employee->unsetRelation('designation');
        $employee->unsetRelation('department');
        $employee->unsetRelation('salaryGrade');
        $employee->unsetRelation('salaryStep');
        $employee->unsetRelation('payscale');
        $employee->unsetRelation('employeeType');

        return $employee;
    }

    /**
     * Copy live probation/fixed overrides onto history rows that never recorded them.
     * Skips separation snapshots. Returns the number of history rows updated.
     */
    public function syncMissingSalaryOverridesFromLive(): int
    {
        $updated = 0;

        $employees = Employee::query()
            ->where('status', 'active')
            ->where(function ($q) {
                $q->where(function ($q2) {
                    $q2->whereNotNull('probation_salary')->where('probation_salary', '>', 0);
                })->orWhere(function ($q2) {
                    $q2->whereNotNull('fixed_salary')->where('fixed_salary', '>', 0);
                });
            })
            ->get(['id', 'probation_salary', 'fixed_salary']);

        foreach ($employees as $employee) {
            $query = EmployeeAssignmentHistory::query()
                ->where('employee_id', $employee->id)
                ->where('source_type', '!=', EmployeeAssignmentHistory::SOURCE_SEPARATION);

            if ((float) $employee->probation_salary > 0) {
                $updated += (clone $query)
                    ->where(function ($q) {
                        $q->whereNull('probation_salary')->orWhere('probation_salary', '<=', 0);
                    })
                    ->update(['probation_salary' => $employee->probation_salary]);
            }

            if ((float) $employee->fixed_salary > 0) {
                $updated += (clone $query)
                    ->where(function ($q) {
                        $q->whereNull('fixed_salary')->orWhere('fixed_salary', '<=', 0);
                    })
                    ->update(['fixed_salary' => $employee->fixed_salary]);
            }
        }

        return $updated;
    }

    public function isPayrollReadyHistory(EmployeeAssignmentHistory $history, ?Employee $employee = null): bool
    {
        if ($history->hasFullGradeAssignment()) {
            return true;
        }

        if ($history->hasNonGradePayrollPath()) {
            return true;
        }

        if ($employee?->relationLoaded('employeeType') && ($employee->employeeType?->probation_months ?? 0) > 0) {
            return true;
        }

        if ($history->employee_type_id) {
            $months = DB::table('employee_types')->where('id', $history->employee_type_id)->value('probation_months');

            return (int) $months > 0;
        }

        return false;
    }

    /**
     * Match request org filters against an as-of history row (or live employee fallback).
     *
     * @param  array{
     *   branch_id?: int|null,
     *   department_id?: int|null,
     *   designation_id?: int|null,
     *   program_id?: int|null,
     *   project_id?: int|null
     * }  $filters
     */
    public function matchesOrgFilters(?EmployeeAssignmentHistory $history, Employee $employee, array $filters): bool
    {
        $branchId = $history?->branch_id ?? $employee->current_branch_id;
        $departmentId = $history?->department_id ?? $employee->department_id;
        $designationId = $history?->designation_id ?? $employee->designation_id;
        $programId = $history?->program_id ?? $employee->program_id;
        $projectId = $history?->project_id ?? $employee->project_id;

        if (! empty($filters['branch_id']) && (int) $branchId !== (int) $filters['branch_id']) {
            return false;
        }

        if (! empty($filters['department_id']) && (int) $departmentId !== (int) $filters['department_id']) {
            return false;
        }

        if (! empty($filters['designation_id']) && (int) $designationId !== (int) $filters['designation_id']) {
            return false;
        }

        if (! empty($filters['program_id']) && (int) $programId !== (int) $filters['program_id']) {
            return false;
        }

        if (! empty($filters['project_id']) && (int) $projectId !== (int) $filters['project_id']) {
            return false;
        }

        return true;
    }

    /**
     * Rebuild history from completed HR events + current employee state.
     *
     * @return array{employees: int, rows: int, skipped: int}
     */
    public function backfillAll(?callable $onProgress = null): array
    {
        $employees = 0;
        $rows = 0;
        $skipped = 0;

        $this->withoutRecording(function () use (&$employees, &$rows, &$skipped, $onProgress) {
            Employee::query()
                ->orderBy('id')
                ->chunkById(100, function ($chunk) use (&$employees, &$rows, &$skipped, $onProgress) {
                    foreach ($chunk as $employee) {
                        $created = $this->backfillEmployee($employee);
                        $employees++;
                        $rows += $created;
                        if ($created === 0) {
                            $skipped++;
                        }
                        if ($onProgress) {
                            $onProgress($employee, $created);
                        }
                    }
                });
        });

        return compact('employees', 'rows', 'skipped');
    }

    public function backfillEmployee(Employee $employee): int
    {
        if (EmployeeAssignmentHistory::query()->where('employee_id', $employee->id)->exists()) {
            return 0;
        }

        $events = $this->collectEventsForEmployee($employee);
        $state = $this->inferInitialState($employee, $events);
        $created = 0;

        $initialDate = $employee->joining_date
            ? Carbon::parse($employee->joining_date)->startOfDay()
            : ($events[0]['date'] ?? Carbon::parse($employee->created_at ?? now())->startOfDay());

        EmployeeAssignmentHistory::query()->create($this->stateToPayload(
            $employee->id,
            $state,
            $initialDate,
            EmployeeAssignmentHistory::SOURCE_INITIAL,
            null,
            'Backfilled joining / earliest known assignment'
        ));
        $created++;

        foreach ($events as $event) {
            $state = $this->applyEventToState($state, $event);
            EmployeeAssignmentHistory::query()->create($this->stateToPayload(
                $employee->id,
                $state,
                $event['date'],
                $event['source_type'],
                $event['source_id'],
                $event['notes'] ?? 'Backfilled from '.$event['source_type']
            ));
            $created++;
        }

        $current = $this->stateFromEmployee($employee);
        if (! $this->statesEqual($state, $current)) {
            $syncDate = ! empty($events)
                ? $events[array_key_last($events)]['date']->copy()
                : Carbon::parse($employee->updated_at ?? now())->startOfDay();

            EmployeeAssignmentHistory::query()->create($this->stateToPayload(
                $employee->id,
                $current,
                $syncDate,
                EmployeeAssignmentHistory::SOURCE_SYNC,
                null,
                'Backfilled sync to current employee master (manual edits without HR event)'
            ));
            $created++;
        }

        return $created;
    }

    /**
     * @return list<array{date: Carbon, source_type: string, source_id: int, notes?: string, patch: array<string, mixed>}>
     */
    protected function collectEventsForEmployee(Employee $employee): array
    {
        $events = [];

        Transfer::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('effective_date')
            ->orderBy('id')
            ->get()
            ->each(function (Transfer $transfer) use (&$events) {
                $events[] = [
                    'date' => Carbon::parse($transfer->effective_date ?? $transfer->updated_at)->startOfDay(),
                    'source_type' => EmployeeAssignmentHistory::SOURCE_TRANSFER,
                    'source_id' => $transfer->id,
                    'patch' => array_filter([
                        'branch_id' => $transfer->to_branch_id,
                        'department_id' => $transfer->to_department_id,
                        'designation_id' => $transfer->to_designation_id,
                    ], fn ($v) => $v !== null),
                ];
            });

        Promotion::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('effective_date')
            ->orderBy('id')
            ->get()
            ->each(function (Promotion $promotion) use (&$events) {
                $patch = array_filter([
                    'designation_id' => $promotion->to_designation_id,
                    'salary_grade_id' => $promotion->to_salary_grade_id,
                    'salary_step_id' => $promotion->to_salary_step_id,
                    'basic_salary' => $promotion->to_basic_salary,
                ], fn ($v) => $v !== null && $v !== '');

                if ($promotion->to_salary_grade_id) {
                    $payscaleId = DB::table('salary_grades')->where('id', $promotion->to_salary_grade_id)->value('payscale_id');
                    if ($payscaleId) {
                        $patch['payscale_id'] = (int) $payscaleId;
                    }
                }

                $events[] = [
                    'date' => Carbon::parse($promotion->effective_date ?? $promotion->updated_at)->startOfDay(),
                    'source_type' => EmployeeAssignmentHistory::SOURCE_PROMOTION,
                    'source_id' => $promotion->id,
                    'patch' => $patch,
                ];
            });

        Demotion::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('effective_date')
            ->orderBy('id')
            ->get()
            ->each(function (Demotion $demotion) use (&$events) {
                $patch = array_filter([
                    'designation_id' => $demotion->to_designation_id,
                    'salary_grade_id' => $demotion->to_salary_grade_id,
                    'salary_step_id' => $demotion->to_salary_step_id,
                    'basic_salary' => $demotion->to_basic_salary,
                ], fn ($v) => $v !== null && $v !== '');

                if ($demotion->to_salary_grade_id) {
                    $payscaleId = DB::table('salary_grades')->where('id', $demotion->to_salary_grade_id)->value('payscale_id');
                    if ($payscaleId) {
                        $patch['payscale_id'] = (int) $payscaleId;
                    }
                }

                $events[] = [
                    'date' => Carbon::parse($demotion->effective_date ?? $demotion->updated_at)->startOfDay(),
                    'source_type' => EmployeeAssignmentHistory::SOURCE_DEMOTION,
                    'source_id' => $demotion->id,
                    'patch' => $patch,
                ];
            });

        Confirmation::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('confirmation_date')
            ->orderBy('id')
            ->get()
            ->each(function (Confirmation $confirmation) use (&$events) {
                $patch = array_filter([
                    'designation_id' => $confirmation->to_designation_id,
                    'employee_type_id' => $confirmation->to_employee_type_id,
                    'salary_grade_id' => $confirmation->to_salary_grade_id,
                    'salary_step_id' => $confirmation->to_salary_step_id,
                    'basic_salary' => $confirmation->to_basic_salary,
                ], fn ($v) => $v !== null && $v !== '');

                if ($confirmation->to_salary_grade_id) {
                    $payscaleId = DB::table('salary_grades')->where('id', $confirmation->to_salary_grade_id)->value('payscale_id');
                    if ($payscaleId) {
                        $patch['payscale_id'] = (int) $payscaleId;
                    }
                }

                $events[] = [
                    'date' => Carbon::parse($confirmation->confirmation_date ?? $confirmation->updated_at)->startOfDay(),
                    'source_type' => EmployeeAssignmentHistory::SOURCE_CONFIRMATION,
                    'source_id' => $confirmation->id,
                    'patch' => $patch,
                ];
            });

        Separation::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('separation_date')
            ->orderBy('id')
            ->get()
            ->each(function (Separation $separation) use (&$events) {
                $events[] = [
                    'date' => Carbon::parse($separation->separation_date ?? $separation->updated_at)->startOfDay(),
                    'source_type' => EmployeeAssignmentHistory::SOURCE_SEPARATION,
                    'source_id' => $separation->id,
                    'patch' => [
                        'status' => 'inactive',
                    ],
                ];
            });

        usort($events, function (array $a, array $b) {
            $cmp = $a['date']->timestamp <=> $b['date']->timestamp;
            if ($cmp !== 0) {
                return $cmp;
            }

            return ($a['source_id'] ?? 0) <=> ($b['source_id'] ?? 0);
        });

        return $events;
    }

    /**
     * @param  list<array{date: Carbon, source_type: string, source_id: int, patch: array<string, mixed>}>  $events
     * @return array<string, mixed>
     */
    protected function inferInitialState(Employee $employee, array $events): array
    {
        $state = $this->stateFromEmployee($employee);

        // Walk reverse patches using from_* on first matching events where available.
        $firstTransfer = Transfer::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('effective_date')
            ->orderBy('id')
            ->first();

        if ($firstTransfer) {
            $state['branch_id'] = $firstTransfer->from_branch_id ?: $state['branch_id'];
            if ($firstTransfer->from_department_id) {
                $state['department_id'] = $firstTransfer->from_department_id;
            }
            if ($firstTransfer->from_designation_id) {
                $state['designation_id'] = $firstTransfer->from_designation_id;
            }
        }

        $firstPromotion = Promotion::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('effective_date')
            ->orderBy('id')
            ->first();

        if ($firstPromotion) {
            if ($firstPromotion->from_designation_id) {
                $state['designation_id'] = $firstPromotion->from_designation_id;
            }
            if ($firstPromotion->from_salary_grade_id) {
                $state['salary_grade_id'] = $firstPromotion->from_salary_grade_id;
                $payscaleId = DB::table('salary_grades')->where('id', $firstPromotion->from_salary_grade_id)->value('payscale_id');
                if ($payscaleId) {
                    $state['payscale_id'] = (int) $payscaleId;
                }
            }
            if ($firstPromotion->from_salary_step_id) {
                $state['salary_step_id'] = $firstPromotion->from_salary_step_id;
            }
            if ($firstPromotion->from_basic_salary !== null) {
                $state['basic_salary'] = $firstPromotion->from_basic_salary;
            }
        }

        $firstDemotion = Demotion::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('effective_date')
            ->orderBy('id')
            ->first();

        if ($firstDemotion && (! $firstPromotion || Carbon::parse($firstDemotion->effective_date)->lt(Carbon::parse($firstPromotion->effective_date)))) {
            if ($firstDemotion->from_designation_id) {
                $state['designation_id'] = $firstDemotion->from_designation_id;
            }
            if ($firstDemotion->from_salary_grade_id) {
                $state['salary_grade_id'] = $firstDemotion->from_salary_grade_id;
                $payscaleId = DB::table('salary_grades')->where('id', $firstDemotion->from_salary_grade_id)->value('payscale_id');
                if ($payscaleId) {
                    $state['payscale_id'] = (int) $payscaleId;
                }
            }
            if ($firstDemotion->from_salary_step_id) {
                $state['salary_step_id'] = $firstDemotion->from_salary_step_id;
            }
            if ($firstDemotion->from_basic_salary !== null) {
                $state['basic_salary'] = $firstDemotion->from_basic_salary;
            }
        }

        $firstConfirmation = Confirmation::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'completed')
            ->orderBy('confirmation_date')
            ->orderBy('id')
            ->first();

        if ($firstConfirmation) {
            if ($firstConfirmation->from_designation_id) {
                $state['designation_id'] = $firstConfirmation->from_designation_id;
            }
            if ($firstConfirmation->from_employee_type_id) {
                $state['employee_type_id'] = $firstConfirmation->from_employee_type_id;
            }
            if ($firstConfirmation->from_salary_grade_id) {
                $state['salary_grade_id'] = $firstConfirmation->from_salary_grade_id;
                $payscaleId = DB::table('salary_grades')->where('id', $firstConfirmation->from_salary_grade_id)->value('payscale_id');
                if ($payscaleId) {
                    $state['payscale_id'] = (int) $payscaleId;
                }
            } else {
                $state['salary_grade_id'] = null;
                $state['salary_step_id'] = null;
                $state['payscale_id'] = null;
            }
            if ($firstConfirmation->from_salary_step_id) {
                $state['salary_step_id'] = $firstConfirmation->from_salary_step_id;
            }
            if ($firstConfirmation->from_basic_salary !== null) {
                $state['basic_salary'] = $firstConfirmation->from_basic_salary;
            }
        }

        $state['status'] = 'active';

        return $state;
    }

    public function rebuildEmployeeHistory(Employee|int $employee): int
    {
        $employeeModel = $employee instanceof Employee
            ? $employee
            : Employee::query()->find($employee);

        if (! $employeeModel) {
            return 0;
        }

        return $this->withoutRecording(function () use ($employeeModel) {
            EmployeeAssignmentHistory::query()->where('employee_id', $employeeModel->id)->delete();

            return $this->backfillEmployee($employeeModel);
        });
    }

    /**
     * @return array<string, mixed>
     */
    protected function stateFromEmployee(Employee $employee): array
    {
        return [
            'branch_id' => $employee->current_branch_id,
            'department_id' => $employee->department_id,
            'designation_id' => $employee->designation_id,
            'program_id' => $employee->program_id,
            'project_id' => $employee->project_id,
            'employee_type_id' => $employee->employee_type_id,
            'payscale_id' => $employee->payscale_id,
            'salary_grade_id' => $employee->salary_grade_id,
            'salary_step_id' => $employee->salary_step_id,
            'basic_salary' => $employee->hasEffectiveCustomBasic() ? $employee->basic_salary : null,
            'fixed_salary' => $employee->fixed_salary,
            'probation_salary' => $employee->probation_salary,
            'custom_salary_assigned_at' => $employee->hasEffectiveCustomBasic() ? $employee->custom_salary_assigned_at : null,
            'status' => $employee->status ?: 'active',
        ];
    }

    /**
     * @param  array<string, mixed>  $state
     * @param  array{patch: array<string, mixed>}  $event
     * @return array<string, mixed>
     */
    protected function applyEventToState(array $state, array $event): array
    {
        foreach ($event['patch'] as $key => $value) {
            $state[$key] = $value;
        }

        return $state;
    }

    /**
     * @param  array<string, mixed>  $state
     * @return array<string, mixed>
     */
    protected function stateToPayload(
        int $employeeId,
        array $state,
        Carbon $effectiveFrom,
        string $sourceType,
        ?int $sourceId,
        ?string $notes,
    ): array {
        return [
            'employee_id' => $employeeId,
            'effective_from' => $effectiveFrom->toDateString(),
            'branch_id' => $state['branch_id'] ?? null,
            'department_id' => $state['department_id'] ?? null,
            'designation_id' => $state['designation_id'] ?? null,
            'program_id' => $state['program_id'] ?? null,
            'project_id' => $state['project_id'] ?? null,
            'employee_type_id' => $state['employee_type_id'] ?? null,
            'payscale_id' => $state['payscale_id'] ?? null,
            'salary_grade_id' => $state['salary_grade_id'] ?? null,
            'salary_step_id' => $state['salary_step_id'] ?? null,
            'basic_salary' => $state['basic_salary'] ?? null,
            'fixed_salary' => $state['fixed_salary'] ?? null,
            'probation_salary' => $state['probation_salary'] ?? null,
            'custom_salary_assigned_at' => $state['custom_salary_assigned_at'] ?? null,
            'status' => $state['status'] ?? 'active',
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'created_by' => null,
            'notes' => $notes,
        ];
    }

    /**
     * @param  array<string, mixed>  $a
     * @param  array<string, mixed>  $b
     */
    protected function statesEqual(array $a, array $b): bool
    {
        $keys = [
            'branch_id', 'department_id', 'designation_id', 'program_id', 'project_id',
            'employee_type_id', 'payscale_id', 'salary_grade_id', 'salary_step_id',
            'basic_salary', 'fixed_salary', 'probation_salary', 'status',
        ];

        foreach ($keys as $key) {
            $left = $a[$key] ?? null;
            $right = $b[$key] ?? null;

            if (in_array($key, ['basic_salary', 'fixed_salary', 'probation_salary'], true)) {
                $left = $left === null || $left === '' ? null : round((float) $left, 2);
                $right = $right === null || $right === '' ? null : round((float) $right, 2);
            } elseif ($key === 'status') {
                $left = $left ?: null;
                $right = $right ?: null;
            } else {
                $left = $left === null || $left === '' ? null : (int) $left;
                $right = $right === null || $right === '' ? null : (int) $right;
            }

            if ($left != $right) {
                return false;
            }
        }

        return true;
    }

    protected function latestRow(int $employeeId): ?EmployeeAssignmentHistory
    {
        return EmployeeAssignmentHistory::query()
            ->where('employee_id', $employeeId)
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function payloadMatchesHistory(array $payload, EmployeeAssignmentHistory $history): bool
    {
        return $this->statesEqual($payload, [
            'branch_id' => $history->branch_id,
            'department_id' => $history->department_id,
            'designation_id' => $history->designation_id,
            'program_id' => $history->program_id,
            'project_id' => $history->project_id,
            'employee_type_id' => $history->employee_type_id,
            'payscale_id' => $history->payscale_id,
            'salary_grade_id' => $history->salary_grade_id,
            'salary_step_id' => $history->salary_step_id,
            'basic_salary' => $history->basic_salary,
            'fixed_salary' => $history->fixed_salary,
            'probation_salary' => $history->probation_salary,
            'status' => $history->status,
        ]);
    }

    protected function normalizeDate(Carbon|string $date): Carbon
    {
        return Carbon::parse($date)->startOfDay();
    }
}
