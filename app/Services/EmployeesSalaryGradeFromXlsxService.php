<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use App\Support\EmployeePinLookup;
use App\Support\SimpleXlsxReader;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Bulk apply payscale, salary grade, and step from HR spreadsheet (PIN-keyed).
 */
class EmployeesSalaryGradeFromXlsxService
{
    private const DEFAULT_XLSX = 'data/excel/salary-grade.xlsx';

    private const PAYSCALE_CODE = 'MOU_SALARY_STRUCTURE';

    /** @var array<string, SalaryGrade> */
    private array $gradeByRoman = [];

    /** @var array<string, SalaryStep> */
    private array $stepByGradeAndNumber = [];

    private ?Payscale $payscale = null;

    /**
     * @return array{
     *     updated: int,
     *     unchanged: int,
     *     skipped_empty_pin: int,
     *     skipped_missing_grade_or_step: int,
     *     skipped_unknown_grade: int,
     *     skipped_unknown_step: int,
     *     skipped_employee_not_found: int,
     *     duplicate_pins_in_xlsx: int,
     *     dry_run: bool,
     *     log_path: string
     * }
     */
    public function run(?string $xlsxAbsolutePath = null, bool $dryRun = false): array
    {
        $absPath = $xlsxAbsolutePath ?? base_path(self::DEFAULT_XLSX);
        if (! is_readable($absPath)) {
            throw new InvalidArgumentException('XLSX not readable: '.$absPath);
        }

        $this->loadReferenceMaps();

        $rows = $this->parseXlsx($absPath);
        if ($rows === []) {
            throw new RuntimeException('No data rows in spreadsheet.');
        }

        $updated = 0;
        $unchanged = 0;
        $skippedEmptyPin = 0;
        $skippedMissingGradeOrStep = 0;
        $skippedUnknownGrade = 0;
        $skippedUnknownStep = 0;
        $skippedEmployeeNotFound = 0;
        $duplicatePinsInXlsx = 0;
        $log = [];

        $pinCounts = [];
        foreach ($rows as $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            if ($pinRaw === '') {
                continue;
            }
            $pinCounts[$pinRaw] = ($pinCounts[$pinRaw] ?? 0) + 1;
        }
        foreach ($pinCounts as $count) {
            if ($count > 1) {
                $duplicatePinsInXlsx++;
            }
        }

        foreach ($rows as $rowIndex => $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            if ($pinRaw === '') {
                $skippedEmptyPin++;
                $log[] = [
                    'row' => $rowIndex + 1,
                    'pin' => '',
                    'status' => 'skip',
                    'reason' => 'empty_pin',
                ];

                continue;
            }

            $gradeRaw = strtolower(trim((string) ($row['grade'] ?? '')));
            $stepRaw = trim((string) ($row['step'] ?? ''));

            if ($gradeRaw === '' || $stepRaw === '' || $gradeRaw === '-' || $stepRaw === '-') {
                $skippedMissingGradeOrStep++;
                $log[] = [
                    'row' => $rowIndex + 1,
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'missing_grade_or_step',
                    'grade' => $row['grade'] ?? '',
                    'step' => $row['step'] ?? '',
                    'designation' => $row['designation'] ?? '',
                ];

                continue;
            }

            $grade = $this->gradeByRoman[$gradeRaw] ?? null;
            if (! $grade) {
                $skippedUnknownGrade++;
                $log[] = [
                    'row' => $rowIndex + 1,
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'unknown_grade',
                    'grade' => $gradeRaw,
                    'step' => $stepRaw,
                    'designation' => $row['designation'] ?? '',
                ];

                continue;
            }

            if (! is_numeric($stepRaw)) {
                $skippedUnknownStep++;
                $log[] = [
                    'row' => $rowIndex + 1,
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'invalid_step',
                    'grade' => $gradeRaw,
                    'step' => $stepRaw,
                ];

                continue;
            }

            $stepNumber = (int) $stepRaw;
            $step = $this->stepByGradeAndNumber[$grade->id.':'.$stepNumber] ?? null;
            if (! $step) {
                $skippedUnknownStep++;
                $log[] = [
                    'row' => $rowIndex + 1,
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'unknown_step',
                    'grade' => $gradeRaw,
                    'grade_id' => $grade->id,
                    'step' => $stepNumber,
                    'designation' => $row['designation'] ?? '',
                ];

                continue;
            }

            $employee = EmployeePinLookup::findEmployee($pinRaw);
            if (! $employee) {
                $skippedEmployeeNotFound++;
                $log[] = [
                    'row' => $rowIndex + 1,
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'employee_not_found',
                    'grade' => $gradeRaw,
                    'step' => $stepNumber,
                    'designation' => $row['designation'] ?? '',
                ];

                continue;
            }

            $changes = [];
            $payscaleId = (int) $this->payscale->id;
            if ((int) ($employee->payscale_id ?? 0) !== $payscaleId) {
                $changes['payscale_id'] = $payscaleId;
            }
            if ((int) ($employee->salary_grade_id ?? 0) !== (int) $grade->id) {
                $changes['salary_grade_id'] = (int) $grade->id;
            }
            if ((int) ($employee->salary_step_id ?? 0) !== (int) $step->id) {
                $changes['salary_step_id'] = (int) $step->id;
            }

            if ($changes === []) {
                $unchanged++;
                $log[] = [
                    'row' => $rowIndex + 1,
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'status' => 'unchanged',
                    'grade' => $gradeRaw,
                    'grade_id' => $grade->id,
                    'step' => $stepNumber,
                    'step_id' => $step->id,
                    'basic_salary' => (string) $step->basic_salary,
                ];

                continue;
            }

            $previous = [
                'payscale_id' => $employee->payscale_id,
                'salary_grade_id' => $employee->salary_grade_id,
                'salary_step_id' => $employee->salary_step_id,
            ];

            if (! $dryRun) {
                DB::transaction(function () use ($employee, $changes) {
                    $employee->update($changes);
                });
            }

            $updated++;
            $log[] = [
                'row' => $rowIndex + 1,
                'pin' => $pinRaw,
                'employee_id' => $employee->employee_id,
                'status' => $dryRun ? 'would_update' : 'updated',
                'grade' => $gradeRaw,
                'grade_id' => $grade->id,
                'step' => $stepNumber,
                'step_id' => $step->id,
                'basic_salary' => (string) $step->basic_salary,
                'changes' => $changes,
                'previous' => $previous,
            ];
        }

        $summary = [
            'summary' => true,
            'source' => $absPath,
            'dry_run' => $dryRun,
            'total_rows' => count($rows),
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_missing_grade_or_step' => $skippedMissingGradeOrStep,
            'skipped_unknown_grade' => $skippedUnknownGrade,
            'skipped_unknown_step' => $skippedUnknownStep,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
        ];

        $logPath = storage_path('logs/employees-salary-grade-xlsx-'.date('Y-m-d_His').'.log');
        $lines = [json_encode($summary, JSON_UNESCAPED_UNICODE)];
        foreach ($log as $entry) {
            $lines[] = json_encode($entry, JSON_UNESCAPED_UNICODE);
        }
        @file_put_contents($logPath, implode("\n", $lines));

        return [
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_missing_grade_or_step' => $skippedMissingGradeOrStep,
            'skipped_unknown_grade' => $skippedUnknownGrade,
            'skipped_unknown_step' => $skippedUnknownStep,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
        ];
    }

    private function loadReferenceMaps(): void
    {
        $this->payscale = Payscale::query()->where('code', self::PAYSCALE_CODE)->first();
        if (! $this->payscale) {
            throw new RuntimeException('Payscale not found: '.self::PAYSCALE_CODE);
        }

        $this->gradeByRoman = [];
        $grades = SalaryGrade::query()
            ->where('payscale_id', $this->payscale->id)
            ->get();

        foreach ($grades as $grade) {
            $code = strtolower((string) $grade->code);
            $roman = str_starts_with($code, 'grade_') ? substr($code, 6) : $code;
            if ($roman !== '') {
                $this->gradeByRoman[$roman] = $grade;
            }
        }

        $this->stepByGradeAndNumber = [];
        $steps = SalaryStep::query()
            ->whereIn('salary_grade_id', $grades->pluck('id'))
            ->get();

        foreach ($steps as $step) {
            $this->stepByGradeAndNumber[$step->salary_grade_id.':'.$step->step_number] = $step;
        }
    }

    /**
     * @return list<array{pin: string, designation: string, gender: string, grade: string, step: string}>
     */
    private function parseXlsx(string $absPath): array
    {
        $sheetRows = SimpleXlsxReader::sheetRows($absPath);
        if ($sheetRows === []) {
            return [];
        }

        $header = array_map(
            fn ($v) => strtolower(trim((string) $v)),
            $sheetRows[0] ?? []
        );

        $col = [];
        foreach ($header as $i => $h) {
            if ($h === 'pin') {
                $col['pin'] = $i;
            } elseif ($h === 'designation') {
                $col['designation'] = $i;
            } elseif ($h === 'gender') {
                $col['gender'] = $i;
            } elseif ($h === 'grade') {
                $col['grade'] = $i;
            } elseif ($h === 'steps' || $h === 'step') {
                $col['step'] = $i;
            }
        }

        if (! isset($col['pin'])) {
            throw new InvalidArgumentException('Spreadsheet must include a PIN column.');
        }

        $out = [];
        foreach (array_slice($sheetRows, 1) as $row) {
            if ($row === [] || trim(implode('', array_map('strval', $row))) === '') {
                continue;
            }

            $out[] = [
                'pin' => isset($col['pin']) ? (string) ($row[$col['pin']] ?? '') : '',
                'designation' => isset($col['designation']) ? (string) ($row[$col['designation']] ?? '') : '',
                'gender' => isset($col['gender']) ? (string) ($row[$col['gender']] ?? '') : '',
                'grade' => isset($col['grade']) ? (string) ($row[$col['grade']] ?? '') : '',
                'step' => isset($col['step']) ? (string) ($row[$col['step']] ?? '') : '',
            ];
        }

        return $out;
    }
}
