<?php

use App\Services\PfSideEqualizationService;

test('equalizes each employee and keeps paired one-taka adjustments total-neutral', function () {
    $plan = PfSideEqualizationService::planFromBalances([
        ['employee_id' => 1, 'pin' => 'SELIM', 'name' => 'Selim', 'own_balance' => 1006, 'employer_balance' => 1005],
        ['employee_id' => 2, 'pin' => 'FARID', 'name' => 'Farid', 'own_balance' => 1006, 'employer_balance' => 1007],
        ['employee_id' => 3, 'own_balance' => 1000, 'employer_balance' => 1000],
    ]);

    expect($plan['rows'])->toHaveCount(2)
        ->and($plan['rows'][0]['target_balance'])->toBe(1005)
        ->and($plan['rows'][0]['total_delta'])->toBe(-1)
        ->and($plan['rows'][1]['target_balance'])->toBe(1007)
        ->and($plan['rows'][1]['total_delta'])->toBe(1)
        ->and($plan['total_change'])->toBe(0)
        ->and($plan['after_total'])->toBe($plan['before_total']);
});

test('uses the minimum one-taka increase when an odd number of employee totals must be equalized', function () {
    $plan = PfSideEqualizationService::planFromBalances([
        ['employee_id' => 1, 'own_balance' => 1006, 'employer_balance' => 1005],
        ['employee_id' => 2, 'own_balance' => 1006, 'employer_balance' => 1005],
        ['employee_id' => 3, 'own_balance' => 1006, 'employer_balance' => 1005],
    ]);

    expect($plan['total_change'])->toBe(1)
        ->and($plan['after_total'])->toBe($plan['before_total'] + 1)
        ->and(array_column($plan['rows'], 'target_balance'))->toBe([1005, 1006, 1006])
        ->and(array_column($plan['rows'], 'total_delta'))->toBe([-1, 1, 1]);
});
