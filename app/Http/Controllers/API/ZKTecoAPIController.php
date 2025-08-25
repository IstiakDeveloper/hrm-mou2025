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

        // Find employee by employee_id
        $employee = Employee::where('employee_id', (string) $record['id'])->first();

        // Log the employee lookup details for debugging
        Log::info('ZKTeco sync: Employee lookup details', [
            'record_id' => $record['id'],
            'record_id_type' => gettype($record['id']),
            'employee_found' => ($employee !== null)
        ]);

        if (!$employee) {
            Log::warning('ZKTeco sync: Unknown employee_id from direct push', [
                'employee_id' => $record['id'],
                'device_id' => $device->id
            ]);
            return false;
        }

        // Parse timestamp - handle different timestamp formats
        try {
            // Log the timestamp we're trying to parse
            Log::info('ZKTeco sync: Parsing timestamp', [
                'raw_timestamp' => $record['timestamp']
            ]);

            // Try standard format first
            $timestamp = Carbon::parse($record['timestamp']);

            $date = $timestamp->format('Y-m-d');
            $time = $timestamp->format('H:i:s');
            $hour = (int) $timestamp->format('H');

            // Log the parsed components
            Log::info('ZKTeco sync: Parsed timestamp components', [
                'date' => $date,
                'time' => $time,
                'hour' => $hour,
                'full_datetime' => $timestamp->format('Y-m-d H:i:s')
            ]);

            // Determine check-in or check-out based on time of day
            // Before noon (0-11 hours) is check-in, after noon (12-23 hours) is check-out
            $isCheckIn = ($hour < 12);

            // Log the automatic time-based determination
            Log::info('ZKTeco sync: Auto-determined punch type', [
                'hour' => $hour,
                'isCheckIn' => $isCheckIn
            ]);

            return $this->saveAttendanceRecord($employee, $device, $date, $time, $isCheckIn);
        } catch (\Exception $e) {
            Log::error('ZKTeco sync: Error parsing timestamp', [
                'timestamp' => $record['timestamp'],
                'error' => $e->getMessage()
            ]);
            return false;
        }
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
        // Find employee by employee_id
        $employee = Employee::where('employee_id', (string) $record['id'])->first();

        // Log the employee lookup details for debugging
        Log::info('ZKTeco sync: Employee lookup details', [
            'record_id' => $record['id'],
            'record_id_type' => gettype($record['id']),
            'employee_found' => ($employee !== null)
        ]);

        if (!$employee) {
            Log::warning('ZKTeco sync: Unknown employee_id from agent', [
                'employee_id' => $record['id'],
                'device_id' => $device->id
            ]);
            return false;
        }

        try {
            // Log the timestamp we're trying to parse
            Log::info('ZKTeco sync: Parsing timestamp', [
                'raw_timestamp' => $record['timestamp']
            ]);

            // Parse timestamp
            $timestamp = Carbon::parse($record['timestamp']);

            $date = $timestamp->format('Y-m-d');
            $time = $timestamp->format('H:i:s');
            $hour = (int) $timestamp->format('H');

            // Log the parsed components
            Log::info('ZKTeco sync: Parsed timestamp components', [
                'date' => $date,
                'time' => $time,
                'hour' => $hour,
                'full_datetime' => $timestamp->format('Y-m-d H:i:s')
            ]);

            // Determine check-in or check-out based on time of day
            // Before noon (0-11 hours) is check-in, after noon (12-23 hours) is check-out
            $isCheckIn = ($hour < 12);

            // Log the automatic time-based determination
            Log::info('ZKTeco sync: Auto-determined punch type', [
                'hour' => $hour,
                'isCheckIn' => $isCheckIn
            ]);

            return $this->saveAttendanceRecord($employee, $device, $date, $time, $isCheckIn);
        } catch (\Exception $e) {
            Log::error('ZKTeco sync: Error parsing timestamp', [
                'timestamp' => $record['timestamp'],
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
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

            // Check for movement
            $isOnMovement = $this->isEmployeeOnMovement($employee->id, $date);

            // Get movement record if exists
            $movement = null;
            if ($isOnMovement) {
                $movement = \App\Models\Movement::where('employee_id', $employee->id)
                    ->whereIn('status', ['approved', 'completed', 'active'])
                    ->where('movement_type', 'official')
                    ->where('from_datetime', '<=', Carbon::parse($date)->endOfDay())
                    ->where('to_datetime', '>=', Carbon::parse($date)->startOfDay())
                    ->first();
            }

            // Get employee department for special logic
            $departmentId = $employee->department_id;
            $isCustomerService = ($departmentId == 13);

            if ($attendance) {
                // Update existing attendance
                $updated = false;

                if ($isCustomerService) {
                    // Customer Service Department Logic: First record is check-in, last is check-out
                    if ($isCheckIn && (!$attendance->check_in || Carbon::parse($time)->format('H:i') < Carbon::parse($attendance->check_in)->format('H:i'))) {
                        $attendance->check_in = $time;
                        $attendance->device_id = $device->id;
                        $updated = true;

                        Log::info('ZKTeco sync: Updated Customer Service check-in (first/earliest)', [
                            'employee_id' => $employee->id,
                            'date' => $date,
                            'time' => $time,
                            'previous_check_in' => $attendance->getOriginal('check_in')
                        ]);
                    } elseif (!$isCheckIn && (!$attendance->check_out || Carbon::parse($time)->format('H:i') > Carbon::parse($attendance->check_out)->format('H:i'))) {
                        $attendance->check_out = $time;
                        $updated = true;

                        Log::info('ZKTeco sync: Updated Customer Service check-out (last/latest)', [
                            'employee_id' => $employee->id,
                            'date' => $date,
                            'time' => $time,
                            'previous_check_out' => $attendance->getOriginal('check_out')
                        ]);
                    }

                    // For Customer Service, also consider any punch within working hours
                    $hour = (int) Carbon::parse($time)->format('H');

                    // If punch is between 2 PM (14) and 7:30 PM (19), determine based on existing records
                    if ($hour >= 14 && $hour <= 19) {
                        if (!$attendance->check_in) {
                            // No check-in yet, make this check-in
                            $attendance->check_in = $time;
                            $attendance->device_id = $device->id;
                            $updated = true;

                            Log::info('ZKTeco sync: Set Customer Service check-in (no previous check-in)', [
                                'employee_id' => $employee->id,
                                'time' => $time
                            ]);
                        } elseif (!$attendance->check_out && Carbon::parse($time)->format('H:i') > Carbon::parse($attendance->check_in)->format('H:i')) {
                            // Has check-in, no check-out, and this time is later - make it check-out
                            $attendance->check_out = $time;
                            $updated = true;

                            Log::info('ZKTeco sync: Set Customer Service check-out (after check-in)', [
                                'employee_id' => $employee->id,
                                'time' => $time,
                                'check_in_time' => $attendance->check_in
                            ]);
                        }
                    }
                } else {
                    // Regular Department Logic: Time-based determination
                    if ($isCheckIn && (!$attendance->check_in || Carbon::parse($time)->format('H:i') < Carbon::parse($attendance->check_in)->format('H:i'))) {
                        $attendance->check_in = $time;
                        $attendance->device_id = $device->id;
                        $updated = true;
                    } elseif (!$isCheckIn && (!$attendance->check_out || Carbon::parse($time)->format('H:i') > Carbon::parse($attendance->check_out)->format('H:i'))) {
                        $attendance->check_out = $time;
                        $updated = true;
                    }
                }

                // Link to movement if exists and not already linked
                if ($movement && !$attendance->movement_id) {
                    $attendance->movement_id = $movement->id;
                    $updated = true;
                }

                if ($updated) {
                    $this->updateAttendanceStatus($attendance);
                    $attendance->save();

                    Log::info('ZKTeco sync: Updated existing attendance record', [
                        'employee_id' => $employee->id,
                        'department_id' => $departmentId,
                        'is_customer_service' => $isCustomerService,
                        'check_in' => $attendance->check_in,
                        'check_out' => $attendance->check_out,
                        'status' => $attendance->status
                    ]);
                }
            } else {
                // Create new attendance record
                $attendance = new Attendance();
                $attendance->employee_id = $employee->id;
                $attendance->date = $date;
                $attendance->device_id = $device->id;

                if ($isCustomerService) {
                    // Customer Service: Determine based on time and context
                    $hour = (int) Carbon::parse($time)->format('H');

                    // If it's within working hours (2 PM to 7:30 PM), start with check-in
                    if ($hour >= 14 && $hour <= 19) {
                        $attendance->check_in = $time;

                        Log::info('ZKTeco sync: Created Customer Service attendance with check-in', [
                            'employee_id' => $employee->id,
                            'time' => $time,
                            'hour' => $hour
                        ]);
                    } else {
                        // Outside working hours - still record but determine type based on time
                        if ($isCheckIn) {
                            $attendance->check_in = $time;
                        } else {
                            $attendance->check_out = $time;
                        }

                        Log::info('ZKTeco sync: Created Customer Service attendance outside working hours', [
                            'employee_id' => $employee->id,
                            'time' => $time,
                            'hour' => $hour,
                            'is_check_in' => $isCheckIn
                        ]);
                    }
                } else {
                    // Regular departments: Use time-based logic
                    if ($isCheckIn) {
                        $attendance->check_in = $time;
                    } else {
                        $attendance->check_out = $time;
                    }
                }

                // Link to movement if exists
                if ($movement) {
                    $attendance->movement_id = $movement->id;
                }

                $this->updateAttendanceStatus($attendance);
                $attendance->save();

                Log::info('ZKTeco sync: Created new attendance record', [
                    'employee_id' => $employee->id,
                    'department_id' => $departmentId,
                    'is_customer_service' => $isCustomerService,
                    'check_in' => $attendance->check_in,
                    'check_out' => $attendance->check_out,
                    'status' => $attendance->status
                ]);
            }

            return true;
        });
    }

    /**
     * Update attendance status based on check-in and check-out times, leave status, and movement status
     * With special handling for Customer Service department (ID: 13) and Employee ID 1 (ED)
     */
    private function updateAttendanceStatus($attendance)
    {
        // First check if the employee is on approved leave for this date
        $isOnLeave = $this->isEmployeeOnLeave($attendance->employee_id, $attendance->date);

        if ($isOnLeave) {
            $attendance->status = 'leave';
            return;
        }

        // Check if the employee is on approved movement for this date
        $isOnMovement = $this->isEmployeeOnMovement($attendance->employee_id, $attendance->date);

        if ($isOnMovement) {
            $attendance->status = 'on_duty';
            return;
        }

        // Get employee with department information
        $employee = $attendance->employee;
        $departmentId = $employee->department_id;

        // Check if this is Customer Service department (ID: 13)
        if ($departmentId == 13) {
            $this->updateCustomerServiceAttendanceStatus($attendance, $employee);
            return;
        }

        // For all other departments, use regular logic
        $this->updateRegularAttendanceStatus($attendance, $employee);
    }

    /**
     * Update attendance status for Customer Service department
     * Working hours: 2:00 PM - 7:30 PM
     */
    private function updateCustomerServiceAttendanceStatus($attendance, $employee)
    {
        // Customer Service department working hours
        $workStartTime = '14:00:00'; // 2:00 PM
        $workEndTime = '19:30:00';   // 7:30 PM
        $lateThresholdMinutes = 15;  // 15 minutes late threshold

        Log::info('ZKTeco sync: Processing Customer Service department attendance', [
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'date' => $attendance->date,
            'check_in' => $attendance->check_in,
            'check_out' => $attendance->check_out
        ]);

        try {
            // Ensure we get the date in proper format
            $dateStr = Carbon::parse($attendance->date)->format('Y-m-d');

            Log::info('ZKTeco sync: Date conversion for Customer Service', [
                'original_date' => $attendance->date,
                'formatted_date' => $dateStr,
                'check_in' => $attendance->check_in,
                'check_out' => $attendance->check_out
            ]);

            // Create work time objects
            $workStart = Carbon::parse("{$dateStr} {$workStartTime}");
            $workEnd = Carbon::parse("{$dateStr} {$workEndTime}");
            $lateThreshold = $workStart->copy()->addMinutes($lateThresholdMinutes); // 2:15 PM

            // Initialize status
            $attendance->status = 'absent'; // Default to absent

            // Process check-in logic
            if ($attendance->check_in) {
                $checkInTime = Carbon::parse("{$dateStr} {$attendance->check_in}");

                Log::info('ZKTeco sync: Customer Service check-in analysis', [
                    'employee_id' => $employee->id,
                    'check_in_time' => $checkInTime->format('H:i:s'),
                    'work_start_time' => $workStart->format('H:i:s'),
                    'late_threshold' => $lateThreshold->format('H:i:s')
                ]);

                // Check if came too early (before 2:00 PM)
                if ($checkInTime->lt($workStart)) {
                    // Early arrival - still mark as present but log it
                    $attendance->status = 'present';
                    Log::info('ZKTeco sync: Customer Service employee arrived early', [
                        'employee_id' => $employee->id,
                        'check_in_time' => $checkInTime->format('H:i:s'),
                        'work_start_time' => $workStartTime
                    ]);
                }
                // Check if came after late threshold (after 2:15 PM)
                elseif ($checkInTime->gt($lateThreshold)) {
                    $attendance->status = 'late';
                    Log::info('ZKTeco sync: Customer Service employee marked as late', [
                        'employee_id' => $employee->id,
                        'check_in_time' => $checkInTime->format('H:i:s'),
                        'late_threshold' => $lateThreshold->format('H:i:s')
                    ]);
                }
                // Normal check-in (between 2:00 PM - 2:15 PM)
                else {
                    $attendance->status = 'present';
                    Log::info('ZKTeco sync: Customer Service employee on time', [
                        'employee_id' => $employee->id,
                        'check_in_time' => $checkInTime->format('H:i:s')
                    ]);
                }
            }

            // Process check-out logic and early leave detection
            if ($attendance->check_in && $attendance->check_out) {
                $checkInTime = Carbon::parse("{$dateStr} {$attendance->check_in}");
                $checkOutTime = Carbon::parse("{$dateStr} {$attendance->check_out}");

                Log::info('ZKTeco sync: Customer Service check-out analysis', [
                    'employee_id' => $employee->id,
                    'check_in_time' => $checkInTime->format('H:i:s'),
                    'check_out_time' => $checkOutTime->format('H:i:s'),
                    'work_end_time' => $workEnd->format('H:i:s')
                ]);

                // Handle case where check-out is next day (though unlikely for CS department)
                if ($checkOutTime->lt($checkInTime)) {
                    $checkOutTime->addDay();
                    Log::info('ZKTeco sync: Adjusted check-out time to next day', [
                        'employee_id' => $employee->id,
                        'adjusted_check_out' => $checkOutTime->format('Y-m-d H:i:s')
                    ]);
                }

                // Calculate total working hours
                $totalHoursWorked = $checkInTime->diffInMinutes($checkOutTime) / 60;

                Log::info('ZKTeco sync: Customer Service working hours calculation', [
                    'employee_id' => $employee->id,
                    'total_hours_worked' => $totalHoursWorked,
                    'check_out_before_end' => $checkOutTime->lt($workEnd)
                ]);

                // Check if left early (before 7:30 PM)
                if ($checkOutTime->lt($workEnd)) {
                    $requiredHours = 5.5; // 2 PM to 7:30 PM = 5.5 hours
                    $minimumHours = 3.0;  // Minimum 3 hours to avoid half_day

                    if ($totalHoursWorked < $minimumHours) {
                        // Very short working hours - mark as half_day regardless of current status
                        $attendance->status = 'half_day';
                        Log::info('ZKTeco sync: Customer Service employee worked very short hours', [
                            'employee_id' => $employee->id,
                            'hours_worked' => $totalHoursWorked,
                            'minimum_hours' => $minimumHours,
                            'status_set_to' => 'half_day'
                        ]);
                    } elseif ($totalHoursWorked < $requiredHours) {
                        // Left early but worked reasonable hours
                        // If already marked as late, keep it as late
                        // Otherwise, mark as half_day for early leave
                        if ($attendance->status !== 'late') {
                            $attendance->status = 'half_day';
                            Log::info('ZKTeco sync: Customer Service employee left early', [
                                'employee_id' => $employee->id,
                                'check_out_time' => $checkOutTime->format('H:i:s'),
                                'expected_end_time' => $workEndTime,
                                'hours_worked' => $totalHoursWorked,
                                'required_hours' => $requiredHours,
                                'status_set_to' => 'half_day'
                            ]);
                        } else {
                            Log::info('ZKTeco sync: Customer Service employee left early but already marked as late', [
                                'employee_id' => $employee->id,
                                'hours_worked' => $totalHoursWorked,
                                'status_kept_as' => 'late'
                            ]);
                        }
                    }
                } else {
                    // Check-out is on time or later
                    Log::info('ZKTeco sync: Customer Service employee check-out on time or later', [
                        'employee_id' => $employee->id,
                        'check_out_time' => $checkOutTime->format('H:i:s'),
                        'hours_worked' => $totalHoursWorked
                    ]);
                }
            }
            // Handle case where there's only check-out (no check-in)
            elseif (!$attendance->check_in && $attendance->check_out) {
                // No check-in but has check-out - mark as half_day
                $attendance->status = 'half_day';
                Log::info('ZKTeco sync: Customer Service employee has check-out but no check-in', [
                    'employee_id' => $employee->id,
                    'check_out_time' => $attendance->check_out,
                    'status_set_to' => 'half_day'
                ]);
            }

            Log::info('ZKTeco sync: Final Customer Service attendance status', [
                'employee_id' => $employee->id,
                'final_status' => $attendance->status,
                'check_in' => $attendance->check_in,
                'check_out' => $attendance->check_out
            ]);
        } catch (\Exception $e) {
            Log::error('ZKTeco sync: Error calculating Customer Service attendance status', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'attendance_date' => $attendance->date,
                'attendance_check_in' => $attendance->check_in,
                'attendance_check_out' => $attendance->check_out
            ]);

            // Set a default status based on available data
            if ($attendance->check_in || $attendance->check_out) {
                $attendance->status = 'present';
            } else {
                $attendance->status = 'absent';
            }

            Log::info('ZKTeco sync: Set default status due to error', [
                'employee_id' => $employee->id,
                'default_status' => $attendance->status
            ]);
        }
    }

    /**
     * Update attendance status for regular departments (non-Customer Service)
     * Regular working hours: 9:00 AM - 5:00 PM
     */
    private function updateRegularAttendanceStatus($attendance, $employee)
    {
        // Get branch work settings for regular departments
        $branchId = $employee->current_branch_id;
        $settings = \App\Models\AttendanceSetting::where('branch_id', $branchId)->first();

        if (!$settings) {
            // Use default settings if branch-specific settings not found
            $attendance->status = $attendance->check_in ? 'present' : 'absent';
            return;
        }

        Log::info('ZKTeco sync: Processing regular department attendance', [
            'employee_id' => $employee->id,
            'department_id' => $employee->department_id,
            'attendance_date' => $attendance->date,
            'attendance_check_in' => $attendance->check_in,
            'attendance_check_out' => $attendance->check_out,
            'work_start_time' => $settings->work_start_time,
            'work_end_time' => $settings->work_end_time ?? '17:00:00'
        ]);

        try {
            // Carefully construct date-time strings
            $dateStr = $attendance->date;
            $startTimeStr = $settings->work_start_time;
            $endTimeStr = $settings->work_end_time ?? '17:00:00'; // Default 5:00 PM

            // Create work time objects
            $workStartTime = Carbon::parse("{$dateStr} {$startTimeStr}");
            $workEndTime = Carbon::parse("{$dateStr} {$endTimeStr}");
            $lateThreshold = $workStartTime->copy()->addMinutes($settings->late_threshold_minutes ?? 15);

            // Calculate status based on check-in time
            if ($attendance->check_in) {
                $checkInTime = Carbon::parse("{$dateStr} {$attendance->check_in}");

                // Mark as late if check-in time is after late threshold
                if ($checkInTime->gt($lateThreshold)) {
                    $attendance->status = 'late';
                    Log::info('ZKTeco sync: Regular employee marked as late', [
                        'employee_id' => $employee->id,
                        'check_in_time' => $checkInTime->format('H:i:s'),
                        'late_threshold' => $lateThreshold->format('H:i:s')
                    ]);
                } else {
                    $attendance->status = 'present';
                }
            } else {
                // No check-in record
                $attendance->status = 'absent';
            }

            // Check for early leave and working hours
            if ($attendance->check_in && $attendance->check_out) {
                $checkInTime = Carbon::parse("{$dateStr} {$attendance->check_in}");
                $checkOutTime = Carbon::parse("{$dateStr} {$attendance->check_out}");

                // Handle case where check-out is next day
                if ($checkOutTime->lt($checkInTime)) {
                    $checkOutTime->addDay();
                }

                // Check if left early (before work end time)
                $actualWorkEndTime = Carbon::parse("{$dateStr} {$endTimeStr}");
                if ($checkOutTime->lt($actualWorkEndTime)) {
                    $hoursWorked = $checkInTime->diffInHours($checkOutTime);
                    $requiredHours = $settings->required_work_hours ?? 8; // Default 8 hours

                    if ($hoursWorked < $requiredHours) {
                        // If already marked as late, keep it as late
                        // Otherwise, mark as half_day for early leave
                        if ($attendance->status !== 'late') {
                            $attendance->status = 'half_day';
                        }

                        Log::info('ZKTeco sync: Regular employee left early', [
                            'employee_id' => $employee->id,
                            'check_out_time' => $checkOutTime->format('H:i:s'),
                            'expected_end_time' => $endTimeStr,
                            'hours_worked' => $hoursWorked,
                            'required_hours' => $requiredHours
                        ]);
                    }
                }

                // Additional check based on total working hours
                $totalHoursWorked = $checkInTime->diffInHours($checkOutTime);
                $halfDayHours = $settings->half_day_hours ?? 4; // Default 4 hours for half day

                if ($totalHoursWorked < $halfDayHours && $attendance->status != 'absent') {
                    $attendance->status = 'half_day';
                    Log::info('ZKTeco sync: Regular employee worked insufficient hours', [
                        'employee_id' => $employee->id,
                        'hours_worked' => $totalHoursWorked,
                        'half_day_threshold' => $halfDayHours
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Log the error and set a default status
            Log::error('ZKTeco sync: Error calculating regular attendance status', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Set a default status
            $attendance->status = $attendance->check_in ? 'present' : 'absent';
        }
    }

    /**
     * Check if an employee is on approved movement for a specific date
     */
    private function isEmployeeOnMovement($employeeId, $date)
    {
        $dateObj = Carbon::parse($date);

        // Check for approved movement that covers this date
        $movementExists = \App\Models\Movement::where('employee_id', $employeeId)
            ->whereIn('status', ['approved', 'completed'])
            ->where('movement_type', 'official') // শুধু অফিশিয়াল মুভমেন্ট চেক করুন
            ->where('from_datetime', '<=', $dateObj->endOfDay())
            ->where('to_datetime', '>=', $dateObj->startOfDay())
            ->exists();

        return $movementExists;
    }

    /**
     * Process absent employees for today
     * This creates attendance records for employees who didn't clock in
     * Also handles auto attendance for Employee ID 1 (ED)
     */
    private function processAbsentEmployees($device)
    {
        $today = Carbon::today()->format('Y-m-d');
        $branch = $device->branch;

        if (!$branch) {
            Log::warning('ZKTeco sync: Device not associated with a branch, skipping absent processing');
            return;
        }

        // First, handle auto attendance for Employee ID 1 (ED)
        $this->processAutoAttendanceForED($today, $device);

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
                // Create a new attendance record
                $attendance = new Attendance();
                $attendance->employee_id = $employee->id;
                $attendance->date = $today;
                $attendance->status = 'absent'; // ডিফল্ট স্ট্যাটাস

                // Check if employee is on leave
                if ($this->isEmployeeOnLeave($employee->id, $today)) {
                    $attendance->status = 'leave';
                }
                // Check if employee is on movement
                else if ($this->isEmployeeOnMovement($employee->id, $today)) {
                    $attendance->status = 'on_duty';

                    // Find the relevant movement
                    $movement = \App\Models\Movement::where('employee_id', $employee->id)
                        ->whereIn('status', ['approved', 'completed'])
                        ->where('movement_type', 'official')
                        ->where('from_datetime', '<=', Carbon::today()->endOfDay())
                        ->where('to_datetime', '>=', Carbon::today()->startOfDay())
                        ->first();

                    // Link attendance to movement
                    if ($movement) {
                        $attendance->movement_id = $movement->id;

                        // Set check-in and check-out if the movement starts or ends today
                        $fromDate = Carbon::parse($movement->from_datetime)->format('Y-m-d');
                        $toDate = Carbon::parse($movement->to_datetime)->format('Y-m-d');

                        if ($fromDate == $today) {
                            $attendance->check_in = Carbon::parse($movement->from_datetime)->format('H:i:s');
                        }

                        if ($toDate == $today) {
                            $attendance->check_out = Carbon::parse($movement->to_datetime)->format('H:i:s');
                        }
                    }
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
     * Process auto attendance for Employee ID 1 (ED)
     * Auto check-in at 09:00 AM and auto check-out at 07:30 PM
     */
    private function processAutoAttendanceForED($date, $device)
    {
        // Find Employee with ID 1 (ED)
        $edEmployee = Employee::find(1);

        if (!$edEmployee) {
            Log::warning('ZKTeco sync: Employee ID 1 (ED) not found for auto attendance');
            return;
        }

        // Check if employee is active
        if ($edEmployee->status !== 'active') {
            Log::info('ZKTeco sync: Employee ID 1 (ED) is not active, skipping auto attendance');
            return;
        }

        // Check if attendance record already exists for today
        $attendance = Attendance::where('employee_id', 1)
            ->where('date', $date)
            ->first();

        // Auto attendance times
        $autoCheckIn = '09:00:00';    // 9:00 AM
        $autoCheckOut = '19:30:00';   // 7:30 PM

        if ($attendance) {
            // Update existing attendance record
            $updated = false;

            // Set auto check-in if not already set
            if (!$attendance->check_in) {
                $attendance->check_in = $autoCheckIn;
                $attendance->device_id = $device->id;
                $updated = true;
                Log::info('ZKTeco sync: Auto check-in set for Employee ID 1 (ED)', [
                    'date' => $date,
                    'check_in' => $autoCheckIn
                ]);
            }

            // Set auto check-out if not already set
            if (!$attendance->check_out) {
                $attendance->check_out = $autoCheckOut;
                $updated = true;
                Log::info('ZKTeco sync: Auto check-out set for Employee ID 1 (ED)', [
                    'date' => $date,
                    'check_out' => $autoCheckOut
                ]);
            }

            if ($updated) {
                // Check if employee is on leave first
                if ($this->isEmployeeOnLeave(1, $date)) {
                    $attendance->status = 'leave';
                }
                // Check if employee is on movement
                else if ($this->isEmployeeOnMovement(1, $date)) {
                    $attendance->status = 'on_duty';
                } else {
                    // Update status normally
                    $this->updateAttendanceStatus($attendance);
                }

                $attendance->save();
            }
        } else {
            // Create new attendance record with auto times
            $attendance = new Attendance();
            $attendance->employee_id = 1;
            $attendance->date = $date;
            $attendance->check_in = $autoCheckIn;
            $attendance->check_out = $autoCheckOut;
            $attendance->device_id = $device->id;

            // Check if employee is on leave
            if ($this->isEmployeeOnLeave(1, $date)) {
                $attendance->status = 'leave';
            }
            // Check if employee is on movement
            else if ($this->isEmployeeOnMovement(1, $date)) {
                $attendance->status = 'on_duty';

                // Find the relevant movement
                $movement = \App\Models\Movement::where('employee_id', 1)
                    ->whereIn('status', ['approved', 'completed'])
                    ->where('movement_type', 'official')
                    ->where('from_datetime', '<=', Carbon::parse($date)->endOfDay())
                    ->where('to_datetime', '>=', Carbon::parse($date)->startOfDay())
                    ->first();

                if ($movement) {
                    $attendance->movement_id = $movement->id;
                }
            } else {
                // Set status normally (will be 'present' since both check-in and check-out are set)
                $this->updateAttendanceStatus($attendance);
            }

            $attendance->save();

            Log::info('ZKTeco sync: Auto attendance created for Employee ID 1 (ED)', [
                'date' => $date,
                'check_in' => $autoCheckIn,
                'check_out' => $autoCheckOut,
                'status' => $attendance->status
            ]);
        }
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

            // Find employee by employee_id - ensure string comparison
            $employee = Employee::where('employee_id', (string) $user['id'])->first();
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
