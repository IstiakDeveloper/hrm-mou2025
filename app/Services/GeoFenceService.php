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

        $accuracyCap = max((int) ($branch->geofence_max_accuracy_meters ?? 150), 100);

        if ($accuracyMeters !== null && $accuracyMeters > 500) {
            return [
                'ok' => false,
                'reason' => 'Location signal is too unreliable. Please try again near a window or open area.',
                'max_accuracy_meters' => $accuracyCap,
            ];
        }

        $distance = $this->distanceMeters(
            (float) $branch->geofence_latitude,
            (float) $branch->geofence_longitude,
            $lat,
            $lng
        );

        $radius = (int) $branch->geofence_radius_meters;
        $accuracyBuffer = min($accuracyMeters ?? $accuracyCap, $accuracyCap);
        $effectiveRadius = $radius + $accuracyBuffer;

        if ($distance > $effectiveRadius) {
            return [
                'ok' => false,
                'reason' => 'Outside allowed branch area.',
                'distance_meters' => $distance,
                'radius_meters' => $radius,
                'effective_radius_meters' => $effectiveRadius,
                'accuracy_meters' => $accuracyMeters,
            ];
        }

        return [
            'ok' => true,
            'distance_meters' => $distance,
            'radius_meters' => $radius,
            'effective_radius_meters' => $effectiveRadius,
            'accuracy_meters' => $accuracyMeters,
            'max_accuracy_meters' => $accuracyCap,
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
        ?float $accuracyMeters,
        ?array $samples = null
    ): array {
        $bestFailure = null;

        foreach ($branches as $branch) {
            foreach ($this->locationAttempts($lat, $lng, $accuracyMeters, $samples) as $attempt) {
                $result = $this->validateBranchLocation(
                    $branch,
                    $attempt['lat'],
                    $attempt['lng'],
                    $attempt['accuracy'],
                );

                if ($result['ok']) {
                    return array_merge($result, [
                        'branch' => $branch,
                        'branch_id' => $branch->id,
                        'branch_name' => $branch->name,
                    ]);
                }

                if ($this->isMeaningfulGeofenceFailure($result)) {
                    $candidate = array_merge($result, [
                        'branch_id' => $branch->id,
                        'branch_name' => $branch->name,
                    ]);

                    if ($this->isCloserGeofenceFailure($candidate, $bestFailure)) {
                        $bestFailure = $candidate;
                    }
                }
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

    /**
     * @return list<array{lat: float, lng: float, accuracy: ?float}>
     */
    private function locationAttempts(float $lat, float $lng, ?float $accuracyMeters, ?array $samples): array
    {
        $attempts = [];
        $seen = [];

        $push = function (float $attemptLat, float $attemptLng, ?float $attemptAccuracy) use (&$attempts, &$seen): void {
            $key = round($attemptLat, 5).','.round($attemptLng, 5).','.($attemptAccuracy ?? 'null');

            if (isset($seen[$key])) {
                return;
            }

            $seen[$key] = true;
            $attempts[] = [
                'lat' => $attemptLat,
                'lng' => $attemptLng,
                'accuracy' => $attemptAccuracy,
            ];
        };

        $push($lat, $lng, $accuracyMeters);

        foreach ($samples ?? [] as $sample) {
            if (! is_array($sample)) {
                continue;
            }

            $sampleLat = $sample['lat'] ?? null;
            $sampleLng = $sample['lng'] ?? null;

            if (! is_numeric($sampleLat) || ! is_numeric($sampleLng)) {
                continue;
            }

            $sampleAccuracy = $sample['accuracy'] ?? null;
            $push(
                (float) $sampleLat,
                (float) $sampleLng,
                is_numeric($sampleAccuracy) ? (float) $sampleAccuracy : null,
            );
        }

        return $attempts;
    }

    private function isCloserGeofenceFailure(array $candidate, ?array $currentBest): bool
    {
        if ($currentBest === null) {
            return true;
        }

        $candidateDistance = (float) ($candidate['distance_meters'] ?? PHP_FLOAT_MAX);
        $currentDistance = (float) ($currentBest['distance_meters'] ?? PHP_FLOAT_MAX);
        $candidateRadius = (float) ($candidate['effective_radius_meters'] ?? $candidate['radius_meters'] ?? 0);
        $currentRadius = (float) ($currentBest['effective_radius_meters'] ?? $currentBest['radius_meters'] ?? 0);

        return ($candidateDistance - $candidateRadius) < ($currentDistance - $currentRadius);
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
