<?php

namespace App\Http\Controllers\Employee;

use App\Http\Concerns\EmployedEmployeeUniqueIdentifiers;
use App\Http\Concerns\ResolvesEmployeeNidSmartCard;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\DemotionHistory;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\EmployeeType;
use App\Models\LocationUnion;
use App\Models\LocationVillage;
use App\Models\Payscale;
use App\Models\Payslip;
use App\Models\Program;
use App\Models\Project;
use App\Models\PromotionHistory;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use App\Models\TransferHistory;
use App\Models\User;
use App\Models\Zone;
use App\Services\EmployeeSalaryAssignmentService;
use App\Services\MisLoanFieldOfficerSyncService;
use App\Services\OrganogramAccessService;
use App\Services\PayrollCalculationService;
use App\Support\BranchOrganogram;
use App\Support\EmployeeExport;
use App\Support\EmployeeImportCsv;
use App\Support\EmployeeImportTemplateExporter;
use App\Support\HeadOfficeOrganogram;
use App\Support\ImportDateParser;
use App\Support\SimpleXlsxReader;
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
    use EmployedEmployeeUniqueIdentifiers;
    use ResolvesEmployeeNidSmartCard;

    public function __construct(
        protected EmployeeSalaryAssignmentService $employeeSalaryAssignmentService,
        protected PayrollCalculationService $payrollCalculationService,
    ) {}

    private const EMPLOYEE_IMPORT_MAX_ROWS = 5000;

    private const EMPLOYEE_IMPORT_CACHE_TTL_SECONDS = 3600;

    private const AUTO_USER_EMPLOYEE_ROLE_NAME = 'Employee';

    private const AUTO_EMAIL_DOMAIN_ENV = 'HRM_AUTO_EMAIL_DOMAIN';

    private const DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE = 'savings';

    private const DEFAULT_EMPLOYEE_BANK_BRANCH_NAME = 'Naogaon Sadar';

    private function getAutoEmailDomain(): string
    {
        $d = (string) env(self::AUTO_EMAIL_DOMAIN_ENV, 'auto.local');
        $d = trim($d);

        return $d !== '' ? $d : 'auto.local';
    }

    /**
     * FormData often sends empty photo/signature fields as "" which breaks nullable|file validation.
     */
    private function scrubEmptyMediaUploads(Request $request): void
    {
        foreach (['photo', 'signature'] as $field) {
            if ($request->hasFile($field)) {
                $file = $request->file($field);
                if ($file && $file->isValid()) {
                    continue;
                }
            }

            $request->files->remove($field);
            $request->request->remove($field);
        }
    }

    /**
     * Store employee photo/signature on the public disk (storage/app/public/...).
     * Also mirrors into public/storage when the symlink is missing (common on Hostinger).
     */
    private function storeEmployeeMediaFile(
        \Illuminate\Http\UploadedFile $file,
        string $directory,
        string $pinHint = 'emp',
        ?string $oldRelativePath = null
    ): string {
        if ($oldRelativePath) {
            $this->deleteEmployeeMediaFile($oldRelativePath);
        }

        $ext = strtolower((string) $file->getClientOriginalExtension());
        if ($ext === '' || ! preg_match('/^[a-z0-9]{1,8}$/', $ext)) {
            $guessed = $file->guessExtension();
            $ext = strtolower(is_string($guessed) && $guessed !== '' ? $guessed : 'jpg');
        }

        $safePin = preg_replace('/[^a-zA-Z0-9_\-]/', '', $pinHint) ?: 'emp';
        $filename = $safePin.'_'.time().'_'.Str::lower((string) Str::random(6)).'.'.$ext;
        $relative = trim($directory, '/').'/'.$filename;

        try {
            $stored = Storage::disk('public')->putFileAs($directory, $file, $filename);
            if (! is_string($stored) || $stored === '') {
                throw new \RuntimeException('putFileAs returned empty path.');
            }
        } catch (\Throwable $e) {
            // Fallback: write directly under public/storage (Hostinger copy-mode setups)
            Log::warning('Employee media public-disk store failed; using public/storage fallback', [
                'error' => $e->getMessage(),
                'directory' => $directory,
            ]);

            $targetDir = public_path('storage/'.$directory);
            if (! is_dir($targetDir) && ! @mkdir($targetDir, 0775, true) && ! is_dir($targetDir)) {
                throw new \RuntimeException('Unable to create media directory: '.$targetDir);
            }

            if (! $file->move($targetDir, $filename)) {
                throw new \RuntimeException('Unable to move uploaded media file.');
            }

            // Best-effort also keep a copy on the public disk root for consistency
            try {
                $fallbackSource = $targetDir.DIRECTORY_SEPARATOR.$filename;
                if (is_file($fallbackSource)) {
                    Storage::disk('public')->put($relative, file_get_contents($fallbackSource) ?: '');
                }
            } catch (\Throwable $ignored) {
                // ignore
            }

            return $relative;
        }

        $this->mirrorPublicDiskFileToPublicStorage($relative);

        Log::info('Employee media stored', [
            'relative' => $relative,
            'disk_exists' => Storage::disk('public')->exists($relative),
            'public_path_exists' => is_file(public_path('storage/'.$relative)),
        ]);

        return $relative;
    }

    private function deleteEmployeeMediaFile(?string $relativePath): void
    {
        $relativePath = ltrim((string) $relativePath, '/');
        if ($relativePath === '') {
            return;
        }

        try {
            if (Storage::disk('public')->exists($relativePath)) {
                Storage::disk('public')->delete($relativePath);
            }
        } catch (\Throwable $e) {
            Log::warning('Employee media disk delete failed', [
                'path' => $relativePath,
                'error' => $e->getMessage(),
            ]);
        }

        $publicCopy = public_path('storage/'.$relativePath);
        if (is_file($publicCopy)) {
            @unlink($publicCopy);
        }
    }

    private function mirrorPublicDiskFileToPublicStorage(string $relativePath): void
    {
        $relativePath = ltrim($relativePath, '/');
        try {
            $source = Storage::disk('public')->path($relativePath);
            $dest = public_path('storage/'.$relativePath);
            if (! is_file($source)) {
                return;
            }

            // If public/storage is already a working symlink into the same file, skip copy.
            if (is_link(public_path('storage'))) {
                return;
            }

            $destDir = dirname($dest);
            if (! is_dir($destDir)) {
                @mkdir($destDir, 0775, true);
            }

            if (! @copy($source, $dest)) {
                Log::warning('Employee media mirror to public/storage failed', [
                    'relative' => $relativePath,
                    'source' => $source,
                    'dest' => $dest,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Employee media mirror exception', [
                'relative' => $relativePath,
                'error' => $e->getMessage(),
            ]);
        }
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

        $customUnionRows = $this->readJsonArrayFile($folder.'/unions_custom.json');
        if (is_array($customUnionRows)) {
            foreach ($customUnionRows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $upazilaName = trim((string) ($row['upazila'] ?? ''));
                $unionName = trim((string) ($row['name'] ?? ''));
                if ($upazilaName === '' || $unionName === '') {
                    continue;
                }
                $alreadyListed = false;
                foreach ($unionsByUpazila[$upazilaName] ?? [] as $existing) {
                    if (trim((string) ($existing['name'] ?? '')) === $unionName) {
                        $alreadyListed = true;
                        break;
                    }
                }
                if ($alreadyListed) {
                    continue;
                }
                $unionsByUpazila[$upazilaName] = $unionsByUpazila[$upazilaName] ?? [];
                $unionsByUpazila[$upazilaName][] = [
                    'name' => $unionName,
                    'type' => 'union',
                    'villages' => [],
                ];
            }
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
     * @return array{divisions: list<string>, districts: array<string, list<string>>}
     */
    private function buildLocationsBasePayload(): array
    {
        $payload = $this->cachedLocationsPayload();

        return [
            'divisions' => $payload['divisions'],
            'districts' => $payload['districts'],
        ];
    }

    /**
     * @return array{divisions: list<string>, districts: array<string, list<string>>, upazilas: array<string, list<string>>, unions: array<string, list<array<string, mixed>>>}
     */
    private function cachedLocationsPayload(): array
    {
        return Cache::remember('locations.payload.v1', now()->addDay(), fn () => $this->buildLocationsPayload());
    }

    private function forgetLocationsPayloadCache(): void
    {
        Cache::forget('locations.payload.v1');
    }

    private function authorizeEmployeeDirectoryAccess(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(403);
        }

        $permissions = [
            'employees.view',
            'employees.create',
            'employees.edit',
            'payroll.view',
            'reports.view',
            'loan-applications.view',
            'loan-committees.view',
        ];

        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return;
            }
        }

        abort(403);
    }

    public function locationsUpazilas(Request $request)
    {
        $this->authorizeEmployeeDirectoryAccess($request);

        $district = trim((string) $request->query('district', ''));
        if ($district === '') {
            return response()->json([]);
        }

        $payload = $this->cachedLocationsPayload();

        return response()->json($payload['upazilas'][$district] ?? []);
    }

    public function locationsUnions(Request $request)
    {
        $this->authorizeEmployeeDirectoryAccess($request);

        $upazila = trim((string) $request->query('upazila', ''));
        if ($upazila === '') {
            return response()->json([]);
        }

        $payload = $this->cachedLocationsPayload();

        return response()->json($payload['unions'][$upazila] ?? []);
    }

    /**
     * Lightweight employee search for dropdowns (payroll, reports, forms).
     */
    public function lookup(Request $request)
    {
        $this->authorizeEmployeeDirectoryAccess($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'payroll_ready' => ['nullable', 'boolean'],
            'for_gratuity' => ['nullable', 'boolean'],
            'for_pf' => ['nullable', 'boolean'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 25);
        $selectedEmployeeId = isset($validated['employee_id']) ? (int) $validated['employee_id'] : null;
        $forPf = $request->boolean('for_pf');

        $query = Employee::query()
            ->select(['id', 'pin', 'name_en', 'name_bn', 'employee_id', 'pf_balance'])
            ->when(! $forPf, fn ($q) => $q->where('status', 'active'))
            ->when($forPf, fn ($q) => $q->forPf())
            ->when($validated['branch_id'] ?? null, fn ($q, $branchId) => $q->where('current_branch_id', $branchId))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->orderBy('pin')
            ->limit($limit);

        if ($request->boolean('payroll_ready')) {
            $query->payrollReady();
        }

        if ($request->boolean('for_gratuity')) {
            $query->forGratuity();
        }

        OrganogramAccessService::constrainVisibleEmployees($query, $request->user());

        $results = $query->get();

        if ($selectedEmployeeId && ! $results->contains('id', $selectedEmployeeId)) {
            $selected = Employee::query()
                ->select(['id', 'pin', 'name_en', 'name_bn', 'employee_id', 'pf_balance'])
                ->where('id', $selectedEmployeeId)
                ->when(! $forPf, fn ($q) => $q->where('status', 'active'))
                ->when($forPf, fn ($q) => $q->forPf())
                ->first();

            if ($selected) {
                $visible = Employee::query()
                    ->select(['id'])
                    ->where('id', $selectedEmployeeId);
                OrganogramAccessService::constrainVisibleEmployees($visible, $request->user());

                if ($visible->exists()) {
                    $results->prepend($selected);
                }
            }
        }

        return response()->json(
            $results->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'name_bn' => $employee->name_bn,
                'employee_id' => $employee->employee_id,
                'pf_balance' => $employee->pf_balance,
            ])->values()
        );
    }

    /**
     * Normalize empty strings to null so nullable unique columns (e.g. nid) and FKs do not break inserts.
     */
    /**
     * @return array{payscales: \Illuminate\Support\Collection, payrollGrades: \Illuminate\Support\Collection, payrollSteps: \Illuminate\Support\Collection}
     */
    private function employeePayrollFormOptions(): array
    {
        $activePayscaleId = Payscale::activeId();

        return [
            'activePayscaleId' => $activePayscaleId,
            'payscales' => Payscale::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'name']),
            'payrollGrades' => SalaryGrade::query()
                ->where('is_active', true)
                ->when($activePayscaleId, fn ($q) => $q->where('payscale_id', $activePayscaleId))
                ->orderBy('sort_order')
                ->orderBy('code')
                ->get(['id', 'payscale_id', 'code', 'name']),
            'payrollSteps' => SalaryStep::query()
                ->where('is_active', true)
                ->orderBy('step_number')
                ->get(['id', 'salary_grade_id', 'step_number', 'basic_salary']),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function assertActiveBranchForEmployedEmployee(array $validated, ?string $statusOverride = null): void
    {
        $status = $statusOverride ?? ($validated['status'] ?? 'active');
        if ($status !== 'active') {
            return;
        }

        $branchId = (int) ($validated['current_branch_id'] ?? 0);
        if ($branchId <= 0) {
            return;
        }

        $branch = Branch::query()->find($branchId);
        if ($branch && ! $branch->is_active) {
            throw ValidationException::withMessages([
                'current_branch_id' => 'Active employees cannot be assigned to an inactive branch.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function assertEmployeePayrollAssignment(array &$validated): void
    {
        $payscaleId = $validated['payscale_id'] ?? null;
        $gradeId = $validated['salary_grade_id'] ?? null;
        $stepId = $validated['salary_step_id'] ?? null;

        $validated['payscale_id'] = $payscaleId ?: null;
        $validated['salary_grade_id'] = $gradeId ?: null;
        $validated['salary_step_id'] = $stepId ?: null;

        $activePayscaleId = Payscale::activeId();

        if ($payscaleId && ! $gradeId && ! $stepId) {
            $validated['payscale_id'] = null;

            return;
        }

        if (! $payscaleId && ! $gradeId && ! $stepId) {
            return;
        }

        if ($activePayscaleId && ! $payscaleId && $gradeId && $stepId) {
            $validated['payscale_id'] = $activePayscaleId;
            $payscaleId = $activePayscaleId;
        }

        if (! $payscaleId || ! $gradeId || ! $stepId) {
            throw ValidationException::withMessages([
                'salary_step_id' => 'Select payscale, grade, and step together, or leave all blank.',
            ]);
        }

        $grade = SalaryGrade::query()->find($gradeId);
        if (! $grade || (int) $grade->payscale_id !== (int) $payscaleId) {
            throw ValidationException::withMessages([
                'salary_grade_id' => 'Grade does not belong to the selected payscale.',
            ]);
        }

        if ($activePayscaleId && (int) $payscaleId !== $activePayscaleId) {
            throw ValidationException::withMessages([
                'payscale_id' => 'Only the currently active payscale can be assigned to employees.',
            ]);
        }

        $step = SalaryStep::query()->find($stepId);
        if (! $step || (int) $step->salary_grade_id !== (int) $gradeId) {
            throw ValidationException::withMessages([
                'salary_step_id' => 'Step does not belong to the selected grade.',
            ]);
        }

    }

    public function salaryAssignmentPreview(Request $request)
    {
        $validated = $request->validate([
            'payscale_id' => 'required|exists:payscales,id',
            'salary_grade_id' => 'required|exists:salary_grades,id',
            'salary_step_id' => 'required|exists:salary_steps,id',
            'employee_id' => 'nullable|exists:employees,id',
            'year' => 'nullable|integer|min:2000|max:2100',
            'month' => 'nullable|integer|min:1|max:12',
        ]);

        $employee = isset($validated['employee_id'])
            ? Employee::query()
                ->with(['employeeType', 'salaryGrade', 'salaryStep', 'payscale'])
                ->find($validated['employee_id'])
            : null;

        $payload = $this->employeeSalaryAssignmentService->resolveRows(
            (int) $validated['payscale_id'],
            (int) $validated['salary_grade_id'],
            (int) $validated['salary_step_id'],
            $employee,
        );

        if ($employee) {
            $assignmentUnchanged =
                (int) $validated['payscale_id'] === (int) $employee->payscale_id
                && (int) $validated['salary_grade_id'] === (int) $employee->salary_grade_id
                && (int) $validated['salary_step_id'] === (int) $employee->salary_step_id;

            $year = isset($validated['year']) ? (int) $validated['year'] : null;
            $month = isset($validated['month']) ? (int) $validated['month'] : null;

            // Prefer the latest processed salary month so Tax/PF/Loan match salary process.
            $existingPayslip = null;
            if ($assignmentUnchanged) {
                $payslipQuery = Payslip::query()
                    ->where('employee_id', $employee->id)
                    ->whereHas('payrollRun', function ($q) use ($year, $month) {
                        $q->where('salary_type', 'salary');
                        if ($year !== null && $month !== null) {
                            $q->where('year', $year)->where('month', $month);
                        }
                    })
                    ->with(['lines', 'payrollRun'])
                    ->latest('id');

                $existingPayslip = $payslipQuery->first();
                if ($existingPayslip?->payrollRun) {
                    $year = (int) $existingPayslip->payrollRun->year;
                    $month = (int) $existingPayslip->payrollRun->month;
                }
            }

            $year ??= (int) now()->year;
            $month ??= (int) now()->month;
            $asOf = Carbon::create($year, $month, 1)->endOfMonth()->startOfDay();

            if ($existingPayslip) {
                $taxLine = $existingPayslip->lines->first(function ($l) {
                    $name = strtolower((string) $l->head_name);

                    return $name === 'tax' || str_contains($name, 'tax') || str_contains($name, 'ait');
                });
                $pfLine = $existingPayslip->lines->first(function ($l) {
                    $name = strtolower((string) $l->head_name);

                    return $name === 'pf'
                        || str_contains($name, 'provident')
                        || (str_starts_with($name, 'pf') && ! str_contains($name, 'loan'));
                });

                $payrollLines = $existingPayslip->lines->map(fn ($line) => [
                    'salary_head_id' => $line->salary_head_id ? (int) $line->salary_head_id : null,
                    'head_name' => $line->head_name,
                    'type' => $line->type,
                    'computed_amount' => (float) $line->computed_amount,
                ])->values()->all();

                $payload['payroll_preview'] = [
                    'year' => $year,
                    'month' => $month,
                    'source' => 'payslip',
                    'basic_salary' => (float) $existingPayslip->basic_salary,
                    'gross_salary' => (float) $existingPayslip->gross_salary,
                    'total_deduction' => (float) $existingPayslip->total_deduction,
                    'net_payable' => (float) $existingPayslip->net_payable,
                    'income_tax' => (float) ($taxLine?->computed_amount ?? 0),
                    'pf_employee_contribution' => (float) ($pfLine?->computed_amount ?? 0),
                    'loan_total' => (float) $existingPayslip->lines
                        ->filter(fn ($l) => $l->type === 'deduction' && str_contains(strtolower((string) $l->head_name), 'loan'))
                        ->sum('computed_amount'),
                    'lines' => $payrollLines,
                ];

                $payload = $this->employeeSalaryAssignmentService->applyPayrollLinesToRows(
                    $payload,
                    $payrollLines,
                    (float) $existingPayslip->basic_salary,
                );
            } else {
                // Preview uses the selected grade/step without forcing custom overrides.
                $previewEmployee = $employee->replicate();
                $previewEmployee->id = $employee->id;
                $previewEmployee->exists = true;
                $previewEmployee->payscale_id = (int) $validated['payscale_id'];
                $previewEmployee->salary_grade_id = (int) $validated['salary_grade_id'];
                $previewEmployee->salary_step_id = (int) $validated['salary_step_id'];
                $previewEmployee->setRelation('salaryGrade', $employee->salaryGrade);
                $previewEmployee->setRelation('salaryStep', $employee->salaryStep);
                $previewEmployee->setRelation('payscale', $employee->payscale);
                $previewEmployee->setRelation('employeeType', $employee->employeeType);

                // Clear incomplete custom flags so estimate matches salary-process grade/step path.
                if (! $employee->hasEffectiveCustomBasic()) {
                    $previewEmployee->basic_salary = null;
                    $previewEmployee->custom_salary_assigned_at = null;
                }

                $calc = $this->payrollCalculationService->calculateForEmployee(
                    $previewEmployee,
                    $asOf,
                    'salary',
                    $year,
                    $month,
                );

                $payrollLines = collect($calc['lines'] ?? [])->map(fn (array $line) => [
                    'salary_head_id' => isset($line['salary_head_id']) ? (int) $line['salary_head_id'] : null,
                    'head_name' => $line['head_name'],
                    'type' => $line['type'],
                    'computed_amount' => $line['computed_amount'],
                ])->values()->all();

                $payload['payroll_preview'] = [
                    'year' => $year,
                    'month' => $month,
                    'source' => 'estimate',
                    'basic_salary' => $calc['basic_salary'],
                    'gross_salary' => $calc['gross_salary'],
                    'total_deduction' => $calc['total_deduction'],
                    'net_payable' => $calc['net_payable'],
                    'income_tax' => $calc['income_tax'] ?? 0,
                    'pf_employee_contribution' => $calc['pf_employee_contribution'] ?? 0,
                    'loan_total' => collect($calc['loan_deductions'] ?? [])->sum('amount'),
                    'lines' => $payrollLines,
                ];

                $payload = $this->employeeSalaryAssignmentService->applyPayrollLinesToRows(
                    $payload,
                    $payrollLines,
                    (float) $calc['basic_salary'],
                );
            }
        }

        return response()->json($payload);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncEmployeeSalaryComponents(Employee $employee, array $validated): void
    {
        if (! $employee->payscale_id || ! $employee->salary_grade_id || ! $employee->salary_step_id) {
            return;
        }

        $basic = array_key_exists('basic_salary', $validated) && $validated['basic_salary'] !== '' && $validated['basic_salary'] !== null
            ? (float) $validated['basic_salary']
            : null;

        $lines = is_array($validated['salary_lines'] ?? null) ? $validated['salary_lines'] : [];

        $effectiveFrom = $employee->joining_date ? Carbon::parse($employee->joining_date) : Carbon::today();

        $this->employeeSalaryAssignmentService->syncEmployeeSalary(
            $employee,
            $basic,
            $lines,
            $effectiveFrom,
        );
    }

    private function mergeSalaryLinesFromRequest(Request $request): void
    {
        $request->merge([
            'salary_lines' => $this->parseSalaryLinesFromRequest($request),
        ]);
    }

    /**
     * @return list<array{salary_head_id: int, amount_type: string, amount: float|int|string}>
     */
    private function parseSalaryLinesFromRequest(Request $request): array
    {
        if ($request->filled('salary_lines_json')) {
            $decoded = json_decode((string) $request->input('salary_lines_json'), true);
            if (is_array($decoded)) {
                return array_values(array_filter($decoded, fn ($row) => is_array($row) && isset($row['salary_head_id'])));
            }
        }

        $lines = $request->input('salary_lines');

        return is_array($lines) ? array_values($lines) : [];
    }

    private function normalizeEmployeeRequestPayload(Request $request): void
    {
        $nullableEmptiesToNull = [
            'nid_number', 'smart_card_number',
            'name_bn', 'gender', 'blood_group', 'date_of_birth',
            'confirmation_date', 'address', 'village', 'post_office', 'union_pouroshova',
            'ward_no', 'upazila', 'district', 'educational_qualification', 'emergency_contact',
            'fathers_name', 'fathers_mobile', 'mothers_name', 'mothers_mobile',
            'marital_status', 'spouse_name', 'spouse_mobile',
            'dropout_date', 'dropout_reason', 'final_payment_date', 'last_promotion_date',
            'reporting_to', 'last_branch_id',
            'payscale_id', 'salary_grade_id', 'salary_step_id', 'basic_salary',
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

        $this->normalizeEmployeeBankPayload($request);
        $this->normalizeEmployeeNomineeGuarantorPayload($request);
        $this->normalizeEmployeeRepeatedTabPayload($request);
    }

    private function normalizeEmployeeRepeatedTabPayload(Request $request): void
    {
        $assets = $request->input('assets');
        if (is_array($assets)) {
            $request->merge([
                'assets' => array_map(static fn ($asset) => is_array($asset) ? [
                    ...$asset,
                    'serial' => $asset['serial'] ?? $asset['serial_no'] ?? null,
                    'name' => $asset['name'] ?? $asset['asset_name'] ?? '',
                    'provided_quality' => $asset['provided_quality'] ?? $asset['provided_qty'] ?? null,
                    'details' => $asset['details'] ?? $asset['asset_details'] ?? null,
                ] : $asset, $assets),
            ]);
        }

        $experiences = $request->input('experiences');
        if (is_array($experiences)) {
            $request->merge([
                'experiences' => array_map(static fn ($experience) => is_array($experience) ? [
                    ...$experience,
                    'address' => $experience['address'] ?? $experience['responsibility'] ?? null,
                ] : $experience, $experiences),
            ]);
        }

        $documents = $request->input('documents');
        if (is_array($documents)) {
            $request->merge([
                'documents' => array_map(static fn ($document) => is_array($document) ? [
                    ...$document,
                    'title' => trim((string) ($document['title'] ?? $document['document_title'] ?? '')),
                ] : $document, $documents),
            ]);
        }

        $collateral = $request->input('collateral');
        if (is_array($collateral) && is_array($collateral['certificate_levels'] ?? null)) {
            $levelMap = [
                'ssc' => 'ssc',
                'SSC' => 'ssc',
                'hsc' => 'hsc',
                'HSC' => 'hsc',
                'honors' => 'honors',
                'Honors' => 'honors',
                'masters' => 'masters',
                'Masters' => 'masters',
            ];
            $normalizedLevels = [];
            foreach ($collateral['certificate_levels'] as $level) {
                $key = trim((string) $level);
                if ($key === '') {
                    continue;
                }
                $normalizedLevels[] = $levelMap[$key] ?? strtolower($key);
            }
            $collateral['certificate_levels'] = array_values(array_unique($normalizedLevels));
            $request->merge(['collateral' => $collateral]);
        }
    }

    private function normalizeEmployeeNomineeGuarantorPayload(Request $request): void
    {
        $nominees = $request->input('nominees');
        if (is_array($nominees)) {
            $normalized = [];
            foreach ($nominees as $nominee) {
                if (! is_array($nominee)) {
                    continue;
                }

                $normalized[] = [
                    'name' => $nominee['name'] ?? '',
                    'relation' => $this->nullableRequestString($nominee['relation'] ?? null),
                    'date_of_birth' => $this->nullableRequestString($nominee['date_of_birth'] ?? null),
                    'contact' => $this->nullableRequestString($nominee['contact'] ?? $nominee['mobile'] ?? null),
                    'share' => $this->nullableRequestNumber($nominee['share'] ?? $nominee['share_percentage'] ?? null),
                ];
            }

            $request->merge(['nominees' => $normalized]);
        }

        $guarantors = $request->input('guarantors');
        if (is_array($guarantors)) {
            $normalized = [];
            foreach ($guarantors as $guarantor) {
                if (! is_array($guarantor)) {
                    continue;
                }

                $normalized[] = [
                    'name' => $guarantor['name'] ?? '',
                    'father_name' => $this->nullableRequestString($guarantor['father_name'] ?? null),
                    'age' => $this->nullableRequestInteger($guarantor['age'] ?? null),
                    'occupation' => $this->nullableRequestString($guarantor['occupation'] ?? $guarantor['profession'] ?? null),
                    'relation' => $this->nullableRequestString($guarantor['relation'] ?? null),
                    'phone' => $this->nullableRequestString($guarantor['phone'] ?? $guarantor['mobile'] ?? null),
                    'email' => $this->nullableRequestString($guarantor['email'] ?? null),
                    'nid' => $this->nullableRequestString($guarantor['nid'] ?? null),
                    'organization' => $this->nullableRequestString($guarantor['organization'] ?? null),
                    'designation' => $this->nullableRequestString($guarantor['designation'] ?? null),
                    'address' => $this->nullableRequestString($guarantor['address'] ?? null),
                ];
            }

            $request->merge(['guarantors' => $normalized]);
        }
    }

    private function nullableRequestString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function nullableRequestNumber(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $value;
    }

    private function nullableRequestInteger(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    /**
     * @param  array<string, mixed>  $nominee
     * @return array<string, mixed>
     */
    private function employeeNomineeInsertRow(int $employeeId, array $nominee): array
    {
        return [
            'employee_id' => $employeeId,
            'name' => (string) ($nominee['name'] ?? ''),
            'relation' => $nominee['relation'] ?? null,
            'date_of_birth' => $nominee['date_of_birth'] ?? null,
            'share' => $nominee['share'] ?? null,
            'contact' => $nominee['contact'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * @param  array<string, mixed>  $guarantor
     * @return array<string, mixed>
     */
    private function employeeGuarantorInsertRow(int $employeeId, array $guarantor): array
    {
        return [
            'employee_id' => $employeeId,
            'name' => (string) ($guarantor['name'] ?? ''),
            'father_name' => $guarantor['father_name'] ?? null,
            'age' => $guarantor['age'] ?? null,
            'occupation' => $guarantor['occupation'] ?? null,
            'relation' => $guarantor['relation'] ?? null,
            'phone' => $guarantor['phone'] ?? null,
            'email' => $guarantor['email'] ?? null,
            'nid' => $guarantor['nid'] ?? null,
            'organization' => $guarantor['organization'] ?? null,
            'designation' => $guarantor['designation'] ?? null,
            'address' => $guarantor['address'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function normalizeEmployeeBankPayload(Request $request): void
    {
        if (! $request->has('bank') || ! is_array($request->input('bank'))) {
            return;
        }

        $bank = $request->input('bank');
        $bank['account_type'] = self::DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE;
        $bank['branch_name'] = self::DEFAULT_EMPLOYEE_BANK_BRANCH_NAME;
        $request->merge(['bank' => $bank]);
    }

    /**
     * @param  array<string, mixed>  $bank
     * @return array<string, mixed>
     */
    private function employeeBankInsertRow(int $employeeId, array $bank): array
    {
        return [
            'employee_id' => $employeeId,
            'bank_name' => (string) ($bank['bank_name'] ?? ''),
            'branch_name' => self::DEFAULT_EMPLOYEE_BANK_BRANCH_NAME,
            'account_no' => $bank['account_no'] ?? null,
            'account_type' => self::DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE,
            'bank_address' => $bank['bank_address'] ?? null,
            'remark' => $bank['remark'] ?? null,
            'is_primary' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ];
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
                $this->forgetLocationsPayloadCache();
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

    public function storeUnion(Request $request)
    {
        $validated = $request->validate([
            'division' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'upazila' => 'required|string|max:120',
            'name' => 'required|string|max:120',
        ]);

        $validated = array_map(fn ($v) => is_string($v) ? trim($v) : $v, $validated);
        $validated['created_by'] = $request->user()?->id;

        $union = LocationUnion::query()->firstOrCreate(
            Arr::only($validated, ['division', 'district', 'upazila', 'name']),
            Arr::only($validated, ['created_by'])
        );

        try {
            $unionsPath = base_path('data/locations/unions_custom.json');
            if (! file_exists($unionsPath)) {
                @file_put_contents($unionsPath, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
            }

            $existing = $this->readJsonArrayFile($unionsPath);
            if (! is_array($existing)) {
                $existing = [];
            }

            $newEntry = [
                'division' => (string) $union->division,
                'district' => (string) $union->district,
                'upazila' => (string) $union->upazila,
                'name' => (string) $union->name,
            ];

            $existsAlready = false;
            foreach ($existing as $row) {
                if (! is_array($row)) {
                    continue;
                }
                if (
                    trim((string) ($row['name'] ?? '')) === $newEntry['name']
                    && trim((string) ($row['upazila'] ?? '')) === $newEntry['upazila']
                    && trim((string) ($row['district'] ?? '')) === $newEntry['district']
                    && trim((string) ($row['division'] ?? '')) === $newEntry['division']
                ) {
                    $existsAlready = true;
                    break;
                }
            }

            if (! $existsAlready) {
                $existing[] = $newEntry;
                @file_put_contents($unionsPath, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                $this->forgetLocationsPayloadCache();
            }
        } catch (\Throwable) {
            // ignore file persistence errors
        }

        return response()->json([
            'id' => $union->id,
            'division' => $union->division,
            'district' => $union->district,
            'upazila' => $union->upazila,
            'name' => $union->name,
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
     * User login access follows employee employment status.
     * After Employee::create(), status may be unset on the in-memory model until refresh
     * even when the DB default is active — treat missing status as active.
     */
    private function employeeIsActiveForUserAccess(Employee $employee): bool
    {
        $status = $employee->status;
        if ($status === null || $status === '') {
            $status = $employee->exists
                ? (Employee::query()->whereKey($employee->id)->value('status') ?? 'active')
                : 'active';
        }

        return $status === 'active';
    }

    /**
     * Keep linked login accounts in sync when employment status changes.
     */
    private function syncLinkedUserActiveStatusFromEmployee(Employee $employee): void
    {
        $employee->syncLinkedUserActiveStatus();
        app(MisLoanFieldOfficerSyncService::class)->pushEmployee($employee->fresh(['designation', 'branch', 'user']) ?? $employee);
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
            $name = 'User';
        }

        $payload = [
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'role_id' => $primaryRoleId,
            'employee_id' => $employee->id,
            'branch_id' => $employee->current_branch_id,
            'active_status' => $this->employeeIsActiveForUserAccess($employee),
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

        app(MisLoanFieldOfficerSyncService::class)->pushEmployee($employee->fresh(['designation', 'branch', 'user']) ?? $employee);
    }

    /**
     * Display a listing of employees.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user instanceof User && $user->isAccountsDeskOnly()) {
            abort(403);
        }

        $query = Employee::with([
            'department',
            'designation',
            'branch.regionalOffice.zone',
            'employeeType',
        ]);
        OrganogramAccessService::constrainVisibleEmployees($query, $user);
        $this->applyEmployeeDirectoryFilters($query, $request);

        $perPage = (int) $request->get('per_page', 25);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500], true)) {
            $perPage = 25;
        }

        [$sortBy, $sortDir] = $this->resolveEmployeeDirectorySort($request);
        HeadOfficeOrganogram::applyToEmployeeQuery($query, $sortBy, $sortDir);

        $employees = $query
            ->paginate($perPage)
            ->withQueryString();

        $employees->getCollection()->transform(function (Employee $employee) {
            $employee->setAppends(array_diff($employee->getAppends(), Employee::detailAppends()));

            return $employee;
        });

        $deptIds = OrganogramAccessService::accessibleDepartmentIdList($user);
        $departments = $deptIds === null
            ? Department::query()->orderBy('name')->get()
            : Department::query()->whereIn('id', $deptIds)->orderBy('name')->get();

        $branchIds = OrganogramAccessService::accessibleBranchIdList($user);
        $branches = $branchIds === null
            ? Branch::query()->orderBy('name')->get()
            : Branch::query()->whereIn('id', $branchIds)->orderBy('name')->get();

        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get();

        $designations = Designation::query()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('employee/index', [
            'employees' => $employees,
            'departments' => $departments,
            'branches' => $branches,
            'employee_types' => $employeeTypes,
            'designations' => $designations,
            'export_columns' => array_map(
                fn (array $column) => [
                    'key' => $column['key'],
                    'label' => $column['label'],
                    'group' => $column['group'],
                    'group_label' => EmployeeExport::groupTitles()[$column['group']] ?? ucfirst($column['group']),
                ],
                EmployeeExport::columns()
            ),
            'filters' => array_merge(
                $request->only(['search', 'per_page', 'sort_by', 'sort_dir']),
                [
                    'department_ids' => $this->resolveFilterValues($request, 'department_ids', 'department_id'),
                    'branch_ids' => $this->resolveFilterValues($request, 'branch_ids', 'branch_id'),
                    'statuses' => $this->resolveStringFilterValues($request, 'statuses', 'status'),
                    'employee_type_ids' => $this->resolveFilterValues($request, 'employee_type_ids', 'employee_type_id'),
                    'designation_ids' => $this->resolveFilterValues($request, 'designation_ids', 'designation_id'),
                    'genders' => $this->resolveStringFilterValues($request, 'genders', 'gender'),
                ]
            ),
        ]);
    }

    /**
     * Download filtered employees as XLSX with the same detailed columns as the import template.
     */
    public function exportXlsx(Request $request)
    {
        $user = $request->user();

        if ($user instanceof User && $user->isAccountsDeskOnly()) {
            abort(403);
        }

        $availableColumnKeys = EmployeeExport::headers();
        $requestedColumnKeys = $request->input('columns', $availableColumnKeys);
        if (! is_array($requestedColumnKeys)) {
            $requestedColumnKeys = preg_split('/[,\s]+/', (string) $requestedColumnKeys) ?: [];
        }
        $selectedColumnKeys = array_values(array_unique(array_filter(
            array_map(static fn ($key) => trim((string) $key), $requestedColumnKeys),
            static fn (string $key) => in_array($key, $availableColumnKeys, true)
        )));
        if ($selectedColumnKeys === []) {
            abort(422, 'Select at least one column to export.');
        }

        $query = Employee::query()->with([
            'department:id,name',
            'joiningDesignation:id,name',
            'lastDesignation:id,name',
            'designation:id,name',
            'branch:id,name',
            'lastBranch:id,name',
            'employeeType:id,name',
            'program:id,name',
            'project:id,name',
            'payscale:id,name',
            'salaryGrade:id,name',
            'salaryStep:id,step_number,basic_salary',
        ]);
        OrganogramAccessService::constrainVisibleEmployees($query, $user);
        $this->applyEmployeeDirectoryFilters($query, $request);

        [$sortBy, $sortDir] = $this->resolveEmployeeDirectorySort($request);
        HeadOfficeOrganogram::applyToEmployeeQuery($query, $sortBy, $sortDir);

        $employees = $query->get();
        $employeeIds = $employees->pluck('id')->all();

        $banksByEmployee = collect();
        $addressesByEmployee = collect();
        $relatedByTable = [];
        $salaryDetailsByEmployee = collect();
        if ($employeeIds !== []) {
            $banksByEmployee = DB::table('employee_bank_accounts')
                ->whereIn('employee_id', $employeeIds)
                ->orderByDesc('is_primary')
                ->orderBy('id')
                ->get()
                ->groupBy('employee_id')
                ->map(fn ($rows) => $rows->first());

            $addressesByEmployee = DB::table('employee_addresses')
                ->whereIn('employee_id', $employeeIds)
                ->get()
                ->groupBy('employee_id');

            foreach ([
                'educations' => 'employee_educations',
                'nominees' => 'employee_nominees',
                'guarantors' => 'employee_guarantors',
                'guarantor_cheques' => 'employee_guarantor_cheques',
                'collaterals' => 'employee_collaterals',
                'collateral_cheques' => 'employee_collateral_receive_cheques',
                'assets' => 'employee_assets',
                'experiences' => 'employee_experiences',
                'trainings' => 'employee_trainings',
                'documents' => 'employee_documents',
            ] as $key => $table) {
                $relatedByTable[$key] = DB::table($table)
                    ->whereIn('employee_id', $employeeIds)
                    ->orderBy('id')
                    ->get()
                    ->groupBy('employee_id');
            }

            $salaryDetailsByEmployee = DB::table('salary_head_modifications as modifications')
                ->join('salary_heads as heads', 'heads.id', '=', 'modifications.salary_head_id')
                ->whereIn('modifications.employee_id', $employeeIds)
                ->where('modifications.is_active', true)
                ->select([
                    'modifications.employee_id',
                    'heads.name as head_name',
                    'heads.type as head_type',
                    'modifications.amount_type',
                    'modifications.amount',
                    'modifications.effective_from',
                ])
                ->orderBy('heads.sort_order')
                ->get()
                ->groupBy('employee_id');
        }

        $rows = [];
        foreach ($employees as $index => $employee) {
            $rows[] = $this->mapEmployeeToImportExportRow(
                $employee,
                $index + 1,
                $banksByEmployee->get($employee->id),
                $addressesByEmployee->get($employee->id, collect()),
                array_map(
                    fn ($rows) => $rows->get($employee->id, collect()),
                    $relatedByTable
                ),
                $salaryDetailsByEmployee->get($employee->id, collect())
            );
        }

        $mapRef = fn ($query) => $query->get(['id', 'name'])
            ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name])
            ->all();

        $references = [
            'departments' => $mapRef(Department::query()->orderBy('name')),
            'designations' => $mapRef(Designation::query()->orderBy('name')),
            'branches' => $mapRef(Branch::query()->orderBy('name')),
            'employee_types' => $mapRef(EmployeeType::query()->where('is_active', true)->orderBy('name')),
        ];

        $xlsx = EmployeeImportTemplateExporter::generate(
            $rows,
            $references,
            $selectedColumnKeys,
            EmployeeExport::columns(),
            EmployeeExport::groupTitles(),
            EmployeeExport::groupColors()
        );
        $filename = 'employees-export-'.now()->format('Y-m-d-His').'.xlsx';

        return response((string) $xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Employee>  $query
     */
    private function applyEmployeeDirectoryFilters($query, Request $request): void
    {
        $query->when($request->search, function ($query, $search) {
            $query->where(function ($query) use ($search) {
                $query->where('employees.name_en', 'like', "%{$search}%")
                    ->orWhere('employees.name_bn', 'like', "%{$search}%")
                    ->orWhere('employees.pin', 'like', "%{$search}%")
                    ->orWhere('employees.employee_id', 'like', "%{$search}%")
                    ->orWhere('employees.email', 'like', "%{$search}%");
            });
        });

        $this->applyNullableIdFilter($query, $request, 'employees.department_id', 'department_ids', 'department_id');
        $this->applyNullableIdFilter($query, $request, 'employees.current_branch_id', 'branch_ids', 'branch_id');
        $this->applyNullableIdFilter($query, $request, 'employees.employee_type_id', 'employee_type_ids', 'employee_type_id');
        $this->applyNullableIdFilter($query, $request, 'employees.designation_id', 'designation_ids', 'designation_id');

        $statuses = $this->resolveStringFilterValues($request, 'statuses', 'status');
        if ($statuses !== []) {
            $allowed = ['active', 'inactive', 'on_leave', 'terminated'];
            $statuses = array_values(array_intersect($statuses, $allowed));
            if ($statuses !== []) {
                $query->whereIn('employees.status', $statuses);
            }
        }

        $genders = $this->resolveStringFilterValues($request, 'genders', 'gender');
        if ($genders !== []) {
            $allowed = ['male', 'female', 'other', '__null'];
            $genders = array_values(array_intersect($genders, $allowed));
            $hasNull = in_array('__null', $genders, true);
            $realGenders = array_values(array_filter($genders, fn ($v) => $v !== '__null'));
            if ($hasNull && $realGenders !== []) {
                $query->where(function ($q) use ($realGenders) {
                    $q->whereIn('employees.gender', $realGenders)
                        ->orWhereNull('employees.gender')
                        ->orWhere('employees.gender', '');
                });
            } elseif ($hasNull) {
                $query->where(function ($q) {
                    $q->whereNull('employees.gender')->orWhere('employees.gender', '');
                });
            } elseif ($realGenders !== []) {
                $query->whereIn('employees.gender', $realGenders);
            }
        }
    }

    /**
     * Resolve filter values that may include '__null' sentinel alongside numeric IDs.
     *
     * @return list<string>
     */
    private function resolveFilterValues(Request $request, string $pluralKey, string $singularKey): array
    {
        $raw = $request->input($pluralKey, $request->input($singularKey));

        if ($raw === null || $raw === '' || $raw === []) {
            return [];
        }

        if (! is_array($raw)) {
            $raw = preg_split('/[,\s]+/', (string) $raw) ?: [];
        }

        return array_values(array_unique(array_filter(
            array_map(static fn ($v) => trim((string) $v), $raw),
            static fn (string $v) => $v !== '' && ($v === '__null' || (int) $v > 0)
        )));
    }

    /**
     * Apply whereIn + orWhereNull filter for a column that supports '__null'.
     */
    private function applyNullableIdFilter($query, Request $request, string $column, string $pluralKey, string $singularKey): void
    {
        $values = $this->resolveFilterValues($request, $pluralKey, $singularKey);
        if ($values === []) {
            return;
        }

        $hasNull = in_array('__null', $values, true);
        $ids = array_values(array_filter(array_map('intval', $values), fn (int $id) => $id > 0));

        if ($hasNull && $ids !== []) {
            $query->where(function ($q) use ($column, $ids) {
                $q->whereIn($column, $ids)->orWhereNull($column);
            });
        } elseif ($hasNull) {
            $query->whereNull($column);
        } elseif ($ids !== []) {
            $query->whereIn($column, $ids);
        }
    }

    /**
     * @return list<string>
     */
    private function resolveStringFilterValues(Request $request, string $pluralKey, string $singularKey): array
    {
        $raw = $request->input($pluralKey, $request->input($singularKey));

        if ($raw === null || $raw === '' || $raw === []) {
            return [];
        }

        if (is_string($raw)) {
            $parts = preg_split('/[,\s]+/', $raw) ?: [];

            return array_values(array_unique(array_filter(array_map(
                static fn ($v) => trim((string) $v),
                $parts
            ), static fn (string $v) => $v !== '')));
        }

        if (! is_array($raw)) {
            $value = trim((string) $raw);

            return $value !== '' ? [$value] : [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($v) => trim((string) $v),
            $raw
        ), static fn (string $v) => $v !== '')));
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveEmployeeDirectorySort(Request $request): array
    {
        $allowedSortBy = ['organogram', 'id', 'pin', 'name', 'status'];
        $sortBy = (string) $request->get('sort_by', 'organogram');
        if (! in_array($sortBy, $allowedSortBy, true)) {
            $sortBy = 'organogram';
        }

        $sortDir = strtolower((string) $request->get('sort_dir', 'asc'));
        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = 'asc';
        }

        return [$sortBy, $sortDir];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, object>|iterable<int, object>  $addresses
     * @param  array<string, \Illuminate\Support\Collection<int, object>|iterable<int, object>>  $related
     * @param  \Illuminate\Support\Collection<int, object>|iterable<int, object>  $salaryDetails
     * @return array<string, string>
     */
    private function mapEmployeeToImportExportRow(
        Employee $employee,
        int $sl,
        ?object $bank,
        $addresses,
        array $related = [],
        $salaryDetails = []
    ): array {
        $addressMap = [
            'present' => null,
            'permanent' => null,
        ];
        foreach ($addresses as $address) {
            $type = (string) ($address->type ?? '');
            if (isset($addressMap[$type]) && $addressMap[$type] === null) {
                $addressMap[$type] = $address;
            }
        }

        $fmtDate = static function ($value): string {
            if ($value instanceof \DateTimeInterface) {
                return $value->format('Y-m-d');
            }
            if (is_string($value) && trim($value) !== '') {
                return substr(trim($value), 0, 10);
            }

            return '';
        };

        $relatedValues = static function (iterable $rows, string $field) use ($fmtDate): string {
            $values = [];
            foreach ($rows as $index => $row) {
                $value = $row->{$field} ?? '';
                if ($value instanceof \DateTimeInterface || str_contains($field, 'date')) {
                    $value = $fmtDate($value);
                } elseif (is_bool($value)) {
                    $value = $value ? 'Yes' : 'No';
                } elseif (is_array($value) || is_object($value)) {
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }
                $values[] = ($index + 1).'. '.trim((string) $value);
            }

            return implode("\n", $values);
        };

        $joiningDesig = $employee->joiningDesignation?->name
            ?? $employee->designation?->name
            ?? '';
        $lastDesig = $employee->lastDesignation?->name
            ?? $employee->designation?->name
            ?? $joiningDesig;

        $present = $addressMap['present'];
        $permanent = $addressMap['permanent'];
        $educations = $related['educations'] ?? [];
        $nominees = $related['nominees'] ?? [];
        $guarantors = $related['guarantors'] ?? [];
        $guarantorCheques = $related['guarantor_cheques'] ?? [];
        $collateralRows = $related['collaterals'] ?? [];
        $collateral = collect($collateralRows)->first();
        $collateralCheques = $related['collateral_cheques'] ?? [];
        $assets = $related['assets'] ?? [];
        $experiences = $related['experiences'] ?? [];
        $trainings = $related['trainings'] ?? [];
        $documents = $related['documents'] ?? [];

        $salaryLines = [];
        foreach ($salaryDetails as $index => $detail) {
            $amount = (string) ($detail->amount ?? '');
            if (($detail->amount_type ?? '') === 'percentage') {
                $amount .= '%';
            }
            $salaryLines[] = ($index + 1).'. '.(string) ($detail->head_name ?? '')
                .' ['.(string) ($detail->head_type ?? '').']: '.$amount;
        }

        $certificateLevels = '';
        if ($collateral !== null) {
            $decodedLevels = json_decode((string) ($collateral->certificate_levels ?? ''), true);
            $certificateLevels = is_array($decodedLevels)
                ? implode(', ', array_map('strval', $decodedLevels))
                : (string) ($collateral->certificate_levels ?? '');
        }

        return [
            'sl' => (string) $sl,
            'pin' => (string) ($employee->pin ?? $employee->employee_id ?? ''),
            'name_en' => (string) ($employee->name_en ?? ''),
            'employee_type' => (string) ($employee->employeeType?->name ?? ''),
            'mobile_personal' => (string) ($employee->mobile_personal ?? ''),
            'joining_date' => $fmtDate($employee->joining_date),
            'department' => (string) ($employee->department?->name ?? ''),
            'joining_designation' => (string) $joiningDesig,
            'branch' => (string) ($employee->branch?->name ?? ''),
            'status' => (string) ($employee->status ?? ''),
            'name_bn' => (string) ($employee->name_bn ?? ''),
            'email' => (string) ($employee->email ?? ''),
            'mobile_official' => (string) ($employee->mobile_official ?? ''),
            'gender' => (string) ($employee->gender ?? ''),
            'religion' => (string) ($employee->religion ?? ''),
            'blood_group' => (string) ($employee->blood_group ?? ''),
            'date_of_birth' => $fmtDate($employee->date_of_birth),
            'marital_status' => (string) ($employee->marital_status ?? ''),
            'spouse_name' => (string) ($employee->spouse_name ?? ''),
            'spouse_mobile' => (string) ($employee->spouse_mobile ?? ''),
            'fathers_name' => (string) ($employee->fathers_name ?? ''),
            'fathers_mobile' => (string) ($employee->fathers_mobile ?? ''),
            'mothers_name' => (string) ($employee->mothers_name ?? ''),
            'mothers_mobile' => (string) ($employee->mothers_mobile ?? ''),
            'nid_number' => (string) ($employee->nid_number ?? ''),
            'smart_card_number' => (string) ($employee->smart_card_number ?? ''),
            'tin_certificate_no' => (string) ($employee->tin_certificate_no ?? ''),
            'driving_license_no' => (string) ($employee->driving_license_no ?? ''),
            'passport_no' => (string) ($employee->passport_no ?? ''),
            'identification_mark' => (string) ($employee->identification_mark ?? ''),
            'confirmation_date' => $fmtDate($employee->confirmation_date),
            'last_designation' => (string) $lastDesig,
            'last_branch' => (string) ($employee->lastBranch?->name ?? $employee->branch?->name ?? ''),
            'bank_name' => (string) ($bank->bank_name ?? ''),
            'bank_branch_name' => (string) ($bank->branch_name ?? ''),
            'bank_account_no' => (string) ($bank->account_no ?? ''),
            'bank_account_type' => (string) ($bank->account_type ?? ''),
            'bank_address' => (string) ($bank->bank_address ?? ''),
            'bank_remark' => (string) ($bank->remark ?? ''),
            'present_division' => (string) ($present->division ?? ''),
            'present_district' => (string) ($present->district ?? ''),
            'present_upazila' => (string) ($present->upazila ?? ''),
            'present_union' => (string) ($present->union ?? ''),
            'present_village' => (string) ($present->village ?? ''),
            'present_address_details' => (string) ($present->address_details ?? ''),
            'permanent_division' => (string) ($permanent->division ?? ''),
            'permanent_district' => (string) ($permanent->district ?? ''),
            'permanent_upazila' => (string) ($permanent->upazila ?? ''),
            'permanent_union' => (string) ($permanent->union ?? ''),
            'permanent_village' => (string) ($permanent->village ?? ''),
            'permanent_address_details' => (string) ($permanent->address_details ?? ''),
            'program' => (string) ($employee->program?->name ?? ''),
            'project' => (string) ($employee->project?->name ?? ''),
            'is_project_employee' => $employee->is_project_employee ? 'Yes' : 'No',
            'is_custodian' => $employee->is_custodian ? 'Yes' : 'No',
            'probation_period' => $employee->probation_period_days !== null
                ? (string) $employee->probation_period_days.' days'
                : '',
            'age' => $employee->staff_age_years !== null
                ? (string) $employee->staff_age_years.' years'
                : '',
            'payscale' => (string) ($employee->payscale?->name ?? ''),
            'salary_grade' => (string) ($employee->salaryGrade?->name ?? ''),
            'salary_step' => $employee->salaryStep
                ? 'Step '.(string) $employee->salaryStep->step_number
                : '',
            'basic_salary' => (string) ($employee->basic_salary ?? ''),
            'salary_details' => implode("\n", $salaryLines),
            'photo' => (string) ($employee->photo ?? ''),
            'signature' => (string) ($employee->signature ?? ''),
            'education_degree' => $relatedValues($educations, 'degree'),
            'education_institute' => $relatedValues($educations, 'institute'),
            'education_board' => $relatedValues($educations, 'board'),
            'education_group' => $relatedValues($educations, 'group_name'),
            'education_subject' => $relatedValues($educations, 'subject'),
            'education_result_type' => $relatedValues($educations, 'result_type'),
            'education_result_value' => $relatedValues($educations, 'result_value'),
            'nominee_name' => $relatedValues($nominees, 'name'),
            'nominee_relation' => $relatedValues($nominees, 'relation'),
            'nominee_mobile' => $relatedValues($nominees, 'contact'),
            'nominee_date_of_birth' => $relatedValues($nominees, 'date_of_birth'),
            'nominee_share' => $relatedValues($nominees, 'share'),
            'guarantor_name' => $relatedValues($guarantors, 'name'),
            'guarantor_father_name' => $relatedValues($guarantors, 'father_name'),
            'guarantor_mobile' => $relatedValues($guarantors, 'phone'),
            'guarantor_address' => $relatedValues($guarantors, 'address'),
            'guarantor_profession' => $relatedValues($guarantors, 'occupation'),
            'guarantor_organization' => $relatedValues($guarantors, 'organization'),
            'guarantor_designation' => $relatedValues($guarantors, 'designation'),
            'guarantor_nid' => $relatedValues($guarantors, 'nid'),
            'guarantor_cheque_bank' => $relatedValues($guarantorCheques, 'bank_name'),
            'guarantor_cheque_number' => $relatedValues($guarantorCheques, 'cheque_no'),
            'guarantor_cheque_amount' => $relatedValues($guarantorCheques, 'amount'),
            'collateral_has_certificate' => $collateral?->has_certificate ? 'Yes' : 'No',
            'collateral_certificate_levels' => $certificateLevels,
            'collateral_security_amount' => (string) ($collateral->security_amount ?? ''),
            'collateral_interest' => (string) ($collateral->collateral_interest ?? ''),
            'collateral_date' => $fmtDate($collateral->collateral_date ?? null),
            'collateral_notes' => (string) ($collateral->notes ?? ''),
            'collateral_cheque_bank' => $relatedValues($collateralCheques, 'bank_name'),
            'collateral_cheque_number' => $relatedValues($collateralCheques, 'cheque_no'),
            'collateral_cheque_amount' => $relatedValues($collateralCheques, 'amount'),
            'asset_serial' => $relatedValues($assets, 'serial'),
            'asset_number' => $relatedValues($assets, 'asset_no'),
            'asset_name' => $relatedValues($assets, 'name'),
            'asset_quantity' => $relatedValues($assets, 'provided_quality'),
            'asset_price' => $relatedValues($assets, 'asset_price'),
            'asset_details' => $relatedValues($assets, 'details'),
            'experience_organization' => $relatedValues($experiences, 'organization'),
            'experience_from_date' => $relatedValues($experiences, 'from_date'),
            'experience_to_date' => $relatedValues($experiences, 'to_date'),
            'experience_designation' => $relatedValues($experiences, 'designation'),
            'experience_department' => $relatedValues($experiences, 'department'),
            'experience_responsibility' => $relatedValues($experiences, 'address'),
            'training_title' => $relatedValues($trainings, 'training_title'),
            'training_institute' => $relatedValues($trainings, 'institute'),
            'training_duration' => $relatedValues($trainings, 'duration'),
            'training_address' => $relatedValues($trainings, 'address'),
            'training_remarks' => $relatedValues($trainings, 'remarks'),
            'document_type' => $relatedValues($documents, 'document_type'),
            'document_title' => $relatedValues($documents, 'title'),
            'document_description' => $relatedValues($documents, 'description'),
            'document_expiry_date' => $relatedValues($documents, 'expiry_date'),
            'document_file' => $relatedValues($documents, 'file_path'),
        ];
    }

    /**
     * Toggle employee active/inactive status from the directory listing.
     */
    public function updateStatus(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'active' => 'required|boolean',
        ]);

        $newStatus = $validated['active'] ? 'active' : 'inactive';
        if ($newStatus === 'active') {
            $branch = Branch::query()->find($employee->current_branch_id);
            if ($branch && ! $branch->is_active) {
                return back()->withErrors([
                    'active' => 'Cannot activate employee while their branch is inactive. Transfer them to an active branch first.',
                ]);
            }
        }

        $employee->status = $newStatus;
        $employee->save();

        $this->syncLinkedUserActiveStatusFromEmployee($employee->fresh());

        return back()->with('success', 'Employee status updated successfully.');
    }

    /**
     * Show form to create a new employee.
     */
    public function create()
    {
        $departments = Department::all();
        $designations = Designation::all();
        $branches = Branch::query()
            ->active()
            ->with([
                'regionalOffice.zone.zoneManager:id,employee_id,name_en',
                'regionalOffice.regionalManager:id,employee_id,name_en',
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'regional_office_id']);
        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get();
        $programs = Program::query()->where('is_active', true)->orderBy('name')->get();
        $projects = Project::query()->where('is_active', true)->orderBy('name')->get();

        $banks = $this->readJsonArrayFile(base_path('data/bank.json'));
        $relations = $this->readJsonArrayFile(base_path('data/relation.json'));
        $educationBoards = $this->readJsonArrayFile(base_path('data/educationboard.json'));
        $locations = $this->buildLocationsBasePayload();

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
                        'name_en' => $regionalManager->name_en,
                    ] : null,
                    'zoneManager' => $zoneManager ? [
                        'id' => $zoneManager->id,
                        'employee_id' => $zoneManager->employee_id,
                        'name_en' => $zoneManager->name_en,
                    ] : null,
                ];
            }),
            'statuses' => ['active', 'inactive'],
            'employeeTypes' => $employeeTypes,
            'programs' => $programs,
            'projects' => $projects,
            'banks' => $banks,
            'relations' => $relations,
            'educationBoards' => $educationBoards,
            'locations' => $locations,
            'defaultBankName' => 'Prime Bank PLC',
            'documentTypes' => $this->employeeTabDocumentTypes(),
            ...$this->employeePayrollFormOptions(),
        ]);
    }

    /**
     * Store a newly created employee.
     */
    public function store(Request $request)
    {
        $createdEmployee = null;

        try {
            $this->scrubEmptyMediaUploads($request);
            $this->normalizeEmployeeRequestPayload($request);
            $this->mergeSalaryLinesFromRequest($request);
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
                'employee_type_id' => 'required|exists:employee_types,id',
                'pin' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('pin')],

                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',

                'gender' => 'nullable|string|max:20',
                'religion' => 'nullable|string|max:50',
                'marital_status' => 'nullable|string|in:'.implode(',', $maritalStatuses),
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',

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

                'nid_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('nid_number')],
                'smart_card_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('smart_card_number')],
                'tin_certificate_no' => 'nullable|string|max:50',
                'driving_license_no' => 'nullable|string|max:50',
                'passport_no' => 'nullable|string|max:50',

                'is_project_employee' => 'nullable|boolean',
                'is_custodian' => 'nullable|boolean',
                'identification_mark' => 'nullable|string|max:255',

                // Contact
                'email' => 'nullable|email',
                'mobile_personal' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('mobile_personal')],
                'mobile_official' => 'nullable|string|max:20',

                'payscale_id' => 'nullable|exists:payscales,id',
                'salary_grade_id' => 'nullable|exists:salary_grades,id',
                'salary_step_id' => 'nullable|exists:salary_steps,id',
                'basic_salary' => 'nullable|numeric|min:0',
                'salary_lines' => 'nullable|array',
                'salary_lines.*.salary_head_id' => 'required_with:salary_lines|exists:salary_heads,id',
                'salary_lines.*.amount_type' => 'required_with:salary_lines|in:percentage,fixed',
                'salary_lines.*.amount' => 'required_with:salary_lines|numeric|min:0',
                'salary_lines_json' => 'nullable|string',
                'sync_salary_components' => 'nullable|boolean',

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
                'guarantors.*.father_name' => 'nullable|string|max:200',
                'guarantors.*.age' => 'nullable|integer|min:0|max:150',
                'guarantors.*.occupation' => 'nullable|string|max:150',
                'guarantors.*.relation' => 'nullable|string|max:80',
                'guarantors.*.phone' => 'nullable|string|max:30',
                'guarantors.*.email' => 'nullable|email',
                'guarantors.*.nid' => 'nullable|string|max:30',
                'guarantors.*.organization' => 'nullable|string|max:200',
                'guarantors.*.designation' => 'nullable|string|max:150',
                'guarantors.*.address' => 'nullable|string',

                'guarantor_cheques' => 'nullable|array',
                'guarantor_cheques.*.bank_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.branch_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.cheque_no' => 'nullable|string|max:80',
                'guarantor_cheques.*.amount' => 'nullable|numeric|min:0',

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
                'collateral_receive_cheques.*.amount' => 'nullable|numeric|min:0',
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

                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
                'signature' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
            ]);

            $marital = trim((string) ($validated['marital_status'] ?? ''));
            $needsSpouse = in_array($marital, ['Married', 'Widowed', 'Separated'], true);
            if ($needsSpouse) {
                $request->validate([
                    'spouse_name' => 'required|string|max:255',
                    'spouse_mobile' => 'required|string|max:20',
                ]);
            }

            $this->assertEmployeePayrollAssignment($validated);
            $this->assertActiveBranchForEmployedEmployee($validated);

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
                'salary_lines',
                'salary_lines_json',
                'sync_salary_components',
            ]);

            $employeeData['employee_id'] = $employeeData['pin'];
            $employeeData['designation_id'] = $employeeData['last_designation_id'];
            $employeeData['status'] = $employeeData['status'] ?? 'active';

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
                    $employeeData['photo'] = $this->storeEmployeeMediaFile(
                        $request->file('photo'),
                        'employee_photos',
                        (string) ($employeeData['pin'] ?? 'emp')
                    );
                }

                if ($request->hasFile('signature')) {
                    $employeeData['signature'] = $this->storeEmployeeMediaFile(
                        $request->file('signature'),
                        'employee_signatures',
                        (string) ($employeeData['pin'] ?? 'emp')
                    );
                }

                if (! $request->boolean('sync_salary_components')) {
                    unset($employeeData['basic_salary']);
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
                    DB::table('employee_bank_accounts')->insert(
                        $this->employeeBankInsertRow($eid, $bank)
                    );
                }

                $nominees = is_array($validated['nominees'] ?? null) ? $validated['nominees'] : [];
                foreach ($nominees as $n) {
                    DB::table('employee_nominees')->insert(
                        $this->employeeNomineeInsertRow($eid, $n)
                    );
                }

                $guarantors = is_array($validated['guarantors'] ?? null) ? $validated['guarantors'] : [];
                foreach ($guarantors as $g) {
                    DB::table('employee_guarantors')->insert(
                        $this->employeeGuarantorInsertRow($eid, $g)
                    );
                }

                $guarantorCheques = is_array($validated['guarantor_cheques'] ?? null) ? $validated['guarantor_cheques'] : [];
                foreach ($guarantorCheques as $c) {
                    DB::table('employee_guarantor_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_guarantor_id' => null,
                        'bank_name' => $c['bank_name'] ?? null,
                        'branch_name' => $c['branch_name'] ?? null,
                        'cheque_no' => $c['cheque_no'] ?? null,
                        'amount' => $c['amount'] ?? null,
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
                        'amount' => $rc['amount'] ?? null,
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
                if ($request->boolean('sync_salary_components')) {
                    $this->syncEmployeeSalaryComponents($createdEmployee, $validated);
                }
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
            ->active()
            ->with([
                'regionalOffice.zone.zoneManager:id,employee_id,name_en',
                'regionalOffice.regionalManager:id,employee_id,name_en',
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'regional_office_id']);
        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get();
        $programs = Program::query()->where('is_active', true)->orderBy('name')->get();
        $projects = Project::query()->where('is_active', true)->orderBy('name')->get();

        $banks = $this->readJsonArrayFile(base_path('data/bank.json'));
        $relations = $this->readJsonArrayFile(base_path('data/relation.json'));
        $educationBoards = $this->readJsonArrayFile(base_path('data/educationboard.json'));
        try {
            $locations = $this->buildLocationsBasePayload();
        } catch (\Throwable $e) {
            Log::error('Employee edit: locations payload failed', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
            ]);
            $locations = ['divisions' => [], 'districts' => []];
        }

        // Load new tabbed relational data (so edit does not wipe on update)
        $employeePayload = $employee->toInertiaArray();
        $employeePayload['pin'] = $employee->pin;
        $employeePayload['addresses'] = DB::table('employee_addresses')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['educations'] = DB::table('employee_educations')->where('employee_id', $employee->id)->get()->all();
        $employeePayload['bank'] = DB::table('employee_bank_accounts')->where('employee_id', $employee->id)->first();
        if ($employeePayload['bank']) {
            $employeePayload['bank']->account_type = self::DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE;
            $employeePayload['bank']->branch_name = self::DEFAULT_EMPLOYEE_BANK_BRANCH_NAME;
        }
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
                        'name_en' => $regionalManager->name_en,
                    ] : null,
                    'zoneManager' => $zoneManager ? [
                        'id' => $zoneManager->id,
                        'employee_id' => $zoneManager->employee_id,
                        'name_en' => $zoneManager->name_en,
                    ] : null,
                ];
            }),
            'statuses' => ['active', 'inactive'],
            'employeeTypes' => $employeeTypes,
            'programs' => $programs,
            'projects' => $projects,
            'banks' => $banks,
            'relations' => $relations,
            'educationBoards' => $educationBoards,
            'locations' => $locations,
            'defaultBankName' => 'Prime Bank PLC',
            'documentTypes' => $this->employeeTabDocumentTypes(),
            ...$this->employeePayrollFormOptions(),
            'salaryAssignment' => $this->employeeSalaryAssignmentService->resolveRows(
                $employee->payscale_id ? (int) $employee->payscale_id : null,
                $employee->salary_grade_id ? (int) $employee->salary_grade_id : null,
                $employee->salary_step_id ? (int) $employee->salary_step_id : null,
                $employee,
            ),
        ]);
    }

    /**
     * Update the specified employee.
     */
    public function update(Request $request, Employee $employee)
    {
        try {
            $this->scrubEmptyMediaUploads($request);
            $this->normalizeEmployeeRequestPayload($request);
            $this->mergeSalaryLinesFromRequest($request);
            $this->resolveNidAndSmartCardFromRequest($request);

            $validated = $request->validate([
                // Tab 1
                'current_branch_id' => 'required|exists:branches,id',
                'employee_type_id' => 'nullable|exists:employee_types,id',
                'pin' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('pin', $employee->id)],

                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',

                'gender' => 'nullable|string|max:20',
                'religion' => 'nullable|string|max:50',
                'marital_status' => 'nullable|string|max:30',
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',

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

                'nid_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('nid_number', $employee->id)],
                'smart_card_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('smart_card_number', $employee->id)],
                'tin_certificate_no' => 'nullable|string|max:50',
                'driving_license_no' => 'nullable|string|max:50',
                'passport_no' => 'nullable|string|max:50',

                'is_project_employee' => 'nullable|boolean',
                'is_custodian' => 'nullable|boolean',
                'identification_mark' => 'nullable|string|max:255',

                // Contact
                'email' => 'nullable|email',
                'mobile_personal' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('mobile_personal', $employee->id)],
                'mobile_official' => 'nullable|string|max:20',

                'payscale_id' => 'nullable|exists:payscales,id',
                'salary_grade_id' => 'nullable|exists:salary_grades,id',
                'salary_step_id' => 'nullable|exists:salary_steps,id',
                'basic_salary' => 'nullable|numeric|min:0',
                'salary_lines' => 'nullable|array',
                'salary_lines.*.salary_head_id' => 'required_with:salary_lines|exists:salary_heads,id',
                'salary_lines.*.amount_type' => 'required_with:salary_lines|in:percentage,fixed',
                'salary_lines.*.amount' => 'required_with:salary_lines|numeric|min:0',
                'salary_lines_json' => 'nullable|string',
                'sync_salary_components' => 'nullable|boolean',

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
                'guarantors.*.father_name' => 'nullable|string|max:200',
                'guarantors.*.age' => 'nullable|integer|min:0|max:150',
                'guarantors.*.occupation' => 'nullable|string|max:150',
                'guarantors.*.relation' => 'nullable|string|max:80',
                'guarantors.*.phone' => 'nullable|string|max:30',
                'guarantors.*.email' => 'nullable|email',
                'guarantors.*.nid' => 'nullable|string|max:30',
                'guarantors.*.organization' => 'nullable|string|max:200',
                'guarantors.*.designation' => 'nullable|string|max:150',
                'guarantors.*.address' => 'nullable|string',

                'guarantor_cheques' => 'nullable|array',
                'guarantor_cheques.*.bank_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.branch_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.cheque_no' => 'nullable|string|max:80',
                'guarantor_cheques.*.amount' => 'nullable|numeric|min:0',

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
                'collateral_receive_cheques.*.amount' => 'nullable|numeric|min:0',
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

                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
                'signature' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
            ]);

            $this->assertEmployeePayrollAssignment($validated);
            $this->assertActiveBranchForEmployedEmployee($validated, $employee->status);

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
                'salary_lines',
                'salary_lines_json',
                'sync_salary_components',
            ]);

            $employeeData['employee_id'] = $employeeData['pin'];
            $employeeData['designation_id'] = $employeeData['last_designation_id'];

            $email = trim((string) ($employeeData['email'] ?? ''));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $employeeData['email'] = strtolower((string) $employeeData['pin']).'@'.$this->getAutoEmailDomain();
            }

            if ($request->filled('photo') && ! $request->hasFile('photo')) {
                Log::warning('Employee update: photo field present but not an uploaded file', [
                    'employee_id' => $employee->id,
                    'photo_type' => gettype($request->input('photo')),
                ]);
            }

            DB::transaction(function () use ($request, $employee, $employeeData, $validated) {
                if ($request->hasFile('photo')) {
                    $employeeData['photo'] = $this->storeEmployeeMediaFile(
                        $request->file('photo'),
                        'employee_photos',
                        (string) ($employeeData['pin'] ?? $employee->pin ?? 'emp'),
                        $employee->photo
                    );
                }

                if ($request->hasFile('signature')) {
                    $employeeData['signature'] = $this->storeEmployeeMediaFile(
                        $request->file('signature'),
                        'employee_signatures',
                        (string) ($employeeData['pin'] ?? $employee->pin ?? 'emp'),
                        $employee->signature
                    );
                }

                if (! $request->boolean('sync_salary_components')) {
                    unset($employeeData['basic_salary']);
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
                    DB::table('employee_bank_accounts')->insert(
                        $this->employeeBankInsertRow($eid, $bank)
                    );
                }

                $nominees = is_array($validated['nominees'] ?? null) ? $validated['nominees'] : [];
                foreach ($nominees as $n) {
                    DB::table('employee_nominees')->insert(
                        $this->employeeNomineeInsertRow($eid, $n)
                    );
                }

                $guarantors = is_array($validated['guarantors'] ?? null) ? $validated['guarantors'] : [];
                foreach ($guarantors as $g) {
                    DB::table('employee_guarantors')->insert(
                        $this->employeeGuarantorInsertRow($eid, $g)
                    );
                }

                $guarantorCheques = is_array($validated['guarantor_cheques'] ?? null) ? $validated['guarantor_cheques'] : [];
                foreach ($guarantorCheques as $c) {
                    DB::table('employee_guarantor_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_guarantor_id' => null,
                        'bank_name' => $c['bank_name'] ?? null,
                        'branch_name' => $c['branch_name'] ?? null,
                        'cheque_no' => $c['cheque_no'] ?? null,
                        'amount' => $c['amount'] ?? null,
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
                        'amount' => $rc['amount'] ?? null,
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
                $employee->refresh();
                if ($request->boolean('sync_salary_components')) {
                    $this->syncEmployeeSalaryComponents($employee, $validated);
                }
            });

            return redirect()
                ->route('employees.edit', $employee)
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
            'employeeType',
            'program',
            'project',
            'payscale',
            'salaryGrade',
            'salaryStep',
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
        $employee->append(Employee::detailAppends());

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

        $employee->addresses = \Illuminate\Support\Facades\DB::table('employee_addresses')->where('employee_id', $employee->id)->get()->all();
        $employee->educations = \Illuminate\Support\Facades\DB::table('employee_educations')->where('employee_id', $employee->id)->get()->all();
        $employee->bank = \Illuminate\Support\Facades\DB::table('employee_bank_accounts')->where('employee_id', $employee->id)->first();
        $employee->nominees = \Illuminate\Support\Facades\DB::table('employee_nominees')->where('employee_id', $employee->id)->get()->all();
        $employee->guarantors = \Illuminate\Support\Facades\DB::table('employee_guarantors')->where('employee_id', $employee->id)->get()->all();
        $employee->guarantor_cheques = \Illuminate\Support\Facades\DB::table('employee_guarantor_cheques')->where('employee_id', $employee->id)->get()->all();
        $employee->collateral = \Illuminate\Support\Facades\DB::table('employee_collaterals')->where('employee_id', $employee->id)->first();
        $employee->collateral_receive_cheques = \Illuminate\Support\Facades\DB::table('employee_collateral_receive_cheques')->where('employee_id', $employee->id)->get()->all();
        $employee->assets = \Illuminate\Support\Facades\DB::table('employee_assets')->where('employee_id', $employee->id)->get()->all();
        $employee->experiences = \Illuminate\Support\Facades\DB::table('employee_experiences')->where('employee_id', $employee->id)->get()->all();
        $employee->trainings = \Illuminate\Support\Facades\DB::table('employee_trainings')->where('employee_id', $employee->id)->get()->all();
        $employee->documents = EmployeeDocument::query()
            ->where('employee_id', $employee->id)
            ->orderBy('id')
            ->get()
            ->map(fn (EmployeeDocument $d) => [
                'id' => $d->id,
                'document_type' => $d->document_type,
                'title' => $d->title,
                'description' => $d->description,
                'expiry_date' => $d->expiry_date?->format('Y-m-d'),
                'file_path' => $d->file_path,
                'created_at' => $d->created_at?->toIso8601String(),
            ])
            ->all();

        if ($employee->collateral && is_string($employee->collateral->certificate_levels ?? null)) {
            $decoded = json_decode($employee->collateral->certificate_levels, true);
            $employee->collateral->certificate_levels = is_array($decoded) ? $decoded : [];
        }

        $transferHistories = TransferHistory::query()
            ->with(['fromBranch:id,name', 'toBranch:id,name', 'transfer:id,transfer_order_no,effective_date,status'])
            ->where('employee_id', $employee->id)
            ->orderByDesc('transfer_date')
            ->limit(50)
            ->get();

        $promotionHistories = PromotionHistory::query()
            ->with([
                'fromDesignation:id,name',
                'toDesignation:id,name',
                'fromSalaryGrade:id,name',
                'toSalaryGrade:id,name',
                'promotion:id,promotion_order_no,effective_date,status',
            ])
            ->where('employee_id', $employee->id)
            ->orderByDesc('promotion_date')
            ->limit(50)
            ->get();

        $demotionHistories = DemotionHistory::query()
            ->with([
                'fromDesignation:id,name',
                'toDesignation:id,name',
                'fromSalaryGrade:id,name',
                'toSalaryGrade:id,name',
                'demotion:id,demotion_order_no,effective_date,status',
            ])
            ->where('employee_id', $employee->id)
            ->orderByDesc('demotion_date')
            ->limit(50)
            ->get();

        return Inertia::render('employee/show', [
            'employee' => $employee->toInertiaArray(),
            'currentYearLeaveBalances' => $currentYearLeaveBalances,
            'recentLeaveApplications' => $recentLeaveApplications,
            'recentMovements' => $recentMovements,
            'transferHistories' => $transferHistories,
            'promotionHistories' => $promotionHistories,
            'demotionHistories' => $demotionHistories,
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
                $this->deleteEmployeeMediaFile($employee->photo);
            }
            if ($employee->signature) {
                $this->deleteEmployeeMediaFile($employee->signature);
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
                'employees' => fn ($q) => $q->where('status', 'active')->with(['designation', 'project', 'employeeType'])->orderBy('name_en'),
            ])
            ->withCount([
                'employees' => fn ($q) => $q->where('status', 'active'),
            ])
            ->where('is_head_office', true)
            ->first();

        $headOfficeTiers = $headOffice
            ? HeadOfficeOrganogram::groupEmployeesByTier($headOffice->employees)
            : [];

        $zones = Zone::with([
            'zoneManager' => fn ($q) => $q->where('status', 'active')->with('designation'),
            'regionalOffices' => function ($q) {
                $q->orderBy('code')->orderBy('name');
            },
            'regionalOffices.regionalManager' => fn ($q) => $q->where('status', 'active')->with('designation'),
            'regionalOffices.branches' => function ($q) {
                $q->where('is_head_office', false)
                    ->orderBy('branch_code')
                    ->orderBy('name')
                    ->withCount([
                        'employees' => fn ($employeeQuery) => $employeeQuery->where('status', 'active'),
                    ]);
            },
            'regionalOffices.branches.employees' => fn ($q) => $q->where('status', 'active')->with('designation'),
        ])->orderBy('code')->orderBy('name')->get();

        $zones->each(function (Zone $zone): void {
            $zoneTotal = 0;
            foreach ($zone->regionalOffices as $ro) {
                /** @var RegionalOffice $ro */
                foreach ($ro->branches as $branch) {
                    /** @var Branch $branch */
                    $branch->setAttribute(
                        'employee_tiers',
                        BranchOrganogram::groupEmployeesByTier($branch->employees)
                    );
                }

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
            'headOfficeTiers' => $headOfficeTiers,
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
