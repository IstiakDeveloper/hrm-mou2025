<?php

use App\Models\AttendanceDevice;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\Project;
use App\Services\AdmsDeviceCommandService;
use App\Services\GeoFenceService;
use App\Services\MultiBranchAttendanceService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropAllTables();

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('branch_code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('geofence_enabled')->default(true);
        $table->float('geofence_latitude')->nullable();
        $table->float('geofence_longitude')->nullable();
        $table->integer('geofence_radius_meters')->nullable();
        $table->timestamps();
    });

    Schema::create('projects', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('employees', function (Blueprint $table) {
        $table->id();
        $table->string('employee_id');
        $table->string('pin')->nullable();
        $table->string('name_en')->nullable();
        $table->string('biometric_id')->nullable();
        $table->string('device_user_id', 20)->nullable();
        $table->unsignedBigInteger('current_branch_id')->nullable();
        $table->unsignedBigInteger('project_id')->nullable();
        $table->string('status')->default('active');
        $table->timestamps();
    });

    Schema::create('attendance_devices', function (Blueprint $table) {
        $table->id();
        $table->string('device_id');
        $table->string('name');
        $table->string('ip_address');
        $table->integer('port')->default(4370);
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('active');
        $table->boolean('adms_enabled')->default(true);
        $table->timestamps();
    });

    Schema::create('attendance_device_users', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('attendance_device_id');
        $table->string('pin', 20);
        $table->timestamp('last_seen_at')->nullable();
        $table->timestamps();
    });

    Schema::create('attendance_device_commands', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('attendance_device_id');
        $table->string('kind', 32);
        $table->string('pin', 20)->nullable();
        $table->text('body');
        $table->string('status', 16)->default('pending');
        $table->boolean('allow_empty')->default(false);
        $table->timestamp('sent_at')->nullable();
        $table->timestamp('acked_at')->nullable();
        $table->timestamps();
    });

    Schema::create('project_attendance_branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('project_id');
        $table->unsignedBigInteger('branch_id');
        $table->timestamps();
        $table->unique(['project_id', 'branch_id']);
    });

    Schema::create('employee_attendance_branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('branch_id');
        $table->timestamps();
        $table->unique(['employee_id', 'branch_id']);
    });

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_manager_employee_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('regional_offices', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->unsignedBigInteger('regional_manager_employee_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    $this->branchA = Branch::create([
        'name' => 'Branch A',
        'is_active' => true,
        'geofence_enabled' => true,
        'geofence_latitude' => 24.1,
        'geofence_longitude' => 88.1,
        'geofence_radius_meters' => 100,
    ]);

    $this->branchB = Branch::create([
        'name' => 'Branch B',
        'is_active' => true,
        'geofence_enabled' => true,
        'geofence_latitude' => 24.2,
        'geofence_longitude' => 88.2,
        'geofence_radius_meters' => 100,
    ]);

    $this->project = Project::create([
        'name' => 'ECCCP Drought',
        'is_active' => true,
    ]);

    $this->employee = Employee::withoutEvents(function () {
        return Employee::create([
            'employee_id' => 'ECCCP-1',
            'pin' => 'ECCCP-1',
            'name_en' => 'Suvhro Pande',
            'current_branch_id' => $this->branchA->id,
            'project_id' => $this->project->id,
            'status' => 'active',
        ]);
    });
});

test('project multi branch attendance allows employee across multiple branches', function () {
    $service = app(MultiBranchAttendanceService::class);

    // Before approval, employee is only allowed at home branch A
    expect($service->isEmployeeAllowedForBranch($this->employee, $this->branchA->id))->toBeTrue();
    expect($service->isEmployeeAllowedForBranch($this->employee, $this->branchB->id))->toBeFalse();

    // Sync project branches: ECCCP Drought assigned to Branch A and Branch B
    $service->syncProjectBranches($this->project->id, [$this->branchA->id, $this->branchB->id]);

    // Now employee is allowed at both branches
    expect($service->isEmployeeAllowedForBranch($this->employee, $this->branchA->id))->toBeTrue();
    expect($service->isEmployeeAllowedForBranch($this->employee, $this->branchB->id))->toBeTrue();

    // Query eligible employees for Branch B: must include our ECCCP Drought employee
    $eligibleAtB = $service->getEligibleEmployeesQueryForBranch($this->branchB->id)->pluck('id');
    expect($eligibleAtB->contains($this->employee->id))->toBeTrue();

    // Device at Branch B: candidate rows must include ECCCP employee with is_multi_branch = true
    $deviceB = AttendanceDevice::create([
        'device_id' => 'DEV-B',
        'name' => 'Device Branch B',
        'ip_address' => '192.168.1.50',
        'port' => 4370,
        'branch_id' => $this->branchB->id,
        'status' => 'active',
        'adms_enabled' => true,
    ]);

    $commandService = app(AdmsDeviceCommandService::class);
    $candidates = $commandService->candidateRows($deviceB);
    $candidate = collect($candidates)->firstWhere('id', $this->employee->id);

    expect($candidate)->not->toBeNull();
    expect($candidate['is_multi_branch'])->toBeTrue();
    expect($candidate['project_name'])->toBe('ECCCP Drought');
});
