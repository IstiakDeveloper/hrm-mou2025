<?php

/**
 * Branch organogram: designation tiers within each branch (top to bottom).
 * Zone / regional managers are also ordered by these tiers when listed with branch staff.
 */
return [
    'tiers' => [
        ['level' => 1, 'label' => 'Zonal Manager'],
        ['level' => 2, 'label' => 'Regional Manager'],
        ['level' => 3, 'label' => 'Branch Manager'],
        ['level' => 4, 'label' => 'Assistant Branch Manager'],
        ['level' => 5, 'label' => 'Accountant'],
        ['level' => 6, 'label' => 'Probationary Accountant'],
        ['level' => 7, 'label' => 'Officer'],
        ['level' => 8, 'label' => 'Probationary Staff'],
        ['level' => 9, 'label' => 'Cashier'],
    ],

    'fallback_tier' => [
        'level' => 999,
        'label' => 'Other Staff',
    ],
];
