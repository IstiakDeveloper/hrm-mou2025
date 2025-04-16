<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Branch;
use App\Models\AttendanceDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BranchEmployeeAPIController extends Controller
{
    /**
     * Get employees by branch ID
     */
    public function getEmployeesByBranch(Request $request, $branchId)
    {
        // Validate branch ID
        $branch = Branch::find($branchId);
        if (!$branch) {
            return response()->json([
                'status' => false,
                'message' => 'Branch not found',
            ], 404);
        }

        // Get active employees for the branch
        $employees = Employee::where('current_branch_id', $branchId)
            ->where('status', 'active')
            ->with(['department:id,name', 'designation:id,name'])
            ->select(
                'id',
                'employee_id',
                'biometric_id',
                'first_name',
                'last_name',
                'department_id',
                'designation_id'
            )
            ->get();

        // Transform data for ZKTeco device
        $employeeData = $employees->map(function($employee) {
            return [
                'id' => $employee->employee_id,
                'name' => $employee->first_name . ' ' . $employee->last_name,
                'user_id' => $employee->biometric_id,
                'department' => $employee->department ? $employee->department->name : '',
                'position' => $employee->designation ? $employee->designation->name : ''
            ];
        });

        return response()->json([
            'status' => true,
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name
            ],
            'employees' => $employeeData,
            'total' => $employeeData->count()
        ]);
    }

    /**
     * Get employees for a specific device
     */
    public function getEmployeesByDevice(Request $request, $deviceId)
    {
        // Validate device ID
        $device = AttendanceDevice::find($deviceId);
        if (!$device) {
            return response()->json([
                'status' => false,
                'message' => 'Device not found',
            ], 404);
        }

        // Get branch from device
        $branch = $device->branch;
        if (!$branch) {
            return response()->json([
                'status' => false,
                'message' => 'Device not associated with a branch',
            ], 400);
        }

        // Get active employees for the branch
        $employees = Employee::where('current_branch_id', $branch->id)
            ->where('status', 'active')
            ->with(['department:id,name', 'designation:id,name'])
            ->select(
                'id',
                'employee_id',
                'biometric_id',
                'first_name',
                'last_name',
                'department_id',
                'designation_id'
            )
            ->get();

        // Transform data for ZKTeco device
        $employeeData = $employees->map(function($employee) {
            return [
                'id' => $employee->employee_id,
                'name' => $employee->first_name . ' ' . $employee->last_name,
                'user_id' => $employee->biometric_id,
                'department' => $employee->department ? $employee->department->name : '',
                'position' => $employee->designation ? $employee->designation->name : ''
            ];
        });

        return response()->json([
            'status' => true,
            'device' => [
                'id' => $device->id,
                'name' => $device->name,
                'ip_address' => $device->ip_address,
                'port' => $device->port
            ],
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name
            ],
            'employees' => $employeeData,
            'total' => $employeeData->count()
        ]);
    }

    /**
     * Push employees to device
     */
    public function pushEmployeesToDevice(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'device_id' => 'required|exists:attendance_devices,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Invalid request data',
                'errors' => $validator->errors(),
            ], 422);
        }

        $deviceId = $request->device_id;
        $device = AttendanceDevice::find($deviceId);

        // Call ZKTeco SDK or library to push employees to device
        // This is a placeholder - actual implementation depends on your ZKTeco integration method
        $result = $this->sendEmployeesToDevice($device);

        if ($result['success']) {
            return response()->json([
                'status' => true,
                'message' => 'Employees successfully pushed to device',
                'device' => [
                    'id' => $device->id,
                    'name' => $device->name
                ],
                'summary' => $result['summary']
            ]);
        } else {
            return response()->json([
                'status' => false,
                'message' => 'Failed to push employees to device',
                'error' => $result['error']
            ], 500);
        }
    }

    /**
     * Send employees to ZKTeco device
     * This is a placeholder method - you'll need to implement actual ZKTeco device communication
     */
    private function sendEmployeesToDevice($device)
    {
        try {
            // Get branch from device
            $branch = $device->branch;
            if (!$branch) {
                return [
                    'success' => false,
                    'error' => 'Device not associated with a branch'
                ];
            }

            // Get employees for the branch
            $employees = Employee::where('current_branch_id', $branch->id)
                ->where('status', 'active')
                ->whereNotNull('biometric_id')
                ->get();

            if ($employees->isEmpty()) {
                return [
                    'success' => false,
                    'error' => 'No employees with biometric IDs found for this branch'
                ];
            }

            // Placeholder for actual ZKTeco SDK integration
            // In a real implementation, you would:
            // 1. Connect to the device using its IP and port
            // 2. Clear existing user data if needed
            // 3. Push each employee record to the device
            // 4. Format data according to ZKTeco API requirements

            // This is just a simulation
            Log::info('Simulating push of ' . $employees->count() . ' employees to device ' . $device->name);

            return [
                'success' => true,
                'summary' => [
                    'total' => $employees->count(),
                    'success' => $employees->count(),
                    'failed' => 0
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Error pushing employees to device: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
