<?php

namespace App\Services;

use App\Models\AssetCategory;
use App\Models\AssetFinancialYear;
use App\Models\AssetSubCategory;
use App\Models\Branch;
use App\Models\FixedAsset;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetStockService
{
    public function __construct(
        private readonly AssetFinancialYearService $financialYears,
    ) {}

    /**
     * @return array{rows: array<int, array<string, mixed>>, totals: array<string, mixed>}
     */
    public function categoryWise(Request $request, ?int $scopedBranchId): array
    {
        $query = $this->baseQuery($request, $scopedBranchId);

        $aggregates = (clone $query)
            ->select([
                'asset_category_id',
                'asset_sub_category_id',
                DB::raw('COUNT(*) as asset_count'),
                DB::raw('COALESCE(SUM(purchase_cost), 0) as purchase_total'),
                DB::raw('COALESCE(SUM(book_value), 0) as book_total'),
            ])
            ->groupBy('asset_category_id', 'asset_sub_category_id')
            ->orderBy('asset_category_id')
            ->orderBy('asset_sub_category_id')
            ->get();

        $categoryIds = $aggregates->pluck('asset_category_id')->unique()->filter();
        $subCategoryIds = $aggregates->pluck('asset_sub_category_id')->unique()->filter();

        $categories = AssetCategory::query()->whereIn('id', $categoryIds)->get()->keyBy('id');
        $subCategories = AssetSubCategory::query()->whereIn('id', $subCategoryIds)->get()->keyBy('id');

        $rows = $aggregates->map(function ($row) use ($categories, $subCategories) {
            $category = $categories->get($row->asset_category_id);
            $subCategory = $row->asset_sub_category_id ? $subCategories->get($row->asset_sub_category_id) : null;

            return [
                'category_id' => $row->asset_category_id,
                'category_code' => $category?->code,
                'category_name' => $category?->name ?? 'Uncategorized',
                'sub_category_id' => $row->asset_sub_category_id,
                'sub_category_code' => $subCategory?->code,
                'sub_category_name' => $subCategory?->name,
                'asset_count' => (int) $row->asset_count,
                'purchase_total' => (float) $row->purchase_total,
                'book_total' => (float) $row->book_total,
            ];
        })->values()->all();

        return [
            'rows' => $rows,
            'totals' => $this->sumRows($rows),
        ];
    }

    /**
     * @return array{rows: array<int, array<string, mixed>>, totals: array<string, mixed>}
     */
    public function branchWise(Request $request, ?int $scopedBranchId): array
    {
        $query = $this->baseQuery($request, $scopedBranchId);

        $aggregates = (clone $query)
            ->select([
                'branch_id',
                DB::raw('COUNT(*) as asset_count'),
                DB::raw('COALESCE(SUM(purchase_cost), 0) as purchase_total'),
                DB::raw('COALESCE(SUM(book_value), 0) as book_total'),
            ])
            ->groupBy('branch_id')
            ->orderBy('branch_id')
            ->get();

        $branches = Branch::query()->whereIn('id', $aggregates->pluck('branch_id'))->get()->keyBy('id');

        $rows = $aggregates->map(function ($row) use ($branches) {
            $branch = $branches->get($row->branch_id);

            return [
                'branch_id' => $row->branch_id,
                'branch_name' => $branch?->name ?? 'Unknown',
                'branch_code' => $branch?->branch_code,
                'asset_count' => (int) $row->asset_count,
                'purchase_total' => (float) $row->purchase_total,
                'book_total' => (float) $row->book_total,
            ];
        })->values()->all();

        return [
            'rows' => $rows,
            'totals' => $this->sumRows($rows),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function sumRows(array $rows): array
    {
        return [
            'asset_count' => array_sum(array_column($rows, 'asset_count')),
            'purchase_total' => array_sum(array_column($rows, 'purchase_total')),
            'book_total' => array_sum(array_column($rows, 'book_total')),
        ];
    }

    /**
     * @return Builder<FixedAsset>
     */
    private function baseQuery(Request $request, ?int $scopedBranchId): Builder
    {
        $query = FixedAsset::query();

        if ($request->boolean('include_disposed')) {
            // all statuses
        } elseif ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        } else {
            $query->where('status', '!=', FixedAsset::STATUS_DISPOSED);
        }

        if ($scopedBranchId) {
            $query->where('branch_id', $scopedBranchId);
        } elseif ($request->filled('branch_id')) {
            $query->where('branch_id', $request->integer('branch_id'));
        }

        $query
            ->when($request->filled('asset_category_id'), fn ($q) => $q->where('asset_category_id', $request->integer('asset_category_id')))
            ->when($request->filled('asset_sub_category_id'), fn ($q) => $q->where('asset_sub_category_id', $request->integer('asset_sub_category_id')))
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->integer('project_id')));

        if ($request->filled('financial_year_id')) {
            $year = AssetFinancialYear::query()->find($request->integer('financial_year_id'));
            if ($year) {
                $query->whereDate('purchase_date', '>=', $year->start_date)
                    ->whereDate('purchase_date', '<=', $year->end_date);
            }
        }

        return $query;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function financialYearOptions(): array
    {
        return $this->financialYears->options()
            ->map(fn ($y) => [
                'id' => $y->id,
                'label' => $y->label,
                'is_active' => $y->is_active,
            ])
            ->all();
    }
}
