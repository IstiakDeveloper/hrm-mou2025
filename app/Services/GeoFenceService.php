<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\User;
use App\Models\Zone;
use App\Services\OrganogramAccessService;
use Illuminate\Support\Collection;

class GeoFenceService
{
    /**
     * Distance in meters between two points using Haversine formula.
     */
    public function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0; // meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * @return array{ok:bool,reason?:string,distance_meters?:float,radius_meters?:int,max_accuracy_meters?:int}
     */
    public function validateBranchLocation(
        Branch $branch,
        float $lat,
        float $lng,
        ?float $accuracyMeters
    ): array {
        if (! $branch->geofence_enabled) {
            return ['ok' => false, 'reason' => 'Branch geofence is disabled.'];
        }

        if ($branch->geofence_latitude === null || $branch->geofence_longitude === null || $branch->geofence_radius_meters === null) {
            return ['ok' => false, 'reason' => 'Branch geofence is not configured.'];
        }

        $maxAcc = $branch->geofence_max_accuracy_meters ?? 50;

        if ($accuracyMeters === null) {
            return [
                'ok' => false,
                'reason' => 'Location accuracy missing.',
                'max_accuracy_meters' => (int) $maxAcc,
            ];
        }

        if ($accuracyMeters > $maxAcc) {
            return [
                'ok' => false,
                'reason' => 'Location accuracy is too low.',
                'max_accuracy_meters' => (int) $maxAcc,
            ];
        }

        $distance = $this->distanceMeters(
            (float) $branch->geofence_latitude,
            (float) $branch->geofence_longitude,
            $lat,
            $lng
        );

        $radius = (int) $branch->geofence_radius_meters;

        if ($distance > $radius) {
            return [
                'ok' => false,
                'reason' => 'Outside allowed branch area.',
                'distance_meters' => $distance,
                'radius_meters' => $radius,
            ];
        }

        return [
            'ok' => true,
            'distance_meters' => $distance,
            'radius_meters' => $radius,
            'max_accuracy_meters' => (int) $maxAcc,
        ];
    }

    /**
     * Branches whose geofence this employee may use for self check-in/out.
     * Regular staff: own branch only. Zonal / regional managers: all branches under their scope.
     *
     * @return Collection<int, Branch>
     */
    public function eligibleBranchesForEmployee(User $user, Employee $employee): Collection
    {
        $branchIds = collect(OrganogramAccessService::accessibleBranchIdList($user) ?? []);

        $zoneIds = Zone::query()
            ->where('zone_manager_employee_id', $employee->id)
            ->where('is_active', true)
            ->pluck('id');

        if ($zoneIds->isNotEmpty()) {
            $regionalOfficeIds = RegionalOffice::query()
                ->whereIn('zone_id', $zoneIds)
                ->where('is_active', true)
                ->pluck('id');

            $branchIds = $branchIds->merge(
                Branch::query()->whereIn('regional_office_id', $regionalOfficeIds)->pluck('id')
            );
        }

        $managedRegionalOfficeIds = RegionalOffice::query()
            ->where('regional_manager_employee_id', $employee->id)
            ->where('is_active', true)
            ->pluck('id');

        if ($managedRegionalOfficeIds->isNotEmpty()) {
            $branchIds = $branchIds->merge(
                Branch::query()->whereIn('regional_office_id', $managedRegionalOfficeIds)->pluck('id')
            );
        }

        $ownBranchId = (int) ($employee->current_branch_id ?? $employee->branch_id ?? 0);
        if ($ownBranchId > 0) {
            $branchIds->push($ownBranchId);
        }

        $branchIds = $branchIds->filter()->map(fn ($id) => (int) $id)->unique()->values();

        if ($branchIds->isEmpty()) {
            return collect();
        }

        return Branch::query()
            ->whereIn('id', $branchIds)
            ->where('is_active', true)
            ->where('geofence_enabled', true)
            ->get()
            ->sortBy(fn (Branch $branch) => (int) $branch->id === $ownBranchId ? 0 : 1)
            ->values();
    }

    /**
     * Find the first branch geofence that contains the given coordinates.
     *
     * @param  Collection<int, Branch>|iterable<int, Branch>  $branches
     * @return array{ok:bool,branch?:Branch,branch_id?:int,branch_name?:string,reason?:string,distance_meters?:float,radius_meters?:int,max_accuracy_meters?:int}
     */
    public function findMatchingBranch(
        iterable $branches,
        float $lat,
        float $lng,
        ?float $accuracyMeters
    ): array {
        $bestFailure = null;

        foreach ($branches as $branch) {
            $result = $this->validateBranchLocation($branch, $lat, $lng, $accuracyMeters);

            if ($result['ok']) {
                return array_merge($result, [
                    'branch' => $branch,
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                ]);
            }

            if ($this->isMeaningfulGeofenceFailure($result)) {
                $bestFailure = array_merge($result, [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                ]);
            }
        }

        if ($bestFailure !== null) {
            return array_merge($bestFailure, ['ok' => false]);
        }

        return [
            'ok' => false,
            'reason' => 'No geofence-enabled branch is available for your account.',
        ];
    }

    private function isMeaningfulGeofenceFailure(array $result): bool
    {
        $reason = $result['reason'] ?? '';

        return ! in_array($reason, [
            'Branch geofence is disabled.',
            'Branch geofence is not configured.',
        ], true);
    }
}
