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
    }

    public function syncEmployeeFromPromotion(Promotion $promotion, ?int $toPayscaleId): void
    {
        $employee = $promotion->employee;
        $employee->designation_id = $promotion->to_designation_id;

        if ($promotion->to_salary_grade_id && $promotion->to_salary_step_id) {
            $employee->payscale_id = $toPayscaleId ?: $promotion->toSalaryGrade?->payscale_id ?: Payscale::activeId();
            $employee->salary_grade_id = $promotion->to_salary_grade_id;
            $employee->salary_step_id = $promotion->to_salary_step_id;

            return;
        }

        if ($promotion->to_salary_grade_id) {
            $employee->salary_grade_id = $promotion->to_salary_grade_id;
        }
    }

    public function activateDuePromotions(?int $actorUserId = null): int
    {
        $activated = 0;

        Promotion::query()
            ->where('status', 'approved')
            ->whereDate('effective_date', '<=', BangladeshDate::todayString())
            ->orderBy('id')
            ->each(function (Promotion $promotion) use ($actorUserId, &$activated) {
                DB::transaction(function () use ($promotion, $actorUserId, &$activated) {
                    $promotion->refresh();
                    if ($promotion->status !== 'approved') {
                        return;
                    }

                    $this->apply($promotion, $actorUserId ?? $promotion->approved_by);
                    $activated++;
                });
            });

        return $activated;
    }
}
