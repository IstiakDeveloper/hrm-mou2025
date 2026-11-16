<?php

namespace App\Console\Commands;

use App\Models\EmployeeLoan;
use App\Services\EmployeeLoanService;
use App\Services\LegacyLoanRebuildService;
use Illuminate\Console\Command;

class ApplyLegacyFlatPfLoansCommand extends Command
{
    protected $signature = 'loans:apply-legacy-flat-pf
                            {--loan= : Specific employee loan ID}
                            {--rebuild : Rebuild schedules from migration snapshots after applying flat}
                            {--force : Run without confirmation}';

    protected $description = 'Force flat calculation for PF loans disbursed before 2025-01-01';

    public function handle(
        EmployeeLoanService $loanService,
        LegacyLoanRebuildService $rebuildService,
    ): int {
        $loanId = $this->option('loan');

        $loans = EmployeeLoan::query()
            ->with('migrationItem')
            ->where('loan_type', 'pf_loan')
            ->whereDate('disbursement_date', '<', EmployeeLoanService::LEGACY_FLAT_PF_CUTOFF)
            ->when($loanId, fn ($q) => $q->whereKey($loanId))
            ->orderBy('id')
            ->get();

        if ($loans->isEmpty()) {
            $this->warn('No pre-2025 PF loans matched the filters.');

            return self::SUCCESS;
        }

        $this->info('Matched '.$loans->count().' pre-2025 PF loan(s).');

        if (! $this->option('force') && ! $this->confirm('Set calculation method to flat for these loans?')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $updatedItems = $loanService->ensureLegacyFlatPfMigrationItems($loans->pluck('id'));
        $clearedModern = $loanService->ensureNoFlatForModernLoans();
        $this->info('Migration items updated to flat: '.count($updatedItems));
        $this->info('2025+ migration items cleared from flat: '.count($clearedModern));

        foreach ($loans as $loan) {
            $method = $loanService->resolveCalculationMethodForLoan($loan);
            $this->line(sprintf(
                '  %s disb=%s method=%s item=%s',
                $loan->loan_number,
                $loan->disbursement_date?->format('Y-m-d') ?? '—',
                $method,
                $loan->migrationItem?->calculation_method ?? 'no item',
            ));
        }

        if ($this->option('rebuild')) {
            if (! $this->option('force') && ! $this->confirm('Rebuild loan schedules from migration snapshots?')) {
                $this->info('Skipped rebuild.');

                return self::SUCCESS;
            }

            $result = $rebuildService->rebuildLoanIds($loans->pluck('id')->all());
            $this->info('Loans rebuilt: '.$result['loans_rebuilt']);
            $this->info('Payroll collections restored: '.$result['payroll_collections_restored']);
        }

        return self::SUCCESS;
    }
}
