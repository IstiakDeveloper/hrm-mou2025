<?php

return [
    'company_name' => env('EMPLOYEE_LOAN_REPORT_COMPANY', env('PAYROLL_REPORT_COMPANY', env('APP_NAME', 'Organization'))),

    'reports' => [
        'loan-ledger' => [
            'title' => 'Loan Ledger',
            'description' => 'All loan ledger transactions in the selected period.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id', 'loan_type'],
            'template' => 'loan-table',
            'report' => 'loan_ledger',
        ],
        'loan-disburse-register' => [
            'title' => 'Loan Disburse Register (Employee Wise)',
            'description' => 'Loans disbursed in the selected period, listed employee wise.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id', 'loan_type'],
            'template' => 'loan-table',
            'report' => 'loan_disburse_register',
        ],
        'loan-recoverable' => [
            'title' => 'Loan Recoverable',
            'description' => 'Active loans with outstanding balance recoverable from payroll or collection.',
            'filters' => ['as_of', 'branch_id', 'department_id', 'employee_id', 'loan_type'],
            'template' => 'loan-table',
            'report' => 'loan_recoverable',
        ],
        'loan-collection-register' => [
            'title' => 'Loan Collection Register',
            'description' => 'Off-payroll collections, advance, waive and related batches.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id'],
            'template' => 'loan-table',
            'report' => 'loan_collection_register',
        ],
        'loan-pf-balance' => [
            'title' => 'Loan and PF Balance',
            'description' => 'Employee-wise provident fund balance and loan outstanding.',
            'filters' => ['as_of', 'branch_id', 'department_id', 'employee_id'],
            'template' => 'loan-table',
            'report' => 'loan_pf_balance',
        ],
        'full-paid-register' => [
            'title' => 'Full Paid Register',
            'description' => 'Loans fully paid and closed in the system.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id', 'loan_type'],
            'template' => 'loan-table',
            'report' => 'full_paid_register',
        ],
        'rebate-register' => [
            'title' => 'Rebate Register',
            'description' => 'Loan rebate entries from collection module.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id'],
            'template' => 'loan-table',
            'report' => 'rebate_register',
        ],
        'loan-statement-employee' => [
            'title' => 'Loan Statement (Employee Wise)',
            'description' => 'Summary of all loans for selected employee(s).',
            'filters' => ['as_of', 'branch_id', 'department_id', 'employee_id', 'loan_type'],
            'template' => 'loan-table',
            'report' => 'loan_statement_employee',
            'require_employee' => false,
        ],
        'loan-statement-component' => [
            'title' => 'Loan Statement (Component Wise)',
            'description' => 'Outstanding loans grouped by loan type / component.',
            'filters' => ['as_of', 'branch_id', 'loan_type'],
            'template' => 'loan-grouped',
            'report' => 'loan_statement_component',
        ],
        'loan-statement-branch' => [
            'title' => 'Loan Statement (Branch Wise)',
            'description' => 'Outstanding loans grouped by branch.',
            'filters' => ['as_of', 'branch_id'],
            'template' => 'loan-grouped',
            'report' => 'loan_statement_branch',
        ],
    ],
];
