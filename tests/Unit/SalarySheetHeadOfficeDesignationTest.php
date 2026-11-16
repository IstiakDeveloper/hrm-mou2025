<?php

use App\Services\PayrollReportService;

it('keeps designation only and does not append department in salary sheet', function () {
    $service = app(PayrollReportService::class);
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('formatSalarySheetDesignation');
    $method->setAccessible(true);

    // Head office with parentheses in designation: kept as-is
    expect($method->invoke($service, 'Director (Microfinance)', 'Microfinance', true))
        ->toBe('Director (Microfinance)');

    // Head office with acronym in parentheses: kept as-is
    expect($method->invoke($service, 'Senior Manager (Admin)', 'Administration', true))
        ->toBe('Senior Manager (Admin)');

    // Head office with no parentheses in designation: department is not appended
    expect($method->invoke($service, 'Accountant', 'Finance & Accounts', true))
        ->toBe('Accountant');

    // Head office with no department
    expect($method->invoke($service, 'Executive Director', null, true))
        ->toBe('Executive Director');

    // Head office with parentheses and no department
    expect($method->invoke($service, 'Officer (IT)', '', true))
        ->toBe('Officer (IT)');

    // Field branch employee: designation is also kept as-is
    expect($method->invoke($service, 'Director (Microfinance)', 'Microfinance', false))
        ->toBe('Director (Microfinance)');
    expect($method->invoke($service, 'Branch Manager', 'Microfinance', false))
        ->toBe('Branch Manager');
});
