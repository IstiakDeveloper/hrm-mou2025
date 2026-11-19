<?php

namespace App\Support;

use RuntimeException;
use ZipArchive;

/** Bounded workbook reading with physical Excel row numbers and date-system metadata. */
class SecurityFundXlsxReader
{
    public const MAX_ROWS = 2000;

    public function read(string $path): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('Excel import is unavailable on this server. Please contact your administrator.');
        }
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new RuntimeException('Upload a valid .xlsx workbook.');
        }
        try {
            foreach (['xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/sharedStrings.xml'] as $entry) {
                $stat = $zip->statName($entry);
                if ($stat !== false && $stat['size'] > 16 * 1024 * 1024) {
                    throw new RuntimeException('Workbook contents are too large. Use the template with at most 2,000 deposit rows.');
                }
            }
            $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
            $workbook = $zip->getFromName('xl/workbook.xml');
            if ($sheet === false || $workbook === false) {
                throw new RuntimeException('The workbook must contain a first worksheet.');
            }
            if (preg_match_all('/<(?:[\w.-]+:)?row(?:\s|>)/', $sheet) > self::MAX_ROWS + 25) {
                throw new RuntimeException('Use at most 2,000 deposit rows and remove excess empty formatted rows.');
            }
            $previous = libxml_use_internal_errors(true);
            try {
                $xml = simplexml_load_string($sheet, \SimpleXMLElement::class, LIBXML_NONET);
                if ($xml === false) {
                    throw new RuntimeException('The first worksheet is not readable. Save it as a new .xlsx file.');
                }
                $metadata = [];
                foreach ($xml->xpath('//*[local-name()="sheetData"]/*[local-name()="row"]') ?: [] as $offset => $row) {
                    $metadata[] = [
                        'row' => (int) ($row['r'] ?? ($offset + 1)),
                        'formula' => count($row->xpath('.//*[local-name()="f"]') ?: []) > 0,
                    ];
                }
            } finally {
                libxml_clear_errors();
                libxml_use_internal_errors($previous);
            }
            $date1904 = preg_match('/\bdate1904=["\'](?:1|true)["\']/i', $workbook) === 1;
        } finally {
            $zip->close();
        }
        $values = SimpleXlsxReader::sheetRows($path);
        $rows = [];
        foreach ($values as $offset => $cells) {
            $rows[] = ($metadata[$offset] ?? ['row' => $offset + 1, 'formula' => false]) + ['cells' => $cells];
        }

        return ['rows' => $rows, 'date1904' => $date1904];
    }
}
