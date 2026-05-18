<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCategory;
use App\Models\Branch;
use App\Models\FixedAsset;
use App\Services\FixedAssetTagService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class FixedAssetImportController extends Controller
{
    use ResolvesFixedAssetBranchScope;

    private const MAX_ROWS = 500;

    public function __construct(
        private readonly FixedAssetTagService $tagService,
    ) {}

    public function index(Request $request)
    {
        return Inertia::render('fixed-asset/assets/import', [
            ...$this->fixedAssetBranchFilterProps($request),
            'templateHeaders' => [
                'name', 'category_code', 'branch_code', 'purchase_date', 'purchase_cost',
                'book_value', 'vendor', 'serial_number', 'invoice_no', 'useful_life_years', 'status',
            ],
        ]);
    }

    public function preview(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $rows = $this->parseCsv($request->file('file')->getRealPath());
        if (count($rows) < 2) {
            return back()->withErrors(['file' => 'CSV must have a header row and at least one data row.']);
        }

        [$headerMap, $dataRows] = $this->splitRows($rows);
        if (! isset($headerMap['name'], $headerMap['category_code'], $headerMap['branch_code'])) {
            return back()->withErrors(['file' => 'Required columns: name, category_code, branch_code']);
        }

        if (count($dataRows) > self::MAX_ROWS) {
            return back()->withErrors(['file' => 'Maximum '.self::MAX_ROWS.' rows per import.']);
        }

        $categories = AssetCategory::query()->where('is_active', true)->get()->keyBy(fn ($c) => Str::upper($c->code));
        $branches = Branch::query()->where('is_active', true)->get();
        $branchByCode = $branches->keyBy(fn ($b) => Str::upper((string) $b->branch_code));
        $scopedBranchId = $this->scopedBranchIdForUser($request->user());

        $preview = [];
        foreach ($dataRows as $i => $row) {
            $assoc = $this->rowAssoc($row, $headerMap);
            $issues = [];
            $name = trim((string) ($assoc['name'] ?? ''));
            $catCode = Str::upper(trim((string) ($assoc['category_code'] ?? '')));
            $branchCode = Str::upper(trim((string) ($assoc['branch_code'] ?? '')));

            if ($name === '') {
                $issues[] = 'Name is required';
            }
            $category = $categories[$catCode] ?? null;
            if (! $category) {
                $issues[] = 'Unknown category_code';
            }

            $branch = $branchByCode[$branchCode] ?? $branches->first(fn ($b) => Str::upper($b->name) === $branchCode);
            if (! $branch) {
                $issues[] = 'Unknown branch_code';
            } elseif ($scopedBranchId && (int) $branch->id !== $scopedBranchId) {
                $issues[] = 'Branch not allowed for your account';
            }

            $status = strtolower(trim((string) ($assoc['status'] ?? FixedAsset::STATUS_ACTIVE)));
            if ($status && ! isset(FixedAsset::STATUSES[$status])) {
                $issues[] = 'Invalid status';
            }

            $preview[] = [
                'row' => $i + 2,
                'name' => $name,
                'category_code' => $catCode,
                'branch_code' => $branchCode,
                'branch_name' => $branch?->name,
                'purchase_date' => $assoc['purchase_date'] ?? null,
                'purchase_cost' => $assoc['purchase_cost'] ?? null,
                'book_value' => $assoc['book_value'] ?? null,
                'vendor' => $assoc['vendor'] ?? null,
                'serial_number' => $assoc['serial_number'] ?? null,
                'invoice_no' => $assoc['invoice_no'] ?? null,
                'useful_life_years' => $assoc['useful_life_years'] ?? null,
                'status' => $status ?: FixedAsset::STATUS_ACTIVE,
                'valid' => count($issues) === 0,
                'issues' => $issues,
                'resolved' => [
                    'asset_category_id' => $category?->id,
                    'branch_id' => $branch?->id,
                ],
            ];
        }

        $importId = (string) Str::uuid();
        Cache::put("fixed_asset_import:{$importId}", $preview, now()->addHours(2));

        return Inertia::render('fixed-asset/assets/import-review', [
            'importId' => $importId,
            'rows' => $preview,
            'validCount' => collect($preview)->where('valid', true)->count(),
            'invalidCount' => collect($preview)->where('valid', false)->count(),
        ]);
    }

    public function commit(Request $request)
    {
        $validated = $request->validate([
            'importId' => 'required|string',
        ]);

        $importId = $validated['importId'];
        $rows = Cache::get("fixed_asset_import:{$importId}");
        if (! is_array($rows)) {
            return back()->withErrors(['importId' => 'Import session expired. Upload the file again.']);
        }

        $scopedBranchId = $this->scopedBranchIdForUser($request->user());
        $created = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            foreach ($rows as $row) {
                if (! ($row['valid'] ?? false)) {
                    $skipped++;

                    continue;
                }

                $branchId = (int) ($row['resolved']['branch_id'] ?? 0);
                if ($scopedBranchId && $branchId !== $scopedBranchId) {
                    $skipped++;

                    continue;
                }

                $branch = Branch::query()->findOrFail($branchId);
                $purchaseCost = $this->decimal($row['purchase_cost'] ?? null);
                $bookValue = $this->decimal($row['book_value'] ?? null) ?? $purchaseCost;

                FixedAsset::query()->create([
                    'asset_tag' => $this->tagService->generateForBranch($branch),
                    'name' => $row['name'],
                    'asset_category_id' => (int) $row['resolved']['asset_category_id'],
                    'branch_id' => $branchId,
                    'status' => $row['status'] ?? FixedAsset::STATUS_ACTIVE,
                    'purchase_date' => $row['purchase_date'] ?: null,
                    'purchase_cost' => $purchaseCost,
                    'book_value' => $bookValue,
                    'vendor' => $row['vendor'] ?: null,
                    'serial_number' => $row['serial_number'] ?: null,
                    'invoice_no' => $row['invoice_no'] ?? null,
                    'useful_life_years' => isset($row['useful_life_years']) && $row['useful_life_years'] !== ''
                        ? (int) $row['useful_life_years']
                        : null,
                    'created_by' => $request->user()?->id,
                ]);
                $created++;
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        Cache::forget("fixed_asset_import:{$importId}");

        return redirect()
            ->route('fixed-assets.index')
            ->with('success', "Imported {$created} asset(s)".($skipped > 0 ? ", skipped {$skipped}" : '').'.');
    }

    /**
     * @return list<list<string>>
     */
    private function parseCsv(string $path): array
    {
        $rows = [];
        if (($handle = fopen($path, 'r')) !== false) {
            while (($data = fgetcsv($handle)) !== false) {
                $rows[] = $data;
            }
            fclose($handle);
        }

        return $rows;
    }

    /**
     * @param  list<list<string>>  $rows
     * @return array{0: array<string, int>, 1: list<list<string>>}
     */
    private function splitRows(array $rows): array
    {
        $header = array_map(fn ($h) => Str::snake(Str::lower(trim($h))), $rows[0]);
        $map = [];
        foreach ($header as $i => $key) {
            $map[$key] = $i;
        }

        return [$map, array_slice($rows, 1)];
    }

    /**
     * @param  list<string>  $row
     * @param  array<string, int>  $map
     * @return array<string, string|null>
     */
    private function rowAssoc(array $row, array $map): array
    {
        $out = [];
        foreach ($map as $key => $idx) {
            $out[$key] = isset($row[$idx]) ? trim((string) $row[$idx]) : null;
        }

        return $out;
    }

    private function decimal(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) str_replace(',', '', (string) $value);
    }
}
