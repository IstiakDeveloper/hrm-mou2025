<?php

namespace Database\Seeders;

use App\Services\EmployeesGenderBankFromCsvService;
use Illuminate\Database\Seeder;

/**
 * Gender + bank from data/excel/Gender-and-Bank-Info.csv (PIN match includes leading-zero variants).
 * Works on an existing database — migrate:fresh is NOT required.
 *
 * Run: php artisan db:seed --class=EmployeesGenderBankFromCsvSeeder --force
 */
class EmployeesGenderBankFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $result = app(EmployeesGenderBankFromCsvService::class)->run(null, false);

        $this->command?->info(
            'Gender/Bank CSV: updated='.$result['updated']
            .', skipped_not_found='.$result['skipped_not_found']
            .', skipped_empty_pin='.$result['skipped_empty_pin']
        );
        $this->command?->info('Log: '.$result['log_path']);
    }
}
