<?php

namespace App\Console\Commands;

use App\Services\OrganogramHierarchySyncService;
use Illuminate\Console\Command;

class SyncOrganogramHierarchyCommand extends Command
{
    protected $signature = 'organogram:sync-hierarchy {--dry-run : Show hierarchy changes without saving}';

    protected $description = 'Synchronize entire organogram hierarchy: Zones, Regional Offices, Branch Heads, Employee reporting_to, and User Roles';

    public function handle(OrganogramHierarchySyncService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->warn('--- DRY RUN MODE (No changes will be saved) ---');
        } else {
            $this->info('Starting full organogram hierarchy synchronization...');
        }

        $results = $service->syncAll($dryRun);

        // 1. Zones
        $this->newLine();
        $this->info('=== 1. ZONES ===');
        $zoneUpdated = $results['zones']['updated'];
        foreach ($results['zones']['details'] as $zd) {
            if ($zd['changed']) {
                $this->line(sprintf('  [UPDATED] Zone [%s] %s: %s -> %s', $zd['code'], $zd['name'], $zd['old_manager'], $zd['new_manager']));
            } else {
                $this->line(sprintf('  [OK] Zone [%s] %s: %s', $zd['code'], $zd['name'], $zd['old_manager']));
            }
        }
        $this->comment("Zones: {$zoneUpdated} updated of {$results['zones']['total']} total.");

        // 2. Regional Offices
        $this->newLine();
        $this->info('=== 2. REGIONAL OFFICES ===');
        $roUpdated = $results['regional_offices']['updated'];
        foreach ($results['regional_offices']['details'] as $rd) {
            if ($rd['changed']) {
                $this->line(sprintf('  [UPDATED] RO [%s] %s (%s): %s -> %s', $rd['code'], $rd['name'], $rd['zone'] ?? 'No Zone', $rd['old_manager'], $rd['new_manager']));
            } else {
                $this->line(sprintf('  [OK] RO [%s] %s (%s): %s', $rd['code'], $rd['name'], $rd['zone'] ?? 'No Zone', $rd['old_manager']));
            }
        }
        $this->comment("Regional Offices: {$roUpdated} updated of {$results['regional_offices']['total']} total.");

        // 3. Branches
        $this->newLine();
        $this->info('=== 3. BRANCH HEADS ===');
        $branchUpdated = $results['branches']['updated'];
        foreach ($results['branches']['details'] as $bd) {
            if ($bd['changed']) {
                $this->line(sprintf('  [UPDATED] Branch [%s] %s: %s -> %s', $bd['branch_code'], $bd['name'], $bd['old_head'], $bd['new_head']));
            }
        }
        $this->comment("Branches: {$branchUpdated} updated of {$results['branches']['total']} total.");

        // 4. Employee Reporting Relationships
        $this->newLine();
        $this->info('=== 4. EMPLOYEE REPORTING RELATIONSHIPS (reporting_to) ===');
        $repUpdated = $results['reporting_to']['updated'];
        $repTotal = $results['reporting_to']['total'];
        $repUnchanged = $results['reporting_to']['unchanged'];
        $this->comment("Reporting managers: {$repUpdated} updated, {$repUnchanged} already correct (Total: {$repTotal}).");

        // 5. User Line Roles
        $this->newLine();
        $this->info('=== 5. USER LINE ROLES ===');
        $roleUpdated = $results['roles']['updated'];
        $this->comment("User roles: {$roleUpdated} updated, {$results['roles']['unchanged']} unchanged.");

        // 6. MIS Loan Sync
        if (! $dryRun && isset($results['misloan'])) {
            $this->newLine();
            $this->info('=== 6. MIS LOAN SYNCHRONIZATION ===');
            if ($results['misloan']['success']) {
                $this->info('  [OK] ' . $results['misloan']['message']);
            } else {
                $this->warn('  [NOTICE] ' . $results['misloan']['message']);
            }
        }

        $this->newLine();
        if ($dryRun) {
            $this->warn('DRY RUN complete. Run without --dry-run to apply changes.');
        } else {
            $this->info('Organogram hierarchy synchronization COMPLETED SUCCESSFULLY!');
        }

        return self::SUCCESS;
    }
}
