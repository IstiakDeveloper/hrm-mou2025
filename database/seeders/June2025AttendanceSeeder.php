<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\Employee;
use App\Models\LeaveApplication;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class June2025AttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Set the month and year
        $year = 2025;
        $month = 6; // June

        // Get all active employees
        $employees = Employee::where('status', 'active')->get();

        if ($employees->isEmpty()) {
            $this->command->warn('No active employees found!');

            return;
        }

        // Get first attendance device (or create a dummy one)
        $device = AttendanceDevice::first();
        if (! $device) {
            $this->command->warn('No attendance device found! Creating a dummy device.');
            $device = $this->createDummyDevice();
        }

        // Get number of days in June 2025
        $daysInMonth = Carbon::create($year, $month, 1)->daysInMonth;

        $this->command->info("Generating attendance data for June $year ($daysInMonth days)");
        $this->command->info('Total employees: '.$employees->count());

        // Progress bar
        $bar = $this->command->getOutput()->createProgressBar($employees->count() * $daysInMonth);
        $bar->start();

        $totalRecords = 0;

        foreach ($employees as $employee) {
            for ($day = 1; $day <= $daysInMonth; $day++) {
                $date = Carbon::create($year, $month, $day);

                // Skip if it's a weekend (Only Friday in Bangladesh)
                if ($date->isFriday()) {
                    $bar->advance();

                    continue;
                }

                // Check if employee has leave on this date
                $isOnLeave = $this->checkEmployeeLeave($employee->id, $date->format('Y-m-d'));

                // Check if employee has movement on this date
                $isOnMovement = $this->checkEmployeeMovement($employee->id, $date->format('Y-m-d'));

                // Generate attendance record
                $attendanceData = $this->generateAttendanceRecord($employee, $device, $date, $isOnLeave, $isOnMovement);

                if ($attendanceData) {
                    $this->saveAttendanceRecord($attendanceData);
                    $totalRecords++;
                }

                $bar->advance();
            }
        }

        $bar->finish();
        $this->command->newLine();
        $this->command->info("Successfully generated $totalRecords attendance records for June 2025!");
    }

    /**
     * Generate attendance record for an employee on a specific date
     */
    private function generateAttendanceRecord($employee, $device, $date, $isOnLeave, $isOnMovement)
    {
        $dateString = $date->format('Y-m-d');

        // Check if attendance already exists
        $existingAttendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $dateString)
            ->first();

        if ($existingAttendance) {
            return null; // Skip if already exists
        }

        $attendance = [
            'employee_id' => $employee->id,
            'date' => $dateString,
            'device_id' => $device->id,
            'check_in' => null,
            'check_out' => null,
            'status' => 'absent',
            'movement_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        // Handle leave status
        if ($isOnLeave) {
            $attendance['status'] = 'leave';

            return $attendance;
        }

        // Handle movement status
        if ($isOnMovement) {
            $attendance['status'] = 'on_duty';

            // You can add movement_id here if needed
            return $attendance;
        }

        // Generate random attendance patterns
        $attendancePattern = $this->getAttendancePattern();

        if ($attendancePattern === 'absent') {
            $attendance['status'] = 'absent';

            return $attendance;
        }

        // Generate check-in time (08:30 AM to 09:30 AM with variations)
        $checkInTime = $this->generateCheckInTime();
        $attendance['check_in'] = $checkInTime;

        // Generate check-out time (07:00 PM to 08:00 PM with variations)
        if ($attendancePattern !== 'half_day') {
            $checkOutTime = $this->generateCheckOutTime();
            $attendance['check_out'] = $checkOutTime;
        }

        // Determine status based on check-in time
        $attendance['status'] = $this->determineStatus($checkInTime, $attendance['check_out']);

        return $attendance;
    }

    /**
     * Get random attendance pattern
     */
    private function getAttendancePattern()
    {
        $patterns = [
            'present' => 75,     // 75% chance of being present
            'late' => 15,        // 15% chance of being late
            'half_day' => 5,     // 5% chance of half day
            'absent' => 5,       // 5% chance of being absent
        ];

        $random = rand(1, 100);
        $cumulative = 0;

        foreach ($patterns as $pattern => $percentage) {
            $cumulative += $percentage;
            if ($random <= $cumulative) {
                return $pattern;
            }
        }

        return 'present';
    }

    /**
     * Generate realistic check-in time
     */
    private function generateCheckInTime()
    {
        // Office starts at 09:00 AM
        $baseTime = Carbon::createFromTime(9, 0, 0);

        // Add random variation (-30 minutes to +30 minutes)
        $variationMinutes = rand(-30, 30);
        $checkInTime = $baseTime->copy()->addMinutes($variationMinutes);

        // Ensure it's not too early (not before 8:00 AM)
        if ($checkInTime->hour < 8) {
            $checkInTime = Carbon::createFromTime(8, rand(0, 59), rand(0, 59));
        }

        // Add some seconds for realism
        $checkInTime->addSeconds(rand(0, 59));

        return $checkInTime->format('H:i:s');
    }

    /**
     * Generate realistic check-out time
     */
    private function generateCheckOutTime()
    {
        // Office ends at 07:30 PM (19:30)
        $baseTime = Carbon::createFromTime(19, 30, 0);

        // Add random variation (-30 minutes to +60 minutes)
        $variationMinutes = rand(-30, 60);
        $checkOutTime = $baseTime->copy()->addMinutes($variationMinutes);

        // Ensure it's not too early (not before 5:00 PM for full day)
        if ($checkOutTime->hour < 17) {
            $checkOutTime = Carbon::createFromTime(17, rand(0, 59), rand(0, 59));
        }

        // Add some seconds for realism
        $checkOutTime->addSeconds(rand(0, 59));

        return $checkOutTime->format('H:i:s');
    }

    /**
     * Determine attendance status based on times
     */
    private function determineStatus($checkInTime, $checkOutTime)
    {
        $checkIn = Carbon::createFromTimeString($checkInTime);
        $workStartTime = Carbon::createFromTime(9, 0, 0);
        $lateThreshold = Carbon::createFromTime(9, 15, 0); // 15 minutes late threshold

        // Check if late
        if ($checkIn->gt($lateThreshold)) {
            return 'late';
        }

        // Check for half day if check-out is early
        if ($checkOutTime) {
            $checkOut = Carbon::createFromTimeString($checkOutTime);
            $hoursWorked = $checkIn->diffInHours($checkOut);

            if ($hoursWorked < 4) { // Less than 4 hours is half day
                return 'half_day';
            }
        }

        return 'present';
    }

    /**
     * Check if employee has approved leave on this date
     */
    private function checkEmployeeLeave($employeeId, $date)
    {
        $dateObj = Carbon::parse($date);

        return LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('start_date', '<=', $dateObj)
            ->where('end_date', '>=', $dateObj)
            ->exists();
    }

    /**
     * Check if employee has movement on this date
     */
    private function checkEmployeeMovement($employeeId, $date)
    {
        $dateObj = Carbon::parse($date);

        // Check if Movement model exists
        if (! class_exists('\App\Models\Movement')) {
            return false;
        }

        return \App\Models\Movement::where('employee_id', $employeeId)
            ->whereIn('status', ['approved', 'completed'])
            ->where('movement_type', 'official')
            ->where('from_datetime', '<=', $dateObj->endOfDay())
            ->where('to_datetime', '>=', $dateObj->startOfDay())
            ->exists();
    }

    /**
     * Save attendance record to database
     */
    private function saveAttendanceRecord($attendanceData)
    {
        try {
            DB::transaction(function () use ($attendanceData) {
                Attendance::create($attendanceData);
            });
        } catch (\Exception $e) {
            Log::error('Error creating attendance record', [
                'data' => $attendanceData,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create a dummy attendance device if none exists
     */
    private function createDummyDevice()
    {
        return AttendanceDevice::create([
            'device_id' => 999999,
            'name' => 'Seeder Device',
            'ip_address' => '192.168.1.100',
            'port' => 4370,
            'serial_number' => 'SEED001',
            'branch_id' => 1, // Assuming branch ID 1 exists
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
