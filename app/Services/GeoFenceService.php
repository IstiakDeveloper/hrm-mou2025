<?php

namespace App\Services;

use App\Models\Branch;

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
}
