<?php

namespace App\Support;

use RuntimeException;
use ZipArchive;

/**
 * Minimal first-sheet XLSX reader (shared strings + numeric cells).
 */
class SimpleXlsxReader
{
    /**
     * @return list<list<string>>
     */
    public static function sheetRows(string $absolutePath, int $sheetIndex = 1): array
    {
        if (! is_readable($absolutePath)) {
            throw new RuntimeException('XLSX not readable: '.$absolutePath);
        }

        if ($sheetIndex !== 1) {
            throw new RuntimeException('Only the first worksheet is supported.');
        }

        if (! class_exists(ZipArchive::class)) {
            return self::sheetRowsViaPython($absolutePath);
        }

        $zip = new ZipArchive;
        if ($zip->open($absolutePath) !== true) {
            throw new RuntimeException('Unable to open XLSX: '.$absolutePath);
        }

        $sharedStrings = self::loadSharedStrings($zip);
        $sheetPath = 'xl/worksheets/sheet'.$sheetIndex.'.xml';
        $sheetXml = $zip->getFromName($sheetPath);
        $zip->close();

        if ($sheetXml === false) {
            throw new RuntimeException('Worksheet not found: '.$sheetPath);
        }

        return self::parseSheetXml($sheetXml, $sharedStrings);
    }

    /**
     * @return list<string>
     */
    private static function loadSharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');
        if ($xml === false) {
            return [];
        }

        $root = simplexml_load_string($xml);
        if ($root === false) {
            return [];
        }

        $root->registerXPathNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $strings = [];
        foreach ($root->xpath('//m:si') ?: [] as $si) {
            $parts = $si->xpath('.//m:t') ?: [];
            $text = '';
            foreach ($parts as $part) {
                $text .= (string) $part;
            }
            $strings[] = $text;
        }

        return $strings;
    }

    /**
     * @param  list<string>  $sharedStrings
     * @return list<list<string>>
     */
    private static function parseSheetXml(string $xml, array $sharedStrings): array
    {
        $root = simplexml_load_string($xml);
        if ($root === false) {
            return [];
        }

        $root->registerXPathNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $rows = [];

        foreach ($root->xpath('//m:sheetData/m:row') ?: [] as $row) {
            $cells = [];
            foreach ($row->xpath('m:c') ?: [] as $cell) {
                $ref = (string) ($cell['r'] ?? '');
                $col = self::columnLettersFromRef($ref);
                $cells[$col] = self::cellValue($cell, $sharedStrings);
            }

            if ($cells === []) {
                $rows[] = [];

                continue;
            }

            $maxCol = max(array_keys($cells));
            $maxIndex = self::columnIndex($maxCol);
            $line = array_fill(0, $maxIndex + 1, '');
            foreach ($cells as $col => $value) {
                $line[self::columnIndex($col)] = $value;
            }
            $rows[] = $line;
        }

        return $rows;
    }

    private static function columnLettersFromRef(string $ref): string
    {
        if (preg_match('/^([A-Z]+)/', $ref, $m)) {
            return $m[1];
        }

        return 'A';
    }

    private static function columnIndex(string $letters): int
    {
        $index = 0;
        $len = strlen($letters);
        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($letters[$i]) - 64);
        }

        return $index - 1;
    }

    /**
     * @param  list<string>  $sharedStrings
     */
    private static function cellValue(\SimpleXMLElement $cell, array $sharedStrings): string
    {
        $type = (string) ($cell['t'] ?? '');
        $valueNode = $cell->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main')->v;
        $inline = $cell->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main')->is;

        if ($type === 'inlineStr' && $inline !== null) {
            $text = $inline->children('http://schemas.openxmlformats.org/spreadsheetml/2006/main')->t;

            return (string) ($text ?? '');
        }

        if ($valueNode === null) {
            return '';
        }

        $raw = (string) $valueNode;

        if ($type === 's') {
            return $sharedStrings[(int) $raw] ?? '';
        }

        return $raw;
    }

    /**
     * @return list<list<string>>
     */
    private static function sheetRowsViaPython(string $absolutePath): array
    {
        $script = base_path('scripts/read_xlsx_rows.py');
        if (! is_readable($script)) {
            throw new RuntimeException('ZipArchive PHP extension missing and scripts/read_xlsx_rows.py not found.');
        }

        $python = self::pythonBinary();
        $command = escapeshellarg($python).' '.escapeshellarg($script).' '.escapeshellarg($absolutePath);
        $output = shell_exec($command);

        if (! is_string($output) || trim($output) === '') {
            throw new RuntimeException('Failed to read XLSX via Python. Ensure Python 3 is installed.');
        }

        $rows = json_decode(trim($output), true);
        if (! is_array($rows)) {
            throw new RuntimeException('Invalid JSON from XLSX reader script.');
        }

        return array_map(
            fn ($row) => array_map(fn ($v) => (string) $v, is_array($row) ? $row : []),
            $rows
        );
    }

    private static function pythonBinary(): string
    {
        foreach (['python', 'python3', 'py'] as $bin) {
            $which = shell_exec(escapeshellarg(PHP_OS_FAMILY === 'Windows' ? 'where' : 'which').' '.escapeshellarg($bin));
            if (is_string($which) && trim($which) !== '') {
                return $bin;
            }
        }

        return 'python';
    }
}
