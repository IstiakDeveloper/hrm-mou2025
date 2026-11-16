<?php

namespace App\Services;

use App\Models\TaxSlab;
use App\Support\SimpleXlsxReader;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class TaxSlabFromXlsxService
{
    /**
     * @return array{imported: int, source: string}
     */
    public function run(?string $sourcePath = null): array
    {
        $path = $sourcePath ?? base_path((string) config('payroll.tax_slab_xlsx'));
        if (! is_readable($path)) {
            throw new InvalidArgumentException('Tax slab file not readable: '.$path);
        }

        $rows = str_ends_with(strtolower($path), '.xlsx')
            ? SimpleXlsxReader::sheetRows($path)
            : $this->rowsFromCsv($path);

        $slabs = $this->parseSlabs($rows);
        if ($slabs === []) {
            throw new RuntimeException('No tax slabs found in spreadsheet.');
        }

        return DB::transaction(function () use ($slabs, $path) {
            TaxSlab::query()->delete();
            TaxSlabService::clearCache();

            $sort = 0;
            foreach ($slabs as $slab) {
                TaxSlab::query()->create([
                    'from_amount' => $slab['from_amount'],
                    'to_amount' => $slab['to_amount'],
                    'tax_amount' => $slab['tax_amount'],
                    'sort_order' => $sort++,
                    'is_active' => true,
                ]);
            }

            return [
                'imported' => count($slabs),
                'source' => basename($path),
            ];
        });
    }

    /**
     * @param  list<list<string>>  $rows
     * @return list<array{from_amount: int, to_amount: int, tax_amount: int}>
     */
    private function parseSlabs(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $rows[0]);
        $fromIdx = $this->columnIndex($header, ['from']);
        $toIdx = $this->columnIndex($header, ['to']);
        $taxIdx = $this->columnIndex($header, ['tax deduction', 'tax', 'tax_amount']);

        if ($fromIdx === null || $toIdx === null || $taxIdx === null) {
            throw new RuntimeException('Tax slab sheet must have From, To, and Tax Deduction columns.');
        }

        $slabs = [];
        for ($i = 1, $count = count($rows); $i < $count; $i++) {
            $row = $rows[$i];
            $from = $this->parseInt($row[$fromIdx] ?? '');
            $to = $this->parseInt($row[$toIdx] ?? '');
            $tax = $this->parseInt($row[$taxIdx] ?? '');

            if ($from <= 0 && $to <= 0) {
                continue;
            }

            $slabs[] = [
                'from_amount' => $from,
                'to_amount' => $to,
                'tax_amount' => $tax,
            ];
        }

        return $slabs;
    }

    /**
     * @param  list<string>  $header
     * @param  list<string>  $names
     */
    private function columnIndex(array $header, array $names): ?int
    {
        foreach ($names as $name) {
            $idx = array_search($name, $header, true);
            if ($idx !== false) {
                return $idx;
            }
        }

        return null;
    }

    private function parseInt(mixed $raw): int
    {
        $clean = preg_replace('/[^\d]/', '', trim((string) $raw));

        return (int) ($clean !== '' ? $clean : 0);
    }

    /**
     * @return list<list<string>>
     */
    private function rowsFromCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw new RuntimeException('Unable to open CSV.');
        }

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = array_map(fn ($v) => trim((string) $v), $row);
        }
        fclose($handle);

        return $rows;
    }
}
