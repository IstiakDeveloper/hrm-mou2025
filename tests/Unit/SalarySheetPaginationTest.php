<?php

use App\Services\PayrollReportService;

it('paginates salary sheet with a smaller first page so the signature fits', function () {
    $service = app(PayrollReportService::class);
    $rows = array_map(fn (int $i) => [
        'components' => ['basic' => 1000.0],
        'gross' => 1000.0,
        'deduction' => 100.0,
        'net' => 900.0,
    ], range(1, 43));
    $heads = ['basic'];

    $pages = $service->paginateSalarySheetSectionPages($rows, $heads, [
        'components' => ['basic' => 43000.0],
        'gross' => 43000.0,
        'deduction' => 4300.0,
        'net' => 38700.0,
    ]);

    expect($pages)->toHaveCount(2)
        ->and($pages[0]['rows'])->toHaveCount(25)
        ->and($pages[0]['totals_label'])->toBe('Sub Total')
        ->and($pages[1]['rows'])->toHaveCount(18)
        ->and($pages[1]['totals_label'])->toBe('Total');
});

it('keeps a single page as total when rows fit on the first page', function () {
    $service = app(PayrollReportService::class);
    $rows = array_map(fn () => [
        'components' => ['basic' => 1000.0],
        'gross' => 1000.0,
        'deduction' => 100.0,
        'net' => 900.0,
    ], range(1, 20));
    $heads = ['basic'];

    $pages = $service->paginateSalarySheetSectionPages($rows, $heads, [
        'components' => ['basic' => 20000.0],
        'gross' => 20000.0,
        'deduction' => 2000.0,
        'net' => 18000.0,
    ]);

    expect($pages)->toHaveCount(1)
        ->and($pages[0]['rows'])->toHaveCount(20)
        ->and($pages[0]['totals_label'])->toBe('Total');
});

it('moves overflow from the first page onto a continuation page', function () {
    $service = app(PayrollReportService::class);
    $rows = array_map(fn () => [
        'components' => ['basic' => 1000.0],
        'gross' => 1000.0,
        'deduction' => 100.0,
        'net' => 900.0,
    ], range(1, 26));
    $heads = ['basic'];

    $pages = $service->paginateSalarySheetSectionPages($rows, $heads, [
        'components' => ['basic' => 26000.0],
        'gross' => 26000.0,
        'deduction' => 2600.0,
        'net' => 23400.0,
    ]);

    expect($pages)->toHaveCount(2)
        ->and($pages[0]['rows'])->toHaveCount(25)
        ->and($pages[0]['totals_label'])->toBe('Sub Total')
        ->and($pages[1]['rows'])->toHaveCount(1)
        ->and($pages[1]['totals_label'])->toBe('Total');
});

it('holds 30 rows on the first page for head office', function () {
    $service = app(PayrollReportService::class);
    $rows = array_map(fn () => [
        'is_head_office' => true,
        'branch' => 'Head Office',
        'branch_code' => '0000',
        'components' => ['basic' => 1000.0],
        'gross' => 1000.0,
        'deduction' => 100.0,
        'net' => 900.0,
    ], range(1, 35));
    $heads = ['basic'];

    $pages = $service->paginateSalarySheetSectionPages($rows, $heads, [
        'components' => ['basic' => 35000.0],
        'gross' => 35000.0,
        'deduction' => 3500.0,
        'net' => 31500.0,
    ]);

    expect($pages)->toHaveCount(2)
        ->and($pages[0]['rows'])->toHaveCount(30)
        ->and($pages[0]['totals_label'])->toBe('Sub Total')
        ->and($pages[1]['rows'])->toHaveCount(5)
        ->and($pages[1]['totals_label'])->toBe('Total');
});

