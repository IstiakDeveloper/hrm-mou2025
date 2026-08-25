<?php

namespace App\Services;

use App\Models\AdminNotice;
use App\Models\Employee;
use App\Models\Transfer;
use App\Models\TransferHistory;
use App\Models\User;
use App\Notifications\AdminNoticeNotification;
use App\Services\MisLoanFieldOfficerSyncService;
use App\Support\BangladeshDate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class TransferCompletionService
{
    public function shouldApplyImmediately(mixed $effectiveDate): bool
    {
        return BangladeshDate::isDue($effectiveDate);
    }

    public function apply(Transfer $transfer, ?int $actorUserId): void
    {
        if ($transfer->status === 'completed') {
            return;
        }

        $transfer->loadMissing(['employee.user', 'fromBranch', 'toBranch']);
        $employee = $transfer->employee;

        $previousBranchId = $employee->current_branch_id;

        $employee->last_branch_id = $previousBranchId;
        $employee->current_branch_id = $transfer->to_branch_id;

        if ($transfer->to_department_id) {
            $employee->department_id = $transfer->to_department_id;
        }

        if ($transfer->to_designation_id) {
            $employee->designation_id = $transfer->to_designation_id;
        }

        app(EmployeeAssignmentHistoryService::class)->queueContext($employee, [
            'effective_from' => $transfer->effective_date
                ? Carbon::parse($transfer->effective_date)->toDateString()
                : now()->toDateString(),
            'source_type' => \App\Models\EmployeeAssignmentHistory::SOURCE_TRANSFER,
            'source_id' => $transfer->id,
            'created_by' => $actorUserId,
            'notes' => 'Transfer completed',
        ]);

        $employee->save();

        $this->syncUserBranchFromEmployee($employee);

        $freshEmployee = $employee->fresh(['designation', 'branch', 'user']);
        if ($freshEmployee) {
            $misLoanSync = app(MisLoanFieldOfficerSyncService::class);
            $misLoanSync->pushTransfer($freshEmployee);
            if ($misLoanSync->isSyncableDesignation($freshEmployee->designation?->name)) {
                $misLoanSync->pushEmployee($freshEmployee);
            }
        }

        TransferHistory::create([
            'transfer_id' => $transfer->id,
            'employee_id' => $employee->id,
            'from_branch_id' => $transfer->from_branch_id ?? $previousBranchId,
            'to_branch_id' => $transfer->to_branch_id,
            'transfer_date' => $transfer->effective_date
                ? Carbon::parse($transfer->effective_date)->toDateString()
                : now()->toDateString(),
            'created_by' => $actorUserId,
        ]);

        $transfer->status = 'completed';
        $transfer->save();

        app(EmployeeAssignmentHistoryService::class)->rebuildEmployeeHistory($employee);

        $employeeUser = $employee->user;
        if ($employeeUser) {
            $fromName = $transfer->fromBranch?->name ?? '—';
            $toName = $transfer->toBranch?->name ?? '—';
            $effective = $transfer->effective_date
                ? Carbon::parse($transfer->effective_date)->toDateString()
                : now()->toDateString();

            $notice = AdminNotice::create([
                'sender_id' => $actorUserId,
                'title' => 'Transfer update',
                'message' => "You have been transferred from {$fromName} to {$toName}. Effective date: {$effective}.",
                'type' => 'info',
                'link' => url('/transfers/'.$transfer->id),
                'audience' => 'users',
                'user_ids' => [$employeeUser->id],
                'recipient_count' => 1,
                'push_sent' => false,
            ]);

            Notification::send([$employeeUser], new AdminNoticeNotification($notice));
        }
    }

    public function activateDueTransfers(?int $actorUserId = null): int
    {
        $activated = 0;

        Transfer::query()
            ->where('status', 'approved')
            ->whereDate('effective_date', '<=', BangladeshDate::todayString())
            ->orderBy('id')
            ->each(function (Transfer $transfer) use ($actorUserId, &$activated) {
                DB::transaction(function () use ($transfer, $actorUserId, &$activated) {
                    $transfer->refresh();
                    if ($transfer->status !== 'approved') {
                        return;
                    }

                    $this->apply($transfer, $actorUserId ?? $transfer->approved_by);
                    $activated++;
                });
            });

        return $activated;
    }

    public function syncUserBranchFromEmployee(Employee $employee): bool
    {
        $employee->loadMissing('user');
        $user = $employee->user;

        if (! $user || $user->isBranchAccount()) {
            return false;
        }

        $branchId = (int) ($employee->current_branch_id ?: 0);
        if ($branchId <= 0) {
            return false;
        }

        if ((int) ($user->branch_id ?: 0) === $branchId) {
            return false;
        }

        $user->branch_id = $branchId;
        $user->save();

        return true;
    }

    /**
     * Align users.branch_id with employees.current_branch_id for linked staff accounts.
     */
    public function syncAllUserBranchesFromPosting(?callable $onSynced = null): int
    {
        $synced = 0;

        User::query()
            ->whereNotNull('employee_id')
            ->where('account_type', '!=', 'branch')
            ->with('employee')
            ->orderBy('id')
            ->each(function (User $user) use (&$synced, $onSynced) {
                $employee = $user->employee;
                if (! $employee) {
                    return;
                }

                if ($this->syncUserBranchFromEmployee($employee)) {
                    $synced++;
                    if ($onSynced) {
                        $onSynced($user, $employee);
                    }
                }
            });

        return $synced;
    }
}
