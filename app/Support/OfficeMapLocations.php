<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\RegionalOffice;
use App\Models\Zone;
use Illuminate\Support\Collection;

final class OfficeMapLocations
{
    /**
     * @return array{
     *     locations: list<array<string, mixed>>,
     *     counts: array{head_office: int, zone: int, region: int, branch: int},
     *     orgLogo: string
     * }
     */
    public static function payload(): array
    {
        $branches = Branch::query()
            ->where('is_active', true)
            ->where(function ($query): void {
                $query->where('is_head_office', true)
                    ->orWhere(function ($inner): void {
                        $inner->where('is_head_office', false)
                            ->where('name', '!=', 'Unknown')
                            ->where('branch_code', '!=', '1000');
                    });
            })
            ->get([
                'id',
                'name',
                'branch_code',
                'address',
                'contact_number',
                'geofence_latitude',
                'geofence_longitude',
                'is_head_office',
                'regional_office_id',
            ]);

        $regionalOffices = RegionalOffice::query()
            ->where('is_active', true)
            ->get(['id', 'name', 'code', 'zone_id']);

        $zones = Zone::query()
            ->where('is_active', true)
            ->get(['id', 'name', 'code']);

        return self::build($branches, $regionalOffices, $zones);
    }

    /**
     * One pin per physical office (42 branches + head office).
     * Zone / regional offices are those same branches, identified by name.
     *
     * @param  Collection<int, Branch>  $branches
     * @param  Collection<int, RegionalOffice>  $regionalOffices
     * @param  Collection<int, Zone>  $zones
     * @return array{
     *     locations: list<array<string, mixed>>,
     *     counts: array{head_office: int, zone: int, region: int, branch: int},
     *     orgLogo: string
     * }
     */
    public static function build(
        Collection $branches,
        Collection $regionalOffices,
        Collection $zones,
    ): array {
        $locations = [];

        foreach ($branches as $branch) {
            $type = self::classify($branch, $zones, $regionalOffices);
            $hasCoords = $branch->geofence_latitude !== null && $branch->geofence_longitude !== null;
            $area = self::resolveArea($branch, $zones, $regionalOffices);

            $row = [
                'id' => 'branch-'.$branch->id,
                'type' => $type,
                'name' => $branch->name,
                'code' => $branch->branch_code,
                'latitude' => $hasCoords ? (float) $branch->geofence_latitude : null,
                'longitude' => $hasCoords ? (float) $branch->geofence_longitude : null,
                'address' => $branch->address,
                'phone' => $branch->contact_number,
                'is_head_office' => (bool) $branch->is_head_office,
                'is_zone_office' => $type === 'zone',
                'is_regional_office' => $type === 'region',
                'zone_id' => $area['zone_id'],
                'zone_name' => $area['zone_name'],
                'region_id' => $area['region_id'],
                'region_name' => $area['region_name'],
            ];

            $locations[] = $row;
        }

        $typeOrder = ['head_office' => 0, 'zone' => 1, 'region' => 2, 'branch' => 3];
        usort($locations, function (array $a, array $b) use ($typeOrder): int {
            $cmp = ($typeOrder[$a['type']] ?? 9) <=> ($typeOrder[$b['type']] ?? 9);
            if ($cmp !== 0) {
                return $cmp;
            }

            return strcasecmp((string) $a['name'], (string) $b['name']);
        });

        $counts = [
            'head_office' => 0,
            'zone' => 0,
            'region' => 0,
            'branch' => 0,
        ];
        foreach ($locations as $location) {
            $counts[$location['type']]++;
        }

        $mapped = array_values(array_filter(
            $locations,
            fn (array $location): bool => $location['latitude'] !== null && $location['longitude'] !== null
        ));

        return [
            'locations' => $mapped,
            'counts' => $counts,
            'orgLogo' => '/logo.png',
        ];
    }

    /**
     * @param  Collection<int, Zone>  $zones
     * @param  Collection<int, RegionalOffice>  $regionalOffices
     * @return array{zone_id: int|null, zone_name: string|null, region_id: int|null, region_name: string|null}
     */
    public static function resolveArea(Branch $branch, Collection $zones, Collection $regionalOffices): array
    {
        $regionalOffice = $branch->regional_office_id
            ? $regionalOffices->firstWhere('id', $branch->regional_office_id)
            : null;
        $zone = $zones->firstWhere('id', $regionalOffice?->zone_id);

        foreach ($zones as $candidate) {
            if (self::namesMatch((string) $candidate->name, (string) $branch->name)) {
                $zone = $candidate;
                break;
            }
        }

        return [
            'zone_id' => $zone?->id,
            'zone_name' => $zone?->name,
            'region_id' => $regionalOffice?->id,
            'region_name' => $regionalOffice?->name,
        ];
    }

    /**
     * @param  Collection<int, Zone>  $zones
     * @param  Collection<int, RegionalOffice>  $regionalOffices
     */
    public static function classify(Branch $branch, Collection $zones, Collection $regionalOffices): string
    {
        if ($branch->is_head_office) {
            return 'head_office';
        }

        foreach ($zones as $zone) {
            if (self::namesMatch((string) $zone->name, (string) $branch->name)) {
                return 'zone';
            }
        }

        foreach ($regionalOffices as $regionalOffice) {
            if (self::namesMatch((string) $regionalOffice->name, (string) $branch->name)) {
                return 'region';
            }
        }

        return 'branch';
    }

    public static function namesMatch(string $officeName, string $branchName): bool
    {
        $office = self::normalizeName($officeName);
        $branch = self::normalizeName($branchName);

        if ($office === '' || $branch === '') {
            return false;
        }

        if ($office === $branch) {
            return true;
        }

        if (str_starts_with($branch, $office.' ') || str_starts_with($office, $branch.' ')) {
            return true;
        }

        return self::stripPlaceSuffix($office) === self::stripPlaceSuffix($branch);
    }

    private static function normalizeName(string $name): string
    {
        $normalized = strtolower(trim($name));
        $normalized = (string) preg_replace('/\s+/', ' ', $normalized);

        return $normalized;
    }

    private static function stripPlaceSuffix(string $name): string
    {
        return trim((string) preg_replace('/\s+(sadar|hat|branch)$/i', '', $name));
    }
}
