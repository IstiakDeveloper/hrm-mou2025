<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeLoanReportCsvExporter
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
        if ($template === 'loan-grouped') {
            $columns = $payload['group_columns'] ?? [
                ['key' => 'title', 'label' => 'Group'],
                ['key' => 'loan_count', 'label' => 'Loans'],
                ['key' => 'employee_count', 'label' => 'Employees'],
                ['key' => 'total_principal', 'label' => 'Principal'],
                ['key' => 'total_outstanding', 'label' => 'Outstanding'],
            ];
            $headers = array_map(fn ($c) => $c['label'] ?? $c['key'] ?? '', $columns);
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
                foreach ($columns as $i => $col) {
                    $key = $col['key'] ?? '';
                    $line[] = $i === 0 ? ($payload['totals']['title'] ?? 'Grand total') : ($payload['totals'][$key] ?? '');
                }
                $rows[] = $line;
            }

            return [$headers, $rows];
        }

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
