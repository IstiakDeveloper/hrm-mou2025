<?php

use App\Models\LoanPolicy;
use App\Services\LoanPolicyService;

function makePfPolicy(array $overrides = []): LoanPolicy
{
    $policy = new LoanPolicy(array_merge([
        'name' => 'PF- 5 YR',
        'loan_type' => 'pf_loan',
        'is_active' => true,
        'min_amount' => 1000,
        'max_amount' => 500000,
        'min_tenure_months' => 1,
        'max_tenure_months' => 12,
        'total_installments' => 60,
        'default_interest_rate' => 7,
        'calculation_method' => 'reducing',
        'grace_months' => 1,
        'interval_months' => 1,
    ], $overrides));

    return $policy;
}

test('pf five year policy is allowed even when hidden max tenure stays at 12 months', function () {
    $policy = makePfPolicy();

    $result = app(LoanPolicyService::class)->validateAgainstPolicy($policy, [
        'principal_amount' => 80000,
        'installment_count' => 60,
    ]);

    expect($result['loan_type'])->toBe('pf_loan')
        ->and($result['installment_amount'])->toBeGreaterThan(0);
});

test('policy still rejects an amount above the maximum', function () {
    $policy = makePfPolicy();

    app(LoanPolicyService::class)->validateAgainstPolicy($policy, [
        'principal_amount' => 900000,
        'installment_count' => 60,
    ]);
})->throws(\InvalidArgumentException::class, 'cannot exceed');
