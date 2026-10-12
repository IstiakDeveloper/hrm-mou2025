<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceCommand;
use App\Models\AttendanceDeviceUser;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\Designation;
use App\Models\GuardShiftSetting;
use App\Models\ZktecoSyncSetting;
use App\Services\AdmsDeviceCommandService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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
            return $value.':00';
        }

        return $value;
    }

    /**
     * DB time → "HH:mm" for <input type="time" />
     */
    private function formatTimeForInput(mixed $value): string
    {
        if (! is_string($value) || $value === '') {
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
            'isBulkAttendanceEnabled' => AttendanceSetting::isBulkAttendanceEnabled(),
            'guardShift' => GuardShiftSetting::current()->present(),
            'designations' => Designation::query()->orderBy('name')->get(['id', 'name']),
            'attlogKeepDays' => ZktecoSyncSetting::attlogKeepDays(),
            'devicePushes' => $this->devicePushRows(),
        ]);
    }

    /**
     * How many days of punch logs the machines keep. Does not touch users.
     */
    public function updateDeviceLogKeep(Request $request)
    {
        $data = $request->validate([
            'attlog_keep_days' => 'required|integer|min:1|max:90',
        ]);

        $days = (int) $data['attlog_keep_days'];
        $setting = ZktecoSyncSetting::current();
        $setting->attlog_keep_days = $days;
        $setting->save();

        if (Schema::hasColumn('attendance_devices', 'adms_attlog_keep_days')) {
            AttendanceDevice::query()->update(['adms_attlog_keep_days' => $days]);
        }

        return redirect()->route('attendance.settings.index')
            ->with('success', "Devices will drop punch logs older than {$days} days. Names, fingerprints, and faces stay on the machine.");
    }

    /**
     * Ask one device who is already enrolled, then add only the missing IDs.
     */
    public function pushMissingDeviceUsers(Request $request, AttendanceDevice $device, AdmsDeviceCommandService $commands)
    {
        $request->validate([
            'allow_empty' => 'sometimes|boolean',
        ]);

        if (! $device->acceptsAdms()) {
            return redirect()->route('attendance.settings.index')
                ->with('error', 'Turn on live ADMS for this device before pushing employees.');
        }

        if (! Schema::hasTable('attendance_device_commands')) {
            return redirect()->route('attendance.settings.index')
                ->with('error', 'Device push is not ready yet. Run the latest migration.');
        }

        $message = $commands->requestPush($device, $request->boolean('allow_empty'));

        return redirect()->route('attendance.settings.index')
            ->with('success', $message);
    }

    /**
     * Toggle bulk attendance feature on or off (Super Admin Only).
     */
    public function toggleBulkAttendance(Request $request)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        abort_unless($user && $user->isSuperAdmin(), 403, 'Super Admin access required.');

        $enabled = (bool) $request->input('enable_bulk_attendance', false);

        $updated = AttendanceSetting::query()->update(['enable_bulk_attendance' => $enabled]);
        if ($updated === 0) {
            AttendanceSetting::create([
                'branch_id' => Branch::first()?->id ?? 1,
                'work_start_time' => '09:00:00',
                'work_end_time' => '17:00:00',
                'late_threshold_minutes' => 15,
                'half_day_hours' => 4,
                'weekend_days' => [5, 6],
                'enable_bulk_attendance' => $enabled,
            ]);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'enable_bulk_attendance' => $enabled,
                'message' => 'Bulk attendance generator button has been '.($enabled ? 'enabled' : 'disabled').'.',
            ]);
        }

        return redirect()->back()->with('success', 'Bulk attendance generator button has been '.($enabled ? 'enabled' : 'disabled').'.');
    }

    /**
     * Toggle multi-day movement feature for a branch (Super Admin or Attendance Admin).
     */
    public function toggleMultiDayMovement(Request $request)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        abort_unless($user && ($user->isSuperAdmin() || $user->hasPermission('attendance.admin')), 403, 'Unauthorized.');

        if ($request->boolean('all')) {
            $enabled = (bool) $request->boolean('enabled');
            Branch::query()->update(['allow_multi_day_movement' => $enabled]);
            AttendanceSetting::query()->update(['allow_multi_day_movement' => $enabled]);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'all' => true,
                    'enabled' => $enabled,
                    'message' => 'Multi-day movement has been '.($enabled ? 'enabled' : 'disabled').' for all branches.',
                ]);
            }

            return redirect()->back()->with('success', 'Multi-day movement has been '.($enabled ? 'enabled' : 'disabled').' for all branches.');
        }

        $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'enabled' => 'required|boolean',
        ]);

        $branch = Branch::findOrFail($request->branch_id);
        $enabled = (bool) $request->boolean('enabled');
        $branch->update(['allow_multi_day_movement' => $enabled]);

        AttendanceSetting::where('branch_id', $branch->id)->update([
            'allow_multi_day_movement' => $enabled,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'branch_id' => $branch->id,
                'allow_multi_day_movement' => $enabled,
                'message' => 'Multi-day movement has been '.($enabled ? 'enabled' : 'disabled')." for {$branch->name}.",
            ]);
        }

        return redirect()->back()->with('success', 'Multi-day movement has been '.($enabled ? 'enabled' : 'disabled')." for {$branch->name}.");
    }

    /**
     * Company-wide day/night windows for rotating security guards.
     */
    public function updateGuardShift(Request $request)
    {
        $request->merge([
            'day_start' => $this->normalizeTimeToHis($request->input('day_start')) ?? '',
            'day_end' => $this->normalizeTimeToHis($request->input('day_end')) ?? '',
            'night_start' => $this->normalizeTimeToHis($request->input('night_start')) ?? '',
            'night_end' => $this->normalizeTimeToHis($request->input('night_end')) ?? '',
            'designation_ids' => array_values(array_unique(array_map(
                'intval',
                (array) $request->input('designation_ids', [])
            ))),
        ]);

        $data = $request->validate([
            'is_enabled' => 'required|boolean',
            'work_on_weekend' => 'required|boolean',
            'day_start' => 'required|date_format:H:i:s',
            'day_end' => 'required|date_format:H:i:s',
            'night_start' => 'required|date_format:H:i:s',
            'night_end' => 'required|date_format:H:i:s',
            'grace_minutes' => 'required|integer|min:0|max:180',
            'designation_ids' => 'array',
            'designation_ids.*' => 'integer|exists:designations,id',
        ]);

        $setting = GuardShiftSetting::query()->orderBy('id')->first() ?? new GuardShiftSetting;
        $setting->fill($data);
        $setting->save();
        GuardShiftSetting::forgetCurrent();

        return redirect()->route('attendance.settings.index')
            ->with('success', 'Security guard shift settings saved.');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function devicePushRows(): array
    {
        $devices = AttendanceDevice::query()->with('branch:id,name')->orderBy('name')->get();
        $hasUsers = Schema::hasTable('attendance_device_users');
        $hasCommands = Schema::hasTable('attendance_device_commands');
        $commands = app(AdmsDeviceCommandService::class);
        $rows = [];

        foreach ($devices as $device) {
            $known = $hasUsers
                ? AttendanceDeviceUser::query()->where('attendance_device_id', $device->id)->count()
                : 0;
            $pending = $hasCommands
                ? AttendanceDeviceCommand::query()
                    ->where('attendance_device_id', $device->id)
                    ->whereIn('status', ['pending', 'sent'])
                    ->count()
                : 0;

            $rows[] = [
                'id' => $device->id,
                'name' => $device->name,
                'branch_name' => $device->branch?->name,
                'adms_enabled' => $device->acceptsAdms(),
                'adms_link' => $device->adms_link,
                'known_users' => $known,
                'pending_commands' => $pending,
                'missing_users' => $known > 0 ? $commands->missingCount($device) : null,
            ];
        }

        return $rows;
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
            'allow_multi_day_movement' => 'sometimes|boolean',
        ]);

        $data['weekend_days'] = array_values(array_unique(array_map('intval', $data['weekend_days'])));

        $setting = AttendanceSetting::create($data);

        if ($request->has('allow_multi_day_movement')) {
            Branch::where('id', $data['branch_id'])->update([
                'allow_multi_day_movement' => (bool) $request->boolean('allow_multi_day_movement'),
            ]);
        }

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
        $payload['allow_multi_day_movement'] = (bool) ($setting->allow_multi_day_movement ?? false);

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
            'branch_id' => 'required|exists:branches,id|unique:attendance_settings,branch_id,'.$setting->getKey(),
            'work_start_time' => 'required|date_format:H:i:s',
            'work_end_time' => 'required|date_format:H:i:s',
            'late_threshold_minutes' => 'required|integer|min:0',
            'half_day_hours' => 'required|integer|min:1',
            'weekend_days' => 'required|array|min:1',
            'weekend_days.*' => 'integer|min:0|max:6',
            'allow_multi_day_movement' => 'sometimes|boolean',
        ]);

        $data['weekend_days'] = array_values(array_unique(array_map('intval', $data['weekend_days'])));

        $setting->update($data);

        if ($request->has('allow_multi_day_movement')) {
            Branch::where('id', $data['branch_id'])->update([
                'allow_multi_day_movement' => (bool) $request->boolean('allow_multi_day_movement'),
            ]);
        }

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
