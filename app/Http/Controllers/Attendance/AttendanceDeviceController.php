<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Models\Branch;
use App\Models\Employee;
use App\Support\HeadOfficeOrganogram;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class AttendanceDeviceController extends Controller
{
    /**
     * Display a listing of attendance devices.
     */
    public function index(Request $request)
    {
        $devices = AttendanceDevice::with('branch')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('device_id', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%");
                });
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('branch_id', $branchId);
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        $branches = Branch::all();

        return Inertia::render('attendance/devices/index', [
            'devices' => $devices,
            'branches' => $branches,
            'filters' => $request->only(['search', 'branch_id', 'status']),
            'statuses' => ['active', 'inactive', 'maintenance'],
        ]);
    }

    /**
     * Show form to create a new attendance device.
     */
    public function create()
    {
        $branches = Branch::all();

        return Inertia::render('attendance/devices/create', [
            'branches' => $branches,
            'statuses' => ['active', 'inactive', 'maintenance'],
        ]);
    }

    /**
     * Store a newly created attendance device.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'device_id' => 'required|string|max:50|unique:attendance_devices,device_id',
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'branch_id' => 'required|exists:branches,id',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        AttendanceDevice::create($data);

        return redirect()->route('attendance.devices.index')
            ->with('success', 'Attendance device created successfully.');
    }

    /**
     * Show form to edit an attendance device.
     */
    public function edit(AttendanceDevice $device)
    {
        $branches = Branch::all();

        return Inertia::render('attendance/devices/edit', [
            'device' => $device,
            'branches' => $branches,
            'statuses' => ['active', 'inactive', 'maintenance'],
        ]);
    }

    /**
     * Update the specified attendance device.
     */
    public function update(Request $request, AttendanceDevice $device)
    {
        $data = $request->validate([
            'device_id' => 'required|string|max:50|unique:attendance_devices,device_id,' . $device->getKey(),
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'branch_id' => 'required|exists:branches,id',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        $device->update($data);

        return redirect()->route('attendance.devices.index')
            ->with('success', 'Attendance device updated successfully.');
    }

    /**
     * Delete the specified attendance device.
     */
    public function destroy(AttendanceDevice $device)
    {
        // Check if device has attendance records
        $attendanceCount = $device->attendances()->count();
        if ($attendanceCount > 0) {
            return redirect()->route('attendance.devices.index')
                ->with('error', 'Cannot delete device that has attendance records.');
        }

        $device->delete();

        return redirect()->route('attendance.devices.index')
            ->with('success', 'Attendance device deleted successfully.');
    }

    /**
     * Test connection to the specified device.
     */
    public function testConnection(AttendanceDevice $device)
    {
        try {
            // Simple ping test to the device IP
            $ping = Http::timeout(5)->get("http://{$device->ip_address}:{$device->port}");

            // Just checking if connection is established, don't care about the response
            if ($ping->failed()) {
                return redirect()->route('attendance.devices.index')
                    ->with('error', "Failed to connect to device at {$device->ip_address}:{$device->port}");
            }

            return redirect()->route('attendance.devices.index')
                ->with('success', 'Connection to device successful.');
        } catch (\Exception $e) {
            return redirect()->route('attendance.devices.index')
                ->with('error', "Connection error: {$e->getMessage()}");
        }
    }

    /**
     * Show employee biometric ID management screen.
     */
    public function biometricIds()
    {
        $employeesQuery = Employee::select('id', 'employee_id', 'name_en', 'biometric_id', 'department_id', 'current_branch_id', 'designation_id')
            ->with(['department:id,name', 'branch:id,name', 'designation:id,name']);

        HeadOfficeOrganogram::applyToEmployeeQuery($employeesQuery, 'organogram', 'asc');

        $employees = $employeesQuery->paginate(15);

        return Inertia::render('attendance/devices/biometric-ids', [
            'employees' => $employees
        ]);
    }

    /**
     * Update employee biometric ID.
     */
    public function updateBiometricId(Request $request, Employee $employee)
    {
        $request->validate([
            'biometric_id' => 'required|string|max:50|unique:employees,biometric_id,' . $employee->id,
        ]);

        $employee->biometric_id = $request->biometric_id;
        $employee->save();

        return redirect()->route('attendance.devices.biometric-ids')
            ->with('success', 'Biometric ID updated for '.($employee->name_en ?? $employee->full_name_en ?? $employee->employee_id).'.');
    }

    /**
     * Generate a report of device sync status.
     */
    public function syncReport()
    {
        $devices = AttendanceDevice::with('branch')
            ->orderBy('name')
            ->get();

        return Inertia::render('attendance/devices/sync-report', [
            'devices' => $devices
        ]);
    }
}
