<?php

use App\Models\EmployeePfTransaction;
use App\Services\EmployeeProvidentFundService;

test('only opening and manual pf entries are correctable', function () {
    $service = app(EmployeeProvidentFundService::class);

    $opening = new EmployeePfTransaction(['transaction_type' => EmployeeProvidentFundService::TYPE_OPENING]);
    $manual = new EmployeePfTransaction(['transaction_type' => EmployeeProvidentFundService::TYPE_MANUAL]);
    $payroll = new EmployeePfTransaction(['transaction_type' => EmployeeProvidentFundService::TYPE_PAYROLL]);

    expect($service->isCorrectable($opening))->toBeTrue()
        ->and($service->isCorrectable($manual))->toBeTrue()
        ->and($service->isCorrectable($payroll))->toBeFalse();
});

test('payroll pf cannot be deleted via correction helper', function () {
    $service = app(EmployeeProvidentFundService::class);
    $payroll = new EmployeePfTransaction([
        'id' => 1,
        'employee_id' => 1,
        'transaction_type' => EmployeeProvidentFundService::TYPE_PAYROLL,
    ]);

    $service->deleteCorrectableTransaction($payroll);
})->throws(InvalidArgumentException::class);
