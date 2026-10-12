<?php

use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceCommand;
use App\Models\AttendanceDeviceUser;
use App\Models\Branch;
use App\Models\Employee;
use App\Services\AdmsDeviceCommandService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropAllTables();
    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name');
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
        $table->string('status')->default('active');
        $table->timestamps();
    });

    Schema::create('attendance_devices', function (Blueprint $table) {
        $table->id();
        $table->string('device_id');
        $table->string('name');
        $table->string('ip_address');
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
        $table->unique(['attendance_device_id', 'pin']);
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

    $this->branch = Branch::create(['name' => 'Gate']);
    $this->otherBranch = Branch::create(['name' => 'Other']);
    $this->device = AttendanceDevice::create([
        'device_id' => 'GATE-1',
        'name' => 'Gate',
        'ip_address' => '127.0.0.1',
        'branch_id' => $this->branch->id,
        'status' => 'active',
        'adms_enabled' => true,
    ]);
    $this->service = app(AdmsDeviceCommandService::class);
});

function makePushEmployee(int $branchId, string $employeeId, string $name, ?string $biometric = null, ?string $deviceUserId = null): Employee
{
    return Employee::withoutEvents(function () use ($branchId, $employeeId, $name, $biometric, $deviceUserId) {
        $employee = Employee::create([
            'employee_id' => $employeeId,
            'pin' => $employeeId,
            'name_en' => $name,
            'current_branch_id' => $branchId,
            'status' => 'active',
        ]);
        $employee->biometric_id = $biometric;
        $employee->device_user_id = $deviceUserId;
        $employee->save();

        return $employee;
    });
}

test('a new user command only carries the pin and name', function () {
    $body = $this->service->updateUserCommand('01015', "Karim\tAli\n");

    expect($body)->toBe("DATA UPDATE USERINFO PIN=1015\tName=Karim Ali\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000100000000")
        ->and($this->service->isSafeBody($body))->toBeTrue()
        ->and($this->service->isSafeBody('CLEAR DATA'))->toBeFalse()
        ->and($this->service->isSafeBody('CLEAR LOG'))->toBeFalse()
        ->and($this->service->isSafeBody('DATA DELETE USERINFO PIN=1015'))->toBeFalse();
});

test('people already listed on the device are not pushed', function () {
    makePushEmployee($this->branch->id, 'E-1', 'Already There', '1015');
    makePushEmployee($this->branch->id, 'E-2', 'Missing Person', '2020');
    makePushEmployee($this->otherBranch->id, 'E-3', 'Other Branch', '3030');

    $this->service->recordPins($this->device, ['PIN is not parsed here', '1015']);
    AttendanceDeviceUser::query()->update(['last_seen_at' => now()]);

    $queued = $this->service->queueMissing($this->device, false);

    $pins = AttendanceDeviceCommand::query()->where('kind', 'update_user')->pluck('pin')->all();

    expect($queued)->toBe(1)
        ->and($pins)->toBe(['2020'])
        ->and(AttendanceDeviceUser::query()->where('pin', '1015')->exists())->toBeTrue();
});

test('a pin reported by the device cancels a pending add for that same person', function () {
    makePushEmployee($this->branch->id, 'E-2', 'Missing Person', '2020');
    $this->service->queueMissing($this->device, true);

    $query = AttendanceDeviceCommand::query()->create([
        'attendance_device_id' => $this->device->id,
        'kind' => 'query_users',
        'body' => 'DATA QUERY USERINFO',
        'status' => 'sent',
        'sent_at' => now(),
    ]);

    $this->service->recordPins($this->device, AdmsDeviceCommandService::extractPins("USER PIN=2020\tName=Missing Person"));

    expect(AttendanceDeviceCommand::query()->where('kind', 'update_user')->where('pin', '2020')->value('status'))->toBe('cancelled')
        ->and($query->fresh())->not->toBeNull();
});

test('an attendance line is not treated as a device user', function () {
    expect(AdmsDeviceCommandService::extractPins("1015\t2026-10-12 09:00:00\t1\t0"))->toBe([])
        ->and(AdmsDeviceCommandService::extractPins("USER PIN=1015\tName=Karim"))->toBe(['1015']);
});

test('the next command skips a known user and never sends a wipe', function () {
    AttendanceDeviceUser::query()->create([
        'attendance_device_id' => $this->device->id,
        'pin' => '1015',
        'last_seen_at' => now(),
    ]);

    AttendanceDeviceCommand::query()->create([
        'attendance_device_id' => $this->device->id,
        'kind' => 'update_user',
        'pin' => '1015',
        'body' => $this->service->updateUserCommand('1015', 'Already'),
        'status' => 'pending',
    ]);
    AttendanceDeviceCommand::query()->create([
        'attendance_device_id' => $this->device->id,
        'kind' => 'update_user',
        'pin' => '1',
        'body' => 'CLEAR DATA',
        'status' => 'pending',
    ]);
    AttendanceDeviceCommand::query()->create([
        'attendance_device_id' => $this->device->id,
        'kind' => 'update_user',
        'pin' => '2020',
        'body' => $this->service->updateUserCommand('2020', 'New User'),
        'status' => 'pending',
    ]);

    $wire = $this->service->nextWireCommand($this->device);

    expect($wire)->toStartWith('C:')
        ->and($wire)->toContain('PIN=2020')
        ->and($wire)->not->toContain('CLEAR')
        ->and(AttendanceDeviceCommand::query()->where('pin', '1015')->value('status'))->toBe('cancelled')
        ->and(AttendanceDeviceCommand::query()->where('body', 'CLEAR DATA')->value('status'))->toBe('failed');
});

test('only the chosen employee is queued and someone already on the device is skipped', function () {
    $missing = makePushEmployee($this->branch->id, 'E-2', 'Missing Person', '2020');
    $present = makePushEmployee($this->branch->id, 'E-1', 'Already There', '1015');

    $this->service->recordPins($this->device, ['1015']);

    $queued = $this->service->queueSelected($this->device, [$missing->id, $present->id, 9999]);
    $pins = AttendanceDeviceCommand::query()->where('kind', 'update_user')->pluck('pin')->all();

    expect($queued)->toBe(1)
        ->and($pins)->toBe(['2020'])
        ->and(AttendanceDeviceCommand::query()->where('kind', 'query_users')->where('status', 'pending')->exists())->toBeTrue();
});

test('the branch list keeps the real pin and still includes employees without a device number', function () {
    makePushEmployee($this->branch->id, '0128', 'Erfan Ali', '128', '0128');
    makePushEmployee($this->branch->id, 'SG-1', 'Guard Pin', null, null);

    $rows = collect($this->service->candidateRows($this->device))->keyBy('pin');

    expect($rows->has('0128'))->toBeTrue()
        ->and($rows['0128']['search'])->toContain('0128')
        ->and($rows['0128']['can_push'])->toBeTrue()
        ->and($rows->has('SG-1'))->toBeTrue()
        ->and($rows['SG-1']['can_push'])->toBeTrue();
});

test('a text pin can be queued without changing someone already on the device', function () {
    $guard = makePushEmployee($this->branch->id, 'SG-3', 'Ratan Ali', null, null);
    $present = makePushEmployee($this->branch->id, '0050', 'Arun Ghosh', '50', '0050');

    $this->service->recordPins($this->device, ['0050']);
    $queued = $this->service->queueSelected($this->device, [$guard->id, $present->id]);
    $body = (string) AttendanceDeviceCommand::query()->where('kind', 'update_user')->value('body');

    expect($queued)->toBe(1)
        ->and($body)->toContain('PIN=SG3')
        ->and($body)->not->toContain('SG-3')
        ->and($this->service->isSafeBody($body))->toBeTrue()
        ->and($body)->not->toContain('PIN=50');
});

test('an empty device is not filled until the user list has had time to arrive', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-12 12:00:00'));
    makePushEmployee($this->branch->id, 'E-9', 'Brand New', '9090');

    $this->service->requestPush($this->device, true);
    $query = AttendanceDeviceCommand::query()->where('kind', 'query_users')->first();
    $query->status = 'done';
    $query->acked_at = now();
    $query->save();

    expect($this->service->nextWireCommand($this->device))->toBeNull()
        ->and(AttendanceDeviceCommand::query()->where('kind', 'update_user')->count())->toBe(0);

    Carbon::setTestNow(now()->addSeconds(31));

    $wire = $this->service->nextWireCommand($this->device);

    expect($wire)->toContain('PIN=9090');
    Carbon::setTestNow();
});
