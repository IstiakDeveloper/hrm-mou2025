<?php

namespace App\Services;

use App\Models\TaxSlab;
use Illuminate\Support\Collection;

class TaxSlabService
{
    /** @var Collection<int, TaxSlab>|null */
    private static ?Collection $activeSlabs = null;

    /**
     * Monthly tax (whole taka) for gross salary per tax slab sheet.
     */
    public function taxForGross(float $grossSalary): float
    {
        $gross = (int) SalaryStructureCalculator::roundTaka($grossSalary);

        if ($gross <= 0) {
            return 0.0;
        }

        $slabs = $this->activeSlabs();

        $match = $slabs->first(
            fn (TaxSlab $slab) => $gross >= $slab->from_amount && $gross <= $slab->to_amount
        );

        if ($match) {
            return (float) $match->tax_amount;
        }

        $highest = $slabs->sortByDesc('to_amount')->first();
        if ($highest && $gross > $highest->to_amount) {
            return (float) $highest->tax_amount;
        }

        return 0.0;
    }

    /**
     * @return Collection<int, TaxSlab>
     */
    private function activeSlabs(): Collection
    {
        if (self::$activeSlabs === null) {
            self::$activeSlabs = TaxSlab::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('from_amount')
                ->get();
        }

        return self::$activeSlabs;
    }

    public static function clearCache(): void
    {
        self::$activeSlabs = null;
    }
}
