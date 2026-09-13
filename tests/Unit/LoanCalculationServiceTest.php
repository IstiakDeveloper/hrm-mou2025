<?php

use App\Models\LoanPolicy;
use App\Services\LoanCalculationService;
use App\Services\SalaryStructureCalculator;

test('flat interest adds yearly charge across the tenure', function () {
    $policy = new LoanPolicy([
        'calculation_method' => 'flat',
        'default_interest_rate' => 12,
        'total_installments' => 12,
        'max_tenure_months' => 12,
    ]);

    $result = app(LoanCalculationService::class)->calculate($policy, 120000);

    expect($result['principal_amount'])->toBe(120000.0)
        ->and($result['service_charge_amount'])->toBe(14400.0)
        ->and($result['total_payable'])->toBe(134400.0)
        ->and($result['installment_amount_monthly'])->toBe(11200.0);
});

test('zero-rate reducing loan splits principal evenly', function () {
    $policy = new LoanPolicy([
        'calculation_method' => 'reducing',
        'default_interest_rate' => 0,
        'total_installments' => 10,
        'max_tenure_months' => 10,
    ]);

    $result = app(LoanCalculationService::class)->calculate($policy, 10000);

    expect($result['service_charge_amount'])->toBe(0.0)
        ->and($result['installment_amount_monthly'])->toBe(1000.0)
        ->and($result['total_payable'])->toBe(10000.0);
});

test('reducing schedule principal parts sum back to the loan amount', function () {
    $schedule = app(LoanCalculationService::class)->buildReducingAmortizationSchedule(
        50000,
        12,
        4442.43,
        12,
    );

    $principal = array_sum(array_column($schedule, 'principal'));

    expect(count($schedule))->toBe(12)
        ->and(SalaryStructureCalculator::roundPaisa($principal))->toBe(50000.0);
});

test('rounded payroll installments keep the last month as remainder', function () {
    $amounts = app(LoanCalculationService::class)->buildRoundedPaymentAmounts(10000, 833, 12);

    expect($amounts)->toHaveCount(12)
        ->and(array_sum($amounts))->toBe(10000.0)
        ->and($amounts[11])->toBe(10000.0 - (833 * 11));
});
