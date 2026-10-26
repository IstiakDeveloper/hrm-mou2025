<?php

use App\Services\PayrollReportService;

it('formats head office designation as Designation (Department) stripping existing parentheses', function () {
    $service = app(PayrollReportService::class);
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('formatSalarySheetDesignation');
    $method->setAccessible(true);

    // Head office with parentheses in designation matching department
    expect($method->invoke($service, 'Director (Microfinance)', 'Microfinance', true))
        ->toBe('Director (Microfinance)');

    // Head office with different acronym in parentheses
    expect($method->invoke($service, 'Senior Manager (Admin)', 'Administration', true))
        ->toBe('Senior Manager (Administration)');

    // Head office with no parentheses in designation
    expect($method->invoke($service, 'Accountant', 'Finance & Accounts', true))
        ->toBe('Accountant (Finance & Accounts)');

    // Head office with no department
    expect($method->invoke($service, 'Executive Director', null, true))
        ->toBe('Executive Director');

    // Head office with parentheses and no department
    expect($method->invoke($service, 'Officer (IT)', '', true))
        ->toBe('Officer');

    // Field branch employee: designation is not altered
    expect($method->invoke($service, 'Director (Microfinance)', 'Microfinance', false))
        ->toBe('Director (Microfinance)');
    expect($method->invoke($service, 'Branch Manager', 'Microfinance', false))
        ->toBe('Branch Manager');
});
