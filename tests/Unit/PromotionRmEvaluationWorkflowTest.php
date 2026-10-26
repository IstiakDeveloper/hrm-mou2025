<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\PromotionEvaluation;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\PromotionEvaluationWorkflowService;
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

test('when zonal manager creates promotion evaluation for regional manager it submits to director microfinance', function () {
    $service = app(PromotionEvaluationWorkflowService::class);
    $token = strtoupper(substr(str_replace('.', '', uniqid('', true)), -8));

    $dept = Department::create(['name' => 'Microfinance '.$token]);
    $zone = Zone::create(['name' => 'Zone '.$token, 'code' => $token]);
    $ro = RegionalOffice::create(['zone_id' => $zone->id, 'name' => 'Region '.$token, 'code' => substr($token, 0, 20)]);
    $branch = Branch::create(['name' => 'Branch '.$token, 'branch_code' => substr($token, 0, 20), 'regional_office_id' => $ro->id]);

    $zmDesig = Designation::create(['name' => 'Zonal Manager '.$token, 'department_id' => $dept->id]);
    $rmDesig = Designation::create(['name' => 'Regional Manager '.$token, 'department_id' => $dept->id]);

    // Zonal Manager
    $zmPin = strtoupper(substr(str_replace('.', '', uniqid('', true)), -8));
    $zmEmp = Employee::create([
        'employee_id' => $zmPin,
        'pin' => $zmPin,
        'name_en' => 'ZM Employee',
        'email' => $zmPin.'@example.test',
        'designation_id' => $zmDesig->id,
        'department_id' => $dept->id,
        'current_branch_id' => $branch->id,
        'joining_date' => '2026-01-01',
        'status' => 'active',
    ]);
    $zmRole = Role::firstOrCreate(['name' => 'Zonal Manager'], ['permissions' => []]);
    $zmUser = User::factory()->create([
        'name' => 'ZM User',
        'employee_id' => $zmEmp->id,
        'role_id' => $zmRole->id,
    ]);
    $zmUser->roles()->attach($zmRole->id);

    // Regional Manager (candidate)
    $rmPin = strtoupper(substr(str_replace('.', '', uniqid('', true)), -8));
    $rmEmp = Employee::create([
        'employee_id' => $rmPin,
        'pin' => $rmPin,
        'name_en' => 'RM Candidate',
        'email' => $rmPin.'@example.test',
        'designation_id' => $rmDesig->id,
        'department_id' => $dept->id,
        'current_branch_id' => $branch->id,
        'joining_date' => '2026-01-01',
        'status' => 'active',
    ]);

    // Form type for RM must be bm_and_above
    $formType = $service->determineFormType($rmEmp);
    expect($formType)->toBe('bm_and_above');

    $eval = PromotionEvaluation::create([
        'employee_id' => $rmEmp->id,
        'initiator_id' => $zmUser->id,
        'branch_id' => $branch->id,
        'regional_office_id' => $ro->id,
        'zone_id' => $zone->id,
        'form_type' => $formType,
        'total_score' => 85,
        'calculated_grade' => 'very_good',
        'recommendation_status' => 'recommended',
        'status' => 'draft',
    ]);

    // When ZM submits the draft, next status must be submitted_to_director
    $nextStatus = $service->determineNextStatus($eval, 'draft');
    expect($nextStatus)->toBe('submitted_to_director');

    // Update evaluation to submitted_to_director
    $eval->status = 'submitted_to_director';
    $eval->save();

    // ZM (creator) must NOT review his own evaluation
    expect($service->canUserReview($zmUser, $eval))->toBeFalse();

    // Director Microfinance CAN review and approve
    $dmfRole = Role::firstOrCreate(['name' => 'Director (Microfinance)'], ['permissions' => []]);
    $dmfUser = User::factory()->create(['name' => 'Director MF', 'role_id' => $dmfRole->id]);
    $dmfUser->roles()->attach($dmfRole->id);

    expect($service->canUserReview($dmfUser, $eval))->toBeTrue();
});
