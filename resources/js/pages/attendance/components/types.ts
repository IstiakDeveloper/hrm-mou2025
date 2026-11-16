export type Status =
    | 'present'
    | 'late'
    | 'half_day'
    | 'absent'
    | 'leave'
    | 'on_duty'
    | 'holiday'
    | 'weekend';

export interface Branch {
    id: number;
    name: string;
}

export interface Department {
    id: number;
    name: string;
}

export interface MovementInfo {
    id: number;
    movement_type: string;
    purpose: string;
    destination: string;
    status: string;
    from_time: string | null;
    to_time: string | null;
    actual_return_time: string | null;
}

export interface EmployeeRow {
    id: number;
    employee_id: string;
    name: string;
    department: string | null;
    designation: string | null;
    status: Status;
    check_in: string | null;
    check_out: string | null;
    leave_type: string | null;
    movements?: MovementInfo[];
    has_movement?: boolean;
}

export interface BranchSummary {
    id: number;
    name: string;
    counts: Record<Status, number>;
    employeesByStatus: Record<Status, EmployeeRow[]>;
    movementCount: number;
    employeesWithMovement: EmployeeRow[];
}

export type PortalStats = {
    presentOnly: number;
    movementCount: number;
    absent: number;
    leave: number;
    workingTotal: number;
    present: number;
};
