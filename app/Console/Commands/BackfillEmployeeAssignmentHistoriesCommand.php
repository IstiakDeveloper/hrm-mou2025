<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\EmployeeAssignmentHistoryService;
use App\Services\PayrollRunRecalculateService;
use Illuminate\Console\Command;

class BackfillEmployeeAssignmentHistoriesCommand extends Command
{
    protected $signature = 'payroll:backfill-assignment-histories
                            {--pin= : Comma-separated employee PIN(s) to rebuild history for (e.g. 1095,0886)}
                            {--force : Rebuild all assignment histories (deletes existing history first)}
                            {--recalculate : Automatically recalculate processed payroll runs for the affected employees}';

    protected $description = 'Backfill employee_assignment_histories from HR events and current master data for as-of payroll';

    public function handle(
        EmployeeAssignmentHistoryService $service,
        PayrollRunRecalculateService $recalculateService
    ): int {
        $pinInput = $this->option('pin');

        if ($pinInput) {
            $pins = array_filter(array_map('trim', explode(',', (string) $pinInput)));
            $employees = Employee::query()->whereIn('pin', $pins)->get();

            if ($employees->isEmpty()) {
                $this->error("No employee found matching PIN(s): {$pinInput}");
                return self::FAILURE;
            }

            $this->info("Rebuilding assignment history for " . $employees->count() . " employee(s)...");

            $affectedRunIds = [];
            foreach ($employees as $employee) {
                $created = $service->rebuildEmployeeHistory($employee);
                $this->info("  [✓] PIN: {$employee->pin} (ID: {$employee->id}) - {$created} history rows created.");

                if ($this->option('recalculate')) {
                    $runIds = Payslip::query()
                        ->where('employee_id', $employee->id)
                        ->whereHas('payrollRun', fn ($q) => $q->where('status', 'processed')->where('salary_type', 'salary'))
                        ->pluck('payroll_run_id')
                        ->all();
                    $affectedRunIds = array_merge($affectedRunIds, $runIds);
                }
            }

            if ($this->option('recalculate') && ! empty($affectedRunIds)) {
                $uniqueRunIds = array_unique($affectedRunIds);
                $this->info("Recalculating " . count($uniqueRunIds) . " processed payroll run(s)...");
                foreach ($uniqueRunIds as $runId) {
                    $run = PayrollRun::find($runId);
                    if ($run) {
                        $recalculateService->recalculate($run);
                        $this->info("  [✓] Recalculated Payroll Run #{$run->id} (Month {$run->month}/{$run->year}, Branch {$run->branch_id})");
                    }
                }
            }

            $this->newLine();
            $this->info("Done! Assignment history successfully synchronized.");
            return self::SUCCESS;
        }

        if ($this->option('force')) {
            if (! $this->input->isInteractive() || $this->confirm('This will delete ALL employee_assignment_histories and rebuild. Continue?')) {
                EmployeeAssignmentHistory::query()->delete();
                $this->warn('Existing assignment histories cleared.');
            } else {
                return self::SUCCESS;
            }
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
