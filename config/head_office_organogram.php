<?php

/**
 * Head Office organogram: designation tiers top-to-bottom (lower level number = higher rank).
 * Used by the organization chart and other HO ordering.
 */
return [
    'tiers' => [
        ['level' => 1, 'label' => 'Advisor'],
        ['level' => 2, 'label' => 'Executive Director'],
        ['level' => 3, 'label' => 'Deputy Executive Director'],
        ['level' => 4, 'label' => 'Director'],
        ['level' => 41, 'label' => 'Deputy Director'],
        ['level' => 5, 'label' => 'Assistant Director'],
        ['level' => 6, 'label' => 'Deputy Assistant Director'],
        ['level' => 7, 'label' => 'Senior Manager'],
        ['level' => 8, 'label' => 'Manager'],
        ['level' => 9, 'label' => 'Assistant Manager'],
        ['level' => 10, 'label' => 'Co-Ordinator'],
        ['level' => 11, 'label' => 'Technical Officer'],
        ['level' => 12, 'label' => 'Environment & RECP'],
        ['level' => 13, 'label' => 'MIS & Documentation'],
        ['level' => 14, 'label' => 'Training Officer'],
        ['level' => 15, 'label' => 'M & E Officer'],
        ['level' => 16, 'label' => 'Case Management Officer'],
        ['level' => 17, 'label' => 'Officer LSED'],
        ['level' => 18, 'label' => 'Accounts Officer'],
        ['level' => 19, 'label' => 'Accountant III'],
        ['level' => 20, 'label' => 'VCF'],
        ['level' => 21, 'label' => 'Resident Physician'],
        ['level' => 22, 'label' => 'Accountant'],
        ['level' => 23, 'label' => 'Sub Assistant Engineer'],
        ['level' => 24, 'label' => 'Office Assistant'],
        ['level' => 25, 'label' => 'Driver'],
    ],

    /** Employees whose designation does not match any tier land here (last). */
    'fallback_tier' => [
        'level' => 999,
        'label' => 'Other Staff',
    ],
];
