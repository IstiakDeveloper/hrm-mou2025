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
        $sections = $payload['sections'] ?? [];

        if ($rows === [] && $sections !== []) {
            $rows = collect($sections)->flatMap(fn ($section) => $section['rows'] ?? [])->all();
        }

        $template = $payload['template'] ?? '';
        $firstRow = $rows[0] ?? [];
        $keys = self::keysForPayload($template, $firstRow, $payload);

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
     * @param  array<string, mixed>  $firstRow
     * @return list<string>
     */
    private static function keysForPayload(string $template, array $firstRow, array $payload): array
    {
        if ($firstRow !== []) {
            return array_keys($firstRow);
        }

        $purchaseGroup = $payload['purchase_group'] ?? '';

        return match ($template) {
            'asset-tracking' => ['sl', 'asset_no', 'model_no', 'purchase_date', 'purchase_amount', 'book_value', 'floor', 'room', 'voucher', 'ledger', 'description'],
            'purchase-list' => $purchaseGroup === 'category'
                ? ['category', 'sub_category', 'asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status']
                : ['asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status'],
            'disposal-list' => ['sl', 'category', 'sub_category', 'asset_no', 'branch', 'purchase_date', 'purchase_amount', 'opening_value', 'depreciation', 'disposal_amount', 'closing_value'],
            'depreciation-schedule' => match ($payload['schedule_variant'] ?? '') {
                'audit' => ['sl', 'group_label', 'asset_count', 'cost_opening', 'cost_addition', 'cost_sales_adj', 'cost_closing', 'depreciation_rate', 'dep_opening', 'dep_charged', 'dep_sales_adj', 'dep_closing', 'written_down_value'],
                'summary' => ($payload['schedule_group'] ?? '') === 'category'
                    ? ['sl', 'branch', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day']
                    : ['asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day'],
                default => ($payload['schedule_group'] ?? '') === 'branch'
                    ? ['sub_category', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value']
                    : ['asset_no', 'location', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value'],
            },
            default => [],
        };
    }
}
