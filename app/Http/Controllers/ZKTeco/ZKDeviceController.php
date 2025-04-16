<?php

namespace App\Http\Controllers\ZKTeco;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSetting;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ZKDeviceController extends Controller
{
    /**
     * Display sync dashboard.
     */
    public function index()
    {
        $devices = AttendanceDevice::with('branch')
            ->orderBy('status')
            ->orderBy('name')
            ->get();

        return Inertia::render('zk-teco/dashboard', [
            'devices' => $devices,
        ]);
    }

    /**
     * Sync attendance logs from device.
     */
    public function syncDevice(Request $request, AttendanceDevice $device)
    {
        // Note: This is a placeholder for the ZKTeco SDK integration.
        // In a real implementation, you would connect to the device using its IP and port,
        // fetch the attendance logs, and process them.

        // Sample implementation:
        try {
            // Connect to device (pseudo-code)
            // $zk = new ZKTeco($device->ip_address, $device->port);
            // $zk->connect();

            // Get attendance logs (pseudo-code)
            // $logs = $zk->getAttendance();

            // For demo purposes, simulate fetching logs
            $logs = $this->simulateAttendanceLogs($device);

            // Process attendance logs
            $processedCount = $this->processAttendanceLogs($logs, $device);

            return redirect()->route('zkteco.dashboard')
                ->with('success', "Successfully synced {$processedCount} attendance records from {$device->name}.");
        } catch (\Exception $e) {
            return redirect()->route('zkteco.dashboard')
                ->with('error', "Failed to sync device {$device->name}: {$e->getMessage()}");
        }
    }

    /**
     * Sync all devices.
     */
    public function syncAll()
    {
        $devices = AttendanceDevice::where('status', 'active')->get();
        $totalProcessed = 0;
        $errors = [];

        foreach ($devices as $device) {
            try {
                // Connect to device (pseudo-code)
                // $zk = new ZKTeco($device->ip_address, $device->port);
                // $zk->connect();

                // Get attendance logs (pseudo-code)
                // $logs = $zk->getAttendance();

                // For demo purposes, simulate fetching logs
                $logs = $this->simulateAttendanceLogs($device);

                // Process attendance logs
                $processedCount = $this->processAttendanceLogs($logs, $device);
                $totalProcessed += $processedCount;
            } catch (\Exception $e) {
                $errors[] = "Failed to sync device {$device->name}: {$e->getMessage()}";
            }
        }

        if (empty($errors)) {
            return redirect()->route('zkteco.dashboard')
                ->with('success', "Successfully synced {$totalProcessed} attendance records from all devices.");
        } else {
            return redirect()->route('zkteco.dashboard')
                ->with('warning', "Synced {$totalProcessed} records with some errors: " . implode('; ', $errors));
        }
    }

    /**
     * Test connection to device.
     */
    public function testConnection(AttendanceDevice $device)
    {
        // Note: This is a placeholder for the ZKTeco SDK integration.
        // In a real implementation, you would test the connection to the device.

        try {
            // Test connection (pseudo-code)
            // $zk = new ZKTeco($device->ip_address, $device->port);
            // $connected = $zk->connect();

            // For demo purposes, simulate connection
            $connected = $this->simulateConnection($device);

            if ($connected) {
                return redirect()->route('zkteco.dashboard')
                    ->with('success', "Successfully connected to device {$device->name}.");
            } else {
                return redirect()->route('zkteco.dashboard')
                    ->with('error', "Failed to connect to device {$device->name}.");
            }
        } catch (\Exception $e) {
            return redirect()->route('zkteco.dashboard')
                ->with('error', "Connection error for device {$device->name}: {$e->getMessage()}");
        }
    }

    /**
     * Upload employee data to device.
     */
    public function uploadEmployees(Request $request, AttendanceDevice $device)
    {
        $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
        ]);

        $employees = Employee::whereIn('id', $request->employee_ids)->get();

        // Note: This is a placeholder for the ZKTeco SDK integration.
        // In a real implementation, you would upload employee data to the device.

        try {
            // Connect to device (pseudo-code)
            // $zk = new ZKTeco($device->ip_address, $device->port);
            // $zk->connect();

            // Upload employees (pseudo-code)
            // foreach ($employees as $employee) {
            //     $zk->setUser(
            //         $employee->id,
            //         $employee->employee_id,
            //         $employee->first_name . ' ' . $employee->last_name
            //     );
            // }

            return redirect()->route('zkteco.dashboard')
                ->with('success', "Successfully uploaded {$employees->count()} employees to device {$device->name}.");
        } catch (\Exception $e) {
            return redirect()->route('zkteco.dashboard')
                ->with('error', "Failed to upload employees to device {$device->name}: {$e->getMessage()}");
        }
    }

    /**
     * Simulate getting attendance logs from device (for demo purposes).
     */
    private function simulateAttendanceLogs(AttendanceDevice $device)
    {
        $employees = Employee::where('current_branch_id', $device->branch_id)
            ->where('status', 'active')
            ->get();

        $logs = [];
        $today = Carbon::today();

        foreach ($employees as $employee) {
            // Simulate check-in time (80% probability for being present)
            if (rand(1, 100) <= 80) {
                // Most employees arrive between 8:30 and 9:30 AM
                $hour = 8 + (rand(0, 60) >= 30 ? 1 : 0);
                $minute = rand(0, 59);
                $checkIn = Carbon::today()->setHour($hour)->setMinute($minute);

                $logs[] = [
                    'employee_id' => $employee->id,
                    'timestamp' => $checkIn->format('Y-m-d H:i:s'),
                    'type' => 'check_in',
                ];

                // Simulate check-out time (90% probability for checking out if checked in)
                if (rand(1, 100) <= 90) {
                    // Most employees leave between 5:00 and 6:30 PM
                    $hour = 17 + (rand(0, 90) >= 60 ? 1 : 0);
                    $minute = rand(0, 59);
                    $checkOut = Carbon::today()->setHour($hour)->setMinute($minute);

                    $logs[] = [
                        'employee_id' => $employee->id,
                        'timestamp' => $checkOut->format('Y-m-d H:i:s'),
                        'type' => 'check_out',
                    ];
                }
            }
        }

        return $logs;
    }

    /**
     * Process attendance logs from device.
     */
    private function processAttendanceLogs($logs, AttendanceDevice $device)
    {
        $processedCount = 0;
        $settings = AttendanceSetting::where('branch_id', $device->branch_id)->first();

        if (!$settings) {
            // Use default settings if none found for this branch
            $settings = new AttendanceSetting([
                'work_start_time' => '09:00',
                'work_end_time' => '17:00',
                'late_threshold_minutes' => 15,
                'half_day_hours' => 4,
                'weekend_days' => json_encode([0, 6]), // Sunday and Saturday
            ]);
        }

        // Group logs by employee and date
        $groupedLogs = [];
        foreach ($logs as $log) {
            $timestamp = Carbon::parse($log['timestamp']);
            $date = $timestamp->format('Y-m-d');
            $employeeId = $log['employee_id'];

            if (!isset($groupedLogs[$employeeId][$date])) {
                $groupedLogs[$employeeId][$date] = [
                    'check_in' => null,
                    'check_out' => null,
                ];
            }

            if (
                $log['type'] === 'check_in' &&
                (!$groupedLogs[$employeeId][$date]['check_in'] ||
                    $timestamp < Carbon::parse($groupedLogs[$employeeId][$date]['check_in']))
            ) {
                $groupedLogs[$employeeId][$date]['check_in'] = $log['timestamp'];
            }

            if (
                $log['type'] === 'check_out' &&
                (!$groupedLogs[$employeeId][$date]['check_out'] ||
                    $timestamp > Carbon::parse($groupedLogs[$employeeId][$date]['check_out']))
            ) {
                $groupedLogs[$employeeId][$date]['check_out'] = $log['timestamp'];
            }
        }

        // Process grouped logs
        foreach ($groupedLogs as $employeeId => $dates) {
            foreach ($dates as $date => $record) {
                // Skip weekend days if configured
                $dayOfWeek = Carbon::parse($date)->dayOfWeek;
                $weekendDays = json_decode($settings->weekend_days);
                if (in_array($dayOfWeek, $weekendDays)) {
                    continue;
                }

                // Check if record already exists
                $existing = Attendance::where('employee_id', $employeeId)
                    ->where('date', $date)
                    ->first();

                if ($existing) {
                    // Update existing record
                    $existing->check_in = $record['check_in'] ? Carbon::parse($record['check_in'])->format('H:i:s') : null;
                    $existing->check_out = $record['check_out'] ? Carbon::parse($record['check_out'])->format('H:i:s') : null;
                    $existing->device_id = $device->id;

                    // Determine status
                    $existing->status = $this->determineAttendanceStatus($record, $settings);

                    $existing->save();
                } else {
                    // Create new record
                    Attendance::create([
                        'employee_id' => $employeeId,
                        'date' => $date,
                        'check_in' => $record['check_in'] ? Carbon::parse($record['check_in'])->format('H:i:s') : null,
                        'check_out' => $record['check_out'] ? Carbon::parse($record['check_out'])->format('H:i:s') : null,
                        'status' => $this->determineAttendanceStatus($record, $settings),
                        'device_id' => $device->id,
                    ]);
                }

                $processedCount++;
            }
        }

        return $processedCount;
    }

    /**
     * Determine attendance status based on check-in/out times and settings.
     */
    private function determineAttendanceStatus($record, $settings)
    {
        if (!$record['check_in']) {
            return 'absent';
        }

        $checkIn = Carbon::parse($record['check_in']);
        $workStart = Carbon::parse($checkIn->format('Y-m-d') . ' ' . $settings->work_start_time);

        // Check if late
        $isLate = $checkIn->diffInMinutes($workStart) > $settings->late_threshold_minutes &&
            $checkIn->greaterThan($workStart);

        // Check if half day
// Check if half day
        $isHalfDay = false;

        if ($record['check_out']) {
            $checkOut = Carbon::parse($record['check_out']);
            $workHours = $checkIn->diffInHours($checkOut);
            $isHalfDay = $workHours < $settings->half_day_hours;
        }

        if ($isHalfDay) {
            return 'half_day';
        } elseif ($isLate) {
            return 'late';
        } else {
            return 'present';
        }
    }

    /**
     * Simulate connection to device (for demo purposes).
     */
    private function simulateConnection(AttendanceDevice $device)
    {
        // Simulate 90% success rate for connections
        return rand(1, 100) <= 90;
    }
}
