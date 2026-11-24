<?php

namespace App\Console\Commands;

use App\Services\MisLoanOrganizationSyncService;
use Illuminate\Console\Command;

class SyncMisLoanOrganizationCommand extends Command
{
    protected $signature = 'misloan:sync-organization';

    protected $description = 'Push full organization hierarchy (Zones, Areas, Branches, and Managers) from HRM to MIS Loan';

    public function handle(MisLoanOrganizationSyncService $service): int
    {
        $this->info('Pushing organization structure and seat users to MIS Loan...');

        $result = $service->pushOrganization('artisan_command');

        if ($result['success']) {
            $this->info('MIS Loan organization sync COMPLETED SUCCESSFULLY!');
            if (isset($result['data']['stats'])) {
                $stats = $result['data']['stats'];
                $this->line(sprintf('  Zones: %d updated, %d created', $stats['zones']['updated'] ?? 0, $stats['zones']['created'] ?? 0));
                $this->line(sprintf('  Areas: %d updated, %d created', $stats['areas']['updated'] ?? 0, $stats['areas']['created'] ?? 0));
                $this->line(sprintf('  Branches: %d updated, %d created', $stats['branches']['updated'] ?? 0, $stats['branches']['created'] ?? 0));
                $this->line(sprintf('  Seat Users: %d updated, %d created', $stats['users']['updated'] ?? 0, $stats['users']['created'] ?? 0));
            }

            return self::SUCCESS;
        }

        $this->error('MIS Loan sync failed: ' . $result['message']);

        return self::FAILURE;
    }
}
