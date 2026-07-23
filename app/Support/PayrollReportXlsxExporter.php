<?php

namespace App\Support;

use App\Services\PayrollReportService;
use Illuminate\Http\Response;
use Shuchkin\SimpleXLSXGen;

class PayrollReportXlsxExporter
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    public static function download(string $filename, string $template, array $payload, array $meta): Response
    {
        $xlsx = match ($template) {
            'salary-sheet', 'salary-sheet-grouped' => self::salarySheetWorkbook($payload, $meta),
            default => self::genericWorkbook($template, $payload, $meta),
        };

        $path = tempnam(sys_get_temp_dir(), 'payroll-xlsx-');
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

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    protected static function salarySheetWorkbook(array $payload, array $meta): SimpleXLSXGen
    {
        if (($payload['template'] ?? '') === 'salary-sheet' && empty($payload['sections'])) {
            $payload['sections'] = [[
                'label' => '',
                'rows' => $payload['rows'] ?? [],
                'totals' => $payload['totals'] ?? null,
            ]];
        }

        $earningHeads = $payload['earning_heads'] ?? [];
        $deductionHeads = $payload['deduction_heads'] ?? [];
        $headLabels = $payload['head_labels'] ?? [];
        $heads = $payload['heads'] ?? [];
        $salaryMonth = (string) ($payload['salary_month'] ?? '');
        $topsheet = ! empty($payload['topsheet']);
        $employeeCols = $topsheet ? 3 : 4;
        $earningCols = count($earningHeads) + 1;
        $deductionCols = count($deductionHeads) + 1;
        $summaryCols = $topsheet ? 1 : 2;
        $totalCols = $employeeCols + $earningCols + $deductionCols + $summaryCols;
        $lastCol = $totalCols - 1;

        $rows = [];
        $merges = [];
        $rowNum = 0;

        $addRow = static function (array $line) use (&$rows, &$rowNum): int {
            $rowNum++;
            $rows[] = $line;

            return $rowNum;
        };

        $addBlank = static function () use (&$rows, &$rowNum): int {
            $rowNum++;
            $rows[] = [];

            return $rowNum;
        };

        $companyName = (string) ($meta['companyName'] ?? '');
        $companyAddress = (string) ($meta['companyAddress'] ?? '');
        $title = (string) ($meta['title'] ?? '');

        if ($companyName !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyName, bold: true, fontSize: 12);
            $r = $addRow($line);
            $merges[] = [0, $lastCol, $r];
        }

        if ($companyAddress !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyAddress, fontSize: 9);
            $r = $addRow($line);
            $merges[] = [0, $lastCol, $r];
        }

        if ($title !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($title, bold: true, fontSize: 10);
            $r = $addRow($line);
            $merges[] = [0, $lastCol, $r];
        }

        $addBlank();

        /** @var PayrollReportService $reportService */
        $reportService = app(PayrollReportService::class);

        foreach ($payload['sections'] ?? [] as $section) {
            $sectionHeads = $section['heads'] ?? $payload['heads'] ?? [];
            $sectionEarningHeads = $section['earning_heads'] ?? $payload['earning_heads'] ?? [];
            $sectionDeductionHeads = $section['deduction_heads'] ?? $payload['deduction_heads'] ?? [];
            $sectionHeadLabels = $section['head_labels'] ?? $payload['head_labels'] ?? [];
            $sectionEarningCols = count($sectionEarningHeads) + 1;
            $sectionDeductionCols = count($sectionDeductionHeads) + 1;
            $sectionTotalCols = $employeeCols + $sectionEarningCols + $sectionDeductionCols + $summaryCols;
            $sectionLastCol = $sectionTotalCols - 1;

            $sectionLabel = (string) ($section['label'] ?? '');
            if ($sectionLabel !== '' || $salaryMonth !== '') {
                $mid = (int) floor($sectionTotalCols / 2);
                $line = array_fill(0, $sectionTotalCols, '');
                if ($sectionLabel !== '') {
                    $line[0] = self::styled($sectionLabel, bold: true, align: 'left', fontSize: 9);
                }
                if ($salaryMonth !== '') {
                    $line[$mid] = self::styled('Salary Month: '.$salaryMonth, bold: true, align: 'right', fontSize: 9);
                }
                $r = $addRow($line);
                if ($sectionLabel !== '') {
                    $merges[] = [0, max(0, $mid - 1), $r];
                }
                if ($salaryMonth !== '') {
                    $merges[] = [$mid, $sectionLastCol, $r];
                }
            }

            $pages = $reportService->paginateSalarySheetSectionPages(
                $section['rows'] ?? [],
                $sectionHeads,
                $section['totals'] ?? null,
            );

            foreach ($pages as $page) {
                $earningStart = $employeeCols;
                $earningEnd = $employeeCols + $sectionEarningCols - 1;
                $deductionStart = $earningEnd + 1;
                $deductionEnd = $deductionStart + $sectionDeductionCols - 1;
                $netCol = $deductionEnd + 1;
                $bankCol = $topsheet ? null : $netCol + 1;

                $category = array_fill(0, $sectionTotalCols, self::styled('', border: false));
                $category[0] = self::styled($topsheet ? 'Branch Info' : 'Employee Info', bold: true, fontSize: 8);
                $category[$earningStart] = self::styled('Salary & Allowance', bold: true, fontSize: 8);
                $category[$deductionStart] = self::styled('Deduction', bold: true, fontSize: 8);
                $category[$netCol] = self::styled('Net Payable', bold: true, fontSize: 8);
                if ($bankCol !== null) {
                    $category[$bankCol] = self::styled('Account No.', bold: true, fontSize: 8);
                }
                $categoryRow = $addRow($category);
                $merges[] = [0, $employeeCols - 1, $categoryRow];
                $merges[] = [$earningStart, $earningEnd, $categoryRow];
                $merges[] = [$deductionStart, $deductionEnd, $categoryRow];

                $headers = [
                    self::styled('SL', bold: true, fontSize: 8),
                    self::styled($topsheet ? 'Branch' : 'Name', bold: true, align: 'left', fontSize: 8),
                ];
                if (! $topsheet) {
                    $headers[] = self::styled('PIN', bold: true, fontSize: 8);
                }
                $headers[] = self::styled($topsheet ? 'Employees' : 'Designation', bold: true, fontSize: 8);
                foreach ($sectionEarningHeads as $head) {
                    $headers[] = self::styled($sectionHeadLabels[$head] ?? $head, bold: true, fontSize: 7);
                }
                $headers[] = self::styled('Gross', bold: true, fontSize: 8);
                foreach ($sectionDeductionHeads as $head) {
                    $headers[] = self::styled($sectionHeadLabels[$head] ?? $head, bold: true, fontSize: 7);
                }
                $headers[] = self::styled('Total Deduction', bold: true, fontSize: 8);
                $headers[] = self::styled('', border: false);
                if (! $topsheet) {
                    $headers[] = self::styled('', border: false);
                }
                $headerRow = $addRow($headers);
                $merges[] = [$netCol, $netCol, $categoryRow, $headerRow];
                if ($bankCol !== null) {
                    $merges[] = [$bankCol, $bankCol, $categoryRow, $headerRow];
                }

                $serialStart = (int) ($page['serial_start'] ?? 0);
                foreach ($page['rows'] ?? [] as $index => $row) {
                    $line = [
                        self::styled((string) ($serialStart + $index + 1), fontSize: 8),
                        self::styled((string) ($row['name'] ?? ''), align: 'left', fontSize: 8),
                    ];
                    if (! $topsheet) {
                        $line[] = self::styled((string) ($row['pin'] ?? ''), fontSize: 8);
                    }
                    $line[] = self::styled((string) ($row['designation'] ?? ''), align: 'left', fontSize: 8);
                    foreach ($sectionEarningHeads as $head) {
                        $line[] = self::styled(self::amt($row['components'][$head] ?? 0), fontSize: 8);
                    }
                    $line[] = self::styled(self::amt($row['gross'] ?? 0), fontSize: 8);
                    foreach ($sectionDeductionHeads as $head) {
                        $line[] = self::styled(self::amt($row['components'][$head] ?? 0), fontSize: 8);
                    }
                    $line[] = self::styled(self::amt($row['deduction'] ?? 0), fontSize: 8);
                    $line[] = self::styled(self::amt($row['net'] ?? 0), fontSize: 8);
                    if (! $topsheet) {
                        $line[] = self::styled((string) ($row['account_no'] ?? ''), align: 'left', fontSize: 8);
                    }
                    $addRow($line);
                }

                $totals = $page['totals'] ?? null;
                $totalsLabel = (string) ($page['totals_label'] ?? 'Total');
                if ($totals && ($page['rows'] ?? []) !== []) {
                    $line = array_fill(0, $sectionTotalCols, self::styled('', border: true));
                    $line[0] = self::styled($totalsLabel, bold: true, align: 'right', fontSize: 8);
                    $col = $employeeCols;
                    foreach ($sectionEarningHeads as $head) {
                        $line[$col++] = self::styled(self::amt($totals['components'][$head] ?? 0), bold: true, fontSize: 8);
                    }
                    $line[$col++] = self::styled(self::amt($totals['gross'] ?? 0), bold: true, fontSize: 8);
                    foreach ($sectionDeductionHeads as $head) {
                        $line[$col++] = self::styled(self::amt($totals['components'][$head] ?? 0), bold: true, fontSize: 8);
                    }
                    $line[$col++] = self::styled(self::amt($totals['deduction'] ?? 0), bold: true, fontSize: 8);
                    $line[$col++] = self::styled(self::amt($totals['net'] ?? 0), bold: true, fontSize: 8);
                    if (! $topsheet) {
                        $line[$col] = self::styled('', border: true);
                    }
                    $r = $addRow($line);
                    $merges[] = [0, $employeeCols - 1, $r];

                    if ($totalsLabel === 'Total') {
                        $line = array_fill(0, $sectionTotalCols, self::styled('', border: true));
                        $line[0] = self::styled(
                            'In Words: '.AmountInWords::taka($totals['net'] ?? 0),
                            bold: true,
                            align: 'left',
                            fontSize: 8,
                        );
                        $r = $addRow($line);
                        $merges[] = [0, $sectionLastCol, $r];
                    }
                }

                $addBlank();
            }

            $addBlank();
        }

        $xlsx = SimpleXLSXGen::create($title ?: 'Payroll Report');
        $xlsx->setAuthor('HRM System')->addSheet($rows, 'Salary Sheet');

        foreach ($merges as $merge) {
            [$fromCol, $toCol, $fromRow] = $merge;
            $toRow = $merge[3] ?? $fromRow;
            $xlsx->mergeCells(self::cellRef($fromCol, $fromRow).':'.self::cellRef($toCol, $toRow));
        }

        self::setSalarySheetColumnWidths($xlsx, $totalCols);

        return $xlsx;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    protected static function genericWorkbook(string $template, array $payload, array $meta): SimpleXLSXGen
    {
        [$headers, $dataRows] = PayrollReportCsvExporter::rowsFromPayload($template, $payload);
        $rows = [];
        $merges = [];
        $totalCols = max(1, count($headers));
        $lastCol = $totalCols - 1;
        $rowNum = 0;

        $push = static function (array $line) use (&$rows, &$rowNum): int {
            $rowNum++;
            $rows[] = $line;

            return $rowNum;
        };

        $companyName = (string) ($meta['companyName'] ?? '');
        $companyAddress = (string) ($meta['companyAddress'] ?? '');
        $title = (string) ($meta['title'] ?? '');

        if ($companyName !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyName, bold: true, fontSize: 12);
            $r = $push($line);
            $merges[] = [0, $lastCol, $r];
        }

        if ($companyAddress !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyAddress, fontSize: 9);
            $r = $push($line);
            $merges[] = [0, $lastCol, $r];
        }

        if ($title !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($title, bold: true, fontSize: 10);
            $r = $push($line);
            $merges[] = [0, $lastCol, $r];
        }

        $rowNum++;
        $rows[] = [];

        $headerRow = [];
        foreach ($headers as $header) {
            $headerRow[] = self::styled((string) $header, bold: true, fontSize: 9);
        }
        $push($headerRow);

        foreach ($dataRows as $dataRow) {
            $line = [];
            foreach ($dataRow as $value) {
                $line[] = self::styled((string) $value, align: is_numeric($value) ? 'center' : 'left', fontSize: 9);
            }
            $push($line);
        }

        $xlsx = SimpleXLSXGen::create($title ?: 'Payroll Report');
        $xlsx->setAuthor('HRM System')->addSheet($rows, 'Report');

        foreach ($merges as [$fromCol, $toCol, $row]) {
            $xlsx->mergeCells(self::cellRef($fromCol, $row).':'.self::cellRef($toCol, $row));
        }

        for ($i = 0; $i < $totalCols; $i++) {
            $xlsx->setColWidth(self::colLetter($i), 14);
        }

        return $xlsx;
    }

    protected static function setSalarySheetColumnWidths(SimpleXLSXGen $xlsx, int $totalCols): void
    {
        $lastCol = max(0, $totalCols - 1);

        for ($i = 0; $i < $totalCols; $i++) {
            $width = match (true) {
                $i === 0 => 5,
                $i === 1 => 22,
                $i === 2 => 10,
                $i === 3 => 16,
                $i === $lastCol => 18,
                default => 10,
            };
            $xlsx->setColWidth(self::colLetter($i), $width);
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected static function nameWithPin(array $row): string
    {
        $name = trim((string) ($row['name'] ?? ''));
        $pin = trim((string) ($row['pin'] ?? ''));

        if ($name !== '' && $pin !== '') {
            return sprintf('%s (%s)', $name, $pin);
        }

        return $name !== '' ? $name : $pin;
    }

    protected static function amt(mixed $value): string
    {
        $n = (int) round((float) $value);

        return $n === 0 ? '-' : (string) $n;
    }

    protected static function styled(
        string $text,
        bool $bold = false,
        string $align = 'center',
        bool $border = true,
        int $fontSize = 9,
    ): string {
        $borderAttr = $border ? ' border="thin thin thin thin"' : '';
        $inner = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $tags = '<style'.$borderAttr.' font-size="'.$fontSize.'">'.$inner.'</style>';

        if ($bold) {
            $tags = '<b>'.$tags.'</b>';
        }

        return match ($align) {
            'left' => '<left>'.$tags.'</left>',
            'right' => '<right>'.$tags.'</right>',
            default => '<center>'.$tags.'</center>',
        };
    }

    protected static function cellRef(int $columnIndex, int $rowNumber): string
    {
        return self::colLetter($columnIndex).$rowNumber;
    }

    protected static function colLetter(int $columnIndex): string
    {
        $letters = '';
        $n = $columnIndex + 1;
        while ($n > 0) {
            $n--;
            $letters = chr(65 + ($n % 26)).$letters;
            $n = intdiv($n, 26);
        }

        return $letters;
    }
}
