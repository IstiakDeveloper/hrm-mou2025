<?php

namespace Database\Seeders;

use App\Models\Holiday;
use Illuminate\Database\Seeder;

class BangladeshPublicHolidays2026Seeder extends Seeder
{
    public function run(): void
    {
        $holidays = [
            // Source reference used during preparation: OfficeHolidays Bangladesh 2026
            // (Islamic/Executive Order holidays may change based on moon sighting/govt notice)
            ['title' => 'Shab e-Barat', 'date' => '2026-02-04', 'is_recurring' => false],
            ['title' => "Language Martyrs' Day", 'date' => '2026-02-21', 'is_recurring' => true],
            ['title' => 'Shab-e-Qadr', 'date' => '2026-03-17', 'is_recurring' => false],
            ['title' => 'Eid al-Fitr Holiday', 'date' => '2026-03-18', 'is_recurring' => false],
            ['title' => 'Eid al-Fitr Holiday', 'date' => '2026-03-19', 'is_recurring' => false],
            ['title' => 'Jumatul Bidah', 'date' => '2026-03-20', 'is_recurring' => false],
            ['title' => 'Eid al-Fitr', 'date' => '2026-03-21', 'is_recurring' => false],
            ['title' => 'Eid al-Fitr Holiday', 'date' => '2026-03-22', 'is_recurring' => false],
            ['title' => 'Eid al-Fitr Holiday', 'date' => '2026-03-23', 'is_recurring' => false],
            ['title' => 'Independence Day', 'date' => '2026-03-26', 'is_recurring' => true],
            ['title' => 'Bengali New Year', 'date' => '2026-04-14', 'is_recurring' => true],
            ['title' => 'Buddha Purnima', 'date' => '2026-05-01', 'is_recurring' => false],
            ['title' => 'Labour Day', 'date' => '2026-05-01', 'is_recurring' => true],
            ['title' => 'Eid-ul-Azha Holiday', 'date' => '2026-05-26', 'is_recurring' => false],
            ['title' => 'Eid-ul-Azha', 'date' => '2026-05-28', 'is_recurring' => false],
            ['title' => 'Eid-ul-Azha Holiday', 'date' => '2026-05-29', 'is_recurring' => false],
            ['title' => 'Eid-ul-Azha Holiday', 'date' => '2026-05-30', 'is_recurring' => false],
            ['title' => 'Eid-ul-Azha Holiday', 'date' => '2026-05-31', 'is_recurring' => false],
            ['title' => 'Eid-ul-Azha Holiday', 'date' => '2026-06-02', 'is_recurring' => false],
            ['title' => 'Ashura', 'date' => '2026-06-26', 'is_recurring' => false],
            ['title' => 'July Mass Uprising Day', 'date' => '2026-08-05', 'is_recurring' => true],
            ['title' => 'Eid-e-Miladunnabi', 'date' => '2026-08-26', 'is_recurring' => false],
            ['title' => 'Janmashtami', 'date' => '2026-09-04', 'is_recurring' => false],
            ['title' => 'Navami of Durga Puja', 'date' => '2026-10-20', 'is_recurring' => false],
            ['title' => 'Durga Puja', 'date' => '2026-10-21', 'is_recurring' => false],
            ['title' => 'Victory Day', 'date' => '2026-12-16', 'is_recurring' => true],
            ['title' => 'Christmas Day', 'date' => '2026-12-25', 'is_recurring' => true],
        ];

        foreach ($holidays as $holiday) {
            Holiday::updateOrCreate(
                ['title' => $holiday['title'], 'date' => $holiday['date']],
                [
                    'description' => $holiday['description'] ?? null,
                    'is_recurring' => $holiday['is_recurring'],
                ]
            );
        }
    }
}

