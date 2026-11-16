<?php

namespace App\Support;

use Shuchkin\SimpleXLSXGen;

/**
 * Builds a styled multi-sheet XLSX template for employee bulk import.
 */
final class EmployeeImportTemplateExporter
{
    /**
     * @param  list<array<string, string>>  $sampleRows  keyed by column key
     * @param  array<string, list<array{id: int|string, name: string}>>  $references
     */
    public static function generate(
        array $sampleRows,
        array $references = [],
        ?array $selectedColumnKeys = null,
        ?array $columnDefinitions = null,
        ?array $groupTitles = null,
        ?array $groupColors = null
    ): SimpleXLSXGen {
        $xlsx = SimpleXLSXGen::create('Employee Import');
        $xlsx->setAuthor('HRM System')
            ->setTitle('Employee Import Template')
            ->setSubject('Bulk employee import')
            ->setDescription('Fill employee data starting row 4. Do not change row 3 (field keys).');

        self::addDataSheet(
            $xlsx,
            $sampleRows,
            $selectedColumnKeys,
            $columnDefinitions,
            $groupTitles,
            $groupColors
        );
        self::addGuideSheet($xlsx);
        self::addReferenceSheet($xlsx, $references);

        return $xlsx;
    }

    /**
     * @param  list<array<string, string>>  $sampleRows
     */
    private static function addDataSheet(
        SimpleXLSXGen $xlsx,
        array $sampleRows,
        ?array $selectedColumnKeys = null,
        ?array $columnDefinitions = null,
        ?array $customGroupTitles = null,
        ?array $customGroupColors = null
    ): void {
        $columns = $columnDefinitions ?? EmployeeImportCsv::columns();
        if ($selectedColumnKeys !== null) {
            $selected = array_fill_keys($selectedColumnKeys, true);
            $columns = array_values(array_filter(
                $columns,
                fn (array $column) => isset($selected[$column['key']])
            ));
        }
        $groupTitles = $customGroupTitles ?? EmployeeImportCsv::groupTitles();
        $groupColors = $customGroupColors ?? EmployeeImportCsv::groupColors();

        $groupRow = [];
        $labelRow = [];
        $keyRow = [];

        $groupRanges = [];
        $currentGroup = null;
        $groupStart = 0;

        foreach ($columns as $index => $col) {
            if ($col['group'] !== $currentGroup) {
                if ($currentGroup !== null) {
                    $groupRanges[] = [$currentGroup, $groupStart, $index - 1];
                }
                $currentGroup = $col['group'];
                $groupStart = $index;
            }

            $groupRow[] = '';
            $label = $col['label'].($col['required'] ? ' *' : '');
            $labelRow[] = self::styled(
                $label."\n".$col['label_bn'],
                $col['required'] ? 'FFF2F2F2' : 'FFFFFFFF',
                $col['required'] ? 'FFC00000' : 'FF000000',
                true,
                true
            );
            $keyRow[] = self::styled(
                $col['key'],
                'FFE7E6E6',
                'FF595959',
                false,
                true
            );
        }
        $groupRanges[] = [$currentGroup, $groupStart, count($columns) - 1];

        foreach ($groupRanges as [$group, $start, $end]) {
            $title = $groupTitles[$group] ?? ucfirst($group);
            $color = $groupColors[$group] ?? '4472C4';
            $groupRow[$start] = self::styled($title, $color, 'FFFFFF', true, true);
            for ($i = $start + 1; $i <= $end; $i++) {
                $groupRow[$i] = self::styled('', $color, 'FFFFFF', true, true);
            }
        }

        $dataRows = [$groupRow, $labelRow, $keyRow];
        foreach ($sampleRows as $sample) {
            $line = [];
            foreach ($columns as $col) {
                $line[] = $sample[$col['key']] ?? '';
            }
            $dataRows[] = $line;
        }

        $xlsx->addSheet($dataRows, 'Employee Data');

        foreach ($groupRanges as [, $start, $end]) {
            $xlsx->mergeCells(self::cellRef($start, 1).':'.self::cellRef($end, 1));
        }

        foreach ($columns as $index => $col) {
            $xlsx->setColWidth(self::cellRef($index, 1), $col['width']);
        }

        $xlsx->freezePanes('A4');
        $xlsx->autoFilter('A3:'.self::cellRef(count($columns) - 1, 3));
    }

    private static function addGuideSheet(SimpleXLSXGen $xlsx): void
    {
        $required = array_values(array_filter(
            EmployeeImportCsv::columns(),
            fn (array $col) => $col['required'] && $col['key'] !== 'sl'
        ));

        $requiredList = implode(', ', array_map(
            fn (array $col) => $col['label'].' ('.$col['key'].')',
            $required
        ));

        $rows = [
            [self::styled('Employee Bulk Import — Instructions', '1F4E79', 'FFFFFF', true, false)],
            [''],
            ['How to use'],
            ['1. Open the "Employee Data" sheet (first tab).'],
            ['2. Row 1–3 are headers — do NOT delete or reorder them.'],
            ['3. Row 3 (grey) contains field keys used by the system — keep unchanged.'],
            ['4. Enter employee data from row 4 onward (below the grey key row).'],
            ['5. Save the file and upload it from Employees → Import → Upload & Review.'],
            ['6. On the review screen, fix any issues, then confirm import.'],
            [''],
            ['কিভাবে ব্যবহার করবেন'],
            ['১. "Employee Data" শিটে যান।'],
            ['২. প্রথম ৩ সারি header — মুছবেন না।'],
            ['৩. ৫ নং সারি থেকে কর্মচারীর তথ্য লিখুন।'],
            ['৪. সেভ করে Import মেনু থেকে আপলোড করুন।'],
            [''],
            ['Required fields / অবশ্যই পূরণ করতে হবে'],
            [$requiredList],
            [''],
            ['Tips'],
            ['• Dates: dd/mm/yyyy (example: 01/06/2026) or Excel date cells'],
            ['• Department, Branch, Designation, Employment Type: use name OR numeric ID (see Reference sheet)'],
            ['• Status: active or inactive'],
            ['• Gender: male, female, other'],
            ['• Bank Branch Name is the bank\'s branch (text), not the organization branch'],
            ['• Email is optional — system generates one if left blank'],
            ['• PIN and personal mobile must be unique'],
            [''],
            ['Sample rows in Employee Data are examples — delete or replace before import.'],
        ];

        $xlsx->addSheet($rows, 'Guide');
        $xlsx->setColWidth('A', 90);
        $xlsx->mergeCells('A1:A1');
    }

    /**
     * @param  array<string, list<array{id: int|string, name: string}>>  $references
     */
    private static function addReferenceSheet(SimpleXLSXGen $xlsx, array $references): void
    {
        $sections = [
            'departments' => 'Departments (name or ID)',
            'designations' => 'Designations (name or ID)',
            'branches' => 'Branches (name or ID)',
            'employee_types' => 'Employment Types (name or ID)',
        ];

        $rows = [
            [self::styled('Reference Data — use these values in import', '2E75B6', 'FFFFFF', true, false)],
            ['ID', 'Name'],
        ];

        foreach ($sections as $key => $title) {
            $items = $references[$key] ?? [];
            if ($items === []) {
                continue;
            }

            $rows[] = [''];
            $rows[] = [self::styled($title, 'D9E1F2', '1F4E79', true, false)];
            foreach ($items as $item) {
                $rows[] = [(string) ($item['id'] ?? ''), (string) ($item['name'] ?? '')];
            }
        }

        $rows[] = [''];
        $rows[] = [self::styled('Fixed values', 'D9E1F2', '1F4E79', true, false)];
        $rows[] = ['Field', 'Allowed values'];
        $rows[] = ['status', 'active, inactive'];
        $rows[] = ['gender', 'male, female, other'];
        $rows[] = ['marital_status', 'Single, Married, Separated, Divorced, Widowed'];
        $rows[] = ['blood_group', 'A+, A-, B+, B-, AB+, AB-, O+, O-'];
        $rows[] = ['bank_account_type', 'savings, current'];

        $xlsx->addSheet($rows, 'Reference');
        $xlsx->setColWidth('A', 14);
        $xlsx->setColWidth('B', 42);
    }

    private static function styled(
        string $text,
        string $bgHex,
        string $colorHex,
        bool $bold,
        bool $wrap
    ): string {
        $bg = '#'.ltrim($bgHex, '#');
        $color = '#'.ltrim($colorHex, '#');
        $inner = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $tags = '<style bgcolor="'.$bg.'" color="'.$color.'"'.($wrap ? ' font-size="9"' : '').'>'.$inner.'</style>';

        if ($bold) {
            $tags = '<b>'.$tags.'</b>';
        }
        if ($wrap) {
            $tags = '<wraptext>'.$tags.'</wraptext>';
        }

        return '<center>'.$tags.'</center>';
    }

    private static function cellRef(int $columnIndex, int $rowNumber): string
    {
        $letters = '';
        $n = $columnIndex + 1;
        while ($n > 0) {
            $n--;
            $letters = chr(65 + ($n % 26)).$letters;
            $n = intdiv($n, 26);
        }

        return $letters.$rowNumber;
    }
}
