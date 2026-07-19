<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollReportCsvExporter
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
        return match ($template) {
            'grade-step' => self::gradeStepRows($payload),
            'salary-sheet' => self::salarySheetRows($payload),
            'salary-sheet-grouped' => self::salarySheetGroupedRows($payload),
            'bank-advice' => self::bankAdviceRows($payload),
            'head-register' => self::headRegisterRows($payload),
            'advance-salary' => self::advanceSalaryRows($payload),
            'bonus-register' => self::bonusRegisterRows($payload),
            'final-payment' => self::finalPaymentRows($payload),
            'salary-certificate' => self::salaryCertificateRows($payload),
            default => [[], []],
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function gradeStepRows(array $payload): array
    {
        $heads = $payload['heads'] ?? [];
        $headers = array_merge(['Payscale', 'Grade', 'Step', 'Basic'], $heads, ['Gross', 'Deduction', 'Net']);
        $rows = [];
        foreach ($payload['rows'] ?? [] as $row) {
            $line = [
                $row['payscale'] ?? '',
                $row['grade'] ?? '',
                $row['step'] ?? '',
                $row['basic'] ?? 0,
            ];
            foreach ($heads as $head) {
                $line[] = $row['components'][$head] ?? 0;
            }
            $line[] = $row['gross'] ?? 0;
            $line[] = $row['deduction'] ?? 0;
            $line[] = $row['net'] ?? 0;
            $rows[] = $line;
        }

        return [$headers, $rows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function salarySheetRows(array $payload): array
    {
        $earningHeads = $payload['earning_heads'] ?? [];
        $deductionHeads = $payload['deduction_heads'] ?? [];
        $headLabels = $payload['head_labels'] ?? [];
        $earningHeaders = array_map(fn (string $head) => $headLabels[$head] ?? $head, $earningHeads);
        $deductionHeaders = array_map(fn (string $head) => $headLabels[$head] ?? $head, $deductionHeads);
        $headers = array_merge(
            ['#', 'Name (Pin)', 'Designation', 'Grade (Step)'],
            $earningHeaders,
            ['Gross'],
            $deductionHeaders,
            ['Ded.'],
            ['Net', 'Bank Account No.']
        );
        $rows = [];
        foreach ($payload['rows'] ?? [] as $index => $row) {
            $rows[] = self::salarySheetDataLine($row, $earningHeads, $deductionHeads, $index + 1);
        }

        return [$headers, $rows];
    }

    protected static function salarySheetRound(mixed $value): int
    {
        return (int) round((float) $value);
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  list<string>  $earningHeads
     * @param  list<string>  $deductionHeads
     * @return list<string|int|float|null>
     */
    protected static function salarySheetDataLine(array $row, array $earningHeads, array $deductionHeads, int $serial = 1): array
    {
        $line = [
            $serial,
            self::salarySheetNameWithPin($row),
            $row['designation'] ?? '',
            $row['grade_step'] ?? '',
        ];
        foreach ($earningHeads as $head) {
            $line[] = self::salarySheetRound($row['components'][$head] ?? 0);
        }
        $line[] = self::salarySheetRound($row['gross'] ?? 0);
        foreach ($deductionHeads as $head) {
            $line[] = self::salarySheetRound($row['components'][$head] ?? 0);
        }
        $line[] = self::salarySheetRound($row['deduction'] ?? 0);
        $line[] = self::salarySheetRound($row['net'] ?? 0);
        $line[] = $row['account_no'] ?? '';

        return $line;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected static function salarySheetNameWithPin(array $row): string
    {
        $name = trim((string) ($row['name'] ?? ''));
        $pin = trim((string) ($row['pin'] ?? ''));

        if ($name !== '' && $pin !== '') {
            return sprintf('%s (%s)', $name, $pin);
        }

        return $name !== '' ? $name : $pin;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function salarySheetGroupedRows(array $payload): array
    {
        [$headers, $rows] = self::salarySheetRows([
            'earning_heads' => $payload['earning_heads'] ?? [],
            'deduction_heads' => $payload['deduction_heads'] ?? [],
            'heads' => $payload['heads'] ?? [],
            'head_labels' => $payload['head_labels'] ?? [],
            'rows' => [],
        ]);
        $earningHeads = $payload['earning_heads'] ?? [];
        $deductionHeads = $payload['deduction_heads'] ?? [];
        foreach ($payload['sections'] ?? [] as $section) {
            $rows[] = array_merge([$section['label'] ?? 'Section'], array_fill(0, count($headers) - 1, ''));
            foreach ($section['rows'] ?? [] as $index => $row) {
                $rows[] = self::salarySheetDataLine($row, $earningHeads, $deductionHeads, $index + 1);
            }
        }

        return [$headers, $rows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function bankAdviceRows(array $payload): array
    {
        $headers = ['PIN', 'Name', 'Branch', 'Bank', 'Branch Name', 'Account No', 'Type', 'Amount'];
        $rows = [];
        foreach ($payload['rows'] ?? [] as $row) {
            $rows[] = [
                $row['pin'] ?? '',
                $row['name'] ?? '',
                $row['branch'] ?? '',
                $row['bank_name'] ?? '',
                $row['bank_branch'] ?? '',
                $row['account_no'] ?? '',
                $row['account_type'] ?? '',
                $row['amount'] ?? 0,
            ];
        }

        return [$headers, $rows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function headRegisterRows(array $payload): array
    {
        $headers = ['PIN', 'Name', 'Designation', 'Branch', 'Period', 'Component', 'Amount'];
        $rows = [];
        foreach ($payload['rows'] ?? [] as $row) {
            $rows[] = [
                $row['pin'] ?? '',
                $row['name'] ?? '',
                $row['designation'] ?? '',
                $row['branch'] ?? '',
                $row['period'] ?? '',
                $row['head_name'] ?? '',
                $row['amount'] ?? 0,
            ];
        }

        return [$headers, $rows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function advanceSalaryRows(array $payload): array
    {
        $headers = ['PIN', 'Name', 'Designation', 'Branch', 'Period', 'Component', 'Loan Type', 'Amount'];
        $rows = [];
        foreach ($payload['rows'] ?? [] as $row) {
            $rows[] = [
                $row['pin'] ?? '',
                $row['name'] ?? '',
                $row['designation'] ?? '',
                $row['branch'] ?? '',
                $row['period'] ?? '',
                $row['head_name'] ?? '',
                $row['loan_type'] ?? '',
                $row['amount'] ?? 0,
            ];
        }

        return [$headers, $rows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function bonusRegisterRows(array $payload): array
    {
        $headers = ['PIN', 'Name', 'Branch', 'Basic', 'Bonus', 'Rate %', 'Amount'];
        $rows = [];
        foreach ($payload['rows'] ?? [] as $row) {
            $rows[] = [
                $row['pin'] ?? '',
                $row['name'] ?? '',
                $row['branch'] ?? '',
                $row['basic'] ?? 0,
                $row['bonus_name'] ?? '',
                $row['percentage'] ?? '',
                $row['amount'] ?? 0,
            ];
        }

        return [$headers, $rows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function finalPaymentRows(array $payload): array
    {
        $headers = [
            '#',
            'PIN',
            'Name',
            'Designation',
            'Department',
            'Branch',
            'Separation Date',
            'Payment Date',
            'PF Refund',
            'Gratuity',
            'Gross Payable',
            'Loan Recovery',
            'Net Payable',
            'Status',
        ];
        $rows = [];

        foreach ($payload['rows'] ?? [] as $index => $row) {
            $branch = trim((string) ($row['branch'] ?? ''));
            $branchCode = trim((string) ($row['branch_code'] ?? ''));
            if ($branchCode !== '') {
                $branch .= ($branch !== '' ? ' ' : '')."({$branchCode})";
            }

            $rows[] = [
                $index + 1,
                $row['pin'] ?? '',
                $row['name'] ?? '',
                $row['designation'] ?? '',
                $row['department'] ?? '',
                $branch,
                $row['separation_date'] ?? '',
                $row['payment_date'] ?? '',
                $row['pf_balance'] ?? 0,
                $row['gratuity_amount'] ?? 0,
                $row['gross'] ?? 0,
                $row['loan_outstanding'] ?? 0,
                $row['net_payable'] ?? 0,
                $row['status'] ?? '',
            ];
        }

        $totals = $payload['totals'] ?? [];
        $rows[] = [
            '',
            '',
            'Total',
            '',
            '',
            '',
            '',
            '',
            $totals['pf_balance'] ?? 0,
            $totals['gratuity_amount'] ?? 0,
            $totals['gross'] ?? 0,
            $totals['loan_outstanding'] ?? 0,
            $totals['net_payable'] ?? 0,
            '',
        ];

        return [$headers, $rows];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: list<string>, 1: list<list<string|int|float|null>>}
     */
    protected static function salaryCertificateRows(array $payload): array
    {
        $headers = ['Type', 'Component', 'Amount'];
        $rows = [];
        if (! empty($payload['employee'])) {
            $e = $payload['employee'];
            $rows[] = ['Employee', $e['name'] ?? '', ''];
            $rows[] = ['PIN', $e['pin'] ?? '', ''];
            $rows[] = ['Designation', $e['designation'] ?? '', ''];
            $rows[] = ['Period', $payload['period'] ?? '', ''];
        }
        foreach ($payload['earnings'] ?? [] as $line) {
            $rows[] = ['Earning', $line['name'] ?? '', $line['amount'] ?? 0];
        }
        foreach ($payload['deductions'] ?? [] as $line) {
            $rows[] = ['Deduction', $line['name'] ?? '', $line['amount'] ?? 0];
        }
        $rows[] = ['Net Payable', '', $payload['net'] ?? 0];

        return [$headers, $rows];
    }
}
