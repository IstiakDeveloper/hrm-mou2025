<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\ZktecoSyncSetting;
use App\Support\HeadOfficeOrganogram;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
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

                    if (Schema::hasColumn('attendance_devices', 'serial_number')) {
                        $q->orWhere('serial_number', 'like', "%{$search}%");
                    }
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
            'syncSettings' => Schema::hasTable('zkteco_sync_settings')
                ? ZktecoSyncSetting::current()->only(['agent_sync_enabled'])
                : ['agent_sync_enabled' => true],
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
        $request->merge([
            'serial_number' => filled($request->input('serial_number'))
                ? strtoupper(trim((string) $request->input('serial_number')))
                : null,
        ]);

        $data = $request->validate([
            'device_id' => 'required|string|max:50|unique:attendance_devices,device_id',
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'serial_number' => 'nullable|string|max:64|unique:attendance_devices,serial_number',
            'branch_id' => 'required|exists:branches,id',
            'status' => 'required|in:active,inactive,maintenance',
            'adms_enabled' => 'sometimes|boolean',
            'agent_sync_enabled' => 'sometimes|boolean',
        ]);

        $data['adms_enabled'] = $request->boolean('adms_enabled');
        $data['agent_sync_enabled'] = $request->has('agent_sync_enabled')
            ? $request->boolean('agent_sync_enabled')
            : true;

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
        $request->merge([
            'serial_number' => filled($request->input('serial_number'))
                ? strtoupper(trim((string) $request->input('serial_number')))
                : null,
        ]);

        $data = $request->validate([
            'device_id' => 'required|string|max:50|unique:attendance_devices,device_id,' . $device->getKey(),
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'serial_number' => [
                'nullable',
                'string',
                'max:64',
                Rule::unique('attendance_devices', 'serial_number')->ignore($device->getKey()),
            ],
            'branch_id' => 'required|exists:branches,id',
            'status' => 'required|in:active,inactive,maintenance',
            'adms_enabled' => 'sometimes|boolean',
            'agent_sync_enabled' => 'sometimes|boolean',
        ]);

        $data['adms_enabled'] = $request->boolean('adms_enabled');
        $data['agent_sync_enabled'] = $request->boolean('agent_sync_enabled');

        $device->update($data);

        return redirect()->route('attendance.devices.index')
            ->with('success', 'Attendance device updated successfully.');
    }

    /**
     * Global: allow or block the local PC agent attendance API.
     */
    public function updateSyncSettings(Request $request)
    {
        $data = $request->validate([
            'agent_sync_enabled' => 'required|boolean',
        ]);

        $settings = ZktecoSyncSetting::current();
        $settings->agent_sync_enabled = $request->boolean('agent_sync_enabled');
        $settings->save();

        return redirect()->route('attendance.devices.index')
            ->with('success', $settings->agent_sync_enabled
                ? 'Local agent API enabled. Devices can push via the office PC again.'
                : 'Local agent API disabled globally. Live ADMS will be the attendance source.');
    }

    /**
     * Per-device live ADMS / agent flags.
     */
    public function updateSyncFlags(Request $request, AttendanceDevice $device)
    {
        $data = $request->validate([
            'adms_enabled' => 'sometimes|boolean',
            'agent_sync_enabled' => 'sometimes|boolean',
        ]);

        if ($request->has('adms_enabled')) {
            $device->adms_enabled = $request->boolean('adms_enabled');
        }

        if ($request->has('agent_sync_enabled')) {
            $device->agent_sync_enabled = $request->boolean('agent_sync_enabled');
        }

        $device->save();

        return redirect()->back()->with('success', 'Device sync settings updated.');
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
     * Check ADMS: did this machine reach the VPS? (never curl the office LAN IP)
     */
    public function testConnection(AttendanceDevice $device)
    {
        if (! Schema::hasColumn('attendance_devices', 'last_adms_at')) {
            return redirect()->route('attendance.devices.index')
                ->with('error', 'Run php artisan migrate on the VPS. ADMS columns are not in the database yet, so handshake cannot be saved.');
        }

        $sn = $device->serial_number ?: 'not bound yet';

        if ($device->adms_link === 'connected') {
            return redirect()->route('attendance.devices.index')
                ->with('success', "ADMS connected. {$device->name} reached this VPS {$device->last_adms_at->diffForHumans()} (SN {$sn}).");
        }

        if ($device->adms_link === 'stale') {
            return redirect()->route('attendance.devices.index')
                ->with('error', "ADMS was connected, but last handshake was {$device->last_adms_at->diffForHumans()}. Machine may be offline or ADMS port is not 80. SN {$sn}.");
        }

        return redirect()->route('attendance.devices.index')
            ->with('error', "Waiting: {$device->name} has not called /iclock on this VPS yet. On the VPS run: grep iclock /var/log/nginx/access.log | tail. Need 200, not 404. Then php artisan migrate if not done. Machine port must be 80.");
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
