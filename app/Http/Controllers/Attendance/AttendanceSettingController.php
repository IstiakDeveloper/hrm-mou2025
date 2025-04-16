<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AttendanceSettingController extends Controller
{
    /**
     * Display a listing of attendance settings.
     */
    public function index()
    {
        $settings = AttendanceSetting::with('branch')
            ->orderBy('id')
            ->get();

        $branches = Branch::all();

        return Inertia::render('attendance/settings/index', [
            'settings' => $settings,
            'branches' => $branches,
        ]);
    }

    /**
     * Show form to create new attendance settings.
     */
    public function create()
    {
        $branches = Branch::whereDoesntHave('attendanceSettings')->get();

        return Inertia::render('attendance/settings/create', [
            'branches' => $branches,
        ]);
    }

    /**
     * Store a newly created attendance settings.
     */
    public function store(Request $request)
    {
        $request->validate([
            'branch_id' => 'required|exists:branches,id|unique:attendance_settings',
            'work_start_time' => 'required|date_format:H:i',
            'work_end_time' => 'required|date_format:H:i',
            'late_threshold_minutes' => 'required|integer|min:0',
            'half_day_hours' => 'required|integer|min:1',
            'weekend_days' => 'required|array',
            'weekend_days.*' => 'integer|min:0|max:6',
        ]);

        $data = $request->all();
        $data['weekend_days'] = json_encode($data['weekend_days']);

        AttendanceSetting::create($data);

        return redirect()->route('attendance.settings.index')
            ->with('success', 'Attendance settings created successfully.');
    }

    /**
     * Show form to edit attendance settings.
     */
    public function edit(AttendanceSetting $setting)
    {
        $setting->weekend_days = json_decode($setting->weekend_days);
        $branches = Branch::all();

        return Inertia::render('attendance/settings/edit', [
            'setting' => $setting,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified attendance settings.
     */
    public function update(Request $request, AttendanceSetting $setting)
    {
        $request->validate([
            'branch_id' => 'required|exists:branches,id|unique:attendance_settings,branch_id,' . $setting->id,
            'work_start_time' => 'required|date_format:H:i',
            'work_end_time' => 'required|date_format:H:i',
            'late_threshold_minutes' => 'required|integer|min:0',
            'half_day_hours' => 'required|integer|min:1',
            'weekend_days' => 'required|array',
            'weekend_days.*' => 'integer|min:0|max:6',
        ]);

        $data = $request->all();
        $data['weekend_days'] = json_encode($data['weekend_days']);

        $setting->update($data);

        return redirect()->route('attendance.settings.index')
            ->with('success', 'Attendance settings updated successfully.');
    }

    /**
     * Delete the specified attendance settings.
     */
    public function destroy(AttendanceSetting $setting)
    {
        $setting->delete();

        return redirect()->route('attendance.settings.index')
            ->with('success', 'Attendance settings deleted successfully.');
    }
}
