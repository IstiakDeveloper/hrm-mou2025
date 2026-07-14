<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Rebate — current month (manual)
    |--------------------------------------------------------------------------
    |
    | When closing a loan, staff choose whether the pending installment due in
    | the same calendar month as the collection date is included in the rebate.
    | This default applies when the UI does not send an explicit choice.
    |
    */
    'rebate' => [
        'default_include_current_month' => filter_var(
            env('LOAN_REBATE_DEFAULT_INCLUDE_CURRENT_MONTH', false),
            FILTER_VALIDATE_BOOL
        ),
    ],

    'loan_types' => [
        'pf_loan' => [
            'label' => 'PF Loan',
            'salary_head_code' => 'LOAN_PF',
            'short_name' => 'PF Loan',
        ],
        'motorcycle_loan' => [
            'label' => 'Motorcycle Loan',
            'salary_head_code' => 'LOAN_MOTORCYCLE',
            'short_name' => 'M/C Loan',
        ],
        'laptop_loan' => [
            'label' => 'Laptop Loan',
            'salary_head_code' => 'LOAN_LAPTOP',
            'short_name' => 'Laptop Loan',
        ],
        'other' => [
            'label' => 'Others',
            'salary_head_code' => 'LOAN_OTHER',
            'short_name' => 'Loan',
        ],
    ],
];
