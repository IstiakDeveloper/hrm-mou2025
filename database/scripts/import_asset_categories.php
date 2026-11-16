<?php

use App\Models\AssetCategory;
use App\Models\AssetSubCategory;
use Illuminate\Support\Facades\DB;

$path = base_path('data/catandsubcat.json');
$raw = file_get_contents($path);

if ($raw === false || trim($raw) === '') {
    throw new RuntimeException('data/catandsubcat.json is missing or empty.');
}

$parts = preg_split('/\]\s*\[/', trim($raw), 2);
if (count($parts) !== 2) {
    throw new RuntimeException('Expected two JSON arrays in data/catandsubcat.json.');
}

$categories = json_decode($parts[0].']', true, 512, JSON_THROW_ON_ERROR);
$subCategories = json_decode('['.$parts[1], true, 512, JSON_THROW_ON_ERROR);

if (count($categories) !== 27) {
    throw new RuntimeException('Expected 27 categories, found '.count($categories));
}

if (count($subCategories) !== 61) {
    throw new RuntimeException('Expected 61 sub categories, found '.count($subCategories));
}

$resolveDepreciationMethod = static function (string $legacyMethod, float $rate): string {
    if ($rate <= 0) {
        return AssetCategory::DEPRECIATION_NONE;
    }

    return match ($legacyMethod) {
        '002' => AssetCategory::DEPRECIATION_STRAIGHT_LINE,
        '001' => AssetCategory::DEPRECIATION_DECLINING_BALANCE,
        default => AssetCategory::DEPRECIATION_STRAIGHT_LINE,
    };
};

$extractCategoryCode = static function (string $categoryLabel): string {
    $code = strtoupper(trim(explode(' - ', $categoryLabel, 2)[0]));

    return $code === 'GEM' ? 'GEN' : $code;
};

DB::transaction(function () use ($categories, $subCategories, $resolveDepreciationMethod, $extractCategoryCode): void {
    AssetSubCategory::query()->delete();
    AssetCategory::query()->delete();

    $categoryIdsByCode = [];

    foreach ($categories as $row) {
        $code = strtoupper($row['CATEGORY SHORT NAME']);
        $rate = (float) $row['DEPRECIATION RATE'];

        $category = AssetCategory::query()->create([
            'sl' => (int) $row['SL'],
            'code' => $code,
            'name' => $row['CATEGORY NAME'],
            'depreciation_method' => $resolveDepreciationMethod((string) $row['DEPRECIATION METHOD'], $rate),
            'depreciation_rate' => $rate,
            'sort_order' => (int) $row['ORDER SERIAL'],
            'is_active' => true,
        ]);

        $categoryIdsByCode[$code] = $category->id;
    }

    foreach ($subCategories as $row) {
        $categoryCode = $extractCategoryCode($row['CATEGORY NAME']);

        if (! isset($categoryIdsByCode[$categoryCode])) {
            throw new RuntimeException("Unknown category code [{$categoryCode}] for sub category [{$row['SUB CATEGORY NAME']}].");
        }

        AssetSubCategory::query()->create([
            'asset_category_id' => $categoryIdsByCode[$categoryCode],
            'name' => $row['SUB CATEGORY NAME'],
            'code' => strtoupper($row['SUB CATEGORY SHORT CODE']),
            'depreciation_rate' => (float) $row['DEPRECIATION RATE'],
            'sort_order' => (int) $row['ORDER SERIAL'],
            'is_active' => true,
        ]);
    }
});

$categoryCount = AssetCategory::count();
$subCategoryCount = AssetSubCategory::count();

echo "Imported successfully.\n";
echo "Categories: {$categoryCount}\n";
echo "Sub Categories: {$subCategoryCount}\n";
