<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\LeaveApplication;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ZKTecoAPIController extends Controller
{
    /**
     * Process attendance data from ZKTeco devices
     */
    public function syncAttendance(Request $request)
    {
        Log::info('ZKTeco sync: Received data', [
            'ip' => $request->ip(),
            'method' => $request->method(),
            'data_size' => is_array($request->all()) ? count($request->all()) : 0
        ]);

        // Skip API key validation if request is coming directly from device
        $directFromDevice = $this->isRequestFromDevice($request);

        if (!$directFromDevice && $request->header('Authorization') !== 'Bearer ' . config('app.zkteco_api_key')) {
            Log::warning('ZKTeco sync: Invalid API key used');
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        // Handle direct push from device (different format than agent push)
        if ($directFromDevice) {
            return $this->handleDirectDevicePush($request);
        }

        // Handle data pushed from ZKTeco agent
        return $this->handleAgentPush($request);
    }

    /**
     * Check if request is coming directly from ZKTeco device
     */
    private function isRequestFromDevice(Request $request)
    {
        // ZKTeco devices typically use specific User-Agent strings or have specific payload formats
        // You may need to adjust this based on your specific device's behavior
        $userAgent = $request->header('User-Agent');

        // Check for ZKTeco specific headers or payload structure
        if (
            strpos($userAgent, 'ZKTeco') !== false ||
            $request->has('SN') ||
            $request->has('DeviceName') ||
            $request->has('AttLogs')
        ) {
            return true;
        }

        // Check if the request contains raw attendance data in ZKTeco format
        if ($request->has('punch') || $request->has('pin')) {
            return true;
        }

        return false;
    }

    /**
     * Handle attendance data pushed directly from ZKTeco device
     */
    private function handleDirectDevicePush(Request $request)
    {
        Log::info('ZKTeco sync: Direct device push detected', [
            'data' => $request->all()
        ]);

        // Try to identify the device by IP
        $deviceIp = $request->ip();
        $device = AttendanceDevice::where('ip_address', $deviceIp)->first();

        if (!$device) {
            // If we can't identify by IP, check for device SN in the request
            $serialNumber = $request->input('SN');
            if ($serialNumber) {
                $device = AttendanceDevice::where('serial_number', $serialNumber)->first();
            }

            // If still not found, try to auto-register
            if (!$device && config('app.zkteco_auto_register_devices', false)) {
                $device = $this->autoRegisterDevice($request);
            }

            // If we still can't identify the device, reject the request
            if (!$device) {
                Log::warning('ZKTeco sync: Unknown device from direct push', [
                    'ip' => $deviceIp,
                    'data' => $request->all()
                ]);

                return response()->json([
                    'status' => false,
                    'message' => 'Unknown device. Please register this device first.',
                ], 404);
            }
        }

        // Process attendance data based on the format
        $processed = 0;
        $skipped = 0;
        $errors = 0;

        // Extract attendance logs from request based on device format
        $attendanceLogs = $this->extractAttendanceLogs($request);

        if (empty($attendanceLogs)) {
            return response()->json([
                'status' => false,
                'message' => 'No valid attendance data found in request',
            ], 400);
        }

        // Process each attendance record
        foreach ($attendanceLogs as $record) {
            try {
                $result = $this->processDirectPushRecord($record, $device);
                if ($result === true) {
                    $processed++;
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                Log::error('ZKTeco sync: Error processing direct push record', [
                    'record' => $record,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $errors++;
            }
        }

        // Update device last sync time
        $device->last_sync_at = now();
        $device->last_sync_status = $errors === 0 ? 'success' : 'partial';
        $device->save();

        // Process absent employees for today
        $this->processAbsentEmployees($device);

        return response()->json([
            'status' => true,
            'message' => 'Direct push attendance data processed successfully',
            'summary' => [
                'processed' => $processed,
                'skipped' => $skipped,
                'errors' => $errors,
                'total' => count($attendanceLogs)
            ]
        ]);
    }

    /**
     * Extract attendance logs from various ZKTeco device formats
     */
    private function extractAttendanceLogs(Request $request)
    {
        $logs = [];

        // Format 1: AttLogs format
        if ($request->has('AttLogs') && is_array($request->input('AttLogs'))) {
            return $request->input('AttLogs');
        }

        // Format 2: Array of punch records
        if ($request->has('punch') && is_array($request->input('punch'))) {
            foreach ($request->input('punch') as $punch) {
                if (isset($punch['pin']) && isset($punch['time'])) {
                    $logs[] = [
                        'id' => $punch['pin'],
                        'timestamp' => $punch['time'],
                        'state' => $punch['status'] ?? 0,
                        'type' => $punch['type'] ?? 0
                    ];
                }
            }
            return $logs;
        }

        // Format 3: Single punch record
        if ($request->has('pin') && $request->has('time')) {
            $logs[] = [
                'id' => $request->input('pin'),
                'timestamp' => $request->input('time'),
                'state' => $request->input('status', 0),
                'type' => $request->input('type', 0)
            ];
            return $logs;
        }

        // Format 4: Raw POST data (some devices send data as raw form post)
        $content = $request->getContent();
        if (!empty($content) && strpos($content, 'pin=') !== false) {
            parse_str($content, $data);
            if (isset($data['pin']) && isset($data['time'])) {
                $logs[] = [
                    'id' => $data['pin'],
                    'timestamp' => $data['time'],
                    'state' => $data['status'] ?? 0,
                    'type' => $data['type'] ?? 0
                ];
            }
            return $logs;
        }

        return $logs;
    }

    /**
     * Process a record from direct device push
     */
    private function processDirectPushRecord($record, $device)
    {
        // Validate record has minimum required fields
        if (!isset($record['id']) || !isset($record['timestamp'])) {
            Log::warning('ZKTeco sync: Invalid direct push record format', [
                'record' => $record
            ]);
            return false;
        }

        // Find employee by employee_id instead of biometric_id
        $employee = Employee::where('employee_id', $record['id'])->first();
        if (!$employee) {
            Log::warning('ZKTeco sync: Unknown employee_id from direct push', [
                'employee_id' => $record['id'],
                'device_id' => $device->id
            ]);
            return false;
        }

        // Parse timestamp - handle different timestamp formats
        try {
            // Try standard format first
            $timestamp = Carbon::parse($record['timestamp']);
        } catch (\Exception $e) {
            try {
                // Try alternative formats that devices might send
                $timestamp = Carbon::createFromFormat('Y-m-d H:i:s', $record['timestamp']);
            } catch (\Exception $e2) {
                try {
                    // Try yet another format
                    $timestamp = Carbon::createFromFormat('d/m/Y H:i:s', $record['timestamp']);
                } catch (\Exception $e3) {
                    Log::error('ZKTeco sync: Unable to parse timestamp from direct push', [
                        'timestamp' => $record['timestamp'],
                        'error' => $e3->getMessage()
                    ]);
                    return false;
                }
            }
        }

        $date = $timestamp->format('Y-m-d');
        $time = $timestamp->format('H:i:s');

        // Determine check-in or check-out based on record state or punch type
        // Different devices use different conventions
        $isCheckIn = true; // Default to check-in

        if (isset($record['state'])) {
            // Some devices use state (0 = in, 1 = out)
            $isCheckIn = ($record['state'] == 0);
        } else if (isset($record['type'])) {
            // Some devices use type (0 = in, 1 = out)
            $isCheckIn = ($record['type'] == 0);
        }

        return $this->saveAttendanceRecord($employee, $device, $date, $time, $isCheckIn);
    }

    /**
     * Handle attendance data pushed from ZKTeco agent
     */
    private function handleAgentPush(Request $request)
    {
        // Validate the request data
        $validator = Validator::make($request->all(), [
            'device_id' => 'required|integer',
            'device_name' => 'required|string',
            'device_ip' => 'required|ip',
            'attendance_data' => 'required|array',
            'attendance_data.*.uid' => 'required|integer',
            'attendance_data.*.id' => 'required|string',
            'attendance_data.*.state' => 'required|integer',
            'attendance_data.*.timestamp' => 'required',
        ]);

        if ($validator->fails()) {
            Log::error('ZKTeco sync: Invalid data format from agent', [
                'errors' => $validator->errors()->toArray()
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Invalid data format',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Verify device exists
        $device = AttendanceDevice::where('device_id', $request->device_id)->first();
        if (!$device) {
            Log::warning('ZKTeco sync: Unknown device from agent', [
                'device_id' => $request->device_id,
                'device_name' => $request->device_name,
                'device_ip' => $request->device_ip
            ]);

            // Option to auto-register the device
            if (config('app.zkteco_auto_register_devices', false)) {
                $device = $this->registerDevice($request);
            } else {
                return response()->json([
                    'status' => false,
                    'message' => 'Unknown device. Please register this device first.',
                ], 404);
            }
        }

        // Process attendance records
        $processed = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($request->attendance_data as $record) {
            try {
                $result = $this->processAgentRecord($record, $device);
                if ($result === true) {
                    $processed++;
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                Log::error('ZKTeco sync: Error processing agent record', [
                    'record' => $record,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        // Update device last sync time
        $device->last_sync_at = now();
        $device->last_sync_status = $errors === 0 ? 'success' : 'partial';
        $device->save();

        // Process absent employees
        $this->processAbsentEmployees($device);

        // Process user data if provided (to sync employee biometric IDs)
        if (isset($request->user_data) && is_array($request->user_data)) {
            $this->processUserData($request->user_data, $device);
        }

        return response()->json([
            'status' => true,
            'message' => 'Attendance data processed successfully',
            'summary' => [
                'processed' => $processed,
                'skipped' => $skipped,
                'errors' => $errors,
                'total' => count($request->attendance_data)
            ]
        ]);
    }

    /**
     * Process a record from agent push
     */
    private function processAgentRecord($record, $device)
    {
        // Find employee by employee_id instead of biometric_id
        $employee = Employee::where('employee_id', $record['id'])->first();
        if (!$employee) {
            Log::warning('ZKTeco sync: Unknown employee_id from agent', [
                'employee_id' => $record['id'],
                'device_id' => $device->id
            ]);
            return false;
        }

        // Parse timestamp
        $timestamp = Carbon::parse($record['timestamp']);
        $date = $timestamp->format('Y-m-d');
        $time = $timestamp->format('H:i:s');

        // Determine check-in or check-out based on state
        // State = 0 typically means check-in, state = 1 means check-out
        $isCheckIn = ($record['type'] == 0);

        return $this->saveAttendanceRecord($employee, $device, $date, $time, $isCheckIn);
    }

    /**
     * Save attendance record to database
     */
    private function saveAttendanceRecord($employee, $device, $date, $time, $isCheckIn)
    {
        // Use database transaction for data integrity
        return DB::transaction(function () use ($employee, $device, $date, $time, $isCheckIn) {
            // Find existing attendance for this date
            $attendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $date)
                ->first();

            if ($attendance) {
                // Update existing attendance
                if ($isCheckIn && (!$attendance->check_in || Carbon::parse($time)->format('H:i') < Carbon::parse($attendance->check_in)->format('H:i'))) {
                    $attendance->check_in = $time;
                    $attendance->device_id = $device->id;
                    $this->updateAttendanceStatus($attendance);
                    $attendance->save();
                } elseif (!$isCheckIn && (!$attendance->check_out || Carbon::parse($time)->format('H:i') > Carbon::parse($attendance->check_out)->format('H:i'))) {
                    $attendance->check_out = $time;
                    $this->updateAttendanceStatus($attendance);
                    $attendance->save();
                }
            } else {
                // Create new attendance record
                $attendance = new Attendance();
                $attendance->employee_id = $employee->id;
                $attendance->date = $date;
                $attendance->device_id = $device->id;

                if ($isCheckIn) {
                    $attendance->check_in = $time;
                } else {
                    $attendance->check_out = $time;
                }

                $this->updateAttendanceStatus($attendance);
                $attendance->save();
            }

            return true;
        });
    }

    /**
     * Process user data from the device to sync biometric IDs
     */
    private function processUserData($userData, $device)
    {
        $updated = 0;
        $skipped = 0;

        foreach ($userData as $user) {
            if (!isset($user['uid']) || !isset($user['id'])) {
                $skipped++;
                continue;
            }

            // Find employee by employee_id
            $employee = Employee::where('employee_id', $user['id'])->first();
            if (!$employee) {
                $skipped++;
                continue;
            }

            // Update biometric ID if different
            if ($employee->biometric_id != $user['uid']) {
                $employee->biometric_id = $user['uid'];
                $employee->save();
                $updated++;
            } else {
                $skipped++;
            }
        }

        Log::info('ZKTeco sync: User data processed', [
            'updated' => $updated,
            'skipped' => $skipped,
            'total' => count($userData)
        ]);

        return true;
    }

    /**
     * Update attendance status based on check-in and check-out times
     */
    private function updateAttendanceStatus($attendance)
    {
        // First check if the employee is on approved leave for this date
        $isOnLeave = $this->isEmployeeOnLeave($attendance->employee_id, $attendance->date);

        if ($isOnLeave) {
            $attendance->status = 'leave';
            return;
        }

        // Get branch work settings
        $branchId = $attendance->employee->current_branch_id;
        $settings = \App\Models\AttendanceSetting::where('branch_id', $branchId)->first();

        if (!$settings) {
            // Use default settings if branch-specific settings not found
            $attendance->status = $attendance->check_in ? 'present' : 'absent';
            return;
        }

        $workStartTime = Carbon::parse($attendance->date . ' ' . $settings->work_start_time);
        $lateThreshold = $workStartTime->copy()->addMinutes($settings->late_threshold_minutes);

        // Calculate status
        if ($attendance->check_in) {
            $checkInTime = Carbon::parse($attendance->date . ' ' . $attendance->check_in);

            // Mark as late if check-in time is after late threshold
            if ($checkInTime->gt($lateThreshold)) {
                $attendance->status = 'late';
            } else {
                $attendance->status = 'present';
            }
        } else {
            // No check-in record
            $attendance->status = 'absent';
        }

        // Check for half-day based on working hours
        if ($attendance->check_in && $attendance->check_out) {
            $checkInTime = Carbon::parse($attendance->date . ' ' . $attendance->check_in);
            $checkOutTime = Carbon::parse($attendance->date . ' ' . $attendance->check_out);

            // Handle case where check-out is next day
            if ($checkOutTime->lt($checkInTime)) {
                $checkOutTime->addDay();
            }

            $hoursWorked = $checkInTime->diffInHours($checkOutTime);

            if ($hoursWorked < $settings->half_day_hours && $attendance->status != 'absent') {
                $attendance->status = 'half_day';
            }
        }
    }

    /**
     * Process absent employees for today
     * This creates attendance records for employees who didn't clock in
     */
    private function processAbsentEmployees($device)
    {
        $today = Carbon::today()->format('Y-m-d');
        $branch = $device->branch;

        if (!$branch) {
            Log::warning('ZKTeco sync: Device not associated with a branch, skipping absent processing');
            return;
        }

        // Get all active employees in this branch
        $employees = Employee::where('status', 'active')
            ->where('current_branch_id', $branch->id)
            ->get();

        $processed = 0;

        foreach ($employees as $employee) {
            // Check if attendance record already exists for today
            $attendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $today)
                ->first();

            if (!$attendance) {
                // Create a new attendance record marked as absent
                $attendance = new Attendance();
                $attendance->employee_id = $employee->id;
                $attendance->date = $today;
                $attendance->status = 'absent';

                // Check if employee is on leave
                if ($this->isEmployeeOnLeave($employee->id, $today)) {
                    $attendance->status = 'leave';
                }

                $attendance->save();
                $processed++;
            }
        }

        Log::info('ZKTeco sync: Processed absent employees', [
            'date' => $today,
            'branch' => $branch->name,
            'processed' => $processed,
            'total_employees' => $employees->count()
        ]);
    }

    /**
     * Check if an employee is on approved leave for a specific date
     */
    private function isEmployeeOnLeave($employeeId, $date)
    {
        $dateObj = Carbon::parse($date);

        // Check for approved leave applications that cover this date
        $leaveExists = LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('start_date', '<=', $dateObj)
            ->where('end_date', '>=', $dateObj)
            ->exists();

        return $leaveExists;
    }

    /**
     * Auto-register a device from direct push
     */
    private function autoRegisterDevice(Request $request)
    {
        // Get default branch
        $branch = Branch::first();

        $device = new AttendanceDevice();
        $device->device_id = mt_rand(10000, 99999); // Generate a random device ID
        $device->name = $request->input('DeviceName', 'Auto Registered Device');
        $device->ip_address = $request->ip();
        $device->port = 4370; // Default ZKTeco port
        $device->serial_number = $request->input('SN', '');
        $device->branch_id = $branch ? $branch->id : null;
        $device->status = 'active';
        $device->save();

        Log::info('ZKTeco sync: Auto-registered device from direct push', [
            'device_id' => $device->device_id,
            'device_name' => $device->name,
            'ip' => $device->ip_address
        ]);

        return $device;
    }

    /**
     * Register a new device from agent push
     */
    private function registerDevice(Request $request)
    {
        // Get default branch
        $branch = Branch::first();

        $device = new AttendanceDevice();
        $device->device_id = $request->device_id;
        $device->name = $request->device_name;
        $device->ip_address = $request->device_ip;
        $device->port = 4370; // Default ZKTeco port
        $device->branch_id = $branch ? $branch->id : null;
        $device->status = 'active';
        $device->save();

        Log::info('ZKTeco sync: Auto-registered device from agent', [
            'device_id' => $device->device_id,
            'device_name' => $device->name
        ]);

        return $device;
    }
}
