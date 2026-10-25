<?php

namespace App\Support;

use App\Models\Employee;
use Illuminate\Support\Facades\Schema;

/**
 * Resolves device attendance user IDs to HRM employees.
 * Numeric device IDs (9900) map to text HRM pins (RAISE-1) via device_user_id or name match.
 */
final class ZktecoEmployeeResolver
{
    /** @var array<string, Employee> */
    private array $deviceIdIndex = [];

    public function __construct(array $userData = [], ?int $branchId = null)
    {
        $this->indexUserData($userData, $branchId);
    }

    public function resolve(string $devicePin, ?int $branchId = null): ?Employee
    {
        $devicePin = trim($devicePin);
        if ($devicePin === '') {
            return null;
        }

        $employee = EmployeePinLookup::findEmployee($devicePin);
        if ($employee) {
            return $employee;
        }

        if (isset($this->deviceIdIndex[$devicePin])) {
            return $this->deviceIdIndex[$devicePin];
        }

        if (Schema::hasColumn('employees', 'device_user_id')) {
            $employee = Employee::query()
                ->where('device_user_id', $devicePin)
                ->where('status', 'active')
                ->when($branchId !== null, function ($q) use ($branchId) {
                    $q->where(function ($sub) use ($branchId) {
                        $sub->where('current_branch_id', $branchId);
                        if (Schema::hasTable('project_attendance_branches')) {
                            $sub->orWhereExists(function ($p) use ($branchId) {
                                $p->select(\Illuminate\Support\Facades\DB::raw(1))
                                    ->from('project_attendance_branches')
                                    ->whereColumn('project_attendance_branches.project_id', 'employees.project_id')
                                    ->where('project_attendance_branches.branch_id', $branchId);
                            });
                        }
                        if (Schema::hasTable('employee_attendance_branches')) {
                            $sub->orWhereExists(function ($e) use ($branchId) {
                                $e->select(\Illuminate\Support\Facades\DB::raw(1))
                                    ->from('employee_attendance_branches')
                                    ->whereColumn('employee_attendance_branches.employee_id', 'employees.id')
                                    ->where('employee_attendance_branches.branch_id', $branchId);
                            });
                        }
                    });
                })
                ->first();

            if ($employee) {
                return $employee;
            }
        }

        return null;
    }

    private function indexUserData(array $userData, ?int $branchId): void
    {
        foreach ($userData as $user) {
            if (! is_array($user)) {
                continue;
            }

            $deviceId = trim((string) ($user['id'] ?? $user['userid'] ?? ''));
            $deviceName = trim((string) ($user['name'] ?? ''));

            if ($deviceId === '' || $deviceName === '' || ! preg_match('/^\d+$/', $deviceId)) {
                continue;
            }

            if (EmployeePinLookup::findEmployee($deviceId)) {
                continue;
            }

            $employee = EmployeeNameMatcher::findTextPinEmployeeByDeviceName($deviceName, $branchId)
                ?? EmployeeNameMatcher::findByDeviceName($deviceName, $branchId);

            if (! $employee) {
                continue;
            }

            $this->deviceIdIndex[$deviceId] = $employee;
            $this->persistDeviceUserId($employee, $deviceId);
        }
    }

    private function persistDeviceUserId(Employee $employee, string $deviceId): void
    {
        if (! Schema::hasColumn('employees', 'device_user_id')) {
            return;
        }

        if ($employee->device_user_id === $deviceId) {
            return;
        }

        $employee->device_user_id = $deviceId;
        $employee->save();
    }
}
