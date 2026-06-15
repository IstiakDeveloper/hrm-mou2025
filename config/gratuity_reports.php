<?php

return [
    'company_name' => env('GRATUITY_REPORT_COMPANY', env('PAYROLL_REPORT_COMPANY', env('APP_NAME', 'Organization'))),

    'reports' => [
        'gratuity-ledger' => [
            'title' => 'Gratuity Ledger',
            'description' => 'All-time gratuity ledger for active employees — all or one selected employee.',
            'filters' => ['branch_id', 'department_id', 'employee_id'],
            'template' => 'gratuity-ledger',
            'report' => 'gratuity_ledger',
        ],
        'entitlements-register' => [
            'title' => 'Gratuity Entitlements Register',
            'description' => 'All employees with projected gratuity as of the selected date.',
            'filters' => ['as_of', 'branch_id', 'department_id', 'employee_id', 'eligibility', 'payment_status'],
            'template' => 'gratuity-table',
            'report' => 'entitlements_register',
        ],
        'eligible-employees' => [
            'title' => 'Eligible Employees List',
            'description' => 'Employees who completed minimum service and qualify for gratuity.',
            'filters' => ['as_of', 'branch_id', 'department_id', 'payment_status'],
            'template' => 'gratuity-table',
            'report' => 'eligible_employees',
            'eligible_only' => true,
        ],
        'projected-liability' => [
            'title' => 'Projected Gratuity Liability',
            'description' => 'Total gratuity exposure by branch (eligible employees only).',
            'filters' => ['as_of', 'branch_id'],
            'template' => 'gratuity-grouped',
            'report' => 'liability_by_branch',
        ],
        'liability-by-department' => [
            'title' => 'Gratuity Liability by Department',
            'description' => 'Total gratuity exposure grouped by department.',
            'filters' => ['as_of', 'branch_id'],
            'template' => 'gratuity-grouped',
            'report' => 'liability_by_department',
        ],
        'unpaid-liability' => [
            'title' => 'Unpaid Gratuity Liability',
            'description' => 'Eligible employees whose gratuity has not been paid yet.',
            'filters' => ['as_of', 'branch_id', 'department_id'],
            'template' => 'gratuity-table',
            'report' => 'unpaid_liability',
        ],
        'settlement-history' => [
            'title' => 'Gratuity Settlement History',
            'description' => 'Recorded gratuity payments and final settlements.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id'],
            'template' => 'gratuity-table',
            'report' => 'settlement_history',
        ],
        'payment-summary' => [
            'title' => 'Gratuity Payment Summary',
            'description' => 'Count and amount of settlements by payment status.',
            'filters' => ['date_from', 'date_to', 'branch_id'],
            'template' => 'gratuity-table',
            'report' => 'payment_summary',
        ],
        'gratuity-rules' => [
            'title' => 'Gratuity Rules & Tiers',
            'description' => 'Service tenure tiers and basic salary multipliers.',
            'filters' => [],
            'template' => 'gratuity-rules',
            'report' => 'gratuity_rules',
        ],
    ],
];
