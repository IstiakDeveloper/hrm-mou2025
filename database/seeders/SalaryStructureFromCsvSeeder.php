<?php

namespace Database\Seeders;

use App\Services\SalaryStructureFromCsvService;
use Illuminate\Database\Seeder;

/**
 * Payscale, grades (Grade i–xv), steps (Step 0–10), and salary heads from salary-structure.xlsx (no salary structures).
 *
 * Run: php artisan db:seed --class=SalaryStructureFromCsvSeeder --force
 */
class SalaryStructureFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $result = app(SalaryStructureFromCsvService::class)->run();

        $this->command?->info(
            'Salary structure ('.$result['source'].'): payscale_id='.$result['payscale_id']
            .', heads='.$result['heads']
            .', grades='.$result['grades']
            .', steps='.$result['steps']
            .', structures_removed='.$result['structures_removed']
        );
    }
}
