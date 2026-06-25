<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Employee;
use App\Services\GeoFenceService;
use App\Services\SelfAttendanceDeviceLockService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SelfAttendanceController extends Controller
{
    public function checkIn(Request $request, GeoFenceService $geoFence)
    {
        return $this->handleSelfPunch($request, $geoFence, 'check_in');
    }

    public function checkOut(Request $request, GeoFenceService $geoFence)
    {
        return $this->handleSelfPunch($request, $geoFence, 'check_out');
    }

    private function handleSelfPunch(Request $request, GeoFenceService $geoFence, string $action): mixed
    {
        $user = Auth::user();
        $employee = $user?->employee;

        if (! $employee) {
            abort(403, 'Employee profile not found.');
        }

        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'samples' => ['nullable', 'array'],
            'device_fingerprint' => ['required', 'string', 'min:16', 'max:128', 'regex:/^[a-zA-Z0-9_-]+$/'],
        ]);

        $today = Carbon::today()->format('Y-m-d');
        $deviceFingerprint = (string) $validated['device_fingerprint'];

        $deviceLockError = app(SelfAttendanceDeviceLockService::class)
            ->assertEmployeeCanUseDevice($employee->id, $deviceFingerprint, $today);

        if ($deviceLockError !== null) {
            Log::warning("Self {$action} blocked by device lock", [
                'user_id' => $user->id,
                'employee_id' => $employee->id,
                'device_fingerprint' => $deviceFingerprint,
            ]);

            return back()->withErrors(['attendance' => $deviceLockError]);
        }

        $accuracy = array_key_exists('accuracy', $validated)
            ? (is_null($validated['accuracy']) ? null : (float) $validated['accuracy'])
            : null;

        $eligibleBranches = $geoFence->eligibleBranchesForEmployee($user, $employee);

        if ($eligibleBranches->isEmpty()) {
            return back()->withErrors([
                'attendance' => 'No geofence-enabled branch is assigned to your account.',
            ]);
        }

        $result = $geoFence->findMatchingBranch(
            $eligibleBranches,
            (float) $validated['lat'],
            (float) $validated['lng'],
            $accuracy,
        );

        /** @var Branch|null $matchedBranch */
        $matchedBranch = $result['branch'] ?? null;

        if (! $result['ok'] || ! $matchedBranch) {
            Log::warning("Self {$action} blocked by geofence", [
                'user_id' => $user->id,
                'employee_id' => $employee->id,
                'eligible_branch_ids' => $eligibleBranches->pluck('id')->all(),
                'reason' => $result['reason'] ?? 'unknown',
                'lat' => $validated['lat'],
                'lng' => $validated['lng'],
                'accuracy' => $validated['accuracy'] ?? null,
            ]);

            return back()->withErrors([
                'attendance' => $this->formatGeofenceError($result, $eligibleBranches->count() > 1),
            ]);
        }

        $nowTime = Carbon::now()->format('H:i:s');

        if ($action === 'check_in') {
            return $this->completeCheckIn(
                $request,
                $employee,
                $user,
                $matchedBranch,
                $validated,
                $result,
                $today,
                $nowTime,
                $deviceFingerprint,
            );
        }

        return $this->completeCheckOut(
            $request,
            $employee,
            $user,
            $matchedBranch,
            $validated,
            $result,
            $today,
            $nowTime,
            $deviceFingerprint,
        );
    }

    private function completeCheckIn(
        Request $request,
        Employee $employee,
        $user,
        Branch $branch,
        array $validated,
        array $result,
        string $today,
        string $nowTime,
        string $deviceFingerprint,
    ): mixed {
        $attendance = Attendance::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            ['status' => 'present']
        );

        if ($attendance->check_in) {
            $existing = Carbon::parse($attendance->check_in)->format('H:i:s');
            if ($nowTime < $existing) {
                $attendance->check_in = $nowTime;
            }
        } else {
            $attendance->check_in = $nowTime;
        }

        $location = [
            'source' => 'pwa',
            'branch_id' => $branch->id,
            'branch_name' => $branch->name,
            'device_fingerprint' => $deviceFingerprint,
            'ip' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'check_in' => [
                'lat' => (float) $validated['lat'],
                'lng' => (float) $validated['lng'],
                'accuracy_m' => $validated['accuracy'] ?? null,
                'distance_m' => $result['distance_meters'] ?? null,
                'at' => Carbon::now()->toIso8601String(),
                'samples' => $validated['samples'] ?? null,
            ],
        ];

        $attendance->location_coordinates = array_merge((array) ($attendance->location_coordinates ?? []), $location);
        $attendance->save();

        app(SelfAttendanceDeviceLockService::class)->recordDeviceUse(
            $employee->id,
            $user?->id,
            $deviceFingerprint,
            $today,
            'check_in',
        );

        $message = $branch->id !== (int) ($employee->current_branch_id ?? $employee->branch_id ?? 0)
            ? "Checked in successfully at {$branch->name}."
            : 'Checked in successfully.';

        return back()->with('success', $message);
    }

    private function completeCheckOut(
        Request $request,
        Employee $employee,
        $user,
        Branch $branch,
        array $validated,
        array $result,
        string $today,
        string $nowTime,
        string $deviceFingerprint,
    ): mixed {
        $attendance = Attendance::where('employee_id', $employee->id)->where('date', $today)->first();

        if (! $attendance || ! $attendance->check_in) {
            return back()->withErrors(['attendance' => 'You need to check in first.']);
        }

        $location = [
            'source' => 'pwa',
            'branch_id' => $branch->id,
            'branch_name' => $branch->name,
            'device_fingerprint' => $deviceFingerprint,
            'ip' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'check_out' => [
                'lat' => (float) $validated['lat'],
                'lng' => (float) $validated['lng'],
                'accuracy_m' => $validated['accuracy'] ?? null,
                'distance_m' => $result['distance_meters'] ?? null,
                'at' => Carbon::now()->toIso8601String(),
                'samples' => $validated['samples'] ?? null,
            ],
        ];

        if (! $attendance->check_out) {
            $attendance->check_out = $nowTime;
        } else {
            $existing = Carbon::parse($attendance->check_out)->format('H:i:s');
            if ($nowTime > $existing) {
                $attendance->check_out = $nowTime;
            }
        }

        $attendance->location_coordinates = array_merge((array) ($attendance->location_coordinates ?? []), $location);
        $attendance->save();

        app(SelfAttendanceDeviceLockService::class)->recordDeviceUse(
            $employee->id,
            $user?->id,
            $deviceFingerprint,
            $today,
            'check_out',
        );

        $message = $branch->id !== (int) ($employee->current_branch_id ?? $employee->branch_id ?? 0)
            ? "Checked out successfully from {$branch->name}."
            : 'Checked out successfully.';

        return back()->with('success', $message);
    }

    private function formatGeofenceError(array $result, bool $multipleBranches): string
    {
        $reason = $result['reason'] ?? 'Geofence validation failed.';

        if ($multipleBranches && $reason === 'Outside allowed branch area.') {
            $branchName = $result['branch_name'] ?? null;

            return $branchName
                ? "You are outside the allowed area. Nearest checked branch: {$branchName}."
                : 'You are outside the allowed area of any branch under your jurisdiction.';
        }

        return $reason;
    }
}
