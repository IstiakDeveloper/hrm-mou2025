<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

class GratuityReportCsvExporter
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
        if ($template === 'gratuity-rules') {
            $headers = ['SL', 'Minimum years', 'Basic multiplier', 'Description'];
            $rows = [];
            foreach ($payload['rows'] ?? [] as $row) {
                $rows[] = [
                    $row['sl'] ?? '',
                    $row['min_years'] ?? '',
                    $row['multiplier'] ?? '',
                    $row['description'] ?? '',
                ];
            }

            return [$headers, $rows];
        }

        if ($template === 'gratuity-grouped') {
            $headers = ['Group', 'Employees', 'Total basic', 'Total gratuity'];
            $rows = [];
            foreach ($payload['sections'] ?? [] as $section) {
                $rows[] = [
                    $section['title'] ?? '',
                    $section['employee_count'] ?? 0,
                    $section['total_basic'] ?? 0,
                    $section['total_gratuity'] ?? 0,
                ];
            }
            if (! empty($payload['totals'])) {
                $t = $payload['totals'];
                $rows[] = ['Grand total', $t['employee_count'] ?? 0, $t['total_basic'] ?? 0, $t['total_gratuity'] ?? 0];
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
