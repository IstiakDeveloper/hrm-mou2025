<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Services\EmployeeAssignmentHistoryService;
use Illuminate\Console\Command;

class BackfillEmployeeAssignmentHistoriesCommand extends Command
{
    protected $signature = 'payroll:backfill-assignment-histories
                            {--force : Rebuild even when rows already exist (deletes existing history first)}';

    protected $description = 'Backfill employee_assignment_histories from HR events and current master data for as-of payroll';

    public function handle(EmployeeAssignmentHistoryService $service): int
    {
        if ($this->option('force')) {
            if (! $this->confirm('This will delete ALL employee_assignment_histories and rebuild. Continue?')) {
                return self::SUCCESS;
            }

            EmployeeAssignmentHistory::query()->delete();
            $this->warn('Existing assignment histories cleared.');
        }

        $total = Employee::query()->count();
        $this->info("Backfilling assignment histories for {$total} employee(s)…");

        $bar = $this->output->createProgressBar(max(1, $total));
        $bar->start();

        $stats = $service->backfillAll(function () use ($bar) {
            $bar->advance();
        });

        $bar->finish();
        $this->newLine(2);

        $this->info("Employees scanned: {$stats['employees']}");
        $this->info("History rows created: {$stats['rows']}");
        $this->info("Employees skipped (already had history): {$stats['skipped']}");

        return self::SUCCESS;
    }
}
