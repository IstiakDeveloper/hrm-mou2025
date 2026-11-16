<?php

use App\Support\TakaFormat;

test('formats amounts with lakh and crore grouping', function () {
    expect(TakaFormat::whole(1234))->toBe('1,234')
        ->and(TakaFormat::whole(123456))->toBe('1,23,456')
        ->and(TakaFormat::whole(1234567))->toBe('12,34,567')
        ->and(TakaFormat::whole(100000))->toBe('1,00,000')
        ->and(TakaFormat::whole(10000000))->toBe('1,00,00,000');
});

test('sheet cell shows dash for zero', function () {
    expect(TakaFormat::sheetCell(0))->toBe('-')
        ->and(TakaFormat::sheetCell(50000))->toBe('50,000');
});

test('amount supports decimals', function () {
    expect(TakaFormat::amount(1234.5, 2))->toBe('1,234.50');
});

test('withSymbol prefixes taka sign', function () {
    expect(TakaFormat::withSymbol(100000))->toBe('৳1,00,000');
});
