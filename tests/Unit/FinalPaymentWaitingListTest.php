<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\FinalClearance;
use App\Models\Separation;
use App\Models\SeparationFinalPayment;
use App\Models\User;
use App\Services\FinalPaymentWaitingListService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config([
        'database.default' => 'mysql',
        'database.connections.mysql' => [
            'driver' => 'mysql',
            'host' => '127.0.0.1',
            'port' => '3306',
            'database' => 'hrm_mou',
            'username' => 'root',
            'password' => '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
        ],
    ]);

    DB::purge('mysql');
    DB::reconnect('mysql');
    DB::beginTransaction();
});

afterEach(function () {
    DB::rollBack();
});

test('final payment waiting list service returns valid structure and columns', function () {
    $service = app(FinalPaymentWaitingListService::class);
    $payload = $service->build(['payment_status' => 'all']);

    expect($payload)->toHaveKeys(['report_title', 'print_date', 'as_of_date', 'rows', 'summary', 'filters'])
        ->and($payload['report_title'])->toBe('Final Payment Waiting List')
        ->and($payload['summary'])->toHaveKeys([
            'total_staff',
            'waiting_count',
            'pending_count',
            'paid_count',
            'clearance_approved_count',
            'clearance_in_progress_count',
            'clearance_not_submitted_count',
            'total_amount',
            'total_amount_formatted',
        ]);

    if (! empty($payload['rows'])) {
        $first = $payload['rows'][0];
        expect($first)->toHaveKeys([
            'sl',
            'employee_id',
            'pin',
            'name',
            'designation',
            'left_date',
            'duration',
            'left_reason',
            'left_branch',
            'clearance_status',
            'clearance_status_label',
            'payment_status',
            'payment_status_label',
            'payment_date',
            'payment_amount',
        ]);
    }
});

test('duration calculates accurately in Y M D format', function () {
    $service = app(FinalPaymentWaitingListService::class);

    $branch = Branch::query()->first() ?? Branch::create(['name' => 'Test Branch', 'branch_code' => 'TB01']);
    $department = Department::query()->first() ?? Department::create(['name' => 'HR', 'department_code' => 'HR01']);
    $designation = Designation::query()->first() ?? Designation::create(['name' => 'Officer']);

    $testUser = User::create([
        'name' => 'Separated Staff Test',
        'username' => 'sep_'.uniqid(),
        'email' => 'separated_test_'.uniqid().'@example.com',
        'password' => bcrypt('password'),
    ]);

    $leftDate = Carbon::now()->subYears(1)->subMonths(3)->subDays(15);

    $employee = Employee::create([
        'user_id' => $testUser->id,
        'branch_id' => $branch->id,
        'current_branch_id' => $branch->id,
        'department_id' => $department->id,
        'designation_id' => $designation->id,
        'employee_id' => 'SEP'.rand(10000, 99999),
        'pin' => 'PIN'.rand(10000, 99999),
        'name_en' => 'Separated Staff',
        'email' => 'sep_emp_'.uniqid().'@example.com',
        'gender' => 'male',
        'status' => 'inactive',
        'joining_date' => $leftDate->copy()->subYears(3)->toDateString(),
        'resignation_date' => $leftDate->toDateString(),
        'dropout_reason' => 'Personal Reasons',
    ]);

    $payload = $service->build([
        'search' => $employee->employee_id,
        'payment_status' => 'all',
    ]);

    expect($payload['rows'])->not->toBeEmpty();
    $found = collect($payload['rows'])->firstWhere('employee_id', $employee->id);
    expect($found)->not->toBeNull()
        ->and($found['duration'])->toBe('1Y, 3M, 15D')
        ->and($found['left_reason'])->toBe('Personal Reasons')
        ->and($found['payment_status_code'])->toBe('waiting')
        ->and($found['clearance_status_code'])->toBe('not_submitted');
});

test('clearance status and payment status resolve from live models', function () {
    $service = app(FinalPaymentWaitingListService::class);

    $branch = Branch::query()->first() ?? Branch::create(['name' => 'Test Branch', 'branch_code' => 'TB01']);
    $department = Department::query()->first() ?? Department::create(['name' => 'HR', 'department_code' => 'HR01']);
    $designation = Designation::query()->first() ?? Designation::create(['name' => 'Officer']);

    $user = User::create([
        'name' => 'Clearance Staff Test',
        'username' => 'clr_'.uniqid(),
        'email' => 'clearance_test_'.uniqid().'@example.com',
        'password' => bcrypt('password'),
    ]);

    $leftDate = Carbon::now()->subMonths(2);

    $employee = Employee::create([
        'user_id' => $user->id,
        'branch_id' => $branch->id,
        'current_branch_id' => $branch->id,
        'department_id' => $department->id,
        'designation_id' => $designation->id,
        'employee_id' => 'CLR'.rand(10000, 99999),
        'pin' => 'PIN'.rand(10000, 99999),
        'name_en' => 'Clearance Person',
        'email' => 'clr_emp_'.uniqid().'@example.com',
        'gender' => 'male',
        'status' => 'inactive',
        'joining_date' => $leftDate->copy()->subYears(2)->toDateString(),
        'dropout_date' => $leftDate->toDateString(),
    ]);

    // Create an approved FinalClearance with net payable
    FinalClearance::create([
        'employee_id' => $employee->id,
        'initiator_id' => $user->id,
        'branch_id' => $branch->id,
        'dropout_date' => $leftDate->toDateString(),
        'status' => 'approved',
        'net_payable' => 45000.00,
    ]);

    $separation = Separation::create([
        'employee_id' => $employee->id,
        'separation_date' => $leftDate->toDateString(),
        'type_of_separation' => 'Resignation',
        'status' => 'approved',
    ]);

    // Create a pending SeparationFinalPayment
    SeparationFinalPayment::create([
        'employee_id' => $employee->id,
        'separation_id' => $separation->id,
        'net_payable' => 45000.00,
        'status' => 'pending',
    ]);

    $payload = $service->build([
        'search' => $employee->employee_id,
        'payment_status' => 'all',
    ]);

    $found = collect($payload['rows'])->firstWhere('employee_id', $employee->id);
    expect($found)->not->toBeNull()
        ->and($found['clearance_status_code'])->toBe('approved')
        ->and($found['clearance_status_label'])->toBe('Approved')
        ->and($found['payment_status_code'])->toBe('pending')
        ->and($found['payment_status_label'])->toBe('Pending')
        ->and((float) $found['payment_amount'])->toBe(45000.00);
});

test('routes for final payment waiting list respond successfully', function () {
    $user = User::query()->first() ?? User::factory()->create();

    $this->actingAs($user)
        ->get(route('staff-fund.reports.final-payment-waiting-list.show'))
        ->assertStatus(200);

    $this->actingAs($user)
        ->get(route('staff-fund.reports.final-payment-waiting-list.print'))
        ->assertStatus(200)
        ->assertSee('Final Payment Waiting List')
        ->assertSee('print Date:');

    $response = $this->actingAs($user)
        ->get(route('staff-fund.reports.final-payment-waiting-list.excel'));

    expect($response->status())->toBe(200)
        ->and($response->headers->get('content-type'))->toContain('spreadsheetml.sheet');
});
