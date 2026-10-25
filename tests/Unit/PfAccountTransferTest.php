<?php

use App\Http\Controllers\Payroll\ProvidentFundController;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeePfTransaction;
use App\Models\PfAccountTransfer;
use App\Models\User;
use App\Services\PfAccountTransferService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Schema::dropAllTables();

    Schema::create('users', function ($table) {
        $table->id();
        $table->string('name');
        $table->string('username')->unique();
        $table->string('email')->unique();
        $table->string('password');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->rememberToken();
        $table->timestamps();
    });

    Schema::create('employees', function ($table) {
        $table->id();
        $table->string('employee_id')->nullable();
        $table->string('pin')->nullable();
        $table->string('name_en')->nullable();
        $table->string('email')->nullable();
        $table->date('joining_date')->nullable();
        $table->unsignedBigInteger('department_id')->nullable();
        $table->unsignedBigInteger('designation_id')->nullable();
        $table->unsignedBigInteger('current_branch_id')->nullable();
        $table->string('status')->default('active');
        $table->decimal('pf_balance', 15, 2)->default(0);
        $table->boolean('pf_enrolled')->default(true);
        $table->timestamps();
    });

    Schema::create('employee_pf_transactions', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('transaction_type')->default('payroll');
        $table->unsignedBigInteger('payslip_id')->nullable();
        $table->unsignedBigInteger('payroll_run_id')->nullable();
        $table->unsignedBigInteger('pf_interest_run_id')->nullable();
        $table->unsignedSmallInteger('payroll_year')->nullable();
        $table->unsignedTinyInteger('payroll_month')->nullable();
        $table->decimal('employee_contribution', 15, 2)->default(0);
        $table->decimal('employer_contribution', 15, 2)->default(0);
        $table->decimal('debit_amount', 15, 2)->default(0);
        $table->decimal('credit_amount', 15, 2)->default(0);
        $table->decimal('balance_after', 15, 2)->default(0);
        $table->date('transaction_date');
        $table->string('notes')->nullable();
        $table->string('reference_no')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->timestamps();
    });

    Schema::create('employee_loans', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('loan_number')->unique();
        $table->string('loan_type');
        $table->unsignedSmallInteger('loan_cycle')->default(1);
        $table->decimal('principal_amount', 14, 2);
        $table->decimal('interest_rate', 5, 2)->default(0);
        $table->decimal('total_payable', 14, 2);
        $table->unsignedSmallInteger('installment_count');
        $table->decimal('installment_amount', 14, 2);
        $table->date('disbursement_date');
        $table->date('first_installment_date');
        $table->decimal('outstanding_balance', 14, 2)->default(0);
        $table->string('status')->default('active');
        $table->timestamps();
    });

    Schema::create('loan_policies', function ($table) {
        $table->id();
        $table->string('loan_type')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_applications', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('loan_policy_id')->nullable();
        $table->string('status')->nullable();
        $table->timestamps();
    });

    Schema::create('pf_account_transfers', function ($table) {
        $table->id();
        $table->string('transfer_number', 40)->unique();
        $table->unsignedBigInteger('from_employee_id');
        $table->unsignedBigInteger('to_employee_id');
        $table->json('transaction_ids');
        $table->unsignedInteger('transaction_count');
        $table->decimal('amount', 15, 2);
        $table->decimal('own_amount', 15, 2)->default(0);
        $table->decimal('org_amount', 15, 2)->default(0);
        $table->text('reason');
        $table->unsignedBigInteger('created_by')->nullable();
        $table->timestamps();
    });
});

function pfTransferEmployee(array $overrides = []): Employee
{
    $n = Employee::query()->count() + 1;

    return Employee::withoutEvents(fn () => Employee::query()->create(array_merge([
        'employee_id' => 'PFX-'.$n,
        'pin' => 'PFX'.$n,
        'name_en' => 'PF Person '.$n,
        'email' => 'pfx'.$n.'@example.test',
        'joining_date' => '2020-01-01',
        'status' => 'active',
        'pf_balance' => 0,
        'pf_enrolled' => true,
    ], $overrides)));
}

function pfTransferLine(Employee $employee, array $overrides = []): EmployeePfTransaction
{
    return EmployeePfTransaction::query()->create(array_merge([
        'employee_id' => $employee->id,
        'transaction_type' => 'opening_balance',
        'employee_contribution' => 1000,
        'employer_contribution' => 1000,
        'credit_amount' => 2000,
        'debit_amount' => 0,
        'balance_after' => 2000,
        'transaction_date' => '2024-01-01',
        'notes' => 'Opening note',
        'reference_no' => 'KEEP-ME',
    ], $overrides));
}

test('whole pf ledger moves to an empty employee and the company pair stays balanced', function () {
    $from = pfTransferEmployee(['pf_balance' => 1800, 'pf_enrolled' => true]);
    $to = pfTransferEmployee(['pf_balance' => 0, 'pf_enrolled' => false]);
    $other = pfTransferEmployee(['pf_balance' => 500, 'pf_enrolled' => true]);

    $opening = pfTransferLine($from);
    $payroll = pfTransferLine($from, [
        'transaction_type' => 'payroll',
        'employee_contribution' => 100,
        'employer_contribution' => 100,
        'credit_amount' => 200,
        'debit_amount' => 0,
        'balance_after' => 2200,
        'transaction_date' => '2024-02-29',
        'notes' => 'February salary',
        'reference_no' => 'SAL-02',
        'payroll_year' => 2024,
        'payroll_month' => 2,
    ]);
    $withdrawal = pfTransferLine($from, [
        'transaction_type' => 'withdrawal',
        'employee_contribution' => 200,
        'employer_contribution' => 200,
        'credit_amount' => 0,
        'debit_amount' => 400,
        'balance_after' => 1800,
        'transaction_date' => '2024-03-15',
        'notes' => 'Partial payment',
        'reference_no' => 'WD-1',
    ]);
    pfTransferLine($other, [
        'employee_contribution' => 250,
        'employer_contribution' => 250,
        'credit_amount' => 500,
        'balance_after' => 500,
        'notes' => 'Other employee',
        'reference_no' => 'OTHER',
    ]);

    $transfer = app(PfAccountTransferService::class)->transfer($from, $to, 'Recorded on the wrong employee', 1);

    expect($transfer->transaction_count)->toBe(3)
        ->and((float) $transfer->amount)->toBe(1800.0)
        ->and((float) $transfer->own_amount)->toBe(900.0)
        ->and((float) $transfer->org_amount)->toBe(900.0)
        ->and($transfer->transaction_ids)->toBe([$opening->id, $payroll->id, $withdrawal->id]);

    expect((float) $from->refresh()->pf_balance)->toBe(0.0)
        ->and((bool) $from->pf_enrolled)->toBeTrue()
        ->and(EmployeePfTransaction::query()->where('employee_id', $from->id)->count())->toBe(0);

    expect((float) $to->refresh()->pf_balance)->toBe(1800.0)
        ->and((bool) $to->pf_enrolled)->toBeFalse()
        ->and(EmployeePfTransaction::query()->where('employee_id', $to->id)->orderBy('id')->pluck('id')->all())
        ->toBe([$opening->id, $payroll->id, $withdrawal->id]);

    $movedOpening = $opening->refresh();
    expect($movedOpening->notes)->toBe('Opening note')
        ->and($movedOpening->reference_no)->toBe('KEEP-ME')
        ->and((float) $movedOpening->balance_after)->toBe(2000.0);

    expect((float) $other->refresh()->pf_balance)->toBe(500.0)
        ->and(EmployeePfTransaction::query()->where('employee_id', $other->id)->count())->toBe(1);
});

test('pf transfer is refused when the receiver already has a balance or a pf loan exists', function () {
    $service = app(PfAccountTransferService::class);
    $from = pfTransferEmployee(['pf_balance' => 2000]);
    $busy = pfTransferEmployee(['pf_balance' => 10]);
    pfTransferLine($from);
    pfTransferLine($busy, [
        'employee_contribution' => 5,
        'employer_contribution' => 5,
        'credit_amount' => 10,
        'balance_after' => 10,
        'notes' => 'Already here',
        'reference_no' => 'BUSY',
    ]);

    expect(fn () => $service->transfer($from, $busy, 'Should fail'))
        ->toThrow(InvalidArgumentException::class);

    expect(EmployeePfTransaction::query()->where('employee_id', $from->id)->count())->toBe(1);

    $empty = pfTransferEmployee(['pf_balance' => 0, 'pf_enrolled' => false]);
    EmployeeLoan::query()->create([
        'employee_id' => $from->id,
        'loan_number' => 'PF-LOAN-XFER',
        'loan_type' => 'pf_loan',
        'loan_cycle' => 1,
        'principal_amount' => 1000,
        'interest_rate' => 0,
        'total_payable' => 1000,
        'installment_count' => 10,
        'installment_amount' => 100,
        'disbursement_date' => '2024-01-01',
        'first_installment_date' => '2024-02-01',
        'outstanding_balance' => 0,
        'status' => 'completed',
    ]);

    expect(fn () => $service->transfer($from, $empty, 'Loan should block'))
        ->toThrow(InvalidArgumentException::class);

    expect((float) $from->refresh()->pf_balance)->toBe(2000.0)
        ->and(PfAccountTransfer::query()->count())->toBe(0);
});

test('pf transfer requires the signed-in user password', function () {
    $user = User::query()->create([
        'name' => 'PF Tester',
        'username' => 'pf-transfer-tester',
        'email' => 'pf-transfer@example.test',
        'password' => 'password',
    ]);

    $from = pfTransferEmployee(['pf_balance' => 2000]);
    $to = pfTransferEmployee(['pf_balance' => 0, 'pf_enrolled' => false]);
    pfTransferLine($from);

    $this->actingAs($user);

    $denied = Request::create('/provident-fund/transfer', 'POST', [
        'from_employee_id' => $from->id,
        'to_employee_id' => $to->id,
        'reason' => 'Wrong person',
        'password' => 'not-the-password',
    ]);
    $denied->setUserResolver(fn () => $user);

    expect(fn () => app(ProvidentFundController::class)->transferStore($denied))
        ->toThrow(ValidationException::class);

    expect(EmployeePfTransaction::query()->where('employee_id', $from->id)->count())->toBe(1)
        ->and(PfAccountTransfer::query()->count())->toBe(0);

    $allowed = Request::create('/provident-fund/transfer', 'POST', [
        'from_employee_id' => $from->id,
        'to_employee_id' => $to->id,
        'reason' => 'Wrong person',
        'password' => 'password',
    ]);
    $allowed->setUserResolver(fn () => $user);

    $response = app(ProvidentFundController::class)->transferStore($allowed);

    expect($response->getTargetUrl())->toBe(route('provident-fund.transfer.index'))
        ->and((float) $from->refresh()->pf_balance)->toBe(0.0)
        ->and((float) $to->refresh()->pf_balance)->toBe(2000.0)
        ->and(PfAccountTransfer::query()->count())->toBe(1);
});
