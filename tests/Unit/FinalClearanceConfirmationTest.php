<?php

use App\Models\FinalClearance;
use App\Services\FinalClearanceService;

test('recomputeService clears confirmation date and days when not_confirmed is true', function () {
    $service = app(FinalClearanceService::class);

    $clearance = new FinalClearance([
        'joining_date' => '2024-01-01',
        'confirmation_date' => '2024-07-01',
        'dropout_date' => '2025-01-01',
        'not_confirmed' => true,
    ]);

    $service->recomputeService($clearance);

    expect($clearance->confirmation_date)->toBeNull()
        ->and($clearance->confirmation_days)->toBeNull()
        ->and($clearance->service_length_label)->not->toBeNull();
});

test('recomputeService calculates confirmation days when confirmed with date', function () {
    $service = app(FinalClearanceService::class);

    $clearance = new FinalClearance([
        'joining_date' => '2024-01-01',
        'confirmation_date' => '2024-07-01',
        'dropout_date' => '2024-07-11',
        'not_confirmed' => false,
    ]);

    $service->recomputeService($clearance);

    expect($clearance->confirmation_date)->not->toBeNull()
        ->and($clearance->confirmation_days)->toBe(10);
});

test('lengthLabels returns null for confirmation length when not_confirmed is true', function () {
    $service = app(FinalClearanceService::class);

    $clearance = new FinalClearance([
        'joining_date' => '2024-01-01',
        'confirmation_date' => null,
        'dropout_date' => '2025-01-01',
        'not_confirmed' => true,
    ]);

    $labels = $service->lengthLabels($clearance);

    expect($labels['joining_length_label'])->toBe('1Y 0M 0D')
        ->and($labels['confirmation_length_label'])->toBeNull();
});

test('lengthLabels returns formatted string when confirmation_date is set and not_confirmed is false', function () {
    $service = app(FinalClearanceService::class);

    $clearance = new FinalClearance([
        'joining_date' => '2024-01-01',
        'confirmation_date' => '2024-07-01',
        'dropout_date' => '2025-01-01',
        'not_confirmed' => false,
    ]);

    $labels = $service->lengthLabels($clearance);

    expect($labels['confirmation_length_label'])->toBe('0Y 6M 0D');
});
