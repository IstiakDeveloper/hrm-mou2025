<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Provident fund (monthly, % of basic salary)
    |--------------------------------------------------------------------------
    */
    'pf_employee_percent' => (float) env('PAYROLL_PF_EMPLOYEE_PERCENT', 10),
    'pf_employer_percent' => (float) env('PAYROLL_PF_EMPLOYER_PERCENT', 10),

    /*
    |--------------------------------------------------------------------------
    | Gratuity (completed years × basic salary tiers)
    |--------------------------------------------------------------------------
    */
    'gratuity_tiers' => [
        ['min_years' => 20, 'basic_multiplier' => 4],
        ['min_years' => 15, 'basic_multiplier' => 3],
        ['min_years' => 10, 'basic_multiplier' => 2],
        ['min_years' => 5, 'basic_multiplier' => 1],
    ],

    'tax_slab_xlsx' => 'data/excel/tax-deduction-slub.xlsx',

];
