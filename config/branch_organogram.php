<?php

/**
 * Branch organogram: designation tiers within each branch (top to bottom).
 * Zone / regional managers are shown at zone & regional office level in the org chart.
 */
return [
    'tiers' => [
        ['level' => 1, 'label' => 'Branch Manager'],
        ['level' => 2, 'label' => 'Assistant Branch Manager'],
        ['level' => 3, 'label' => 'Officer'],
        ['level' => 4, 'label' => 'Accountant'],
        ['level' => 5, 'label' => 'Probationary Staff'],
    ],

    'fallback_tier' => [
        'level' => 999,
        'label' => 'Other Staff',
    ],
];
