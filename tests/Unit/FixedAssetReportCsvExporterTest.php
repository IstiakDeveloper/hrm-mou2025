<?php

use App\Support\FixedAssetReportCsvExporter;

it('correctly extracts headers and rows from payload with sections', function () {
    $payload = [
        'template' => 'purchase-list',
        'headers' => [
            'Category', 'Sub Category', 'Asset No', 'Model No', 'Location', 'Purchase Date', 'Purchase Amount',
            'Closing Value', 'Vendor', 'Voucher No', 'Ledger No', 'Status',
        ],
        'sections' => [
            [
                'title' => '209000 - Head Office',
                'rows' => [
                    [
                        'category' => 'Furniture & Setting',
                        'sub_category' => 'Executive Chair',
                        'asset_no' => 'MOU-HO-CHR-1',
                        'model_no' => 'CH-100',
                        'location' => 'Head Office / Floor 2',
                        'purchase_date' => '10-AUG-2025',
                        'purchase_amount' => 15000,
                        'closing_value' => 13500,
                        'vendor' => 'ABC Furnishings',
                        'voucher_no' => 'V-101',
                        'ledger_no' => 'L-201',
                        'status' => 'In Use',
                    ],
                ],
                'subtotal' => [
                    'asset_count' => 1,
                    'purchase_amount' => 15000,
                    'closing_value' => 13500,
                ],
            ],
            [
                'title' => '209001 - Naogaon Sadar',
                'rows' => [
                    [
                        'category' => 'Electric Equipment',
                        'sub_category' => 'Ceiling Fan',
                        'asset_no' => 'MOU-NS-FAN-1',
                        'model_no' => 'FN-56',
                        'location' => 'Naogaon Sadar / Room 1',
                        'purchase_date' => '01-SEP-2025',
                        'purchase_amount' => 6000,
                        'closing_value' => 5400,
                        'vendor' => 'National Electric',
                        'voucher_no' => 'V-102',
                        'ledger_no' => 'L-202',
                        'status' => 'In Use',
                    ],
                ],
                'subtotal' => [
                    'asset_count' => 1,
                    'purchase_amount' => 6000,
                    'closing_value' => 5400,
                ],
            ],
        ],
        'totals' => [
            'asset_count' => 2,
            'purchase_amount' => 21000,
            'closing_value' => 18900,
        ],
    ];

    [$headers, $rows] = FixedAssetReportCsvExporter::rowsFromPayload($payload);

    expect($headers)->toBe($payload['headers'])
        ->and($rows)->toHaveCount(2)
        ->and($rows[0][0])->toBe('Furniture & Setting')
        ->and($rows[0][2])->toBe('MOU-HO-CHR-1')
        ->and($rows[0][6])->toBe(15000)
        ->and($rows[1][0])->toBe('Electric Equipment')
        ->and($rows[1][2])->toBe('MOU-NS-FAN-1')
        ->and($rows[1][6])->toBe(6000);
});
