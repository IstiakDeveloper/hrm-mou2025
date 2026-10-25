<?php

use App\Services\PfLoanApplicationService;
use App\Support\BanglaTaka;
use Carbon\Carbon;

test('bangla taka spells whole amounts', function () {
    expect(BanglaTaka::taka(1))->toBe('এক টাকা মাত্র');
    expect(BanglaTaka::taka(21))->toBe('একুশ টাকা মাত্র');
    expect(BanglaTaka::taka(100))->toBe('একশত টাকা মাত্র');
    expect(BanglaTaka::taka(101))->toBe('একশত এক টাকা মাত্র');
    expect(BanglaTaka::taka(1000))->toBe('এক হাজার টাকা মাত্র');
    expect(BanglaTaka::taka(25000))->toBe('পঁচিশ হাজার টাকা মাত্র');
    expect(BanglaTaka::taka(90000))->toBe('নব্বই হাজার টাকা মাত্র');
    expect(BanglaTaka::taka(100000))->toBe('এক লাখ টাকা মাত্র');
    expect(BanglaTaka::taka(125000))->toBe('এক লাখ পঁচিশ হাজার টাকা মাত্র');
    expect(BanglaTaka::taka(10000000))->toBe('এক কোটি টাকা মাত্র');
    expect(BanglaTaka::taka(0))->toBe('');
});

test('pf self service cap is ninety percent of balance rounded down', function () {
    config([
        'employee_loans.pf_self_service.max_balance_percent' => 90,
    ]);

    $service = app(PfLoanApplicationService::class);

    expect($service->maxAmount(100000))->toBe(90000.0);
    expect($service->maxAmount(111))->toBe(99.0);
    expect($service->maxAmount(0))->toBe(0.0);
    expect($service->maxAmount(1317246))->toBe(1185521.0);
});

test('pf self service requires two full years from confirmation', function () {
    config([
        'employee_loans.pf_self_service.min_years_from_confirmation' => 2,
    ]);

    $service = app(PfLoanApplicationService::class);
    $confirmed = Carbon::parse('2024-10-25');

    expect($service->hasRequiredService(null, Carbon::parse('2026-10-25')))->toBeFalse();
    expect($service->hasRequiredService($confirmed, Carbon::parse('2026-10-24')))->toBeFalse();
    expect($service->hasRequiredService($confirmed, Carbon::parse('2026-10-25')))->toBeTrue();
    expect($service->eligibleFrom($confirmed)?->toDateString())->toBe('2026-10-25');
});
