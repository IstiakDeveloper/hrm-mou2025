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
        $heads = $payload['heads'] ?? [];
        $headers = array_merge(['PIN', 'Name', 'Designation', 'Branch', 'Grade', 'Step'], $heads, ['Gross', 'Deduction', 'Net']);
        $rows = [];
        foreach ($payload['rows'] ?? [] as $row) {
            $line = [
                $row['pin'] ?? '',
                $row['name'] ?? '',
                $row['designation'] ?? '',
                $row['branch'] ?? '',
                $row['grade'] ?? '',
                $row['step'] ?? '',
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
    protected static function salarySheetGroupedRows(array $payload): array
    {
        [$headers, $rows] = self::salarySheetRows([
            'heads' => $payload['heads'] ?? [],
            'rows' => [],
        ]);
        foreach ($payload['sections'] ?? [] as $section) {
            $rows[] = array_merge([$section['label'] ?? 'Section'], array_fill(0, count($headers) - 1, ''));
            foreach ($section['rows'] ?? [] as $row) {
                $line = [
                    $row['pin'] ?? '',
                    $row['name'] ?? '',
                    $row['designation'] ?? '',
                    $row['branch'] ?? '',
                    $row['grade'] ?? '',
                    $row['step'] ?? '',
                ];
                foreach ($payload['heads'] ?? [] as $head) {
                    $line[] = $row['components'][$head] ?? 0;
                }
                $line[] = $row['gross'] ?? 0;
                $line[] = $row['deduction'] ?? 0;
                $line[] = $row['net'] ?? 0;
                $rows[] = $line;
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
