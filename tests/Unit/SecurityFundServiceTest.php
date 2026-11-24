<?php

use App\Models\Employee;
use App\Models\EmployeeSecurityFundAccount;
use App\Models\EmployeeSecurityFundTransaction;
use App\Models\FinalClearance;
use App\Models\Separation;
use App\Models\SeparationFinalPayment;
use App\Services\EmployeeGratuityService;
use App\Services\EmployeeSecurityFundService;
use App\Services\FinalPaymentSettlementService;
use App\Support\SecurityFundProfileGuard;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    // Fail closed before any destructive schema operation.
    expect(DB::connection()->getDriverName())->toBe('sqlite');
    expect(config('database.connections.sqlite.database'))->toBe(':memory:');
    \Illuminate\Support\Facades\Event::fake();
    Schema::dropAllTables();
    Carbon::setTestNow(Carbon::parse('2027-07-10', 'Asia/Dhaka'));
    Schema::create('users', function ($table) {
        $table->id();
        $table->string('name')->nullable();
    });
    foreach (['branches', 'departments'] as $name) {
        Schema::create($name, function ($table) {
            $table->id();
            $table->string('name');
            $table->softDeletes();
        });
    }
    DB::table('users')->insert(['id' => 1, 'name' => 'Accounts']);
    Schema::create('employees', function ($table) {
        $table->id();
        $table->string('employee_id')->nullable();
        $table->string('pin')->nullable();
        $table->string('name_en')->nullable();
        $table->string('name_bn')->nullable();
        $table->string('status')->default('active');
        $table->unsignedBigInteger('current_branch_id')->nullable();
        $table->unsignedBigInteger('department_id')->nullable();
        $table->unsignedBigInteger('designation_id')->nullable();
        $table->date('joining_date')->nullable();
        $table->date('confirmation_date')->nullable();
        $table->date('dropout_date')->nullable();
        $table->date('resignation_date')->nullable();
        $table->date('final_payment_date')->nullable();
        $table->decimal('final_payment_amount', 15, 2)->nullable();
        $table->decimal('pf_balance', 15, 2)->default(0);
        $table->boolean('pf_enrolled')->default(false);
        $table->timestamps();
    });
    Schema::create('separations', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->date('separation_date');
        $table->string('reason')->nullable();
        $table->string('status')->default('completed');
        $table->date('final_payment_date')->nullable();
        $table->timestamps();
    });
    Schema::create('separation_final_payments', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('separation_id');
        $table->string('status');
        $table->decimal('pf_balance', 15, 2)->default(0);
        $table->decimal('gratuity_amount', 15, 2)->default(0);
        $table->boolean('gratuity_eligible')->default(false);
        $table->decimal('loan_outstanding', 15, 2)->default(0);
        $table->decimal('net_payable', 15, 2)->default(0);
        $table->json('breakdown')->nullable();
        $table->date('payment_date')->nullable();
        $table->unsignedBigInteger('paid_by')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->text('notes')->nullable();
        $table->timestamp('settlement_applied_at')->nullable();
        $table->json('settlement_refs')->nullable();
        $table->timestamps();
    });
    Schema::create('final_clearances', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id')->nullable();
        $table->string('status')->nullable();
        $table->unsignedBigInteger('separation_final_payment_id')->nullable();
        $table->decimal('staff_security', 15, 2)->default(0);
        foreach (['unpaid_salary', 'pf_amount', 'gratuity_amount', 'other_payable', 'pf_loan', 'motorcycle_loan', 'laptop_loan', 'other_loan', 'advance_received', 'total_payable', 'total_adjustable', 'net_payable'] as $column) {
            $table->decimal($column, 15, 2)->default(0);
        }
        $table->date('dropout_date')->nullable();
        $table->timestamps();
    });
    Schema::create('final_clearance_signatures', function ($table) {
        $table->id();
        $table->unsignedBigInteger('final_clearance_id');
        $table->unsignedBigInteger('user_id');
        $table->string('stage');
        $table->string('action');
        $table->text('comments')->nullable();
        $table->timestamp('signed_at')->nullable();
        $table->timestamps();
    });
    Schema::create('employee_loans', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('status')->default('active');
        $table->string('loan_number')->nullable();
        $table->decimal('outstanding_balance', 15, 2)->default(0);
        $table->string('loan_type')->default('other');
    });
    Schema::create('employee_gratuity_payments', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('status');
    });
    Schema::create('employee_collaterals', function ($table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->decimal('security_amount', 15, 2)->nullable();
        $table->decimal('collateral_interest', 8, 2)->nullable();
        $table->date('collateral_date')->nullable();
    });
    (require database_path('migrations/2026_11_18_120000_create_security_fund_tables.php'))->up();
    $gratuity = Mockery::mock(EmployeeGratuityService::class);
    $gratuity->shouldReceive('calculate')->andReturn([
        'eligible' => false, 'gratuity_amount' => 0, 'label' => 'Not eligible', 'completed_years' => 0, 'basic_multiplier' => 0,
    ]);
    app()->instance(EmployeeGratuityService::class, $gratuity);
});

afterEach(fn () => Carbon::setTestNow());

function securityEmployee(): Employee
{
    return Employee::withoutEvents(fn () => Employee::create(['name_en' => 'Security Fund Test', 'status' => 'active', 'pf_enrolled' => false]));
}

function securityAccount(Employee $employee, string $depositDate = '2026-05-20'): EmployeeSecurityFundAccount
{
    return app(EmployeeSecurityFundService::class)->create($employee, [
        'amount' => '20000.00', 'transaction_date' => $depositDate, 'idempotency_key' => 'test-create-'.$employee->id,
    ], 1);
}

test('account creation and deposits are idempotent and duplicate employee accounts are rejected', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    expect(securityAccount($employee)->id)->toBe($account->id);
    $data = ['amount' => '10000', 'transaction_date' => '2027-01-01', 'idempotency_key' => 'test-top-up'];
    $fund = app(EmployeeSecurityFundService::class);
    expect($fund->deposit($account, $data)->id)->toBe($fund->deposit($account, $data)->id);
    expect($fund->snapshot($employee, '2027-06-30')['total'])->toBe('31200.00');
    $fund->create($employee, ['amount' => '10', 'transaction_date' => '2027-01-01', 'idempotency_key' => 'another-key']);
})->throws(ValidationException::class, 'already has');

test('partial posting and annual posting never duplicate interest including rounding', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $fund = app(EmployeeSecurityFundService::class);
    $first = $fund->postInterest($account, '2027-05-31', 'interest-first', 1);
    expect($first->interest_credit)->toBe('1100.00');
    expect($fund->postInterest($account, '2027-05-31', 'interest-first', 1)->id)->toBe($first->id);
    expect($fund->postInterest($account, '2027-05-31', 'different-key', 1))->toBeNull();
    expect($fund->postInterest($account, '2027-06-30', 'interest-rest', 1)->interest_credit)->toBe('100.00');
    expect($fund->snapshot($employee, '2027-06-30')['interest'])->toBe('1200.00');
});

test('refund creates separate principal and interest debits and recalculates future earning', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee, '2025-05-20');
    $fund = app(EmployeeSecurityFundService::class);
    $fund->refund($account, ['principal' => '10000', 'interest' => '200', 'transaction_date' => '2027-01-01', 'idempotency_key' => 'refund-test'], 1);
    $snapshot = $fund->snapshot($employee, '2027-06-30');
    expect($snapshot['principal'])->toBe('10000.00')->and($snapshot['interest'])->toBe('700.00');
});

test('posted periods cannot accept backdated deposits', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $fund = app(EmployeeSecurityFundService::class);
    $fund->postInterest($account, '2027-05-31', 'interest-first', 1);
    $fund->deposit($account, ['amount' => '100', 'transaction_date' => '2027-05-01', 'idempotency_key' => 'backdate'], 1);
})->throws(ValidationException::class, 'already posted');

test('interest can be refunded on its posting day without changing principal or duplicating accrual', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $fund = app(EmployeeSecurityFundService::class);
    $fund->postInterest($account, '2027-05-31', 'same-day-interest', 1);
    $refund = ['principal' => '0', 'interest' => '1100.00', 'transaction_date' => '2027-05-31', 'idempotency_key' => 'same-day-interest-refund'];
    $fund->refund($account, $refund, 1);
    $fund->refund($account, $refund, 1);
    $snapshot = $fund->snapshot($employee, '2027-05-31');
    expect($snapshot['principal'])->toBe('20000.00')->and($snapshot['interest'])->toBe('0.00');
    expect(EmployeeSecurityFundTransaction::where('type', 'interest')->count())->toBe(1)
        ->and(EmployeeSecurityFundTransaction::where('type', 'refund')->count())->toBe(1);
});

test('final payment includes security fund and settles it exactly once', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $employee->update(['status' => 'inactive', 'dropout_date' => '2027-06-30']);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2027-06-30', 'status' => 'completed']);
    $service = app(FinalPaymentSettlementService::class);
    $payment = $service->ensureForSeparation($separation, 1);
    expect($payment->security_principal)->toBe('20000.00')->and($payment->security_interest)->toBe('1200.00')->and($payment->net_payable)->toBe('21200.00');
    $paid = $service->markPaid($payment, Carbon::parse('2027-07-05'), null, 1);
    $service->markPaid($payment, Carbon::parse('2027-07-05'), null, 1);
    $service->applySettlements($paid, 1);
    $fund = app(EmployeeSecurityFundService::class)->snapshot($employee->fresh(), '2027-07-10');
    expect($fund['principal'])->toBe('0.00');
    expect($fund['interest'])->toBe('0.00')->and($account->fresh()->status)->toBe('closed');
    expect(EmployeeSecurityFundTransaction::where('type', 'final_settlement')->count())->toBe(1);
    $original = $paid->breakdown;
    $service->refreshSnapshot($paid);
    expect($paid->fresh()->breakdown)->toBe($original);
});

test('stale clearance security values fail before any settlement is applied', function () {
    $employee = securityEmployee();
    securityAccount($employee);
    $employee->update(['status' => 'inactive', 'dropout_date' => '2027-06-30']);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2027-06-30', 'status' => 'completed']);
    $service = app(FinalPaymentSettlementService::class);
    $payment = $service->ensureForSeparation($separation, 1);
    try {
        $service->markPaid($payment, Carbon::parse('2027-07-05'), null, 1, new FinalClearance(['staff_security' => 0, 'staff_security_interest' => 0]));
        test()->fail('Expected stale snapshot validation.');
    } catch (ValidationException) {
        expect($payment->fresh()->status)->toBe('pending');
        expect(EmployeeSecurityFundTransaction::where('type', 'final_settlement')->count())->toBe(0);
    }
});

test('early departure stays ineligible even when payment occurs after the deposit anniversary', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $employee->update(['status' => 'inactive', 'dropout_date' => '2027-05-19']);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2027-05-19', 'status' => 'completed']);
    $service = app(FinalPaymentSettlementService::class);
    $payment = $service->ensureForSeparation($separation, 1);
    expect($payment->security_interest)->toBe('0.00')->and($payment->net_payable)->toBe('20000.00');
    $service->markPaid($payment, Carbon::parse('2027-05-25'), null, 1);
    expect($account->fresh()->status)->toBe('closed');
    expect(app(EmployeeSecurityFundService::class)->snapshot($employee->fresh(), '2027-06-30')['interest'])->toBe('0.00');
    expect(EmployeeSecurityFundTransaction::where('type', 'interest')->count())->toBe(0);
});

test('departure on the first anniversary uses the actual date for eligibility and the prior month for interest', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $employee->update(['status' => 'inactive', 'dropout_date' => '2027-05-20']);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2027-05-20', 'status' => 'completed']);
    $service = app(FinalPaymentSettlementService::class);
    $payment = $service->ensureForSeparation($separation, 1);
    expect($payment->security_interest)->toBe('1000.00')
        ->and($payment->security_interest_as_of->toDateString())->toBe('2027-04-30')
        ->and($payment->breakdown['security_fund']['eligibility_as_of'])->toBe('2027-05-20');
    $service->markPaid($payment, Carbon::parse('2027-05-25'), null, 1);
    expect($account->fresh()->interest_cutoff->toDateString())->toBe('2027-05-20');
    expect(app(EmployeeSecurityFundService::class)->snapshot($employee->fresh(), '2027-06-30')['total'])->toBe('0.00');
});

test('final payment excludes an incomplete December and includes a completed December', function (string $departure, string $interest, string $paymentDate) {
    $employee = securityEmployee();
    securityAccount($employee, '2025-05-20');
    $employee->update(['status' => 'inactive', 'dropout_date' => $departure]);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => $departure, 'status' => 'completed']);
    $service = app(FinalPaymentSettlementService::class);
    $payment = $service->ensureForSeparation($separation, 1);
    expect($payment->security_interest)->toBe($interest);
    $paid = $service->markPaid($payment, Carbon::parse($paymentDate), null, 1);
    expect($paid->security_interest)->toBe($interest);
    expect(app(EmployeeSecurityFundService::class)->snapshot($employee->fresh(), '2027-06-30')['total'])->toBe('0.00');
})->with([['2026-12-30', '500.00', '2027-01-05'], ['2026-12-31', '600.00', '2027-01-05'], ['2026-12-31', '600.00', '2026-12-31']]);

test('interest cannot be posted before any deposit has completed its first year', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $fund = app(EmployeeSecurityFundService::class);
    expect($fund->postInterest($account, '2027-05-19', 'too-early', 1))->toBeNull();
    expect(EmployeeSecurityFundTransaction::count())->toBe(1);
    expect(\App\Models\SecurityFundInterestRun::count())->toBe(0);
    expect($fund->snapshot($employee, '2027-05-19')['next_eligibility_date'])->toBe('2027-05-20');
});

test('early principal refund permanently forfeits that portion while anniversary refund can pay whole-taka interest', function (string $date, string $interest) {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $fund = app(EmployeeSecurityFundService::class);
    $fund->refund($account, ['principal' => '20000', 'interest' => $interest, 'transaction_date' => $date, 'idempotency_key' => 'anniversary-refund'], 1);
    $snapshot = $fund->snapshot($employee, '2027-06-30');
    expect($snapshot['principal'])->toBe('0.00')->and($snapshot['interest'])->toBe('0.00');
    expect((string) EmployeeSecurityFundTransaction::where('type', 'refund')->first()->interest_debit)->toBe($interest.'.00');
})->with([['2027-05-19', '0'], ['2027-05-20', '1000']]);

test('interest refunds cannot introduce fractional taka', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee, '2025-05-20');
    $fund = app(EmployeeSecurityFundService::class);
    try {
        $fund->refund($account, ['principal' => '0', 'interest' => '100.50', 'transaction_date' => '2026-12-30', 'idempotency_key' => 'fractional-refund'], 1);
        test()->fail('Expected whole-taka validation.');
    } catch (ValidationException $exception) {
        expect($exception->errors())->toHaveKey('interest');
        expect(EmployeeSecurityFundTransaction::count())->toBe(1);
    }
});

test('dry run and repeated import preserve historical paid security', function () {
    $employee = securityEmployee();
    DB::table('employee_collaterals')->insert(['employee_id' => $employee->id, 'security_amount' => 20000, 'collateral_date' => '2026-05-20']);
    test()->artisan('staff-fund:import-security-fund', ['--dry-run' => true])->assertSuccessful();
    expect(EmployeeSecurityFundAccount::count())->toBe(0);
    test()->artisan('staff-fund:import-security-fund', ['--apply' => true])->assertSuccessful();
    test()->artisan('staff-fund:import-security-fund', ['--apply' => true])->assertSuccessful();
    expect(EmployeeSecurityFundAccount::count())->toBe(1)->and(EmployeeSecurityFundTransaction::count())->toBe(1);
});

test('profile requests cannot introduce new security money outside the ledger', function () {
    SecurityFundProfileGuard::check(Request::create('/employees', 'POST', ['collateral' => ['security_amount' => '20000']]));
})->throws(ValidationException::class, 'Manage Security Fund');

function securityWebUser(array $permissions = ['staff-fund.view'], ?Employee $employee = null): \App\Models\User
{
    test()->withoutMiddleware([
        \App\Http\Middleware\HandleInertiaRequests::class,
        \App\Http\Middleware\ActivateScheduledHrActions::class,
        \App\Http\Middleware\EnsureMovementFinePaid::class,
    ]);
    $user = new \App\Models\User;
    $user->forceFill(['id' => 1, 'name' => 'Accounts test', 'account_type' => 'staff']);
    $user->setRelation('role', new \App\Models\Role(['name' => 'Test Accounts', 'permissions' => $permissions]));
    $user->setRelation('roles', collect());
    $user->setRelation('employee', $employee);
    test()->actingAs($user);

    return $user;
}

test('view permission does not allow Create or posting and export needs export permission', function () {
    securityWebUser();
    test()->post('/security-fund', [])->assertRedirect();
    test()->post('/security-fund/interest', [])->assertRedirect();
    test()->get('/security-fund/reports/excel')->assertForbidden();
    expect(EmployeeSecurityFundAccount::count())->toBe(0);
});

test('register lookup and exports use the real controller and include separate interest', function () {
    test()->withoutExceptionHandling();
    $employee = securityEmployee();
    securityAccount($employee);
    securityWebUser(['staff-fund.view', 'staff-fund.create', 'reports.export']);
    test()->getJson('/security-fund/employees/lookup')->assertOk()->assertExactJson([]);
    test()->withHeader('X-Inertia', 'true')->get('/security-fund?as_of=2027-06-30')->assertOk()
        ->assertJsonPath('props.accounts.data.0.principal', '20000.00')
        ->assertJsonPath('props.accounts.data.0.interest', '1200.00');
    $excel = test()->get('/security-fund/reports/excel?as_of=2027-06-30')->assertOk();
    expect(substr($excel->getContent(), 0, 2))->toBe('PK');
    test()->get('/security-fund/reports/print?as_of=2027-06-30')->assertOk()->assertSee('20,000.00')->assertSee('1,200');
    $pdf = test()->get('/security-fund/reports/pdf?as_of=2027-06-30')->assertOk();
    expect(substr($pdf->getContent(), 0, 4))->toBe('%PDF');
});

test('employee self service cannot access another account ledger', function () {
    $employee = securityEmployee();
    $other = securityEmployee();
    $otherAccount = securityAccount($other);
    $user = securityWebUser([], $employee);
    // Section visibility is assigned through the existing role permissions.
    $user->role->permissions = ['staff-fund.view'];
    $user->account_type = 'branch';
    $user->branch_id = 999;
    test()->get('/security-fund/'.$otherAccount->id.'/ledger')->assertForbidden();
});

test('linked reversals allow correcting entries in reverse order without deleting history', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $fund = app(EmployeeSecurityFundService::class);
    $deposit = $account->transactions()->first();
    $interest = $fund->postInterest($account, '2027-05-31', 'reverse-interest', 1);
    $fund->reverse($account, $interest, 'Reverse incorrect period posting', 1);
    $fund->reverse($account, $deposit, 'Reverse original deposit receipt', 1);
    expect(EmployeeSecurityFundTransaction::count())->toBe(4);
    expect($fund->snapshot($employee, '2027-06-30')['total'])->toBe('0.00');
    $fund->deposit($account, ['amount' => '20000', 'transaction_date' => '2026-05-20', 'idempotency_key' => 'corrected-opening'], 1);
    expect($fund->snapshot($employee, '2027-06-30')['total'])->toBe('21200.00');
});

test('clearance approval uses the same component snapshot before settling and keeps other benefits', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $employee->update(['status' => 'inactive', 'dropout_date' => '2027-06-30']);
    Separation::create(['employee_id' => $employee->id, 'separation_date' => '2027-06-30', 'status' => 'completed']);
    $clearance = FinalClearance::create([
        'employee_id' => $employee->id, 'status' => FinalClearance::STATUS_ED,
        'staff_security' => '20000', 'staff_security_interest' => '1200', 'dropout_date' => '2027-06-30',
        'unpaid_salary' => '5000', 'other_payable' => '300', 'advance_received' => '100',
    ]);
    $service = app(\App\Services\FinalClearanceService::class);
    $service->recomputeTotals($clearance);
    $clearance->save();
    $user = new \App\Models\User;
    $user->forceFill(['id' => 1]);
    $approved = $service->approve($clearance, $user, 'Reviewed and approved');
    $payment = SeparationFinalPayment::findOrFail($approved->separation_final_payment_id);
    expect($payment->net_payable)->toBe('26400.00')->and($payment->breakdown['components']['net_payable'])->toBe('26400.00');
    expect($approved->net_payable)->toBe($payment->net_payable)->and($account->fresh()->status)->toBe('closed');
    expect($service->approve($clearance, $user)->id)->toBe($approved->id);
    expect(EmployeeSecurityFundTransaction::where('type', 'final_settlement')->count())->toBe(1);
});

test('Create endpoint selects an existing employee and validates money before writing', function () {
    $employee = securityEmployee();
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $data = ['employee_id' => $employee->id, 'amount' => '20000', 'transaction_date' => '2026-05-20', 'reference_no' => 'REC-1', 'notes' => 'Original deposit receipt', 'idempotency_key' => (string) \Illuminate\Support\Str::uuid()];
    test()->post('/security-fund', $data)->assertRedirect();
    test()->post('/security-fund', $data)->assertRedirect();
    expect(EmployeeSecurityFundAccount::count())->toBe(1)->and(EmployeeSecurityFundTransaction::count())->toBe(1);
});

test('Create endpoint allows optional receipt number and notes, and auto generates receipt number', function () {
    $employee = securityEmployee();
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $data = [
        'employee_id' => $employee->id,
        'amount' => '15000',
        'transaction_date' => '2026-05-20',
        'idempotency_key' => (string) \Illuminate\Support\Str::uuid(),
    ];
    test()->post('/security-fund', $data)->assertRedirect();
    $tx = EmployeeSecurityFundTransaction::where('type', 'deposit')->latest('id')->first();
    expect($tx)->not->toBeNull()
        ->and($tx->reference_no)->toBe('SF-REC-2026-0001')
        ->and($tx->notes)->toBeNull();

    // Second employee deposit auto increments receipt number
    $employee2 = securityEmployee();
    $data2 = [
        'employee_id' => $employee2->id,
        'amount' => '10000',
        'transaction_date' => '2026-05-20',
        'idempotency_key' => (string) \Illuminate\Support\Str::uuid(),
    ];
    test()->post('/security-fund', $data2)->assertRedirect();
    $tx2 = EmployeeSecurityFundTransaction::where('account_id', $employee2->securityFundAccount->id)->first();
    expect($tx2)->not->toBeNull()
        ->and($tx2->reference_no)->toBe('SF-REC-2026-0002');
});

test('posting endpoint rejects a stale preview and cannot duplicate interest', function () {
    $employee = securityEmployee();
    securityAccount($employee);
    securityWebUser(['staff-fund.view', 'staff-fund.edit']);
    $preview = test()->postJson('/security-fund/interest/preview', ['cutoff_date' => '2027-06-30'])->assertOk()->json();
    $data = ['cutoff_date' => '2027-06-30', 'fingerprint' => $preview['fingerprint'], 'idempotency_key' => (string) \Illuminate\Support\Str::uuid()];
    test()->post('/security-fund/interest', $data)->assertRedirect();
    test()->postJson('/security-fund/interest', $data)->assertUnprocessable();
    expect(EmployeeSecurityFundTransaction::where('type', 'interest')->count())->toBe(1);
});

test('self-service ledger always resolves the authenticated employee without accepting another id', function () {
    $employee = securityEmployee();
    securityAccount($employee);
    $other = securityEmployee();
    securityAccount($other);
    securityWebUser([], $employee);
    test()->withHeader('X-Inertia', 'true')->get('/employee/staff-fund/security-fund?employee_id='.$other->id)->assertOk()
        ->assertJsonPath('props.account.id', $employee->securityFundAccount->id)->assertJsonPath('props.canEdit', false);
});

test('profile metadata updates preserve omitted legacy financial fields', function () {
    $employee = securityEmployee();
    DB::table('employee_collaterals')->insert(['employee_id' => $employee->id, 'security_amount' => '20000', 'collateral_date' => '2026-05-20']);
    $request = Request::create('/employees/'.$employee->id, 'PUT', ['collateral' => ['notes' => 'New certificate note']]);
    $route = new \Illuminate\Routing\Route(['PUT'], 'employees/{employee}', fn () => null);
    $route->bind($request);
    $route->setParameter('employee', $employee);
    $request->setRouteResolver(fn () => $route);
    SecurityFundProfileGuard::check($request);
    expect((float) $request->input('collateral.security_amount'))->toBe(20000.0)
        ->and($request->input('collateral.collateral_date'))->toBe('2026-05-20');
});

test('paid legacy collateral and clearance never create new principal or interest', function () {
    $employee = securityEmployee();
    $employee->update(['status' => 'inactive', 'final_payment_date' => '2026-10-01']);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2026-09-30', 'status' => 'completed']);
    $payment = SeparationFinalPayment::create(['employee_id' => $employee->id, 'separation_id' => $separation->id, 'status' => 'paid', 'net_payable' => 20000]);
    DB::table('employee_collaterals')->insert(['employee_id' => $employee->id, 'security_amount' => 20000, 'collateral_date' => '2026-05-20']);
    DB::table('final_clearances')->insert(['employee_id' => $employee->id, 'status' => 'approved', 'staff_security' => 20000, 'separation_final_payment_id' => $payment->id]);
    test()->artisan('staff-fund:import-security-fund', ['--apply' => true])->assertFailed();
    expect(EmployeeSecurityFundAccount::count())->toBe(0)->and($payment->fresh()->net_payable)->toBe('20000.00');
});

test('a later settlement failure rolls back the Security Fund debit and interest posting', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    $employee->update(['status' => 'inactive', 'dropout_date' => '2027-06-30']);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2027-06-30', 'status' => 'completed']);
    DB::table('employee_loans')->insert(['employee_id' => $employee->id, 'status' => 'active', 'outstanding_balance' => 1000, 'loan_type' => 'other']);
    $loans = Mockery::mock(\App\Services\LoanCollectionService::class);
    $loans->shouldReceive('processFinalPaymentRecovery')->once()->andThrow(new RuntimeException('Recovery unavailable'));
    app()->instance(\App\Services\LoanCollectionService::class, $loans);
    $service = app(FinalPaymentSettlementService::class);
    $payment = $service->ensureForSeparation($separation, 1);
    try {
        $service->markPaid($payment, Carbon::parse('2027-07-05'), null, 1);
        test()->fail('Expected recovery failure.');
    } catch (RuntimeException $error) {
        expect($error->getMessage())->toBe('Recovery unavailable');
        expect($payment->fresh()->status)->toBe('pending')->and($account->fresh()->status)->toBe('open');
        expect(EmployeeSecurityFundTransaction::count())->toBe(1);
    }
});

function securityImportFile(array $rows, array $headers = ['PIN', 'Name', 'Deposit Date', 'Amount']): \Illuminate\Http\UploadedFile
{
    $values = array_map(fn ($row) => array_map(fn ($cell) => "\0".(string) $cell, $row), array_merge([$headers], $rows));

    return \Illuminate\Http\UploadedFile::fake()->createWithContent('security-deposits.xlsx', (string) \Shuchkin\SimpleXLSXGen::fromArray($values));
}

function securityImportEmployee(string $pin): Employee
{
    $employee = securityEmployee();
    $employee->update(['pin' => $pin, 'employee_id' => 'EMP-'.$pin, 'name_en' => 'Saved Employee '.$pin]);

    return $employee;
}

function securityModifyImportFile(\Illuminate\Http\UploadedFile $file, callable $modify): \Illuminate\Http\UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'sf-xlsx-test-');
    copy($file->getRealPath(), $path);
    try {
        $zip = new ZipArchive;
        $zip->open($path);
        $modify($zip);
        $zip->close();

        return \Illuminate\Http\UploadedFile::fake()->createWithContent('modified.xlsx', file_get_contents($path));
    } finally {
        unlink($path);
    }
}

test('Excel upload links by PIN, preserves employee names and reports unmatched rows', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    $employee = securityImportEmployee('00123');
    securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $response = test()->post('/security-fund/import', ['file' => securityImportFile([
        ['00123', 'Name from Excel', '2026-05-20', '20,000.00'],
        ['99999', 'Unmatched Name', '2026-05-20', '5000'],
    ])])->assertRedirect();
    $url = $response->headers->get('Location');
    test()->withHeader('X-Inertia', 'true')->get($url.'&status=all')->assertOk()
        ->assertJsonPath('props.result.imported', 1)->assertJsonPath('props.result.failed', 1)->assertJsonPath('props.result.skipped', 0)
        ->assertJsonPath('props.rows.data.0.pin', '00123')->assertJsonPath('props.rows.data.0.employee_name', 'Saved Employee 00123')
        ->assertJsonPath('props.rows.data.1.status', 'failed');
    expect($employee->fresh()->name_en)->toBe('Saved Employee 00123');
    expect(EmployeeSecurityFundAccount::first()->employee_id)->toBe($employee->id);
    expect(EmployeeSecurityFundTransaction::first()->principal_credit)->toBe('20000.00');
    expect(app(EmployeeSecurityFundService::class)->snapshot($employee, '2027-06-30')['interest'])->toBe('1200.00');
    $path = parse_url($url, PHP_URL_PATH);
    $failed = test()->get($path.'/failures')->assertOk();
    $download = \Illuminate\Http\UploadedFile::fake()->createWithContent('failures.xlsx', $failed->getContent());
    $rows = \App\Support\SimpleXlsxReader::sheetRows($download->getRealPath());
    expect($rows[1][0])->toBe('99999')->and($rows[1][4])->toContain('PIN');
});

test('Excel template and upload permission are available only to fund writers', function () {
    securityWebUser();
    test()->get('/security-fund/import')->assertRedirect();
    test()->post('/security-fund/import', ['file' => securityImportFile([['123', 'Name', '2026-05-20', '100']])])->assertRedirect();
    expect(EmployeeSecurityFundAccount::count())->toBe(0);
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $template = test()->get('/security-fund/import/template')->assertOk();
    $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('template.xlsx', $template->getContent());
    expect(\App\Support\SimpleXlsxReader::sheetRows($file->getRealPath())[0])->toBe(['PIN', 'Name', 'Deposit Date', 'Amount']);
});

test('reuploading or repeating the same deposit cannot credit the fund twice', function () {
    $employee = securityImportEmployee('PIN1');
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $file = securityImportFile([
        ['PIN1', 'Name A', '2026-05-20', '20000'],
        ['pin1', 'Name B', '20/05/2026', '20,000.00'],
    ]);
    $service = app(\App\Services\SecurityFundExcelImportService::class);
    $first = $service->import($file->getRealPath(), 'first.xlsx', $user);
    $again = $service->import($file->getRealPath(), 'renamed.xlsx', $user);
    expect($first['imported'])->toBe(1)->and($first['skipped'])->toBe(1);
    expect($again['imported'])->toBe(0)->and($again['skipped'])->toBe(2);
    expect(EmployeeSecurityFundTransaction::count())->toBe(1)
        ->and(app(EmployeeSecurityFundService::class)->snapshot($employee)['principal'])->toBe('20000.00');
});

test('existing manual deposits are skipped and new imported top ups use edit permission', function () {
    $employee = securityImportEmployee('PIN1');
    securityAccount($employee);
    $file = securityImportFile([['PIN1', 'Name', '2026-05-20', '20000'], ['PIN1', 'Name', '2026-08-01', '10000']]);
    $service = app(\App\Services\SecurityFundExcelImportService::class);
    $creator = securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $result = $service->import($file->getRealPath(), 'deposits.xlsx', $creator);
    expect($result['skipped'])->toBe(1)->and($result['failed'])->toBe(1)->and($result['rows'][1]['message'])->toContain('edit permission');
    $editor = securityWebUser(['staff-fund.view', 'staff-fund.edit']);
    $result = $service->import($file->getRealPath(), 'deposits.xlsx', $editor);
    expect($result['skipped'])->toBe(1)->and($result['imported'])->toBe(1);
    expect(EmployeeSecurityFundTransaction::count())->toBe(2);
});

test('deposits in any Excel order are posted chronologically and results retain original row numbers', function () {
    $employee = securityImportEmployee('PIN1');
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $file = securityImportFile([['PIN1', 'Name', '2026-08-01', '10000'], ['PIN1', 'Name', '2026-05-20', '20000']]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'deposits.xlsx', $user);
    expect($result['imported'])->toBe(2)->and($result['rows'][0]['row'])->toBe(2)->and($result['rows'][0]['deposit_date'])->toBe('2026-08-01');
    expect(EmployeeSecurityFundTransaction::orderBy('id')->first()->transaction_date->toDateString())->toBe('2026-05-20');
    expect(app(EmployeeSecurityFundService::class)->snapshot($employee, '2027-06-30')['interest'])->toBe('1200.00');
});

test('ambiguous PIN, employee ID substitutes and lost leading zeros are failed without guessing', function () {
    securityImportEmployee('DUP');
    securityImportEmployee('DUP');
    securityImportEmployee('00123');
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $file = securityImportFile([['DUP', 'Name', '2026-05-20', '100'], ['EMP-00123', 'Name', '2026-05-20', '100'], ['123', 'Name', '2026-05-20', '100']]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'deposits.xlsx', $user);
    expect($result['failed'])->toBe(3)->and($result['rows'][0]['message'])->toContain('Multiple employees');
    expect(EmployeeSecurityFundAccount::count())->toBe(0);
});

test('invalid Excel dates and amounts fail row by row while valid rows are retained', function () {
    securityImportEmployee('PIN1');
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $file = securityImportFile([
        ['PIN1', 'Name', '2026-02-30', '100'], ['PIN1', 'Name', '31/02/2026', '100'],
        ['PIN1', 'Name', '2099-01-01', '100'], ['PIN1', 'Name', '2026-05-20', '0'],
        ['PIN1', 'Name', '2026-05-20', '-1'], ['PIN1', 'Name', '2026-05-20', '1.234'],
        ['PIN1', '', '2026-05-20', '100'], ['PIN1', 'Name', '2026-05-20', '100.55'],
    ]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'deposits.xlsx', $user);
    expect($result['failed'])->toBe(7)->and($result['imported'])->toBe(1);
    expect(EmployeeSecurityFundTransaction::first()->principal_credit)->toBe('100.55');
});

test('Excel serial dates and the 1904 workbook calendar are parsed correctly', function (bool $date1904) {
    securityImportEmployee('PIN1');
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $base = $date1904 ? '1904-01-01' : '1899-12-30';
    $serial = (int) Carbon::parse($base)->diffInDays(Carbon::parse('2026-05-20'));
    $file = securityImportFile([['PIN1', 'Name', $serial, '100']]);
    $file = securityModifyImportFile($file, function (ZipArchive $zip) use ($date1904, $serial) {
        if ($date1904) {
            $workbook = $zip->getFromName('xl/workbook.xml');
            $workbook = preg_replace('/<workbookPr\b[^>]*\/?\s*>/', '<workbookPr date1904="1"/>', $workbook, 1, $count);
            if (! $count) {
                $workbook = str_replace('<sheets>', '<workbookPr date1904="1"/><sheets>', $workbook);
            }
            $zip->addFromString('xl/workbook.xml', $workbook);
        }
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $sheet = preg_replace('/<c r="C2"[^>]*>.*?<\/c>/s', '<c r="C2"><v>'.$serial.'</v></c>', $sheet);
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheet);
    });
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'dates.xlsx', $user);
    expect($result['imported'])->toBe(1)->and($result['rows'][0]['deposit_date'])->toBe('2026-05-20');
})->with([false, true]);

test('formula cells fail and sparse worksheets retain the actual Excel row number', function () {
    securityImportEmployee('PIN1');
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $file = securityImportFile([['PIN1', 'Name', '2026-05-20', '100']]);
    $file = securityModifyImportFile($file, function (ZipArchive $zip) {
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $sheet = preg_replace('/<c r="D2"[^>]*>.*?<\/c>/s', '<c r="D2"><f>50+50</f><v>100</v></c>', $sheet);
        $sheet = preg_replace('/r="([A-Z]*)2"/', 'r="${1}10"', $sheet);
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheet);
    });
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'formula.xlsx', $user);
    expect($result['failed'])->toBe(1)->and($result['rows'][0]['row'])->toBe(10)->and($result['rows'][0]['message'])->toContain('Formula');
});

test('invalid workbook headers reject the file before writing any deposits', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    securityImportEmployee('PIN1');
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    test()->post('/security-fund/import', ['file' => securityImportFile([['PIN1', 'Name', '2026-05-20', '100']], ['PIN', 'Name', 'Date', 'Amount'])])->assertSessionHasErrors('file');
    expect(EmployeeSecurityFundTransaction::count())->toBe(0);
    expect(\Illuminate\Support\Facades\Storage::disk('local')->allFiles())->toBe([]);
});

test('import result files are private to the uploading user', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    securityImportEmployee('PIN1');
    $owner = securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $response = test()->post('/security-fund/import', ['file' => securityImportFile([['PIN1', 'Name', '2026-05-20', '100']])])->assertRedirect();
    $url = parse_url($response->headers->get('Location'), PHP_URL_PATH);
    $other = clone $owner;
    $other->forceFill(['id' => 2]);
    test()->actingAs($other);
    test()->get($url)->assertNotFound();
    test()->get($url.'/failures')->assertNotFound();
});

test('legacy payment dates allow import while closed accounts and posted periods remain protected', function () {
    $closed = securityImportEmployee('CLOSED');
    $closedAccount = securityAccount($closed);
    $closedAccount->update(['status' => 'closed']);
    $paid = securityImportEmployee('PAID');
    $paid->update(['final_payment_date' => '2027-06-30']);
    $posted = securityImportEmployee('POSTED');
    $postedAccount = securityAccount($posted);
    app(EmployeeSecurityFundService::class)->postInterest($postedAccount, '2027-05-31', 'import-test-interest', 1);
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $file = securityImportFile([['CLOSED', 'Name', '2027-06-01', '100'], ['PAID', 'Name', '2026-05-20', '100'], ['POSTED', 'Name', '2027-05-01', '100']]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'protected.xlsx', $user);
    expect($result['failed'])->toBe(2)->and($result['imported'])->toBe(1);
    expect(EmployeeSecurityFundTransaction::count())->toBe(4);
    expect($paid->fresh()->final_payment_date->toDateString())->toBe('2027-06-30');
});

test('inactive employees with no separation date import principal and top ups without inventing dates or interest', function () {
    $employee = securityImportEmployee('1057');
    $employee->update(['status' => 'inactive']);
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit', 'reports.export']);
    $file = securityImportFile([
        ['1057', 'Md. Hafizur Rahman', '11/10/2025', '20000'],
        ['1057', 'Md. Hafizur Rahman', '11/11/2025', '5000'],
    ]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'inactive.xlsx', $user);
    expect($result['imported'])->toBe(2)->and($result['failed'])->toBe(0)
        ->and($result['rows'][0]['message'])->toContain('Confirm the separation date');
    $account = $employee->securityFundAccount()->firstOrFail();
    $snapshot = app(EmployeeSecurityFundService::class)->accountSnapshot($account, '2027-06-30');
    expect($snapshot['principal'])->toBe('25000.00')->and($snapshot['total'])->toBe('25000.00')
        ->and($snapshot['interest'])->toBe('0.00')->and($snapshot['interest_as_of'])->toBeNull()
        ->and($snapshot['interest_calculation_deferred'])->toBeTrue();
    expect($employee->fresh()->dropout_date)->toBeNull()->and($employee->fresh()->resignation_date)->toBeNull()
        ->and(Separation::count())->toBe(0)->and(SeparationFinalPayment::count())->toBe(0);
    expect(app(EmployeeSecurityFundService::class)->postInterest($account, '2027-06-30', 'pending-date', 1))->toBeNull();
    test()->withHeader('X-Inertia', 'true')->get('/security-fund?as_of=2027-06-30')->assertOk()
        ->assertJsonPath('props.accounts.data.0.principal', '25000.00')->assertJsonPath('props.summary.principal', '25000.00')
        ->assertJsonPath('props.summary.review_count', 1);
    test()->get('/security-fund/'.$account->id.'/ledger?as_of=2027-06-30')->assertOk()
        ->assertJsonPath('props.snapshot.interest_calculation_deferred', true);
    test()->withHeader('X-Inertia', 'false')->get('/security-fund/reports/print?as_of=2027-06-30')->assertOk()
        ->assertSee('25,000.00')->assertSee('unverified interest has not been added');
    $employee->update(['dropout_date' => '2027-06-30']);
    $verified = app(EmployeeSecurityFundService::class)->accountSnapshot($account->fresh(), '2027-06-30');
    expect($verified['principal'])->toBe('25000.00')->and($verified['interest'])->toBe('1500.00')
        ->and($verified)->not->toHaveKey('interest_calculation_deferred');
});

test('generic paid final payment does not block a separate Security Fund deposit', function () {
    $employee = securityImportEmployee('0742');
    $employee->update(['final_payment_date' => '2023-11-09']);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2023-11-08', 'status' => 'completed']);
    $payment = SeparationFinalPayment::create(['employee_id' => $employee->id, 'separation_id' => $separation->id, 'status' => 'paid', 'net_payable' => 10000]);
    $before = $payment->fresh()->getRawOriginal();
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $file = securityImportFile([['0742', 'Md. Firoz Islam', '02/07/2023', '20000']]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import(
        $file->getRealPath(), 'legacy-date.xlsx', $user,
    );
    expect($result['imported'])->toBe(1)->and($employee->securityFundAccount()->first()->transactions()->first()->principal_credit)->toBe('20000.00')
        ->and($payment->fresh()->getRawOriginal())->toBe($before)->and($employee->fresh()->status)->toBe('active');
});

test('active employee with a legacy final payment date remains selectable for manual creation', function () {
    $employee = securityImportEmployee('0742');
    $employee->update(['final_payment_date' => '2023-11-09']);
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    test()->getJson('/security-fund/employees/lookup')->assertOk()->assertJsonPath('0.pin', '0742');
    test()->post('/security-fund', [
        'employee_id' => $employee->id, 'amount' => '20000', 'transaction_date' => '2023-07-02',
        'reference_no' => 'LEGACY-DATE-RECEIPT', 'notes' => 'Deposit independently verified by Accounts',
        'idempotency_key' => (string) \Illuminate\Support\Str::uuid(),
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($employee->securityFundAccount()->first()->transactions()->first()->principal_credit)->toBe('20000.00');
});

test('a paid Security Fund settlement still prevents another imported deposit', function () {
    $employee = securityImportEmployee('SETTLED');
    $account = securityAccount($employee);
    $separation = Separation::create(['employee_id' => $employee->id, 'separation_date' => '2027-06-30', 'status' => 'completed']);
    SeparationFinalPayment::create(['employee_id' => $employee->id, 'separation_id' => $separation->id, 'status' => 'paid', 'security_fund_account_id' => $account->id]);
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $file = securityImportFile([['SETTLED', 'Name', '2027-07-01', '100']]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import(
        $file->getRealPath(), 'settled.xlsx', $user,
    );
    expect($result['failed'])->toBe(1)->and($result['rows'][0]['message'])->toContain('settled Security Fund')
        ->and(EmployeeSecurityFundTransaction::count())->toBe(1);
});

test('interest batches skip an undated inactive employee and post verified accounts', function () {
    $verified = securityImportEmployee('VERIFIED');
    securityAccount($verified);
    $inactive = securityImportEmployee('INACTIVE');
    $inactive->update(['status' => 'inactive']);
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create', 'staff-fund.edit']);
    $file = securityImportFile([['INACTIVE', 'Name', '2025-01-01', '20000']]);
    app(\App\Services\SecurityFundExcelImportService::class)->import(
        $file->getRealPath(), 'inactive.xlsx', $user,
    );
    $preview = test()->postJson('/security-fund/interest/preview', ['cutoff_date' => '2027-06-30'])->assertOk()->json();
    expect($preview['summary']['principal'])->toBe('40000.00')->and($preview['summary']['review_count'])->toBe(1);
    test()->post('/security-fund/interest', ['cutoff_date' => '2027-06-30', 'fingerprint' => $preview['fingerprint'], 'idempotency_key' => (string) \Illuminate\Support\Str::uuid()])->assertRedirect()->assertSessionHasNoErrors();
    expect(EmployeeSecurityFundTransaction::where('type', 'interest')->count())->toBe(1)
        ->and($verified->securityFundAccount()->first()->transactions()->where('type', 'interest')->first()->interest_credit)->toBe('1200.00')
        ->and($inactive->securityFundAccount()->first()->transactions()->count())->toBe(1);
});

test('imported Security Fund cannot create a final payment using an invented separation date', function () {
    $employee = securityImportEmployee('UNDATED');
    $employee->update(['status' => 'inactive', 'final_payment_date' => '2026-11-01']);
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $file = securityImportFile([['UNDATED', 'Name', '2025-01-01', '20000']]);
    app(\App\Services\SecurityFundExcelImportService::class)->import(
        $file->getRealPath(), 'inactive.xlsx', $user,
    );
    try {
        app(FinalPaymentSettlementService::class)->generateForEmployee($employee, 1);
        test()->fail('A verified separation date must be required.');
    } catch (ValidationException $error) {
        expect($error->getMessage())->toContain('Confirm the employee separation date');
    }
    expect(Separation::count())->toBe(0)->and(SeparationFinalPayment::count())->toBe(0)
        ->and($employee->securityFundAccount()->first()->transactions()->count())->toBe(1);
});

test('Excel PIN matching respects the uploading users branch scope', function () {
    $inside = securityImportEmployee('INSIDE');
    $inside->update(['current_branch_id' => 10]);
    $outside = securityImportEmployee('OUTSIDE');
    $outside->update(['current_branch_id' => 20]);
    $user = securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $user->forceFill(['account_type' => 'branch', 'branch_id' => 10]);
    $file = securityImportFile([['INSIDE', 'Name', '2026-05-20', '100'], ['OUTSIDE', 'Name', '2026-05-20', '100']]);
    $result = app(\App\Services\SecurityFundExcelImportService::class)->import($file->getRealPath(), 'branches.xlsx', $user);
    expect($result['imported'])->toBe(1)->and($result['failed'])->toBe(1)
        ->and(EmployeeSecurityFundAccount::first()->employee_id)->toBe($inside->id);
});

test('empty or malformed Excel files cannot create deposits', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    test()->post('/security-fund/import', ['file' => securityImportFile([])])->assertSessionHasErrors('file');
    test()->post('/security-fund/import', ['file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('broken.xlsx', 'not a workbook')])->assertSessionHasErrors('file');
    expect(EmployeeSecurityFundTransaction::count())->toBe(0);
});

test('JSON upload returns a complete receipt immediately and refresh restores failed reasons', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    securityImportEmployee('PIN1');
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $response = test()->post('/security-fund/import', ['file' => securityImportFile([
        ['PIN1', 'Name', '2026-05-20', '100'], ['MISSING', 'Name', '2026-05-20', '100'],
    ])], ['Accept' => 'application/json'])->assertCreated()
        ->assertJsonPath('result.total', 2)->assertJsonPath('result.imported', 1)->assertJsonPath('result.failed', 1)
        ->assertJsonPath('result.state', 'complete')->assertJsonCount(2, 'result.rows');
    expect($response->json('result.rows.1.message'))->toContain('PIN');
    expect($response->json('result'))->not->toHaveKey('user_id');
    test()->withHeader('X-Inertia', 'true')->get('/security-fund/import')->assertOk()
        ->assertJsonPath('props.result.id', $response->json('result.id'))
        ->assertJsonPath('props.status', 'failed')->assertJsonPath('props.rows.data.0.pin', 'MISSING');
});

test('zero-match JSON upload returns all failed rows instead of an empty success', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    test()->post('/security-fund/import', ['file' => securityImportFile([['MISSING', 'Name', '2026-05-20', '100']])], ['Accept' => 'application/json'])
        ->assertCreated()->assertJsonPath('result.imported', 0)->assertJsonPath('result.failed', 1)
        ->assertJsonPath('result.rows.0.status', 'failed');
    expect(EmployeeSecurityFundTransaction::count())->toBe(0);
});

test('file errors are delivered as JSON with the actual missing columns', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $response = test()->post('/security-fund/import', ['file' => securityImportFile([
        ['PIN1', 'Name', '2026-05-20', '100'],
    ], ['PIN', 'Name', 'Date', 'Amount'])], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
    expect($response->json('errors.file.0'))->toContain('Missing columns: Deposit Date')->toContain('Found: PIN, Name, Date, Amount');
    expect(EmployeeSecurityFundTransaction::count())->toBe(0);
});

test('JSON imports report permission failures instead of redirecting without a result', function () {
    securityWebUser(['staff-fund.view']);
    test()->post('/security-fund/import', [], ['Accept' => 'application/json'])->assertForbidden()
        ->assertJsonPath('message', 'You do not have permission to import Security Fund deposits. Contact your administrator.');
});

test('unexpected import exceptions become visible file errors and preserve financial records', function () {
    \Illuminate\Support\Facades\Storage::fake('local');
    securityWebUser(['staff-fund.view', 'staff-fund.create']);
    $importer = Mockery::mock(\App\Services\SecurityFundExcelImportService::class);
    $importer->shouldReceive('import')->once()->andThrow(new RuntimeException('Simulated unreadable server state'));
    app()->instance(\App\Services\SecurityFundExcelImportService::class, $importer);
    $response = test()->post('/security-fund/import', ['file' => securityImportFile([['PIN1', 'Name', '2026-05-20', '100']])], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('file');
    expect($response->json('errors.file.0'))->toContain('Reference:')->not->toContain('Simulated unreadable');
    expect(EmployeeSecurityFundTransaction::count())->toBe(0);
});

test('list calculations batch inactive separation lookups and omit per-deposit audit detail', function () {
    $fund = app(EmployeeSecurityFundService::class);
    for ($i = 0; $i < 15; $i++) {
        $employee = securityImportEmployee('PERF-'.$i);
        $account = securityAccount($employee, '2025-01-01');
        $employee->update(['status' => 'inactive']);
        Separation::create(['employee_id' => $employee->id, 'status' => 'completed', 'separation_date' => '2027-06-30']);
    }
    securityWebUser(['staff-fund.view']);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $response = test()->withHeader('X-Inertia', 'true')->get('/security-fund/interest?cutoff_date=2027-06-30')->assertOk()
        ->assertJsonCount(15, 'props.rows')->assertJsonPath('props.summary.principal', '300000.00')
        ->assertJsonPath('props.summary.unposted_interest', '18000.00');
    $separationQueries = collect(DB::getQueryLog())->filter(fn ($query) => str_contains($query['query'], 'from "separations"'));
    DB::disableQueryLog();
    expect($separationQueries)->toHaveCount(1)->and($response->json('props.rows.0'))->not->toHaveKey('segments');
    expect($fund->accountSnapshot($account->fresh(), '2027-06-30')['segments'])->not->toBeEmpty();
});

test('ledger reuses dated transactions for its snapshot and creator details', function () {
    $employee = securityEmployee();
    $account = securityAccount($employee);
    app(EmployeeSecurityFundService::class)->deposit($account, ['amount' => '10000', 'transaction_date' => '2027-07-01', 'idempotency_key' => 'later-ledger-deposit'], 1);
    securityWebUser(['staff-fund.view']);
    DB::enableQueryLog();
    DB::flushQueryLog();
    test()->withHeader('X-Inertia', 'true')->get('/security-fund/'.$account->id.'/ledger?as_of=2027-06-30')->assertOk()
        ->assertJsonCount(1, 'props.transactions')->assertJsonPath('props.snapshot.principal', '20000.00')
        ->assertJsonPath('props.snapshot.interest', '1200.00')->assertJsonPath('props.transactions.0.creator.name', 'Accounts');
    $transactionQueries = collect(DB::getQueryLog())->filter(fn ($query) => str_contains($query['query'], 'from "employee_security_fund_transactions"'));
    DB::disableQueryLog();
    expect($transactionQueries)->toHaveCount(1)->and(EmployeeSecurityFundTransaction::count())->toBe(2);
});

test('bulk PDF download includes every account and uses compact A4 portrait pages', function () {
    for ($i = 0; $i < 65; $i++) {
        securityAccount(securityImportEmployee('PDF-'.$i));
    }
    securityWebUser(['staff-fund.view', 'reports.export']);
    $response = test()->get('/security-fund/reports/pdf?as_of=2027-06-30')->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')->assertHeader('Content-Disposition', 'attachment; filename="security-fund.pdf"');
    $pdf = $response->getContent();
    preg_match_all('/\/Type\s*\/Page\b/', $pdf, $pages);
    preg_match('/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/', $pdf, $pageSize);
    expect(substr($pdf, 0, 4))->toBe('%PDF')->and(count($pages[0]))->toBeGreaterThan(1)->toBeLessThan(20);
    expect((float) $pageSize[1])->toEqualWithDelta(595.28, 1)
        ->and((float) $pageSize[2])->toEqualWithDelta(841.89, 1);
    expect(EmployeeSecurityFundTransaction::count())->toBe(65);
    test()->withHeader('X-Inertia', 'true')->get('/security-fund/interest?cutoff_date=2027-06-30')->assertOk()
        ->assertJsonCount(65, 'props.rows')->assertJsonPath('props.summary.principal', '1300000.00')
        ->assertJsonPath('props.summary.unposted_interest', '78000.00');
});
