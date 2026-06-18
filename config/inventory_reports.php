<?php

return [
    'company_name' => env('INVENTORY_REPORT_COMPANY', env('PAYROLL_REPORT_COMPANY', env('APP_NAME', 'Organization'))),
];
