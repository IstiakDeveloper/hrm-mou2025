<?php

/**
 * Default system roles and their permission assignments.
 * Use permissions:sync-default-roles (or Admin → Roles → Sync Default Roles) to apply.
 * Default role permissions cannot be edited in the UI — change this file and re-sync.
 * Section Access (roles.blocked_sections) is managed in Admin → Roles and is NOT reset by sync.
 * Optional blocked_sections keys below are documentation / seeder hints only.
 * Custom roles are managed in Admin → Roles.
 *
 * Super Admin: use '*' to receive every key from config/permissions.php (including new modules after deploy).
 */
return [
    'roles' => [
        'Super Admin' => [
            'description' => 'Full system access including all destructive actions (only this role should hold *.delete and admin/roles/users management).',
            'permissions' => '*',
            'blocked_sections' => [],
        ],
        'HR Admin' => [
            'description' => 'Full operational access across all ERP modules (all sections). Cannot delete records or manage system users/roles.',
            'permissions' => '*-no-delete-no-admin',
        ],
        'Accountant' => [
            'description' => 'Accounts modules: Employee Loan, Staff Fund, Fixed Asset, and Inventory. Cannot delete records.',
            'permissions' => 'sections:employee-loan,staff-fund,fixed-asset,inventory',
            'blocked_sections' => [
                'human-resources',
                'attendance-movement',
                'leave',
                'payroll',
                'store',
                'recruitment',
                'training',
                'administration',
            ],
        ],
        'Administrator' => [
            'description' => 'Read-only oversight (no user/role admin, no deletes, no master-data edits).',
            'permissions' => [
                'employees.view',
                'branches.view', 'zones.view', 'regional-offices.view',
                'departments.view', 'designations.view',
                'attendance.view',
                'leave-types.view', 'leave-balances.view', 'leave-applications.view',
                'movements.view', 'transfers.view', 'promotions.view', 'demotions.view', 'confirmations.view', 'separations.view',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
                'fixed-assets.view',
                'inventory.view',
            ],
        ],
        'HR Manager' => [
            'description' => 'HR operations: employees and leave/attendance workflows; no destructive deletes (those stay with Super Admin).',
            'permissions' => [
                'employees.view', 'employees.create', 'employees.edit', 'employees.admin',
                'branches.view', 'zones.view', 'regional-offices.view',
                'departments.view', 'designations.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leave-types.view', 'leave-types.create', 'leave-types.edit',
                'leave-balances.view', 'leave-balances.create', 'leave-balances.edit', 'leave-balances.admin',
                'leave-applications.view', 'leave-applications.create', 'leave-applications.edit', 'leave-applications.cancel', 'leave-applications.approve',
                'movements.view', 'movements.create', 'movements.edit', 'movements.complete', 'movements.approve',
                'transfers.view', 'transfers.create', 'transfers.approve',
                'promotions.view', 'promotions.create', 'promotions.edit', 'promotions.approve',
                'demotions.view', 'demotions.create', 'demotions.edit', 'demotions.approve',
                'confirmations.view', 'confirmations.create', 'confirmations.edit', 'confirmations.approve',
                'separations.view', 'separations.create', 'separations.edit', 'separations.approve',
                'holidays.view', 'holidays.create', 'holidays.edit',
                'profile.view', 'profile.edit',
                'reports.view', 'reports.export',
            ],
        ],
        'Executive Director' => [
            'description' => 'Head-office organogram apex: full visibility and approvals; no master-structure or user/role edits.',
            'permissions' => [
                'organogram.executive_director',
                'employees.view',
                'branches.view', 'zones.view', 'regional-offices.view',
                'departments.view', 'designations.view',
                'attendance.view',
                'leave-types.view', 'leave-balances.view',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'transfers.view', 'transfers.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view', 'reports.export',
            ],
        ],
        'Director (Microfinance)' => [
            'description' => 'All branch microfinance staff line: manage records and approvals across branches (scope enforced in app by designation/assignment).',
            'permissions' => [
                'organogram.microfinance_director',
                'employees.view', 'employees.create', 'employees.edit',
                'branches.view', 'zones.view', 'regional-offices.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'transfers.view', 'transfers.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view', 'reports.export',
            ],
        ],
        'Assistant Director (Microfinance)' => [
            'description' => 'Supports Director (Microfinance): same operational band without organogram apex flags.',
            'permissions' => [
                'organogram.microfinance_assistant_director',
                'employees.view', 'employees.create', 'employees.edit',
                'branches.view', 'zones.view', 'regional-offices.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'transfers.view', 'transfers.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ],
        ],
        'Zonal Manager' => [
            'description' => 'Zone-level line authority over regional offices and branches in the zone (data scope by assignment).',
            'permissions' => [
                'organogram.zonal_manager',
                'employees.view',
                'branches.view', 'zones.view', 'regional-offices.view',
                'attendance.view',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'transfers.view',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ],
        ],
        'Regional Manager' => [
            'description' => 'Regional office line authority over branches under that office.',
            'permissions' => [
                'organogram.regional_manager',
                'employees.view',
                'branches.view', 'regional-offices.view',
                'attendance.view',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'transfers.view',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ],
        ],
        'Branch Manager' => [
            'description' => 'Single-branch operations and first-line approvals for staff at own branch.',
            'permissions' => [
                'branch_manager',
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'transfers.view',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
                'fixed-assets.view', 'fixed-assets.create', 'fixed-assets.edit',
                'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            ],
        ],
        'Branch Account' => [
            'description' => 'Dedicated branch terminal account. PIN-only sign-in. Features enabled step by step.',
            'permissions' => [
                'attendance.view',
                'inventory.view',
                'inventory.create',
            ],
        ],
        'Department Head' => [
            'description' => 'Head office only: oversee own department (employees, attendance, leave, movement). Assign with Employee role for self-service + team view.',
            'permissions' => [
                'department_head',
                'employees.view',
                'attendance.view',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ],
            'blocked_sections' => ['employee-loan', 'staff-fund', 'payroll'],
        ],
        'Team Leader' => [
            'description' => 'First-level approvals within a team (subset of department/branch).',
            'permissions' => [
                'employees.view',
                'attendance.view',
                'leave-applications.view', 'leave-applications.approve',
                'movements.view', 'movements.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
            ],
        ],
        'Employee' => [
            'description' => 'Regular employee with self-service access',
            'permissions' => [
                'attendance.view', 'attendance.create',
                'leave-applications.view', 'leave-applications.create', 'leave-applications.cancel',
                'movements.view', 'movements.create', 'movements.complete',
                'holidays.view',
                'profile.view', 'profile.edit',
            ],
        ],
        'Leave Manager' => [
            'description' => 'Leave desk: applications and balances; no org master deletes.',
            'permissions' => [
                'employees.view',
                'leave-types.view',
                'leave-balances.view', 'leave-balances.edit',
                'leave-applications.view', 'leave-applications.create', 'leave-applications.edit', 'leave-applications.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ],
        ],
        'HR Assistant' => [
            'description' => 'HR processing: data entry and applications; no approvals unless combined with another role.',
            'permissions' => [
                'employees.view', 'employees.admin',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leave-types.view', 'leave-balances.view',
                'leave-applications.view', 'leave-applications.create', 'leave-applications.cancel',
                'movements.view', 'movements.create',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ],
        ],
        'Attendance Manager' => [
            'description' => 'Attendance maintenance and device sync; record deletes remain Super Admin only.',
            'permissions' => [
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.sync',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ],
        ],
    ],
];
