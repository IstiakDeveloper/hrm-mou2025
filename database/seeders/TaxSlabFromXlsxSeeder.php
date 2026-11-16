<?php

namespace Database\Seeders;

use App\Services\StatutoryDeductionHeadsService;
use App\Services\TaxSlabFromXlsxService;
use Illuminate\Database\Seeder;

/**
 * Import income-tax slabs + PF/Tax salary heads.
 *
 * Run: php artisan db:seed --class=TaxSlabFromXlsxSeeder --force
 */
class TaxSlabFromXlsxSeeder extends Seeder
{
    public function run(): void
    {
        $slabs = app(TaxSlabFromXlsxService::class)->run();
        $heads = app(StatutoryDeductionHeadsService::class)->seed();

        $this->command?->info(
            'Tax slabs ('.$slabs['source'].'): '.$slabs['imported']
            .' | PF head #'.$heads['pf']->id.', Tax head #'.$heads['tax']->id
        );
    }
}
