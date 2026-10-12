<?php

use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\GuardShiftSetting;
use App\Services\ZktecoAttendanceIngestService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropAllTables();
    buildGuardShiftSchema();
    GuardShiftSetting::forgetCurrent();

    $this->branch = Branch::create([
        'name' => 'Head Office',
        'branch_code' => 'HO',
    ]);

    $this->department = Department::create([
        'name' => 'Administration',
    ]);

    $this->guardDesignation = Designation::create([
        'name' => 'Security Guard',
    ]);

    $this->officeDesignation = Designation::create([
        'name' => 'Accounts Officer',
    ]);

    $this->device = AttendanceDevice::create([
        'device_id' => 'GATE-1',
        'name' => 'Gate',
        'ip_address' => '127.0.0.1',
        'branch_id' => $this->branch->id,
    ]);

    $this->guard = makeShiftEmployee('9001', 'Guard One', $this->guardDesignation->id, $this->branch->id, $this->department->id);
    $this->officer = makeShiftEmployee('9002', 'Office One', $this->officeDesignation->id, $this->branch->id, $this->department->id);
});

function buildGuardShiftSchema(): void
{
    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('branch_code')->nullable();
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
        $table->string('employee_id');
        $table->string('pin')->nullable();
        $table->string('name_en')->nullable();
        $table->string('email')->nullable();
        $table->date('joining_date')->nullable();
        $table->unsignedBigInteger('department_id')->nullable();
        $table->unsignedBigInteger('designation_id')->nullable();
        $table->unsignedBigInteger('current_branch_id')->nullable();
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
        $table->timestamps();
    });

    Schema::create('employee_attendance_times', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id')->unique();
        $table->time('work_start_time')->nullable();
        $table->time('work_end_time')->nullable();
        $table->unsignedSmallInteger('late_threshold_minutes')->nullable();
        $table->unsignedSmallInteger('half_day_hours')->nullable();
        $table->boolean('is_active')->default(true);
        $table->text('remarks')->nullable();
        $table->timestamps();
    });

    Schema::create('attendance_settings', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->time('work_start_time')->nullable();
        $table->time('work_end_time')->nullable();
        $table->integer('late_threshold_minutes')->nullable();
        $table->integer('half_day_hours')->nullable();
        $table->json('weekend_days')->nullable();
        $table->boolean('enable_bulk_attendance')->default(true);
        $table->timestamps();
    });

    Schema::create('guard_shift_settings', function (Blueprint $table) {
        $table->id();
        $table->boolean('is_enabled')->default(true);
        $table->json('designation_ids')->nullable();
        $table->time('day_start')->default('09:00:00');
        $table->time('day_end')->default('19:00:00');
        $table->time('night_start')->default('19:00:00');
        $table->time('night_end')->default('09:00:00');
        $table->unsignedSmallInteger('grace_minutes')->default(60);
        $table->boolean('work_on_weekend')->default(true);
        $table->timestamps();
    });

    Schema::create('attendances', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->date('date');
        $table->time('check_in')->nullable();
        $table->time('check_out')->nullable();
        $table->string('status')->default('absent');
        $table->string('shift_type', 10)->nullable();
        $table->boolean('checkout_next_day')->default(false);
        $table->unsignedBigInteger('device_id')->nullable();
        $table->unsignedBigInteger('movement_id')->nullable();
        $table->text('remarks')->nullable();
        $table->timestamps();
        $table->unique(['employee_id', 'date']);
    });

    Schema::create('holidays', function (Blueprint $table) {
        $table->id();
        $table->date('date')->nullable();
        $table->boolean('is_recurring')->default(false);
        $table->json('applicable_branches')->nullable();
        $table->timestamps();
    });

    Schema::create('leave_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('status')->nullable();
        $table->date('start_date')->nullable();
        $table->date('end_date')->nullable();
        $table->timestamps();
    });

    Schema::create('movements', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('movement_type')->nullable();
        $table->string('status')->nullable();
        $table->dateTime('from_datetime')->nullable();
        $table->timestamps();
    });
}

function makeShiftEmployee(string $pin, string $name, int $designationId, int $branchId, int $departmentId): Employee
{
    return Employee::withoutEvents(fn () => Employee::create([
        'employee_id' => $pin,
        'pin' => $pin,
        'name_en' => $name,
        'email' => $pin.'@example.test',
        'joining_date' => '2024-01-01',
        'department_id' => $departmentId,
        'designation_id' => $designationId,
        'current_branch_id' => $branchId,
        'status' => 'active',
    ]));
}

function punchShift(Employee $employee, AttendanceDevice $device, string $timestamp): void
{
    $saved = app(ZktecoAttendanceIngestService::class)->ingestPunch(
        $device,
        (string) $employee->pin,
        $timestamp
    );

    expect($saved)->toBeTrue();
}

function attendanceOn(Employee $employee, string $date): ?Attendance
{
    return Attendance::query()
        ->where('employee_id', $employee->id)
        ->whereDate('date', $date)
        ->first();
}

function clockOf(mixed $value): ?string
{
    return $value ? Carbon::parse($value)->format('H:i') : null;
}

test('a guard day shift stays on that calendar day', function () {
    punchShift($this->guard, $this->device, '2026-10-12 09:10:00');
    punchShift($this->guard, $this->device, '2026-10-12 18:50:00');

    $row = attendanceOn($this->guard, '2026-10-12');

    expect($row)->not->toBeNull()
        ->and($row->shift_type)->toBe('day')
        ->and($row->status)->toBe('present')
        ->and($row->checkout_next_day)->toBeFalse()
        ->and(clockOf($row->check_in))->toBe('09:10')
        ->and(clockOf($row->check_out))->toBe('18:50');
});

test('a guard night shift closes on the next morning and is not a new check-in', function () {
    punchShift($this->guard, $this->device, '2026-10-13 19:20:00');
    punchShift($this->guard, $this->device, '2026-10-14 08:40:00');

    $night = attendanceOn($this->guard, '2026-10-13');
    $nextMorning = attendanceOn($this->guard, '2026-10-14');

    expect($night)->not->toBeNull()
        ->and($night->shift_type)->toBe('night')
        ->and($night->status)->toBe('present')
        ->and($night->checkout_next_day)->toBeTrue()
        ->and(clockOf($night->check_in))->toBe('19:20')
        ->and(clockOf($night->check_out))->toBe('08:40')
        ->and($nextMorning)->toBeNull();
});

test('guard punches outside the grace window are late or half day', function () {
    punchShift($this->guard, $this->device, '2026-10-15 20:15:00');

    $late = attendanceOn($this->guard, '2026-10-15');

    expect($late->shift_type)->toBe('night')
        ->and($late->status)->toBe('late');

    punchShift($this->guard, $this->device, '2026-10-20 19:00:00');
    punchShift($this->guard, $this->device, '2026-10-21 07:30:00');

    $early = attendanceOn($this->guard, '2026-10-20');

    expect($early->shift_type)->toBe('night')
        ->and($early->status)->toBe('half_day')
        ->and($early->checkout_next_day)->toBeTrue()
        ->and(clockOf($early->check_out))->toBe('07:30');
});

test('guard weekend punches are kept and office punches are not', function () {
    punchShift($this->guard, $this->device, '2026-10-16 09:10:00');
    punchShift($this->guard, $this->device, '2026-10-16 18:50:00');
    punchShift($this->officer, $this->device, '2026-10-16 09:10:00');

    $guard = attendanceOn($this->guard, '2026-10-16');
    $officer = attendanceOn($this->officer, '2026-10-16');

    expect($guard->shift_type)->toBe('day')
        ->and($guard->status)->toBe('present')
        ->and(clockOf($guard->check_in))->toBe('09:10')
        ->and(clockOf($guard->check_out))->toBe('18:50')
        ->and($officer->status)->toBe('weekend')
        ->and($officer->check_in)->toBeNull()
        ->and($officer->check_out)->toBeNull()
        ->and($officer->shift_type)->toBeNull();
});

test('office staff keep the normal same-day office rules', function () {
    punchShift($this->officer, $this->device, '2026-10-12 09:10:00');
    punchShift($this->officer, $this->device, '2026-10-12 17:00:00');

    $row = attendanceOn($this->officer, '2026-10-12');

    expect($row->status)->toBe('present')
        ->and($row->shift_type)->toBeNull()
        ->and($row->checkout_next_day)->toBeFalse()
        ->and(clockOf($row->check_in))->toBe('09:10')
        ->and(clockOf($row->check_out))->toBe('17:00');
});
