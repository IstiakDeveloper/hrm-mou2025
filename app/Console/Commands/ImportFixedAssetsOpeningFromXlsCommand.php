<?php

namespace App\Console\Commands;

use App\Services\FixedAssetOpeningFromXlsService;
use Illuminate\Console\Command;

class ImportFixedAssetsOpeningFromXlsCommand extends Command
{
    protected $signature = 'fixed-assets:import-opening
                            {--path= : Absolute or project-relative XLS path (default: data/excel/FixedAssets.xls)}
                            {--dry-run : Parse and validate only; no database writes}
                            {--fresh : Soft-delete existing MOU-/COAST- assets before import}';

    protected $description = 'Import FY 2025-26 closing / 2026-27 opening fixed assets from FixedAssets.xls (branch sheets).';

    public function handle(FixedAssetOpeningFromXlsService $service): int
    {
        $pathOpt = $this->option('path');
        $dryRun = (bool) $this->option('dry-run');
        $fresh = (bool) $this->option('fresh');

        $path = null;
        if (is_string($pathOpt) && trim($pathOpt) !== '') {
            $path = str_starts_with($pathOpt, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:[/\\\\]#', $pathOpt)
                ? $pathOpt
                : base_path($pathOpt);
        }

        try {
            $result = $service->run($path, $dryRun, $fresh);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Created: '.$result['created'].($dryRun ? ' (dry-run)' : ''));
        $this->info('Skipped existing: '.$result['skipped_existing']);
        $this->info('Errors: '.$result['skipped_error']);
        $this->info('Parse warnings: '.count($result['parse_warnings']));

        $v = $result['verification'];
        $this->line('XLS count / purchase / book / accum: '
            .($v['xlsx_count'] ?? 0).' / '
            .number_format((float) ($v['xlsx_purchase_total'] ?? 0), 2).' / '
            .number_format((float) ($v['xlsx_book_total'] ?? 0), 2).' / '
            .number_format((float) ($v['xlsx_accum_total'] ?? 0), 2));

        if (! $dryRun) {
            $this->line('DB count / purchase / book / accum: '
                .($v['db_count'] ?? 0).' / '
                .number_format((float) ($v['db_purchase_total'] ?? 0), 2).' / '
                .number_format((float) ($v['db_book_total'] ?? 0), 2).' / '
                .number_format((float) ($v['db_accum_total'] ?? 0), 2));
            $this->line('Branches with assets: '.($v['branches_with_assets'] ?? 0));

            if ($v['perfect'] ?? false) {
                $this->info('Verification: PERFECT — DB totals match spreadsheet.');
            } else {
                $this->warn('Verification: review log — mismatch or incomplete.');
            }
        } else {
            $this->warn('Dry run: no database changes were written.');
        }

        if (($result['errors'] ?? []) !== []) {
            $this->warn('First errors:');
            foreach (array_slice($result['errors'], 0, 15) as $error) {
                $this->line('  - '.$error);
            }
        }

        $this->info('Log: '.$result['log_path']);

        return ($result['skipped_error'] ?? 0) > 0 ? self::FAILURE : self::SUCCESS;
    }
}
