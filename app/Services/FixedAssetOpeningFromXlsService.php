<?php

namespace App\Services;

use App\Models\AssetCategory;
use App\Models\AssetSubCategory;
use App\Models\Branch;
use App\Models\FixedAsset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/**
 * Import FY 2025-26 closing / 2026-27 opening balances from FixedAssets.xls.
 */
class FixedAssetOpeningFromXlsService
{
    private const DEFAULT_XLS = 'data/excel/FixedAssets.xls';

    private const AS_OF_DATE = '2026-07-01';

    private const LAST_DEPRECIATION_DATE = '2026-06-30';

    /**
     * @return array{
     *     created: int,
     *     skipped_existing: int,
     *     skipped_error: int,
     *     dry_run: bool,
     *     log_path: string,
     *     verification: array<string, mixed>,
     *     parse_warnings: list<string>
     * }
     */
    public function run(?string $xlsAbsolutePath = null, bool $dryRun = false, bool $fresh = false): array
    {
        $absPath = $xlsAbsolutePath ?? base_path(self::DEFAULT_XLS);
        if (! is_readable($absPath)) {
            throw new InvalidArgumentException('XLS not readable: '.$absPath);
        }

        $payload = $this->parseViaPython($absPath);
        $rows = $payload['rows'] ?? [];
        if (! is_array($rows) || $rows === []) {
            throw new RuntimeException('No asset rows parsed from spreadsheet.');
        }

        $log = [];
        $log[] = 'Fixed asset opening import';
        $log[] = 'Source: '.$absPath;
        $log[] = 'As-of (2026-27 opening): '.self::AS_OF_DATE;
        $log[] = 'Last depreciation date: '.self::LAST_DEPRECIATION_DATE;
        $log[] = 'Parsed rows: '.count($rows);
        $log[] = 'Dry run: '.($dryRun ? 'yes' : 'no');
        $log[] = 'Fresh: '.($fresh ? 'yes' : 'no');
        $log[] = str_repeat('-', 72);

        $parseWarnings = array_values(array_filter(
            $payload['warnings'] ?? [],
            static fn ($w) => is_string($w) && $w !== ''
        ));
        foreach ($parseWarnings as $warning) {
            $log[] = 'PARSE WARN: '.$warning;
        }

        $branchesByName = Branch::query()
            ->get(['id', 'name', 'branch_code'])
            ->keyBy(fn (Branch $b) => Str::lower(trim($b->name)));

        $categoriesByName = AssetCategory::query()
            ->where('is_active', true)
            ->get()
            ->keyBy(fn (AssetCategory $c) => Str::lower(trim($c->name)));

        $subCategoriesByCode = AssetSubCategory::query()
            ->with('category:id,code,name,depreciation_method,depreciation_rate,default_useful_life_years')
            ->where('is_active', true)
            ->get()
            ->keyBy(fn (AssetSubCategory $s) => Str::upper(trim((string) $s->code)));

        $created = 0;
        $skippedExisting = 0;
        $skippedError = 0;
        $xlsxPurchase = 0.0;
        $xlsxBook = 0.0;
        $xlsxAccum = 0.0;
        $errors = [];

        $existingTags = FixedAsset::withTrashed()
            ->pluck('asset_tag')
            ->map(fn ($t) => Str::upper((string) $t))
            ->flip();

        if ($fresh && ! $dryRun) {
            $deleted = FixedAsset::withTrashed()
                ->where(function ($q) {
                    $q->where('asset_tag', 'like', 'MOU-%')
                        ->orWhere('asset_tag', 'like', 'COAST-%')
                        ->orWhere('manual_asset_code', 'like', 'MOU-%')
                        ->orWhere('manual_asset_code', 'like', 'COAST-%');
                })
                ->forceDelete();
            $log[] = "Fresh: force-deleted {$deleted} prior MOU/COAST asset(s).";
            $existingTags = FixedAsset::withTrashed()
                ->pluck('asset_tag')
                ->map(fn ($t) => Str::upper((string) $t))
                ->flip();
        }

        $inserts = [];

        foreach ($rows as $index => $row) {
            if (! is_array($row)) {
                $skippedError++;
                $errors[] = 'Row '.($index + 1).': invalid payload';

                continue;
            }

            $tag = trim((string) ($row['asset_tag'] ?? ''));
            $sheet = (string) ($row['sheet'] ?? '?');
            $excelRow = (int) ($row['excel_row'] ?? 0);
            $branchName = trim((string) ($row['branch_name'] ?? ''));
            $categoryName = trim((string) ($row['category_name'] ?? ''));
            $subCode = Str::upper(trim((string) ($row['sub_code'] ?? '')));
            $purchaseCost = round((float) ($row['purchase_cost'] ?? 0), 2);
            $bookValue = round((float) ($row['book_value'] ?? 0), 2);
            $accum = round((float) ($row['accumulated_depreciation'] ?? 0), 2);
            $purchaseDate = $row['purchase_date'] ?? null;

            $xlsxPurchase += $purchaseCost;
            $xlsxBook += $bookValue;
            $xlsxAccum += $accum;

            if ($tag === '') {
                $skippedError++;
                $msg = "{$sheet}!R{$excelRow}: empty asset tag";
                $errors[] = $msg;
                $log[] = 'ERROR: '.$msg;

                continue;
            }

            if (isset($existingTags[Str::upper($tag)])) {
                $skippedExisting++;
                $log[] = "SKIP existing: {$tag}";

                continue;
            }

            $branch = $branchesByName[Str::lower($branchName)] ?? null;
            if (! $branch) {
                $skippedError++;
                $msg = "{$sheet}!R{$excelRow} {$tag}: branch not found ({$branchName})";
                $errors[] = $msg;
                $log[] = 'ERROR: '.$msg;

                continue;
            }

            $category = $categoriesByName[Str::lower($categoryName)] ?? null;
            if (! $category) {
                $skippedError++;
                $msg = "{$sheet}!R{$excelRow} {$tag}: category not found ({$categoryName})";
                $errors[] = $msg;
                $log[] = 'ERROR: '.$msg;

                continue;
            }

            $sub = $subCategoriesByCode[$subCode] ?? null;
            if (! $sub) {
                $skippedError++;
                $msg = "{$sheet}!R{$excelRow} {$tag}: sub-category code not found ({$subCode})";
                $errors[] = $msg;
                $log[] = 'ERROR: '.$msg;

                continue;
            }

            if ((int) $sub->asset_category_id !== (int) $category->id) {
                $skippedError++;
                $msg = "{$sheet}!R{$excelRow} {$tag}: sub {$subCode} belongs to {$sub->category?->code}, header is {$category->code}";
                $errors[] = $msg;
                $log[] = 'ERROR: '.$msg;

                continue;
            }

            $method = $category->depreciation_method ?: FixedAsset::DEPRECIATION_NONE;
            $rate = $sub->resolvedDepreciationRate();
            if ($rate === null) {
                $rate = $category->depreciation_rate !== null ? (int) $category->depreciation_rate : null;
            }
            if ($method === FixedAsset::DEPRECIATION_NONE) {
                $rate = 0;
            }

            $usefulLife = $category->default_useful_life_years;
            if (! $usefulLife && $rate && $rate > 0 && $method === FixedAsset::DEPRECIATION_STRAIGHT_LINE) {
                $usefulLife = (int) max(1, round(100 / $rate));
            }

            $sourcePrefix = Str::upper((string) ($row['source_prefix'] ?? 'MOU'));
            $name = trim((string) $sub->name);
            $seq = trim((string) ($row['seq'] ?? ''));
            if ($seq !== '') {
                $name .= ' #'.$seq;
            }

            $descriptionParts = [
                'Opening balance from FixedAssets.xls as of '.self::AS_OF_DATE,
                'Sheet: '.$sheet,
            ];
            if ($sourcePrefix === 'COAST') {
                $descriptionParts[] = 'Source register: COAST';
            }

            $payloadRow = [
                'asset_tag' => $tag,
                'manual_asset_code' => $tag,
                'name' => $name,
                'asset_category_id' => $category->id,
                'asset_sub_category_id' => $sub->id,
                'branch_id' => $branch->id,
                'status' => FixedAsset::STATUS_ACTIVE,
                'description' => implode(' | ', $descriptionParts),
                'purchase_date' => is_string($purchaseDate) && $purchaseDate !== '' ? $purchaseDate : null,
                'purchase_cost' => $purchaseCost,
                'book_value' => $bookValue,
                'useful_life_years' => $usefulLife,
                'depreciation_method' => $method,
                'depreciation_rate' => $rate,
                'salvage_value' => 0,
                'accumulated_depreciation' => $accum,
                'depreciation_start_date' => is_string($purchaseDate) && $purchaseDate !== '' ? $purchaseDate : self::AS_OF_DATE,
                'last_depreciation_date' => self::LAST_DEPRECIATION_DATE,
                'account_head' => $sourcePrefix === 'COAST' ? 'COAST' : 'MOU',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $inserts[] = $payloadRow;
            $existingTags[Str::upper($tag)] = true;
            $created++;
        }

        if (! $dryRun && $inserts !== []) {
            DB::transaction(function () use ($inserts) {
                foreach (array_chunk($inserts, 200) as $chunk) {
                    FixedAsset::query()->insert($chunk);
                }
            });
        }

        $dbCount = FixedAsset::query()
            ->where(function ($q) {
                $q->where('asset_tag', 'like', 'MOU-%')
                    ->orWhere('asset_tag', 'like', 'COAST-%');
            })
            ->count();
        $dbPurchase = (float) FixedAsset::query()
            ->where(function ($q) {
                $q->where('asset_tag', 'like', 'MOU-%')
                    ->orWhere('asset_tag', 'like', 'COAST-%');
            })
            ->sum('purchase_cost');
        $dbBook = (float) FixedAsset::query()
            ->where(function ($q) {
                $q->where('asset_tag', 'like', 'MOU-%')
                    ->orWhere('asset_tag', 'like', 'COAST-%');
            })
            ->sum('book_value');
        $dbAccum = (float) FixedAsset::query()
            ->where(function ($q) {
                $q->where('asset_tag', 'like', 'MOU-%')
                    ->orWhere('asset_tag', 'like', 'COAST-%');
            })
            ->sum('accumulated_depreciation');

        $branchCounts = FixedAsset::query()
            ->where(function ($q) {
                $q->where('asset_tag', 'like', 'MOU-%')
                    ->orWhere('asset_tag', 'like', 'COAST-%');
            })
            ->selectRaw('branch_id, COUNT(*) as c, SUM(book_value) as book')
            ->groupBy('branch_id')
            ->pluck('c', 'branch_id');

        $perfect = ! $dryRun
            && $skippedError === 0
            && abs($dbPurchase - $xlsxPurchase) < 0.02
            && abs($dbBook - $xlsxBook) < 0.02
            && abs($dbAccum - $xlsxAccum) < 0.02
            && $dbCount === count($rows);

        $verification = [
            'perfect' => $perfect,
            'xlsx_count' => count($rows),
            'xlsx_purchase_total' => round($xlsxPurchase, 2),
            'xlsx_book_total' => round($xlsxBook, 2),
            'xlsx_accum_total' => round($xlsxAccum, 2),
            'db_count' => $dbCount,
            'db_purchase_total' => round($dbPurchase, 2),
            'db_book_total' => round($dbBook, 2),
            'db_accum_total' => round($dbAccum, 2),
            'branches_with_assets' => $branchCounts->count(),
        ];

        $log[] = str_repeat('-', 72);
        $log[] = 'Created (this run): '.$created.($dryRun ? ' (dry-run, not written)' : '');
        $log[] = 'Skipped existing: '.$skippedExisting;
        $log[] = 'Skipped/errors: '.$skippedError;
        $log[] = 'XLS purchase total: '.number_format($xlsxPurchase, 2, '.', ',');
        $log[] = 'XLS book total: '.number_format($xlsxBook, 2, '.', ',');
        $log[] = 'XLS accum depr total: '.number_format($xlsxAccum, 2, '.', ',');
        if (! $dryRun) {
            $log[] = 'DB MOU/COAST count: '.$dbCount;
            $log[] = 'DB purchase total: '.number_format($dbPurchase, 2, '.', ',');
            $log[] = 'DB book total: '.number_format($dbBook, 2, '.', ',');
            $log[] = 'DB accum depr total: '.number_format($dbAccum, 2, '.', ',');
            $log[] = 'Branches with assets: '.$branchCounts->count();
            $log[] = 'Verification: '.($perfect ? 'PERFECT' : 'MISMATCH / incomplete');
        }
        if ($errors !== []) {
            $log[] = str_repeat('-', 72);
            $log[] = 'Error list ('.$skippedError.'):';
            foreach ($errors as $error) {
                $log[] = '  - '.$error;
            }
        }

        $logPath = storage_path('logs/fixed_asset_opening_import_'.now()->format('Ymd_His').'.log');
        file_put_contents($logPath, implode(PHP_EOL, $log).PHP_EOL);

        return [
            'created' => $created,
            'skipped_existing' => $skippedExisting,
            'skipped_error' => $skippedError,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
            'verification' => $verification,
            'parse_warnings' => $parseWarnings,
            'errors' => $errors,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function parseViaPython(string $absolutePath): array
    {
        $script = base_path('scripts/parse_fixed_assets_xls.py');
        if (! is_readable($script)) {
            throw new RuntimeException('Parser script missing: '.$script);
        }

        $python = $this->pythonBinary();
        $envPrefix = PHP_OS_FAMILY === 'Windows'
            ? 'set PYTHONIOENCODING=utf-8&& '
            : 'PYTHONIOENCODING=utf-8 ';
        $command = $envPrefix.escapeshellarg($python).' '.escapeshellarg($script).' '.escapeshellarg($absolutePath).' 2>&1';
        $output = shell_exec($command);

        if (! is_string($output) || trim($output) === '') {
            throw new RuntimeException('Failed to parse XLS via Python. Ensure Python 3 + xlrd are installed.');
        }

        $trimmed = trim($output);
        if (str_starts_with($trimmed, 'ERROR:')) {
            throw new RuntimeException($trimmed);
        }

        $payload = json_decode($trimmed, true);
        if (! is_array($payload)) {
            throw new RuntimeException('Invalid JSON from FixedAssets parser. Output head: '.Str::limit($trimmed, 300));
        }

        return $payload;
    }

    private function pythonBinary(): string
    {
        foreach (['python', 'python3', 'py'] as $bin) {
            $which = shell_exec(
                (PHP_OS_FAMILY === 'Windows' ? 'where ' : 'which ').escapeshellarg($bin).' 2>'.(PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null')
            );
            if (is_string($which) && trim($which) !== '') {
                return $bin;
            }
        }

        return 'python';
    }
}
