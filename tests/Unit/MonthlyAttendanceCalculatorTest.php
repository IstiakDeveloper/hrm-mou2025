<?php

use App\Models\OfficeOpenDate;
use App\Support\MonthlyAttendanceCalculator;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

function monthlyEmployee(int $id, ?string $joiningDate = null): object
{
    return (object) [
        'id' => $id,
        'current_branch_id' => 1,
        'joining_date' => $joiningDate,
    ];
}

test('days before joining date are blank and not counted as absent', function () {
    $month = Carbon::parse('2026-07-01');
    $result = MonthlyAttendanceCalculator::compute(
        [monthlyEmployee(2874, '2026-07-19')],
        $month,
        31,
        null,
        [1 => ['weekend_days' => [5, 6]]],
        [],
        [],
        [],
        [],
        [5, 6]
    );

    expect($result['dailyStatusByEmployee'][2874][18]['status'])->toBeNull()
        ->and($result['dailyStatusByEmployee'][2874][19]['status'])->toBe('absent')
        ->and($result['summaryByEmployee'][2874]['absent'])->toBe(10)
        ->and($result['summaryByEmployee'][2874]['weekend'])->toBe(3);
});

test('staff without a joining date still receive a status for working days', function () {
    $month = Carbon::parse('2026-06-01');
    $result = MonthlyAttendanceCalculator::compute(
        [monthlyEmployee(10)],
        $month,
        30,
        null,
        [1 => ['weekend_days' => [5, 6]]],
        [],
        [],
        [],
        [],
        [5, 6]
    );

    expect($result['dailyStatusByEmployee'][10][1]['status'])->toBe('absent')
        ->and($result['summaryByEmployee'][10]['absent'])->toBeGreaterThan(0);
});

test('stored present without check-in is still present, not absent', function () {
    $month = Carbon::parse('2025-12-01');
    $result = MonthlyAttendanceCalculator::compute(
        [monthlyEmployee(4, '2023-10-12')],
        $month,
        31,
        null,
        [1 => ['weekend_days' => [5, 6]]],
        [],
        [],
        [],
        [
            4 => [
                '2025-12-03' => ['status' => 'present', 'check_in' => null, 'check_out' => null],
            ],
        ],
        [5, 6]
    );

    expect($result['dailyStatusByEmployee'][4][3]['status'])->toBe('present')
        ->and($result['summaryByEmployee'][4]['absent'])->toBe(22);
});

test('an office open saturday stays a working day and other saturdays stay weekend', function () {
    if (! Schema::hasTable('office_open_dates')) {
        Schema::create('office_open_dates', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    OfficeOpenDate::query()->whereDate('date', '2026-10-17')->delete();
    OfficeOpenDate::forgetCache();
    OfficeOpenDate::create([
        'date' => '2026-10-17',
        'note' => 'Office open',
    ]);
    OfficeOpenDate::forgetCache();

    $month = Carbon::parse('2026-10-01');
    $result = MonthlyAttendanceCalculator::compute(
        [monthlyEmployee(1, '2020-01-01')],
        $month,
        31,
        null,
        [1 => ['weekend_days' => [5, 6]]],
        [],
        [],
        [],
        [
            1 => [
                '2026-10-17' => ['status' => 'present', 'check_in' => '09:00:00', 'check_out' => '17:00:00'],
            ],
        ],
        [5, 6]
    );

    expect($result['dailyStatusByEmployee'][1][16]['status'])->toBe('weekend')
        ->and($result['dailyStatusByEmployee'][1][17]['status'])->toBe('present')
        ->and($result['dailyStatusByEmployee'][1][10]['status'])->toBe('weekend');

    OfficeOpenDate::query()->whereDate('date', '2026-10-17')->delete();
    OfficeOpenDate::forgetCache();
});
