<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\Holiday;
use App\Models\Movement;
use App\Models\AttendanceSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceDataUpdateController extends Controller
{
    /**
     * Update attendance data for May-July 2025 period
     */
    public function updateMayToJuly2025()
    {
        $startDate = Carbon::parse('2025-05-01');
        $endDate = Carbon::parse('2025-07-31');
        $officeStartTime = '09:00';
        $officeEndTime = '19:00';

        return $this->bulkUpdateAttendanceData($startDate, $endDate, $officeStartTime, $officeEndTime);
    }

    /**
     * Bulk update attendance data for a date range
     */
    public function bulkUpdateAttendanceData($startDate, $endDate, $officeStartTime, $officeEndTime, $branchId = null)
    {
        Log::info('Starting bulk attendance update', [
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
            'office_start_time' => $officeStartTime,
            'office_end_time' => $officeEndTime
        ]);

        $summary = [
            'total_days' => 0,
            'total_employees' => 0,
            'absent_updated' => 0,
            'missing_checkin_updated' => 0,
            'missing_checkout_updated' => 0,
            'status_updated' => 0,
            'skipped_leave' => 0,
            'skipped_holiday' => 0,
            'skipped_weekend' => 0,
            'skipped_movement' => 0,
            'errors' => 0
        ];

        try {
            return DB::transaction(function () use ($startDate, $endDate, $officeStartTime, $officeEndTime, $branchId, &$summary) {

                // Get all active employees
                $employeesQuery = Employee::where('status', 'active');
                if ($branchId) {
                    $employeesQuery->where('current_branch_id', $branchId);
                }

                $employees = $employeesQuery->get();
                $summary['total_employees'] = $employees->count();

                Log::info("Processing {$summary['total_employees']} employees");

                // Process each date in the range
                $currentDate = $startDate->copy();
                while ($currentDate->lte($endDate)) {
                    $summary['total_days']++;

                    // Skip weekends from attendance settings (usually Friday + Saturday)
                    if (\App\Models\AttendanceSetting::isWeekendDate($currentDate)) {
                        $summary['skipped_weekend']++;
                        $currentDate->addDay();
                        continue;
                    }

                    // Check if it's a holiday
                    if ($this->isHoliday($currentDate)) {
                        $summary['skipped_holiday']++;
                        $currentDate->addDay();
                        continue;
                    }

                    Log::info("Processing date: " . $currentDate->format('Y-m-d'));

                    // Process each employee for this date
                    foreach ($employees as $employee) {
                        try {
                            $result = $this->processEmployeeAttendance(
                                $employee,
                                $currentDate->copy(),
                                $officeStartTime,
                                $officeEndTime
                            );

                            // Aggregate results
                            foreach ($result as $key => $value) {
                                if (isset($summary[$key])) {
                                    $summary[$key] += $value;
                                }
                            }
                        } catch (\Exception $e) {
                            Log::error('Error processing employee attendance', [
                                'employee_id' => $employee->id,
                                'date' => $currentDate->format('Y-m-d'),
                                'error' => $e->getMessage()
                            ]);
                            $summary['errors']++;
                        }
                    }

                    $currentDate->addDay();
                }

                $message = "Successfully updated attendance data: " .
                    "{$summary['absent_updated']} absent records, " .
                    "{$summary['missing_checkin_updated']} missing check-ins, " .
                    "{$summary['missing_checkout_updated']} missing check-outs, " .
                    "{$summary['status_updated']} status updates. " .
                    "Processed {$summary['total_days']} working days for {$summary['total_employees']} employees.";

                if ($summary['errors'] > 0) {
                    $message .= " {$summary['errors']} errors occurred.";
                }

                Log::info('Bulk attendance update completed', $summary);

                return [
                    'status' => true,
                    'message' => $message,
                    'summary' => $summary
                ];
            });
        } catch (\Exception $e) {
            Log::error('Bulk attendance update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    /**
     * Process attendance for a single employee on a specific date
     */
    protected function processEmployeeAttendance($employee, $date, $officeStartTime, $officeEndTime)
    {
        $result = [
            'absent_updated' => 0,
            'missing_checkin_updated' => 0,
            'missing_checkout_updated' => 0,
            'status_updated' => 0,
            'skipped_leave' => 0,
            'skipped_movement' => 0
        ];

        $dateStr = $date->format('Y-m-d');

        // Check if employee is on leave
        if ($this->isEmployeeOnLeave($employee->id, $date)) {
            $result['skipped_leave']++;
            return $result;
        }

        // Check if employee is on movement
        if ($this->isEmployeeOnMovement($employee->id, $date)) {
            $result['skipped_movement']++;
            return $result;
        }

        // Find existing attendance record
        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $dateStr)
            ->first();

        $needsUpdate = false;

        if (!$attendance || $attendance->status === 'absent') {
            // Create new attendance or update absent record
            if (!$attendance) {
                $attendance = new Attendance();
                $attendance->employee_id = $employee->id;
                $attendance->date = $dateStr;
                $result['absent_updated']++;
                $needsUpdate = true;
            } elseif ($attendance->status === 'absent') {
                $result['absent_updated']++;
                $needsUpdate = true;
            }
        }

        // Check for missing check-in/check-out
        if ($attendance && !$attendance->check_in) {
            $result['missing_checkin_updated']++;
            $needsUpdate = true;
        }

        if ($attendance && !$attendance->check_out) {
            $result['missing_checkout_updated']++;
            $needsUpdate = true;
        }

        if ($needsUpdate) {
            // Generate random attendance times
            $times = $this->generateRandomAttendanceTimes($officeStartTime, $officeEndTime);

            // Update check-in if missing
            if (!$attendance->check_in) {
                $attendance->check_in = $times['check_in'];
            }

            // Update check-out if missing (80% probability)
            if (!$attendance->check_out && mt_rand(1, 100) <= 80) {
                $attendance->check_out = $times['check_out'];
            }

            // Update attendance status
            $oldStatus = $attendance->status;
            $this->updateAttendanceStatus($attendance, $employee->current_branch_id);

            if ($oldStatus !== $attendance->status) {
                $result['status_updated']++;
            }

            $attendance->save();
        }

        return $result;
    }

    /**
     * Save attendance record with proper format handling
     */
    protected function saveAttendanceRecord($attendance)
    {
        try {
            // Handle date format
            if ($attendance->date instanceof \Carbon\Carbon) {
                $attendance->date = $attendance->date->format('Y-m-d');
            }

            // Don't modify check_in/check_out - let Laravel handle the casting
            // Just ensure they are in proper format
            if ($attendance->check_in && is_string($attendance->check_in) && strlen($attendance->check_in) <= 8) {
                // If it's just time format (H:i:s), convert to datetime format
                $dateStr = $attendance->date;
                $attendance->check_in = Carbon::parse("{$dateStr} {$attendance->check_in}");
            }

            if ($attendance->check_out && is_string($attendance->check_out) && strlen($attendance->check_out) <= 8) {
                // If it's just time format (H:i:s), convert to datetime format
                $dateStr = $attendance->date;
                $attendance->check_out = Carbon::parse("{$dateStr} {$attendance->check_out}");
            }

            $attendance->save();
        } catch (\Exception $e) {
            Log::error('Error saving attendance record', [
                'error' => $e->getMessage(),
                'employee_id' => $attendance->employee_id,
                'date' => $attendance->date,
                'check_in' => $attendance->check_in,
                'check_out' => $attendance->check_out
            ]);
            throw $e;
        }
    }

    /**
     * Generate random attendance times within office hours
     */
    protected function generateRandomAttendanceTimes($officeStartTime, $officeEndTime)
    {
        // Parse office times
        $startTime = Carbon::createFromTimeString($officeStartTime);
        $endTime = Carbon::createFromTimeString($officeEndTime);

        // Generate check-in time (office start ± 30 minutes)
        $checkInVariation = mt_rand(-30, 30); // Minutes
        $checkIn = $startTime->copy()->addMinutes($checkInVariation);

        // Ensure check-in is not before 7:00 AM or after 11:00 AM
        $earliestCheckIn = Carbon::createFromTimeString('07:00');
        $latestCheckIn = Carbon::createFromTimeString('11:00');

        if ($checkIn->lt($earliestCheckIn)) {
            $checkIn = $earliestCheckIn->copy()->addMinutes(mt_rand(0, 30));
        } elseif ($checkIn->gt($latestCheckIn)) {
            $checkIn = $latestCheckIn->copy()->subMinutes(mt_rand(0, 30));
        }

        // Generate check-out time (office end ± 60 minutes)
        $checkOutVariation = mt_rand(-60, 120); // Minutes
        $checkOut = $endTime->copy()->addMinutes($checkOutVariation);

        // Ensure check-out is not before 5:00 PM or after 10:00 PM
        $earliestCheckOut = Carbon::createFromTimeString('17:00');
        $latestCheckOut = Carbon::createFromTimeString('22:00');

        if ($checkOut->lt($earliestCheckOut)) {
            $checkOut = $earliestCheckOut->copy()->addMinutes(mt_rand(0, 60));
        } elseif ($checkOut->gt($latestCheckOut)) {
            $checkOut = $latestCheckOut->copy()->subMinutes(mt_rand(0, 30));
        }

        // Ensure check-out is after check-in (minimum 6 hours work)
        $minimumWorkHours = 6;
        $minimumCheckOut = $checkIn->copy()->addHours($minimumWorkHours);

        if ($checkOut->lt($minimumCheckOut)) {
            $checkOut = $minimumCheckOut->copy()->addMinutes(mt_rand(0, 120));
        }

        return [
            'check_in' => $checkIn->format('H:i:s'),
            'check_out' => $checkOut->format('H:i:s')
        ];
    }

    /**
     * Update attendance status based on check-in/check-out times
     */
    protected function updateAttendanceStatus($attendance, $branchId)
    {
        unset($branchId);
        $attendance->applyPunchStatus();
    }

    /**
     * Check if employee is on approved leave
     */
    protected function isEmployeeOnLeave($employeeId, $date)
    {
        return LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->exists();
    }

    /**
     * Check if employee is on approved movement
     */
    protected function isEmployeeOnMovement($employeeId, $date)
    {
        // Official movement marks attendance only on its start calendar day
        return Movement::where('employee_id', $employeeId)
            ->coveringAttendanceDate($date->format('Y-m-d'))
            ->exists();
    }

    /**
     * Update attendance for a specific date
     */
    public function updateSpecificDate($date = null)
    {
        $date = $date ? Carbon::parse($date) : Carbon::today();
        $officeStartTime = '09:00';
        $officeEndTime = '19:00';

        Log::info("=== UPDATING SPECIFIC DATE: {$date->format('Y-m-d')} ===");

        // Check if it's weekend (attendance settings — usually Friday + Saturday)
        if (\App\Models\AttendanceSetting::isWeekendDate($date)) {
            return response()->json([
                'status' => false,
                'message' => 'Cannot update weekend date (per attendance settings)',
                'date' => $date->format('Y-m-d'),
                'day' => $date->format('l')
            ]);
        }

        // Check if it's holiday
        if ($this->isHoliday($date)) {
            return response()->json([
                'status' => false,
                'message' => 'Cannot update holiday date',
                'date' => $date->format('Y-m-d')
            ]);
        }

        $summary = [
            'total_employees' => 0,
            'absent_updated' => 0,
            'missing_checkin_updated' => 0,
            'missing_checkout_updated' => 0,
            'status_updated' => 0,
            'skipped_leave' => 0,
            'skipped_movement' => 0,
            'errors' => 0
        ];

        try {
            return DB::transaction(function () use ($date, $officeStartTime, $officeEndTime, &$summary) {

                // Get all active employees
                $employees = Employee::where('status', 'active')->get();
                $summary['total_employees'] = $employees->count();

                foreach ($employees as $employee) {
                    try {
                        $result = $this->processEmployeeAttendance(
                            $employee,
                            $date->copy(),
                            $officeStartTime,
                            $officeEndTime
                        );

                        // Aggregate results
                        foreach ($result as $key => $value) {
                            if (isset($summary[$key])) {
                                $summary[$key] += $value;
                            }
                        }
                    } catch (\Exception $e) {
                        Log::error('Error processing employee for specific date', [
                            'employee_id' => $employee->id,
                            'date' => $date->format('Y-m-d'),
                            'error' => $e->getMessage()
                        ]);
                        $summary['errors']++;
                    }
                }

                $message = "Updated {$date->format('Y-m-d')}: " .
                    "{$summary['absent_updated']} absent, " .
                    "{$summary['missing_checkin_updated']} check-ins, " .
                    "{$summary['missing_checkout_updated']} check-outs, " .
                    "{$summary['status_updated']} status updates. " .
                    "Total {$summary['total_employees']} employees processed.";

                Log::info('Specific date update completed', $summary);

                return [
                    'status' => true,
                    'message' => $message,
                    'summary' => $summary,
                    'date' => $date->format('Y-m-d')
                ];
            });
        } catch (\Exception $e) {
            Log::error('Specific date update failed', [
                'error' => $e->getMessage(),
                'date' => $date->format('Y-m-d')
            ]);

            return [
                'status' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'date' => $date->format('Y-m-d')
            ];
        }
    }
    public function debugAttendanceData($date = null)
    {
        $date = $date ? Carbon::parse($date) : Carbon::today();
        $dateStr = $date->format('Y-m-d');

        Log::info("=== DEBUGGING ATTENDANCE FOR {$dateStr} ===");

        // Get all active employees
        $employees = Employee::where('status', 'active')->get();

        foreach ($employees as $employee) {
            $attendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $dateStr)
                ->first();

            $isOnLeave = $this->isEmployeeOnLeave($employee->id, $date);
            $isOnMovement = $this->isEmployeeOnMovement($employee->id, $date);
            $isHoliday = $this->isHoliday($date);
            $isWeekend = \App\Models\AttendanceSetting::isWeekendForEmployee($date, (int) $employee->id);

            Log::info("Employee: {$employee->name} (ID: {$employee->id})", [
                'has_attendance' => $attendance ? 'Yes' : 'No',
                'attendance_status' => $attendance->status ?? 'No record',
                'check_in' => $attendance->check_in ?? 'No check-in',
                'check_out' => $attendance->check_out ?? 'No check-out',
                'is_on_leave' => $isOnLeave ? 'Yes' : 'No',
                'is_on_movement' => $isOnMovement ? 'Yes' : 'No',
                'is_holiday' => $isHoliday ? 'Yes' : 'No',
                'is_weekend' => $isWeekend ? 'Yes' : 'No',
                'day_of_week' => $date->dayOfWeek,
                'should_be_updated' => (!$isOnLeave && !$isOnMovement && !$isHoliday && !$isWeekend) ? 'Yes' : 'No'
            ]);
        }

        Log::info("=== END DEBUG ===");

        return response()->json(['debug_completed' => true, 'date' => $dateStr]);
    }

    /**
     * Check attendance settings for debugging
     */
    public function debugAttendanceSettings($branchId = null)
    {
        $branches = $branchId ? [\App\Models\Branch::find($branchId)] : \App\Models\Branch::all();

        foreach ($branches as $branch) {
            if (!$branch) continue;

            $settings = AttendanceSetting::where('branch_id', $branch->id)->first();

            Log::info("Branch: {$branch->name} (ID: {$branch->id})", [
                'has_settings' => $settings ? 'Yes' : 'No',
                'work_start_time' => $settings->work_start_time ?? 'Not set',
                'work_end_time' => $settings->work_end_time ?? 'Not set',
                'late_threshold_minutes' => $settings->late_threshold_minutes ?? 'Not set',
                'half_day_hours' => $settings->half_day_hours ?? 'Not set',
                'weekend_days' => $settings->weekend_days ?? 'Not set'
            ]);
        }

        return response()->json(['debug_completed' => true]);
    }

    /**
     * Check if a date is a holiday
     */
    protected function isHoliday($date)
    {
        return Holiday::where('date', $date->format('Y-m-d'))
            ->exists();
    }
}
