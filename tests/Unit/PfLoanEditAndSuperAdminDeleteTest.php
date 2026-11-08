<?php

use App\Http\Controllers\EmployeeLoan\EmployeeLoanController;
use App\Http\Controllers\EmployeeLoan\LoanApplicationController;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanApplication;
use App\Models\LoanPolicy;
use App\Models\Role;
use App\Models\SalaryHead;
use App\Models\User;
use App\Services\EmployeeLoanService;
use App\Services\LoanApplicationService;
use App\Services\PfLoanApplicationService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    Employee::unsetEventDispatcher();

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

    Schema::create('employees', function (Blueprint $table) {
        $table->id();
        $table->string('employee_id')->unique();
        $table->string('pin')->nullable();
        $table->string('name_en')->nullable();
        $table->string('name_bn')->nullable();
        $table->string('email')->nullable();
        $table->date('joining_date')->nullable();
        $table->date('confirmation_date')->nullable();
        $table->decimal('pf_balance', 14, 2)->default(0);
        $table->unsignedBigInteger('department_id')->nullable();
        $table->unsignedBigInteger('designation_id')->nullable();
        $table->unsignedBigInteger('current_branch_id')->nullable();
        $table->unsignedBigInteger('payscale_id')->nullable();
        $table->unsignedBigInteger('salary_grade_id')->nullable();
        $table->unsignedBigInteger('salary_step_id')->nullable();
        $table->string('status')->default('active');
        $table->string('signature')->nullable();
        $table->timestamps();
    });

    Schema::create('employee_addresses', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('type')->default('present');
        $table->text('address_details')->nullable();
        $table->string('village')->nullable();
        $table->string('union')->nullable();
        $table->string('upazila')->nullable();
        $table->string('district')->nullable();
        $table->string('division')->nullable();
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
        $table->timestamps();
    });

    Schema::create('loan_policies', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->unique();
        $table->string('loan_type');
        $table->unsignedBigInteger('salary_head_id')->nullable();
        $table->decimal('default_interest_rate', 5, 2)->default(0);
        $table->unsignedSmallInteger('max_tenure_months')->default(12);
        $table->unsignedSmallInteger('total_installments')->nullable();
        $table->decimal('min_amount', 14, 2)->default(1000);
        $table->decimal('max_amount', 14, 2)->default(1000000);
        $table->string('interest_type')->default('flat');
        $table->unsignedSmallInteger('interval_months')->default(1);
        $table->unsignedSmallInteger('grace_months')->default(0);
        $table->unsignedSmallInteger('sort_order')->default(0);
        $table->boolean('is_active')->default(true);
        $table->decimal('max_loan_limit_amount', 14, 2)->nullable();
        $table->decimal('max_loan_limit_percentage', 5, 2)->nullable();
        $table->timestamps();
    });

    Schema::create('loan_committees', function (Blueprint $table) {
        $table->id();
        $table->string('committee_name');
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_number')->unique();
        $table->date('application_date');
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('loan_policy_id');
        $table->unsignedBigInteger('loan_committee_id')->nullable();
        $table->unsignedSmallInteger('loan_cycle')->default(1);
        $table->decimal('applied_amount', 14, 2);
        $table->decimal('rate_yearly', 5, 2)->default(0);
        $table->decimal('installment_amount_monthly', 14, 2)->default(0);
        $table->decimal('max_loan_limit_amount', 14, 2)->nullable();
        $table->decimal('max_loan_limit_percentage', 5, 2)->nullable();
        $table->unsignedSmallInteger('total_installments')->default(12);
        $table->unsignedSmallInteger('grace_months')->default(0);
        $table->unsignedSmallInteger('interval_months')->default(1);
        $table->decimal('principal_amount', 14, 2)->default(0);
        $table->decimal('service_charge_amount', 14, 2)->default(0);
        $table->decimal('total_payable', 14, 2)->default(0);
        $table->string('status')->default('draft');
        $table->string('channel')->nullable();
        $table->text('notes')->nullable();
        $table->text('rejection_reason')->nullable();
        $table->string('workflow_stage')->nullable();
        $table->json('form_snapshot')->nullable();
        $table->unsignedBigInteger('approved_by')->nullable();
        $table->timestamp('approved_at')->nullable();
        $table->timestamp('disbursed_at')->nullable();
        $table->unsignedBigInteger('employee_loan_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_application_recommendations', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->string('stage');
        $table->unsignedBigInteger('user_id');
        $table->string('action');
        $table->text('comments')->nullable();
        $table->string('signature')->nullable();
        $table->timestamp('signed_at')->nullable();
        $table->timestamps();
    });

    Schema::create('employee_loans', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('loan_policy_id')->nullable();
        $table->unsignedBigInteger('loan_application_id')->nullable();
        $table->unsignedBigInteger('loan_migration_id')->nullable();
        $table->string('loan_number', 40)->unique();
        $table->string('loan_type')->default('other');
        $table->unsignedSmallInteger('loan_cycle')->default(1);
        $table->unsignedBigInteger('salary_head_id')->nullable();
        $table->decimal('principal_amount', 14, 2);
        $table->decimal('interest_rate', 5, 2)->default(0);
        $table->decimal('total_payable', 14, 2);
        $table->unsignedSmallInteger('installment_count');
        $table->decimal('installment_amount', 14, 2);
        $table->date('disbursement_date');
        $table->date('first_installment_date');
        $table->decimal('outstanding_balance', 14, 2)->default(0);
        $table->string('status')->default('active');
        $table->string('reference_no', 80)->nullable();
        $table->text('notes')->nullable();
        $table->boolean('is_legacy_import')->default(false);
        $table->unsignedSmallInteger('legacy_paid_through_year')->nullable();
        $table->unsignedTinyInteger('legacy_paid_through_month')->nullable();
        $table->unsignedSmallInteger('legacy_paid_installments')->nullable();
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

    Schema::create('employee_loan_transactions', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('employee_loan_id');
        $table->unsignedBigInteger('employee_loan_installment_id')->nullable();
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
        $table->string('reference_no', 80)->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_transfers', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_loan_id');
        $table->timestamps();
    });

    Schema::create('loan_collection_items', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_loan_id');
        $table->timestamps();
    });

    Schema::create('loan_migration_items', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_loan_id')->nullable();
        $table->timestamps();
    });
});

test('pf loan form snapshot updates when admin edits loan application', function () {
    $designation = Designation::create(['name' => 'Officer']);
    $employee = Employee::create([
        'employee_id' => 'EMP-001',
        'pin' => '1001',
        'name_en' => 'Abdul Karim',
        'name_bn' => 'আব্দুল করিম',
        'designation_id' => $designation->id,
        'pf_balance' => 100000,
    ]);

    $policy = LoanPolicy::create([
        'name' => 'PF Loan 20 Months',
        'code' => 'PF-20',
        'loan_type' => 'pf_loan',
        'default_interest_rate' => 0,
        'total_installments' => 20,
        'max_tenure_months' => 20,
        'min_amount' => 5000,
        'max_amount' => 100000,
    ]);

    $app = LoanApplication::create([
        'application_number' => 'LA-202611-0001',
        'application_date' => '2026-11-01',
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'applied_amount' => 50000,
        'principal_amount' => 50000,
        'total_installments' => 20,
        'installment_amount_monthly' => 2500,
        'total_payable' => 50000,
        'status' => 'draft',
        'notes' => 'পুরানো কারণ',
        'form_snapshot' => [
            'amount' => '50,000',
            'amount_in_words' => 'পঞ্চাশ হাজার টাকা মাত্র',
            'reason' => 'পুরানো কারণ',
            'day' => '01',
            'month' => '11',
            'year' => '2026',
            'installments' => '20',
            'installment_amount' => '2,500',
        ],
    ]);

    $controller = app(LoanApplicationController::class);

    // Admin edits: amount changed to 30000, date to 2026-11-10, notes to 'বাড়ি মেরামত'
    $request = Request::create('/loan-applications/' . $app->id, 'PUT', [
        'application_number' => 'LA-202611-0001',
        'application_date' => '2026-11-10',
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'applied_amount' => 30000,
        'loan_cycle' => 1,
        'notes' => 'বাড়ি মেরামত',
    ]);

    $admin = User::create([
        'name' => 'Admin User',
        'email' => 'admin@example.com',
        'password' => bcrypt('secret'),
    ]);
    $this->actingAs($admin);

    $controller->update($request, $app);

    $app->refresh();

    // Check that form_snapshot was updated
    expect($app->form_snapshot)->not->toBeNull();
    expect($app->form_snapshot['amount'])->toBe('30,000');
    expect($app->form_snapshot['amount_in_words'])->toBe('ত্রিশ হাজার টাকা মাত্র');
    expect($app->form_snapshot['reason'])->toBe('বাড়ি মেরামত');
    expect($app->form_snapshot['day'])->toBe('10');
    expect($app->form_snapshot['month'])->toBe('11');
    expect($app->form_snapshot['year'])->toBe('2026');

    // Also check formForApplication
    $pfService = app(PfLoanApplicationService::class);
    $form = $pfService->formForApplication($app);
    expect($form['amount'])->toBe('30,000');
    expect($form['amount_in_words'])->toBe('ত্রিশ হাজার টাকা মাত্র');
    expect($form['reason'])->toBe('বাড়ি মেরামত');
});

test('super admin can delete loan application and non super admin is rejected', function () {
    $employee = Employee::create([
        'employee_id' => 'EMP-002',
        'pin' => '1002',
        'name_en' => 'Test Employee',
    ]);

    $policy = LoanPolicy::create([
        'name' => 'PF Loan',
        'code' => 'PF-01',
        'loan_type' => 'pf_loan',
    ]);

    $app = LoanApplication::create([
        'application_number' => 'LA-202611-0002',
        'application_date' => '2026-11-01',
        'employee_id' => $employee->id,
        'loan_policy_id' => $policy->id,
        'applied_amount' => 20000,
        'status' => 'draft',
    ]);

    $regularRole = Role::create(['name' => 'Officer', 'permissions' => ['employee-loan.delete']]);
    $regularUser = User::create([
        'name' => 'Regular User',
        'email' => 'regular@example.com',
        'password' => bcrypt('secret'),
        'role_id' => $regularRole->id,
    ]);

    $superAdminRole = Role::create(['name' => 'Super Admin', 'permissions' => []]);
    $superAdmin = User::create([
        'name' => 'Super Admin User',
        'email' => 'super@example.com',
        'password' => bcrypt('secret'),
        'role_id' => $superAdminRole->id,
    ]);

    $controller = app(LoanApplicationController::class);

    // Regular user attempting delete should be aborted with 403
    $this->actingAs($regularUser);
    $request = Request::create('/loan-applications/' . $app->id, 'DELETE');
    $request->setUserResolver(fn () => $regularUser);

    try {
        $controller->destroy($request, $app);
        $this->fail('Expected 403 HttpException was not thrown.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    // Loan application still exists
    expect(LoanApplication::find($app->id))->not->toBeNull();

    // Super admin can delete
    $this->actingAs($superAdmin);
    $request = Request::create('/loan-applications/' . $app->id, 'DELETE');
    $request->setUserResolver(fn () => $superAdmin);

    $response = $controller->destroy($request, $app);
    expect($response->getStatusCode())->toBe(302);
    expect(LoanApplication::find($app->id))->toBeNull();
});

test('super admin can delete employee loan and non super admin is rejected', function () {
    $employee = Employee::create([
        'employee_id' => 'EMP-003',
        'pin' => '1003',
        'name_en' => 'Test Employee 3',
    ]);

    $loan = EmployeeLoan::create([
        'employee_id' => $employee->id,
        'loan_number' => 'LN-202611-0001',
        'loan_type' => 'pf_loan',
        'principal_amount' => 50000,
        'total_payable' => 50000,
        'installment_count' => 10,
        'installment_amount' => 5000,
        'disbursement_date' => '2026-11-01',
        'first_installment_date' => '2026-12-01',
        'status' => 'active',
    ]);

    EmployeeLoanInstallment::create([
        'employee_loan_id' => $loan->id,
        'installment_no' => 1,
        'due_date' => '2026-12-01',
        'principal_amount' => 5000,
        'total_amount' => 5000,
        'status' => 'pending',
    ]);

    $regularRole = Role::create(['name' => 'Accountant', 'permissions' => ['employee-loan.delete']]);
    $regularUser = User::create([
        'name' => 'Accountant User',
        'email' => 'acct@example.com',
        'password' => bcrypt('secret'),
        'role_id' => $regularRole->id,
    ]);

    $superAdminRole = Role::create(['name' => 'Super Admin', 'permissions' => []]);
    $superAdmin = User::create([
        'name' => 'Super Admin 2',
        'email' => 'super2@example.com',
        'password' => bcrypt('secret'),
        'role_id' => $superAdminRole->id,
    ]);

    $controller = app(EmployeeLoanController::class);

    // Regular user attempting delete should throw 403
    $this->actingAs($regularUser);
    $request = Request::create('/employee-loans/' . $loan->id, 'DELETE');
    $request->setUserResolver(fn () => $regularUser);

    try {
        $controller->destroy($request, $loan);
        $this->fail('Expected 403 HttpException was not thrown.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    expect(EmployeeLoan::find($loan->id))->not->toBeNull();
    expect(EmployeeLoanInstallment::where('employee_loan_id', $loan->id)->count())->toBe(1);

    // Super admin can delete
    $this->actingAs($superAdmin);
    $request = Request::create('/employee-loans/' . $loan->id, 'DELETE');
    $request->setUserResolver(fn () => $superAdmin);

    $response = $controller->destroy($request, $loan);
    expect($response->getStatusCode())->toBe(302);
    expect(EmployeeLoan::find($loan->id))->toBeNull();
    expect(EmployeeLoanInstallment::where('employee_loan_id', $loan->id)->count())->toBe(0);
});
