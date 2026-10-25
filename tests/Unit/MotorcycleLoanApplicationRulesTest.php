<?php

use App\Models\Branch;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\User;
use App\Services\MotorcycleLoanApplicationService;

function motorcycleEmployee(string $designation): Employee
{
    $employee = new Employee;
    $title = new Designation;
    $title->name = $designation;
    $employee->setRelation('designation', $title);

    return $employee;
}

test('motorcycle cap is 150000 for officer and accountant and 200000 from abm upward', function () {
    config([
        'employee_loans.motorcycle_self_service.standard_max_amount' => 150000,
        'employee_loans.motorcycle_self_service.senior_max_amount' => 200000,
    ]);

    $service = app(MotorcycleLoanApplicationService::class);

    expect($service->maxAmountFor(motorcycleEmployee('Officer')))->toBe(150000.0);
    expect($service->maxAmountFor(motorcycleEmployee('Accountant')))->toBe(150000.0);
    expect($service->maxAmountFor(motorcycleEmployee('Senior Officer')))->toBe(150000.0);
    expect($service->maxAmountFor(motorcycleEmployee('Assistant Branch Manager')))->toBe(200000.0);
    expect($service->maxAmountFor(motorcycleEmployee('Branch Manager')))->toBe(200000.0);
    expect($service->maxAmountFor(motorcycleEmployee('Regional Manager')))->toBe(200000.0);
    expect($service->maxAmountFor(motorcycleEmployee('Zonal Manager')))->toBe(200000.0);
});

test('motorcycle recommendation skips the applicant own seat', function () {
    $service = app(MotorcycleLoanApplicationService::class);

    expect($service->stagesFor(motorcycleEmployee('Officer')))->toBe(['bm', 'rm', 'zm', 'accounts', 'ed']);
    expect($service->stagesFor(motorcycleEmployee('Accountant')))->toBe(['bm', 'rm', 'zm', 'accounts', 'ed']);
    expect($service->stagesFor(motorcycleEmployee('Assistant Branch Manager')))->toBe(['bm', 'rm', 'zm', 'accounts', 'ed']);
    expect($service->stagesFor(motorcycleEmployee('Branch Manager')))->toBe(['rm', 'zm', 'accounts', 'ed']);
    expect($service->stagesFor(motorcycleEmployee('Regional Manager')))->toBe(['zm', 'accounts', 'ed']);
    expect($service->stagesFor(motorcycleEmployee('Zonal Manager')))->toBe(['accounts', 'ed']);
    expect($service->stagesFor(motorcycleEmployee('Executive Director')))->toBe(['accounts', 'ed']);
});

test('head office motorcycle application uses the department head unless the applicant is the head', function () {
    $service = app(MotorcycleLoanApplicationService::class);
    $branch = new Branch;
    $branch->is_head_office = true;

    $staff = motorcycleEmployee('Officer');
    $staff->setRelation('branch', $branch);

    expect($service->stagesFor($staff))->toBe(['department_head', 'accounts', 'ed']);
});

test('motorcycle recommendation is blocked when seal and signature file is missing', function () {
    $service = app(MotorcycleLoanApplicationService::class);
    $user = new User;

    expect($service->hasSealAndSignature($user))->toBeFalse();
});
