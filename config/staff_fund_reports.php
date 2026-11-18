<?php

return [
    'company_name' => env('STAFF_FUND_REPORT_COMPANY') ?: config('payroll_reports.company_name', env('APP_NAME', 'Mousumi')),
    'company_address' => env('STAFF_FUND_REPORT_COMPANY_ADDRESS') ?: config('payroll_reports.company_address', ''),

    'reports' => [
        'final-payment-waiting-list' => [
            'slug' => 'final-payment-waiting-list',
            'title' => 'Final Payment Waiting List',
            'short_title' => 'Final Payment Waiting List',
            'description' => 'Comprehensive list of separated/left staff awaiting final payment settlement with real-time clearance status, left duration, and net payable amounts.',
            'orientation' => 'landscape',
            'filters' => ['as_of_date', 'date_from', 'date_to', 'payment_status', 'clearance_status', 'zone_id', 'regional_office_id', 'branch_id'],
        ],
    ],

    'signature_blocks' => [
        ['label' => 'Prepared By', 'department' => 'Staff Fund / HR'],
        ['label' => 'Checked By', 'department' => 'Accounts Officer'],
        ['label' => 'Verified By', 'department' => 'Audit & Compliance'],
        ['label' => 'Recommended By', 'department' => 'Director (F&A)'],
        ['label' => 'Approved By', 'department' => 'Executive Director'],
    ],
];
