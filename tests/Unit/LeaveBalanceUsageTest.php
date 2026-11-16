<?php

use App\Models\LeaveBalance;

test('paid leave consume and restore keep remaining days in sync', function () {
    $balance = new LeaveBalance([
        'allocated_days' => 20,
        'used_days' => 0,
        'remaining_days' => 20,
    ]);

    $balance->applyUsage(3, true);

    expect($balance->used_days)->toBe(3.0)
        ->and($balance->remaining_days)->toBe(17.0);

    $balance->restoreUsage(3, true);

    expect($balance->used_days)->toBe(0.0)
        ->and($balance->remaining_days)->toBe(20.0);
});

test('unpaid leave remaining days never go below zero', function () {
    $balance = new LeaveBalance([
        'allocated_days' => 0,
        'used_days' => 0,
        'remaining_days' => 0,
    ]);

    $balance->applyUsage(2, false);

    expect($balance->used_days)->toBe(2.0)
        ->and($balance->remaining_days)->toBe(0.0);

    $balance->restoreUsage(2, false);

    expect($balance->used_days)->toBe(0.0)
        ->and($balance->remaining_days)->toBe(0.0);
});
