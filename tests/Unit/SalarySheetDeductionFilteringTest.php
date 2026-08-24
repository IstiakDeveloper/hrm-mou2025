<?php

use App\Services\PayrollReportService;

it('hides zero deduction heads per branch in groupSalarySheetRows', function () {
    $service = app(PayrollReportService::class);

    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('groupSalarySheetRows');
    $method->setAccessible(true);

    $sheet = [
        'heads' => ['Basic', 'ded:pf', 'ded:loan', 'ded:fine'],
        'earning_heads' => ['Basic'],
        'deduction_heads' => ['ded:pf', 'ded:loan', 'ded:fine'],
        'head_labels' => [
            'Basic' => 'Basic',
            'ded:pf' => 'PF',
            'ded:loan' => 'Loan',
            'ded:fine' => 'Fine',
        ],
        'rows' => [
            // Branch 1: Has PF only, loan and fine are 0
            [
                'branch' => 'Dhaka Branch',
                'branch_code' => '001',
                'name' => 'Emp 1',
                'components' => ['Basic' => 10000.0, 'ded:pf' => 500.0, 'ded:loan' => 0.0, 'ded:fine' => 0.0],
                'gross' => 10000.0,
                'deduction' => 500.0,
                'net' => 9500.0,
            ],
            [
                'branch' => 'Dhaka Branch',
                'branch_code' => '001',
                'name' => 'Emp 2',
                'components' => ['Basic' => 12000.0, 'ded:pf' => 600.0, 'ded:loan' => 0.0, 'ded:fine' => 0.0],
                'gross' => 12000.0,
                'deduction' => 600.0,
                'net' => 11400.0,
            ],
            // Branch 2: Has Loan and Fine, PF is 0
            [
                'branch' => 'Chittagong Branch',
                'branch_code' => '002',
                'name' => 'Emp 3',
                'components' => ['Basic' => 15000.0, 'ded:pf' => 0.0, 'ded:loan' => 1000.0, 'ded:fine' => 200.0],
                'gross' => 15000.0,
                'deduction' => 1200.0,
                'net' => 13800.0,
            ],
            // Branch 3: Has NO deductions at all (all 0)
            [
                'branch' => 'Rajshahi Branch',
                'branch_code' => '003',
                'name' => 'Emp 4',
                'components' => ['Basic' => 8000.0, 'ded:pf' => 0.0, 'ded:loan' => 0.0, 'ded:fine' => 0.0],
                'gross' => 8000.0,
                'deduction' => 0.0,
                'net' => 8000.0,
            ],
        ],
    ];

    $result = $method->invoke($service, $sheet, 'branch');

    expect($result['template'])->toBe('salary-sheet-grouped')
        ->and($result['sections'])->toHaveCount(3);

    // Section 1 (Dhaka): should only have ded:pf in deduction_heads
    $dhakaSection = $result['sections'][0];
    expect($dhakaSection['label'])->toContain('Dhaka Branch')
        ->and($dhakaSection['deduction_heads'])->toEqual(['ded:pf'])
        ->and($dhakaSection['earning_heads'])->toEqual(['Basic'])
        ->and($dhakaSection['heads'])->toEqual(['Basic', 'ded:pf']);

    // Section 2 (Chittagong): should only have ded:loan and ded:fine
    $ctgSection = $result['sections'][1];
    expect($ctgSection['label'])->toContain('Chittagong Branch')
        ->and($ctgSection['deduction_heads'])->toEqual(['ded:loan', 'ded:fine'])
        ->and($ctgSection['heads'])->toEqual(['Basic', 'ded:loan', 'ded:fine']);

    // Section 3 (Rajshahi): should have empty deduction_heads
    $rajSection = $result['sections'][2];
    expect($rajSection['label'])->toContain('Rajshahi Branch')
        ->and($rajSection['deduction_heads'])->toEqual([])
        ->and($rajSection['heads'])->toEqual(['Basic']);
});
