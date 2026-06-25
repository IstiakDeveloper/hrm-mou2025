<?php

namespace App\Console\Commands;

use App\Models\EmployeeLoanInstallment;
use App\Services\LegacyLoanRebuildService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RebuildLegacyLoanSchedulesCommand extends Command
{
    protected $signature = 'loans:rebuild-legacy-schedules
                            {--dry-run : Preview rebuild without writing to the database}
                            {--force : Run without confirmation}';

    protected $description = 'Rebuild legacy loan schedules from migration snapshots (fixes duplicate months, keeps June collections)';

    public function handle(LegacyLoanRebuildService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->warn('Dry run — no database changes will be written.');
        } elseif (! $this->option('force') && ! $this->confirm('Rebuild all legacy loan schedules from migration data?')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $result = $service->rebuildAll($dryRun);

        $this->info('Loans rebuilt: '.$result['loans_rebuilt']);
        $this->info('June collections restored: '.$result['june_collections_restored']);

        if (! $dryRun) {
            $duplicateGroups = DB::table('employee_loan_installments')
                ->select('employee_loan_id', 'due_date')
                ->groupBy('employee_loan_id', 'due_date')
                ->havingRaw('COUNT(*) > 1')
                ->count();

            $juneLegacyPaid = EmployeeLoanInstallment::query()
                ->where('status', 'paid')
                ->whereYear('due_date', 2026)
                ->whereMonth('due_date', 6)
                ->whereHas('loan', fn ($q) => $q->where('is_legacy_import', true))
                ->whereDoesntHave('loan.transactions', fn ($q) => $q
                    ->whereIn('transaction_type', ['collection', 'manual_payment', 'advance_collection'])
                    ->whereYear('transaction_date', 2026)
                    ->whereMonth('transaction_date', 6))
                ->count();

            $this->info('Duplicate due-date groups: '.$duplicateGroups);
            $this->info('June 2026 legacy-paid (excluding restored collections): '.$juneLegacyPaid);
        }

        return self::SUCCESS;
    }
}
