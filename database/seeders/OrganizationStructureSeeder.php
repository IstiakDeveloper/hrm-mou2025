<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\RegionalOffice;
use App\Models\Zone;
use Illuminate\Database\Seeder;

class OrganizationStructureSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'name' => 'Raninagar',
                'code' => '01',
                'is_active' => true,
                'areas' => [
                    [
                        'name' => 'Atrai',
                        'code' => '101',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Atrai', 'code' => '0002', 'email' => 'attrai00002@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Bhabanipur', 'code' => '0004', 'email' => 'bhabanipur0004@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Khajura', 'code' => '0028', 'email' => 'khajura0028@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Naldanga', 'code' => '0031', 'email' => 'naldanga0031@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Samaspara', 'code' => '0032', 'email' => 'somaspara0032@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                    [
                        'name' => 'Adamdighi',
                        'code' => '102',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Abadpukur', 'code' => '0007', 'email' => 'abadpokur007@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Saharpukur', 'code' => '0010', 'email' => 'saharpokur0010@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Adamdighi', 'code' => '0011', 'email' => 'adamdighi0011@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Hatkoroi', 'code' => '0027', 'email' => 'hatkoroi0027@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Kahaloo', 'code' => '0042', 'email' => 'kahaloo0042@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                    [
                        'name' => 'Betgari',
                        'code' => '105',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Raninagar', 'code' => '0003', 'email' => 'raninagar0003@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Bandaikhara', 'code' => '0005', 'email' => 'bandaikhara0005@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Fatepur', 'code' => '0023', 'email' => 'fatepur0023@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Betgari', 'code' => '0013', 'email' => 'betgari0013@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Badalgachi',
                'code' => '02',
                'is_active' => true,
                'areas' => [
                    [
                        'name' => 'Naogaon',
                        'code' => '106',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Naogaon Sadar', 'code' => '0001', 'email' => 'naogaon0001@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Shailgachi', 'code' => '0012', 'email' => 'shailgachi0012@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Tilakpur', 'code' => '0014', 'email' => 'tilokpur0014@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Santahar', 'code' => '0015', 'email' => 'santaharbranch@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Katkhair', 'code' => '0026', 'email' => 'katkhoir0026@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                    [
                        'name' => 'Khetlal',
                        'code' => '108',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Khetlal', 'code' => '0038', 'email' => 'khetlal0038@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Chanpara', 'code' => '0039', 'email' => 'chanpara039@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Kichok', 'code' => '0040', 'email' => 'kichok0040@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Rajabirat', 'code' => '0041', 'email' => 'rajabirat0041@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                    [
                        'name' => 'Paharpur',
                        'code' => '109',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Kritipur', 'code' => '0006', 'email' => 'kirtipur0006@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Badalgachi', 'code' => '0009', 'email' => 'badalgachi012@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Akkelpur', 'code' => '0037', 'email' => 'akkelpur0037@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Nazipur', 'code' => '0017', 'email' => 'nazipur0017@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Paharpur', 'code' => '0019', 'email' => 'paharpur0019@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Shishahat',
                'code' => '03',
                'is_active' => true,
                'areas' => [
                    [
                        'name' => 'Mohadebpur',
                        'code' => '103',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Hapania', 'code' => '0008', 'email' => 'hapania0008@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Charagpur', 'code' => '0016', 'email' => 'cheragpur0016@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Mohadebpur', 'code' => '0018', 'email' => 'mohadebpur0018@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Chatra', 'code' => '0020', 'email' => 'chatra0020@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Shibpur', 'code' => '0029', 'email' => 'shibpur0029@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                    [
                        'name' => 'Sapahar',
                        'code' => '104',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Sapahar', 'code' => '0021', 'email' => 'sapahar0021@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Shishahat', 'code' => '0024', 'email' => 'branchshishahat@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Digirhat', 'code' => '0030', 'email' => 'dighirhat0030@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Agradigun', 'code' => '0034', 'email' => 'agradigun0034@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                    [
                        'name' => 'Rajbari',
                        'code' => '107',
                        'is_active' => true,
                        'branches' => [
                            ['name' => 'Chaubaria Hat', 'code' => '0022', 'email' => 'chawbaria0022@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Hat Gangopara', 'code' => '0025', 'email' => 'hatgangopara0025@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Rajbari', 'code' => '0033', 'email' => 'rajbari0033@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Dorgadanga', 'code' => '0035', 'email' => 'durgadanga0035@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                            ['name' => 'Nachol', 'code' => '0036', 'email' => 'nachol00036@gmail.com', 'contact_number' => null, 'address' => null, 'is_active' => true],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($data as $zoneRow) {
            $zone = Zone::updateOrCreate(
                ['code' => (string) $zoneRow['code']],
                [
                    'name' => (string) $zoneRow['name'],
                    'description' => null,
                    'is_active' => (bool) ($zoneRow['is_active'] ?? true),
                ]
            );

            foreach (($zoneRow['areas'] ?? []) as $areaRow) {
                $ro = RegionalOffice::updateOrCreate(
                    ['code' => (string) $areaRow['code']],
                    [
                        'zone_id' => $zone->id,
                        'name' => (string) $areaRow['name'],
                        'description' => null,
                        'is_active' => (bool) ($areaRow['is_active'] ?? true),
                    ]
                );

                foreach (($areaRow['branches'] ?? []) as $branchRow) {
                    Branch::updateOrCreate(
                        ['branch_code' => (string) $branchRow['code']],
                        [
                            'regional_office_id' => $ro->id,
                            'name' => (string) $branchRow['name'],
                            'address' => $branchRow['address'] ?? null,
                            'contact_number' => $branchRow['contact_number'] ?? null,
                            'email' => $branchRow['email'] ?? null,
                            'is_head_office' => false,
                            'is_active' => (bool) ($branchRow['is_active'] ?? true),
                        ]
                    );
                }
            }
        }
    }
}
