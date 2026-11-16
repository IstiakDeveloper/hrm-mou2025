<?php

use App\Models\Branch;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\SalaryGrade;
use App\Models\User;
use App\Services\HrReportService;
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

test('report 1 totals reconcile active and inactive staff to grand total', function () {
    $service = app(HrReportService::class);
    $config = config('hr_reports.reports.staff-by-designation');
    $payload = $service->build('staff-by-designation', $config, ['as_of_date' => now()->toDateString()]);

    expect($payload['template'])->toBe('designation-matrix')
        ->and($payload['orientation'])->toBe('portrait');

    $totals = $payload['totals'];
    $rows = $payload['rows'];

    $sumActiveMale = array_sum(array_column($rows, 'active_male'));
    $sumActiveFemale = array_sum(array_column($rows, 'active_female'));
    $sumActiveTotal = array_sum(array_column($rows, 'active_total'));
    $sumInactiveMale = array_sum(array_column($rows, 'inactive_male'));
    $sumInactiveFemale = array_sum(array_column($rows, 'inactive_female'));
    $sumInactiveTotal = array_sum(array_column($rows, 'inactive_total'));
    $sumGrandTotal = array_sum(array_column($rows, 'grand_total'));

    expect($totals['active_male'])->toBe($sumActiveMale)
        ->and($totals['active_female'])->toBe($sumActiveFemale)
        ->and($totals['active_total'])->toBe($sumActiveTotal)
        ->and($totals['inactive_male'])->toBe($sumInactiveMale)
        ->and($totals['inactive_female'])->toBe($sumInactiveFemale)
        ->and($totals['inactive_total'])->toBe($sumInactiveTotal)
        ->and($totals['grand_total'])->toBe($sumGrandTotal)
        ->and($totals['active_total'] + $totals['inactive_total'])->toBe($totals['grand_total']);
});

test('location stint changes present location joining date with assignment history and falls back without history', function () {
    $service = app(HrReportService::class);

    $branchA = Branch::firstOrCreate(['branch_code' => 'TEST_A'], [
        'name' => 'Test Branch A',
        'is_head_office' => false,
        'is_active' => true,
    ]);

    $branchB = Branch::firstOrCreate(['branch_code' => 'TEST_B'], [
        'name' => 'Test Branch B',
        'is_head_office' => false,
        'is_active' => true,
    ]);

    // 1. Employee without assignment history -> falls back to joining_date
    $empWithoutHistory = new Employee([
        'joining_date' => '2020-01-01',
        'current_branch_id' => $branchB->id,
        'status' => 'active',
    ]);

    $reflection = new ReflectionClass($service);
    $resolvePresentLocMethod = $reflection->getMethod('resolvePresentLocationJoiningDate');
    $resolvePresentLocMethod->setAccessible(true);

    $dateWithoutHistory = $resolvePresentLocMethod->invoke($service, $empWithoutHistory, $branchB->id, collect());
    expect($dateWithoutHistory->toDateString())->toBe('2020-01-01');

    // 2. Employee with transfer history to Branch B on 2023-06-01
    $h1 = new EmployeeAssignmentHistory([
        'branch_id' => $branchA->id,
        'effective_from' => '2020-01-01',
    ]);
    $h2 = new EmployeeAssignmentHistory([
        'branch_id' => $branchB->id,
        'effective_from' => '2023-06-01',
    ]);
    $h3 = new EmployeeAssignmentHistory([
        'branch_id' => $branchB->id,
        'effective_from' => '2024-01-01',
    ]);

    $histories = collect([$h1, $h2, $h3]);
    $dateWithTransfer = $resolvePresentLocMethod->invoke($service, $empWithoutHistory, $branchB->id, $histories);
    expect($dateWithTransfer->toDateString())->toBe('2023-06-01');
});

test('promotion anchor date resolves latest of last_promotion_date and grade change in history', function () {
    $service = app(HrReportService::class);

    $emp = new Employee([
        'joining_date' => '2018-01-01',
        'last_promotion_date' => '2022-03-01',
        'status' => 'active',
    ]);

    $reflection = new ReflectionClass($service);
    $anchorMethod = $reflection->getMethod('resolvePromotionAnchorDate');
    $anchorMethod->setAccessible(true);

    // Case A: Last promotion date is later than grade change
    $h1 = new EmployeeAssignmentHistory(['salary_grade_id' => 1, 'effective_from' => '2018-01-01']);
    $h2 = new EmployeeAssignmentHistory(['salary_grade_id' => 2, 'effective_from' => '2021-01-01']);
    $anchorA = $anchorMethod->invoke($service, $emp, collect([$h1, $h2]));
    expect($anchorA->toDateString())->toBe('2022-03-01');

    // Case B: Grade change is later than last promotion date
    $h3 = new EmployeeAssignmentHistory(['salary_grade_id' => 3, 'effective_from' => '2023-05-01']);
    $anchorB = $anchorMethod->invoke($service, $emp, collect([$h1, $h2, $h3]));
    expect($anchorB->toDateString())->toBe('2023-05-01');

    // Case C: Neither promotion date nor grade change -> falls back to joining_date
    $empNoPromo = new Employee(['joining_date' => '2019-07-01', 'status' => 'active']);
    $anchorC = $anchorMethod->invoke($service, $empNoPromo, collect());
    expect($anchorC->toDateString())->toBe('2019-07-01');
});

test('report 5 excludes head office staff from field table and includes head office summary underneath', function () {
    $service = app(HrReportService::class);
    $config = config('hr_reports.reports.microfinance-field-staff-summary');
    $payload = $service->build('microfinance-field-staff-summary', $config, ['as_of_date' => now()->toDateString()]);

    expect($payload['template'])->toBe('field-summary')
        ->and($payload['orientation'])->toBe('landscape')
        ->and($payload)->toHaveKeys(['rows', 'totals', 'head_office_summary', 'combined_total']);

    foreach ($payload['rows'] as $row) {
        $branchModel = $row['branch_model'] ?? null;
        if ($branchModel) {
            expect((bool) $branchModel->is_head_office)->toBeFalse();
        }
    }

    $ho = $payload['head_office_summary'];
    expect($ho['template'])->toBe('ho-grade-summary')
        ->and($payload['combined_total'])->toBe($payload['totals']['row_total'] + $ho['grand_total']);
});

test('report 8 location ratio reconciles field and head office to grand total with 100 percent sum', function () {
    $service = app(HrReportService::class);
    $config = config('hr_reports.reports.location-wise-summary-ratio');
    $payload = $service->build('location-wise-summary-ratio', $config, ['as_of_date' => now()->toDateString()]);

    expect($payload['template'])->toBe('location-ratio');

    $rows = collect($payload['rows'])->keyBy('location');
    $field = $rows['Field Staff Total'];
    $ho = $rows['Head Office Total'];
    $grand = $rows['Grand Total'];

    expect($field['male'] + $ho['male'])->toBe($grand['male'])
        ->and($field['female'] + $ho['female'])->toBe($grand['female'])
        ->and($field['total'] + $ho['total'])->toBe($grand['total']);

    foreach ([$field, $ho, $grand] as $r) {
        if ($r['total'] > 0) {
            $mPct = (float) rtrim($r['male_percentage'], '%');
            $fPct = (float) rtrim($r['female_percentage'], '%');
            expect(round($mPct + $fPct, 1))->toBe(100.0);
        }
    }
});

test('authenticated authorized user can access hr report routes', function () {
    $role = \App\Models\Role::firstOrCreate(['name' => 'Super Admin'], ['permissions' => ['*']]);
    $user = User::factory()->create([
        'role_id' => $role->id,
    ]);

    // 1. Index route
    $this->actingAs($user)
        ->get(route('hr.reports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('hr/reports/index')->has('reports', 13));

    // 2. Show route
    $this->actingAs($user)
        ->get(route('hr.reports.show', 'staff-by-designation'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('hr/reports/show')->has('report'));

    // 3. Print route
    $this->actingAs($user)
        ->get(route('hr.reports.print', 'staff-by-designation'))
        ->assertOk()
        ->assertSee('Staff Report By Designation');

    // 4. Excel route
    $response = $this->actingAs($user)
        ->get(route('hr.reports.excel', 'staff-by-designation'));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('report 9 microfinance head office staff summary builds cleanly as a single unified table with rows and totals', function () {
    $service = app(HrReportService::class);
    $config = config('hr_reports.reports.microfinance-head-office-staff-summary');
    $payload = $service->build('microfinance-head-office-staff-summary', $config, ['as_of_date' => now()->toDateString()]);

    expect($payload['template'])->toBe('ho-grade-summary')
        ->and($payload['orientation'])->toBe('landscape')
        ->and($payload)->toHaveKeys(['rows', 'totals', 'grand_total']);

    $calcMale = 0;
    $calcFemale = 0;
    $calcTotal = 0;

    foreach ($payload['rows'] as $r) {
        expect($r)->toHaveKeys(['sl', 'salary_grade', 'designation', 'male', 'female', 'total'])
            ->and($r['male'] + $r['female'])->toBe($r['total']);

        $calcMale += $r['male'];
        $calcFemale += $r['female'];
        $calcTotal += $r['total'];
    }

    expect($payload['totals']['male'])->toBe($calcMale)
        ->and($payload['totals']['female'])->toBe($calcFemale)
        ->and($payload['totals']['total'])->toBe($calcTotal)
        ->and($payload['grand_total'])->toBe($calcTotal);
});

test('probationary reports 11 and 12 strictly include only probation employee types', function () {
    $service = app(HrReportService::class);

    $branch = Branch::firstOrCreate(['branch_code' => 'TEST_BR_PROB'], [
        'name' => 'Probation Test Branch',
        'is_head_office' => false,
        'is_active' => true,
    ]);

    $designation = Designation::firstOrCreate(['name' => 'Field Officer Test'], [
        'title' => 'Field Officer Test',
        'is_active' => true,
    ]);

    $dept = \App\Models\Department::firstOrCreate(['name' => 'Field Operations']);

    // Permanent employee (employee_type_id = 1, probation_months = 0), unconfirmed
    $permanent = Employee::create([
        'employee_id' => 'EMP_TEST_PERM',
        'pin' => '99901',
        'name_en' => 'Permanent Unconfirmed Staff',
        'email' => 'perm_test_99901@example.com',
        'gender' => 'male',
        'status' => 'active',
        'joining_date' => now()->subMonths(2)->toDateString(),
        'confirmation_date' => null,
        'employee_type_id' => 1,
        'department_id' => $dept->id,
        'current_branch_id' => $branch->id,
        'designation_id' => $designation->id,
    ]);

    // Probation employee (employee_type_id = 2, probation_months = 6), unconfirmed
    $probation = Employee::create([
        'employee_id' => 'EMP_TEST_PROB',
        'pin' => '99902',
        'name_en' => 'Probation Unconfirmed Staff',
        'email' => 'prob_test_99902@example.com',
        'gender' => 'female',
        'status' => 'active',
        'joining_date' => now()->subMonths(2)->toDateString(),
        'confirmation_date' => null,
        'employee_type_id' => 2,
        'department_id' => $dept->id,
        'current_branch_id' => $branch->id,
        'designation_id' => $designation->id,
    ]);

    $filters = [
        'branch_id' => $branch->id,
        'as_of_date' => now()->toDateString(),
    ];

    // Report 11: branch-wise-probation-salary-increase
    $config11 = config('hr_reports.reports.branch-wise-probation-salary-increase');
    $payload11 = $service->build('branch-wise-probation-salary-increase', $config11, $filters);
    $allPins11 = collect($payload11['sections'])->flatMap(fn ($s) => collect($s['rows'])->pluck('pin'))->all();

    expect($allPins11)->toContain('99902')
        ->and($allPins11)->not->toContain('99901');

    // Report 12: branch-wise-active-staff-confirmation
    $config12 = config('hr_reports.reports.branch-wise-active-staff-confirmation');
    $payload12 = $service->build('branch-wise-active-staff-confirmation', $config12, $filters);
    $allPins12 = collect($payload12['sections'])->flatMap(fn ($s) => collect($s['rows'])->pluck('pin'))->all();

    expect($allPins12)->toContain('99902')
        ->and($allPins12)->not->toContain('99901');
});
