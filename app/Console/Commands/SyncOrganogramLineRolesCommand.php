<?php

namespace App\Console\Commands;

use App\Services\OrganogramLineRoleSyncService;
use Illuminate\Console\Command;

class SyncOrganogramLineRolesCommand extends Command
{
    protected $signature = 'organogram:sync-line-roles {--dry-run : Show missing BM/RM/ZM roles without assigning}';

    protected $description = 'Assign Branch Manager, Regional Manager, and Zonal Manager roles from designation (and zone/RO assignment) when missing';

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
            $this->comment('Run without --dry-run to assign the roles.');
        }

        return self::SUCCESS;
    }
}
