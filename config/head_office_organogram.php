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
        ['level' => 9, 'label' => 'Resident Physician'],
        ['level' => 10, 'label' => 'Agriculture Officer'],
        ['level' => 11, 'label' => 'Livestock Officer'],
        ['level' => 12, 'label' => 'Fisheries Officer'],
        ['level' => 13, 'label' => 'Assistant Manager'],
        ['level' => 14, 'label' => 'Co-Ordinator'],
        ['level' => 15, 'label' => 'Technical Officer'],
        ['level' => 16, 'label' => 'Environment & RECP'],
        ['level' => 17, 'label' => 'MIS & Documentation'],
        ['level' => 18, 'label' => 'Training Officer'],
        ['level' => 19, 'label' => 'M & E Officer'],
        ['level' => 20, 'label' => 'Case Management Officer'],
        ['level' => 21, 'label' => 'Officer LSED'],
        ['level' => 22, 'label' => 'Accounts Officer'],
        ['level' => 23, 'label' => 'Accountant III'],
        ['level' => 24, 'label' => 'VCF'],
        ['level' => 25, 'label' => 'Accountant'],
        ['level' => 26, 'label' => 'Sub Assistant Engineer'],
        ['level' => 27, 'label' => 'ALO'],
        ['level' => 28, 'label' => 'AFO'],
        ['level' => 29, 'label' => 'AAO'],
        ['level' => 30, 'label' => 'Office Assistant'],
        ['level' => 31, 'label' => 'Driver'],
        ['level' => 32, 'label' => 'MTO'],
        ['level' => 33, 'label' => 'Security Guard'],
        ['level' => 34, 'label' => 'CSO'],
    ],

    /** Employees whose designation does not match any tier land here (last). */
    'fallback_tier' => [
        'level' => 999,
        'label' => 'Other Staff',
    ],
];
