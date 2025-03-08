<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Models\Branch;
use Illuminate\Http\Request;
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
        $request->validate([
            'device_id' => 'required|string|max:50|unique:attendance_devices',
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'branch_id' => 'required|exists:branches,id',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        AttendanceDevice::create($request->all());

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
        $request->validate([
            'device_id' => 'required|string|max:50|unique:attendance_devices,device_id,' . $device->id,
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'branch_id' => 'required|exists:branches,id',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        $device->update($request->all());

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
        // Implementation for testing ZKTeco device connection would go here
        // This would typically involve connecting to the device via SDK/API

        dd('test clicked');
        return redirect()->route('attendance.devices.index')
            ->with('success', 'Connection to device successful.');
    }
}
