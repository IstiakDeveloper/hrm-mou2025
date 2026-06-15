<?php

return [
    'company_name' => env('PF_REPORT_COMPANY', env('PAYROLL_REPORT_COMPANY', env('APP_NAME', 'Organization'))),

    'reports' => [
        'pf-ledger' => [
            'title' => 'PF Ledger',
            'description' => 'Full PF transaction ledger for one employee with running balance.',
            'filters' => ['employee_id', 'date_from', 'date_to'],
            'require_employee' => true,
            'template' => 'pf-ledger',
            'report' => 'pf_ledger',
        ],
        'pf-contribution-loan-deduction' => [
            'title' => 'PF Contribution and Loan Deduction',
            'description' => 'Employee-wise PF contribution and loan deductions from posted payroll for the selected month.',
            'filters' => ['year', 'month', 'branch_id', 'department_id', 'employee_id'],
            'template' => 'pf-table',
            'report' => 'pf_contribution_loan_deduction',
        ],
        'pf-deduction-register' => [
            'title' => 'PF Deduction Register',
            'description' => 'PF amount deducted from employee salary in the selected payroll month.',
            'filters' => ['year', 'month', 'branch_id', 'department_id', 'employee_id'],
            'template' => 'pf-table',
            'report' => 'pf_deduction_register',
        ],
        'pf-interest-register' => [
            'title' => 'PF Interest Register',
            'description' => 'Yearly PF interest credited to employees.',
            'filters' => ['year', 'branch_id', 'department_id'],
            'template' => 'pf-table',
            'report' => 'pf_interest_register',
        ],
        'pf-refund-register' => [
            'title' => 'PF Refund Register',
            'description' => 'PF refunds / payments to employees in the selected period.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id'],
            'template' => 'pf-table',
            'report' => 'pf_refund_register',
        ],
        'pf-balance-register' => [
            'title' => 'PF Balance Register',
            'description' => 'Employee-wise PF balance with own and organization contribution totals.',
            'filters' => ['branch_id', 'department_id', 'employee_id'],
            'template' => 'pf-table',
            'report' => 'pf_balance_register',
        ],
        'pf-balance-register-details' => [
            'title' => 'PF Balance Register (Details)',
            'description' => 'Employee-wise PF balance with opening, contributions, interest, refunds and adjustments.',
            'filters' => ['branch_id', 'department_id', 'employee_id'],
            'template' => 'pf-table',
            'report' => 'pf_balance_register_details',
        ],
        'pf-balance-by-branch' => [
            'title' => 'PF Balance Register (Branch Wise)',
            'description' => 'Total PF balance grouped by branch.',
            'filters' => ['branch_id'],
            'template' => 'pf-grouped',
            'report' => 'pf_balance_by_branch',
        ],
        'pf-transaction-register' => [
            'title' => 'PF Transaction Register',
            'description' => 'All PF ledger entries in the selected period.',
            'filters' => ['date_from', 'date_to', 'branch_id', 'department_id', 'employee_id', 'transaction_type'],
            'template' => 'pf-table',
            'report' => 'pf_transaction_register',
        ],
        'pf-balance-by-department' => [
            'title' => 'PF Balance by Department',
            'description' => 'Total PF balance grouped by department.',
            'filters' => ['branch_id'],
            'template' => 'pf-grouped',
            'report' => 'pf_balance_by_department',
        ],
    ],
];
