<?php

use App\Models\Employee;
use App\Services\PfInterestDistributionService;
use Illuminate\Support\Collection;

test('proportional interest allocation sums to total pool', function () {
    $service = app(PfInterestDistributionService::class);

    $e1 = new Employee(['pf_balance' => 10000]);
    $e1->id = 1;
    $e2 = new Employee(['pf_balance' => 30000]);
    $e2->id = 2;
    $e3 = new Employee(['pf_balance' => 60000]);
    $e3->id = 3;
    $employees = new Collection([$e1, $e2, $e3]);

    $allocations = $service->allocateProportional(1000.0, $employees);

    expect(array_sum($allocations))->toBe(1000.0)
        ->and($allocations[1])->toBe(100.0)
        ->and($allocations[2])->toBe(300.0)
        ->and($allocations[3])->toBe(600.0);
});

test('own org split is fifty fifty with whole-taka rounding', function () {
    $service = app(PfInterestDistributionService::class);

    $split = $service->splitOwnOrg(1001.0);

    expect($split['own'])->toBe(501.0)
        ->and($split['org'])->toBe(500.0)
        ->and($split['own'] + $split['org'])->toBe(1001.0);
});

test('odd taka splits own then remainder to org', function () {
    $service = app(PfInterestDistributionService::class);

    $split = $service->splitOwnOrg(101.0);

    expect($split['own'])->toBe(51.0)
        ->and($split['org'])->toBe(50.0);
});
