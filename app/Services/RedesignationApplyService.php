<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\Redesignation;
use App\Models\RedesignationHistory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RedesignationApplyService
{
    public function apply(Redesignation $redesignation, ?int $actorUserId): void
    {
        $redesignation->loadMissing(['employee.designation', 'employee.branch', 'employee.user']);
        $employee = $redesignation->employee;

        $employee->designation_id = $redesignation->to_designation_id;
        $employee->last_designation_id = $redesignation->to_designation_id;

        if ((int) $employee->department_id !== (int) $redesignation->to_department_id) {
            $employee->department_id = $redesignation->to_department_id;
        }

        app(EmployeeAssignmentHistoryService::class)->queueContext($employee, [
            'effective_from' => $redesignation->effective_date
                ? Carbon::parse($redesignation->effective_date)->toDateString()
                : now()->toDateString(),
            'source_type' => EmployeeAssignmentHistory::SOURCE_REDESIGNATION,
            'source_id' => $redesignation->id,
            'created_by' => $actorUserId,
            'notes' => 'Re designation',
        ]);

        $employee->save();

        $history = RedesignationHistory::query()->firstOrNew([
            'redesignation_id' => $redesignation->id,
        ]);
        $history->fill([
            'employee_id' => $employee->id,
            'from_department_id' => $redesignation->from_department_id,
            'to_department_id' => $redesignation->to_department_id,
            'from_designation_id' => $redesignation->from_designation_id,
            'to_designation_id' => $redesignation->to_designation_id,
            'redesignation_date' => $redesignation->effective_date
                ? Carbon::parse($redesignation->effective_date)->toDateString()
                : now()->toDateString(),
        ]);
        if (! $history->exists) {
            $history->created_by = $actorUserId;
        }
        $history->save();

        app(EmployeeAssignmentHistoryService::class)->rebuildEmployeeHistory($employee);

        $employeeId = $employee->id;
        DB::afterCommit(function () use ($employeeId) {
            $freshEmployee = Employee::query()->with(['designation', 'branch', 'user'])->find($employeeId);
            if (! $freshEmployee) {
                return;
            }

            $misLoanSync = app(MisLoanFieldOfficerSyncService::class);
            if ($misLoanSync->isSyncableDesignation($freshEmployee->designation?->name)) {
                $misLoanSync->pushEmployee($freshEmployee);
            }
        });
    }
}
