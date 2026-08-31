<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\ZktecoSyncSetting;
use App\Services\ZktecoAttendanceIngestService;
use App\Support\EmployeeNameMatcher;
use App\Support\EmployeePinLookup;
use App\Support\ZktecoEmployeeResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class ZKTecoAPIController extends Controller
{
    private function ingest(): ZktecoAttendanceIngestService
    {
        return app(ZktecoAttendanceIngestService::class);
    }

    /**
     * Process attendance data from ZKTeco devices
     */
    public function syncAttendance(Request $request)
    {
        // Ensure holiday-based attendance is updated from stored holidays table
        $this->ingest()->ensureHolidayAttendanceBackfilled();

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
        $this->ingest()->processAbsentEmployees($device);

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
        if (!isset($record['id']) || !isset($record['timestamp'])) {
            Log::warning('ZKTeco sync: Invalid direct push record format', [
                'record' => $record
            ]);
            return false;
        }

        return $this->ingest()->ingestPunch(
            $device,
            (string) $record['id'],
            (string) $record['timestamp']
        );
    }

    /**
     * Process a record from agent push
     */
    private function processAgentRecord($record, $device, ?ZktecoEmployeeResolver $resolver = null)
    {
        return $this->ingest()->ingestPunch(
            $device,
            (string) $record['id'],
            (string) $record['timestamp'],
            $resolver
        );
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

        if (Schema::hasTable('zkteco_sync_settings') && ! ZktecoSyncSetting::agentSyncEnabled()) {
            return response()->json([
                'status' => false,
                'message' => 'Local agent attendance sync is disabled globally. Live ADMS is in use.',
                'code' => 'agent_sync_disabled',
            ], 403);
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

        if (! $device->acceptsAgentSync()) {
            return response()->json([
                'status' => false,
                'message' => 'Local agent attendance sync is disabled for this device. Live ADMS is in use.',
                'code' => 'agent_sync_disabled',
            ], 403);
        }

        if (isset($request->device_pin_mappings) && is_array($request->device_pin_mappings)) {
            $this->processDevicePinMappings($request->device_pin_mappings);
        }

        if (isset($request->user_data) && is_array($request->user_data)) {
            $this->processUserData($request->user_data, $device);
        }

        $resolver = new ZktecoEmployeeResolver(
            $request->user_data ?? [],
            $device->branch_id
        );

        $processed = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($request->attendance_data as $record) {
            try {
                $result = $this->processAgentRecord($record, $device, $resolver);
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

        $device->last_sync_at = now();
        $device->last_sync_status = $errors === 0 ? 'success' : 'partial';
        $device->save();

        $this->ingest()->processAbsentEmployees($device);

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
     * Store numeric device badge IDs for special HRM pins (SMART-1, CSO-2, etc.).
     */
    public function syncDevicePinMappings(Request $request)
    {
        if ($request->header('Authorization') !== 'Bearer ' . config('app.zkteco_api_key')) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'mappings' => 'required|array',
            'mappings.*.hrm_pin' => 'required|string',
            'mappings.*.device_user_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Invalid mapping data',
                'errors' => $validator->errors(),
            ], 422);
        }

        $summary = $this->processDevicePinMappings($request->input('mappings', []));

        return response()->json([
            'status' => true,
            'message' => 'Device pin mappings saved',
            'summary' => $summary,
        ]);
    }

    private function processDevicePinMappings(array $mappings): array
    {
        if (! Schema::hasColumn('employees', 'device_user_id')) {
            Log::warning('ZKTeco sync: device_user_id column missing, skipping pin mappings');

            return [
                'updated' => 0,
                'skipped' => count($mappings),
                'missing' => 0,
                'total' => count($mappings),
            ];
        }

        $updated = 0;
        $skipped = 0;
        $missing = 0;

        foreach ($mappings as $mapping) {
            $hrmPin = trim((string) ($mapping['hrm_pin'] ?? ''));
            $deviceUserId = trim((string) ($mapping['device_user_id'] ?? ''));

            if ($hrmPin === '' || $deviceUserId === '') {
                $skipped++;
                continue;
            }

            $employee = Employee::query()
                ->where('employee_id', $hrmPin)
                ->orWhere('pin', $hrmPin)
                ->first();

            if (! $employee) {
                $missing++;
                continue;
            }

            if ($employee->device_user_id === $deviceUserId) {
                $skipped++;
                continue;
            }

            $employee->device_user_id = $deviceUserId;
            $employee->save();
            $updated++;
        }

        Log::info('ZKTeco sync: Device pin mappings processed', [
            'updated' => $updated,
            'skipped' => $skipped,
            'missing' => $missing,
            'total' => count($mappings),
        ]);

        return [
            'updated' => $updated,
            'skipped' => $skipped,
            'missing' => $missing,
            'total' => count($mappings),
        ];
    }

    /**
     * Process user data from the device to sync biometric IDs
     */
    private function processUserData($userData, $device)
    {
        $updated = 0;
        $skipped = 0;

        foreach ($userData as $user) {
            if (! is_array($user) || ! isset($user['uid'])) {
                $skipped++;
                continue;
            }

            $deviceUserId = trim((string) ($user['id'] ?? $user['userid'] ?? ''));
            if ($deviceUserId === '') {
                $skipped++;
                continue;
            }

            $employee = EmployeePinLookup::findEmployee($deviceUserId);

            if (! $employee && ! empty($user['name'])) {
                $employee = EmployeeNameMatcher::findTextPinEmployeeByDeviceName(
                    (string) $user['name'],
                    $device->branch_id
                ) ?? EmployeeNameMatcher::findByDeviceName((string) $user['name'], $device->branch_id);
            }

            if (! $employee) {
                $skipped++;
                continue;
            }

            if (
                Schema::hasColumn('employees', 'device_user_id')
                && preg_match('/^\d+$/', $deviceUserId)
                && $employee->device_user_id !== $deviceUserId
            ) {
                $employee->device_user_id = $deviceUserId;
                $employee->save();
            }

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
