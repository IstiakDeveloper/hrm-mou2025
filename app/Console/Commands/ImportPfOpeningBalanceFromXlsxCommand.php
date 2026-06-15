<?php

namespace App\Console\Commands;

use App\Services\PfOpeningBalanceFromXlsxService;
use Illuminate\Console\Command;

class ImportPfOpeningBalanceFromXlsxCommand extends Command
{
    protected $signature = 'pf:import-opening-balance
                            {--path= : Absolute or project-relative XLSX path (default: data/excel/pf.xlsx)}
                            {--dry-run : Parse and log only; no database writes}';

    protected $description = 'Post legacy PF opening balances from PIN-keyed spreadsheet (pf.xlsx).';

    public function handle(PfOpeningBalanceFromXlsxService $service): int
    {
        $pathOpt = $this->option('path');
        $dryRun = (bool) $this->option('dry-run');

        $path = null;
        if (is_string($pathOpt) && trim($pathOpt) !== '') {
            $path = str_starts_with($pathOpt, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:[/\\\\]#', $pathOpt)
                ? $pathOpt
                : base_path($pathOpt);
        }

        try {
            $result = $service->run($path, $dryRun);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Posted: '.$result['posted']);
        $this->info('Skipped (empty PIN): '.$result['skipped_empty_pin']);
        $this->info('Skipped (summary row): '.$result['skipped_summary_row']);
        $this->info('Skipped (zero amount): '.$result['skipped_zero_amount']);
        $this->info('Skipped (employee not found): '.$result['skipped_employee_not_found']);
        $this->info('Skipped (opening already posted): '.$result['skipped_already_posted']);
        $this->info('Skipped (own+org vs total mismatch): '.$result['skipped_amount_mismatch']);
        $this->info('PINs appearing more than once in spreadsheet: '.$result['duplicate_pins_in_xlsx']);

        $verification = $result['verification'];
        if ($dryRun) {
            $this->warn('Dry run: no database changes were written.');
            $this->line('XLSX totals — Own: '.number_format((float) $verification['xlsx_own_total'], 0)
                .', Org: '.number_format((float) $verification['xlsx_org_total'], 0)
                .', Grand: '.number_format((float) $verification['xlsx_grand_total'], 0));
        } else {
            $perfect = $verification['perfect'] ?? false;
            if ($perfect) {
                $this->info('Verification: PERFECT — database totals match spreadsheet.');
            } else {
                $this->warn('Verification: MISMATCH — review log for details.');
                $this->line('XLSX grand total: '.number_format((float) ($verification['xlsx_grand_total'] ?? 0), 0));
                $this->line('DB opening grand total: '.number_format((float) ($verification['db_opening_grand_total'] ?? 0), 0));
                $this->line('DB employee pf_balance sum: '.number_format((float) ($verification['db_employee_pf_balance_total'] ?? 0), 0));
            }
        }

        $this->info('Log: '.$result['log_path']);

        return self::SUCCESS;
    }
}
