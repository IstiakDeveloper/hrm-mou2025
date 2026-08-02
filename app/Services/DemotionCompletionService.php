<?php

namespace App\Services;

use App\Models\Demotion;
use App\Models\DemotionHistory;
use App\Models\Payscale;
use App\Support\BangladeshDate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DemotionCompletionService
{
    public function shouldApplyImmediately(mixed $effectiveDate): bool
    {
        return BangladeshDate::isDue($effectiveDate);
    }

    public function apply(Demotion $demotion, ?int $actorUserId): void
    {
        $demotion->loadMissing(['employee', 'toSalaryGrade']);

        if ($demotion->status === 'completed') {
            return;
        }

        $employee = $demotion->employee;

        $employee->last_designation_id = $employee->designation_id;

        $toPayscaleId = $demotion->toSalaryGrade?->payscale_id
            ? (int) $demotion->toSalaryGrade->payscale_id
            : Payscale::activeId();

        $this->syncEmployeeFromDemotion($demotion, $toPayscaleId);

        app(EmployeeAssignmentHistoryService::class)->queueContext($employee, [
            'effective_from' => $demotion->effective_date
                ? Carbon::parse($demotion->effective_date)->toDateString()
                : now()->toDateString(),
            'source_type' => \App\Models\EmployeeAssignmentHistory::SOURCE_DEMOTION,
            'source_id' => $demotion->id,
            'created_by' => $actorUserId,
            'notes' => 'Demotion completed',
        ]);

        $employee->save();

        DemotionHistory::create([
            'demotion_id' => $demotion->id,
            'employee_id' => $employee->id,
            'from_designation_id' => $demotion->from_designation_id,
            'to_designation_id' => $demotion->to_designation_id,
            'from_salary_grade_id' => $demotion->from_salary_grade_id,
            'to_salary_grade_id' => $demotion->to_salary_grade_id,
            'from_salary_step_id' => $demotion->from_salary_step_id,
            'to_salary_step_id' => $demotion->to_salary_step_id,
            'from_basic_salary' => $demotion->from_basic_salary,
            'to_basic_salary' => $demotion->to_basic_salary,
            'demotion_date' => $demotion->effective_date ? Carbon::parse($demotion->effective_date) : now(),
            'created_by' => $actorUserId,
        ]);

        $demotion->status = 'completed';
        $demotion->save();
    }

    public function syncEmployeeFromDemotion(Demotion $demotion, ?int $toPayscaleId): void
    {
        $employee = $demotion->employee;
        $employee->designation_id = $demotion->to_designation_id;

        if ($demotion->to_salary_grade_id && $demotion->to_salary_step_id) {
            $employee->payscale_id = $toPayscaleId ?: $demotion->toSalaryGrade?->payscale_id ?: Payscale::activeId();
            $employee->salary_grade_id = $demotion->to_salary_grade_id;
            $employee->salary_step_id = $demotion->to_salary_step_id;

            if ($demotion->to_basic_salary !== null && $demotion->to_basic_salary !== '') {
                $employee->basic_salary = $demotion->to_basic_salary;
            }

            return;
        }

        if ($demotion->to_salary_grade_id) {
            $employee->salary_grade_id = $demotion->to_salary_grade_id;
        }

        if ($demotion->to_basic_salary !== null && $demotion->to_basic_salary !== '') {
            $employee->basic_salary = $demotion->to_basic_salary;
        }
    }

    public function activateDueDemotions(?int $actorUserId = null): int
    {
        $activated = 0;

        Demotion::query()
            ->where('status', 'approved')
            ->whereDate('effective_date', '<=', BangladeshDate::todayString())
            ->orderBy('id')
            ->each(function (Demotion $demotion) use ($actorUserId, &$activated) {
                DB::transaction(function () use ($demotion, $actorUserId, &$activated) {
                    $demotion->refresh();
                    if ($demotion->status !== 'approved') {
                        return;
                    }

                    $this->apply($demotion, $actorUserId ?? $demotion->approved_by);
                    $activated++;
                });
            });

        return $activated;
    }
}
