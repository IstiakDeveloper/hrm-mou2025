<?php

namespace App\Support;

use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Minimal first-sheet XLSX reader (shared strings + numeric cells).
 *
 * Hostinger-safe: does not use namespaced XPath (avoids
 * "SimpleXMLElement::xpath(): Undefined namespace prefix").
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

        try {
            $sharedStrings = self::loadSharedStrings($zip);
            $sheetPath = 'xl/worksheets/sheet'.$sheetIndex.'.xml';
            $sheetXml = $zip->getFromName($sheetPath);

            if ($sheetXml === false) {
                throw new RuntimeException('Worksheet not found: '.$sheetPath);
            }

            return self::parseSheetXml($sheetXml, $sharedStrings);
        } finally {
            $zip->close();
        }
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

        $root = self::loadXml($xml);
        if ($root === null) {
            return [];
        }

        $strings = [];
        foreach (self::childNodes($root, 'si') as $si) {
            $text = '';
            foreach (self::descendantNodes($si, 't') as $part) {
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
        $root = self::loadXml($xml);
        if ($root === null) {
            return [];
        }

        $rows = [];
        foreach (self::childNodes($root, 'sheetData') as $sheetData) {
            foreach (self::childNodes($sheetData, 'row') as $row) {
                $cells = [];
                foreach (self::childNodes($row, 'c') as $cell) {
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
        }

        return $rows;
    }

    private static function loadXml(string $xml): ?SimpleXMLElement
    {
        $previous = libxml_use_internal_errors(true);
        try {
            // Always strip namespaces — most portable across PHP builds.
            $root = simplexml_load_string(self::stripNamespaces($xml));

            return $root instanceof SimpleXMLElement ? $root : null;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }

    private static function stripNamespaces(string $xml): string
    {
        $xml = preg_replace('/\sxmlns(:\w+)?="[^"]*"/i', '', $xml) ?? $xml;
        $xml = preg_replace('/([<\/])\w+:(\w+)/', '$1$2', $xml) ?? $xml;

        return $xml;
    }

    /**
     * @return list<SimpleXMLElement>
     */
    private static function childNodes(SimpleXMLElement $parent, string $localName): array
    {
        $found = [];
        foreach ($parent->children() as $name => $child) {
            if ((string) $name === $localName) {
                $found[] = $child;
            }
        }

        return $found;
    }

    /**
     * @return list<SimpleXMLElement>
     */
    private static function descendantNodes(SimpleXMLElement $parent, string $localName): array
    {
        $found = self::childNodes($parent, $localName);
        foreach ($parent->children() as $child) {
            foreach (self::descendantNodes($child, $localName) as $nested) {
                $found[] = $nested;
            }
        }

        return $found;
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
    private static function cellValue(SimpleXMLElement $cell, array $sharedStrings): string
    {
        $type = (string) ($cell['t'] ?? '');

        if ($type === 'inlineStr') {
            $parts = self::descendantNodes($cell, 't');

            return $parts !== [] ? (string) $parts[0] : '';
        }

        $values = self::childNodes($cell, 'v');
        if ($values === []) {
            return '';
        }

        $raw = (string) $values[0];

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
        $envPrefix = PHP_OS_FAMILY === 'Windows'
            ? 'set PYTHONIOENCODING=utf-8&& '
            : 'PYTHONIOENCODING=utf-8 ';
        $command = $envPrefix.escapeshellarg($python).' '.escapeshellarg($script).' '.escapeshellarg($absolutePath);
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
