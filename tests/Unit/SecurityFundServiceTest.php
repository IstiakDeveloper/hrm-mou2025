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
