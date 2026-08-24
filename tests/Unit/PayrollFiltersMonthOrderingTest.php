<?php

use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;

class DummyPayrollFiltersConsumer
{
    use ProvidesPayrollFilters;

    public function getMonths(?int $startMonth = null): array
    {
        return self::payrollFilterMonths($startMonth);
    }

    public function getValues(\Illuminate\Http\Request $request, ?string $status = null): array
    {
        return $this->payrollFilterValues($request, $status);
    }
}

it('orders months starting from the given or default month', function () {
    $consumer = new DummyPayrollFiltersConsumer();

    // Start with July (7)
    $monthsJuly = $consumer->getMonths(7);
    $monthLabels = array_map(fn ($m) => $m['label'], $monthsJuly);
    $monthValues = array_map(fn ($m) => $m['value'], $monthsJuly);

    expect($monthValues)->toEqual([7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6])
        ->and($monthLabels[0])->toBe('July')
        ->and($monthLabels[1])->toBe('August')
        ->and($monthLabels[11])->toBe('June');
});

it('defaults month and year to latest paid payroll run when request month is empty', function () {
    $consumer = new DummyPayrollFiltersConsumer();
    $request = new \Illuminate\Http\Request();

    $values = $consumer->getValues($request, 'posted');

    expect($values['year'])->not->toBeEmpty()
        ->and($values['month'])->not->toBeEmpty();
});
