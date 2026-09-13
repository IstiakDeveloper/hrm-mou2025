<?php

use App\Services\EmployeeProvidentFundService;
use App\Services\SalaryStructureCalculator;

test('pf employee and employer are ten percent of basic each', function () {
    config(['payroll.pf_employee_percent' => 10, 'payroll.pf_employer_percent' => 10]);

    $pf = app(EmployeeProvidentFundService::class)->contributionFromBasic(76000);

    expect($pf['employee'])->toBe(7600.0)
        ->and($pf['employer'])->toBe(7600.0)
        ->and(SalaryStructureCalculator::roundTaka($pf['employee'] + $pf['employer']))->toBe(15200.0);
});

test('pf contribution is zero when basic is zero or negative', function () {
    $pf = app(EmployeeProvidentFundService::class)->contributionFromBasic(0);

    expect($pf['employee'])->toBe(0.0)
        ->and($pf['employer'])->toBe(0.0);

    $negative = app(EmployeeProvidentFundService::class)->contributionFromBasic(-100);
    expect($negative['employee'])->toBe(0.0);
});

test('employer matching contribution follows the configured rate ratio', function () {
    config(['payroll.pf_employee_percent' => 10, 'payroll.pf_employer_percent' => 10]);

    expect(app(EmployeeProvidentFundService::class)->employerMatchingContribution(5000))->toBe(5000.0);
});
