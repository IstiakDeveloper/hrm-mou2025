<?php

namespace App\Observers;

use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Services\EmployeeAssignmentHistoryService;

class EmployeeAssignmentObserver
{
    public function __construct(
        protected EmployeeAssignmentHistoryService $assignmentHistory,
    ) {}

    public function created(Employee $employee): void
    {
        if ($this->assignmentHistory->isRecordingSuppressed()) {
            return;
        }

        $this->assignmentHistory->recordFromEmployee(
            $employee,
            $employee->joining_date,
            EmployeeAssignmentHistory::SOURCE_INITIAL,
            null,
            auth()->id(),
            'Employee created',
            skipIfUnchanged: false,
        );
    }

    public function updated(Employee $employee): void
    {
        if ($this->assignmentHistory->isRecordingSuppressed()) {
            return;
        }

        if (! $this->assignmentHistory->employeeHasTrackedChanges($employee) && empty($employee->assignmentHistoryContext)) {
            return;
        }

        $sourceType = EmployeeAssignmentHistory::SOURCE_EMPLOYEE_UPDATE;
        if (is_array($employee->assignmentHistoryContext) && ! empty($employee->assignmentHistoryContext['source_type'])) {
            $sourceType = (string) $employee->assignmentHistoryContext['source_type'];
        }

        $this->assignmentHistory->recordFromEmployee(
            $employee,
            null,
            $sourceType,
            null,
            auth()->id(),
            null,
            skipIfUnchanged: true,
        );
    }
}
