<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Branch;
use App\Services\GeoFenceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SelfAttendanceController extends Controller
{
    public function checkIn(Request $request, GeoFenceService $geoFence)
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
        ]);

        $branchId = $employee->current_branch_id ?? $employee->branch_id;
        if (! $branchId) {
            return back()->withErrors(['attendance' => 'Branch is not assigned.']);
        }

        /** @var Branch $branch */
        $branch = Branch::findOrFail($branchId);

        $result = $geoFence->validateBranchLocation(
            $branch,
            (float) $validated['lat'],
            (float) $validated['lng'],
            array_key_exists('accuracy', $validated) ? (is_null($validated['accuracy']) ? null : (float) $validated['accuracy']) : null,
        );

        if (! $result['ok']) {
            Log::warning('Self check-in blocked by geofence', [
                'user_id' => $user->id,
                'employee_id' => $employee->id,
                'branch_id' => $branch->id,
                'reason' => $result['reason'] ?? 'unknown',
                'lat' => $validated['lat'],
                'lng' => $validated['lng'],
                'accuracy' => $validated['accuracy'] ?? null,
            ]);

            return back()->withErrors([
                'attendance' => $result['reason'] ?? 'Geofence validation failed.',
            ]);
        }

        $today = Carbon::today()->format('Y-m-d');
        $nowTime = Carbon::now()->format('H:i:s');

        $attendance = Attendance::firstOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            ['status' => 'present']
        );

        if ($attendance->check_in) {
            return back()->withErrors(['attendance' => 'Already checked in for today.']);
        }

        $location = [
            'source' => 'pwa',
            'branch_id' => $branch->id,
            'ip' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'check_in' => [
                'lat' => (float) $validated['lat'],
                'lng' => (float) $validated['lng'],
                'accuracy_m' => array_key_exists('accuracy', $validated) ? $validated['accuracy'] : null,
                'distance_m' => $result['distance_meters'] ?? null,
                'at' => Carbon::now()->toIso8601String(),
                'samples' => $validated['samples'] ?? null,
            ],
        ];

        $attendance->check_in = $nowTime;
        $attendance->location_coordinates = array_merge((array) ($attendance->location_coordinates ?? []), $location);
        $attendance->save();

        return back()->with('success', 'Checked in successfully.');
    }

    public function checkOut(Request $request, GeoFenceService $geoFence)
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
        ]);

        $branchId = $employee->current_branch_id ?? $employee->branch_id;
        if (! $branchId) {
            return back()->withErrors(['attendance' => 'Branch is not assigned.']);
        }

        /** @var Branch $branch */
        $branch = Branch::findOrFail($branchId);

        $result = $geoFence->validateBranchLocation(
            $branch,
            (float) $validated['lat'],
            (float) $validated['lng'],
            array_key_exists('accuracy', $validated) ? (is_null($validated['accuracy']) ? null : (float) $validated['accuracy']) : null,
        );

        if (! $result['ok']) {
            Log::warning('Self check-out blocked by geofence', [
                'user_id' => $user->id,
                'employee_id' => $employee->id,
                'branch_id' => $branch->id,
                'reason' => $result['reason'] ?? 'unknown',
                'lat' => $validated['lat'],
                'lng' => $validated['lng'],
                'accuracy' => $validated['accuracy'] ?? null,
            ]);

            return back()->withErrors([
                'attendance' => $result['reason'] ?? 'Geofence validation failed.',
            ]);
        }

        $today = Carbon::today()->format('Y-m-d');
        $attendance = Attendance::where('employee_id', $employee->id)->where('date', $today)->first();

        if (! $attendance || ! $attendance->check_in) {
            return back()->withErrors(['attendance' => 'You need to check in first.']);
        }

        $nowTime = Carbon::now()->format('H:i:s');

        $location = [
            'source' => 'pwa',
            'branch_id' => $branch->id,
            'ip' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'check_out' => [
                'lat' => (float) $validated['lat'],
                'lng' => (float) $validated['lng'],
                'accuracy_m' => array_key_exists('accuracy', $validated) ? $validated['accuracy'] : null,
                'distance_m' => $result['distance_meters'] ?? null,
                'at' => Carbon::now()->toIso8601String(),
                'samples' => $validated['samples'] ?? null,
            ],
        ];

        // Always keep the latest check-out time (employee may check out multiple times; last one wins).
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

        return back()->with('success', 'Checked out successfully.');
    }
}
