<?php

use App\Services\OrganogramLineRoleSyncService;

test('maps numbered branch manager titles and skips assistant branch manager', function () {
    $service = new OrganogramLineRoleSyncService;

    expect($service->additionalRoleNamesFromDesignation('Branch Manager-1'))->toBe(['Branch Manager'])
        ->and($service->additionalRoleNamesFromDesignation('Branch Manager'))->toBe(['Branch Manager'])
        ->and($service->additionalRoleNamesFromDesignation('Assistant Branch Manager'))->toBe([])
        ->and($service->additionalRoleNamesFromDesignation('Assistant Branch Manager-1'))->toBe([]);
});

test('maps zonal and regional manager titles including numbered variants', function () {
    $service = new OrganogramLineRoleSyncService;

    expect($service->additionalRoleNamesFromDesignation('Zonal Manager'))->toBe(['Zonal Manager'])
        ->and($service->additionalRoleNamesFromDesignation('Zonal Manager-2'))->toBe(['Zonal Manager'])
        ->and($service->additionalRoleNamesFromDesignation('Regional Manager'))->toBe(['Regional Manager'])
        ->and($service->additionalRoleNamesFromDesignation('Regional Manager-1'))->toBe(['Regional Manager']);
});

test('maps head office director titles', function () {
    $service = new OrganogramLineRoleSyncService;

    expect($service->additionalRoleNamesFromDesignation('Executive Director'))->toBe(['Executive Director'])
        ->and($service->additionalRoleNamesFromDesignation('Assistant Director (Microfinance)'))->toBe(['Assistant Director (Microfinance)'])
        ->and($service->additionalRoleNamesFromDesignation('Director (Microfinance)'))->toBe(['Director (Microfinance)']);
});
