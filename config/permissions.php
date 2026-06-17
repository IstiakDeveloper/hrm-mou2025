<?php

/**
 * Single source of truth for permission keys (catalog).
 * Role assignments live in config/default_roles.php and the roles.permissions column.
 */
return [
    'categories' => [
        'admin' => [
            'label' => 'System Administration',
            'description' => 'Core system administration permissions',
            'color' => 'red',
        ],
        'users' => [
            'label' => 'User Management',
            'description' => 'User account and authentication management',
            'color' => 'purple',
        ],
        'roles' => [
            'label' => 'Role & Permission Management',
            'description' => 'Role and permission system management',
            'color' => 'indigo',
        ],
        'employees' => [
            'label' => 'Employee Management',
            'description' => 'Employee records and information management',
            'color' => 'blue',
        ],
        'organization' => [
            'label' => 'Organization Setup',
            'description' => 'Branch, department, and designation management',
            'color' => 'gray',
        ],
        'attendance' => [
            'label' => 'Attendance Management',
            'description' => 'Attendance tracking and device management',
            'color' => 'green',
        ],
        'leave' => [
            'label' => 'Leave Management',
            'description' => 'Leave types, balances, and application management',
            'color' => 'yellow',
        ],
        'movement' => [
            'label' => 'Movement & Transfer',
            'description' => 'Employee movement and transfer management',
            'color' => 'orange',
        ],
        'holidays' => [
            'label' => 'Holiday Management',
            'description' => 'Public holidays and calendar management',
            'color' => 'pink',
        ],
        'reports' => [
            'label' => 'Reports & Analytics',
            'description' => 'Report generation and data export',
            'color' => 'teal',
        ],
        'organogram' => [
            'label' => 'Organogram & line authority',
            'description' => 'Scope markers for hierarchy (approval chains, reporting lines); combine with resource permissions',
            'color' => 'slate',
        ],
        'profile' => [
            'label' => 'Own profile',
            'description' => 'Self-service profile pages',
            'color' => 'cyan',
        ],
        'payroll' => [
            'label' => 'Payroll',
            'description' => 'Salary structures, processing, bonus, and payroll reports',
            'color' => 'violet',
        ],
        'fixed-assets' => [
            'label' => 'Fixed Asset Management',
            'description' => 'Asset register, categories, and branch transfers',
            'color' => 'amber',
        ],
    ],

    'permissions' => [
        'admin.access' => ['label' => 'System Administration Access', 'category' => 'admin'],

        'users.view' => ['label' => 'View Users', 'category' => 'users'],
        'users.create' => ['label' => 'Create Users', 'category' => 'users'],
        'users.edit' => ['label' => 'Edit Users', 'category' => 'users'],
        'users.delete' => ['label' => 'Delete Users', 'category' => 'users'],

        'sessions.view' => ['label' => 'View Active Login Sessions', 'category' => 'users'],
        'sessions.revoke' => ['label' => 'Force Logout Active Sessions', 'category' => 'users'],

        'roles.view' => ['label' => 'View Roles', 'category' => 'roles'],
        'roles.create' => ['label' => 'Create Roles', 'category' => 'roles'],
        'roles.edit' => ['label' => 'Edit Roles', 'category' => 'roles'],
        'roles.delete' => ['label' => 'Delete Roles', 'category' => 'roles'],

        'employees.view' => ['label' => 'View Employees', 'category' => 'employees'],
        'employees.create' => ['label' => 'Create Employees', 'category' => 'employees'],
        'employees.edit' => ['label' => 'Edit Employees', 'category' => 'employees'],
        'employees.delete' => ['label' => 'Delete Employees', 'category' => 'employees'],
        'employees.admin' => ['label' => 'HR Admin Dashboard & Advanced Employee Operations', 'category' => 'employees'],

        'branches.view' => ['label' => 'View Branches', 'category' => 'organization'],
        'branches.create' => ['label' => 'Create Branches', 'category' => 'organization'],
        'branches.edit' => ['label' => 'Edit Branches', 'category' => 'organization'],
        'branches.delete' => ['label' => 'Delete Branches', 'category' => 'organization'],
        'zones.view' => ['label' => 'View Zones', 'category' => 'organization'],
        'zones.create' => ['label' => 'Create Zones', 'category' => 'organization'],
        'zones.edit' => ['label' => 'Edit Zones', 'category' => 'organization'],
        'zones.delete' => ['label' => 'Delete Zones', 'category' => 'organization'],
        'regional-offices.view' => ['label' => 'View Regional Offices', 'category' => 'organization'],
        'regional-offices.create' => ['label' => 'Create Regional Offices', 'category' => 'organization'],
        'regional-offices.edit' => ['label' => 'Edit Regional Offices', 'category' => 'organization'],
        'regional-offices.delete' => ['label' => 'Delete Regional Offices', 'category' => 'organization'],
        'departments.view' => ['label' => 'View Departments', 'category' => 'organization'],
        'departments.create' => ['label' => 'Create Departments', 'category' => 'organization'],
        'departments.edit' => ['label' => 'Edit Departments', 'category' => 'organization'],
        'departments.delete' => ['label' => 'Delete Departments', 'category' => 'organization'],
        'designations.view' => ['label' => 'View Designations', 'category' => 'organization'],
        'designations.create' => ['label' => 'Create Designations', 'category' => 'organization'],
        'designations.edit' => ['label' => 'Edit Designations', 'category' => 'organization'],
        'designations.delete' => ['label' => 'Delete Designations', 'category' => 'organization'],

        'attendance.view' => ['label' => 'View Attendance', 'category' => 'attendance'],
        'attendance.create' => ['label' => 'Create Attendance Records', 'category' => 'attendance'],
        'attendance.edit' => ['label' => 'Edit Attendance Records', 'category' => 'attendance'],
        'attendance.delete' => ['label' => 'Delete Attendance Records', 'category' => 'attendance'],
        'attendance.sync' => ['label' => 'Sync Attendance Devices', 'category' => 'attendance'],
        'attendance.admin' => ['label' => 'Advanced Attendance Management', 'category' => 'attendance'],

        'leave-types.view' => ['label' => 'View Leave Types', 'category' => 'leave'],
        'leave-types.create' => ['label' => 'Create Leave Types', 'category' => 'leave'],
        'leave-types.edit' => ['label' => 'Edit Leave Types', 'category' => 'leave'],
        'leave-types.delete' => ['label' => 'Delete Leave Types', 'category' => 'leave'],
        'leave-balances.view' => ['label' => 'View Leave Balances', 'category' => 'leave'],
        'leave-balances.create' => ['label' => 'Create Leave Balances', 'category' => 'leave'],
        'leave-balances.edit' => ['label' => 'Edit Leave Balances', 'category' => 'leave'],
        'leave-balances.delete' => ['label' => 'Delete Leave Balances', 'category' => 'leave'],
        'leave-balances.admin' => ['label' => 'Advanced Leave Balance Management', 'category' => 'leave'],
        'leave-applications.view' => ['label' => 'View Leave Applications', 'category' => 'leave'],
        'leave-applications.create' => ['label' => 'Create Leave Applications', 'category' => 'leave'],
        'leave-applications.edit' => ['label' => 'Edit Leave Applications', 'category' => 'leave'],
        'leave-applications.cancel' => ['label' => 'Cancel Leave Applications', 'category' => 'leave'],
        'leave-applications.approve' => ['label' => 'Approve/Reject Leave Applications', 'category' => 'leave'],
        'leave-applications.delete' => ['label' => 'Delete Leave Applications (admin)', 'category' => 'leave'],

        'movements.view' => ['label' => 'View Movements', 'category' => 'movement'],
        'movements.create' => ['label' => 'Create Movements', 'category' => 'movement'],
        'movements.edit' => ['label' => 'Edit Movements', 'category' => 'movement'],
        'movements.delete' => ['label' => 'Delete Movements', 'category' => 'movement'],
        'movements.cancel' => ['label' => 'Cancel Movements', 'category' => 'movement'],
        'movements.complete' => ['label' => 'Complete Movements', 'category' => 'movement'],
        'movements.approve' => ['label' => 'Approve/Reject Movements', 'category' => 'movement'],
        'transfers.view' => ['label' => 'View Transfers', 'category' => 'movement'],
        'transfers.create' => ['label' => 'Create Transfers', 'category' => 'movement'],
        'transfers.edit' => ['label' => 'Edit Transfers', 'category' => 'movement'],
        'transfers.delete' => ['label' => 'Delete Transfers (admin)', 'category' => 'movement'],
        'transfers.approve' => ['label' => 'Approve/Reject Transfers', 'category' => 'movement'],
        'promotions.view' => ['label' => 'View Promotions', 'category' => 'movement'],
        'promotions.create' => ['label' => 'Create Promotions', 'category' => 'movement'],
        'promotions.edit' => ['label' => 'Edit / Complete Promotions', 'category' => 'movement'],
        'promotions.approve' => ['label' => 'Approve/Reject Promotions', 'category' => 'movement'],
        'confirmations.view' => ['label' => 'View Confirmations', 'category' => 'movement'],
        'confirmations.create' => ['label' => 'Create Confirmations', 'category' => 'movement'],
        'confirmations.edit' => ['label' => 'Edit / Complete Confirmations', 'category' => 'movement'],
        'confirmations.approve' => ['label' => 'Approve/Reject Confirmations', 'category' => 'movement'],
        'separations.view' => ['label' => 'View Separations (Obbahoti)', 'category' => 'movement'],
        'separations.create' => ['label' => 'Create Separations', 'category' => 'movement'],
        'separations.edit' => ['label' => 'Edit / Complete Separations', 'category' => 'movement'],
        'separations.approve' => ['label' => 'Approve/Reject Separations', 'category' => 'movement'],

        'profile.view' => ['label' => 'View Own Profile', 'category' => 'profile'],
        'profile.edit' => ['label' => 'Edit Own Profile', 'category' => 'profile'],

        'department_head' => ['label' => 'Line authority: Department Head', 'category' => 'organogram'],
        'branch_manager' => ['label' => 'Line authority: Branch Manager', 'category' => 'organogram'],
        'organogram.executive_director' => ['label' => 'Organogram: Executive Director (head office oversight)', 'category' => 'organogram'],
        'organogram.microfinance_director' => ['label' => 'Organogram: Director — Microfinance (all branches)', 'category' => 'organogram'],
        'organogram.microfinance_assistant_director' => ['label' => 'Organogram: Assistant Director — Microfinance', 'category' => 'organogram'],
        'organogram.zonal_manager' => ['label' => 'Organogram: Zonal Manager', 'category' => 'organogram'],
        'organogram.regional_manager' => ['label' => 'Organogram: Regional Manager', 'category' => 'organogram'],

        'holidays.view' => ['label' => 'View Holidays', 'category' => 'holidays'],
        'holidays.create' => ['label' => 'Create Holidays', 'category' => 'holidays'],
        'holidays.edit' => ['label' => 'Edit Holidays', 'category' => 'holidays'],
        'holidays.delete' => ['label' => 'Delete Holidays', 'category' => 'holidays'],

        'reports.view' => ['label' => 'View Reports', 'category' => 'reports'],
        'reports.export' => ['label' => 'Export Reports', 'category' => 'reports'],

        'payroll.view' => ['label' => 'View Payroll', 'category' => 'payroll'],
        'payroll.create' => ['label' => 'Create / Process Payroll', 'category' => 'payroll'],
        'payroll.edit' => ['label' => 'Edit Payroll Records', 'category' => 'payroll'],
        'payroll.delete' => ['label' => 'Delete Payroll Records', 'category' => 'payroll'],

        'fixed-assets.view' => ['label' => 'View Fixed Assets', 'category' => 'fixed-assets'],
        'fixed-assets.create' => ['label' => 'Register Fixed Assets', 'category' => 'fixed-assets'],
        'fixed-assets.edit' => ['label' => 'Edit Fixed Assets & Transfers', 'category' => 'fixed-assets'],
        'fixed-assets.delete' => ['label' => 'Delete Fixed Assets', 'category' => 'fixed-assets'],
    ],

    /** Map legacy role JSON keys to current catalog keys. */
    'legacy_aliases' => [
        'leaves.view' => 'leave-applications.view',
        'leaves.create' => 'leave-applications.create',
        'leaves.edit' => 'leave-applications.edit',
        'leaves.delete' => 'leave-applications.delete',
        'leaves.approve' => 'leave-applications.approve',
        'leaves_type.view' => 'leave-types.view',
        'leaves_type.create' => 'leave-types.create',
        'leaves_type.edit' => 'leave-types.edit',
        'leaves_type.delete' => 'leave-types.delete',
    ],
];
