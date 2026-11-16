<?php

use App\Support\FiscalYear;

test('fiscal year label formats start year as economic year', function () {
    expect(FiscalYear::label(2025))->toBe('2025-2026');
});

test('fiscal year parse accepts economic year string', function () {
    expect(FiscalYear::parseStartYear('2025-2026'))->toBe(2025)
        ->and(FiscalYear::parseStartYear('2025'))->toBe(2025)
        ->and(FiscalYear::parseStartYear(2025))->toBe(2025);
});

test('fiscal year parse rejects invalid values', function () {
    expect(FiscalYear::parseStartYear('2025-2027'))->toBeNull()
        ->and(FiscalYear::parseStartYear('abc'))->toBeNull();
});

test('last completed fiscal year uses july june cycle', function () {
    expect(FiscalYear::lastCompletedStartYear(\Illuminate\Support\Carbon::parse('2026-07-06')))->toBe(2025)
        ->and(FiscalYear::lastCompletedStartYear(\Illuminate\Support\Carbon::parse('2026-03-15')))->toBe(2024);
});
