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
     * HTML time inputs send "HH:mm"; DB stores "HH:mm:ss". Validation uses H:i:s.
     */
    private function normalizeTimeToHis(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/', $value)) {
            return $value;
        }

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value)) {
            return $value . ':00';
        }

        return $value;
    }

    /**
     * DB time → "HH:mm" for <input type="time" />
     */
    private function formatTimeForInput(mixed $value): string
    {
        if (!is_string($value) || $value === '') {
            return '09:00';
        }

        $parts = explode(':', $value);
        if (count($parts) < 2) {
            return '09:00';
        }

        $h = str_pad((string) (int) $parts[0], 2, '0', STR_PAD_LEFT);
        $m = str_pad((string) (int) $parts[1], 2, '0', STR_PAD_LEFT);

        return "{$h}:{$m}";
    }

    /**
     * @return list<int>
     */
    private function normalizeWeekendDays(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values(array_unique(array_map('intval', $raw)));
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);

            return is_array($decoded)
                ? array_values(array_unique(array_map('intval', $decoded)))
                : [];
        }

        return [];
    }

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
        $request->merge([
            'work_start_time' => $this->normalizeTimeToHis($request->input('work_start_time')) ?? '',
            'work_end_time' => $this->normalizeTimeToHis($request->input('work_end_time')) ?? '',
        ]);

        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id|unique:attendance_settings,branch_id',
            'work_start_time' => 'required|date_format:H:i:s',
            'work_end_time' => 'required|date_format:H:i:s',
            'late_threshold_minutes' => 'required|integer|min:0',
            'half_day_hours' => 'required|integer|min:1',
            'weekend_days' => 'required|array|min:1',
            'weekend_days.*' => 'integer|min:0|max:6',
        ]);

        $data['weekend_days'] = array_values(array_unique(array_map('intval', $data['weekend_days'])));

        AttendanceSetting::create($data);

        return redirect()->route('attendance.settings.index')
            ->with('success', 'Attendance settings created successfully.');
    }

    /**
     * Show form to edit attendance settings.
     */
    public function edit(AttendanceSetting $setting)
    {
        $branches = Branch::all();

        $payload = $setting->toArray();
        $payload['work_start_time'] = $this->formatTimeForInput($setting->work_start_time);
        $payload['work_end_time'] = $this->formatTimeForInput($setting->work_end_time);
        $payload['weekend_days'] = $this->normalizeWeekendDays($setting->weekend_days);

        return Inertia::render('attendance/settings/edit', [
            'setting' => $payload,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified attendance settings.
     */
    public function update(Request $request, AttendanceSetting $setting)
    {
        $request->merge([
            'work_start_time' => $this->normalizeTimeToHis($request->input('work_start_time')) ?? '',
            'work_end_time' => $this->normalizeTimeToHis($request->input('work_end_time')) ?? '',
        ]);

        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id|unique:attendance_settings,branch_id,' . $setting->getKey(),
            'work_start_time' => 'required|date_format:H:i:s',
            'work_end_time' => 'required|date_format:H:i:s',
            'late_threshold_minutes' => 'required|integer|min:0',
            'half_day_hours' => 'required|integer|min:1',
            'weekend_days' => 'required|array|min:1',
            'weekend_days.*' => 'integer|min:0|max:6',
        ]);

        $data['weekend_days'] = array_values(array_unique(array_map('intval', $data['weekend_days'])));

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
