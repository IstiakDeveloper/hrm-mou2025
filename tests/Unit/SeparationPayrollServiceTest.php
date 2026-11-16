<?php

use App\Models\Employee;
use App\Services\SeparationPayrollService;
use Carbon\Carbon;

test('mid-month joining pays through salary month end not process date', function () {
    $employee = new Employee([
        'joining_date' => Carbon::create(2026, 6, 15),
    ]);

    $result = app(SeparationPayrollService::class)->resolveForPayrollMonth($employee, 2026, 6);

    expect($result['eligible'])->toBeTrue()
        ->and($result['payable_days'])->toBe(16)
        ->and($result['days_in_month'])->toBe(30)
        ->and($result['factor'])->toEqual(16 / 30)
        ->and($result['is_partial'])->toBeTrue()
        ->and($result['payroll_remark'])->toContain('joined 15 Jun 2026 through 30 Jun 2026');
});

test('joining after salary month is not eligible', function () {
    $employee = new Employee([
        'joining_date' => Carbon::create(2026, 7, 1),
    ]);

    $result = app(SeparationPayrollService::class)->resolveForPayrollMonth($employee, 2026, 6);

    expect($result['eligible'])->toBeFalse()
        ->and($result['payable_days'])->toBe(0);
});

test('joining before salary month pays full month', function () {
    $employee = new Employee([
        'joining_date' => Carbon::create(2026, 1, 10),
    ]);

    $result = app(SeparationPayrollService::class)->resolveForPayrollMonth($employee, 2026, 6);

    expect($result['eligible'])->toBeTrue()
        ->and($result['payable_days'])->toBe(30)
        ->and($result['factor'])->toEqual(1.0)
        ->and($result['is_partial'])->toBeFalse();
});

test('mid-month joining and separation in same month uses both boundaries', function () {
    $employee = new Employee([
        'joining_date' => Carbon::create(2026, 6, 10),
        'dropout_date' => Carbon::create(2026, 6, 25),
    ]);

    $result = app(SeparationPayrollService::class)->resolveForPayrollMonth($employee, 2026, 6);

    expect($result['eligible'])->toBeTrue()
        ->and($result['payable_days'])->toBe(15)
        ->and($result['factor'])->toEqual(15 / 30);
});

test('mid-month separation still prorates from month start when joined earlier', function () {
    $employee = new Employee([
        'joining_date' => Carbon::create(2026, 1, 1),
        'dropout_date' => Carbon::create(2026, 6, 15),
    ]);

    $result = app(SeparationPayrollService::class)->resolveForPayrollMonth($employee, 2026, 6);

    expect($result['eligible'])->toBeTrue()
        ->and($result['payable_days'])->toBe(14)
        ->and($result['factor'])->toEqual(14 / 30);
});

test('separation on first day of next month pays full previous month', function () {
    $employee = new Employee([
        'joining_date' => Carbon::create(2023, 8, 24),
        'dropout_date' => Carbon::create(2026, 8, 1),
    ]);

    $result = app(SeparationPayrollService::class)->resolveForPayrollMonth($employee, 2026, 7);

    expect($result['eligible'])->toBeTrue()
        ->and($result['payable_days'])->toBe(31)
        ->and($result['days_in_month'])->toBe(31)
        ->and($result['factor'])->toEqual(1.0)
        ->and($result['is_partial'])->toBeFalse();
});

test('separation on first day of salary month is not eligible that month', function () {
    $employee = new Employee([
        'joining_date' => Carbon::create(2023, 8, 24),
        'dropout_date' => Carbon::create(2026, 8, 1),
    ]);

    $result = app(SeparationPayrollService::class)->resolveForPayrollMonth($employee, 2026, 8);

    expect($result['eligible'])->toBeFalse()
        ->and($result['payable_days'])->toBe(0);
});
