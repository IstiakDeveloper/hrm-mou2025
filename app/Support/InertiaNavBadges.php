<?php

namespace App\Support;

use App\Models\LeaveApplication;
use App\Models\User;
use App\Services\Appraisal\AppraisalPendingCountService;
use App\Services\FinalClearanceService;
use App\Services\LogBookPaymentWorkflowService;
use App\Services\MotorcycleLoanApplicationService;
use App\Services\OrganogramAccessService;
use Illuminate\Support\Facades\Cache;

class InertiaNavBadges
{
    public const TTL_SECONDS = 45;

    /**
     * @return array{
     *     pendingLeaveCount: int,
     *     pendingAppraisalCounts: array{promotion: int, confirmation: int, probation_increment: int, trainee: int, total: int},
     *     pendingFinalClearanceCount: int,
     *     pendingMotorcycleLoanCount: int,
     *     canIssueSecondMotorcycleLoan: bool,
     *     pendingLogBookPaymentCount: int
     * }
     */
    public static function forUser(User $user): array
    {
        if (app()->runningUnitTests()) {
            return self::compute($user);
        }

        return Cache::remember(self::key($user->id), self::TTL_SECONDS, fn () => self::compute($user));
    }

    public static function forget(?int $userId): void
    {
        if ($userId) {
            Cache::forget(self::key($userId));
        }
    }

    private static function key(int $userId): string
    {
        return 'inertia:nav-badges:v1:'.$userId;
    }

    /**
     * @return array{
     *     pendingLeaveCount: int,
     *     pendingAppraisalCounts: array{promotion: int, confirmation: int, probation_increment: int, trainee: int, total: int},
     *     pendingFinalClearanceCount: int,
     *     pendingMotorcycleLoanCount: int,
     *     canIssueSecondMotorcycleLoan: bool,
     *     pendingLogBookPaymentCount: int
     * }
     */
    private static function compute(User $user): array
    {
        $leaveQuery = LeaveApplication::query()->where('status', 'pending');
        OrganogramAccessService::constrainLeaveApplications($leaveQuery, $user);

        $pendingFinalClearanceCount = 0;
        if (CachedSchema::hasTable('final_clearances')) {
            $pendingFinalClearanceCount = app(FinalClearanceService::class)->pendingCount($user);
        }

        $pendingMotorcycleLoanCount = 0;
        $canIssueSecondMotorcycleLoan = false;
        if (CachedSchema::hasTable('loan_applications') && $user->canAccessSection('employee-loan')) {
            $motorcycleLoans = app(MotorcycleLoanApplicationService::class);
            $pendingMotorcycleLoanCount = $motorcycleLoans->pendingCount($user);
            $canIssueSecondMotorcycleLoan = $motorcycleLoans->canIssueSecondLoan($user);
        }

        $pendingLogBookPaymentCount = 0;
        if (CachedSchema::hasTable('movement_log_book_payments') && $user->hasPermission('movements.view')) {
            $pendingLogBookPaymentCount = app(LogBookPaymentWorkflowService::class)->pendingCount($user);
        }

        return [
            'pendingLeaveCount' => $leaveQuery->count(),
            'pendingAppraisalCounts' => app(AppraisalPendingCountService::class)->countsFor($user),
            'pendingFinalClearanceCount' => $pendingFinalClearanceCount,
            'pendingMotorcycleLoanCount' => $pendingMotorcycleLoanCount,
            'canIssueSecondMotorcycleLoan' => $canIssueSecondMotorcycleLoan,
            'pendingLogBookPaymentCount' => $pendingLogBookPaymentCount,
        ];
    }
}
