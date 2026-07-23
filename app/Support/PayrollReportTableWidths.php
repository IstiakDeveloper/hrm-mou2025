<?php

namespace App\Support;

class PayrollReportTableWidths
{
    /**
     * Data-driven column widths in character units.
     *
     * @param  array<string, mixed>  $payload
     * @param  callable(mixed): string  $fmtAmt
     * @return array{
     *     serial: int,
     *     name: int,
     *     pin: int,
     *     designation: int,
     *     earning: array<string, int>,
     *     gross: int,
     *     deduction: array<string, int>,
     *     ded: int,
     *     net: int,
     *     bank: int,
     * }
     */
    public static function salarySheetData(array $payload, callable $fmtAmt): array
    {
        $rows = $payload['rows'] ?? [];
        $totals = $payload['totals'] ?? null;
        $totalsLabel = (string) ($payload['totals_label'] ?? 'Total');
        $serialStart = (int) ($payload['serial_start'] ?? 0);
        $earningHeads = $payload['earning_heads'] ?? [];
        $deductionHeads = $payload['deduction_heads'] ?? [];

        $serialTexts = [];
        foreach ($rows as $index => $row) {
            $serialTexts[] = (string) ($serialStart + $index + 1);
        }

        $nameTexts = array_map(
            fn (array $row): string => (string) ($row['name'] ?? ''),
            $rows,
        );
        if ($totals) {
            $nameTexts[] = $totalsLabel;
        }

        $pinTexts = array_map(
            fn (array $row): string => (string) ($row['pin'] ?? ''),
            $rows,
        );
        $designationTexts = array_map(
            fn (array $row): string => (string) ($row['designation'] ?? ''),
            $rows,
        );
        $bankTexts = array_map(
            fn (array $row): string => (string) ($row['account_no'] ?? ''),
            $rows,
        );

        $earning = [];
        foreach ($earningHeads as $head) {
            $earning[$head] = self::amountWidth($rows, $totals, $fmtAmt, fn (array $row) => $row['components'][$head] ?? 0);
        }

        $deduction = [];
        foreach ($deductionHeads as $head) {
            $deduction[$head] = self::amountWidth($rows, $totals, $fmtAmt, fn (array $row) => $row['components'][$head] ?? 0);
        }

        return [
            'serial' => self::maxLength($serialTexts, 2),
            'name' => self::maxLength($nameTexts, 4),
            'pin' => self::maxLength($pinTexts, 3),
            'designation' => self::maxLength($designationTexts, 4),
            'earning' => $earning,
            'gross' => self::amountWidth($rows, $totals, $fmtAmt, fn (array $row) => $row['gross'] ?? 0),
            'deduction' => $deduction,
            'ded' => self::amountWidth($rows, $totals, $fmtAmt, fn (array $row) => $row['deduction'] ?? 0),
            'net' => self::amountWidth($rows, $totals, $fmtAmt, fn (array $row) => $row['net'] ?? 0),
            'bank' => self::maxLength($bankTexts, 14),
        ];
    }

    /**
     * Layout widths: data size plus header label room (longest word per label).
     *
     * @param  array<string, mixed>  $payload
     * @param  callable(mixed): string  $fmtAmt
     * @return array{
     *     serial: int,
     *     name: int,
     *     pin: int,
     *     designation: int,
     *     earning: array<string, int>,
     *     gross: int,
     *     deduction: array<string, int>,
     *     ded: int,
     *     net: int,
     *     bank: int,
     * }
     */
    public static function salarySheet(array $payload, callable $fmtAmt): array
    {
        $data = self::salarySheetData($payload, $fmtAmt);
        $headLabels = $payload['head_labels'] ?? [];
        $earningHeads = $payload['earning_heads'] ?? [];
        $deductionHeads = $payload['deduction_heads'] ?? [];
        $topsheet = ! empty($payload['topsheet']);
        $nameHeader = $topsheet ? 'Branch' : 'Name';
        $designationHeader = $topsheet ? 'Employees' : 'Designation';

        $earning = [];
        foreach ($earningHeads as $head) {
            $label = (string) ($headLabels[$head] ?? $head);
            $earning[$head] = self::amountColumnWidth($data['earning'][$head], $label);
        }

        $deduction = [];
        foreach ($deductionHeads as $head) {
            $label = (string) ($headLabels[$head] ?? $head);
            $deduction[$head] = self::amountColumnWidth($data['deduction'][$head], $label);
        }

        return [
            'serial' => self::serialColumnWidth(max($data['serial'], self::headerMinWidth('SL'))),
            'name' => self::textColumnWidth($data['name'], $nameHeader),
            'pin' => $topsheet ? 0 : self::textColumnWidth($data['pin'], 'PIN'),
            'designation' => self::textColumnWidth($data['designation'], $designationHeader),
            'earning' => $earning,
            'gross' => self::amountColumnWidth($data['gross'], 'Gross'),
            'deduction' => $deduction,
            'ded' => self::amountColumnWidth($data['ded'], 'Total Deduction'),
            'net' => self::amountColumnWidth($data['net'], 'Net Payable'),
            'bank' => $topsheet ? 0 : self::textColumnWidth($data['bank'], 'Account No.') + 4,
        ];
    }

    /**
     * Serial (#) column: room for multi-digit row numbers and cell padding.
     */
    public static function serialColumnWidth(int $dataWidth): int
    {
        return max($dataWidth, 3) + 2;
    }

    /**
     * Amount columns: data + totals width, header room, and padding for bold totals row.
     */
    public static function amountColumnWidth(int $dataWidth, string $headerLabel): int
    {
        return max($dataWidth, self::headerMinWidth($headerLabel), 2) + 3;
    }

    /**
     * Text columns: fit data + full header label, with room for left padding.
     */
    public static function textColumnWidth(int $dataWidth, string $headerLabel): int
    {
        return max($dataWidth, self::headerLabelWidth($headerLabel), 4) + 2;
    }

    public static function headerLabelWidth(string $label): int
    {
        $label = trim($label);

        return max(2, mb_strlen($label));
    }

    /**
     * Minimum width so a header can wrap by whole words (not letters).
     */
    public static function headerMinWidth(string $label): int
    {
        $label = trim($label);
        if ($label === '') {
            return 2;
        }

        if (mb_strlen($label) <= 5) {
            return max(2, mb_strlen($label));
        }

        $words = preg_split('/\s+/', $label) ?: [];
        $longest = 0;
        foreach ($words as $word) {
            $word = trim($word, '()');
            if ($word !== '') {
                $longest = max($longest, mb_strlen($word));
            }
        }

        return max(2, $longest);
    }

    /**
     * @param  list<string>  $texts
     */
    public static function maxLength(array $texts, int $floor = 1): int
    {
        $max = $floor;
        foreach ($texts as $text) {
            $text = trim((string) $text);
            if ($text !== '') {
                $max = max($max, mb_strlen($text));
            }
        }

        return $max;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<string, mixed>|null  $totals
     * @param  callable(mixed): string  $fmtAmt
     * @param  callable(array<string, mixed>): mixed  $value
     */
    private static function amountWidth(array $rows, ?array $totals, callable $fmtAmt, callable $value): int
    {
        $texts = array_map(fn (array $row) => $fmtAmt($value($row)), $rows);

        if ($totals) {
            $texts[] = $fmtAmt($value($totals));
        }

        return self::maxLength($texts, 2);
    }

    public static function cssWidth(int $chars, bool $pdf = false): string
    {
        $chars = max(1, $chars);

        if ($pdf) {
            return round($chars * 1.65, 1).'mm';
        }

        return $chars.'ch';
    }

    public static function cssPercent(int $chars, int $totalChars): string
    {
        $totalChars = max(1, $totalChars);

        return round(($chars / $totalChars) * 100, 4).'%';
    }

    /**
     * @param  array{
     *     serial: int,
     *     name: int,
     *     pin: int,
     *     designation: int,
     *     earning: array<string, int>,
     *     gross: int,
     *     deduction: array<string, int>,
     *     ded: int,
     *     net: int,
     *     bank: int,
     * }  $widths
     */
    public static function salarySheetTotalChars(array $widths, array $earningHeads, array $deductionHeads, bool $topsheet = false): int
    {
        $all = [
            $widths['serial'],
            $widths['name'],
            ...($topsheet ? [] : [$widths['pin']]),
            $widths['designation'],
            ...array_values($widths['earning']),
            $widths['gross'],
            ...array_values($widths['deduction']),
            $widths['ded'],
            $widths['net'],
            ...($topsheet ? [] : [$widths['bank']]),
        ];

        return max(1, array_sum($all));
    }

    public static function shouldFillPageWidth(int $dataTotalChars): bool
    {
        $capacity = (int) (config('payroll_reports.print.landscape_page_capacity_ch') ?? 195);

        return $dataTotalChars < $capacity;
    }
}
