<?php

namespace App\Console\Commands;

use App\Services\OrganogramLineRoleSyncService;
use Illuminate\Console\Command;

class SyncOrganogramLineRolesCommand extends Command
{
    protected $signature = 'organogram:sync-line-roles {--dry-run : Show role attach/detach without saving}';

    protected $description = 'Sync organogram roles: assign BM/RM/ZM and HO Department Head from assignment; remove wrongly mapped Microfinance Director/AD roles';

    public function handle(OrganogramLineRoleSyncService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $stats = $service->syncAll($dryRun, function (array $row) {
            $attached = $row['attached'] !== [] ? ' +'.implode(', ', $row['attached']) : '';
            $detached = $row['detached'] !== [] ? ' -'.implode(', ', $row['detached']) : '';
            $primary = $row['primary'] ? ' primary='.$row['primary'] : '';
            $this->line(sprintf(
                'PIN %s (%s) [%s]%s%s%s',
                $row['pin'] !== '' ? $row['pin'] : '—',
                $row['name'],
                $row['designation'] !== '' ? $row['designation'] : 'no designation',
                $attached,
                $detached,
                $primary,
            ));
        });

        $verb = $dryRun ? 'Would update' : 'Updated';
        $this->info(sprintf(
            '%s %d user(s). Unchanged: %d. Skipped: %d.',
            $verb,
            $stats['updated'],
            $stats['unchanged'],
            $stats['skipped'],
        ));

        if ($dryRun && $stats['updated'] > 0) {
            $this->comment('Run without --dry-run to apply the role changes.');
        }

        return self::SUCCESS;
    }
}
