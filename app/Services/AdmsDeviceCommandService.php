<?php

namespace App\Services;

use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceCommand;
use App\Models\AttendanceDeviceUser;
use App\Models\Employee;
use Illuminate\Support\Facades\Schema;

/**
 * Adds missing device users and never rewrites people already on the machine.
 * Allowed commands are a user-list read and a new-user name/PIN only.
 * Attendance-log cleanup is the handshake ResLogDay setting, not a wipe command.
 */
class AdmsDeviceCommandService
{
    /**
     * Queue a user-list read, then add only the chosen employees who are not already known on the device.
     *
     * @param  list<int>  $employeeIds
     */
    public function queueSelected(AttendanceDevice $device, array $employeeIds): int
    {
        $employeeIds = array_values(array_unique(array_filter(array_map('intval', $employeeIds))));
        if ($employeeIds === []) {
            return 0;
        }

        $this->ensureUserQuery($device);

        $known = array_flip($this->knownPins($device));
        $queued = 0;

        foreach ($this->branchEmployees($device)->whereIn('id', $employeeIds) as $employee) {
            $pin = $this->devicePin($employee);
            if ($pin === null || isset($known[$pin])) {
                continue;
            }

            if ($this->enqueueUpdate($device, $pin, $this->safeName($employee))) {
                $queued++;
            }
        }

        return $queued;
    }

    /**
     * @return list<array{id: int, name: string, employee_code: string, pin: string, on_device: bool, queued: bool}>
     */
    public function candidateRows(AttendanceDevice $device): array
    {
        $known = array_flip($this->knownPins($device));
        $queuedPins = array_flip(
            AttendanceDeviceCommand::query()
                ->where('attendance_device_id', $device->id)
                ->where('kind', 'update_user')
                ->whereIn('status', ['pending', 'sent'])
                ->pluck('pin')
                ->map(fn ($pin) => (string) $pin)
                ->all()
        );

        $rows = [];
        foreach ($this->branchEmployees($device) as $employee) {
            $pin = $this->devicePin($employee);
            if ($pin === null) {
                continue;
            }

            $rows[] = [
                'id' => (int) $employee->id,
                'name' => trim((string) ($employee->name_en ?: $employee->employee_id)),
                'employee_code' => (string) $employee->employee_id,
                'pin' => $pin,
                'on_device' => isset($known[$pin]),
                'queued' => isset($queuedPins[$pin]),
            ];
        }

        usort($rows, function (array $left, array $right): int {
            if ($left['on_device'] !== $right['on_device']) {
                return $left['on_device'] <=> $right['on_device'];
            }

            return strcasecmp($left['name'], $right['name']);
        });

        return $rows;
    }

    public function requestPush(AttendanceDevice $device, bool $allowEmpty): string
    {
        $pending = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('kind', 'query_users')
            ->where(function ($query) {
                $query->where('status', 'pending')
                    ->orWhere(function ($sent) {
                        $sent->where('status', 'sent')
                            ->where('sent_at', '>', now()->subMinutes(5));
                    });
            })
            ->exists();

        if ($pending) {
            return 'This device is already being asked for its user list. People already on it are not changed.';
        }

        AttendanceDeviceCommand::query()->create([
            'attendance_device_id' => $device->id,
            'kind' => 'query_users',
            'body' => 'DATA QUERY USERINFO',
            'status' => 'pending',
            'allow_empty' => $allowEmpty,
        ]);

        if ($allowEmpty) {
            return 'The device will send its user list first. If it has nobody, missing employees are added by ID and name only. Anyone already on the device is left as they are.';
        }

        return 'The device will send its user list first. Only an ID and name are added for people who are not on it. Fingerprints, faces, and existing users stay.';
    }

    /**
     * @param  list<string>  $pins
     */
    public function recordPins(AttendanceDevice $device, array $pins): void
    {
        $normalized = [];
        foreach ($pins as $pin) {
            $pin = $this->normalizePin((string) $pin);
            if ($pin !== null) {
                $normalized[] = $pin;
            }
        }

        $normalized = array_values(array_unique($normalized));
        if ($normalized === []) {
            return;
        }

        foreach ($normalized as $pin) {
            $this->rememberPin($device, $pin);
        }

        AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('kind', 'update_user')
            ->where('status', 'pending')
            ->whereIn('pin', $normalized)
            ->update(['status' => 'cancelled']);

        $queryOpen = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('kind', 'query_users')
            ->whereIn('status', ['sent', 'done'])
            ->where('created_at', '>=', now()->subMinutes(15))
            ->exists();

        if ($queryOpen) {
            $this->queueMissing($device, false);
        }
    }

    public function ack(AttendanceDevice $device, string $commandId, string $returnCode): bool
    {
        if ($commandId === '' || ! ctype_digit($commandId)) {
            return false;
        }

        $wire = (int) $commandId;
        if ($wire < 100000) {
            return false;
        }

        $command = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('id', $wire - 100000)
            ->first();

        if (! $command) {
            return false;
        }

        $ok = $returnCode === '' || $returnCode === '0';
        $command->status = $ok ? 'done' : 'failed';
        $command->acked_at = now();
        $command->save();

        if ($ok && $command->kind === 'query_users' && $this->knownPins($device) !== []) {
            $this->queueMissing($device, false);
        }

        if ($ok && $command->kind === 'update_user' && $command->pin) {
            $this->rememberPin($device, (string) $command->pin);
        }

        return true;
    }

    public function hasInFlight(AttendanceDevice $device): bool
    {
        if (! Schema::hasTable('attendance_device_commands')) {
            return false;
        }

        return AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('status', 'sent')
            ->where('sent_at', '>', now()->subMinutes(5))
            ->exists();
    }

    public function nextWireCommand(AttendanceDevice $device): ?string
    {
        if (! Schema::hasTable('attendance_device_commands') || $this->hasInFlight($device)) {
            return null;
        }

        $this->releaseEmptyPush($device);

        $candidates = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('status', 'pending')
            ->orderBy('id')
            ->limit(20)
            ->get();

        foreach ($candidates as $command) {
            if ($command->kind === 'update_user' && $this->pinIsKnown($device, (string) $command->pin)) {
                $command->status = 'cancelled';
                $command->save();

                continue;
            }

            if (! $this->isSafeBody((string) $command->body)) {
                $command->status = 'failed';
                $command->save();

                continue;
            }

            $command->status = 'sent';
            $command->sent_at = now();
            $command->save();

            return 'C:'.$command->wireId().':'.$command->body;
        }

        return null;
    }

    public function queueMissing(AttendanceDevice $device, bool $allowEmpty): int
    {
        $known = $this->knownPins($device);
        if ($known === [] && ! $allowEmpty) {
            return 0;
        }

        $knownSet = array_flip($known);
        $queued = 0;

        foreach ($this->branchEmployees($device) as $employee) {
            $pin = $this->devicePin($employee);
            if ($pin === null || isset($knownSet[$pin])) {
                continue;
            }

            if ($this->enqueueUpdate($device, $pin, $this->safeName($employee))) {
                $queued++;
            }
        }

        return $queued;
    }

    public function missingCount(AttendanceDevice $device): int
    {
        $knownSet = array_flip($this->knownPins($device));
        $missing = 0;

        foreach ($this->branchEmployees($device) as $employee) {
            $pin = $this->devicePin($employee);
            if ($pin !== null && ! isset($knownSet[$pin])) {
                $missing++;
            }
        }

        return $missing;
    }

    public function devicePin(Employee $employee): ?string
    {
        $candidates = [];

        if (Schema::hasColumn('employees', 'device_user_id') && filled($employee->device_user_id)) {
            $candidates[] = $employee->device_user_id;
        } else {
            if (Schema::hasColumn('employees', 'biometric_id')) {
                $candidates[] = $employee->biometric_id;
            }
            $candidates[] = $employee->pin;
            $candidates[] = $employee->employee_id;
        }

        foreach ($candidates as $value) {
            $pin = $this->normalizePin((string) $value);
            if ($pin !== null) {
                return $pin;
            }
        }

        return null;
    }

    public function updateUserCommand(string $pin, string $name): string
    {
        $pin = $this->normalizePin($pin);
        if ($pin === null) {
            return '';
        }

        return 'DATA UPDATE USERINFO PIN='.$pin
            ."\tName=".$this->sanitizeName($name)
            ."\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000100000000";
    }

    public function isSafeBody(string $body): bool
    {
        if (str_contains($body, "\n") || str_contains($body, "\r")) {
            return false;
        }

        if ($body === 'DATA QUERY USERINFO') {
            return true;
        }

        return (bool) preg_match(
            '/^DATA UPDATE USERINFO PIN=\d{1,9}\tName=[^\t]{1,24}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000100000000$/',
            $body
        );
    }

    /**
     * @return list<string>
     */
    public static function extractPins(string $body): array
    {
        $pins = [];
        foreach (preg_split('/\r\n|\n|\r/', $body) ?: [] as $line) {
            if (preg_match('/\bPIN=(\d{1,9})\b/', $line, $matches)) {
                $pins[] = $matches[1];
            }
        }

        return array_values(array_unique($pins));
    }

    public function normalizePin(string $pin): ?string
    {
        $pin = trim($pin);
        if (! preg_match('/^\d{1,9}$/', $pin)) {
            return null;
        }

        $pin = ltrim($pin, '0');

        return $pin === '' ? '0' : $pin;
    }

    /**
     * An empty user list can arrive after the command ack. Wait before adding anyone.
     */
    private function releaseEmptyPush(AttendanceDevice $device): void
    {
        $query = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('kind', 'query_users')
            ->where('status', 'done')
            ->where('allow_empty', true)
            ->where('acked_at', '<=', now()->subSeconds(30))
            ->where('acked_at', '>=', now()->subMinutes(15))
            ->orderByDesc('id')
            ->first();

        if (! $query || $this->knownPins($device) !== []) {
            return;
        }

        $already = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('kind', 'update_user')
            ->where('created_at', '>=', $query->created_at)
            ->exists();

        if ($already) {
            return;
        }

        $this->queueMissing($device, true);
    }

    private function ensureUserQuery(AttendanceDevice $device): void
    {
        $pending = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('kind', 'query_users')
            ->where(function ($query) {
                $query->where('status', 'pending')
                    ->orWhere(function ($sent) {
                        $sent->where('status', 'sent')
                            ->where('sent_at', '>', now()->subMinutes(5));
                    });
            })
            ->exists();

        if ($pending) {
            return;
        }

        AttendanceDeviceCommand::query()->create([
            'attendance_device_id' => $device->id,
            'kind' => 'query_users',
            'body' => 'DATA QUERY USERINFO',
            'status' => 'pending',
            'allow_empty' => false,
        ]);
    }

    private function enqueueUpdate(AttendanceDevice $device, string $pin, string $name): bool
    {
        $exists = AttendanceDeviceCommand::query()
            ->where('attendance_device_id', $device->id)
            ->where('kind', 'update_user')
            ->where('pin', $pin)
            ->whereIn('status', ['pending', 'sent', 'done'])
            ->exists();

        if ($exists || $this->pinIsKnown($device, $pin)) {
            return false;
        }

        $body = $this->updateUserCommand($pin, $name);
        if (! $this->isSafeBody($body)) {
            return false;
        }

        AttendanceDeviceCommand::query()->create([
            'attendance_device_id' => $device->id,
            'kind' => 'update_user',
            'pin' => $pin,
            'body' => $body,
            'status' => 'pending',
            'allow_empty' => false,
        ]);

        return true;
    }

    private function rememberPin(AttendanceDevice $device, string $pin): void
    {
        $pin = $this->normalizePin($pin);
        if ($pin === null) {
            return;
        }

        AttendanceDeviceUser::query()->updateOrCreate(
            [
                'attendance_device_id' => $device->id,
                'pin' => $pin,
            ],
            ['last_seen_at' => now()]
        );
    }

    private function pinIsKnown(AttendanceDevice $device, string $pin): bool
    {
        $pin = $this->normalizePin($pin);
        if ($pin === null) {
            return false;
        }

        return AttendanceDeviceUser::query()
            ->where('attendance_device_id', $device->id)
            ->where('pin', $pin)
            ->exists();
    }

    /**
     * @return list<string>
     */
    private function knownPins(AttendanceDevice $device): array
    {
        return AttendanceDeviceUser::query()
            ->where('attendance_device_id', $device->id)
            ->pluck('pin')
            ->map(fn ($pin) => (string) $pin)
            ->all();
    }

    /**
     * @return \Illuminate\Support\Collection<int, Employee>
     */
    private function branchEmployees(AttendanceDevice $device)
    {
        if (! $device->branch_id) {
            return collect();
        }

        $columns = ['id', 'name_en', 'pin', 'employee_id', 'current_branch_id', 'status'];
        if (Schema::hasColumn('employees', 'biometric_id')) {
            $columns[] = 'biometric_id';
        }
        if (Schema::hasColumn('employees', 'device_user_id')) {
            $columns[] = 'device_user_id';
        }

        return Employee::query()
            ->where('current_branch_id', $device->branch_id)
            ->where('status', 'active')
            ->get($columns);
    }

    private function safeName(Employee $employee): string
    {
        $name = trim((string) ($employee->name_en ?: $employee->employee_id));

        return $this->sanitizeName($name);
    }

    private function sanitizeName(string $name): string
    {
        $name = trim((string) preg_replace('/[\t\r\n]+/', ' ', $name));
        if ($name === '') {
            $name = 'User';
        }

        return mb_substr($name, 0, 24);
    }
}
