<?php

use App\Services\TaxSlabFromXlsxService;
use App\Support\SimpleXlsxReader;

test('tax slab xlsx file parses expected row count', function () {
    $path = base_path('data/excel/tax-deduction-slub.xlsx');
    expect(is_readable($path))->toBeTrue();

    $rows = SimpleXlsxReader::sheetRows($path);
    expect(count($rows))->toBeGreaterThan(40);

    $header = array_map('strtolower', array_map('trim', $rows[0]));
    expect($header)->toContain('from')
        ->and($header)->toContain('to');
});

test('tax slab import service reads xlsx without error', function () {
    if (! is_readable(base_path('data/excel/tax-deduction-slub.xlsx'))) {
        $this->markTestSkipped('Tax slab xlsx missing.');
    }

    $result = app(TaxSlabFromXlsxService::class)->run();
    expect($result['imported'])->toBeGreaterThan(40);
})->group('database');
