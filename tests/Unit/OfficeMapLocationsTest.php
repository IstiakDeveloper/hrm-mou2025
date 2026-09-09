<?php

use App\Models\Branch;
use App\Models\RegionalOffice;
use App\Models\Zone;
use App\Support\OfficeMapLocations;
use Illuminate\Support\Facades\Route;

function makeZone(int $id, string $name, string $code): Zone
{
    $zone = new Zone([
        'name' => $name,
        'code' => $code,
        'is_active' => true,
    ]);
    $zone->id = $id;

    return $zone;
}

function makeRegionalOffice(int $id, int $zoneId, string $name, string $code): RegionalOffice
{
    $office = new RegionalOffice([
        'zone_id' => $zoneId,
        'name' => $name,
        'code' => $code,
        'is_active' => true,
    ]);
    $office->id = $id;

    return $office;
}

function makeBranch(
    int $id,
    string $name,
    string $code,
    ?int $regionalOfficeId,
    ?float $lat,
    ?float $lng,
    bool $headOffice = false,
): Branch {
    $branch = new Branch([
        'regional_office_id' => $regionalOfficeId,
        'name' => $name,
        'branch_code' => $code,
        'address' => $name.' Road',
        'contact_number' => '0170000000'.$id,
        'is_head_office' => $headOffice,
        'is_active' => true,
        'geofence_latitude' => $lat,
        'geofence_longitude' => $lng,
    ]);
    $branch->id = $id;

    return $branch;
}

test('office map route is registered without auth or permission middleware', function () {
    $route = Route::getRoutes()->getByName('office-map.index');

    expect($route)->not->toBeNull()
        ->and($route->uri())->toBe('office-map')
        ->and($route->gatherMiddleware())->not->toContain('auth')
        ->and($route->gatherMiddleware())->not->toContain('permission:branches.view');
});

test('zone and regional offices reuse the same branch pin instead of extra centroids', function () {
    $zone = makeZone(1, 'Raninagar', '01');
    $regionalOffice = makeRegionalOffice(10, 1, 'Atrai', '101');
    $naogaonRo = makeRegionalOffice(11, 1, 'Naogaon', '106');

    $raninagar = makeBranch(21, 'Raninagar', '0003', 10, 24.7, 88.9);
    $atrai = makeBranch(22, 'Atrai', '0002', 10, 24.6, 88.98);
    $naogaonSadar = makeBranch(23, 'Naogaon Sadar', '0001', 11, 24.8, 88.9);
    $regular = makeBranch(24, 'Bhabanipur', '0004', 10, 24.63, 88.94);
    $headOffice = makeBranch(25, 'Head Office', 'HO', null, 23.8, 90.4, true);
    $noCoords = makeBranch(26, 'Kahaloo', '0042', 10, null, null);

    $payload = OfficeMapLocations::build(
        collect([$raninagar, $atrai, $naogaonSadar, $regular, $headOffice, $noCoords]),
        collect([$regionalOffice, $naogaonRo]),
        collect([$zone]),
    );

    expect($payload['counts'])->toBe([
        'head_office' => 1,
        'zone' => 1,
        'region' => 2,
        'branch' => 2,
    ])->and($payload['locations'])->toHaveCount(5);

    $byName = collect($payload['locations'])->keyBy('name');

    expect($byName['Raninagar']['type'])->toBe('zone')
        ->and($byName['Raninagar']['zone_name'])->toBe('Raninagar')
        ->and($byName['Atrai']['type'])->toBe('region')
        ->and($byName['Atrai']['region_name'])->toBe('Atrai')
        ->and($byName['Naogaon Sadar']['type'])->toBe('region')
        ->and($byName['Bhabanipur']['type'])->toBe('branch')
        ->and($byName['Bhabanipur']['zone_name'])->toBe('Raninagar')
        ->and($byName['Head Office']['type'])->toBe('head_office')
        ->and($byName->has('Kahaloo'))->toBeFalse();
});

test('office names match with sadar suffix', function () {
    expect(OfficeMapLocations::namesMatch('Naogaon', 'Naogaon Sadar'))->toBeTrue()
        ->and(OfficeMapLocations::namesMatch('Atrai', 'Atrai'))->toBeTrue()
        ->and(OfficeMapLocations::namesMatch('Raninagar', 'Bhabanipur'))->toBeFalse();
});
