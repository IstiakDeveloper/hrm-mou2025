<?php

namespace App\Services;

use App\Models\Payscale;
use App\Models\Promotion;
use App\Models\PromotionHistory;
use App\Support\BangladeshDate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PromotionCompletionService
{
    public function shouldApplyImmediately(mixed $effectiveDate): bool
    {
        return BangladeshDate::isDue($effectiveDate);
    }

    public function apply(Promotion $promotion, ?int $actorUserId): void
    {
        $promotion->loadMissing(['employee', 'toSalaryGrade']);

        if ($promotion->status === 'completed') {
            return;
        }

        $employee = $promotion->employee;

        $employee->last_designation_id = $employee->designation_id;

        $toPayscaleId = $promotion->toSalaryGrade?->payscale_id
            ? (int) $promotion->toSalaryGrade->payscale_id
            : Payscale::activeId();

        $this->syncEmployeeFromPromotion($promotion, $toPayscaleId);

        /** @var mixed $lastPromotionDate */
        $lastPromotionDate = $promotion->effective_date ? Carbon::parse($promotion->effective_date) : now();
        $employee->last_promotion_date = $lastPromotionDate;

        app(EmployeeAssignmentHistoryService::class)->queueContext($employee, [
            'effective_from' => $promotion->effective_date
                ? Carbon::parse($promotion->effective_date)->toDateString()
                : now()->toDateString(),
            'source_type' => \App\Models\EmployeeAssignmentHistory::SOURCE_PROMOTION,
            'source_id' => $promotion->id,
            'created_by' => $actorUserId,
            'notes' => 'Promotion completed',
        ]);

        $employee->save();

        PromotionHistory::create([
            'promotion_id' => $promotion->id,
            'employee_id' => $employee->id,
            'from_designation_id' => $promotion->from_designation_id,
            'to_designation_id' => $promotion->to_designation_id,
            'from_salary_grade_id' => $promotion->from_salary_grade_id,
            'to_salary_grade_id' => $promotion->to_salary_grade_id,
            'from_salary_step_id' => $promotion->from_salary_step_id,
            'to_salary_step_id' => $promotion->to_salary_step_id,
            'from_basic_salary' => $promotion->from_basic_salary,
            'to_basic_salary' => $promotion->to_basic_salary,
            'promotion_date' => $promotion->effective_date ? Carbon::parse($promotion->effective_date) : now(),
            'created_by' => $actorUserId,
        ]);

        $promotion->status = 'completed';
        $promotion->save();

        app(EmployeeAssignmentHistoryService::class)->rebuildEmployeeHistory($employee);
    }

    public function syncEmployeeFromPromotion(Promotion $promotion, ?int $toPayscaleId): void
    {
        $employee = $promotion->employee;
        $employee->designation_id = $promotion->to_designation_id;

        if ($promotion->to_salary_grade_id && $promotion->to_salary_step_id) {
            $employee->payscale_id = $toPayscaleId ?: $promotion->toSalaryGrade?->payscale_id ?: Payscale::activeId();
            $employee->salary_grade_id = $promotion->to_salary_grade_id;
            $employee->salary_step_id = $promotion->to_salary_step_id;

            if ($promotion->to_basic_salary !== null && $promotion->to_basic_salary !== '') {
                $employee->basic_salary = $promotion->to_basic_salary;
            }

            return;
        }

        if ($promotion->to_salary_grade_id) {
            $employee->salary_grade_id = $promotion->to_salary_grade_id;
        }

        if ($promotion->to_basic_salary !== null && $promotion->to_basic_salary !== '') {
            $employee->basic_salary = $promotion->to_basic_salary;
        }
    }

    public function rollback(Promotion $promotion, ?int $actorUserId): void
    {
        if ($promotion->status !== 'completed') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'status' => 'Only completed promotions can be rolled back.',
            ]);
        }

        $promotion->loadMissing(['employee', 'fromSalaryGrade']);

        DB::transaction(function () use ($promotion, $actorUserId) {
            $employee = $promotion->employee;

            // Restore employee to pre-promotion values
            $employee->designation_id = $promotion->from_designation_id;

            if ($promotion->from_salary_grade_id) {
                $fromGrade = $promotion->fromSalaryGrade
                    ?? \App\Models\SalaryGrade::find($promotion->from_salary_grade_id);
                $employee->payscale_id = $fromGrade?->payscale_id ?: $employee->payscale_id;
                $employee->salary_grade_id = $promotion->from_salary_grade_id;
            } else {
                $employee->salary_grade_id = null;
                $employee->payscale_id = null;
            }

            if ($promotion->from_salary_step_id) {
                $employee->salary_step_id = $promotion->from_salary_step_id;
            } else {
                $employee->salary_step_id = null;
            }

            if ($promotion->from_basic_salary !== null && $promotion->from_basic_salary !== '') {
                $employee->basic_salary = $promotion->from_basic_salary;
            }

            // Clear last_promotion_date if it matches this promotion's effective date
            if ($promotion->effective_date && $employee->last_promotion_date) {
                $promoDate = \Illuminate\Support\Carbon::parse($promotion->effective_date)->toDateString();
                $lastDate = \Illuminate\Support\Carbon::parse($employee->last_promotion_date)->toDateString();
                if ($promoDate === $lastDate) {
                    // Find previous promotion date
                    $prev = Promotion::query()
                        ->where('employee_id', $employee->id)
                        ->where('status', 'completed')
                        ->where('id', '!=', $promotion->id)
                        ->orderByDesc('effective_date')
                        ->orderByDesc('id')
                        ->value('effective_date');
                    $employee->last_promotion_date = $prev ? \Illuminate\Support\Carbon::parse($prev) : null;
                }
            }

            $employee->save();

            // Delete the promotion history records for this promotion
            $promotion->histories()->delete();

            // Revert promotion status back to approved
            $promotion->status = 'approved';
            $promotion->save();

            // Rebuild assignment history to reflect the reversal
            app(EmployeeAssignmentHistoryService::class)->rebuildEmployeeHistory($employee);
        });
    }

    public function activateDuePromotions(?int $actorUserId = null): int
    {
        $activated = 0;

        Promotion::query()
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('effective_date', '<=', BangladeshDate::todayString())
            ->orderBy('id')
            ->each(function (Promotion $promotion) use ($actorUserId, &$activated) {
                DB::transaction(function () use ($promotion, $actorUserId, &$activated) {
                    $promotion->refresh();
                    if (! in_array($promotion->status, ['pending', 'approved'], true)) {
                        return;
                    }

                    $this->apply($promotion, $actorUserId ?? $promotion->approved_by);
                    $activated++;
                });
            });

        return $activated;
    }
}
