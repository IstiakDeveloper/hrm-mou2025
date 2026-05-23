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
