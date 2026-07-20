<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\TransferCompletionService;
use Illuminate\Console\Command;

class SyncUserBranchesFromPostingCommand extends Command
{
    protected $signature = 'users:sync-branch-from-posting {--dry-run : Show mismatches without updating}';

    protected $description = 'Align users.branch_id with employees.current_branch_id for staff accounts';

    public function handle(TransferCompletionService $transferCompletionService): int
    {
        if ($this->option('dry-run')) {
            $count = 0;

            User::query()
                ->whereNotNull('employee_id')
                ->where('account_type', '!=', 'branch')
                ->whereHas('employee', function ($query) {
                    $query->whereNotNull('current_branch_id')
                        ->whereColumn('users.branch_id', '!=', 'employees.current_branch_id');
                })
                ->with(['employee:id,pin,name_en,current_branch_id', 'branch:id,name'])
                ->orderBy('id')
                ->each(function ($user) use (&$count) {
                    $count++;
                    $employee = $user->employee;
                    $this->line(sprintf(
                        'PIN %s (%s): user branch %s -> employee posting %s',
                        $employee->pin ?? '—',
                        $employee->name_en ?? $user->name,
                        $user->branch?->name ?? (string) $user->branch_id,
                        $employee->current_branch_id
                    ));
                });

            $this->info("Would sync {$count} user(s). Run without --dry-run to apply.");

            return self::SUCCESS;
        }

        $synced = $transferCompletionService->syncAllUserBranchesFromPosting(
            function ($user, $employee) {
                $this->line(sprintf(
                    'Synced PIN %s (%s) -> branch_id %s',
                    $employee->pin ?? '—',
                    $employee->name_en ?? $user->name,
                    $employee->current_branch_id
                ));
            }
        );

        $this->info("Synced {$synced} user branch(es) from employee posting.");

        return self::SUCCESS;
    }
}
