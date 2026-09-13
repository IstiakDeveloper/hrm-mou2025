<?php

use App\Support\MonthlyAttendanceCalculator;
use Carbon\Carbon;

test('approved leave and public holiday are not marked absent', function () {
    $month = Carbon::parse('2026-06-01');
    $employee = (object) [
        'id' => 11,
        'current_branch_id' => 1,
        'joining_date' => '2024-01-01',
    ];

    $result = MonthlyAttendanceCalculator::compute(
        [$employee],
        $month,
        30,
        null,
        [1 => ['weekend_days' => [5, 6]]],
        [],
        [11 => ['2026-06-02' => 'Casual Leave']],
        ['*' => ['2026-06-03' => true]],
        [],
        [5, 6]
    );

    expect($result['dailyStatusByEmployee'][11][2]['status'])->toBe('leave')
        ->and($result['dailyStatusByEmployee'][11][3]['status'])->toBe('holiday')
        ->and($result['summaryByEmployee'][11]['leave'])->toBe(1)
        ->and($result['summaryByEmployee'][11]['holiday'])->toBe(1)
        ->and($result['summaryByEmployee'][11]['absent'])->toBeGreaterThan(0);
});
