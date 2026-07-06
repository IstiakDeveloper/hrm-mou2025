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

    $interestPercent = round((1000.0 / 100000.0) * 100, 4);
    expect($interestPercent)->toBe(1.0);
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

test('whole taka interest pool is fully distributed across many employees', function () {
    $service = app(PfInterestDistributionService::class);
    $employees = new Collection();

    for ($i = 1; $i <= 500; $i++) {
        $employee = new Employee(['pf_balance' => 10000 + ($i * 137)]);
        $employee->id = $i;
        $employees->push($employee);
    }

    $pool = 4095433.0;
    $allocations = $service->allocateProportional($pool, $employees);

    expect(array_sum($allocations))->toBe($pool);
});

test('interest remainder is credited to executive director', function () {
    $service = app(PfInterestDistributionService::class);

    $executiveDirector = new Employee([
        'pf_balance' => 60000,
        'pin' => '001',
        'name_en' => 'Executive Director',
    ]);
    $executiveDirector->id = 1;
    $executiveDirector->setRelation('designation', new \App\Models\Designation(['name' => 'Executive Director']));

    $officer = new Employee([
        'pf_balance' => 40000,
        'pin' => '002',
        'name_en' => 'Officer',
    ]);
    $officer->id = 2;
    $officer->setRelation('designation', new \App\Models\Designation(['name' => 'Officer']));

    $employees = new Collection([$executiveDirector, $officer]);
    $rows = [
        [
            'employee_id' => 2,
            'pin' => '002',
            'name_en' => 'Officer',
            'label' => '002 — Officer',
            'pf_balance' => 40000.0,
            'interest_percent' => 1.0,
            'interest_total' => 399.0,
            'own_amount' => 200.0,
            'org_amount' => 199.0,
        ],
        [
            'employee_id' => 1,
            'pin' => '001',
            'name_en' => 'Executive Director',
            'label' => '001 — Executive Director',
            'pf_balance' => 60000.0,
            'interest_percent' => 1.0,
            'interest_total' => 600.0,
            'own_amount' => 300.0,
            'org_amount' => 300.0,
        ],
    ];

    $method = new ReflectionMethod(PfInterestDistributionService::class, 'reconcileInterestRows');
    $method->setAccessible(true);
    $method->invokeArgs($service, [&$rows, 1000.0, $employees, 1.0]);

    expect($rows[1]['interest_total'])->toBe(601.0)
        ->and(array_sum(array_column($rows, 'interest_total')))->toBe(1000.0);
});

test('interest remainder can be credited to executive director with zero pf balance', function () {
    $service = app(PfInterestDistributionService::class);

    $executiveDirector = new Employee([
        'pf_balance' => 0,
        'pin' => '001',
        'name_en' => 'Executive Director',
    ]);
    $executiveDirector->id = 1;
    $executiveDirector->setRelation('designation', new \App\Models\Designation(['name' => 'Executive Director']));

    $officer = new Employee([
        'pf_balance' => 100000,
        'pin' => '002',
        'name_en' => 'Officer',
    ]);
    $officer->id = 2;
    $officer->setRelation('designation', new \App\Models\Designation(['name' => 'Officer']));

    $employees = new Collection([$officer, $executiveDirector]);
    $rows = [
        [
            'employee_id' => 2,
            'pin' => '002',
            'name_en' => 'Officer',
            'label' => '002 — Officer',
            'pf_balance' => 100000.0,
            'interest_percent' => 1.0,
            'interest_total' => 999.0,
            'own_amount' => 500.0,
            'org_amount' => 499.0,
        ],
    ];

    $method = new ReflectionMethod(PfInterestDistributionService::class, 'reconcileInterestRows');
    $method->setAccessible(true);
    $method->invokeArgs($service, [&$rows, 1000.0, $employees, 1.0]);

    expect($rows)->toHaveCount(2)
        ->and($rows[1]['employee_id'])->toBe(1)
        ->and($rows[1]['interest_total'])->toBe(1.0)
        ->and(array_sum(array_column($rows, 'interest_total')))->toBe(1000.0);
});
