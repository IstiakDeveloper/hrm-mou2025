<?php

namespace App\Services;

use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryHead;
use App\Models\SalaryStep;
use App\Models\SalaryStructure;
use App\Support\SimpleXlsxReader;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Import payscale, grades, steps, and salary heads from HR salary spreadsheet (no salary structures).
 */
class SalaryStructureFromCsvService
{
    private const DEFAULT_XLSX = 'data/excel/salary-structure.xlsx';

    private const FALLBACK_CSV = 'data/excel/salary-strructure.csv';

    private const PAYSCALE_CODE = 'MOU_SALARY_STRUCTURE';

    /** @var array<string, array{code: string, name: string, default_amount_type: string, default_amount: float}> */
    private const HEAD_DEFINITIONS = [
        'HR' => [
            'code' => 'HR',
            'name' => 'House Rent',
            'default_amount_type' => 'percentage',
            'default_amount' => 70,
        ],
        'MA' => [
            'code' => 'MA',
            'name' => 'Medical Allowance',
            'default_amount_type' => 'fixed',
            'default_amount' => 3000,
        ],
        'Con' => [
            'code' => 'CON',
            'name' => 'Conveyance',
            'default_amount_type' => 'percentage',
            'default_amount' => 35,
        ],
        'Entertainment' => [
            'code' => 'ENT',
            'name' => 'Entertainment',
            'default_amount_type' => 'fixed',
            'default_amount' => 4000,
        ],
    ];

    /**
     * @return array{
     *     payscale_id: int,
     *     grades: int,
     *     steps: int,
     *     structures_removed: int,
     *     heads: int,
     *     source: string
     * }
     */
    public function run(?string $sourcePath = null): array
    {
        [$absPath, $sourceLabel] = $this->resolveSource($sourcePath);
        $blocks = $this->parseGradeBlocks($absPath);

        if ($blocks === []) {
            throw new RuntimeException('No grade blocks found in spreadsheet.');
        }

        return DB::transaction(function () use ($blocks, $sourceLabel) {
            $heads = $this->seedSalaryHeads();
            $payscale = Payscale::query()->updateOrCreate(
                ['code' => self::PAYSCALE_CODE],
                [
                    'name' => 'MOU Salary Structure',
                    'description' => 'Imported from salary structure spreadsheet',
                    'effective_from' => now()->startOfYear()->toDateString(),
                    'is_active' => true,
                ]
            );

            $structuresRemoved = SalaryStructure::query()->delete();

            $gradeCount = 0;
            $stepCount = 0;

            foreach ($blocks as $index => $block) {
                $sortOrder = $this->romanSortOrder($block['grade_code']) ?? ($index + 1);
                $gradeName = $this->formatGradeName($block['grade_code']);

                $grade = SalaryGrade::query()->updateOrCreate(
                    [
                        'payscale_id' => $payscale->id,
                        'code' => strtolower($block['grade_code']),
                    ],
                    [
                        'name' => $gradeName,
                        'sort_order' => $sortOrder,
                        'is_active' => true,
                    ]
                );
                $gradeCount++;

                $basicByStep = $block['basic_by_step'];
                $importedStepNumbers = [];

                foreach ($basicByStep as $stepNumber => $basicSalary) {
                    $importedStepNumbers[] = $stepNumber;

                    SalaryStep::query()->updateOrCreate(
                        [
                            'salary_grade_id' => $grade->id,
                            'step_number' => $stepNumber,
                        ],
                        [
                            'basic_salary' => $basicSalary,
                            'is_active' => true,
                        ]
                    );
                    $stepCount++;
                }

                SalaryStep::query()
                    ->where('salary_grade_id', $grade->id)
                    ->whereNotIn('step_number', $importedStepNumbers)
                    ->delete();
            }

            return [
                'payscale_id' => $payscale->id,
                'grades' => $gradeCount,
                'steps' => $stepCount,
                'structures_removed' => $structuresRemoved,
                'heads' => count($heads),
                'source' => $sourceLabel,
            ];
        });
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveSource(?string $sourcePath): array
    {
        if ($sourcePath !== null) {
            if (! is_readable($sourcePath)) {
                throw new InvalidArgumentException('Spreadsheet not readable: '.$sourcePath);
            }

            return [$sourcePath, basename($sourcePath)];
        }

        $xlsx = base_path(self::DEFAULT_XLSX);
        if (is_readable($xlsx)) {
            return [$xlsx, basename($xlsx)];
        }

        $csv = base_path(self::FALLBACK_CSV);
        if (is_readable($csv)) {
            return [$csv, basename($csv)];
        }

        throw new InvalidArgumentException('No salary structure file found (xlsx or csv).');
    }

    private function formatGradeName(string $gradeCode): string
    {
        $roman = strtolower(trim($gradeCode));

        return 'Grade '.$roman;
    }

    /**
     * @return array<string, SalaryHead>
     */
    private function seedSalaryHeads(): array
    {
        $heads = [];
        $sort = (int) (SalaryHead::max('sort_order') ?? 0);

        foreach (self::HEAD_DEFINITIONS as $key => $def) {
            $sort++;
            $heads[$key] = SalaryHead::query()->updateOrCreate(
                ['code' => $def['code']],
                [
                    'short_name' => $def['code'],
                    'name' => $def['name'],
                    'name_bn' => null,
                    'salary_type' => 'bank',
                    'type' => 'earning',
                    'default_amount_type' => $def['default_amount_type'],
                    'default_amount' => $def['default_amount'],
                    'sort_order' => $sort,
                    'description' => null,
                    'is_active' => true,
                    'is_basic_head' => false,
                    'is_taxable_head' => false,
                    'is_gross_pay_head' => false,
                    'is_bonus_head' => false,
                    'is_arrear_head' => false,
                    'is_pf_head' => false,
                    'is_welfare' => false,
                    'is_income_tax_head' => false,
                    'is_loan_head' => false,
                    'loan_head_type' => 'n_a',
                ]
            );
        }

        return $heads;
    }

    /**
     * @return list<array{
     *     grade_code: string,
     *     position: string,
     *     basic_by_step: array<int, float>
     * }>
     */
    private function parseGradeBlocks(string $path): array
    {
        $rows = str_ends_with(strtolower($path), '.xlsx')
            ? $this->rowsFromXlsx($path)
            : $this->rowsFromCsv($path);

        return $this->blocksFromRows($rows);
    }

    /**
     * @return list<list<string>>
     */
    private function rowsFromXlsx(string $path): array
    {
        return SimpleXlsxReader::sheetRows($path);
    }

    /**
     * @return list<list<string>>
     */
    private function rowsFromCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw new RuntimeException('Unable to open CSV.');
        }

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = array_map(fn ($v) => trim((string) $v), $row);
        }
        fclose($handle);

        return $rows;
    }

    /**
     * @param  list<list<string>>  $rows
     * @return list<array{
     *     grade_code: string,
     *     position: string,
     *     basic_by_step: array<int, float>
     * }>
     */
    private function blocksFromRows(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $header = array_map(fn ($h) => trim((string) $h), $rows[0]);
        $stepColumns = [];
        foreach ($header as $col) {
            if (preg_match('/^Step-(\d+)$/i', $col, $m)) {
                $stepColumns[(int) $m[1]] = $col;
            }
        }
        ksort($stepColumns);

        if ($stepColumns === []) {
            throw new RuntimeException('No Step-* columns found in spreadsheet header.');
        }

        $blocks = [];
        $current = null;

        for ($i = 1, $count = count($rows); $i < $count; $i++) {
            $row = $rows[$i];
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $assoc = [];
            foreach ($header as $colIndex => $col) {
                $assoc[$col] = $row[$colIndex] ?? '';
            }

            $allowance = trim((string) ($assoc['Allowance'] ?? ''));
            if ($allowance === '') {
                continue;
            }

            $allowanceKey = $this->normalizeAllowanceKey($allowance);
            if ($allowanceKey === null) {
                continue;
            }

            if ($allowanceKey === 'Basic') {
                // Rate column (e.g. 7%) is yearly increment between steps — not stored as %; each step uses fixed basic from columns.
                $gradeCode = strtolower(trim((string) ($assoc['Grade'] ?? '')));
                if ($gradeCode === '') {
                    continue;
                }

                if ($current !== null) {
                    $blocks[] = $current;
                }

                $position = $this->normalizePosition((string) ($assoc['Position'] ?? ''));
                $basicByStep = [];
                foreach ($stepColumns as $stepNumber => $colName) {
                    $basicByStep[$stepNumber] = $this->parseMoneyAmount($assoc[$colName] ?? '');
                }

                $current = [
                    'grade_code' => $gradeCode,
                    'position' => $position,
                    'basic_by_step' => $basicByStep,
                ];
            }
        }

        if ($current !== null) {
            $blocks[] = $current;
        }

        return $blocks;
    }

    private function normalizeAllowanceKey(string $allowance): ?string
    {
        $key = trim($allowance);
        if ($key === '') {
            return null;
        }

        if (strcasecmp($key, 'Basic') === 0) {
            return 'Basic';
        }
        if (strcasecmp($key, 'HR') === 0) {
            return 'HR';
        }
        if (strcasecmp($key, 'MA') === 0) {
            return 'MA';
        }
        if (strcasecmp($key, 'Con') === 0) {
            return 'Con';
        }
        if (strcasecmp($key, 'Entertainment') === 0) {
            return 'Entertainment';
        }

        return null;
    }

    private function normalizePosition(string $position): string
    {
        $position = preg_replace('/\s+/u', ' ', str_replace(["\r", "\n"], ' ', trim($position))) ?? '';

        return $position !== '' ? $position : 'Grade position';
    }

    /**
     * Fixed salary amounts (basic): whole taka from sheet cells.
     */
    private function parseMoneyAmount(mixed $raw): float
    {
        $clean = preg_replace('/[^\d.]/', '', str_replace(',', '', trim((string) $raw)));

        return SalaryStructureCalculator::roundTaka((float) ($clean !== '' ? $clean : 0));
    }

    private function romanSortOrder(string $code): ?int
    {
        static $order = [
            'i' => 1, 'ii' => 2, 'iii' => 3, 'iv' => 4, 'v' => 5,
            'vi' => 6, 'vii' => 7, 'viii' => 8, 'ix' => 9, 'x' => 10,
            'xi' => 11, 'xii' => 12, 'xiii' => 13, 'xiv' => 14, 'xv' => 15,
        ];

        return $order[strtolower(trim($code))] ?? null;
    }
}
