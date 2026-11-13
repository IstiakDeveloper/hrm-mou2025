<?php

namespace App\Services\Mobile;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\User;
use App\Services\GeoFenceService;
use App\Services\SelfAttendanceDeviceLockService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MobileSelfAttendanceService
{
    public function __construct(
        private readonly GeoFenceService $geoFence,
        private readonly SelfAttendanceDeviceLockService $deviceLocks,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function status(User $user): array
    {
        $employee = $this->requireEmployee($user);
        $today = Carbon::today('Asia/Dhaka')->toDateString();
        $attendance = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        $eligible = $this->geoFence->eligibleBranchesForEmployee($user, $employee);
        $isWeekend = AttendanceSetting::isWeekendForEmployee($today, (int) $employee->id);

        return [
            'date' => $today,
            'server_time' => now('Asia/Dhaka')->toIso8601String(),
            'is_weekend' => $isWeekend,
            'employee_id' => $employee->id,
            'check_in' => $this->formatTime($attendance?->check_in),
            'check_out' => $this->formatTime($attendance?->check_out),
            'status' => $attendance?->status,
            'can_check_in' => ! $isWeekend && $eligible->isNotEmpty() && empty($attendance?->check_in),
            'can_check_out' => ! $isWeekend && $eligible->isNotEmpty() && ! empty($attendance?->check_in),
            'already_checked_in' => ! empty($attendance?->check_in),
            'already_checked_out' => ! empty($attendance?->check_out),
            'eligible_branches' => $eligible->map(fn (Branch $branch) => [
                'id' => $branch->id,
                'name' => $branch->name,
                'branch_code' => $branch->branch_code,
                'geofence_enabled' => (bool) $branch->geofence_enabled,
                'geofence_radius_meters' => $branch->geofence_radius_meters,
                // Coordinates intentionally omitted from list; punch validates server-side.
            ])->values()->all(),
            'receipt' => $this->receiptFromAttendance($attendance),
            'allowed_actions' => array_values(array_filter([
                (! $isWeekend && $eligible->isNotEmpty()) ? 'refresh_status' : null,
                (! $isWeekend && $eligible->isNotEmpty() && empty($attendance?->check_in)) ? 'check_in' : null,
                (! $isWeekend && $eligible->isNotEmpty() && ! empty($attendance?->check_in)) ? 'check_out' : null,
                'history',
            ])),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function history(User $user, ?string $from = null, ?string $to = null, int $limit = 60): array
    {
        $employee = $this->requireEmployee($user);
        $fromDate = $from ? Carbon::parse($from)->toDateString() : Carbon::today('Asia/Dhaka')->subDays(30)->toDateString();
        $toDate = $to ? Carbon::parse($to)->toDateString() : Carbon::today('Asia/Dhaka')->toDateString();
        $limit = max(1, min($limit, 120));

        $rows = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereDate('date', '>=', $fromDate)
            ->whereDate('date', '<=', $toDate)
            ->orderByDesc('date')
            ->limit($limit)
            ->get();

        return [
            'from' => $fromDate,
            'to' => $toDate,
            'data' => $rows->map(fn (Attendance $row) => [
                'id' => $row->id,
                'date' => Carbon::parse($row->date)->toDateString(),
                'check_in' => $this->formatTime($row->check_in),
                'check_out' => $this->formatTime($row->check_out),
                'status' => $row->status,
                'branch_name' => data_get($row->location_coordinates, 'branch_name'),
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function punch(User $user, Request $request, string $action): array
    {
        if ($user->isBranchAccount()) {
            throw new HttpException(403, 'Branch accounts cannot perform personal attendance punch.');
        }

        $employee = $this->requireEmployee($user);

        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'samples' => ['nullable', 'array'],
            'device_fingerprint' => ['required', 'string', 'min:16', 'max:128', 'regex:/^[a-zA-Z0-9_-]+$/'],
        ]);

        $today = Carbon::today('Asia/Dhaka')->toDateString();

        if (AttendanceSetting::isWeekendForEmployee($today, (int) $employee->id)) {
            throw new HttpException(422, 'Weekend-এ attendance দেওয়া যাবে না (Attendance settings অনুযায়ী Friday/Saturday)।');
        }

        $deviceFingerprint = (string) $validated['device_fingerprint'];
        $deviceLockError = $this->deviceLocks->assertEmployeeCanUseDevice($employee->id, $deviceFingerprint, $today);
        if ($deviceLockError !== null) {
            Log::warning("Mobile self {$action} blocked by device lock", [
                'user_id' => $user->id,
                'employee_id' => $employee->id,
            ]);

            throw new HttpException(423, $deviceLockError);
        }

        $accuracy = array_key_exists('accuracy', $validated)
            ? (is_null($validated['accuracy']) ? null : (float) $validated['accuracy'])
            : null;

        $eligibleBranches = $this->geoFence->eligibleBranchesForEmployee($user, $employee);
        if ($eligibleBranches->isEmpty()) {
            throw new HttpException(422, 'No geofence-enabled branch is assigned to your account.');
        }

        $result = $this->geoFence->findMatchingBranch(
            $eligibleBranches,
            (float) $validated['lat'],
            (float) $validated['lng'],
            $accuracy,
            $validated['samples'] ?? null,
        );

        /** @var Branch|null $matchedBranch */
        $matchedBranch = $result['branch'] ?? null;
        if (! $result['ok'] || ! $matchedBranch) {
            throw new HttpException(422, $this->formatGeofenceError($result, $eligibleBranches->count() > 1));
        }

        $nowTime = Carbon::now('Asia/Dhaka')->format('H:i:s');

        return DB::transaction(function () use (
            $action,
            $request,
            $employee,
            $user,
            $matchedBranch,
            $validated,
            $result,
            $today,
            $nowTime,
            $deviceFingerprint,
        ) {
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
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private function completeCheckIn(
        Request $request,
        Employee $employee,
        User $user,
        Branch $branch,
        array $validated,
        array $result,
        string $today,
        string $nowTime,
        string $deviceFingerprint,
    ): array {
        $attendance = Attendance::query()->firstOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            ['status' => 'present']
        );

        // Re-read under row lock to reduce double punch races.
        $attendance = Attendance::query()->whereKey($attendance->id)->lockForUpdate()->firstOrFail();

        if ($attendance->check_in) {
            $existing = Carbon::parse($attendance->check_in)->format('H:i:s');
            if ($nowTime < $existing) {
                $attendance->check_in = $nowTime;
            }
        } else {
            $attendance->check_in = $nowTime;
        }

        $location = $this->locationPayload($request, $branch, $validated, $result, $deviceFingerprint, 'check_in');
        $attendance->location_coordinates = array_merge((array) ($attendance->location_coordinates ?? []), $location);
        $attendance->save();

        $this->deviceLocks->recordDeviceUse($employee->id, $user->id, $deviceFingerprint, $today, 'check_in');

        return [
            'action' => 'check_in',
            'message' => $branch->id !== (int) ($employee->current_branch_id ?? $employee->branch_id ?? 0)
                ? "Checked in successfully at {$branch->name}."
                : 'Checked in successfully.',
            'receipt' => $this->receiptFromAttendance($attendance->fresh()),
            'status' => $this->status($user),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private function completeCheckOut(
        Request $request,
        Employee $employee,
        User $user,
        Branch $branch,
        array $validated,
        array $result,
        string $today,
        string $nowTime,
        string $deviceFingerprint,
    ): array {
        $attendance = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->lockForUpdate()
            ->first();

        if (! $attendance || ! $attendance->check_in) {
            throw new HttpException(422, 'You need to check in first.');
        }

        if (! $attendance->check_out) {
            $attendance->check_out = $nowTime;
        } else {
            $existing = Carbon::parse($attendance->check_out)->format('H:i:s');
            if ($nowTime > $existing) {
                $attendance->check_out = $nowTime;
            }
        }

        $location = $this->locationPayload($request, $branch, $validated, $result, $deviceFingerprint, 'check_out');
        $attendance->location_coordinates = array_merge((array) ($attendance->location_coordinates ?? []), $location);
        $attendance->save();

        $this->deviceLocks->recordDeviceUse($employee->id, $user->id, $deviceFingerprint, $today, 'check_out');

        return [
            'action' => 'check_out',
            'message' => $branch->id !== (int) ($employee->current_branch_id ?? $employee->branch_id ?? 0)
                ? "Checked out successfully from {$branch->name}."
                : 'Checked out successfully.',
            'receipt' => $this->receiptFromAttendance($attendance->fresh()),
            'status' => $this->status($user),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private function locationPayload(
        Request $request,
        Branch $branch,
        array $validated,
        array $result,
        string $deviceFingerprint,
        string $punchKey,
    ): array {
        return [
            'source' => 'mobile',
            'branch_id' => $branch->id,
            'branch_name' => $branch->name,
            'device_fingerprint' => $deviceFingerprint,
            'ip' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            $punchKey => [
                'lat' => (float) $validated['lat'],
                'lng' => (float) $validated['lng'],
                'accuracy_m' => $validated['accuracy'] ?? null,
                'distance_m' => $result['distance_meters'] ?? null,
                'at' => Carbon::now('Asia/Dhaka')->toIso8601String(),
                'samples' => $validated['samples'] ?? null,
            ],
        ];
    }

    private function requireEmployee(User $user): Employee
    {
        $user->loadMissing('employee');
        $employee = $user->employee;
        if (! $employee) {
            throw new HttpException(403, 'Employee profile not found.');
        }

        return $employee;
    }

    private function formatTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value)->format('H:i:s');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function receiptFromAttendance(?Attendance $attendance): ?array
    {
        if (! $attendance) {
            return null;
        }

        return [
            'attendance_id' => $attendance->id,
            'date' => Carbon::parse($attendance->date)->toDateString(),
            'check_in' => $this->formatTime($attendance->check_in),
            'check_out' => $this->formatTime($attendance->check_out),
            'status' => $attendance->status,
            'branch_id' => data_get($attendance->location_coordinates, 'branch_id'),
            'branch_name' => data_get($attendance->location_coordinates, 'branch_name'),
            'source' => data_get($attendance->location_coordinates, 'source'),
        ];
    }

    /**
     * @param  array<string, mixed>  $result
     */
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
