<?php

use App\Http\Controllers\EmployeeLoan\SecondMotorcycleLoanController;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\LoanApplication;
use App\Models\LoanPolicy;
use App\Models\Role;
use App\Models\User;
use App\Services\EmployeeLoanService;
use App\Services\LoanApplicationService;
use App\Services\MotorcycleLoanApplicationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('username')->nullable()->unique();
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');
        $table->string('remember_token', 100)->nullable();
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('employee_id')->nullable();
        $table->string('signature')->nullable();
        $table->timestamps();
    });

    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name')->unique();
        $table->json('permissions')->nullable();
        $table->timestamps();
    });

    Schema::create('role_user', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('role_id');
        $table->unsignedBigInteger('user_id');
        $table->timestamps();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('branch_code')->unique();
        $table->boolean('is_head_office')->default(false);
        $table->softDeletes();
        $table->timestamps();
    });

    Schema::create('departments', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->unsignedBigInteger('head_employee_id')->nullable();
        $table->timestamps();
    });

    Schema::create('designations', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->timestamps();
    });

    Schema::create('employee_types', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->timestamps();
    });

    Schema::create('programs', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->timestamps();
    });

    Schema::create('projects', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->timestamps();
    });

    Schema::create('employees', function (Blueprint $table) {
        $table->id();
        $table->string('employee_id')->unique();
        $table->string('pin')->nullable();
        $table->string('name_en')->nullable();
        $table->string('email')->nullable();
        $table->date('joining_date')->nullable();
        $table->unsignedBigInteger('department_id')->nullable();
        $table->unsignedBigInteger('designation_id')->nullable();
        $table->unsignedBigInteger('current_branch_id')->nullable();
        $table->unsignedBigInteger('employee_type_id')->nullable();
        $table->unsignedBigInteger('program_id')->nullable();
        $table->unsignedBigInteger('project_id')->nullable();
        $table->string('status')->default('active');
        $table->string('signature')->nullable();
        $table->timestamps();
    });

    Schema::create('salary_heads', function (Blueprint $table) {
        $table->id();
        $table->string('code')->unique();
        $table->string('short_name')->nullable();
        $table->string('name');
        $table->string('name_bn')->nullable();
        $table->string('salary_type')->nullable();
        $table->string('type');
        $table->string('default_amount_type')->nullable();
        $table->decimal('default_amount', 15, 4)->default(0);
        $table->unsignedSmallInteger('sort_order')->default(0);
        $table->text('description')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('is_basic_head')->default(false);
        $table->boolean('is_taxable_head')->default(false);
        $table->boolean('is_gross_pay_head')->default(false);
        $table->boolean('is_bonus_head')->default(false);
        $table->boolean('is_arrear_head')->default(false);
        $table->boolean('is_pf_head')->default(false);
        $table->boolean('is_welfare')->default(false);
        $table->boolean('is_income_tax_head')->default(false);
        $table->boolean('is_loan_head')->default(false);
        $table->string('loan_head_type')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_policies', function (Blueprint $table) {
        $table->id();
        $table->string('code')->unique();
        $table->string('name');
        $table->string('loan_type');
        $table->unsignedSmallInteger('tenure_years')->nullable();
        $table->decimal('min_amount', 14, 2)->default(0);
        $table->decimal('max_amount', 14, 2);
        $table->unsignedSmallInteger('min_tenure_months')->default(1);
        $table->unsignedSmallInteger('max_tenure_months');
        $table->unsignedSmallInteger('total_installments')->nullable();
        $table->decimal('default_interest_rate', 8, 2)->default(0);
        $table->string('calculation_method')->default('flat');
        $table->string('collection_method')->default('flat');
        $table->unsignedTinyInteger('grace_months')->default(0);
        $table->unsignedTinyInteger('interval_months')->default(1);
        $table->boolean('is_active')->default(true);
        $table->unsignedSmallInteger('sort_order')->default(0);
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_number')->unique();
        $table->date('application_date');
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('loan_policy_id');
        $table->unsignedSmallInteger('loan_cycle')->default(1);
        $table->decimal('applied_amount', 14, 2);
        $table->string('status')->default('draft');
        $table->timestamps();
    });

    Schema::create('employee_loans', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('loan_policy_id')->nullable();
        $table->unsignedBigInteger('loan_application_id')->nullable();
        $table->string('loan_number')->unique();
        $table->string('loan_type');
        $table->unsignedSmallInteger('loan_cycle')->default(1);
        $table->unsignedBigInteger('salary_head_id')->nullable();
        $table->decimal('principal_amount', 14, 2);
        $table->decimal('interest_rate', 8, 2)->default(0);
        $table->decimal('total_payable', 14, 2);
        $table->unsignedSmallInteger('installment_count');
        $table->decimal('installment_amount', 14, 2);
        $table->date('disbursement_date');
        $table->date('first_installment_date');
        $table->decimal('outstanding_balance', 14, 2)->default(0);
        $table->string('status')->default('active');
        $table->boolean('is_legacy_import')->default(false);
        $table->unsignedSmallInteger('legacy_paid_installments')->nullable();
        $table->unsignedSmallInteger('legacy_paid_through_year')->nullable();
        $table->unsignedTinyInteger('legacy_paid_through_month')->nullable();
        $table->string('reference_no')->nullable();
        $table->text('notes')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->timestamps();
    });

    Schema::create('employee_loan_installments', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_loan_id');
        $table->unsignedSmallInteger('installment_no');
        $table->date('due_date');
        $table->decimal('principal_amount', 14, 2);
        $table->decimal('interest_amount', 14, 2)->default(0);
        $table->decimal('total_amount', 14, 2);
        $table->string('status')->default('pending');
        $table->unsignedBigInteger('payslip_id')->nullable();
        $table->timestamp('paid_at')->nullable();
        $table->decimal('paid_amount', 14, 2)->nullable();
        $table->timestamps();
    });

    Schema::create('loan_migration_items', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_loan_id')->nullable();
        $table->timestamps();
    });

    Schema::create('employee_loan_transactions', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('employee_loan_id');
        $table->unsignedBigInteger('employee_loan_installment_id')->nullable();
        $table->unsignedBigInteger('loan_collection_batch_id')->nullable();
        $table->string('transaction_type');
        $table->decimal('debit_amount', 14, 2)->default(0);
        $table->decimal('credit_amount', 14, 2)->default(0);
        $table->decimal('balance_after', 14, 2)->default(0);
        $table->unsignedBigInteger('payslip_id')->nullable();
        $table->unsignedBigInteger('payroll_run_id')->nullable();
        $table->unsignedSmallInteger('payroll_year')->nullable();
        $table->unsignedTinyInteger('payroll_month')->nullable();
        $table->date('transaction_date');
        $table->text('notes')->nullable();
        $table->string('reference_no')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->timestamps();
    });
});

function secondLoanRole(string $name, array $permissions = []): Role
{
    return Role::query()->create([
        'name' => $name,
        'permissions' => $permissions,
    ]);
}

function secondLoanUser(Role $role, ?int $employeeId = null): User
{
    $user = User::factory()->create([
        'name' => $role->name.' User',
        'role_id' => $role->id,
        'employee_id' => $employeeId,
    ]);
    $user->roles()->attach($role->id);

    return $user;
}

function secondLoanEmployee(string $designationName, string $pin): Employee
{
    $branch = Branch::query()->create([
        'name' => 'Branch '.$pin,
        'branch_code' => 'B'.$pin,
    ]);
    $department = Department::query()->create(['name' => 'Dept '.$pin]);
    $designation = Designation::query()->create(['name' => $designationName]);

    return Employee::withoutEvents(fn () => Employee::query()->create([
        'employee_id' => 'EMP-'.$pin,
        'pin' => $pin,
        'name_en' => 'Staff '.$pin,
        'email' => $pin.'@example.com',
        'joining_date' => '2020-01-01',
        'department_id' => $department->id,
        'designation_id' => $designation->id,
        'current_branch_id' => $branch->id,
        'status' => 'active',
    ]));
}

function motorcyclePolicy(string $code = 'MC-TEST'): LoanPolicy
{
    return LoanPolicy::query()->create([
        'code' => $code,
        'name' => 'Motorcycle 50',
        'loan_type' => 'motorcycle_loan',
        'tenure_years' => 5,
        'min_amount' => 10000,
        'max_amount' => 200000,
        'min_tenure_months' => 1,
        'max_tenure_months' => 50,
        'total_installments' => 50,
        'default_interest_rate' => 0,
        'calculation_method' => 'flat',
        'collection_method' => 'flat',
        'grace_months' => 0,
        'interval_months' => 1,
        'is_active' => true,
    ]);
}

function disburseMotorcycle(Employee $employee, LoanPolicy $policy, User $actor, float $amount = 100000): EmployeeLoan
{
    return app(EmployeeLoanService::class)->createLoan([
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => $amount,
        'installment_count' => 50,
        'disbursement_date' => '2026-11-02',
        'first_installment_date' => '2026-11-30',
        'is_legacy_import' => false,
    ], $actor->id);
}

test('accounts or super admin can disburse a second motorcycle loan while one is active', function () {
    $admin = secondLoanUser(secondLoanRole('Super Admin'));
    $accountant = secondLoanUser(secondLoanRole('Accountant', ['employee-loan.view', 'employee-loan.edit']));
    $employee = secondLoanEmployee('Officer', '1001');
    $policy = motorcyclePolicy();
    $first = disburseMotorcycle($employee, $policy, $admin);

    $second = app(MotorcycleLoanApplicationService::class)->issueSecondLoan($accountant, [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 80000,
        'disbursement_date' => '2026-11-02',
        'notes' => 'Replacement bike',
    ]);

    expect($second->loan_cycle)->toBe(2)
        ->and($second->status)->toBe('active')
        ->and($second->notes)->toContain($first->loan_number)
        ->and($second->notes)->toContain($accountant->name)
        ->and($second->notes)->toContain('Replacement bike')
        ->and($second->installments)->not->toBeEmpty()
        ->and(EmployeeLoan::query()->where('employee_id', $employee->id)->where('loan_type', 'motorcycle_loan')->where('status', 'active')->count())->toBe(2);

    expect(fn () => app(EmployeeLoanService::class)->createLoan([
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'installment_count' => 50,
        'disbursement_date' => '2026-11-02',
        'first_installment_date' => '2026-11-30',
        'allow_parallel_motorcycle' => true,
    ], $admin->id))->toThrow(InvalidArgumentException::class, 'already has an active');
});

test('a third active motorcycle loan is refused and a second loan needs an active one', function () {
    $admin = secondLoanUser(secondLoanRole('Super Admin'));
    $employee = secondLoanEmployee('Officer', '1002');
    $policy = motorcyclePolicy();
    $service = app(MotorcycleLoanApplicationService::class);

    expect(fn () => $service->issueSecondLoan($admin, [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'disbursement_date' => '2026-11-02',
    ]))->toThrow(InvalidArgumentException::class, 'still active');

    disburseMotorcycle($employee, $policy, $admin);
    $service->issueSecondLoan($admin, [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'disbursement_date' => '2026-11-02',
    ]);

    expect(fn () => $service->issueSecondLoan($admin, [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'disbursement_date' => '2026-11-02',
    ]))->toThrow(InvalidArgumentException::class, 'two active motorcycle loans');
});

test('hr cannot issue a second motorcycle loan even with loan edit permission', function () {
    $hr = secondLoanUser(secondLoanRole('HR Admin', ['employee-loan.view', 'employee-loan.edit', 'employee-loan.create']));
    $employee = secondLoanEmployee('Officer', '1003');
    $policy = motorcyclePolicy();
    disburseMotorcycle($employee, $policy, $hr);

    expect(fn () => app(MotorcycleLoanApplicationService::class)->issueSecondLoan($hr, [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'disbursement_date' => '2026-11-02',
    ]))->toThrow(InvalidArgumentException::class, 'Only Accounts or Super Admin');

    $this->actingAs($hr);
    $request = Request::create('/employee-loans/second-motorcycle', 'POST', [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'disbursement_date' => '2026-11-02',
        'allow_parallel_motorcycle' => true,
    ]);

    expect(fn () => app(SecondMotorcycleLoanController::class)->store($request))
        ->toThrow(HttpException::class);
});

test('the parallel flag cannot create a non motorcycle loan', function () {
    $admin = secondLoanUser(secondLoanRole('Super Admin'));
    $employee = secondLoanEmployee('Officer', '1004');
    $policy = LoanPolicy::query()->create([
        'code' => 'PF-TEST',
        'name' => 'PF 12',
        'loan_type' => 'pf_loan',
        'min_amount' => 1000,
        'max_amount' => 500000,
        'min_tenure_months' => 1,
        'max_tenure_months' => 12,
        'total_installments' => 12,
        'default_interest_rate' => 0,
        'calculation_method' => 'flat',
        'is_active' => true,
    ]);

    expect(fn () => app(EmployeeLoanService::class)->createLoan([
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 20000,
        'installment_count' => 12,
        'disbursement_date' => '2026-11-02',
        'first_installment_date' => '2026-11-30',
    ], $admin->id, true))->toThrow(InvalidArgumentException::class, 'only allowed for a motorcycle loan');
});

test('staff self apply and the normal application stay blocked while a motorcycle loan is active', function () {
    $admin = secondLoanUser(secondLoanRole('Super Admin'));
    $employee = secondLoanEmployee('Officer', '1005');
    $policy = motorcyclePolicy();
    disburseMotorcycle($employee, $policy, $admin);

    $assessment = app(MotorcycleLoanApplicationService::class)->assess($employee->fresh(['designation', 'branch']));

    expect($assessment['can_apply'])->toBeFalse()
        ->and(implode(' ', $assessment['blockers']))->toContain('চালু মোটরসাইকেল ঋণ');

    expect(fn () => app(LoanApplicationService::class)->assertEmployeeCanTakeLoan($employee->id, $policy))
        ->toThrow(InvalidArgumentException::class, 'already has an active');

    expect(fn () => app(EmployeeLoanService::class)->createLoan([
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'installment_count' => 50,
        'disbursement_date' => '2026-11-02',
        'first_installment_date' => '2026-11-30',
    ], $admin->id))->toThrow(InvalidArgumentException::class, 'already has an active');
});

test('second motorcycle loan respects the designation cap and an open application', function () {
    $admin = secondLoanUser(secondLoanRole('Super Admin'));
    $employee = secondLoanEmployee('Officer', '1006');
    $policy = motorcyclePolicy();
    disburseMotorcycle($employee, $policy, $admin);
    $service = app(MotorcycleLoanApplicationService::class);

    expect(fn () => $service->issueSecondLoan($admin, [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 160000,
        'disbursement_date' => '2026-11-02',
    ]))->toThrow(InvalidArgumentException::class, 'সর্বোচ্চ');

    LoanApplication::query()->create([
        'application_number' => 'LA-OPEN-1',
        'application_date' => '2026-11-02',
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'applied_amount' => 50000,
        'status' => 'pending',
    ]);

    expect(fn () => $service->issueSecondLoan($admin, [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 50000,
        'disbursement_date' => '2026-11-02',
    ]))->toThrow(InvalidArgumentException::class, 'already in progress');
});

test('finance accounts department head can open the screen and disburse a second loan', function () {
    $headEmployee = secondLoanEmployee('Officer', '1008');
    Department::query()->create([
        'name' => 'Finance and Accounts',
        'head_employee_id' => $headEmployee->id,
    ]);
    $head = secondLoanUser(secondLoanRole('HR Admin', ['employee-loan.view']), $headEmployee->id);
    $employee = secondLoanEmployee('Branch Manager', '1007');
    $policy = motorcyclePolicy('MC-HEAD');
    disburseMotorcycle($employee, $policy, $head);

    expect(app(MotorcycleLoanApplicationService::class)->canIssueSecondLoan($head->fresh(['role', 'roles'])))->toBeTrue();

    $this->actingAs($head);
    $screen = app(SecondMotorcycleLoanController::class)->create();
    expect($screen)->toBeInstanceOf(InertiaResponse::class);

    $request = Request::create('/employee-loans/second-motorcycle', 'POST', [
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'principal_amount' => 180000,
        'disbursement_date' => '2026-11-02',
        'allow_parallel_motorcycle' => true,
    ]);
    $response = app(SecondMotorcycleLoanController::class)->store($request);

    expect($response->getStatusCode())->toBe(302)
        ->and(EmployeeLoan::query()->where('employee_id', $employee->id)->where('status', 'active')->count())->toBe(2);
});
