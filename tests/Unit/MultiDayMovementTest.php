<?php

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Movement;
use App\Models\MovementPenalty;
use App\Services\MovementPenaltySyncService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropAllTables();
    buildMultiDayMovementSchema();

    $this->hoBranch = Branch::create([
        'name' => 'Head Office',
        'branch_code' => 'HO',
        'is_head_office' => true,
        'allow_multi_day_movement' => true,
    ]);

    $this->branchA = Branch::create([
        'name' => 'Branch Chittagong',
        'branch_code' => 'CTG',
        'is_head_office' => false,
        'allow_multi_day_movement' => false,
    ]);

    $this->department = Department::create(['name' => 'General']);
    $this->designation = Designation::create(['name' => 'Officer']);

    $this->employee = Employee::withoutEvents(fn () => Employee::create([
        'employee_id' => 'EMP-001',
        'name' => 'Rahim Uddin',
        'name_en' => 'Rahim Uddin',
        'branch_id' => $this->hoBranch->id,
        'current_branch_id' => $this->hoBranch->id,
        'department_id' => $this->department->id,
        'designation_id' => $this->designation->id,
        'status' => 'active',
    ]));
});

afterEach(function () {
    Carbon::setTestNow();
});

function buildMultiDayMovementSchema(): void
{
    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('branch_code')->nullable();
        $table->boolean('is_head_office')->default(false);
        $table->boolean('allow_multi_day_movement')->default(false);
        $table->softDeletes();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id')->nullable();
        $table->string('name')->nullable();
        $table->string('email')->nullable();
        $table->timestamps();
    });

    Schema::create('attendance_settings', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->boolean('allow_multi_day_movement')->default(false);
        $table->timestamps();
    });

    Schema::create('departments', function (Blueprint $table) {
        $table->id();
        $table->string('name');
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
        $table->string('name')->nullable();
        $table->string('name_en')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('current_branch_id')->nullable();
        $table->unsignedBigInteger('department_id')->nullable();
        $table->unsignedBigInteger('designation_id')->nullable();
        $table->string('status')->default('active');
        $table->timestamps();
    });

    Schema::create('attendances', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->date('date');
        $table->time('check_in')->nullable();
        $table->time('check_out')->nullable();
        $table->string('status')->default('present');
        $table->string('remarks')->nullable();
        $table->unsignedBigInteger('movement_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->timestamps();
    });

    Schema::create('movements', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('movement_type')->default('official');
        $table->dateTime('from_datetime');
        $table->dateTime('to_datetime');
        $table->dateTime('actual_return_datetime')->nullable();
        $table->string('purpose')->nullable();
        $table->string('destination')->nullable();
        $table->string('status')->default('active');
        $table->boolean('is_multi_day')->default(false);
        $table->timestamps();
    });

    Schema::create('employee_attendance_times', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('movement_penalties', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('movement_id');
        $table->unsignedBigInteger('employee_id');
        $table->unsignedBigInteger('user_id')->nullable();
        $table->integer('overdue_days')->default(1);
        $table->decimal('fine_per_day', 10, 2)->default(20.00);
        $table->decimal('total_fine', 10, 2)->default(20.00);
        $table->string('status')->default('unpaid');
        $table->text('reason')->nullable();
        $table->timestamps();
    });
}

test('multi-day permission checks Head Office and branch settings correctly', function () {
    // HO branch allows multi day
    expect(AttendanceSetting::isMultiDayAllowedForBranch($this->hoBranch->id))->toBeTrue();

    // Branch A does not allow multi day initially
    expect(AttendanceSetting::isMultiDayAllowedForBranch($this->branchA->id))->toBeFalse();

    // Toggle permission for Branch A
    $this->branchA->update(['allow_multi_day_movement' => true]);
    expect(AttendanceSetting::isMultiDayAllowedForBranch($this->branchA->id))->toBeTrue();
});

test('multi-day movement covers full range and single-day only covers single date', function () {
    $singleDay = Movement::create([
        'employee_id' => $this->employee->id,
        'movement_type' => 'official',
        'from_datetime' => '2026-10-12 10:00:00',
        'to_datetime' => '2026-10-12 18:00:00',
        'is_multi_day' => false,
        'status' => 'active',
    ]);

    expect($singleDay->coversAttendanceDate('2026-10-12'))->toBeTrue();
    expect($singleDay->coversAttendanceDate('2026-10-13'))->toBeFalse();

    $multiDay = Movement::create([
        'employee_id' => $this->employee->id,
        'movement_type' => 'official',
        'from_datetime' => '2026-10-12 10:00:00',
        'to_datetime' => '2026-10-15 17:00:00',
        'is_multi_day' => true,
        'status' => 'active',
    ]);

    expect($multiDay->coversAttendanceDate('2026-10-12'))->toBeTrue();
    expect($multiDay->coversAttendanceDate('2026-10-13'))->toBeTrue();
    expect($multiDay->coversAttendanceDate('2026-10-14'))->toBeTrue();
    expect($multiDay->coversAttendanceDate('2026-10-15'))->toBeTrue();
    expect($multiDay->coversAttendanceDate('2026-10-16'))->toBeFalse();
});

test('penalty is not applied before close date 11:59 PM but starts the day after', function () {
    $service = new MovementPenaltySyncService;

    // Multi-day scheduled Oct 12 to Oct 14
    $movement = Movement::create([
        'employee_id' => $this->employee->id,
        'movement_type' => 'official',
        'from_datetime' => '2026-10-12 10:00:00',
        'to_datetime' => '2026-10-14 18:00:00',
        'is_multi_day' => true,
        'status' => 'active',
    ]);

    // On Oct 13, still during movement, no penalty
    Carbon::setTestNow('2026-10-13 15:00:00');
    $service->sync();
    expect(MovementPenalty::count())->toBe(0);

    // On Oct 14 at 23:30 (before midnight of close date), no penalty
    Carbon::setTestNow('2026-10-14 23:30:00');
    $service->sync();
    expect(MovementPenalty::count())->toBe(0);

    // On Oct 15 at 08:00 AM (after Oct 14 11:59 PM), penalty starts: 1 overdue day = 20 BDT
    Carbon::setTestNow('2026-10-15 08:00:00');
    $service->sync();
    expect(MovementPenalty::count())->toBe(1);
    $penalty = MovementPenalty::first();
    expect($penalty->overdue_days)->toBe(1);
    expect((float) $penalty->total_fine)->toBe(20.00);

    // On Oct 16 at 08:00 AM, 2 overdue days = 40 BDT
    Carbon::setTestNow('2026-10-16 08:00:00');
    $service->sync();
    $penalty->refresh();
    expect($penalty->overdue_days)->toBe(2);
    expect((float) $penalty->total_fine)->toBe(40.00);
});

test('multi-day movement generates on_duty attendance without check-in/out times', function () {
    // Oct 12 is Monday, Oct 13 is Tuesday, Oct 14 is Wednesday
    $movement = Movement::create([
        'employee_id' => $this->employee->id,
        'movement_type' => 'official',
        'from_datetime' => '2026-10-12 10:00:00',
        'to_datetime' => '2026-10-14 18:00:00',
        'destination' => 'Sylhet Field Visit',
        'purpose' => 'Branch Audit',
        'is_multi_day' => true,
        'status' => 'active',
    ]);

    $controller = new \App\Http\Controllers\Movement\MovementController;
    $controller->updateAttendanceForMovement($movement);

    $attendances = Attendance::where('employee_id', $this->employee->id)->orderBy('date')->get();
    expect($attendances)->toHaveCount(3);

    foreach ($attendances as $att) {
        expect($att->status)->toBe('on_duty');
        expect($att->check_in)->toBeNull();
        expect($att->check_out)->toBeNull();
        expect($att->movement_id)->toBe($movement->id);
        expect($att->remarks)->toContain('Branch Audit');
    }
});

test('early close of multi-day movement unlinks future days', function () {
    // Scheduled Oct 12 to Oct 15
    $movement = Movement::create([
        'employee_id' => $this->employee->id,
        'movement_type' => 'official',
        'from_datetime' => '2026-10-12 10:00:00',
        'to_datetime' => '2026-10-15 18:00:00',
        'destination' => 'Khulna Branch',
        'purpose' => 'Inspection',
        'is_multi_day' => true,
        'status' => 'active',
    ]);

    $controller = new \App\Http\Controllers\Movement\MovementController;
    $controller->updateAttendanceForMovement($movement);

    expect(Attendance::where('movement_id', $movement->id)->count())->toBe(4);

    // Completed early on Oct 13
    $returnTime = Carbon::parse('2026-10-13 17:00:00');
    $movement->update([
        'status' => 'completed',
        'actual_return_datetime' => $returnTime,
    ]);
    $controller->clearMovementAttendanceSpillover($movement, '09:00:00', $returnTime);

    // Oct 12 and Oct 13 should remain linked; Oct 14 and Oct 15 should be unlinked
    $linkedAttendances = Attendance::where('movement_id', $movement->id)
        ->get()
        ->map(fn ($a) => Carbon::parse($a->date)->format('Y-m-d'))
        ->toArray();
    expect($linkedAttendances)->toContain('2026-10-12');
    expect($linkedAttendances)->toContain('2026-10-13');
    expect($linkedAttendances)->not->toContain('2026-10-14');
    expect($linkedAttendances)->not->toContain('2026-10-15');
});
