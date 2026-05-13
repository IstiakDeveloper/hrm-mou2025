<?php

namespace App\Http\Controllers\Employee;

use App\Http\Concerns\ResolvesEmployeeNidSmartCard;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\EmployeeType;
use App\Models\LocationVillage;
use App\Models\Program;
use App\Models\Project;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\OrganogramAccessService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    use ResolvesEmployeeNidSmartCard;

    private const EMPLOYEE_IMPORT_MAX_ROWS = 5000;

    private const EMPLOYEE_IMPORT_CACHE_TTL_SECONDS = 3600;

    private const AUTO_USER_EMPLOYEE_ROLE_NAME = 'Employee';

    private const AUTO_EMAIL_DOMAIN_ENV = 'HRM_AUTO_EMAIL_DOMAIN';

    private function getAutoEmailDomain(): string
    {
        $d = (string) env(self::AUTO_EMAIL_DOMAIN_ENV, 'auto.local');
        $d = trim($d);

        return $d !== '' ? $d : 'auto.local';
    }

    private function readJsonArrayFile(string $absPath): array
    {
        try {
            $raw = @file_get_contents($absPath);
            if (! is_string($raw) || trim($raw) === '') {
                return [];
            }
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * phpMyAdmin "Export to JSON" format stores the actual rows in the table entry's "data" key.
     *
     * @return array<int, array<string, mixed>>
     */
    private function readPhpMyAdminExportTableData(string $absPath, string $tableName): array
    {
        $decoded = $this->readJsonArrayFile($absPath);
        if (! is_array($decoded)) {
            return [];
        }

        foreach ($decoded as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            if (($entry['type'] ?? null) !== 'table') {
                continue;
            }
            if (($entry['name'] ?? null) !== $tableName) {
                continue;
            }
            $data = $entry['data'] ?? null;

            return is_array($data) ? $data : [];
        }

        return [];
    }

    /**
     * Resolve bd_geo_code union id from human-readable names (division → district → upazila → union).
     * Upazila names can repeat across Bangladesh, so district must be used to pick the correct upazila row.
     */
    private function resolveBdGeoUnionId(string $divisionName, string $districtName, string $upazilaName, string $unionName): ?string
    {
        $divisionName = trim($divisionName);
        $districtName = trim($districtName);
        $upazilaName = trim($upazilaName);
        $unionName = trim($unionName);
        if ($divisionName === '' || $districtName === '' || $upazilaName === '' || $unionName === '') {
            return null;
        }

        $divisions = $this->readPhpMyAdminExportTableData(base_path('data/locations/divisions.json'), 'divisions');
        $divisionId = null;
        foreach ($divisions as $d) {
            if (trim((string) ($d['name'] ?? '')) === $divisionName) {
                $divisionId = (string) ($d['id'] ?? '');
                break;
            }
        }
        if ($divisionId === '' || $divisionId === null) {
            return null;
        }

        $districts = $this->readPhpMyAdminExportTableData(base_path('data/locations/districts.json'), 'districts');
        $districtId = null;
        foreach ($districts as $dist) {
            if (trim((string) ($dist['division_id'] ?? '')) !== $divisionId) {
                continue;
            }
            if (trim((string) ($dist['name'] ?? '')) === $districtName) {
                $districtId = (string) ($dist['id'] ?? '');
                break;
            }
        }
        if ($districtId === '' || $districtId === null) {
            return null;
        }

        $upazilas = $this->readPhpMyAdminExportTableData(base_path('data/locations/upazilas.json'), 'upazilas');
        $upazilaId = null;
        foreach ($upazilas as $u) {
            if (trim((string) ($u['district_id'] ?? '')) !== $districtId) {
                continue;
            }
            if (trim((string) ($u['name'] ?? '')) === $upazilaName) {
                $upazilaId = (string) ($u['id'] ?? '');
                break;
            }
        }
        if ($upazilaId === '' || $upazilaId === null) {
            return null;
        }

        $unions = $this->readPhpMyAdminExportTableData(base_path('data/locations/unions.json'), 'unions');
        foreach ($unions as $un) {
            $upId = (string) ($un['upazilla_id'] ?? $un['upazila_id'] ?? '');
            if ($upId !== $upazilaId) {
                continue;
            }
            if (trim((string) ($un['name'] ?? '')) === $unionName) {
                $rid = (string) ($un['id'] ?? '');

                return $rid !== '' ? $rid : null;
            }
        }

        return null;
    }

    /**
     * Build the frontend-friendly location payload from data/locations/*.json.
     * Falls back to legacy data/locations.json if folder is missing.
     *
     * Shape:
     * - divisions: list<string>
     * - districts: array<divisionName, list<string>>
     * - upazilas: array<districtName, list<string>>
     * - unions: array<upazilaName, list<array{name,type,villages:list<string>}>>>
     */
    private function buildLocationsPayload(): array
    {
        $folder = base_path('data/locations');
        $divisionsPath = $folder.'/divisions.json';
        $districtsPath = $folder.'/districts.json';
        $upazilasPath = $folder.'/upazilas.json';
        $unionsPath = $folder.'/unions.json';
        $villagesPath = $folder.'/villages.json';

        if (! is_dir($folder) || ! file_exists($divisionsPath)) {
            // Legacy single file
            return $this->readJsonArrayFile(base_path('data/locations.json'));
        }

        $divisionsRows = $this->readPhpMyAdminExportTableData($divisionsPath, 'divisions');
        $districtRows = $this->readPhpMyAdminExportTableData($districtsPath, 'districts');
        $upazilaRows = $this->readPhpMyAdminExportTableData($upazilasPath, 'upazilas');
        $unionRows = $this->readPhpMyAdminExportTableData($unionsPath, 'unions');
        $villageRowsRaw = $this->readJsonArrayFile($villagesPath); // user-maintained, starts empty

        $divisionIdToName = [];
        $divisions = [];
        foreach ($divisionsRows as $r) {
            $id = (string) ($r['id'] ?? '');
            $name = trim((string) ($r['name'] ?? ''));
            if ($id === '' || $name === '') {
                continue;
            }
            $divisionIdToName[$id] = $name;
            $divisions[] = $name;
        }
        $divisions = array_values(array_unique($divisions));
        sort($divisions);

        $districtIdToName = [];
        $districtIdToDivisionName = [];
        $districtsByDivision = [];
        foreach ($districtRows as $r) {
            $id = (string) ($r['id'] ?? '');
            $divisionId = (string) ($r['division_id'] ?? '');
            $name = trim((string) ($r['name'] ?? ''));
            if ($id === '' || $name === '' || $divisionId === '') {
                continue;
            }
            $divisionName = $divisionIdToName[$divisionId] ?? null;
            if (! $divisionName) {
                continue;
            }
            $districtIdToName[$id] = $name;
            $districtIdToDivisionName[$id] = $divisionName;
            $districtsByDivision[$divisionName] = $districtsByDivision[$divisionName] ?? [];
            $districtsByDivision[$divisionName][] = $name;
        }
        foreach ($districtsByDivision as $k => $arr) {
            $arr = array_values(array_unique($arr));
            sort($arr);
            $districtsByDivision[$k] = $arr;
        }

        $upazilaIdToName = [];
        $upazilaIdToDistrictName = [];
        $upazilasByDistrict = [];
        foreach ($upazilaRows as $r) {
            $id = (string) ($r['id'] ?? '');
            $districtId = (string) ($r['district_id'] ?? '');
            $name = trim((string) ($r['name'] ?? ''));
            if ($id === '' || $name === '' || $districtId === '') {
                continue;
            }
            $districtName = $districtIdToName[$districtId] ?? null;
            if (! $districtName) {
                continue;
            }
            $upazilaIdToName[$id] = $name;
            $upazilaIdToDistrictName[$id] = $districtName;
            $upazilasByDistrict[$districtName] = $upazilasByDistrict[$districtName] ?? [];
            $upazilasByDistrict[$districtName][] = $name;
        }
        foreach ($upazilasByDistrict as $k => $arr) {
            $arr = array_values(array_unique($arr));
            sort($arr);
            $upazilasByDistrict[$k] = $arr;
        }

        // villages.json can store either {union_id,name} or {upazila,union,name} records
        $villagesByUnionId = [];
        $villagesByUpazilaUnionKey = [];
        if (is_array($villageRowsRaw)) {
            foreach ($villageRowsRaw as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    continue;
                }
                $unionId = trim((string) ($row['union_id'] ?? ''));
                if ($unionId !== '') {
                    $villagesByUnionId[$unionId] = $villagesByUnionId[$unionId] ?? [];
                    $villagesByUnionId[$unionId][] = $name;
                }
                $upazilaName = trim((string) ($row['upazila'] ?? ''));
                $unionName = trim((string) ($row['union'] ?? ''));
                if ($upazilaName !== '' && $unionName !== '') {
                    $key = $upazilaName.'|'.$unionName;
                    $villagesByUpazilaUnionKey[$key] = $villagesByUpazilaUnionKey[$key] ?? [];
                    $villagesByUpazilaUnionKey[$key][] = $name;
                }
            }
        }

        $unionsByUpazila = [];
        foreach ($unionRows as $r) {
            $id = (string) ($r['id'] ?? '');
            $upazilaId = (string) ($r['upazilla_id'] ?? $r['upazila_id'] ?? '');
            $name = trim((string) ($r['name'] ?? ''));
            if ($id === '' || $upazilaId === '' || $name === '') {
                continue;
            }
            $upazilaName = $upazilaIdToName[$upazilaId] ?? null;
            if (! $upazilaName) {
                continue;
            }
            $villages = $villagesByUnionId[$id] ?? [];
            $villages = array_merge($villages, $villagesByUpazilaUnionKey[$upazilaName.'|'.$name] ?? []);
            $villages = array_values(array_unique(array_filter(array_map('strval', $villages))));
            sort($villages);

            $unionsByUpazila[$upazilaName] = $unionsByUpazila[$upazilaName] ?? [];
            $unionsByUpazila[$upazilaName][] = [
                'name' => $name,
                'type' => 'union',
                'villages' => $villages,
            ];
        }

        foreach ($unionsByUpazila as $k => $arr) {
            usort($arr, fn ($a, $b) => strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? '')));
            $unionsByUpazila[$k] = $arr;
        }

        return [
            'divisions' => $divisions,
            'districts' => $districtsByDivision,
            'upazilas' => $upazilasByDistrict,
            'unions' => $unionsByUpazila,
        ];
    }

    /**
     * Normalize empty strings to null so nullable unique columns (e.g. nid) and FKs do not break inserts.
     */
    private function normalizeEmployeeRequestPayload(Request $request): void
    {
        $nullableEmptiesToNull = [
            'nid', 'nid_number', 'smart_card_number', 'birth_registration_number',
            'email_id', 'phone', 'name_bn', 'gender', 'blood_group', 'date_of_birth',
            'confirmation_date', 'address', 'village', 'post_office', 'union_pouroshova',
            'ward_no', 'upazila', 'district', 'educational_qualification', 'emergency_contact',
            'fathers_name', 'fathers_mobile', 'mothers_name', 'mothers_mobile',
            'marital_status', 'spouse_name', 'spouse_mobile',
            'dropout_date', 'dropout_reason', 'final_payment_date', 'last_promotion_date',
            'reporting_to', 'last_branch_id',
        ];

        foreach ($nullableEmptiesToNull as $field) {
            if (! $request->has($field)) {
                continue;
            }
            $v = $request->input($field);
            if ($v === '' || $v === 'null') {
                $request->merge([$field => null]);
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function employeeTabDocumentTypes(): array
    {
        return ['national_id', 'passport', 'driving_license', 'education', 'certificate', 'contract', 'other'];
    }

    /**
     * Sync employee_documents from the tabbed create/edit form (multipart indices align with $request->file("documents.{i}.file")).
     */
    private function syncEmployeeDocumentsFromTabbedForm(Request $request, Employee $employee, bool $isCreate): void
    {
        $rows = $request->input('documents');
        if (! is_array($rows)) {
            $rows = [];
        }
        $eid = (int) $employee->id;

        /** @var list<array{index: int, id: int, document_type: string, title: string, description: ?string, expiry_date: ?\Illuminate\Support\Carbon}> $parsed */
        $parsed = [];
        $keptIds = [];

        foreach ($rows as $index => $row) {
            if (! is_array($row)) {
                continue;
            }
            $documentType = trim((string) ($row['document_type'] ?? ''));
            $title = trim((string) ($row['title'] ?? ''));
            $descriptionRaw = trim((string) ($row['description'] ?? ''));
            $description = $descriptionRaw !== '' ? $descriptionRaw : null;
            $expiryRaw = $row['expiry_date'] ?? null;
            $expiryDate = null;
            if ($expiryRaw !== null && $expiryRaw !== '') {
                $expiryDate = Carbon::parse((string) $expiryRaw)->startOfDay();
            }

            $id = isset($row['id']) ? (int) $row['id'] : 0;
            $hasFile = $request->hasFile("documents.$index.file");
            $file = $hasFile ? $request->file("documents.$index.file") : null;

            $rowEmpty = $documentType === '' && $title === '' && ! $hasFile && $id <= 0;
            if ($rowEmpty) {
                continue;
            }

            if ($documentType === '' || $title === '') {
                throw ValidationException::withMessages([
                    "documents.$index.title" => 'Document type and title are required for each document row.',
                ]);
            }

            if (! in_array($documentType, $this->employeeTabDocumentTypes(), true)) {
                throw ValidationException::withMessages([
                    "documents.$index.document_type" => 'Invalid document type.',
                ]);
            }

            if ($id <= 0 && ! $hasFile) {
                throw ValidationException::withMessages([
                    "documents.$index.file" => 'Please upload a file for each new document.',
                ]);
            }

            if ($hasFile && $file !== null) {
                $ext = strtolower((string) $file->getClientOriginalExtension());
                if (! in_array($ext, ['jpeg', 'jpg', 'png', 'pdf', 'doc', 'docx'], true)) {
                    throw ValidationException::withMessages([
                        "documents.$index.file" => 'Accepted formats: JPEG, PNG, PDF, DOC, DOCX.',
                    ]);
                }
                if ($file->getSize() > 5120 * 1024) {
                    throw ValidationException::withMessages([
                        "documents.$index.file" => 'Maximum file size is 5MB.',
                    ]);
                }
            }

            if ($id > 0) {
                if ($isCreate) {
                    continue;
                }
                $doc = EmployeeDocument::query()->where('employee_id', $eid)->where('id', $id)->first();
                if (! $doc) {
                    throw ValidationException::withMessages([
                        "documents.$index.id" => 'Document not found.',
                    ]);
                }
                $keptIds[] = $id;
            }

            $parsed[] = [
                'index' => (int) $index,
                'id' => $id,
                'document_type' => $documentType,
                'title' => $title,
                'description' => $description,
                'expiry_date' => $expiryDate,
                'has_file' => $hasFile,
            ];
        }

        if (! $isCreate) {
            $removeQuery = EmployeeDocument::query()->where('employee_id', $eid);
            if ($keptIds !== []) {
                $removeQuery->whereNotIn('id', $keptIds);
            }
            foreach ($removeQuery->get() as $removed) {
                if ($removed->file_path) {
                    Storage::disk('public')->delete($removed->file_path);
                }
                $removed->delete();
            }
        }

        foreach ($parsed as $p) {
            $index = $p['index'];
            $hasFile = $request->hasFile("documents.$index.file");
            $file = $hasFile ? $request->file("documents.$index.file") : null;

            if ($p['id'] > 0) {
                $doc = EmployeeDocument::query()->where('employee_id', $eid)->where('id', $p['id'])->first();
                if (! $doc) {
                    continue;
                }
                if ($hasFile && $file !== null) {
                    if ($doc->file_path) {
                        Storage::disk('public')->delete($doc->file_path);
                    }
                    $doc->file_path = $file->store('employee_documents', 'public');
                }
                $doc->document_type = $p['document_type'];
                $doc->title = $p['title'];
                $doc->description = $p['description'];
                $doc->expiry_date = $p['expiry_date'];
                $doc->save();
            } elseif ($hasFile && $file !== null) {
                EmployeeDocument::create([
                    'employee_id' => $eid,
                    'document_type' => $p['document_type'],
                    'title' => $p['title'],
                    'file_path' => $file->store('employee_documents', 'public'),
                    'description' => $p['description'],
                    'expiry_date' => $p['expiry_date'],
                ]);
            }
        }
    }

    /**
     * Rich server-side logging when employee create/update fails outside validation.
     */
    private function logEmployeeSaveFailure(string $action, Request $request, ?Employee $employee, \Throwable $e): void
    {
        $context = [
            'action' => $action,
            'employee_id' => $employee?->id,
            'exception_class' => $e::class,
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ];

        if ($e instanceof QueryException) {
            $context['sql_state'] = $e->errorInfo[0] ?? null;
            $context['driver_code'] = $e->errorInfo[1] ?? null;
            $context['driver_message'] = $e->errorInfo[2] ?? null;
            $context['sql'] = Str::limit((string) $e->getSql(), 2000);
            $context['bindings'] = $this->sanitizeBindingsForLog($e->getBindings());
        }

        $context['request_keys'] = array_keys($request->except(['photo', 'password', 'password_confirmation']));
        $context['payload_preview'] = Arr::only(
            $request->except(['photo', 'password', 'password_confirmation']),
            [
                'pin', 'name_en', 'email', 'department_id', 'joining_designation_id',
                'last_designation_id', 'current_branch_id', 'last_branch_id', 'reporting_to', 'status',
                'is_dropout', 'joining_date', 'confirmation_date',
            ]
        );

        if (config('app.debug')) {
            $context['trace'] = Str::limit($e->getTraceAsString(), 12000);
        }

        Log::error('Employee save failed', $context);

        $prev = $e->getPrevious();
        if ($prev instanceof \Throwable) {
            Log::error('Employee save failed (previous exception)', [
                'action' => $action,
                'previous_class' => $prev::class,
                'previous_message' => $prev->getMessage(),
            ]);
        }

        report($e);
    }

    /**
     * @param  array<int, mixed>  $bindings
     * @return array<int, mixed>
     */
    private function sanitizeBindingsForLog(array $bindings): array
    {
        return array_map(function ($b) {
            if (is_resource($b)) {
                return '[resource]';
            }
            if (is_string($b) && strlen($b) > 200) {
                return substr($b, 0, 200).'…';
            }

            return $b;
        }, $bindings);
    }

    private function buildEmployeeSaveErrorMessage(\Throwable $e): string
    {
        if ($e instanceof \RuntimeException && str_contains($e->getMessage(), 'user account')) {
            return $e->getMessage();
        }

        $msg = $e->getMessage();
        if (str_contains($msg, 'Duplicate entry') || str_contains($msg, 'UNIQUE constraint')) {
            return 'Duplicate value: PIN, employee ID, email, or NID may already exist. Please change them and try again.';
        }

        if ($e instanceof QueryException) {
            $driverMsg = (string) ($e->errorInfo[2] ?? '');
            if ($driverMsg !== '' && (str_contains($driverMsg, 'Duplicate') || str_contains($driverMsg, 'UNIQUE'))) {
                return 'Duplicate value: PIN, employee ID, email, or NID may already exist. Please change them and try again.';
            }
            $mysqlDriverCode = (int) ($e->errorInfo[1] ?? 0);
            if ($mysqlDriverCode === 3988 || str_contains($driverMsg, 'latin1_swedish_ci')) {
                return 'Database table encoding is outdated (latin1 vs utf8mb4). Bangla/Unicode text cannot be saved. Run: php artisan migrate — or ask DBA to run: ALTER TABLE employees CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;';
            }
            if ($driverMsg !== '' && str_contains(strtolower($driverMsg), 'foreign key constraint')) {
                return 'Linked data error (branch, department, designation, or manager). Please check selections and try again.';
            }
        }

        $base = 'Employee could not be saved. Please try again.';
        if (config('app.debug')) {
            $detail = $e instanceof QueryException && ! empty($e->errorInfo[2])
                ? (string) $e->errorInfo[2]
                : $msg;

            return $base.' [Debug] '.Str::limit($detail, 500);
        }

        return $base;
    }

    public function pinSuggestion(Request $request)
    {
        $pins = Employee::query()
            ->whereNotNull('pin')
            ->pluck('pin')
            ->map(fn ($v) => trim((string) $v))
            ->filter()
            ->values()
            ->all();

        $maxNormal = 0;
        $maxProject = 0;
        foreach ($pins as $p) {
            if (preg_match('/^\\d+$/', $p)) {
                $maxNormal = max($maxNormal, (int) $p);

                continue;
            }
            if (preg_match('/^p-(\\d+)$/i', $p, $m)) {
                $maxProject = max($maxProject, (int) $m[1]);
            }
        }

        $nextNormal = str_pad((string) ($maxNormal + 1), 4, '0', STR_PAD_LEFT);
        $nextProject = 'p-'.str_pad((string) ($maxProject + 1), 4, '0', STR_PAD_LEFT);

        return response()->json([
            'next_normal_pin' => $nextNormal,
            'next_project_pin' => $nextProject,
            'last_normal_pin' => $maxNormal > 0 ? str_pad((string) $maxNormal, 4, '0', STR_PAD_LEFT) : null,
        ]);
    }

    public function storeVillage(Request $request)
    {
        $validated = $request->validate([
            'division' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'upazila' => 'nullable|string|max:120',
            'union' => 'nullable|string|max:120',
            'name' => 'required|string|max:150',
        ]);

        $validated = array_map(fn ($v) => is_string($v) ? trim($v) : $v, $validated);
        $validated['created_by'] = $request->user()?->id;

        $village = LocationVillage::query()->firstOrCreate(
            Arr::only($validated, ['division', 'district', 'upazila', 'union', 'name']),
            Arr::only($validated, ['created_by'])
        );

        // Persist to data/locations/villages.json so it can be selected later (starts empty).
        try {
            $villagesPath = base_path('data/locations/villages.json');
            if (! file_exists($villagesPath)) {
                @file_put_contents($villagesPath, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
            }

            $existing = $this->readJsonArrayFile($villagesPath);
            if (! is_array($existing)) {
                $existing = [];
            }

            $unionId = $this->resolveBdGeoUnionId(
                (string) ($validated['division'] ?? ''),
                (string) ($validated['district'] ?? ''),
                (string) ($validated['upazila'] ?? ''),
                (string) ($validated['union'] ?? '')
            );

            $newEntry = [
                'name' => $village->name,
            ];
            if (is_string($unionId) && $unionId !== '') {
                $newEntry['union_id'] = $unionId;
            } else {
                // fallback so we can still match by names
                $newEntry['upazila'] = (string) ($village->upazila ?? '');
                $newEntry['union'] = (string) ($village->union ?? '');
            }

            $existsAlready = false;
            foreach ($existing as $row) {
                if (! is_array($row)) {
                    continue;
                }
                if (trim((string) ($row['name'] ?? '')) !== $newEntry['name']) {
                    continue;
                }
                if (! empty($newEntry['union_id']) && trim((string) ($row['union_id'] ?? '')) === $newEntry['union_id']) {
                    $existsAlready = true;
                    break;
                }
                if (empty($newEntry['union_id']) && trim((string) ($row['upazila'] ?? '')) === ($newEntry['upazila'] ?? '') && trim((string) ($row['union'] ?? '')) === ($newEntry['union'] ?? '')) {
                    $existsAlready = true;
                    break;
                }
            }

            if (! $existsAlready) {
                $existing[] = $newEntry;
                @file_put_contents($villagesPath, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
            }
        } catch (\Throwable) {
            // ignore file persistence errors
        }

        return response()->json([
            'id' => $village->id,
            'division' => $village->division,
            'district' => $village->district,
            'upazila' => $village->upazila,
            'union' => $village->union,
            'name' => $village->name,
        ]);
    }

    private function syncZoneRegionalManagerAssignment(Employee $employee): void
    {
        try {
            $designationName = trim((string) optional($employee->designation)->name);
            if ($designationName === '') {
                return;
            }

            // Keep it simple: our manager designations are English strings
            $designationNameLower = strtolower($designationName);
            $isZonalManager = $designationNameLower === 'zonal manager';
            $isRegionalManager = $designationNameLower === 'regional manager';

            if (! $isZonalManager && ! $isRegionalManager) {
                return;
            }

            $employee->loadMissing([
                'branch.regionalOffice.zone',
            ]);

            $branch = $employee->branch;
            $regionalOffice = $branch?->regionalOffice;
            $zone = $regionalOffice?->zone;

            if ($isZonalManager && $zone) {
                $zone->zone_manager_employee_id = $employee->id;
                $zone->save();
            }

            if ($isRegionalManager && $regionalOffice) {
                $regionalOffice->regional_manager_employee_id = $employee->id;
                $regionalOffice->save();
            }
        } catch (\Throwable $e) {
            Log::error('Manager auto-assignment failed', [
                'employee_id' => $employee->id ?? null,
                'current_branch_id' => $employee->current_branch_id ?? null,
                'designation_id' => $employee->designation_id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Map designation title (English, case-insensitive) to optional app role names (see DatabaseSeeder).
     *
     * @return list<string>
     */
    private function designationNameToAdditionalRoleNames(?string $designationName): array
    {
        if (! is_string($designationName) || trim($designationName) === '') {
            return [];
        }

        $n = mb_strtolower(trim($designationName));

        if (str_contains($n, 'executive') && str_contains($n, 'director')) {
            return ['Executive Director'];
        }
        if (str_contains($n, 'assistant') && str_contains($n, 'director')) {
            return ['Assistant Director (Microfinance)'];
        }
        if ((str_contains($n, 'microfinance') && str_contains($n, 'director')) || $n === 'director (microfinance)' || $n === 'director') {
            return ['Director (Microfinance)'];
        }
        if ($n === 'zonal manager') {
            return ['Zonal Manager'];
        }
        if ($n === 'regional manager') {
            return ['Regional Manager'];
        }
        if ($n === 'branch manager') {
            return ['Branch Manager'];
        }
        if ($n === 'department head') {
            return ['Department Head'];
        }

        return [];
    }

    private function buildUsernameBaseFromPin(string $pin): string
    {
        $local = strtolower($pin);
        $local = preg_replace('/[^a-z0-9_]/', '', $local) ?: 'user';

        return Str::limit($local, 180, '');
    }

    private function allocateUniqueUsername(string $base, ?int $exceptUserId = null): string
    {
        $username = $base;
        $n = 0;
        while (User::query()
            ->where('username', $username)
            ->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists()) {
            $n++;
            $suffix = (string) $n;
            $username = Str::limit($base, max(1, 191 - strlen($suffix)), '').$suffix;
        }

        return $username;
    }

    /**
     * Create or update a User for this employee: username from PIN, email from employee, password on first create only.
     * Pivot roles: always "Employee", plus organogram roles when designation matches.
     *
     * @throws \RuntimeException When email is taken by another user
     */
    private function syncUserAccountForEmployee(Employee $employee): void
    {
        $employee->loadMissing(['designation']);

        $employeeRole = Role::query()->where('name', self::AUTO_USER_EMPLOYEE_ROLE_NAME)->first();
        if (! $employeeRole) {
            Log::warning('Auto user skipped: Employee role missing', ['employee_id' => $employee->id]);

            return;
        }

        $extraNames = $this->designationNameToAdditionalRoleNames($employee->designation?->name);
        $roleIds = [$employeeRole->id];
        foreach ($extraNames as $roleName) {
            $r = Role::query()->where('name', $roleName)->first();
            if ($r) {
                $roleIds[] = $r->id;
            } else {
                Log::warning('Auto user: optional role not found', ['role_name' => $roleName, 'employee_id' => $employee->id]);
            }
        }
        $roleIds = array_values(array_unique($roleIds));

        $primaryRoleId = $employeeRole->id;
        foreach ($roleIds as $rid) {
            if ($rid !== $employeeRole->id) {
                $primaryRoleId = $rid;
                break;
            }
        }

        $pinRaw = (string) ($employee->getRawOriginal('pin') ?? $employee->getRawOriginal('employee_id') ?? '');
        $pin = trim($pinRaw);
        if ($pin === '') {
            Log::warning('Auto user skipped: empty PIN', ['employee_id' => $employee->id]);

            return;
        }

        $email = trim((string) ($employee->email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = strtolower($pin).'@'.$this->getAutoEmailDomain();
        }

        if (User::query()->where('email', $email)->where('employee_id', '!=', $employee->id)->exists()) {
            throw new \RuntimeException('This email is already used by another user account. Choose a different employee email.');
        }

        $user = User::query()->where('employee_id', $employee->id)->first();
        $base = $this->buildUsernameBaseFromPin($pin);
        $username = $this->allocateUniqueUsername($base, $user?->id);

        $name = trim((string) ($employee->getRawOriginal('name_en') ?? ''));
        if ($name === '') {
            $name = trim((string) ($employee->getRawOriginal('first_name') ?? 'User'));
        }

        $payload = [
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'role_id' => $primaryRoleId,
            'employee_id' => $employee->id,
            'branch_id' => $employee->current_branch_id,
            'active_status' => $employee->status === 'active',
        ];

        if ($user) {
            $user->fill($payload);
            $user->save();
        } else {
            // User model uses 'password' => 'hashed' cast — assign plain string
            $payload['password'] = $pin;
            $user = User::create($payload);
        }

        $user->roles()->sync($roleIds);
    }

    /**
     * Display a listing of employees.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Employee::with(['department', 'designation', 'branch']);
        OrganogramAccessService::constrainVisibleEmployees($query, $user);

        $query
            ->when($request->search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('current_branch_id', $branchId);
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            });

        $perPage = (int) $request->get('per_page', 10);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500])) {
            $perPage = 10;
        }

        $employees = $query->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        $deptIds = OrganogramAccessService::accessibleDepartmentIdList($user);
        $departments = $deptIds === null
            ? Department::query()->orderBy('name')->get()
            : Department::query()->whereIn('id', $deptIds)->orderBy('name')->get();

        $branchIds = OrganogramAccessService::accessibleBranchIdList($user);
        $branches = $branchIds === null
            ? Branch::query()->orderBy('name')->get()
            : Branch::query()->whereIn('id', $branchIds)->orderBy('name')->get();

        return Inertia::render('employee/index', [
            'employees' => $employees,
            'departments' => $departments,
            'branches' => $branches,
            'filters' => $request->only(['search', 'department_id', 'branch_id', 'status', 'per_page']),
        ]);
    }

    /**
     * Show form to create a new employee.
     */
    public function create()
    {
        $departments = Department::all();
        $designations = Designation::all();
        $branches = Branch::query()
            ->with([
                'regionalOffice.zone.zoneManager:id,employee_id,first_name,last_name',
                'regionalOffice.regionalManager:id,employee_id,first_name,last_name',
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'regional_office_id']);
        $managers = Employee::where('status', 'active')->get();

        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get();
        $programs = Program::query()->where('is_active', true)->orderBy('name')->get();
        $projects = Project::query()->where('is_active', true)->orderBy('name')->get();

        $banks = $this->readJsonArrayFile(base_path('data/bank.json'));
        $relations = $this->readJsonArrayFile(base_path('data/relation.json'));
        $educationBoards = $this->readJsonArrayFile(base_path('data/educationboard.json'));
        $locations = $this->buildLocationsPayload();

        return Inertia::render('employee/create', [
            'oldInput' => old(),
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches->map(function (Branch $branch) {
                $regionalManager = $branch->regionalOffice?->regionalManager;
                $zoneManager = $branch->regionalOffice?->zone?->zoneManager;

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'branch_code' => $branch->branch_code,
                    'regionalManager' => $regionalManager ? [
                        'id' => $regionalManager->id,
                        'employee_id' => $regionalManager->employee_id,
                        'first_name' => $regionalManager->first_name,
                        'last_name' => $regionalManager->last_name,
                    ] : null,
                    'zoneManager' => $zoneManager ? [
                        'id' => $zoneManager->id,
                        'employee_id' => $zoneManager->employee_id,
                        'first_name' => $zoneManager->first_name,
                        'last_name' => $zoneManager->last_name,
                    ] : null,
                ];
            }),
            'managers' => $managers,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
            'employeeTypes' => $employeeTypes,
            'programs' => $programs,
            'projects' => $projects,
            'banks' => $banks,
            'relations' => $relations,
            'educationBoards' => $educationBoards,
            'locations' => $locations,
            'defaultBankName' => 'Prime Bank PLC',
            'documentTypes' => $this->employeeTabDocumentTypes(),
        ]);
    }

    /**
     * Store a newly created employee.
     */
    public function store(Request $request)
    {
        $createdEmployee = null;

        try {
            $this->normalizeEmployeeRequestPayload($request);
            $this->resolveNidAndSmartCardFromRequest($request);

            $maritalStatuses = [
                'Single',
                'Never Married',
                'Unmarried',
                'Separated',
                'Divorced',
                'Widowed',
                'Married',
            ];

            $validated = $request->validate([
                // Tab 1
                'current_branch_id' => 'required|exists:branches,id',
                'employee_type_id' => 'nullable|exists:employee_types,id',
                'pin' => 'required|string|max:20|unique:employees,pin',

                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',

                'gender' => 'nullable|string|max:20',
                'religion' => 'nullable|string|max:50',
                'marital_status' => 'nullable|string|in:'.implode(',', $maritalStatuses),
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',

                'birth_date_certificate' => 'nullable|date',
                'birth_date_original' => 'nullable|date',
                'date_of_birth' => 'nullable|date',
                'blood_group' => 'nullable|string|max:10',

                'joining_date' => 'required|date',
                'confirmation_date' => 'nullable|date|after_or_equal:joining_date',

                'fathers_name' => 'nullable|string|max:255',
                'fathers_mobile' => 'nullable|string|max:20',
                'mothers_name' => 'nullable|string|max:255',
                'mothers_mobile' => 'nullable|string|max:20',

                'department_id' => 'required|exists:departments,id',
                'joining_designation_id' => 'required|exists:designations,id',
                'last_designation_id' => 'nullable|exists:designations,id',

                'program_id' => 'nullable|exists:programs,id',
                'project_id' => 'nullable|exists:projects,id',

                'nid' => 'nullable|string|max:50|unique:employees,nid',
                'nid_number' => 'nullable|string|max:50',
                'smart_card_number' => 'nullable|string|max:50',
                'birth_registration_number' => 'nullable|string|max:50',
                'tin_certificate_no' => 'nullable|string|max:50',
                'driving_license_no' => 'nullable|string|max:50',
                'passport_no' => 'nullable|string|max:50',

                'is_project_employee' => 'nullable|boolean',
                'is_custodian' => 'nullable|boolean',
                'identification_mark' => 'nullable|string|max:255',

                // Contact
                'email' => 'nullable|email',
                'email_id' => 'nullable|email',
                'phone' => 'nullable|string|max:20',
                'mobile_personal' => 'required|string|max:20',
                'mobile_official' => 'nullable|string|max:20',

                // Nested tab payloads
                'addresses' => 'nullable|array',
                'addresses.*.type' => 'required_with:addresses|in:present,permanent',
                'addresses.*.division' => 'nullable|string|max:100',
                'addresses.*.district' => 'nullable|string|max:100',
                'addresses.*.upazila' => 'nullable|string|max:120',
                'addresses.*.union' => 'nullable|string|max:120',
                'addresses.*.village' => 'nullable|string|max:150',
                'addresses.*.address_details' => 'nullable|string',

                'educations' => 'nullable|array',
                'educations.*.degree' => 'required_with:educations|string|max:150',
                'educations.*.institute' => 'nullable|string|max:255',
                'educations.*.group_name' => 'nullable|string|max:150',
                'educations.*.board' => 'nullable|string|max:255',
                'educations.*.subject' => 'nullable|string|max:255',
                'educations.*.result_type' => 'nullable|in:gpa,cgpa,other',
                'educations.*.result_value' => 'nullable|string|max:50',

                'bank' => 'nullable|array',
                'bank.bank_name' => 'nullable|string|max:200',
                'bank.branch_name' => 'nullable|string|max:200',
                'bank.account_no' => 'nullable|string|max:80',
                'bank.account_type' => 'nullable|in:current,savings',
                'bank.bank_address' => 'nullable|string',
                'bank.remark' => 'nullable|string',

                'nominees' => 'nullable|array',
                'nominees.*.name' => 'required_with:nominees|string|max:200',
                'nominees.*.relation' => 'nullable|string|max:80',
                'nominees.*.date_of_birth' => 'nullable|date',
                'nominees.*.share' => 'nullable|numeric|min:0|max:100',
                'nominees.*.contact' => 'nullable|string|max:30',

                'guarantors' => 'nullable|array',
                'guarantors.*.name' => 'required_with:guarantors|string|max:200',
                'guarantors.*.age' => 'nullable|integer|min:0|max:150',
                'guarantors.*.occupation' => 'nullable|string|max:150',
                'guarantors.*.relation' => 'nullable|string|max:80',
                'guarantors.*.phone' => 'nullable|string|max:30',
                'guarantors.*.email' => 'nullable|email',

                'guarantor_cheques' => 'nullable|array',
                'guarantor_cheques.*.bank_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.branch_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.cheque_no' => 'nullable|string|max:80',

                'collateral' => 'nullable|array',
                'collateral.has_certificate' => 'nullable|boolean',
                'collateral.certificate_levels' => 'nullable|array',
                'collateral.certificate_levels.*' => 'in:ssc,hsc,honors,masters',
                'collateral.security_amount' => 'nullable|numeric|min:0',
                'collateral.collateral_interest' => 'nullable|numeric|min:0',
                'collateral.collateral_date' => 'nullable|date',
                'collateral.notes' => 'nullable|string',

                'collateral_receive_cheques' => 'nullable|array',
                'collateral_receive_cheques.*.bank_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.branch_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.cheque_no' => 'nullable|string|max:80',
                'collateral_receive_cheques.*.notes' => 'nullable|string',

                'assets' => 'nullable|array',
                'assets.*.serial' => 'nullable|integer|min:0',
                'assets.*.asset_no' => 'nullable|string|max:100',
                'assets.*.name' => 'required_with:assets|string|max:200',
                'assets.*.details' => 'nullable|string',
                'assets.*.provided_quality' => 'nullable|string|max:120',
                'assets.*.asset_price' => 'nullable|numeric|min:0',

                'experiences' => 'nullable|array',
                'experiences.*.organization' => 'required_with:experiences|string|max:255',
                'experiences.*.from_date' => 'nullable|date',
                'experiences.*.to_date' => 'nullable|date',
                'experiences.*.designation' => 'nullable|string|max:200',
                'experiences.*.department' => 'nullable|string|max:200',
                'experiences.*.address' => 'nullable|string',

                'trainings' => 'nullable|array',
                'trainings.*.training_title' => 'required_with:trainings|string|max:255',
                'trainings.*.institute' => 'nullable|string|max:255',
                'trainings.*.address' => 'nullable|string',
                'trainings.*.duration' => 'nullable|string|max:100',
                'trainings.*.remarks' => 'nullable|string',

                'documents' => 'nullable|array',
                'documents.*.id' => 'nullable|integer',
                'documents.*.document_type' => 'nullable|string|max:50',
                'documents.*.title' => 'nullable|string|max:255',
                'documents.*.description' => 'nullable|string',
                'documents.*.expiry_date' => 'nullable|date',

                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
                'signature' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            $marital = trim((string) ($validated['marital_status'] ?? ''));
            $needsSpouse = in_array($marital, ['Married', 'Widowed', 'Separated'], true);
            if ($needsSpouse) {
                $request->validate([
                    'spouse_name' => 'required|string|max:255',
                    'spouse_mobile' => 'required|string|max:20',
                ]);
            }

            if (empty($validated['last_designation_id'])) {
                $validated['last_designation_id'] = $validated['joining_designation_id'];
            }

            $employeeData = Arr::except($validated, [
                'addresses',
                'educations',
                'bank',
                'nominees',
                'guarantors',
                'guarantor_cheques',
                'collateral',
                'collateral_receive_cheques',
                'assets',
                'experiences',
                'trainings',
                'documents',
                'photo',
                'signature',
            ]);

            $employeeData['employee_id'] = $employeeData['pin'];
            $employeeData['first_name'] = $employeeData['name_en'];
            $employeeData['designation_id'] = $employeeData['last_designation_id'];

            // Ensure employees.email is always filled (DB column is NOT NULL)
            $email = trim((string) ($employeeData['email'] ?? ''));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $employeeData['email'] = strtolower((string) $employeeData['pin']).'@'.$this->getAutoEmailDomain();
            }

            // Auto probation/confirmation from employee type (months)
            if (! empty($employeeData['joining_date']) && empty($employeeData['confirmation_date']) && ! empty($employeeData['employee_type_id'])) {
                $etype = EmployeeType::query()->find($employeeData['employee_type_id']);
                $months = (int) ($etype?->probation_months ?? 0);
                if ($months > 0) {
                    $employeeData['confirmation_date'] = Carbon::parse($employeeData['joining_date'])->addMonthsNoOverflow($months)->toDateString();
                    $employeeData['probation_period_days'] = Carbon::parse($employeeData['joining_date'])
                        ->diffInDays(Carbon::parse($employeeData['confirmation_date']));
                } else {
                    $employeeData['probation_period_days'] = 0;
                    $employeeData['confirmation_date'] = Carbon::parse($employeeData['joining_date'])->toDateString();
                }
            }

            DB::transaction(function () use ($request, $employeeData, $validated, &$createdEmployee) {
                if ($request->hasFile('photo')) {
                    $photo = $request->file('photo');
                    $ext = strtolower((string) $photo->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_photos');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $photo->move($targetDir, $filename);
                    $employeeData['photo'] = 'employee_photos/'.$filename;
                }

                if ($request->hasFile('signature')) {
                    $sig = $request->file('signature');
                    $ext = strtolower((string) $sig->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_signatures');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $sig->move($targetDir, $filename);
                    $employeeData['signature'] = 'employee_signatures/'.$filename;
                }

                $createdEmployee = Employee::create($employeeData);
                $createdEmployee->load('designation');
                $this->syncZoneRegionalManagerAssignment($createdEmployee);
                $this->syncUserAccountForEmployee($createdEmployee);

                $eid = $createdEmployee->id;

                $addresses = is_array($validated['addresses'] ?? null) ? $validated['addresses'] : [];
                foreach ($addresses as $a) {
                    DB::table('employee_addresses')->updateOrInsert(
                        ['employee_id' => $eid, 'type' => $a['type']],
                        [
                            'division' => $a['division'] ?? null,
                            'district' => $a['district'] ?? null,
                            'upazila' => $a['upazila'] ?? null,
                            'union' => $a['union'] ?? null,
                            'village' => $a['village'] ?? null,
                            'address_details' => $a['address_details'] ?? null,
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }

                $educations = is_array($validated['educations'] ?? null) ? $validated['educations'] : [];
                foreach ($educations as $e) {
                    DB::table('employee_educations')->insert([
                        'employee_id' => $eid,
                        'degree' => (string) ($e['degree'] ?? ''),
                        'institute' => $e['institute'] ?? null,
                        'group_name' => $e['group_name'] ?? null,
                        'board' => $e['board'] ?? null,
                        'subject' => $e['subject'] ?? null,
                        'result_type' => $e['result_type'] ?? null,
                        'result_value' => $e['result_value'] ?? null,
                        'passing_year' => $e['passing_year'] ?? null,
                        'remarks' => $e['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $bank = is_array($validated['bank'] ?? null) ? $validated['bank'] : null;
                if ($bank) {
                    DB::table('employee_bank_accounts')->insert([
                        'employee_id' => $eid,
                        'bank_name' => (string) ($bank['bank_name'] ?? ''),
                        'branch_name' => $bank['branch_name'] ?? null,
                        'account_no' => $bank['account_no'] ?? null,
                        'account_type' => $bank['account_type'] ?? null,
                        'bank_address' => $bank['bank_address'] ?? null,
                        'remark' => $bank['remark'] ?? null,
                        'is_primary' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $nominees = is_array($validated['nominees'] ?? null) ? $validated['nominees'] : [];
                foreach ($nominees as $n) {
                    DB::table('employee_nominees')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($n['name'] ?? ''),
                        'relation' => $n['relation'] ?? null,
                        'date_of_birth' => $n['date_of_birth'] ?? null,
                        'share' => $n['share'] ?? null,
                        'contact' => $n['contact'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantors = is_array($validated['guarantors'] ?? null) ? $validated['guarantors'] : [];
                foreach ($guarantors as $g) {
                    DB::table('employee_guarantors')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($g['name'] ?? ''),
                        'age' => $g['age'] ?? null,
                        'occupation' => $g['occupation'] ?? null,
                        'relation' => $g['relation'] ?? null,
                        'phone' => $g['phone'] ?? null,
                        'email' => $g['email'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantorCheques = is_array($validated['guarantor_cheques'] ?? null) ? $validated['guarantor_cheques'] : [];
                foreach ($guarantorCheques as $c) {
                    DB::table('employee_guarantor_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_guarantor_id' => null,
                        'bank_name' => $c['bank_name'] ?? null,
                        'branch_name' => $c['branch_name'] ?? null,
                        'cheque_no' => $c['cheque_no'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $collateral = is_array($validated['collateral'] ?? null) ? $validated['collateral'] : null;
                $collateralId = null;
                if ($collateral) {
                    $collateralId = DB::table('employee_collaterals')->insertGetId([
                        'employee_id' => $eid,
                        'has_certificate' => (bool) ($collateral['has_certificate'] ?? false),
                        'certificate_levels' => isset($collateral['certificate_levels']) ? json_encode($collateral['certificate_levels']) : null,
                        'security_amount' => $collateral['security_amount'] ?? null,
                        'collateral_interest' => $collateral['collateral_interest'] ?? null,
                        'collateral_date' => $collateral['collateral_date'] ?? null,
                        'notes' => $collateral['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $receiveCheques = is_array($validated['collateral_receive_cheques'] ?? null) ? $validated['collateral_receive_cheques'] : [];
                foreach ($receiveCheques as $rc) {
                    DB::table('employee_collateral_receive_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_collateral_id' => $collateralId,
                        'bank_name' => $rc['bank_name'] ?? null,
                        'branch_name' => $rc['branch_name'] ?? null,
                        'cheque_no' => $rc['cheque_no'] ?? null,
                        'notes' => $rc['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $assets = is_array($validated['assets'] ?? null) ? $validated['assets'] : [];
                foreach ($assets as $as) {
                    DB::table('employee_assets')->insert([
                        'employee_id' => $eid,
                        'serial' => $as['serial'] ?? null,
                        'asset_no' => $as['asset_no'] ?? null,
                        'name' => (string) ($as['name'] ?? ''),
                        'details' => $as['details'] ?? null,
                        'provided_quality' => $as['provided_quality'] ?? null,
                        'asset_price' => $as['asset_price'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $experiences = is_array($validated['experiences'] ?? null) ? $validated['experiences'] : [];
                foreach ($experiences as $ex) {
                    DB::table('employee_experiences')->insert([
                        'employee_id' => $eid,
                        'organization' => (string) ($ex['organization'] ?? ''),
                        'from_date' => $ex['from_date'] ?? null,
                        'to_date' => $ex['to_date'] ?? null,
                        'designation' => $ex['designation'] ?? null,
                        'department' => $ex['department'] ?? null,
                        'address' => $ex['address'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $trainings = is_array($validated['trainings'] ?? null) ? $validated['trainings'] : [];
                foreach ($trainings as $tr) {
                    DB::table('employee_trainings')->insert([
                        'employee_id' => $eid,
                        'training_title' => (string) ($tr['training_title'] ?? ''),
                        'institute' => $tr['institute'] ?? null,
                        'address' => $tr['address'] ?? null,
                        'duration' => $tr['duration'] ?? null,
                        'remarks' => $tr['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $this->syncEmployeeDocumentsFromTabbedForm($request, $createdEmployee, true);
            });

            return redirect()->route('employees.index')
                ->with('success', 'Employee created successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            $this->logEmployeeSaveFailure('store', $request, $createdEmployee, $e);
            $message = $this->buildEmployeeSaveErrorMessage($e);

            return back()
                ->withInput()
                ->withErrors(['submit' => $message])
                ->with('error', $message);
        }
    }

    /**
     * Show form to edit an employee.
     */
    public function edit(Employee $employee)
    {
        $departments = Department::all();
        $designations = Designation::all();
        $branches = Branch::query()
            ->with([
                'regionalOffice.zone.zoneManager:id,employee_id,first_name,last_name',
                'regionalOffice.regionalManager:id,employee_id,first_name,last_name',
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'regional_office_id']);
        $managers = Employee::where('status', 'active')
            ->where('id', '!=', $employee->id)
            ->get();

        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get();
        $programs = Program::query()->where('is_active', true)->orderBy('name')->get();
        $projects = Project::query()->where('is_active', true)->orderBy('name')->get();

        $banks = $this->readJsonArrayFile(base_path('data/bank.json'));
        $relations = $this->readJsonArrayFile(base_path('data/relation.json'));
        $educationBoards = $this->readJsonArrayFile(base_path('data/educationboard.json'));
        $locations = $this->buildLocationsPayload();

        // Load new tabbed relational data (so edit does not wipe on update)
        $employeePayload = $employee->toArray();
        $employeePayload['pin'] = $employee->pin;
        $employeePayload['addresses'] = DB::table('employee_addresses')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['educations'] = DB::table('employee_educations')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['bank'] = DB::table('employee_bank_accounts')->where('employee_id', $employee->id)->first();
        $employeePayload['nominees'] = DB::table('employee_nominees')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['guarantors'] = DB::table('employee_guarantors')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['guarantor_cheques'] = DB::table('employee_guarantor_cheques')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['collateral'] = DB::table('employee_collaterals')->where('employee_id', $employee->id)->first();
        $employeePayload['collateral_receive_cheques'] = DB::table('employee_collateral_receive_cheques')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['assets'] = DB::table('employee_assets')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['experiences'] = DB::table('employee_experiences')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['trainings'] = DB::table('employee_trainings')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['documents'] = EmployeeDocument::query()
            ->where('employee_id', $employee->id)
            ->orderBy('id')
            ->get()
            ->map(fn (EmployeeDocument $d) => [
                'id' => $d->id,
                'document_type' => $d->document_type,
                'title' => $d->title,
                'description' => $d->description,
                'expiry_date' => $d->expiry_date?->format('Y-m-d') ?? '',
                'existing_file_path' => $d->file_path,
            ])
            ->all();

        return Inertia::render('employee/edit', [
            'oldInput' => old(),
            'employee' => $employeePayload,
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches->map(function (Branch $branch) {
                $regionalManager = $branch->regionalOffice?->regionalManager;
                $zoneManager = $branch->regionalOffice?->zone?->zoneManager;

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'branch_code' => $branch->branch_code,
                    'regionalManager' => $regionalManager ? [
                        'id' => $regionalManager->id,
                        'employee_id' => $regionalManager->employee_id,
                        'first_name' => $regionalManager->first_name,
                        'last_name' => $regionalManager->last_name,
                    ] : null,
                    'zoneManager' => $zoneManager ? [
                        'id' => $zoneManager->id,
                        'employee_id' => $zoneManager->employee_id,
                        'first_name' => $zoneManager->first_name,
                        'last_name' => $zoneManager->last_name,
                    ] : null,
                ];
            }),
            'managers' => $managers,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
            'employeeTypes' => $employeeTypes,
            'programs' => $programs,
            'projects' => $projects,
            'banks' => $banks,
            'relations' => $relations,
            'educationBoards' => $educationBoards,
            'locations' => $locations,
            'defaultBankName' => 'Prime Bank PLC',
            'documentTypes' => $this->employeeTabDocumentTypes(),
        ]);
    }

    /**
     * Update the specified employee.
     */
    public function update(Request $request, Employee $employee)
    {
        try {
            $this->normalizeEmployeeRequestPayload($request);
            $this->resolveNidAndSmartCardFromRequest($request);

            $validated = $request->validate([
                // Tab 1
                'current_branch_id' => 'required|exists:branches,id',
                'employee_type_id' => 'nullable|exists:employee_types,id',
                'pin' => 'required|string|max:20|unique:employees,pin,'.$employee->id,

                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',

                'gender' => 'nullable|string|max:20',
                'religion' => 'nullable|string|max:50',
                'marital_status' => 'nullable|string|max:30',
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',

                'birth_date_certificate' => 'nullable|date',
                'birth_date_original' => 'nullable|date',
                'date_of_birth' => 'nullable|date',
                'blood_group' => 'nullable|string|max:10',

                'joining_date' => 'required|date',
                'confirmation_date' => 'nullable|date|after_or_equal:joining_date',

                'fathers_name' => 'nullable|string|max:255',
                'fathers_mobile' => 'nullable|string|max:20',
                'mothers_name' => 'nullable|string|max:255',
                'mothers_mobile' => 'nullable|string|max:20',

                'department_id' => 'required|exists:departments,id',
                'joining_designation_id' => 'required|exists:designations,id',
                'last_designation_id' => 'nullable|exists:designations,id',

                'program_id' => 'nullable|exists:programs,id',
                'project_id' => 'nullable|exists:projects,id',

                'nid' => 'nullable|string|max:50|unique:employees,nid,'.$employee->id,
                'nid_number' => 'nullable|string|max:50',
                'smart_card_number' => 'nullable|string|max:50',
                'birth_registration_number' => 'nullable|string|max:50',
                'tin_certificate_no' => 'nullable|string|max:50',
                'driving_license_no' => 'nullable|string|max:50',
                'passport_no' => 'nullable|string|max:50',

                'is_project_employee' => 'nullable|boolean',
                'is_custodian' => 'nullable|boolean',
                'identification_mark' => 'nullable|string|max:255',

                // Contact
                'email' => 'nullable|email',
                'email_id' => 'nullable|email',
                'phone' => 'nullable|string|max:20',
                'mobile_personal' => 'required|string|max:20',
                'mobile_official' => 'nullable|string|max:20',

                // Nested tab payloads
                'addresses' => 'nullable|array',
                'addresses.*.type' => 'required_with:addresses|in:present,permanent',
                'addresses.*.division' => 'nullable|string|max:100',
                'addresses.*.district' => 'nullable|string|max:100',
                'addresses.*.upazila' => 'nullable|string|max:120',
                'addresses.*.union' => 'nullable|string|max:120',
                'addresses.*.village' => 'nullable|string|max:150',
                'addresses.*.address_details' => 'nullable|string',

                'educations' => 'nullable|array',
                'educations.*.degree' => 'required_with:educations|string|max:150',
                'educations.*.institute' => 'nullable|string|max:255',
                'educations.*.group_name' => 'nullable|string|max:150',
                'educations.*.board' => 'nullable|string|max:255',
                'educations.*.subject' => 'nullable|string|max:255',
                'educations.*.result_type' => 'nullable|in:gpa,cgpa,other',
                'educations.*.result_value' => 'nullable|string|max:50',

                'bank' => 'nullable|array',
                'bank.bank_name' => 'nullable|string|max:200',
                'bank.branch_name' => 'nullable|string|max:200',
                'bank.account_no' => 'nullable|string|max:80',
                'bank.account_type' => 'nullable|in:current,savings',
                'bank.bank_address' => 'nullable|string',
                'bank.remark' => 'nullable|string',

                'nominees' => 'nullable|array',
                'nominees.*.name' => 'required_with:nominees|string|max:200',
                'nominees.*.relation' => 'nullable|string|max:80',
                'nominees.*.date_of_birth' => 'nullable|date',
                'nominees.*.share' => 'nullable|numeric|min:0|max:100',
                'nominees.*.contact' => 'nullable|string|max:30',

                'guarantors' => 'nullable|array',
                'guarantors.*.name' => 'required_with:guarantors|string|max:200',
                'guarantors.*.age' => 'nullable|integer|min:0|max:150',
                'guarantors.*.occupation' => 'nullable|string|max:150',
                'guarantors.*.relation' => 'nullable|string|max:80',
                'guarantors.*.phone' => 'nullable|string|max:30',
                'guarantors.*.email' => 'nullable|email',

                'guarantor_cheques' => 'nullable|array',
                'guarantor_cheques.*.bank_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.branch_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.cheque_no' => 'nullable|string|max:80',

                'collateral' => 'nullable|array',
                'collateral.has_certificate' => 'nullable|boolean',
                'collateral.certificate_levels' => 'nullable|array',
                'collateral.certificate_levels.*' => 'in:ssc,hsc,honors,masters',
                'collateral.security_amount' => 'nullable|numeric|min:0',
                'collateral.collateral_interest' => 'nullable|numeric|min:0',
                'collateral.collateral_date' => 'nullable|date',
                'collateral.notes' => 'nullable|string',

                'collateral_receive_cheques' => 'nullable|array',
                'collateral_receive_cheques.*.bank_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.branch_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.cheque_no' => 'nullable|string|max:80',
                'collateral_receive_cheques.*.notes' => 'nullable|string',

                'assets' => 'nullable|array',
                'assets.*.serial' => 'nullable|integer|min:0',
                'assets.*.asset_no' => 'nullable|string|max:100',
                'assets.*.name' => 'required_with:assets|string|max:200',
                'assets.*.details' => 'nullable|string',
                'assets.*.provided_quality' => 'nullable|string|max:120',
                'assets.*.asset_price' => 'nullable|numeric|min:0',

                'experiences' => 'nullable|array',
                'experiences.*.organization' => 'required_with:experiences|string|max:255',
                'experiences.*.from_date' => 'nullable|date',
                'experiences.*.to_date' => 'nullable|date',
                'experiences.*.designation' => 'nullable|string|max:200',
                'experiences.*.department' => 'nullable|string|max:200',
                'experiences.*.address' => 'nullable|string',

                'trainings' => 'nullable|array',
                'trainings.*.training_title' => 'required_with:trainings|string|max:255',
                'trainings.*.institute' => 'nullable|string|max:255',
                'trainings.*.address' => 'nullable|string',
                'trainings.*.duration' => 'nullable|string|max:100',
                'trainings.*.remarks' => 'nullable|string',

                'documents' => 'nullable|array',
                'documents.*.id' => [
                    'nullable',
                    'integer',
                    Rule::exists('employee_documents', 'id')->where(fn ($q) => $q->where('employee_id', $employee->id)),
                ],
                'documents.*.document_type' => 'nullable|string|max:50',
                'documents.*.title' => 'nullable|string|max:255',
                'documents.*.description' => 'nullable|string',
                'documents.*.expiry_date' => 'nullable|date',

                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
                'signature' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            if (empty($validated['last_designation_id'])) {
                $validated['last_designation_id'] = $validated['joining_designation_id'];
            }

            $employeeData = Arr::except($validated, [
                'addresses',
                'educations',
                'bank',
                'nominees',
                'guarantors',
                'guarantor_cheques',
                'collateral',
                'collateral_receive_cheques',
                'assets',
                'experiences',
                'trainings',
                'documents',
                'photo',
                'signature',
            ]);

            $employeeData['employee_id'] = $employeeData['pin'];
            $employeeData['first_name'] = $employeeData['name_en'];
            $employeeData['designation_id'] = $employeeData['last_designation_id'];

            $email = trim((string) ($employeeData['email'] ?? ''));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $employeeData['email'] = strtolower((string) $employeeData['pin']).'@'.$this->getAutoEmailDomain();
            }

            DB::transaction(function () use ($request, $employee, $employeeData, $validated) {
                if ($request->hasFile('photo')) {
                    if ($employee->photo) {
                        $old = public_path('storage/'.$employee->photo);
                        if (file_exists($old)) {
                            @unlink($old);
                        }
                    }
                    $photo = $request->file('photo');
                    $ext = strtolower((string) $photo->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_photos');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $photo->move($targetDir, $filename);
                    $employeeData['photo'] = 'employee_photos/'.$filename;
                }

                if ($request->hasFile('signature')) {
                    if ($employee->signature) {
                        $old = public_path('storage/'.$employee->signature);
                        if (file_exists($old)) {
                            @unlink($old);
                        }
                    }
                    $sig = $request->file('signature');
                    $ext = strtolower((string) $sig->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_signatures');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $sig->move($targetDir, $filename);
                    $employeeData['signature'] = 'employee_signatures/'.$filename;
                }

                $employee->update($employeeData);
                $employee->load('designation');
                $this->syncZoneRegionalManagerAssignment($employee);
                $this->syncUserAccountForEmployee($employee->fresh());

                $eid = $employee->id;

                DB::table('employee_addresses')->where('employee_id', $eid)->delete();
                DB::table('employee_educations')->where('employee_id', $eid)->delete();
                DB::table('employee_bank_accounts')->where('employee_id', $eid)->delete();
                DB::table('employee_nominees')->where('employee_id', $eid)->delete();
                DB::table('employee_guarantors')->where('employee_id', $eid)->delete();
                DB::table('employee_guarantor_cheques')->where('employee_id', $eid)->delete();
                DB::table('employee_collaterals')->where('employee_id', $eid)->delete();
                DB::table('employee_collateral_receive_cheques')->where('employee_id', $eid)->delete();
                DB::table('employee_assets')->where('employee_id', $eid)->delete();
                DB::table('employee_experiences')->where('employee_id', $eid)->delete();
                DB::table('employee_trainings')->where('employee_id', $eid)->delete();

                $addresses = is_array($validated['addresses'] ?? null) ? $validated['addresses'] : [];
                foreach ($addresses as $a) {
                    DB::table('employee_addresses')->insert([
                        'employee_id' => $eid,
                        'type' => $a['type'],
                        'division' => $a['division'] ?? null,
                        'district' => $a['district'] ?? null,
                        'upazila' => $a['upazila'] ?? null,
                        'union' => $a['union'] ?? null,
                        'village' => $a['village'] ?? null,
                        'address_details' => $a['address_details'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $educations = is_array($validated['educations'] ?? null) ? $validated['educations'] : [];
                foreach ($educations as $e) {
                    DB::table('employee_educations')->insert([
                        'employee_id' => $eid,
                        'degree' => (string) ($e['degree'] ?? ''),
                        'institute' => $e['institute'] ?? null,
                        'group_name' => $e['group_name'] ?? null,
                        'board' => $e['board'] ?? null,
                        'subject' => $e['subject'] ?? null,
                        'result_type' => $e['result_type'] ?? null,
                        'result_value' => $e['result_value'] ?? null,
                        'passing_year' => $e['passing_year'] ?? null,
                        'remarks' => $e['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $bank = is_array($validated['bank'] ?? null) ? $validated['bank'] : null;
                if ($bank) {
                    DB::table('employee_bank_accounts')->insert([
                        'employee_id' => $eid,
                        'bank_name' => (string) ($bank['bank_name'] ?? ''),
                        'branch_name' => $bank['branch_name'] ?? null,
                        'account_no' => $bank['account_no'] ?? null,
                        'account_type' => $bank['account_type'] ?? null,
                        'bank_address' => $bank['bank_address'] ?? null,
                        'remark' => $bank['remark'] ?? null,
                        'is_primary' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $nominees = is_array($validated['nominees'] ?? null) ? $validated['nominees'] : [];
                foreach ($nominees as $n) {
                    DB::table('employee_nominees')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($n['name'] ?? ''),
                        'relation' => $n['relation'] ?? null,
                        'date_of_birth' => $n['date_of_birth'] ?? null,
                        'share' => $n['share'] ?? null,
                        'contact' => $n['contact'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantors = is_array($validated['guarantors'] ?? null) ? $validated['guarantors'] : [];
                foreach ($guarantors as $g) {
                    DB::table('employee_guarantors')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($g['name'] ?? ''),
                        'age' => $g['age'] ?? null,
                        'occupation' => $g['occupation'] ?? null,
                        'relation' => $g['relation'] ?? null,
                        'phone' => $g['phone'] ?? null,
                        'email' => $g['email'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantorCheques = is_array($validated['guarantor_cheques'] ?? null) ? $validated['guarantor_cheques'] : [];
                foreach ($guarantorCheques as $c) {
                    DB::table('employee_guarantor_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_guarantor_id' => null,
                        'bank_name' => $c['bank_name'] ?? null,
                        'branch_name' => $c['branch_name'] ?? null,
                        'cheque_no' => $c['cheque_no'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $collateral = is_array($validated['collateral'] ?? null) ? $validated['collateral'] : null;
                $collateralId = null;
                if ($collateral) {
                    $collateralId = DB::table('employee_collaterals')->insertGetId([
                        'employee_id' => $eid,
                        'has_certificate' => (bool) ($collateral['has_certificate'] ?? false),
                        'certificate_levels' => isset($collateral['certificate_levels']) ? json_encode($collateral['certificate_levels']) : null,
                        'security_amount' => $collateral['security_amount'] ?? null,
                        'collateral_interest' => $collateral['collateral_interest'] ?? null,
                        'collateral_date' => $collateral['collateral_date'] ?? null,
                        'notes' => $collateral['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $receiveCheques = is_array($validated['collateral_receive_cheques'] ?? null) ? $validated['collateral_receive_cheques'] : [];
                foreach ($receiveCheques as $rc) {
                    DB::table('employee_collateral_receive_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_collateral_id' => $collateralId,
                        'bank_name' => $rc['bank_name'] ?? null,
                        'branch_name' => $rc['branch_name'] ?? null,
                        'cheque_no' => $rc['cheque_no'] ?? null,
                        'notes' => $rc['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $assets = is_array($validated['assets'] ?? null) ? $validated['assets'] : [];
                foreach ($assets as $as) {
                    DB::table('employee_assets')->insert([
                        'employee_id' => $eid,
                        'serial' => $as['serial'] ?? null,
                        'asset_no' => $as['asset_no'] ?? null,
                        'name' => (string) ($as['name'] ?? ''),
                        'details' => $as['details'] ?? null,
                        'provided_quality' => $as['provided_quality'] ?? null,
                        'asset_price' => $as['asset_price'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $experiences = is_array($validated['experiences'] ?? null) ? $validated['experiences'] : [];
                foreach ($experiences as $ex) {
                    DB::table('employee_experiences')->insert([
                        'employee_id' => $eid,
                        'organization' => (string) ($ex['organization'] ?? ''),
                        'from_date' => $ex['from_date'] ?? null,
                        'to_date' => $ex['to_date'] ?? null,
                        'designation' => $ex['designation'] ?? null,
                        'department' => $ex['department'] ?? null,
                        'address' => $ex['address'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $trainings = is_array($validated['trainings'] ?? null) ? $validated['trainings'] : [];
                foreach ($trainings as $tr) {
                    DB::table('employee_trainings')->insert([
                        'employee_id' => $eid,
                        'training_title' => (string) ($tr['training_title'] ?? ''),
                        'institute' => $tr['institute'] ?? null,
                        'address' => $tr['address'] ?? null,
                        'duration' => $tr['duration'] ?? null,
                        'remarks' => $tr['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $this->syncEmployeeDocumentsFromTabbedForm($request, $employee, false);
            });

            return redirect()->route('employees.index')
                ->with('success', 'Employee updated successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            $this->logEmployeeSaveFailure('update', $request, $employee, $e);
            $message = $this->buildEmployeeSaveErrorMessage($e);

            return back()
                ->withInput()
                ->withErrors(['submit' => $message])
                ->with('error', $message);
        }
    }

    public function show(Employee $employee)
    {
        $employee->load([
            'department',
            'designation',
            'branch',
            'manager',
            'joiningDesignation',
            'lastDesignation',
            'lastBranch',
            'leaveApplications.leaveType',
            'leaveBalances.leaveType',
            'movements',
        ]);

        // Get current year leave balances
        $currentYearLeaveBalances = $employee->leaveBalances()
            ->where('year', date('Y'))
            ->with('leaveType')
            ->get();

        // Get recent leave applications (last 5)
        $recentLeaveApplications = $employee->leaveApplications()
            ->with('leaveType')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Get recent movements (last 5)
        $recentMovements = $employee->movements()
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return Inertia::render('employee/show', [
            'employee' => $employee,
            'currentYearLeaveBalances' => $currentYearLeaveBalances,
            'recentLeaveApplications' => $recentLeaveApplications,
            'recentMovements' => $recentMovements,
        ]);
    }

    /**
     * Delete the specified employee.
     */
    public function destroy(Employee $employee)
    {
        try {
            // Check if employee has a user account
            $user = User::where('employee_id', $employee->id)->first();
            if ($user) {
                return redirect()->route('employees.index')
                    ->with('error', 'Cannot delete employee that has a user account.');
            }

            // Delete photo if exists
            if ($employee->photo) {
                $photoPath = public_path('storage/'.$employee->photo);
                if (file_exists($photoPath)) {
                    unlink($photoPath);
                }
            }

            // Delete employee
            $deleted = $employee->delete();

            if (! $deleted) {
                return redirect()->route('employees.index')
                    ->with('error', 'Failed to delete employee. Please try again.');
            }

            return redirect()->route('employees.index')
                ->with('success', 'Employee deleted successfully.');
        } catch (\Exception $e) {
            // Log the error
            Log::error('Employee deletion error: '.$e->getMessage());

            return redirect()->route('employees.index')
                ->with('error', 'An error occurred while deleting the employee: '.$e->getMessage());
        }
    }

    /**
     * Display organization chart.
     */
    public function organizationChart()
    {
        $headOffice = Branch::query()
            ->with([
                'headEmployee' => fn ($q) => $q->where('status', 'active')->with('designation'),
                'employees' => fn ($q) => $q->where('status', 'active')->with('designation'),
            ])
            ->withCount([
                'employees' => fn ($q) => $q->where('status', 'active'),
            ])
            ->where('is_head_office', true)
            ->first();

        $zones = Zone::with([
            'zoneManager' => fn ($q) => $q->where('status', 'active')->with('designation'),
            'regionalOffices' => function ($q) {
                $q->orderBy('name');
            },
            'regionalOffices.regionalManager' => fn ($q) => $q->where('status', 'active')->with('designation'),
            'regionalOffices.branches' => function ($q) {
                $q->where('is_head_office', false)
                    ->orderBy('name')
                    ->withCount([
                        'employees' => fn ($employeeQuery) => $employeeQuery->where('status', 'active'),
                    ]);
            },
            'regionalOffices.branches.headEmployee' => fn ($q) => $q->where('status', 'active')->with('designation'),
            'regionalOffices.branches.employees' => fn ($q) => $q->where('status', 'active')->with('designation'),
        ])->orderBy('name')->get();

        $zones->each(function (Zone $zone): void {
            $zoneTotal = 0;
            foreach ($zone->regionalOffices as $ro) {
                /** @var RegionalOffice $ro */
                $roTotal = (int) $ro->branches->reduce(
                    fn (int $total, Branch $branch): int => $total + (int) $branch->employees_count,
                    0
                );
                $ro->setAttribute('employee_count', $roTotal);
                $zoneTotal += $roTotal;
            }
            $zone->setAttribute('employee_count', $zoneTotal);
        });

        return Inertia::render('employee/organization-chart', [
            'headOffice' => $headOffice,
            'zones' => $zones,
        ]);
    }

    /**
     * Display blank employee form for printing.
     */
    public function blankForm()
    {
        $departments = Department::orderBy('name')->get();
        $designations = Designation::orderBy('name')->get();
        $branches = Branch::orderBy('name')->get();

        return view('pdf.employee-blank-form', [
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
        ]);
    }

    public function importPreview(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240|mimes:csv,txt,xlsx',
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

        if ($ext === 'xlsx') {
            Log::warning('Employee import preview blocked: xlsx requires ext-zip', $debug);

            return back()->withErrors([
                'file' => 'XLSX import requires PHP zip extension (ext-zip). Please upload CSV for now, or enable ext-zip to support XLSX.',
            ]);
        }

        $path = $file->store('imports/employees', 'local');
        $absPath = storage_path('app/'.$path);

        try {
            $rows = $this->readCsvRows($absPath, $path);
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

            [$header, $dataRows] = $this->splitHeaderRows($rows);
            $headerMap = $this->normalizeHeaderMap($header);

            $previewRows = [];
            foreach ($dataRows as $i => $row) {
                $rowNumber = $i + 2;
                $rowAssoc = $this->rowToAssoc($row, $headerMap);

                unset($rowAssoc['sl'], $rowAssoc['serial'], $rowAssoc['ক্রমিক'], $rowAssoc['ক্রমিক_no'], $rowAssoc['ক্রমিকনং']);

                $previewRows[] = [
                    'source_row' => $rowNumber,
                    'pin' => $this->firstNonEmpty($rowAssoc, ['pin', 'employee_id', 'id', 'emp_id']) ?? '',
                    'name_en' => $this->firstNonEmpty($rowAssoc, ['name_en', 'name', 'full_name', 'employee_name', 'first_name']) ?? '',
                    'last_name' => $this->valueOrNull($rowAssoc, ['last_name']) ?? '',
                    'email' => $this->firstNonEmpty($rowAssoc, ['email', 'mail']) ?? '',
                    'joining_date' => $this->firstNonEmpty($rowAssoc, ['joining_date', 'join_date', 'date_of_joining', 'doj']) ?? '',
                    'department' => $this->firstNonEmpty($rowAssoc, ['department_id', 'dept_id', 'department']) ?? '',
                    'joining_designation' => $this->firstNonEmpty($rowAssoc, ['joining_designation_id', 'joining_designation', 'designation_id', 'desig_id', 'designation']) ?? '',
                    'last_designation' => $this->firstNonEmpty($rowAssoc, ['last_designation_id', 'last_designation']) ?? '',
                    'current_branch' => $this->firstNonEmpty($rowAssoc, ['current_branch_id', 'branch_id', 'branch', 'current_branch']) ?? '',
                    'last_branch' => $this->firstNonEmpty($rowAssoc, ['last_branch_id', 'last_branch', 'previous_branch']) ?? '',
                    'status' => $this->firstNonEmpty($rowAssoc, ['status']) ?? '',
                ];
            }

            $importId = (string) Str::uuid();
            $debug['step'] = 'importPreview:cached';
            $debug['importId'] = $importId;
            $debug['row_count'] = count($previewRows);

            Cache::put(
                "employee_import_preview:{$importId}",
                [
                    'header' => $headerMap,
                    'rows' => $previewRows,
                    'debug' => $debug,
                ],
                self::EMPLOYEE_IMPORT_CACHE_TTL_SECONDS
            );

            Log::info('Employee import preview cached; redirecting to review', $debug);

            // Force navigation to the review page (works reliably even for file uploads)
            return Inertia::location(route('employees.import.review', ['importId' => $importId]));
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
        $cached = Cache::get("employee_import_preview:{$importId}");
        if (! is_array($cached) || ! isset($cached['rows'])) {
            return redirect()->route('employees.index')
                ->with('error', 'Import preview expired. Please upload the file again.');
        }

        $rows = is_array($cached['rows']) ? $cached['rows'] : [];
        $debug = is_array($cached['debug'] ?? null) ? $cached['debug'] : null;

        $pins = [];
        $emails = [];
        foreach ($rows as $r) {
            $pin = trim((string) ($r['pin'] ?? ''));
            $email = trim((string) ($r['email'] ?? ''));
            if ($pin !== '') {
                $pins[] = $pin;
            }
            if ($email !== '') {
                $emails[] = $email;
            }
        }

        $pins = array_values(array_unique($pins));
        $emails = array_values(array_unique($emails));

        $existingPins = [];
        if (count($pins) > 0) {
            $existingPins = Employee::query()
                ->whereIn('pin', $pins)
                ->orWhereIn('employee_id', $pins)
                ->pluck('pin')
                ->merge(Employee::query()->whereIn('employee_id', $pins)->pluck('employee_id'))
                ->filter()
                ->map(fn ($v) => (string) $v)
                ->unique()
                ->values()
                ->all();
        }
        $existingPinSet = array_fill_keys($existingPins, true);

        $existingEmailSet = [];
        if (count($emails) > 0) {
            $existingEmails = Employee::query()->whereIn('email', $emails)->pluck('email')->all();
            $existingEmailSet = array_fill_keys(array_map('strtolower', $existingEmails), true);
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

        $issuesByRow = [];
        foreach ($rows as $idx => $r) {
            $sourceRow = (int) ($r['source_row'] ?? ($idx + 2));
            $issues = [];

            $pin = trim((string) ($r['pin'] ?? ''));
            $nameEn = trim((string) ($r['name_en'] ?? ''));
            $email = trim((string) ($r['email'] ?? ''));
            $joiningDate = trim((string) ($r['joining_date'] ?? ''));

            if ($pin === '') {
                $issues[] = 'Missing PIN';
            }
            if ($nameEn === '') {
                $issues[] = 'Missing name';
            }
            if ($email === '') {
                $issues[] = 'Missing email';
            }
            if ($joiningDate === '') {
                $issues[] = 'Missing joining_date';
            }

            if ($pin !== '' && isset($existingPinSet[$pin])) {
                $issues[] = 'Duplicate PIN exists in system';
            }
            if ($email !== '' && isset($existingEmailSet[strtolower($email)])) {
                $issues[] = 'Duplicate email exists in system';
            }
            if ($pin !== '' && isset($dupInFilePins[strtolower($pin)])) {
                $issues[] = 'Duplicate PIN inside file';
            }
            if ($email !== '' && isset($dupInFileEmails[strtolower($email)])) {
                $issues[] = 'Duplicate email inside file';
            }

            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                $issues[] = 'Invalid email format';
            }

            if ($joiningDate !== '') {
                try {
                    Carbon::parse($joiningDate);
                } catch (\Throwable $e) {
                    $issues[] = 'Invalid joining_date';
                }
            }

            $issuesByRow[$sourceRow] = $issues;
        }

        $departments = Department::orderBy('name')->get(['id', 'name']);
        $designations = Designation::orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);

        return Inertia::render('employee/import-review', [
            'importId' => $importId,
            'rows' => $rows,
            'issuesByRow' => $issuesByRow,
            'debug' => $debug,
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
        ]);
    }

    public function importCommit(Request $request)
    {
        $validated = $request->validate([
            'importId' => 'required|string',
            'rows' => 'required|array|max:'.self::EMPLOYEE_IMPORT_MAX_ROWS,
            'rows.*.pin' => 'required|string|max:20',
            'rows.*.name_en' => 'required|string|max:255',
            'rows.*.email' => 'required|email',
            'rows.*.joining_date' => 'required|date',
            'rows.*.department_id' => 'required|integer|exists:departments,id',
            'rows.*.joining_designation_id' => 'required|integer|exists:designations,id',
            'rows.*.last_designation_id' => 'required|integer|exists:designations,id',
            'rows.*.current_branch_id' => 'required|integer|exists:branches,id',
            'rows.*.last_branch_id' => 'nullable|integer|exists:branches,id',
            'rows.*.status' => 'required|in:active,inactive,on_leave,terminated',
            'rows.*.source_row' => 'nullable|integer',
        ]);

        $importId = (string) $validated['importId'];
        $cached = Cache::get("employee_import_preview:{$importId}");
        if (! is_array($cached)) {
            return back()->withErrors([
                'importId' => 'Import preview expired. Please upload the file again.',
            ]);
        }

        $created = 0;
        $skipped = 0;
        $rowErrors = [];
        $createdByBranchId = [];

        DB::beginTransaction();
        try {
            foreach ($validated['rows'] as $idx => $row) {
                $rowNumber = (int) ($row['source_row'] ?? ($idx + 2));
                $pin = trim((string) $row['pin']);
                $email = trim((string) $row['email']);

                $errors = [];
                if (Employee::where('pin', $pin)->orWhere('employee_id', $pin)->exists()) {
                    $errors[] = 'Duplicate PIN/Employee ID';
                }
                if (Employee::where('email', $email)->exists()) {
                    $errors[] = 'Duplicate email';
                }
                if (User::where('email', $email)->exists()) {
                    $errors[] = 'Email already used by a user account';
                }

                if (count($errors) > 0) {
                    $skipped++;
                    $rowErrors[] = ['row' => $rowNumber, 'errors' => $errors];

                    continue;
                }

                $employeeData = [
                    'employee_id' => $pin,
                    'first_name' => (string) $row['name_en'],
                    'last_name' => (string) ($row['last_name'] ?? ''),

                    'pin' => $pin,
                    'name_en' => (string) $row['name_en'],
                    'email' => $email,
                    'joining_date' => Carbon::parse($row['joining_date'])->toDateString(),
                    'department_id' => (int) $row['department_id'],
                    'designation_id' => (int) $row['last_designation_id'],
                    'joining_designation_id' => (int) $row['joining_designation_id'],
                    'last_designation_id' => (int) $row['last_designation_id'],
                    'current_branch_id' => (int) $row['current_branch_id'],
                    'last_branch_id' => $row['last_branch_id'] ? (int) $row['last_branch_id'] : null,
                    'status' => (string) $row['status'],
                ];

                $employee = Employee::create($employeeData);
                $employee->load('designation');
                $this->syncZoneRegionalManagerAssignment($employee);
                $this->syncUserAccountForEmployee($employee);

                $created++;
                $bid = (int) $row['current_branch_id'];
                $createdByBranchId[$bid] = ($createdByBranchId[$bid] ?? 0) + 1;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        Cache::forget("employee_import_preview:{$importId}");

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
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="employee-import-example.csv"',
        ];

        $csvHeader = [
            'sl',
            // Identity
            'pin',
            'name_en',
            'name_bn',
            'email',
            'email_id',
            'phone',
            // Personal
            'gender', // male|female|other
            'blood_group',
            'date_of_birth', // yyyy-mm-dd
            // Employment / Org
            'joining_date', // yyyy-mm-dd
            'confirmation_date', // yyyy-mm-dd (optional)
            'department', // id OR exact name
            'joining_designation', // id OR exact name
            'last_designation', // id OR exact name
            'branch', // id OR exact name (current branch)
            'last_branch', // id OR exact name (optional)
            'reporting_to', // manager employee pin OR employee_id OR numeric employee table id (optional)
            'status', // active|inactive|on_leave|terminated
            // Address
            'address',
            'village',
            'post_office',
            'union_pouroshova',
            'ward_no',
            'upazila',
            'district',
            // Education
            'educational_qualification',
            // IDs
            'nid',
            'nid_number',
            'smart_card_number',
            'birth_registration_number',
            // Emergency / Family
            'emergency_contact',
            'fathers_name',
            'fathers_mobile',
            'mothers_name',
            'mothers_mobile',
            'marital_status',
            'spouse_name',
            'spouse_mobile',
            // Service lifecycle
            'resignation_date', // yyyy-mm-dd (optional)
            'dropout_date', // yyyy-mm-dd (optional)
            'dropout_reason',
            'final_payment_date', // yyyy-mm-dd (optional)
            'last_promotion_date', // yyyy-mm-dd (optional)
        ];

        $rows = [
            [
                '1',
                '1001',
                'Demo Employee',
                '',
                'demo.employee@example.com',
                '2026-01-01',
                'active',
            ],
            [
                '2',
                '1002',
                'Second Employee',
                '',
                'second.employee@example.com',
                '2026-02-15',
                'active',
            ],
        ];

        // Expand sample rows to match header length (keep most optional fields blank).
        $rows = array_map(function (array $r) use ($csvHeader) {
            $targetCount = count($csvHeader);
            if (count($r) < $targetCount) {
                $r = array_pad($r, $targetCount, '');
            } elseif (count($r) > $targetCount) {
                $r = array_slice($r, 0, $targetCount);
            }

            return $r;
        }, $rows);

        // Fill a few meaningful defaults into the sample rows (by column name).
        $headerIndex = array_flip($csvHeader);
        $set = function (&$row, string $col, string $val) use ($headerIndex) {
            if (isset($headerIndex[$col])) {
                $row[$headerIndex[$col]] = $val;
            }
        };

        if (isset($rows[0])) {
            $set($rows[0], 'joining_date', '2026-01-01');
            $set($rows[0], 'department', 'Accounts');
            $set($rows[0], 'joining_designation', 'Officer');
            $set($rows[0], 'last_designation', 'Officer');
            $set($rows[0], 'branch', 'Head Office');
            $set($rows[0], 'status', 'active');
        }
        if (isset($rows[1])) {
            $set($rows[1], 'joining_date', '2026-02-15');
            $set($rows[1], 'department', '5');
            $set($rows[1], 'joining_designation', '9');
            $set($rows[1], 'last_designation', '9');
            $set($rows[1], 'branch', '2');
            $set($rows[1], 'last_branch', '1');
            $set($rows[1], 'status', 'active');
        }

        return response()->stream(function () use ($csvHeader, $rows) {
            $out = fopen('php://output', 'wb');
            // UTF-8 BOM for Excel
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $csvHeader);
            foreach ($rows as $r) {
                fputcsv($out, $r);
            }
            fclose($out);
        }, 200, $headers);
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

    private function splitHeaderRows(array $rows): array
    {
        $header = $rows[0] ?? [];
        $data = array_slice($rows, 1);

        return [$header, $data];
    }

    private function normalizeHeaderMap(array $header): array
    {
        $map = [];
        foreach ($header as $idx => $name) {
            $key = strtolower(trim((string) $name));
            $key = preg_replace('/\s+/', '_', $key);
            $key = preg_replace('/[^a-z0-9_\x{0980}-\x{09FF}]/u', '', $key);
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

        if (ctype_digit($raw)) {
            return (int) $raw;
        }

        // Try match by name (case-insensitive)
        $name = trim($raw);
        $model = $modelClass::query()
            ->whereRaw('LOWER('.$nameField.') = ?', [strtolower($name)])
            ->first(['id']);

        return $model?->id ?? $defaultId;
    }
}
