<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

class InventoryReportCsvExporter
{
    /**
     * @param  list<list<string|int|float|null>>  $rows
     */
    public static function download(string $filename, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<list<string|int|float|null>>
     */
    public static function buildExportRows(string $template, array $payload): array
    {
        $meta = $payload['export_meta'] ?? [];
        $pad = static fn (int $cols, array $row): array => array_pad($row, $cols, '');

        if ($template === 'product-ledger-split') {
            $product = $payload['product'] ?? [];
            $summary = $payload['summary'] ?? [];
            $cols = 6;
            $rows = [
                $pad($cols, [$meta['company_name'] ?? '']),
                $pad($cols, [$meta['title'] ?? '', '', '', '', $meta['date_label'] ?? '']),
                $pad($cols, []),
                $pad($cols, ['SUMMARY']),
                $pad($cols, ['Product', $product['name'] ?? '']),
                $pad($cols, ['Unit', $product['unit'] ?? '']),
                $pad($cols, ['Branch', $payload['branch_label'] ?? 'All branches']),
                $pad($cols, ['Opening (before period)', $summary['opening'] ?? 0]),
                $pad($cols, ['Closing (after period)', $summary['closing'] ?? 0]),
                $pad($cols, ['Stock in (period)', $summary['period_stock_in'] ?? 0]),
                $pad($cols, ['Disburse (period)', $summary['period_disburse'] ?? 0]),
                $pad($cols, []),
            ];

            foreach (['stock_in' => 'STOCK IN', 'disburse' => 'DISBURSE'] as $key => $label) {
                $section = $payload[$key] ?? [];
                $columns = $section['columns'] ?? [];
                $sectionHeaders = array_map(fn ($c) => $c['label'] ?? '', $columns);
                $rows[] = $pad($cols, [$label]);
                $rows[] = $pad($cols, $sectionHeaders);
                foreach ($section['rows'] ?? [] as $sectionRow) {
                    $line = [];
                    foreach ($columns as $col) {
                        $line[] = $sectionRow[$col['key'] ?? ''] ?? '';
                    }
                    $rows[] = $pad($cols, $line);
                }
                $rows[] = $pad($cols, ['Total qty', $section['total'] ?? 0]);
                $rows[] = $pad($cols, []);
            }

            return $rows;
        }

        $columns = $payload['columns'] ?? [];
        $tableHeaders = array_map(fn ($c) => $c['label'] ?? $c['key'] ?? '', $columns);
        $colCount = max(count($tableHeaders), 6);
        $rows = [
            $pad($colCount, [$meta['company_name'] ?? '']),
            $pad($colCount, [$meta['title'] ?? '', '', '', '', $meta['date_label'] ?? '']),
            $pad($colCount, []),
            $pad($colCount, $tableHeaders),
        ];

        foreach ($payload['rows'] ?? [] as $row) {
            $line = [];
            foreach ($columns as $col) {
                $line[] = $row[$col['key'] ?? ''] ?? '';
            }
            $rows[] = $pad($colCount, $line);
        }

        return $rows;
    }
}
