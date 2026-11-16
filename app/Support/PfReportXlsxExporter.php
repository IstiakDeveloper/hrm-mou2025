<?php

namespace App\Support;

use Illuminate\Http\Response;
use Shuchkin\SimpleXLSXGen;

class PfReportXlsxExporter
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    public static function download(string $filename, string $template, array $payload, array $meta): Response
    {
        $xlsx = self::isBranchBalanceGrouped($payload)
            ? self::branchBalanceWorkbook($payload, $meta)
            : self::genericWorkbook($template, $payload, $meta);

        $path = tempnam(sys_get_temp_dir(), 'pf-xlsx-');
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
     */
    public static function isBranchBalanceGrouped(array $payload): bool
    {
        return ($payload['template'] ?? '') === 'pf-grouped'
            && ! empty($payload['header_groups'])
            && ! empty($payload['group_columns']);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    protected static function branchBalanceWorkbook(array $payload, array $meta): SimpleXLSXGen
    {
        $columns = $payload['group_columns'] ?? [];
        $childColumns = array_values(array_filter($columns, fn (array $col) => ! empty($col['group'])));
        $totalCols = count($columns);
        $lastCol = max(0, $totalCols - 1);
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
        $periodLabel = (string) ($meta['periodLabel'] ?? '');

        if ($companyName !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyName, bold: true, fontSize: 12);
            $r = $addRow($line);
            $merges[] = [0, $lastCol, $r, $r];
        }

        if ($companyAddress !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyAddress, fontSize: 9);
            $r = $addRow($line);
            $merges[] = [0, $lastCol, $r, $r];
        }

        if ($title !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($title, bold: true, fontSize: 10);
            $r = $addRow($line);
            $merges[] = [0, $lastCol, $r, $r];
        }

        if ($periodLabel !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($periodLabel, fontSize: 9);
            $r = $addRow($line);
            $merges[] = [0, $lastCol, $r, $r];
        }

        $addBlank();

        $parentRow = $addRow(self::branchBalanceParentHeaderRow($columns));
        $childRow = $addRow(self::branchBalanceChildHeaderRow($columns, $childColumns));

        foreach ([0, 1, 2, $lastCol] as $col) {
            $merges[] = [$col, $col, $parentRow, $childRow];
        }
        $merges[] = [3, 5, $parentRow, $parentRow];
        $merges[] = [6, 8, $parentRow, $parentRow];

        foreach ($payload['sections'] ?? [] as $section) {
            $line = [];
            foreach ($columns as $col) {
                $key = $col['key'] ?? '';
                $value = $section[$key] ?? '';
                $line[] = ! empty($col['numeric'])
                    ? self::styled(self::amt($value), fontSize: 8)
                    : self::styled((string) $value, align: $key === 'branch' ? 'left' : 'center', fontSize: 8);
            }
            $addRow($line);
        }

        $totals = $payload['totals'] ?? null;
        if ($totals) {
            $line = [];
            foreach ($columns as $col) {
                $key = $col['key'] ?? '';
                if ($key === 'branch') {
                    $line[] = self::styled((string) ($totals['title'] ?? 'Grand total'), bold: true, align: 'left', fontSize: 8);
                } elseif (! empty($col['numeric'])) {
                    $line[] = self::styled(self::amt($totals[$key] ?? 0), bold: true, fontSize: 8);
                } else {
                    $line[] = self::styled((string) ($totals[$key] ?? ''), bold: true, fontSize: 8);
                }
            }
            $addRow($line);
        }

        $xlsx = SimpleXLSXGen::create($title ?: 'PF Report');
        $xlsx->setAuthor('HRM System')->addSheet($rows, 'PF Branch Balance');

        foreach ($merges as $merge) {
            [$fromCol, $toCol, $fromRow, $toRow] = $merge;
            $xlsx->mergeCells(
                self::cellRef($fromCol, $fromRow).':'.self::cellRef($toCol, $toRow)
            );
        }

        self::setBranchBalanceColumnWidths($xlsx, $totalCols);

        return $xlsx;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @return list<string>
     */
    protected static function branchBalanceParentHeaderRow(array $columns): array
    {
        $line = array_fill(0, count($columns), self::styled('', border: false));

        foreach ($columns as $index => $col) {
            if (! empty($col['group'])) {
                continue;
            }

            $line[$index] = self::styled((string) ($col['label'] ?? ''), bold: true, fontSize: 8);
        }

        $line[3] = self::styled('Own', bold: true, fontSize: 8);
        $line[6] = self::styled('Organization', bold: true, fontSize: 8);

        return $line;
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @param  list<array<string, mixed>>  $childColumns
     * @return list<string>
     */
    protected static function branchBalanceChildHeaderRow(array $columns, array $childColumns): array
    {
        $line = array_fill(0, count($columns), self::styled('', border: false));
        $childIndex = 0;

        foreach ($columns as $index => $col) {
            if (empty($col['group'])) {
                continue;
            }

            $line[$index] = self::styled(
                (string) ($childColumns[$childIndex]['label'] ?? $col['label'] ?? ''),
                bold: true,
                fontSize: 8,
            );
            $childIndex++;
        }

        return $line;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $meta
     */
    protected static function genericWorkbook(string $template, array $payload, array $meta): SimpleXLSXGen
    {
        [$headers, $dataRows] = PfReportCsvExporter::rowsFromPayload($template, $payload);
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
        $periodLabel = (string) ($meta['periodLabel'] ?? '');

        if ($companyName !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyName, bold: true, fontSize: 12);
            $r = $push($line);
            $merges[] = [0, $lastCol, $r, $r];
        }

        if ($companyAddress !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($companyAddress, fontSize: 9);
            $r = $push($line);
            $merges[] = [0, $lastCol, $r, $r];
        }

        if ($title !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($title, bold: true, fontSize: 10);
            $r = $push($line);
            $merges[] = [0, $lastCol, $r, $r];
        }

        if ($periodLabel !== '') {
            $line = array_fill(0, $totalCols, '');
            $line[0] = self::styled($periodLabel, fontSize: 9);
            $r = $push($line);
            $merges[] = [0, $lastCol, $r, $r];
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

        $xlsx = SimpleXLSXGen::create($title ?: 'PF Report');
        $xlsx->setAuthor('HRM System')->addSheet($rows, 'Report');

        foreach ($merges as [$fromCol, $toCol, $fromRow, $toRow]) {
            $xlsx->mergeCells(
                self::cellRef($fromCol, $fromRow).':'.self::cellRef($toCol, $toRow)
            );
        }

        for ($i = 0; $i < $totalCols; $i++) {
            $xlsx->setColWidth(self::colLetter($i), 14);
        }

        return $xlsx;
    }

    protected static function setBranchBalanceColumnWidths(SimpleXLSXGen $xlsx, int $totalCols): void
    {
        for ($i = 0; $i < $totalCols; $i++) {
            $width = match ($i) {
                0 => 5,
                1 => 28,
                2 => 10,
                default => 12,
            };
            $xlsx->setColWidth(self::colLetter($i), $width);
        }
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
