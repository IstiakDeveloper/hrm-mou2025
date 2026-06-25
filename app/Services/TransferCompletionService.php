<?php

namespace App\Services;

use App\Models\AdminNotice;
use App\Models\Transfer;
use App\Models\TransferHistory;
use App\Notifications\AdminNoticeNotification;
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

        $employee->save();

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
}
