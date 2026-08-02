<?php

use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Services\EmployeeAssignmentHistoryService;
use Carbon\Carbon;

test('payroll as-of clamps process date after month end to period end', function () {
    $service = app(EmployeeAssignmentHistoryService::class);

    $asOf = $service->asOfForPayrollPeriod(2026, 7, Carbon::create(2026, 8, 2));

    expect($asOf->toDateString())->toBe('2026-07-31');
});

test('payroll as-of keeps process date inside salary month', function () {
    $service = app(EmployeeAssignmentHistoryService::class);

    $asOf = $service->asOfForPayrollPeriod(2026, 7, Carbon::create(2026, 7, 26));

    expect($asOf->toDateString())->toBe('2026-07-26');
});

test('payroll as-of clamps process date before month start to period start', function () {
    $service = app(EmployeeAssignmentHistoryService::class);

    $asOf = $service->asOfForPayrollPeriod(2026, 7, Carbon::create(2026, 6, 15));

    expect($asOf->toDateString())->toBe('2026-07-01');
});

test('applyToEmployee overlays historical branch designation and grade', function () {
    $service = app(EmployeeAssignmentHistoryService::class);

    $employee = new Employee([
        'current_branch_id' => 20,
        'department_id' => 2,
        'designation_id' => 2,
        'payscale_id' => 9,
        'salary_grade_id' => 9,
        'salary_step_id' => 9,
        'basic_salary' => 50000,
        'status' => 'active',
    ]);

    $history = new EmployeeAssignmentHistory([
        'branch_id' => 10,
        'department_id' => 1,
        'designation_id' => 1,
        'payscale_id' => 3,
        'salary_grade_id' => 4,
        'salary_step_id' => 5,
        'basic_salary' => 30000,
        'status' => 'active',
    ]);

    $service->applyToEmployee($employee, $history);

    expect((int) $employee->current_branch_id)->toBe(10)
        ->and((int) $employee->department_id)->toBe(1)
        ->and((int) $employee->designation_id)->toBe(1)
        ->and((int) $employee->payscale_id)->toBe(3)
        ->and((int) $employee->salary_grade_id)->toBe(4)
        ->and((int) $employee->salary_step_id)->toBe(5)
        ->and((float) $employee->basic_salary)->toBe(30000.0);
});

test('matches org filters use as-of history not live employee', function () {
    $service = app(EmployeeAssignmentHistoryService::class);

    $employee = new Employee([
        'current_branch_id' => 20,
        'department_id' => 2,
        'designation_id' => 2,
    ]);

    $history = new EmployeeAssignmentHistory([
        'branch_id' => 10,
        'department_id' => 1,
        'designation_id' => 1,
    ]);

    expect($service->matchesOrgFilters($history, $employee, ['branch_id' => 10]))->toBeTrue()
        ->and($service->matchesOrgFilters($history, $employee, ['branch_id' => 20]))->toBeFalse()
        ->and($service->matchesOrgFilters($history, $employee, ['department_id' => 1]))->toBeTrue()
        ->and($service->matchesOrgFilters($history, $employee, ['department_id' => 2]))->toBeFalse();
});

test('july after august transfer scenario: as-of is july month end not today', function () {
    $service = app(EmployeeAssignmentHistoryService::class);

    // Today Aug 2, processing July with default "today" process date → clamp to 31 Jul.
    $asOf = $service->asOfForPayrollPeriod(2026, 7, Carbon::create(2026, 8, 2));

    expect($asOf->toDateString())->toBe('2026-07-31');

    // User explicitly sets process date 26 Jul → use that day (transfer on 28 Jul would not apply).
    $asOfExplicit = $service->asOfForPayrollPeriod(2026, 7, Carbon::create(2026, 7, 26));

    expect($asOfExplicit->toDateString())->toBe('2026-07-26');
});
