<?php

namespace App\Http\Controllers\Employee;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\User;
use App\Support\EmployeeImportCsv;
use App\Support\SimpleXlsxReader;
use App\Support\EmployeeImportTemplateExporter;
use App\Support\ImportDateParser;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class EmployeeImportController extends EmployeeController
{
    public function importPreview(Request $request)
    {
        $validated = $request->validate([
            // extensions (not only mimes) — Hostinger often mis-detects xlsx as octet-stream
            'file' => 'required|file|max:10240|extensions:csv,txt,xlsx',
        ]);

        $file = $request->file('file');
        $ext = strtolower((string) $file->getClientOriginalExtension());
        $debug = [
            'step' => 'importPreview:start',
            'original_name' => $file?->getClientOriginalName(),
            'extension' => $ext,
            'size_bytes' => $file?->getSize(),
            'time' => now()->toDateTimeString(),
        ];
        Log::info('Employee import preview started', $debug);

        $path = $file->store('imports/employees', 'local');
        $absPath = Storage::disk('local')->path($path);

        try {
            $rows = $ext === 'xlsx'
                ? $this->readXlsxRows($absPath, $path)
                : $this->readCsvRows($absPath, $path);
            if (count($rows) === 0) {
                Log::warning('Employee import preview failed: empty file', $debug + ['stored_path' => $path]);

                return back()->withErrors(['file' => 'The file is empty.']);
            }

            if (count($rows) > self::EMPLOYEE_IMPORT_MAX_ROWS + 1) {
                Log::warning('Employee import preview failed: too many rows', $debug + ['row_count' => count($rows)]);

                return back()->withErrors([
                    'file' => 'Too many rows. Please split the file and try again.',
                ]);
            }

            $headerIdx = $this->detectHeaderRow($rows);
            [$header, $dataRows] = $this->splitHeaderRows($rows);
            $headerMap = $this->normalizeHeaderMap($header);

            $previewRows = [];
            foreach ($dataRows as $i => $row) {
                $rowNumber = $headerIdx + $i + 2;
                $rowAssoc = $this->rowToAssoc($row, $headerMap);

                unset($rowAssoc['sl'], $rowAssoc['serial'], $rowAssoc['ক্রমিক'], $rowAssoc['ক্রমিক_no'], $rowAssoc['ক্রমিকনং']);

                $previewRows[] = EmployeeImportCsv::mapAssocToPreviewRow($rowNumber, $rowAssoc);
            }

            if (count($previewRows) === 0) {
                Log::warning('Employee import preview failed: no data rows', $debug + [
                    'header_idx' => $headerIdx,
                    'raw_row_count' => count($rows),
                ]);

                return back()->withErrors([
                    'file' => 'No employee rows found. Keep row 3 (field keys) and enter data from row 4.',
                ]);
            }

            $importId = (string) Str::uuid();
            $debug['step'] = 'importPreview:cached';
            $debug['importId'] = $importId;
            $debug['row_count'] = count($previewRows);

            $this->putImportPreview($importId, [
                'header' => $headerMap,
                'rows' => $previewRows,
                'debug' => $debug,
            ]);

            Log::info('Employee import preview stored; redirecting to review', $debug);

            // Normal redirect (not Inertia::location) — Hostinger / LiteSpeed often break 409 + X-Inertia-Location
            return redirect()
                ->route('employees.import.review', ['importId' => $importId])
                ->with('success', 'File parsed successfully. Review and confirm the rows below.');
        } catch (\Throwable $e) {
            Log::error('Employee import failed', [
                'error' => $e->getMessage(),
                'context' => $debug,
            ]);

            return back()->withErrors([
                'file' => 'Import failed. Please check the file format and try again.',
            ]);
        } finally {
            try {
                Storage::disk('local')->delete($path);
            } catch (\Throwable $e) {
                // ignore cleanup failures
            }
        }
    }

    public function importReview(string $importId)
    {
        $cached = $this->getImportPreview($importId);
        if (! is_array($cached) || ! isset($cached['rows'])) {
            return redirect()->route('employees.index')
                ->with('error', 'Import preview expired. Please upload the file again.');
        }

        $rows = is_array($cached['rows']) ? $cached['rows'] : [];
        $debug = is_array($cached['debug'] ?? null) ? $cached['debug'] : null;

        $pins = [];
        $emails = [];
        $mobiles = [];
        foreach ($rows as $r) {
            $pin = trim((string) ($r['pin'] ?? ''));
            $email = trim((string) ($r['email'] ?? ''));
            $mobile = trim((string) ($r['mobile_personal'] ?? ''));
            if ($pin !== '') {
                $pins[] = $pin;
            }
            if ($email !== '') {
                $emails[] = $email;
            }
            if ($mobile !== '') {
                $mobiles[] = $mobile;
            }
        }

        $pins = array_values(array_unique($pins));
        $emails = array_values(array_unique($emails));
        $mobiles = array_values(array_unique($mobiles));

        $employedStatuses = Employee::statusesReservingUniqueIdentifiers();

        $existingPins = [];
        if (count($pins) > 0) {
            $existingPins = Employee::query()
                ->whereIn('status', $employedStatuses)
                ->whereIn('pin', $pins)
                ->pluck('pin')
                ->merge(
                    Employee::query()
                        ->whereIn('status', $employedStatuses)
                        ->whereIn('employee_id', $pins)
                        ->pluck('employee_id')
                )
                ->filter()
                ->map(fn ($v) => (string) $v)
                ->unique()
                ->values()
                ->all();
        }
        $existingPinSet = array_fill_keys($existingPins, true);

        $existingEmailSet = [];
        if (count($emails) > 0) {
            $existingEmails = Employee::query()
                ->whereIn('status', $employedStatuses)
                ->whereIn('email', $emails)
                ->pluck('email')
                ->all();
            $existingEmailSet = array_fill_keys(array_map('strtolower', $existingEmails), true);
        }

        $existingMobileSet = [];
        if (count($mobiles) > 0) {
            $existingMobiles = Employee::query()
                ->whereIn('status', $employedStatuses)
                ->whereIn('mobile_personal', $mobiles)
                ->pluck('mobile_personal')
                ->all();
            $existingMobileSet = array_fill_keys($existingMobiles, true);
        }

        $dupInFilePins = [];
        $pinCounts = array_count_values(array_map('strtolower', $pins));
        foreach ($pinCounts as $p => $c) {
            if ($c > 1) {
                $dupInFilePins[$p] = true;
            }
        }

        $dupInFileEmails = [];
        $emailCounts = array_count_values(array_map('strtolower', $emails));
        foreach ($emailCounts as $e => $c) {
            if ($c > 1) {
                $dupInFileEmails[$e] = true;
            }
        }

        $dupInFileMobiles = [];
        $mobileCounts = array_count_values($mobiles);
        foreach ($mobileCounts as $m => $c) {
            if ($c > 1) {
                $dupInFileMobiles[$m] = true;
            }
        }

        $issuesByRow = [];
        foreach ($rows as $idx => $r) {
            $sourceRow = (int) ($r['source_row'] ?? ($idx + 2));
            $issues = [];

            $pin = trim((string) ($r['pin'] ?? ''));
            $nameEn = trim((string) ($r['name_en'] ?? ''));
            $email = trim((string) ($r['email'] ?? ''));
            $mobile = trim((string) ($r['mobile_personal'] ?? ''));
            $joiningDate = trim((string) ($r['joining_date'] ?? ''));
            $employeeType = trim((string) ($r['employee_type'] ?? ''));

            if ($pin === '') {
                $issues[] = 'Missing PIN';
            }
            if ($nameEn === '') {
                $issues[] = 'Missing name';
            }
            if ($mobile === '') {
                $issues[] = 'Missing mobile_personal';
            }
            if ($joiningDate === '') {
                $issues[] = 'Missing joining_date';
            }
            if ($employeeType === '') {
                $issues[] = 'Missing employee_type';
            }

            if ($pin !== '' && isset($existingPinSet[$pin])) {
                $issues[] = 'Duplicate PIN exists in system';
            }
            if ($email !== '' && isset($existingEmailSet[strtolower($email)])) {
                $issues[] = 'Duplicate email exists in system';
            }
            if ($mobile !== '' && isset($existingMobileSet[$mobile])) {
                $issues[] = 'Duplicate mobile exists in system';
            }
            if ($pin !== '' && isset($dupInFilePins[strtolower($pin)])) {
                $issues[] = 'Duplicate PIN inside file';
            }
            if ($email !== '' && isset($dupInFileEmails[strtolower($email)])) {
                $issues[] = 'Duplicate email inside file';
            }
            if ($mobile !== '' && isset($dupInFileMobiles[$mobile])) {
                $issues[] = 'Duplicate mobile inside file';
            }

            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                $issues[] = 'Invalid email format';
            }

            if ($joiningDate !== '' && ImportDateParser::parse($joiningDate) === null) {
                $issues[] = 'Invalid joining_date';
            }

            if ($employeeType !== '' && $this->resolveImportModelId($employeeType, EmployeeType::class, 'name') === null) {
                $issues[] = 'Unknown employee_type (use name or ID)';
            }

            $issuesByRow[$sourceRow] = $issues;
        }

        $departments = Department::orderBy('name')->get(['id', 'name']);
        $designations = Designation::orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);
        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('employee/import-review', [
            'importId' => $importId,
            'rows' => $rows,
            'existingPins' => array_values(array_keys($existingPinSet)),
            'existingEmails' => array_values(array_keys($existingEmailSet)),
            'existingMobiles' => array_values(array_keys($existingMobileSet)),
            'commitErrorsByRow' => session()->pull('import_commit_errors_by_row', []),
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
            'employeeTypes' => $employeeTypes,
            'statuses' => ['active', 'inactive'],
        ]);
    }

    public function importCommit(Request $request)
    {
        $importId = trim((string) $request->input('importId', ''));
        $cached = $importId !== '' ? $this->getImportPreview($importId) : null;

        if (! is_array($cached)) {
            return redirect()->route('employees.index')
                ->with('error', 'Import preview expired. Please upload the file again.');
        }

        $normalizedRows = $this->normalizeImportCommitRows(
            is_array($request->input('rows')) ? $request->input('rows') : []
        );
        $request->merge(['rows' => $normalizedRows, 'importId' => $importId]);

        $mergedPreviewRows = $this->mergeImportFormIntoCachedRows(
            is_array($cached['rows'] ?? null) ? $cached['rows'] : [],
            $normalizedRows
        );
        $this->writeImportPreviewCache($importId, $cached, $mergedPreviewRows);

        try {
            $validated = $request->validate([
                'importId' => 'required|string',
                'rows' => 'required|array|max:'.self::EMPLOYEE_IMPORT_MAX_ROWS,
                'rows.*.pin' => 'required|string|max:20',
                'rows.*.name_en' => 'required|string|max:255',
                'rows.*.email' => 'nullable|email',
                'rows.*.mobile_personal' => 'required|string|max:20',
                'rows.*.employee_type_id' => 'required|integer|exists:employee_types,id',
                'rows.*.joining_date' => 'required|date',
                'rows.*.department_id' => 'required|integer|exists:departments,id',
                'rows.*.joining_designation_id' => 'required|integer|exists:designations,id',
                'rows.*.last_designation_id' => 'required|integer|exists:designations,id',
                'rows.*.current_branch_id' => 'required|integer|exists:branches,id',
                'rows.*.last_branch_id' => 'nullable|integer|exists:branches,id',
                'rows.*.status' => 'required|in:active,inactive',
                'rows.*.source_row' => 'nullable|integer',
            ]);
        } catch (ValidationException $e) {
            return redirect()
                ->route('employees.import.review', ['importId' => $importId])
                ->withErrors($e->errors());
        }

        $cachedBySourceRow = [];
        foreach ($mergedPreviewRows as $cr) {
            $cachedBySourceRow[(int) ($cr['source_row'] ?? 0)] = $cr;
        }

        $created = 0;
        $skipped = 0;
        $rowErrors = [];
        $commitErrorsByRow = [];
        $createdByBranchId = [];
        $batchPins = [];
        $batchEmails = [];
        $batchMobiles = [];

        $employedStatuses = Employee::statusesReservingUniqueIdentifiers();

        DB::beginTransaction();
        try {
            foreach ($validated['rows'] as $idx => $row) {
                $rowNumber = (int) ($row['source_row'] ?? ($idx + 2));
                $pin = trim((string) $row['pin']);
                $email = trim((string) ($row['email'] ?? ''));
                $mobile = trim((string) $row['mobile_personal']);
                $emailKey = strtolower($email);

                $errors = [];
                if ($pin !== '' && isset($batchPins[strtolower($pin)])) {
                    $errors[] = 'Duplicate PIN in this batch';
                }
                if ($email !== '' && isset($batchEmails[$emailKey])) {
                    $errors[] = 'Duplicate email in this batch';
                }
                if ($mobile !== '' && isset($batchMobiles[$mobile])) {
                    $errors[] = 'Duplicate mobile in this batch';
                }
                if ($pin !== '' && Employee::query()
                    ->whereIn('status', $employedStatuses)
                    ->where(function ($q) use ($pin) {
                        $q->where('pin', $pin)->orWhere('employee_id', $pin);
                    })
                    ->exists()) {
                    $errors[] = 'PIN exists in system';
                }
                if ($email !== '' && Employee::query()->whereIn('status', $employedStatuses)->where('email', $email)->exists()) {
                    $errors[] = 'Email exists in system';
                }
                if ($mobile !== '' && Employee::query()->whereIn('status', $employedStatuses)->where('mobile_personal', $mobile)->exists()) {
                    $errors[] = 'Mobile exists in system';
                }
                $resolvedEmail = $email;
                if ($resolvedEmail === '' || filter_var($resolvedEmail, FILTER_VALIDATE_EMAIL) === false) {
                    $resolvedEmail = strtolower($pin).'@'.$this->getAutoEmailDomain();
                }
                if (User::where('email', $resolvedEmail)->exists()) {
                    $errors[] = 'Email used by user account';
                }

                if (count($errors) > 0) {
                    $skipped++;
                    $rowErrors[] = ['row' => $rowNumber, 'errors' => $errors];
                    $commitErrorsByRow[$rowNumber] = $errors;

                    continue;
                }

                $csvRow = $cachedBySourceRow[$rowNumber] ?? [];

                try {
                    $employee = $this->createEmployeeFromImportRow($csvRow, $row);
                    $this->syncZoneRegionalManagerAssignment($employee);
                    $this->syncUserAccountForEmployee($employee);
                    $this->persistImportRelatedData($employee->id, $csvRow);
                } catch (\Throwable $e) {
                    $skipped++;
                    $saveError = 'Save failed';
                    if ($e instanceof \InvalidArgumentException || $e instanceof \RuntimeException) {
                        $saveError = $e->getMessage();
                    }
                    Log::error('Employee import row save failed', [
                        'row' => $rowNumber,
                        'pin' => $pin,
                        'error' => $e->getMessage(),
                    ]);
                    $rowErrors[] = ['row' => $rowNumber, 'errors' => [$saveError]];
                    $commitErrorsByRow[$rowNumber] = [$saveError];

                    continue;
                }

                $created++;
                if ($pin !== '') {
                    $batchPins[strtolower($pin)] = true;
                }
                if ($email !== '') {
                    $batchEmails[$emailKey] = true;
                }
                if ($mobile !== '') {
                    $batchMobiles[$mobile] = true;
                }
                $bid = (int) $row['current_branch_id'];
                $createdByBranchId[$bid] = ($createdByBranchId[$bid] ?? 0) + 1;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        if ($created === 0 && $skipped > 0) {
            return redirect()
                ->route('employees.import.review', ['importId' => $importId])
                ->with('error', 'No employees were imported. Fix the issues below and confirm again.')
                ->with('import_commit_errors_by_row', $commitErrorsByRow);
        }

        if ($created > 0) {
            $this->forgetImportPreview($importId);
        }

        $branchBreakdown = [];
        if (count($createdByBranchId) > 0) {
            $branchNames = Branch::whereIn('id', array_keys($createdByBranchId))->pluck('name', 'id');
            foreach ($createdByBranchId as $bid => $count) {
                $branchBreakdown[] = [
                    'branch_id' => $bid,
                    'branch_name' => $branchNames[$bid] ?? ('Branch #'.$bid),
                    'created' => $count,
                ];
            }
            usort($branchBreakdown, fn ($a, $b) => $b['created'] <=> $a['created']);
        }

        $message = "Import confirmed. Created {$created}, skipped {$skipped}.";

        return redirect()->route('employees.index')
            ->with('success', $message)
            ->with('import_summary', [
                'created' => $created,
                'skipped' => $skipped,
                'branches' => $branchBreakdown,
            ])
            ->with('import_row_errors', array_slice($rowErrors, 0, 50));
    }

    public function downloadImportExample()
    {
        $sampleDept = Department::query()->orderBy('name')->value('name') ?? 'Accounts';
        $sampleDesig = Designation::query()->orderBy('name')->value('name') ?? 'Officer';
        $sampleBranch = Branch::query()->orderBy('name')->value('name') ?? 'Head Office';
        $sampleType = EmployeeType::query()->where('is_active', true)->orderBy('name')->value('name') ?? 'Permanent';

        $sampleRows = [
            [
                'sl' => '1',
                'pin' => '01101',
                'name_en' => 'Karim Ahmed',
                'name_bn' => 'করিম আহমেদ',
                'employee_type' => $sampleType,
                'email' => 'karim.ahmed@example.com',
                'mobile_personal' => '01700000001',
                'mobile_official' => '01700000002',
                'gender' => 'male',
                'religion' => 'Islam',
                'blood_group' => 'B+',
                'date_of_birth' => '1995-06-15',
                'marital_status' => 'Married',
                'fathers_name' => 'Abdul Karim',
                'fathers_mobile' => '01710000001',
                'mothers_name' => 'Rashida Begum',
                'nid_number' => '1234567890',
                'joining_date' => '2024-01-01',
                'confirmation_date' => '2024-07-01',
                'department' => $sampleDept,
                'joining_designation' => $sampleDesig,
                'last_designation' => $sampleDesig,
                'branch' => $sampleBranch,
                'status' => 'active',
                'bank_name' => 'Prime Bank PLC',
                'bank_branch_name' => 'Motijheel',
                'bank_account_no' => '1234567890',
                'bank_account_type' => 'savings',
                'present_division' => 'Rajshahi',
                'present_district' => 'Naogaon',
                'present_upazila' => 'Naogaon Sadar',
                'present_union' => 'Balubhara',
                'present_village' => 'Balubhara',
                'permanent_division' => 'Rajshahi',
                'permanent_district' => 'Naogaon',
                'permanent_upazila' => 'Naogaon Sadar',
                'permanent_union' => 'Balubhara',
                'permanent_village' => 'Balubhara',
            ],
            [
                'sl' => '2',
                'pin' => '01102',
                'name_en' => 'Rina Akter',
                'employee_type' => (string) (EmployeeType::query()->where('is_active', true)->orderBy('name')->value('id') ?? '1'),
                'mobile_personal' => '01800000002',
                'joining_date' => '2025-03-01',
                'department' => (string) (Department::query()->orderBy('name')->value('id') ?? '1'),
                'joining_designation' => (string) (Designation::query()->orderBy('name')->value('id') ?? '1'),
                'last_designation' => (string) (Designation::query()->orderBy('name')->value('id') ?? '1'),
                'branch' => (string) (Branch::query()->orderBy('name')->value('id') ?? '1'),
                'status' => 'active',
            ],
        ];

        $mapRef = fn ($query) => $query->get(['id', 'name'])
            ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name])
            ->all();

        $references = [
            'departments' => $mapRef(Department::query()->orderBy('name')),
            'designations' => $mapRef(Designation::query()->orderBy('name')),
            'branches' => $mapRef(Branch::query()->orderBy('name')),
            'employee_types' => $mapRef(EmployeeType::query()->where('is_active', true)->orderBy('name')),
        ];

        $xlsx = EmployeeImportTemplateExporter::generate($sampleRows, $references);

        return response((string) $xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="employee-import-template.xlsx"',
        ]);
    }

    private function readCsvRows(string $absPath, ?string $storageRelativePath = null): array
    {
        $raw = @file_get_contents($absPath);
        if ($raw === false) {
            $exists = @file_exists($absPath);
            $isReadable = @is_readable($absPath);
            Log::warning('Employee import: file_get_contents failed', [
                'path' => $absPath,
                'exists' => $exists,
                'readable' => $isReadable,
                'relative_path' => $storageRelativePath,
            ]);

            if (is_string($storageRelativePath) && $storageRelativePath !== '') {
                try {
                    $rawFromStorage = Storage::disk('local')->get($storageRelativePath);
                    if (is_string($rawFromStorage) && $rawFromStorage !== '') {
                        $raw = $rawFromStorage;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Employee import: Storage::get failed', [
                        'relative_path' => $storageRelativePath,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if ($raw === false) {
                return [];
            }
        }

        if ($raw === '') {
            Log::warning('Employee import: file is empty string', ['path' => $absPath]);

            return [];
        }

        // Normalize encoding (common case: Excel "Unicode Text" / UTF-16 CSV)
        // Heuristic: presence of null bytes usually means UTF-16.
        $hasNullBytes = strpos($raw, "\0") !== false;

        if ($hasNullBytes) {
            $converted = null;
            if (function_exists('mb_convert_encoding')) {
                // Try UTF-16LE first (most common), fallback to UTF-16BE
                $tryLe = @mb_convert_encoding($raw, 'UTF-8', 'UTF-16LE');
                $tryBe = @mb_convert_encoding($raw, 'UTF-8', 'UTF-16BE');

                $converted = is_string($tryLe) && $tryLe !== '' ? $tryLe : null;
                if ($converted === null && is_string($tryBe) && $tryBe !== '') {
                    $converted = $tryBe;
                }
            }

            if (is_string($converted) && $converted !== '') {
                $raw = $converted;
            } else {
                Log::warning('Employee import: detected null bytes but could not convert encoding', [
                    'path' => $absPath,
                ]);
            }
        }

        // Strip UTF-8 BOM if present
        $raw = preg_replace('/^\\xEF\\xBB\\xBF/', '', $raw) ?? $raw;

        $lines = preg_split("/\r\n|\n|\r/", $raw) ?: [];
        // Remove trailing empty lines
        while (count($lines) > 0 && trim((string) end($lines)) === '') {
            array_pop($lines);
        }

        if (count($lines) === 0) {
            Log::warning('Employee import: no lines after split', [
                'path' => $absPath,
                'has_null_bytes' => $hasNullBytes,
            ]);

            return [];
        }

        $firstLine = (string) $lines[0];
        $delimiter = $this->guessCsvDelimiter($firstLine);

        $rows = [];
        foreach ($lines as $line) {
            $line = (string) $line;
            if (trim($line) === '') {
                continue;
            }
            $data = str_getcsv($line, $delimiter);
            if (! is_array($data)) {
                continue;
            }
            if (count(array_filter($data, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }
            $rows[] = $data;
        }

        if (count($rows) === 0) {
            Log::warning('Employee import: parsed 0 CSV rows', [
                'path' => $absPath,
                'has_null_bytes' => $hasNullBytes,
                'delimiter' => $delimiter,
            ]);
        }

        return $rows;
    }

    private function guessCsvDelimiter(string $line): string
    {
        $candidates = [',', ';', "\t", '|'];
        $best = ',';
        $bestCount = -1;

        foreach ($candidates as $d) {
            $count = count(str_getcsv($line, $d));
            if ($count > $bestCount) {
                $bestCount = $count;
                $best = $d;
            }
        }

        return $best;
    }

    /**
     * @return list<list<string>>
     */
    private function readXlsxRows(string $absPath, ?string $storageRelativePath = null): array
    {
        try {
            return SimpleXlsxReader::sheetRows($absPath, 1);
        } catch (\Throwable $e) {
            Log::warning('Employee import: XLSX read failed', [
                'path' => $absPath,
                'relative_path' => $storageRelativePath,
                'error' => $e->getMessage(),
            ]);
        }

        if (! is_string($storageRelativePath) || $storageRelativePath === '') {
            return [];
        }

        try {
            $binary = Storage::disk('local')->get($storageRelativePath);
            if (! is_string($binary) || $binary === '') {
                return [];
            }

            $tempPath = tempnam(sys_get_temp_dir(), 'emp_import_');
            if ($tempPath === false) {
                return [];
            }
            $tempXlsx = $tempPath.'.xlsx';
            rename($tempPath, $tempXlsx);
            file_put_contents($tempXlsx, $binary);

            try {
                return SimpleXlsxReader::sheetRows($tempXlsx, 1);
            } finally {
                @unlink($tempXlsx);
            }
        } catch (\Throwable $e) {
            Log::warning('Employee import: XLSX read via storage failed', [
                'relative_path' => $storageRelativePath,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    private function detectHeaderRow(array $rows): int
    {
        $maxScan = min(15, count($rows));
        for ($i = 0; $i < $maxScan; $i++) {
            foreach ($rows[$i] as $cell) {
                if (EmployeeImportCsv::resolveHeaderKey((string) $cell) === 'pin') {
                    return $i;
                }
            }
        }

        return 0;
    }

    private function splitHeaderRows(array $rows): array
    {
        $headerIdx = $this->detectHeaderRow($rows);
        $header = $rows[$headerIdx] ?? [];
        $headerKeys = array_map(
            fn ($cell) => EmployeeImportCsv::resolveHeaderKey((string) $cell),
            $header
        );
        $pinIdx = array_search('pin', $headerKeys, true);
        $nameIdx = array_search('name_en', $headerKeys, true);

        $data = [];
        for ($i = $headerIdx + 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            $pin = $pinIdx !== false ? trim((string) ($row[$pinIdx] ?? '')) : '';
            $name = $nameIdx !== false ? trim((string) ($row[$nameIdx] ?? '')) : '';
            if ($pin === '' && $name === '') {
                continue;
            }
            $data[] = $row;
        }

        return [$header, $data];
    }

    private function normalizeHeaderMap(array $header): array
    {
        $map = [];
        foreach ($header as $idx => $name) {
            $key = EmployeeImportCsv::resolveHeaderKey((string) $name);
            if ($key === '') {
                $key = 'col_'.$idx;
            }
            $map[$idx] = $key;
        }

        return $map;
    }

    private function rowToAssoc(array $row, array $headerMap): array
    {
        $assoc = [];
        foreach ($headerMap as $idx => $key) {
            $assoc[$key] = $row[$idx] ?? null;
        }

        return $assoc;
    }

    private function firstNonEmpty(array $rowAssoc, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (! array_key_exists($k, $rowAssoc)) {
                continue;
            }
            $v = trim((string) $rowAssoc[$k]);
            if ($v !== '') {
                return $v;
            }
        }

        return null;
    }

    private function valueOrNull(array $rowAssoc, array $keys): ?string
    {
        $v = $this->firstNonEmpty($rowAssoc, $keys);

        return $v !== null ? $v : null;
    }

    private function resolveIdFromRowOrDefault(
        array $rowAssoc,
        array $keys,
        ?int $defaultId,
        string $modelClass,
        string $nameField
    ): ?int {
        $raw = $this->firstNonEmpty($rowAssoc, $keys);
        if ($raw === null) {
            return $defaultId;
        }

        return $this->resolveImportModelId($raw, $modelClass, $nameField) ?? $defaultId;
    }

    private function resolveImportModelId(string $raw, string $modelClass, string $nameField): ?int
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if (ctype_digit($raw)) {
            return $modelClass::query()->whereKey((int) $raw)->exists() ? (int) $raw : null;
        }

        $model = $modelClass::query()
            ->whereRaw('LOWER('.$nameField.') = ?', [strtolower($raw)])
            ->first(['id']);

        return $model?->id;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function normalizeImportCommitRows(array $rows): array
    {
        return array_values(array_map(function (array $row): array {
            foreach ([
                'employee_type_id',
                'department_id',
                'joining_designation_id',
                'last_designation_id',
                'current_branch_id',
            ] as $key) {
                if (array_key_exists($key, $row) && $row[$key] !== '' && $row[$key] !== null) {
                    $row[$key] = (int) $row[$key];
                }
            }

            if (array_key_exists('last_branch_id', $row)) {
                $row['last_branch_id'] = ($row['last_branch_id'] === '' || $row['last_branch_id'] === null)
                    ? null
                    : (int) $row['last_branch_id'];
            }

            if (array_key_exists('source_row', $row) && $row['source_row'] !== '' && $row['source_row'] !== null) {
                $row['source_row'] = (int) $row['source_row'];
            }

            if (array_key_exists('joining_date', $row) && is_string($row['joining_date']) && $row['joining_date'] !== '') {
                $row['joining_date'] = ImportDateParser::parse($row['joining_date']) ?? $row['joining_date'];
            }

            return $row;
        }, $rows));
    }

    /**
     * @param  list<array<string, mixed>>  $cachedRows
     * @param  list<array<string, mixed>>  $formRows
     * @return list<array<string, mixed>>
     */
    private function mergeImportFormIntoCachedRows(array $cachedRows, array $formRows): array
    {
        $bySource = [];
        foreach ($cachedRows as $cr) {
            $bySource[(int) ($cr['source_row'] ?? 0)] = $cr;
        }

        foreach ($formRows as $fr) {
            $sourceRow = (int) ($fr['source_row'] ?? 0);
            if ($sourceRow <= 0) {
                continue;
            }

            $existing = $bySource[$sourceRow] ?? ['source_row' => $sourceRow];
            $bySource[$sourceRow] = array_merge($existing, [
                'source_row' => $sourceRow,
                'pin' => trim((string) ($fr['pin'] ?? '')),
                'name_en' => trim((string) ($fr['name_en'] ?? '')),
                'email' => trim((string) ($fr['email'] ?? '')),
                'mobile_personal' => trim((string) ($fr['mobile_personal'] ?? '')),
                'joining_date' => ImportDateParser::parse(trim((string) ($fr['joining_date'] ?? '')))
                    ?? trim((string) ($fr['joining_date'] ?? '')),
                'employee_type' => (string) ($fr['employee_type_id'] ?? ''),
                'department' => (string) ($fr['department_id'] ?? ''),
                'joining_designation' => (string) ($fr['joining_designation_id'] ?? ''),
                'last_designation' => (string) ($fr['last_designation_id'] ?? ''),
                'current_branch' => (string) ($fr['current_branch_id'] ?? ''),
                'last_branch' => (string) ($fr['last_branch_id'] ?? ''),
                'status' => strtolower(trim((string) ($fr['status'] ?? 'active'))),
            ]);
        }

        ksort($bySource);

        return array_values($bySource);
    }

    /**
     * @param  array<string, mixed>  $cached
     * @param  list<array<string, mixed>>  $rows
     */
    private function writeImportPreviewCache(string $importId, array $cached, array $rows): void
    {
        $cached['rows'] = $rows;
        $this->putImportPreview($importId, $cached);
    }

    private function importPreviewRelativePath(string $importId): string
    {
        $safeId = preg_replace('/[^a-zA-Z0-9\-]/', '', $importId) ?: 'invalid';

        return "imports/employees/previews/{$safeId}.json";
    }

    /**
     * Persist import preview on disk (reliable on shared hosting where Redis/cache often fails).
     *
     * @param  array<string, mixed>  $payload
     */
    private function putImportPreview(string $importId, array $payload): void
    {
        $payload['expires_at'] = now()->addSeconds(self::EMPLOYEE_IMPORT_CACHE_TTL_SECONDS)->getTimestamp();
        $relative = $this->importPreviewRelativePath($importId);
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new \RuntimeException('Unable to encode import preview payload.');
        }

        Storage::disk('local')->put($relative, $json);

        try {
            Cache::put(
                "employee_import_preview:{$importId}",
                $payload,
                self::EMPLOYEE_IMPORT_CACHE_TTL_SECONDS
            );
        } catch (\Throwable $e) {
            // Disk is source of truth on Hostinger; cache is optional.
            Log::warning('Employee import: cache mirror failed', [
                'importId' => $importId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getImportPreview(string $importId): ?array
    {
        try {
            $cached = Cache::get("employee_import_preview:{$importId}");
            if (is_array($cached) && isset($cached['rows'])) {
                return $cached;
            }
        } catch (\Throwable $e) {
            // Fall through to disk.
        }

        $relative = $this->importPreviewRelativePath($importId);
        if (! Storage::disk('local')->exists($relative)) {
            return null;
        }

        try {
            $raw = Storage::disk('local')->get($relative);
            $data = is_string($raw) ? json_decode($raw, true) : null;
        } catch (\Throwable $e) {
            Log::warning('Employee import: preview disk read failed', [
                'importId' => $importId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if (! is_array($data) || ! isset($data['rows'])) {
            return null;
        }

        $expiresAt = (int) ($data['expires_at'] ?? 0);
        if ($expiresAt > 0 && $expiresAt < time()) {
            $this->forgetImportPreview($importId);

            return null;
        }

        return $data;
    }

    private function forgetImportPreview(string $importId): void
    {
        try {
            Storage::disk('local')->delete($this->importPreviewRelativePath($importId));
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            Cache::forget("employee_import_preview:{$importId}");
        } catch (\Throwable $e) {
            // ignore
        }
    }

    /**
     * @param  array<string, mixed>  $csvRow
     * @param  array<string, mixed>  $formRow
     */
    private function createEmployeeFromImportRow(array $csvRow, array $formRow): Employee
    {
        $pin = trim((string) $formRow['pin']);
        $email = trim((string) ($formRow['email'] ?? ''));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $email = strtolower($pin).'@'.$this->getAutoEmailDomain();
        }

        $joiningDate = ImportDateParser::parse((string) ($formRow['joining_date'] ?? ''));
        if ($joiningDate === null) {
            throw new \InvalidArgumentException('Invalid joining date.');
        }

        $confirmationRaw = trim((string) ($csvRow['confirmation_date'] ?? ''));
        $employeeTypeId = (int) $formRow['employee_type_id'];
        $confirmationDate = null;
        if ($confirmationRaw !== '') {
            $confirmationDate = ImportDateParser::parse($confirmationRaw);
        } elseif ($employeeTypeId > 0) {
            $etype = EmployeeType::query()->find($employeeTypeId);
            $months = (int) ($etype?->probation_months ?? 0);
            if ($months > 0) {
                $confirmationDate = Carbon::parse($joiningDate)->addMonthsNoOverflow($months)->toDateString();
            }
        }

        $dobRaw = trim((string) ($csvRow['date_of_birth'] ?? ''));
        $dateOfBirth = $dobRaw !== '' ? ImportDateParser::parse($dobRaw) : null;
        $lastDesigId = (int) $formRow['last_designation_id'];

        $employeeData = [
            'employee_id' => $pin,
            'pin' => $pin,
            'name_en' => (string) $formRow['name_en'],
            'name_bn' => $this->nullableImportString($csvRow['name_bn'] ?? null),
            'employee_type_id' => $employeeTypeId,
            'email' => $email,
            'mobile_personal' => trim((string) $formRow['mobile_personal']),
            'mobile_official' => $this->nullableImportString($csvRow['mobile_official'] ?? null),
            'gender' => $this->nullableImportString($csvRow['gender'] ?? null),
            'religion' => $this->nullableImportString($csvRow['religion'] ?? null),
            'blood_group' => $this->nullableImportString($csvRow['blood_group'] ?? null),
            'date_of_birth' => $dateOfBirth,
            'marital_status' => $this->nullableImportString($csvRow['marital_status'] ?? null),
            'spouse_name' => $this->nullableImportString($csvRow['spouse_name'] ?? null),
            'spouse_mobile' => $this->nullableImportString($csvRow['spouse_mobile'] ?? null),
            'fathers_name' => $this->nullableImportString($csvRow['fathers_name'] ?? null),
            'fathers_mobile' => $this->nullableImportString($csvRow['fathers_mobile'] ?? null),
            'mothers_name' => $this->nullableImportString($csvRow['mothers_name'] ?? null),
            'mothers_mobile' => $this->nullableImportString($csvRow['mothers_mobile'] ?? null),
            'nid_number' => $this->nullableImportString($csvRow['nid_number'] ?? null),
            'smart_card_number' => $this->nullableImportString($csvRow['smart_card_number'] ?? null),
            'tin_certificate_no' => $this->nullableImportString($csvRow['tin_certificate_no'] ?? null),
            'driving_license_no' => $this->nullableImportString($csvRow['driving_license_no'] ?? null),
            'passport_no' => $this->nullableImportString($csvRow['passport_no'] ?? null),
            'identification_mark' => $this->nullableImportString($csvRow['identification_mark'] ?? null),
            'joining_date' => $joiningDate,
            'confirmation_date' => $confirmationDate,
            'department_id' => (int) $formRow['department_id'],
            'designation_id' => $lastDesigId,
            'joining_designation_id' => (int) $formRow['joining_designation_id'],
            'last_designation_id' => $lastDesigId,
            'current_branch_id' => (int) $formRow['current_branch_id'],
            'last_branch_id' => ! empty($formRow['last_branch_id']) ? (int) $formRow['last_branch_id'] : null,
            'status' => (string) $formRow['status'],
        ];

        if ($employeeData['confirmation_date']) {
            $employeeData['probation_period_days'] = Carbon::parse($joiningDate)
                ->diffInDays(Carbon::parse($employeeData['confirmation_date']));
        }

        return Employee::create($employeeData);
    }

    /**
     * @param  array<string, mixed>  $csvRow
     */
    private function persistImportRelatedData(int $employeeId, array $csvRow): void
    {
        $bankName = trim((string) ($csvRow['bank_name'] ?? ''));
        if ($bankName !== '') {
            DB::table('employee_bank_accounts')->insert([
                'employee_id' => $employeeId,
                'bank_name' => $bankName,
                'branch_name' => self::DEFAULT_EMPLOYEE_BANK_BRANCH_NAME,
                'account_no' => $this->nullableImportString($csvRow['bank_account_no'] ?? null),
                'account_type' => self::DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE,
                'is_primary' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (['present' => 'present_', 'permanent' => 'permanent_'] as $type => $prefix) {
            $parts = [
                'division' => trim((string) ($csvRow[$prefix.'division'] ?? '')),
                'district' => trim((string) ($csvRow[$prefix.'district'] ?? '')),
                'upazila' => trim((string) ($csvRow[$prefix.'upazila'] ?? '')),
                'union' => trim((string) ($csvRow[$prefix.'union'] ?? '')),
                'village' => trim((string) ($csvRow[$prefix.'village'] ?? '')),
            ];
            if (implode('', $parts) === '') {
                continue;
            }
            $addressDetails = implode(', ', array_filter($parts));
            DB::table('employee_addresses')->insert([
                'employee_id' => $employeeId,
                'type' => $type,
                'division' => $parts['division'] ?: null,
                'district' => $parts['district'] ?: null,
                'upazila' => $parts['upazila'] ?: null,
                'union' => $parts['union'] ?: null,
                'village' => $parts['village'] ?: null,
                'address_details' => $addressDetails,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function nullableImportString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

}
