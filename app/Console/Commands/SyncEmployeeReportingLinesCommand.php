<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Services\EmployeeReportingToService;
use Illuminate\Console\Command;

class SyncEmployeeReportingLinesCommand extends Command
{
    protected $signature = 'employee:sync-reporting-lines
                            {--pin= : Sync for a specific employee by PIN}
                            {--all : Include inactive/past employees as well}
                            {--dry-run : Simulate and preview changes without modifying database}';

    protected $description = 'Automatically resolve and sync employee reporting_to lines according to department head, branch head, organogram hierarchy, and executive director';

    public function handle(EmployeeReportingToService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $activeOnly = ! $this->option('all');
        $pin = $this->option('pin');

        if ($dryRun) {
            $this->warn('Running in DRY-RUN mode. No database records will be altered.');
        }

        if ($pin) {
            $emp = Employee::query()->where('pin', $pin)->first();
            if (! $emp) {
                $this->error("Employee with PIN '{$pin}' not found.");

                return self::FAILURE;
            }

            $oldManagerId = $emp->reporting_to;
            $oldManager = $oldManagerId ? Employee::query()->find($oldManagerId) : null;
            $newManager = $service->resolveReportingManager($emp);

            $this->info("Employee: [{$emp->pin}] {$emp->name_en}");
            $this->line("Branch: " . ($emp->branch?->name ?? 'N/A') . " | Designation: " . ($emp->designation?->name ?? 'N/A') . " | Department: " . ($emp->department?->name ?? 'N/A'));
            $this->line("Previous Reporting To: " . ($oldManager ? "[{$oldManager->pin}] {$oldManager->name_en}" : 'None'));
            $this->line("Resolved Reporting To: " . ($newManager ? "[{$newManager->pin}] {$newManager->name_en}" : 'None'));

            if (! $dryRun) {
                $emp->reporting_to = $newManager?->id;
                $emp->saveQuietly();
                $this->info("Successfully updated reporting line for PIN {$emp->pin}.");
            } else {
                $this->comment("Dry-run complete: PIN {$emp->pin} would be set to " . ($newManager ? "[{$newManager->pin}] {$newManager->name_en}" : 'None'));
            }

            return self::SUCCESS;
        }

        $this->info('Starting automatic reporting lines synchronization...');

        $changedList = [];
        $res = $service->syncAll($dryRun, $activeOnly, function (array $detail) use (&$changedList) {
            if ($detail['changed']) {
                $changedList[] = [
                    $detail['pin'],
                    $detail['name'],
                    $detail['branch'] ?? '—',
                    $detail['designation'] ?? '—',
                    $detail['old_manager'],
                    $detail['new_manager'],
                ];
            }
        });

        if (! empty($changedList)) {
            $this->table(
                ['PIN', 'Employee', 'Branch', 'Designation', 'Old Manager', 'New Auto Manager'],
                array_slice($changedList, 0, 30)
            );

            if (count($changedList) > 30) {
                $this->line('... and ' . (count($changedList) - 30) . ' more updated employees.');
            }
        }

        $verb = $dryRun ? 'Would update' : 'Successfully updated';
        $this->info(sprintf(
            '%s: %d employee(s). Unchanged: %d. Total processed: %d.',
            $verb,
            $res['updated'],
            $res['unchanged'],
            $res['total']
        ));

        if ($dryRun && $res['updated'] > 0) {
            $this->comment('Execute without --dry-run to commit these changes to the database:');
            $this->comment('php artisan employee:sync-reporting-lines');
        }

        return self::SUCCESS;
    }
}
