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
        if ($template === 'loan-installment-ledger') {
            $columns = [
                ['key' => 'scheduled_month', 'label' => 'Scheduled month'],
                ['key' => 'principal_amount', 'label' => 'Sch. PR'],
                ['key' => 'service_charge_amount', 'label' => 'Sch. SC'],
                ['key' => 'total_amount', 'label' => 'Sch. Total'],
                ['key' => 'installment_no', 'label' => 'Install no'],
                ['key' => 'payment_month', 'label' => 'Payment month'],
                ['key' => 'payment_branch', 'label' => 'Payment branch'],
                ['key' => 'paid_principal_amount', 'label' => 'Coll. PR'],
                ['key' => 'paid_service_charge_amount', 'label' => 'Coll. SC'],
                ['key' => 'paid_amount', 'label' => 'Coll. Total'],
                ['key' => 'balance_principal', 'label' => 'Bal. PR'],
                ['key' => 'balance_service_charge', 'label' => 'Bal. SC'],
                ['key' => 'balance_total', 'label' => 'Bal. Total'],
                ['key' => 'status_label', 'label' => 'Status'],
            ];
            $headers = array_map(fn ($c) => $c['label'] ?? $c['key'] ?? '', $columns);
            $rows = [];
            foreach ($payload['sections'] ?? [] as $section) {
                $rows[] = [($section['title'] ?? 'Loan').' ('.($section['loan_type'] ?? '').')'];
                while (count($rows[count($rows) - 1]) < count($headers)) {
                    $rows[count($rows) - 1][] = '';
                }
                foreach ($section['rows'] ?? [] as $row) {
                    $line = [];
                    foreach ($columns as $col) {
                        $key = $col['key'] ?? '';
                        $line[] = $row[$key] ?? '';
                    }
                    $rows[] = $line;
                }
                if (! empty($section['totals'])) {
                    $line = ['Total'];
                    foreach (array_slice($columns, 1) as $col) {
                        $key = $col['key'] ?? '';
                        $line[] = $section['totals'][$key] ?? '';
                    }
                    $rows[] = $line;
                }
                $rows[] = array_fill(0, count($headers), '');
            }

            return [$headers, $rows];
        }

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

        if ($template === 'loan-statement-employee') {
            $headers = [
                'Employee ID', 'Employee Name', 'Policy',
                'Opening PR', 'Opening SC', 'Opening Total',
                'Disburse PR', 'Disburse SC', 'Disburse Total',
                'Collection PR', 'Collection SC', 'Collection Total',
                'Full Paid Loanee', 'Rebate Amt', 'Transfer In', 'Transfer Out',
                'Closing PR', 'Closing SC', 'Closing Total',
            ];
            $rows = [];
            foreach ($payload['rows'] ?? [] as $row) {
                $rows[] = [
                    $row['pin'] ?? '',
                    $row['name'] ?? '',
                    $row['policy'] ?? '',
                    $row['open_pr'] ?? '',
                    $row['open_sc'] ?? '',
                    $row['open_total'] ?? '',
                    $row['disburse_pr'] ?? '',
                    $row['disburse_sc'] ?? '',
                    $row['disburse_total'] ?? '',
                    $row['coll_pr'] ?? '',
                    $row['coll_sc'] ?? '',
                    $row['coll_total'] ?? '',
                    $row['full_paid_loanee'] ?? '',
                    $row['rebate_amount'] ?? '',
                    $row['transfer_in'] ?? '',
                    $row['transfer_out'] ?? '',
                    $row['close_pr'] ?? '',
                    $row['close_sc'] ?? '',
                    $row['close_total'] ?? '',
                ];
            }
            if (! empty($payload['totals'])) {
                $t = $payload['totals'];
                $rows[] = [
                    'Total', '', '',
                    $t['open_pr'] ?? '', $t['open_sc'] ?? '', $t['open_total'] ?? '',
                    $t['disburse_pr'] ?? '', $t['disburse_sc'] ?? '', $t['disburse_total'] ?? '',
                    $t['coll_pr'] ?? '', $t['coll_sc'] ?? '', $t['coll_total'] ?? '',
                    $t['full_paid_loanee'] ?? '', $t['rebate_amount'] ?? '',
                    $t['transfer_in'] ?? '', $t['transfer_out'] ?? '',
                    $t['close_pr'] ?? '', $t['close_sc'] ?? '', $t['close_total'] ?? '',
                ];
            }

            return [$headers, $rows];
        }

        if ($template === 'loan-collection-register') {
            $headers = [
                'Employee ID', 'Employee Name', 'Policy', 'Disburse Date', 'Disburse Amt', 'Install Amt',
                'Opening PR', 'Opening SC', 'Opening Total',
                'Collection PR', 'Collection SC', 'Collection Total',
                'Rebate Amount',
                'Balance PR', 'Balance SC', 'Balance Total',
            ];
            $rows = [];
            foreach ($payload['rows'] ?? [] as $row) {
                $rows[] = [
                    $row['pin'] ?? '',
                    $row['name'] ?? '',
                    $row['policy'] ?? '',
                    $row['disburse_date'] ?? '',
                    $row['disburse_amount'] ?? '',
                    $row['install_amount'] ?? '',
                    $row['open_pr'] ?? '',
                    $row['open_sc'] ?? '',
                    $row['open_total'] ?? '',
                    $row['coll_pr'] ?? '',
                    $row['coll_sc'] ?? '',
                    $row['coll_total'] ?? '',
                    $row['rebate_amount'] ?? '',
                    $row['close_pr'] ?? '',
                    $row['close_sc'] ?? '',
                    $row['close_total'] ?? '',
                ];
            }
            if (! empty($payload['totals'])) {
                $t = $payload['totals'];
                $rows[] = [
                    'Total', '', '', '', $t['disburse_amount'] ?? '', $t['install_amount'] ?? '',
                    $t['open_pr'] ?? '', $t['open_sc'] ?? '', $t['open_total'] ?? '',
                    $t['coll_pr'] ?? '', $t['coll_sc'] ?? '', $t['coll_total'] ?? '',
                    $t['rebate_amount'] ?? '',
                    $t['close_pr'] ?? '', $t['close_sc'] ?? '', $t['close_total'] ?? '',
                ];
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
