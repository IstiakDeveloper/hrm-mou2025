<?php

namespace App\Services\Mobile;

use App\Models\ConfirmationEvaluation;
use App\Models\LoanApplication;
use App\Models\MovementLogBook;
use App\Models\MovementLogBookPayment;
use App\Models\ProbationIncrementEvaluation;
use App\Models\PromotionEvaluation;
use App\Models\TraineeEvaluation;
use App\Models\User;
use App\Services\Appraisal\AppraisalPendingCountService;
use App\Services\ConfirmationEvaluationWorkflowService;
use App\Services\LoanApplicationService;
use App\Services\LogBookPaymentWorkflowService;
use App\Services\ProbationIncrementWorkflowService;
use App\Services\PromotionEvaluationWorkflowService;
use App\Services\TraineeWorkflowService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MobileApprovalsService
{
    public function __construct(
        private readonly AppraisalPendingCountService $appraisals,
        private readonly LogBookPaymentWorkflowService $logBooks,
        private readonly LoanApplicationService $loans,
        private readonly PromotionEvaluationWorkflowService $promotion,
        private readonly ConfirmationEvaluationWorkflowService $confirmation,
        private readonly ProbationIncrementWorkflowService $probation,
        private readonly TraineeWorkflowService $trainee,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function reviewTasks(User $user): array
    {
        $rows = [];

        foreach ($this->appraisals->pendingItems($user) as $item) {
            if (($item['status'] ?? '') === 'draft') {
                continue;
            }
            $rows[] = $item;
        }

        foreach ($this->logBooks->pendingActionablePayments($user) as $payment) {
            $rows[] = $this->logBookRow($user, $payment);
        }

        if ($user->hasPermission('employee-loan.edit') || $user->isSuperAdmin()) {
            $applications = LoanApplication::query()
                ->with(['employee:id,pin,name_en', 'policy:id,name,loan_type'])
                ->where('status', 'pending')
                ->when($user->employee_id, fn ($q) => $q->where('employee_id', '!=', $user->employee_id))
                ->orderByDesc('id')
                ->limit(40)
                ->get();

            foreach ($applications as $application) {
                $rows[] = $this->loanRow($application, true);
            }
        }

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function mineTasks(User $user): array
    {
        if (! $user->employee_id) {
            return [];
        }

        $rows = [];

        $payments = MovementLogBookPayment::query()
            ->where('employee_id', $user->employee_id)
            ->whereIn('status', ['pending', 'recommended'])
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        foreach ($payments as $payment) {
            $rows[] = [
                'module' => 'logbook',
                'id' => $payment->id,
                'title' => 'Log book payment',
                'subtitle' => $payment->periodLabel().' · '.$payment->total_amount,
                'status' => $payment->status,
                'can_act' => false,
            ];
        }

        $applications = LoanApplication::query()
            ->with('policy:id,name')
            ->where('employee_id', $user->employee_id)
            ->whereIn('status', ['pending', 'draft'])
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        foreach ($applications as $application) {
            $rows[] = $this->loanRow($application, false);
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function actAppraisal(User $user, string $kind, int $id, array $input): array
    {
        if (! $user->hasSignature()) {
            throw ValidationException::withMessages([
                'signature' => ['Approve করার আগে ওয়েব প্রোফাইলে ডিজিটাল স্বাক্ষর আপলোড করুন।'],
            ]);
        }

        $comments = trim((string) ($input['comments'] ?? ''));
        if ($comments === '') {
            throw ValidationException::withMessages(['comments' => ['মন্তব্য লিখুন।']]);
        }

        $evaluation = $this->findAppraisal($kind, $id);
        $workflow = $this->workflow($kind);

        if (! $workflow->canUserReview($user, $evaluation)) {
            throw ValidationException::withMessages(['appraisal' => ['এই স্তরে আপনার অনুমতি নেই।']]);
        }

        if ($evaluation->status === 'submitted_to_hr') {
            throw ValidationException::withMessages([
                'appraisal' => ['HR checklist ওয়েব থেকে সম্পন্ন করতে হবে।'],
            ]);
        }

        if ($evaluation->status === 'submitted_to_ed' && method_exists($workflow, 'edApprove')) {
            $workflow->edApprove($evaluation, $user, $comments, (bool) ($input['approved'] ?? true));

            return ['ok' => true, 'status' => $evaluation->fresh()->status];
        }

        $recommendation = (string) ($input['recommendation_status'] ?? 'recommended');
        $workflow->forward($evaluation, $user, $comments, $recommendation);

        return ['ok' => true, 'status' => $evaluation->fresh()->status];
    }

    /**
     * @return array<string, mixed>
     */
    public function actLogBook(User $user, MovementLogBookPayment $payment, string $action, ?string $remarks): array
    {
        if (! $user->hasSignature()) {
            throw ValidationException::withMessages([
                'signature' => ['Approve করার আগে ওয়েব প্রোফাইলে ডিজিটাল স্বাক্ষর আপলোড করুন।'],
            ]);
        }

        if ($action === 'recommend') {
            if (! $this->logBooks->userCanRecommend($user, $payment)) {
                throw ValidationException::withMessages(['payment' => ['আপনি এই পেমেন্ট recommend করতে পারবেন না।']]);
            }
            $payment->update([
                'status' => 'recommended',
                'recommended_by' => $user->id,
                'recommended_at' => now(),
                'recommendation_remarks' => $remarks,
            ]);

            return ['ok' => true, 'status' => 'recommended'];
        }

        if (! $this->logBooks->userCanApprove($user, $payment)) {
            throw ValidationException::withMessages(['payment' => ['আপনি এই পেমেন্ট approve করতে পারবেন না।']]);
        }

        $voucher = sprintf(
            '%s-%04d-%02d-%05d',
            config('movement_log_book.voucher_prefix', 'LB'),
            $payment->period_year,
            $payment->period_month,
            $payment->id
        );

        DB::transaction(function () use ($payment, $user, $remarks, $voucher) {
            $payment->update([
                'status' => 'approved',
                'voucher_no' => $voucher,
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_remarks' => $remarks,
            ]);
            MovementLogBook::where('log_book_payment_id', $payment->id)
                ->update(['payment_status' => 'paid']);
        });

        return ['ok' => true, 'status' => 'approved', 'voucher_no' => $voucher];
    }

    /**
     * @return array<string, mixed>
     */
    public function actLoan(User $user, LoanApplication $application, string $action, ?string $reason): array
    {
        if (! $user->hasPermission('employee-loan.edit') && ! $user->isSuperAdmin()) {
            throw ValidationException::withMessages(['loan' => ['Loan approval permission নেই।']]);
        }

        if ($action === 'reject') {
            if ($reason === null || trim($reason) === '') {
                throw ValidationException::withMessages(['reason' => ['Reject reason লিখুন।']]);
            }
            $this->loans->reject($application, trim($reason), $user->id);

            return ['ok' => true, 'status' => 'rejected'];
        }

        $this->loans->approve($application, $user->id);

        return ['ok' => true, 'status' => $application->fresh()->status];
    }

    private function findAppraisal(string $kind, int $id): PromotionEvaluation|ConfirmationEvaluation|ProbationIncrementEvaluation|TraineeEvaluation
    {
        $model = match ($kind) {
            'promotion' => PromotionEvaluation::query()->find($id),
            'confirmation' => ConfirmationEvaluation::query()->find($id),
            'probation_increment' => ProbationIncrementEvaluation::query()->find($id),
            'trainee' => TraineeEvaluation::query()->find($id),
            default => null,
        };

        if (! $model) {
            throw ValidationException::withMessages(['appraisal' => ['Appraisal পাওয়া যায়নি।']]);
        }

        return $model;
    }

    private function workflow(string $kind): PromotionEvaluationWorkflowService|ConfirmationEvaluationWorkflowService|ProbationIncrementWorkflowService|TraineeWorkflowService
    {
        return match ($kind) {
            'promotion' => $this->promotion,
            'confirmation' => $this->confirmation,
            'probation_increment' => $this->probation,
            'trainee' => $this->trainee,
            default => throw ValidationException::withMessages(['appraisal' => ['Unknown appraisal type.']]),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function logBookRow(User $user, MovementLogBookPayment $payment): array
    {
        $employee = $payment->employee;
        $canRecommend = $this->logBooks->userCanRecommend($user, $payment);
        $canApprove = $this->logBooks->userCanApprove($user, $payment);

        return [
            'module' => 'logbook',
            'id' => $payment->id,
            'title' => 'Log book payment',
            'subtitle' => trim(($employee?->pin ? $employee->pin.' — ' : '').($employee?->name_en ?? '')).' · '.$payment->periodLabel(),
            'status' => $payment->status,
            'amount' => (string) $payment->total_amount,
            'can_recommend' => $canRecommend,
            'can_approve' => $canApprove,
            'can_act' => $canRecommend || $canApprove,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function loanRow(LoanApplication $application, bool $review): array
    {
        $employee = $application->employee;

        return [
            'module' => 'loan',
            'id' => $application->id,
            'title' => 'Employee loan'.($application->policy?->name ? ' · '.$application->policy->name : ''),
            'subtitle' => $review
                ? trim(($employee?->pin ? $employee->pin.' — ' : '').($employee?->name_en ?? '')).' · '.$application->applied_amount
                : (string) $application->applied_amount,
            'status' => $application->status,
            'can_act' => $review,
        ];
    }
}
