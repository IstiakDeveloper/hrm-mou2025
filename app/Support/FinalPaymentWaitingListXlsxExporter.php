<?php

namespace App\Support;

use Illuminate\Http\Response;
use Shuchkin\SimpleXLSXGen;

class FinalPaymentWaitingListXlsxExporter
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    public static function download(string $filename, array $payload, array $meta): Response
    {
        $rows = [];

        // 1. Company Header
        $rows[] = ['<b><center>'.($meta['companyName'] ?? 'MOUSUMI').'</center></b>'];
        if (! empty($meta['companyAddress'])) {
            $rows[] = ['<center>'.$meta['companyAddress'].'</center>'];
        }
        $rows[] = ['<b><center>'.($meta['title'] ?? 'Final Payment Waiting List').'</center></b>'];
        $rows[] = ['<center>Print Date: '.($payload['print_date'] ?? date('d-m-Y h:i A')).' | As of: '.($payload['as_of_date'] ?? date('d-m-Y')).'</center>'];
        $rows[] = [];

        // 2. Table Headers
        $rows[] = [
            '<b>SL</b>',
            '<b>Pin</b>',
            '<b>Name (English)</b>',
            '<b>Designation</b>',
            '<b>Left Date</b>',
            '<b>Duration from Left Date</b>',
            '<b>Left Reason</b>',
            '<b>Left Branch</b>',
            '<b>Clearance Status</b>',
            '<b>Payment Status</b>',
            '<b>Payment Date</b>',
            '<b>Payment Amount</b>',
        ];

        // 3. Data Rows
        foreach ($payload['rows'] ?? [] as $r) {
            $rows[] = [
                $r['sl'],
                $r['pin'],
                $r['name'],
                $r['designation'],
                $r['left_date'],
                $r['duration_from_left'],
                $r['left_reason'],
                $r['left_branch'],
                $r['clearance_status'],
                $r['payment_status'],
                $r['payment_date'],
                $r['payment_amount'] !== null ? number_format((float) $r['payment_amount'], 2, '.', '') : '0.00',
            ];
        }

        // 4. Grand Total Row
        $summary = $payload['summary'] ?? [];
        $totalAmount = $summary['total_amount'] ?? 0.0;
        $totalStaff = $summary['total_staff'] ?? count($payload['rows'] ?? []);

        $rows[] = [
            '<b>Total Staff: '.$totalStaff.'</b>',
            '', '', '', '', '', '', '', '', '',
            '<b>Grand Total:</b>',
            '<b>'.number_format((float) $totalAmount, 2, '.', '').'</b>',
        ];

        $xlsx = SimpleXLSXGen::fromArray($rows);

        $path = tempnam(sys_get_temp_dir(), 'sf-fp-xlsx-');
        if ($path === false) {
            abort(500, 'Could not create export file.');
        }

        $xlsx->saveAs($path);
        $content = file_get_contents($path);
        @unlink($path);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
