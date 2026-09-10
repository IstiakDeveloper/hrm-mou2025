<?php

use App\Support\MonthlyAttendanceCalculator;
use Carbon\Carbon;

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
