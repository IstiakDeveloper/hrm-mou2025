<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSetting;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Movement;
use App\Support\ZktecoEmployeeResolver;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ZktecoAttendanceIngestService
{
    /**
     * Save one device punch using the same check-in / check-out rules as the local agent.
     */
    public function ingestPunch(
        AttendanceDevice $device,
        string $devicePin,
        string $timestamp,
        ?ZktecoEmployeeResolver $resolver = null
    ): bool {
        $this->ensureHolidayAttendanceBackfilled();

        $resolver ??= new ZktecoEmployeeResolver([], $device->branch_id);
        $employee = $resolver->resolve(trim($devicePin), $device->branch_id);

        if (! $employee) {
            Log::warning('ZKTeco ingest: Unknown employee PIN', [
                'device_pin' => $devicePin,
                'device_id' => $device->id,
            ]);

            return false;
        }

        try {
            $parsed = Carbon::parse($timestamp);

            return $this->saveAttendanceRecord(
                $employee,
                $device,
                $parsed->format('Y-m-d'),
                $parsed->format('H:i:s')
            );
        } catch (\Throwable $e) {
            Log::error('ZKTeco ingest: Timestamp parse failed', [
                'timestamp' => $timestamp,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * @param  list<array{id: string, timestamp: string}>  $records
     * @return array{processed: int, skipped: int, errors: int, total: int}
     */
    public function ingestRecords(
        AttendanceDevice $device,
        array $records,
        ?ZktecoEmployeeResolver $resolver = null,
        bool $markAbsents = false
    ): array {
        $resolver ??= new ZktecoEmployeeResolver([], $device->branch_id);
        $processed = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($records as $record) {
            $pin = (string) ($record['id'] ?? '');
            $timestamp = (string) ($record['timestamp'] ?? '');

            if ($pin === '' || $timestamp === '') {
                $skipped++;
                continue;
            }

            try {
                if ($this->ingestPunch($device, $pin, $timestamp, $resolver)) {
                    $processed++;
                } else {
                    $skipped++;
                }
            } catch (\Throwable $e) {
                Log::error('ZKTeco ingest: Record failed', [
                    'record' => $record,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        $device->last_sync_at = now();
        $device->last_sync_status = $errors === 0 ? 'success' : 'partial';
        $device->save();

        if ($markAbsents) {
            $this->processAbsentEmployees($device);
        }

        return [
            'processed' => $processed,
            'skipped' => $skipped,
            'errors' => $errors,
            'total' => count($records),
        ];
    }

    public function ensureHolidayAttendanceBackfilled(): void
    {
        Cache::remember('attendance:holiday-backfill:from-2026', now()->addDay(), function () {
            $updated = app(HolidayAttendanceSyncService::class)->syncAllStoredHolidays();

            Log::info('Holiday backfill: updated absent attendances to holiday from stored holidays.', [
                'updated' => $updated,
            ]);

            return true;
        });
    }

    public function processAbsentEmployees(AttendanceDevice $device): void
    {
        $today = Carbon::today()->format('Y-m-d');
        $branch = $device->branch;

        if (! $branch) {
            Log::warning('ZKTeco ingest: Device not associated with a branch, skipping absent processing');

            return;
        }

        $employees = Employee::where('status', 'active')
            ->where('current_branch_id', $branch->id)
            ->get();

        $processed = 0;

        foreach ($employees as $employee) {
            $attendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $today)
                ->first();

            if ($attendance) {
                continue;
            }

            $attendance = new Attendance;
            $attendance->employee_id = $employee->id;
            $attendance->date = $today;
            $attendance->status = 'absent';

            if (AttendanceSetting::isWeekendForEmployee($today, (int) $employee->id)) {
                $attendance->status = 'weekend';
            } elseif ($this->isHolidayForEmployeeOnDate($employee, $today)) {
                $attendance->status = 'holiday';
            } elseif ($this->isEmployeeOnLeave($employee->id, $today)) {
                $attendance->status = 'leave';
            } elseif ($this->isEmployeeOnMovement($employee->id, $today)) {
                $attendance->status = 'on_duty';

                $movement = Movement::where('employee_id', $employee->id)
                    ->coveringAttendanceDate($today)
                    ->first();

                if ($movement) {
                    $attendance->movement_id = $movement->id;
                    $fromDate = Carbon::parse($movement->from_datetime)->format('Y-m-d');

                    if ($fromDate == $today) {
                        $attendance->check_in = Carbon::parse($movement->from_datetime)->format('H:i:s');
                    }
                }
            }

            $attendance->save();
            $processed++;
        }

        Log::info('ZKTeco ingest: Processed absent employees', [
            'date' => $today,
            'branch' => $branch->name,
            'processed' => $processed,
            'total_employees' => $employees->count(),
        ]);
    }

    private function saveAttendanceRecord(Employee $employee, AttendanceDevice $device, string $date, string $time): bool
    {
        return DB::transaction(function () use ($employee, $device, $date, $time) {
            if (AttendanceSetting::isWeekendForEmployee($date, (int) $employee->id)) {
                $weekendRow = Attendance::where('employee_id', $employee->id)
                    ->where('date', $date)
                    ->first();

                if (! $weekendRow) {
                    $weekendRow = new Attendance;
                    $weekendRow->employee_id = $employee->id;
                    $weekendRow->date = $date;
                }

                $weekendRow->status = 'weekend';
                $weekendRow->check_in = null;
                $weekendRow->check_out = null;
                $weekendRow->movement_id = null;
                $weekendRow->save();

                return true;
            }

            $attendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $date)
                ->first();

            $isOnMovement = $this->isEmployeeOnMovement($employee->id, $date);
            $movement = null;

            if ($isOnMovement) {
                $movement = Movement::where('employee_id', $employee->id)
                    ->whereIn('status', ['approved', 'completed', 'active'])
                    ->where('movement_type', 'official')
                    ->where('from_datetime', '<=', Carbon::parse($date)->endOfDay())
                    ->where('to_datetime', '>=', Carbon::parse($date)->startOfDay())
                    ->first();
            }

            if ($attendance) {
                $updated = $this->applyPunchToAttendance($attendance, $device, $time);

                if ($movement && ! $attendance->movement_id) {
                    $attendance->movement_id = $movement->id;
                    $updated = true;
                }

                if ($updated) {
                    $this->updateAttendanceStatus($attendance);
                    $attendance->save();
                }
            } else {
                $attendance = new Attendance;
                $attendance->employee_id = $employee->id;
                $attendance->date = $date;
                $attendance->device_id = $device->id;
                $attendance->check_in = $time;

                if ($movement) {
                    $attendance->movement_id = $movement->id;
                }

                $this->updateAttendanceStatus($attendance);
                $attendance->save();
            }

            return true;
        });
    }

    private function applyPunchToAttendance(Attendance $attendance, AttendanceDevice $device, string $time): bool
    {
        $updated = false;
        $punchTime = Carbon::parse($time)->format('H:i:s');

        if (! $attendance->check_in || $punchTime < Carbon::parse($attendance->check_in)->format('H:i:s')) {
            $attendance->check_in = $time;
            $attendance->device_id = $device->id;
            $updated = true;
        }

        $checkInTime = Carbon::parse($attendance->check_in)->format('H:i:s');

        if ($punchTime > $checkInTime) {
            if (! $attendance->check_out || $punchTime > Carbon::parse($attendance->check_out)->format('H:i:s')) {
                $attendance->check_out = $time;
                $updated = true;
            }
        }

        return $updated;
    }

    private function updateAttendanceStatus(Attendance $attendance): void
    {
        if (AttendanceSetting::isWeekendForEmployee($attendance->date, (int) $attendance->employee_id)) {
            $attendance->status = 'weekend';
            $attendance->check_in = null;
            $attendance->check_out = null;
            $attendance->movement_id = null;

            return;
        }

        if ($this->isEmployeeOnLeave($attendance->employee_id, $attendance->date)) {
            $attendance->status = 'leave';

            return;
        }

        if ($this->isEmployeeOnMovement($attendance->employee_id, $attendance->date)) {
            $attendance->status = 'on_duty';

            return;
        }

        $attendance->applyPunchStatus();
    }

    private function isEmployeeOnMovement($employeeId, $date): bool
    {
        return Movement::where('employee_id', $employeeId)
            ->coveringAttendanceDate(Carbon::parse($date)->format('Y-m-d'))
            ->exists();
    }

    private function isEmployeeOnLeave($employeeId, $date): bool
    {
        $dateObj = Carbon::parse($date);

        return LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('start_date', '<=', $dateObj)
            ->where('end_date', '>=', $dateObj)
            ->exists();
    }

    private function isHolidayForEmployeeOnDate(Employee $employee, string $date): bool
    {
        $d = Carbon::parse($date);
        $branchId = $employee->current_branch_id;

        return Holiday::query()
            ->where(function ($q) use ($date, $d) {
                $q->whereDate('date', $date)
                    ->orWhere(function ($sq) use ($d) {
                        $sq->where('is_recurring', true)
                            ->whereMonth('date', $d->month)
                            ->whereDay('date', $d->day);
                    });
            })
            ->where(function ($q) use ($branchId) {
                if ($branchId) {
                    $q->whereJsonContains('applicable_branches', (string) $branchId)
                        ->orWhereNull('applicable_branches')
                        ->orWhereJsonLength('applicable_branches', 0);
                } else {
                    $q->whereNull('applicable_branches')
                        ->orWhereJsonLength('applicable_branches', 0);
                }
            })
            ->exists();
    }
}
