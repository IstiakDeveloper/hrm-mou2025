<?php

namespace App\Services\Appraisal;

use App\Models\ConfirmationEvaluation;
use App\Models\PromotionEvaluation;
use App\Models\TraineeEvaluation;
use App\Models\User;
use App\Notifications\ConfirmationEvaluationNotification;
use App\Notifications\ProbationIncrementEvaluationNotification;
use App\Notifications\PromotionEvaluationNotification;
use App\Notifications\TraineeEvaluationNotification;
use App\Support\ActivityLogPresenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EvaluationWorkflowResetService
{
    public function reset(Model $evaluation, User $actor, string $reason): void
    {
        $previousStatus = (string) $evaluation->getAttribute('status');
        $evaluation->loadMissing('employee');

        DB::transaction(function () use ($evaluation, $actor, $reason, $previousStatus): void {
            $evaluation->signatures()->delete();

            foreach ([
                'hr_financial_irregularity',
                'hr_disciplinary_action',
                'hr_audit_objection',
                'hr_leave_without_pay',
                'hr_acr_satisfactory',
            ] as $column) {
                if (Schema::hasColumn($evaluation->getTable(), $column)) {
                    $evaluation->setAttribute($column, null);
                }
            }

            $evaluation->status = 'draft';
            $evaluation->save();

            $properties = ActivityLogPresenter::enrich($evaluation, [
                'attributes' => ['status' => 'draft'],
                'old' => ['status' => $previousStatus],
            ], 'updated');
            $properties['reset_reason'] = $reason;

            activity()
                ->performedOn($evaluation)
                ->causedBy($actor)
                ->event('workflow_reset')
                ->withProperties($properties)
                ->log('Workflow reset: '.$reason);
        });

        $initiator = User::query()->find($evaluation->getAttribute('initiator_id'));
        if ($initiator instanceof User) {
            $initiator->notify($this->notificationFor($evaluation, $reason));
        }
    }

    private function notificationFor(Model $evaluation, string $reason): Notification
    {
        $evaluation->loadMissing('employee');
        $employee = $evaluation->getRelation('employee');
        $name = $employee?->name_bn ?: ($employee?->name_en ?: 'কর্মী');
        $pin = $employee?->pin ? " ({$employee->pin})" : '';
        $id = (int) $evaluation->getKey();

        [$title, $link, $class] = match ($evaluation::class) {
            PromotionEvaluation::class => [
                'পদোন্নতি মূল্যায়ন খসড়ায় ফেরত এসেছে',
                "/promotion-evaluations/{$id}",
                PromotionEvaluationNotification::class,
            ],
            ConfirmationEvaluation::class => [
                'স্থায়ীকরণ মূল্যায়ন খসড়ায় ফেরত এসেছে',
                "/confirmation-evaluations/{$id}",
                ConfirmationEvaluationNotification::class,
            ],
            TraineeEvaluation::class => [
                'প্রশিক্ষণার্থী মূল্যায়ন খসড়ায় ফেরত এসেছে',
                "/trainee-evaluations/{$id}",
                TraineeEvaluationNotification::class,
            ],
            default => [
                'শিক্ষানবিশ ইনক্রিমেন্ট মূল্যায়ন খসড়ায় ফেরত এসেছে',
                "/probation-increment-evaluations/{$id}",
                ProbationIncrementEvaluationNotification::class,
            ],
        };

        $message = "কর্মী {$name}{$pin}-এর মূল্যায়ন সুপার অ্যাডমিন ওয়ার্কফ্লো রিসেট করেছেন। সব স্বাক্ষর মুছে ফাইল আপনার খসড়ায় ফিরেছে। আবার দাখিল করুন। কারণ: {$reason}";

        return new $class($title, $message, 'warning', $link, $id);
    }
}
