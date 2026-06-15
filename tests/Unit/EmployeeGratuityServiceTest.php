<?php

use App\Models\Employee;
use App\Services\EmployeeGratuityService;
use Carbon\Carbon;

test('gratuity is zero below five years', function () {
    $employee = Mockery::mock(Employee::class)->makePartial();
    $employee->confirmation_date = Carbon::today()->subYears(4)->subMonths(6);
    $employee->shouldReceive('resolveBasicSalary')->andReturn(50000.0);

    $calc = app(EmployeeGratuityService::class)->calculate($employee);

    expect($calc['basic_multiplier'])->toBe(0)
        ->and($calc['gratuity_amount'])->toBe(0.0)
        ->and($calc['eligible'])->toBeFalse();
});

test('gratuity tier at five ten fifteen and twenty years', function () {
    $service = app(EmployeeGratuityService::class);

    $cases = [
        [5, 1, 60000, 300000.0],
        [10, 2, 60000, 1200000.0],
        [15, 3, 60000, 2700000.0],
        [20, 4, 60000, 4800000.0],
        [25, 4, 60000, 6000000.0],
    ];

    foreach ($cases as [$years, $mult, $basic, $amount]) {
        $employee = Mockery::mock(Employee::class)->makePartial();
        $employee->confirmation_date = Carbon::today()->subYears($years);
        $employee->shouldReceive('resolveBasicSalary')->andReturn((float) $basic);

        $calc = $service->calculate($employee);

        expect($calc['basic_multiplier'])->toBe($mult)
            ->and($calc['gratuity_amount'])->toBe($amount);
    }
});
