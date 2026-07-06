<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

class PfReportCsvExporter
{
    /**
     * @param  list<string>  $headers
     * @param  list<list<string|int|float|null>>  $rows
     */
    public static function download(string $filename, array $headers, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, $headers);
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
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    public static function rowsFromPayload(string $template, array $payload): array
    {
        if ($template === 'pf-grouped') {
            $columns = $payload['group_columns'] ?? [];
            $headers = array_map(function (array $col) {
                $label = $col['label'] ?? $col['key'] ?? '';
                $group = $col['group'] ?? null;

                return $group ? "{$group} — {$label}" : $label;
            }, $columns);
            $rows = [];
            foreach ($payload['sections'] ?? [] as $section) {
                $line = [];
                foreach ($columns as $col) {
                    $line[] = $section[$col['key'] ?? ''] ?? '';
                }
                $rows[] = $line;
            }
            if (! empty($payload['totals'])) {
                $line = [];
                foreach ($columns as $col) {
                    $key = $col['key'] ?? '';
                    if ($key === 'branch') {
                        $line[] = $payload['totals']['title'] ?? 'Grand total';
                    } else {
                        $line[] = $payload['totals'][$key] ?? '';
                    }
                }
                $rows[] = $line;
            }

            return [$headers, $rows];
        }

        if ($template === 'pf-ledger' && ! empty($payload['employee'])) {
            $employee = $payload['employee'];
            $headers = ['Field', 'Value'];
            $rows = [
                ['Employee', $employee['label'] ?? ''],
                ['PIN', $employee['pin'] ?? ''],
                ['Branch', $employee['branch'] ?? ''],
                ['Department', $employee['department'] ?? ''],
                ['Current balance', $employee['pf_balance'] ?? ''],
                ['Own contribution', $employee['own_contribution'] ?? ''],
                ['Org contribution', $employee['org_contribution'] ?? ''],
                ['', ''],
            ];
            [$tableHeaders, $tableRows] = self::tableRows($payload);
            $rows[] = $tableHeaders;
            foreach ($tableRows as $tableRow) {
                $rows[] = $tableRow;
            }

            return [$headers, $rows];
        }

        return self::tableRows($payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function tableRows(array $payload): array
    {
        $columns = $payload['columns'] ?? [];
        $headers = array_map(fn ($c) => $c['label'] ?? $c['key'] ?? '', $columns);
        $rows = [];
        foreach ($payload['rows'] ?? [] as $row) {
            $line = [];
            foreach ($columns as $col) {
                $key = $col['key'] ?? '';
                $line[] = $row[$key] ?? '';
            }
            $rows[] = $line;
        }

        if (! empty($payload['totals'])) {
            $line = [];
            foreach ($columns as $i => $col) {
                $key = $col['key'] ?? '';
                $line[] = $i === 0 ? 'Total' : ($payload['totals'][$key] ?? '');
            }
            $rows[] = $line;
        }

        return [$headers, $rows];
    }
}
