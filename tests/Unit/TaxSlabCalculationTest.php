<?php

use App\Models\TaxSlab;
use App\Services\TaxSlabService;
use Illuminate\Support\Collection;

test('monthly tax matches the slab that covers the rounded gross', function () {
    $slabs = new Collection([
        new TaxSlab(['from_amount' => 0, 'to_amount' => 41666, 'tax_amount' => 0]),
        new TaxSlab(['from_amount' => 41667, 'to_amount' => 83333, 'tax_amount' => 2500]),
        new TaxSlab(['from_amount' => 83334, 'to_amount' => 125000, 'tax_amount' => 7500]),
    ]);

    $property = new ReflectionProperty(TaxSlabService::class, 'activeSlabs');
    $property->setValue(null, $slabs);

    $tax = app(TaxSlabService::class);

    expect($tax->taxForGross(0))->toBe(0.0)
        ->and($tax->taxForGross(40000))->toBe(0.0)
        ->and($tax->taxForGross(50000))->toBe(2500.0)
        ->and($tax->taxForGross(90000))->toBe(7500.0)
        ->and($tax->taxForGross(200000))->toBe(7500.0);

    TaxSlabService::clearCache();
});
