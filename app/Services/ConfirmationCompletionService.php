<?php

namespace App\Services;

use App\Models\Confirmation;
use App\Models\ConfirmationHistory;
use App\Models\Payscale;
use App\Models\Promotion;
use App\Models\PromotionHistory;
use App\Support\BangladeshDate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ConfirmationCompletionService
{
    public function shouldApplyImmediately(mixed $confirmationDate): bool
    {
        return BangladeshDate::isDue($confirmationDate);
    }

    public function apply(Confirmation $confirmation, ?int $actorUserId, ?int $toPayscaleId = null): void
    {
        $confirmation->loadMissing(['employee.employeeType', 'toSalaryGrade']);

        if ($confirmation->status === 'completed') {
            return;
        }

        $employee = $confirmation->employee;

        if ($employee->confirmation_date) {
            $confirmation->status = 'completed';
            $confirmation->save();

            return;
        }

        $previousDate = $employee->confirmation_date;
        $confirmationDate = $confirmation->confirmation_date
            ? Carbon::parse($confirmation->confirmation_date)
            : now();

        if ($confirmation->to_designation_id) {
            $employee->last_designation_id = $employee->designation_id;
        }

        $this->syncEmployeeFromConfirmation($confirmation, $toPayscaleId);
        $employee->save();

        ConfirmationHistory::create([
            'confirmation_id' => $confirmation->id,
            'employee_id' => $employee->id,
            'from_designation_id' => $confirmation->from_designation_id,
            'to_designation_id' => $confirmation->to_designation_id,
            'from_employee_type_id' => $confirmation->from_employee_type_id,
            'to_employee_type_id' => $confirmation->to_employee_type_id,
            'from_salary_grade_id' => $confirmation->from_salary_grade_id,
            'to_salary_grade_id' => $confirmation->to_salary_grade_id,
            'from_salary_step_id' => $confirmation->from_salary_step_id,
            'to_salary_step_id' => $confirmation->to_salary_step_id,
            'from_basic_salary' => $confirmation->from_basic_salary,
            'to_basic_salary' => $confirmation->to_basic_salary,
            'confirmation_date' => $confirmationDate,
            'previous_confirmation_date' => $previousDate ? Carbon::parse($previousDate) : null,
            'created_by' => $actorUserId,
        ]);

        if (! $confirmation->promotion_id && $confirmation->to_salary_grade_id && $confirmation->to_salary_step_id) {
            $promotion = Promotion::create([
                'employee_id' => $employee->id,
                'from_designation_id' => $confirmation->from_designation_id,
                'to_designation_id' => $confirmation->to_designation_id,
                'from_salary_grade_id' => $confirmation->from_salary_grade_id,
                'to_salary_grade_id' => $confirmation->to_salary_grade_id,
                'from_salary_step_id' => $confirmation->from_salary_step_id,
                'to_salary_step_id' => $confirmation->to_salary_step_id,
                'from_basic_salary' => $confirmation->from_basic_salary,
                'to_basic_salary' => $confirmation->to_basic_salary,
                'effective_date' => $confirmationDate,
                'promotion_order_no' => $this->generatePromotionOrderNo(),
                'reason' => $confirmation->reason
                    ? 'Confirmation promotion: '.$confirmation->reason
                    : 'Auto-created from confirmation #'.$confirmation->id,
                'status' => 'completed',
                'approved_by' => $actorUserId,
            ]);

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
                'promotion_date' => $confirmationDate,
                'created_by' => $actorUserId,
            ]);

            $confirmation->promotion_id = $promotion->id;
        }

        $confirmation->status = 'completed';
        $confirmation->save();
    }

    public function syncEmployeeFromConfirmation(Confirmation $confirmation, ?int $toPayscaleId = null): void
    {
        $confirmation->loadMissing(['employee', 'toSalaryGrade']);
        $employee = $confirmation->employee;
        $confirmationDate = $confirmation->confirmation_date
            ? Carbon::parse($confirmation->confirmation_date)
            : now();

        $employee->confirmation_date = $confirmationDate;

        if ($confirmation->to_designation_id) {
            $employee->designation_id = $confirmation->to_designation_id;
        }

        if ($confirmation->to_employee_type_id) {
            $employee->employee_type_id = $confirmation->to_employee_type_id;
            $employee->probation_period_days = 0;
        }

        if ($confirmation->to_salary_grade_id && $confirmation->to_salary_step_id) {
            $employee->payscale_id = $toPayscaleId
                ?: $confirmation->toSalaryGrade?->payscale_id
                ?: Payscale::activeId();
            $employee->salary_grade_id = $confirmation->to_salary_grade_id;
            $employee->salary_step_id = $confirmation->to_salary_step_id;
            $employee->last_promotion_date = $confirmationDate;
        }
    }

    public function activateDueConfirmations(?int $actorUserId = null): int
    {
        $activated = 0;

        Confirmation::query()
            ->where('status', 'approved')
            ->whereDate('confirmation_date', '<=', BangladeshDate::todayString())
            ->orderBy('id')
            ->each(function (Confirmation $confirmation) use ($actorUserId, &$activated) {
                DB::transaction(function () use ($confirmation, $actorUserId, &$activated) {
                    $confirmation->refresh();
                    if ($confirmation->status !== 'approved') {
                        return;
                    }

                    $confirmation->loadMissing('toSalaryGrade');
                    $toPayscaleId = $confirmation->toSalaryGrade?->payscale_id
                        ? (int) $confirmation->toSalaryGrade->payscale_id
                        : Payscale::activeId();

                    $this->apply($confirmation, $actorUserId ?? $confirmation->approved_by, $toPayscaleId);
                    $activated++;
                });
            });

        return $activated;
    }

    private function generatePromotionOrderNo(): string
    {
        $prefix = 'PRO-'.now()->format('Ymd').'-';
        for ($i = 0; $i < 20; $i++) {
            $candidate = $prefix.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            if (! Promotion::query()->where('promotion_order_no', $candidate)->exists()) {
                return $candidate;
            }
        }

        return $prefix.now()->format('His');
    }
}
