<?php

namespace App\Support;

use App\Models\Employee;

/**
 * Matches device user names to HRM employees (for text pins like RAISE-1, SMART-1).
 */
final class EmployeeNameMatcher
{
    public static function normalize(string $name): string
    {
        $name = mb_strtolower(trim($name));
        $name = preg_replace('/[.,\-]+/u', ' ', $name);
        $name = preg_replace('/\s+/u', ' ', $name);

        return trim($name);
    }

    public static function score(string $deviceName, string $hrmName): int
    {
        $device = self::normalize($deviceName);
        $hrm = self::normalize($hrmName);

        if ($device === '' || $hrm === '') {
            return 0;
        }

        if ($device === $hrm) {
            return 100;
        }

        if (str_starts_with($device, $hrm) && ($device === $hrm || $device[strlen($hrm)] === ' ')) {
            $words = array_filter(explode(' ', $hrm), fn ($w) => strlen($w) >= 3);
            if (count($words) >= 2 || (count($words) === 1 && strlen($words[array_key_first($words)]) >= 6)) {
                return 95;
            }
        }

        similar_text($device, $hrm, $percent);

        return $percent >= 90 ? (int) round($percent) : 0;
    }

    public static function displayName(Employee $employee): string
    {
        return trim((string) ($employee->name_en ?? $employee->full_name_en ?? ''));
    }

    public static function hasTextPin(Employee $employee): bool
    {
        foreach ([$employee->pin, $employee->employee_id] as $value) {
            $value = trim((string) $value);
            if ($value !== '' && ! preg_match('/^\d+$/', $value)) {
                return true;
            }
        }

        return false;
    }

    public static function findByDeviceName(string $deviceName, ?int $branchId = null): ?Employee
    {
        $deviceName = trim($deviceName);
        if ($deviceName === '') {
            return null;
        }

        $query = Employee::query()->where('status', 'active');
        if ($branchId !== null) {
            $query->where(function ($sub) use ($branchId) {
                $sub->where('current_branch_id', $branchId);
                if (\Illuminate\Support\Facades\Schema::hasTable('project_attendance_branches')) {
                    $sub->orWhereExists(function ($p) use ($branchId) {
                        $p->select(\Illuminate\Support\Facades\DB::raw(1))
                            ->from('project_attendance_branches')
                            ->whereColumn('project_attendance_branches.project_id', 'employees.project_id')
                            ->where('project_attendance_branches.branch_id', $branchId);
                    });
                }
                if (\Illuminate\Support\Facades\Schema::hasTable('employee_attendance_branches')) {
                    $sub->orWhereExists(function ($e) use ($branchId) {
                        $e->select(\Illuminate\Support\Facades\DB::raw(1))
                            ->from('employee_attendance_branches')
                            ->whereColumn('employee_attendance_branches.employee_id', 'employees.id')
                            ->where('employee_attendance_branches.branch_id', $branchId);
                    });
                }
            });
        }

        $best = null;
        $bestScore = 0;

        foreach ($query->get() as $employee) {
            $hrmName = self::displayName($employee);
            $score = self::score($deviceName, $hrmName);
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $employee;
            }
        }

        if ($bestScore < 90) {
            return null;
        }

        return $best;
    }

    public static function findTextPinEmployeeByDeviceName(string $deviceName, ?int $branchId = null): ?Employee
    {
        $deviceName = trim($deviceName);
        if ($deviceName === '') {
            return null;
        }

        $query = Employee::query()->where('status', 'active');
        if ($branchId !== null) {
            $query->where(function ($sub) use ($branchId) {
                $sub->where('current_branch_id', $branchId);
                if (\Illuminate\Support\Facades\Schema::hasTable('project_attendance_branches')) {
                    $sub->orWhereExists(function ($p) use ($branchId) {
                        $p->select(\Illuminate\Support\Facades\DB::raw(1))
                            ->from('project_attendance_branches')
                            ->whereColumn('project_attendance_branches.project_id', 'employees.project_id')
                            ->where('project_attendance_branches.branch_id', $branchId);
                    });
                }
                if (\Illuminate\Support\Facades\Schema::hasTable('employee_attendance_branches')) {
                    $sub->orWhereExists(function ($e) use ($branchId) {
                        $e->select(\Illuminate\Support\Facades\DB::raw(1))
                            ->from('employee_attendance_branches')
                            ->whereColumn('employee_attendance_branches.employee_id', 'employees.id')
                            ->where('employee_attendance_branches.branch_id', $branchId);
                    });
                }
            });
        }

        $best = null;
        $bestScore = 0;

        foreach ($query->get()->filter(fn (Employee $employee) => self::hasTextPin($employee)) as $employee) {
            $score = self::score($deviceName, self::displayName($employee));
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $employee;
            }
        }

        return $bestScore >= 90 ? $best : null;
    }
}
