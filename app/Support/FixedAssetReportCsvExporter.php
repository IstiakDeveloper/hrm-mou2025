<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

class FixedAssetReportCsvExporter
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
    public static function rowsFromPayload(array $payload): array
    {
        $headers = $payload['headers'] ?? [];
        $rows = $payload['rows'] ?? [];
        $template = $payload['template'] ?? '';

        $keys = match ($template) {
            'asset-tracking' => ['asset_tag', 'name', 'branch', 'category', 'status', 'custodian', 'serial_number', 'purchase_date', 'book_value'],
            'vendor-list' => ['vendor', 'asset_count', 'total_purchase'],
            'purchase-list' => ['asset_tag', 'name', 'branch', 'category', 'purchase_date', 'purchase_cost', 'vendor', 'invoice_no'],
            'repair-list' => ['maintenance_date', 'asset_tag', 'branch', 'maintenance_type', 'status', 'description', 'cost', 'service_provider'],
            'transfer-log' => ['transfer_date', 'asset_tag', 'asset_name', 'from_branch', 'to_branch', 'notes'],
            'salvaged-list' => ['asset_tag', 'name', 'branch', 'category', 'purchase_cost', 'salvage_value', 'book_value', 'status'],
            'disposal-list' => ['disposal_date', 'asset_tag', 'branch', 'category', 'disposal_method', 'disposal_amount', 'reason'],
            'depreciation-schedule' => self::scheduleKeys($payload),
            'depreciation-schedule-summary' => ['group_label', 'asset_count', 'total_purchase', 'total_accumulated', 'total_book_value'],
            'branch-summary' => ['branch', 'asset_count', 'total_purchase', 'total_book_value'],
            'category-summary' => ['code', 'category', 'asset_count', 'total_book_value'],
            'asset-register' => ['asset_tag', 'name', 'branch', 'category', 'status', 'custodian', 'book_value'],
            'depreciation-summary' => ['asset_tag', 'branch', 'depreciation_amount', 'book_value_after'],
            default => [],
        };

        if ($keys === []) {
            return [$headers, []];
        }

        $csvRows = collect($rows)->map(function ($r) use ($keys) {
            return collect($keys)->map(fn ($k) => $r[$k] ?? '')->all();
        })->all();

        return [$headers, $csvRows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<string>
     */
    private static function scheduleKeys(array $payload): array
    {
        if (($payload['schedule_variant'] ?? '') === 'audit') {
            return [
                'asset_tag', 'name', 'group_label', 'serial_number', 'vendor', 'invoice_no', 'purchase_date',
                'purchase_cost', 'salvage_value', 'useful_life_years', 'accumulated_depreciation', 'book_value', 'monthly_depreciation',
            ];
        }

        return [
            'asset_tag', 'name', 'group_label', 'purchase_cost', 'salvage_value', 'useful_life_years',
            'accumulated_depreciation', 'book_value', 'monthly_depreciation',
        ];
    }
}
