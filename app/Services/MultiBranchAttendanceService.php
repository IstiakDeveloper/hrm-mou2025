<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceBranch;
use App\Models\Project;
use App\Models\ProjectAttendanceBranch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MultiBranchAttendanceService
{
    /**
     * Get all allowed branch IDs for an employee (their home branch + project branches + direct branches).
     *
     * @return list<int>
     */
    public function getAllowedBranchIdsForEmployee(Employee $employee): array
    {
        $branchIds = [];

        $homeBranchId = (int) ($employee->current_branch_id ?? $employee->branch_id ?? 0);
        if ($homeBranchId > 0) {
            $branchIds[] = $homeBranchId;
        }

        if (Schema::hasTable('project_attendance_branches') && $employee->project_id) {
            $projectBranches = ProjectAttendanceBranch::query()
                ->where('project_id', $employee->project_id)
                ->pluck('branch_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $branchIds = array_merge($branchIds, $projectBranches);
        }

        if (Schema::hasTable('employee_attendance_branches')) {
            $employeeBranches = EmployeeAttendanceBranch::query()
                ->where('employee_id', $employee->id)
                ->pluck('branch_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $branchIds = array_merge($branchIds, $employeeBranches);
        }

        return array_values(array_unique(array_filter($branchIds, fn ($id) => $id > 0)));
    }

    /**
     * Determine if an employee is approved to attend at a specific branch.
     */
    public function isEmployeeAllowedForBranch(Employee|int $employee, int $branchId): bool
    {
        if ($branchId <= 0) {
            return false;
        }

        $emp = is_int($employee) ? Employee::query()->find($employee) : $employee;
        if (! $emp) {
            return false;
        }

        $homeBranchId = (int) ($emp->current_branch_id ?? $emp->branch_id ?? 0);
        if ($homeBranchId === $branchId) {
            return true;
        }

        if (Schema::hasTable('project_attendance_branches') && $emp->project_id) {
            $hasProjectBranch = ProjectAttendanceBranch::query()
                ->where('project_id', $emp->project_id)
                ->where('branch_id', $branchId)
                ->exists();

            if ($hasProjectBranch) {
                return true;
            }
        }

        if (Schema::hasTable('employee_attendance_branches')) {
            $hasEmployeeBranch = EmployeeAttendanceBranch::query()
                ->where('employee_id', $emp->id)
                ->where('branch_id', $branchId)
                ->exists();

            if ($hasEmployeeBranch) {
                return true;
            }
        }

        return false;
    }

    /**
     * Query active employees eligible for attendance at a given branch (home branch + multi-branch approvals).
     */
    public function getEligibleEmployeesQueryForBranch(int $branchId): Builder
    {
        $hasProjectTable = Schema::hasTable('project_attendance_branches');
        $hasEmployeeTable = Schema::hasTable('employee_attendance_branches');

        $query = Employee::query()->where('status', 'active');

        if (! $hasProjectTable && ! $hasEmployeeTable) {
            return $query->where('current_branch_id', $branchId);
        }

        return $query->where(function (Builder $q) use ($branchId, $hasProjectTable, $hasEmployeeTable) {
            $q->where('current_branch_id', $branchId);

            if ($hasProjectTable) {
                $q->orWhereExists(function ($sub) use ($branchId) {
                    $sub->select(DB::raw(1))
                        ->from('project_attendance_branches')
                        ->whereColumn('project_attendance_branches.project_id', 'employees.project_id')
                        ->where('project_attendance_branches.branch_id', $branchId);
                });
            }

            if ($hasEmployeeTable) {
                $q->orWhereExists(function ($sub) use ($branchId) {
                    $sub->select(DB::raw(1))
                        ->from('employee_attendance_branches')
                        ->whereColumn('employee_attendance_branches.employee_id', 'employees.id')
                        ->where('employee_attendance_branches.branch_id', $branchId);
                });
            }
        });
    }

    /**
     * Sync approved branches for a project.
     *
     * @param  list<int>  $branchIds
     */
    public function syncProjectBranches(int $projectId, array $branchIds): void
    {
        if (! Schema::hasTable('project_attendance_branches')) {
            return;
        }

        $branchIds = array_values(array_unique(array_filter(array_map('intval', $branchIds), fn ($id) => $id > 0)));

        DB::transaction(function () use ($projectId, $branchIds) {
            ProjectAttendanceBranch::where('project_id', $projectId)->delete();

            $records = array_map(fn ($branchId) => [
                'project_id' => $projectId,
                'branch_id' => $branchId,
                'created_at' => now(),
                'updated_at' => now(),
            ], $branchIds);

            if (! empty($records)) {
                ProjectAttendanceBranch::insert($records);
            }
        });
    }

    /**
     * Remove all multi-branch assignments for a project.
     */
    public function removeProjectBranches(int $projectId): void
    {
        if (! Schema::hasTable('project_attendance_branches')) {
            return;
        }

        ProjectAttendanceBranch::where('project_id', $projectId)->delete();
    }

    /**
     * Sync approved extra branches for an employee.
     *
     * @param  list<int>  $branchIds
     */
    public function syncEmployeeBranches(int $employeeId, array $branchIds): void
    {
        if (! Schema::hasTable('employee_attendance_branches')) {
            return;
        }

        $branchIds = array_values(array_unique(array_filter(array_map('intval', $branchIds), fn ($id) => $id > 0)));

        DB::transaction(function () use ($employeeId, $branchIds) {
            EmployeeAttendanceBranch::where('employee_id', $employeeId)->delete();

            $records = array_map(fn ($branchId) => [
                'employee_id' => $employeeId,
                'branch_id' => $branchId,
                'created_at' => now(),
                'updated_at' => now(),
            ], $branchIds);

            if (! empty($records)) {
                EmployeeAttendanceBranch::insert($records);
            }
        });
    }

    /**
     * Remove all multi-branch assignments for an employee.
     */
    public function removeEmployeeBranches(int $employeeId): void
    {
        if (! Schema::hasTable('employee_attendance_branches')) {
            return;
        }

        EmployeeAttendanceBranch::where('employee_id', $employeeId)->delete();
    }

    /**
     * Summary list of projects and their approved branches.
     *
     * @return list<array<string, mixed>>
     */
    public function getProjectPermissionsSummary(): array
    {
        if (! Schema::hasTable('project_attendance_branches')) {
            return [];
        }

        $projects = Project::query()
            ->with(['attendanceBranches' => fn ($q) => $q->orderBy('name')])
            ->whereHas('attendanceBranches')
            ->orderBy('name')
            ->get();

        return $projects->map(function (Project $project) {
            $staffCount = Employee::query()
                ->where('project_id', $project->id)
                ->where('status', 'active')
                ->count();

            return [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'project_code' => $project->code,
                'staff_count' => $staffCount,
                'branches' => $project->attendanceBranches->map(fn (Branch $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'branch_code' => $b->branch_code,
                ])->values()->all(),
            ];
        })->values()->all();
    }

    /**
     * Summary list of employees with directly assigned extra branches.
     *
     * @return list<array<string, mixed>>
     */
    public function getEmployeePermissionsSummary(): array
    {
        if (! Schema::hasTable('employee_attendance_branches')) {
            return [];
        }

        $employees = Employee::query()
            ->with([
                'attendanceBranches' => fn ($q) => $q->orderBy('name'),
                'branch:id,name,branch_code',
                'designation:id,name',
                'project:id,name',
            ])
            ->whereHas('attendanceBranches')
            ->orderBy('name_en')
            ->get();

        return $employees->map(function (Employee $employee) {
            return [
                'employee_id' => $employee->id,
                'employee_code' => $employee->employee_id,
                'pin' => $employee->pin,
                'name' => trim((string) ($employee->name_en ?: $employee->name_bn ?: $employee->employee_id)),
                'designation' => $employee->designation?->name,
                'primary_branch' => $employee->branch ? [
                    'id' => $employee->branch->id,
                    'name' => $employee->branch->name,
                ] : null,
                'project_name' => $employee->project?->name,
                'branches' => $employee->attendanceBranches->map(fn (Branch $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'branch_code' => $b->branch_code,
                ])->values()->all(),
            ];
        })->values()->all();
    }
}
