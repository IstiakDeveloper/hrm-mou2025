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
use App\Models\EmployeeDisciplinaryAction;
use App\Models\EmployeeDocument;
use App\Models\EmployeeJobHistory;
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
use App\Services\OrganogramLineRoleSyncService;
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

    protected const EMPLOYEE_IMPORT_MAX_ROWS = 5000;

    protected const EMPLOYEE_IMPORT_CACHE_TTL_SECONDS = 3600;

    protected const AUTO_USER_EMPLOYEE_ROLE_NAME = 'Employee';

    protected const AUTO_EMAIL_DOMAIN_ENV = 'HRM_AUTO_EMAIL_DOMAIN';

    protected const DEFAULT_EMPLOYEE_BANK_ACCOUNT_TYPE = 'savings';

    protected const DEFAULT_EMPLOYEE_BANK_BRANCH_NAME = 'Naogaon Sadar';

    protected function getAutoEmailDomain(): string
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
    protected function cachedLocationsPayload(): array
    {
        return Cache::remember('locations.payload.v1', now()->addDay(), fn () => $this->buildLocationsPayload());
    }

    protected function forgetLocationsPayloadCache(): void
    {
        Cache::forget('locations.payload.v1');
    }

    protected function authorizeEmployeeDirectoryAccess(Request $request): void
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

    /**
     * Keep job-history rows that have a date or separation/final-payment values.
     * Empty placeholder rows (no date and no extra fields) are dropped so they
     * are not required on save, but Type of Separation / Amount Received still persist.
     *
     * @param  array<string, mixed>  $row
     */
    private function employeeJobHistoryRowHasContent(array $row): bool
    {
        if (trim((string) ($row['event_date'] ?? '')) !== '') {
            return true;
        }

        $type = (string) ($row['event_type'] ?? '');
        if ($type === 'left') {
            return trim((string) ($row['remarks'] ?? '')) !== ''
                || trim((string) ($row['cause_of_separation'] ?? '')) !== '';
        }
        if ($type === 'final_payment') {
            $amount = $row['amount_received'] ?? null;

            return $amount !== null && $amount !== '';
        }

        foreach (['from_designation_id', 'to_designation_id', 'from_branch_id', 'to_branch_id', 'remarks'] as $key) {
            if (trim((string) ($row[$key] ?? '')) !== '') {
                return true;
            }
        }

        return false;
    }

    /**
     * Last posting branch from dated joining + transfer rows only.
     * Left / separation without a date must not count.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function lastPostingBranchIdFromJobHistoryRows(array $rows): string
    {
        $dated = $rows;
        usort($dated, fn ($a, $b) => strcmp((string) ($a['event_date'] ?? ''), (string) ($b['event_date'] ?? '')));
        $branch = '';
        foreach ($dated as $row) {
            if (! is_array($row) || trim((string) ($row['event_date'] ?? '')) === '') {
                continue;
            }
            $type = (string) ($row['event_type'] ?? '');
            if ($type === 'joining' && ! empty($row['to_branch_id'])) {
                $branch = (string) $row['to_branch_id'];
            }
            if ($type === 'transfer' && ! empty($row['to_branch_id'])) {
                $branch = (string) $row['to_branch_id'];
            }
        }

        return $branch;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function normalizeJobHistoryBranchFields(array $rows, Employee $employee): array
    {
        $firstTransferFrom = '';
        foreach ($rows as $row) {
            if (($row['event_type'] ?? '') === 'transfer' && trim((string) ($row['event_date'] ?? '')) !== '' && ! empty($row['from_branch_id'])) {
                $firstTransferFrom = (string) $row['from_branch_id'];
                break;
            }
        }

        $hasDatedTransfer = $firstTransferFrom !== '' || collect($rows)->contains(
            fn ($row) => is_array($row)
                && ($row['event_type'] ?? '') === 'transfer'
                && trim((string) ($row['event_date'] ?? '')) !== ''
                && ! empty($row['to_branch_id'])
        );

        foreach ($rows as &$row) {
            if (($row['event_type'] ?? '') !== 'joining') {
                continue;
            }
            if (! empty($row['id']) && ! empty($row['to_branch_id'])) {
                continue;
            }
            if (trim((string) ($row['to_branch_id'] ?? '')) !== '') {
                continue;
            }
            $row['to_branch_id'] = $hasDatedTransfer
                ? $firstTransferFrom
                : ($employee->current_branch_id ? (string) $employee->current_branch_id : '');
        }
        unset($row);

        $joiningBranch = '';
        foreach ($rows as $row) {
            if (($row['event_type'] ?? '') === 'joining' && trim((string) ($row['event_date'] ?? '')) !== '' && ! empty($row['to_branch_id'])) {
                $joiningBranch = (string) $row['to_branch_id'];
                break;
            }
        }
        $lastPosting = $this->lastPostingBranchIdFromJobHistoryRows($rows);

        foreach ($rows as &$row) {
            if (($row['event_type'] ?? '') !== 'left') {
                continue;
            }
            $hasDate = trim((string) ($row['event_date'] ?? '')) !== '';
            if (! $hasDate) {
                $row['from_branch_id'] = '';
                continue;
            }
            $from = trim((string) ($row['from_branch_id'] ?? ''));
            if ($from === '' || ($joiningBranch !== '' && $from === $joiningBranch && $lastPosting !== '' && $from !== $lastPosting)) {
                $row['from_branch_id'] = $lastPosting;
            }
        }
        unset($row);

        return $rows;
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
        if (is_array($collateral)) {
            $rawLevels = $collateral['certificate_levels'] ?? [];
            if (is_string($rawLevels)) {
                $decoded = json_decode($rawLevels, true);
                $rawLevels = is_array($decoded) ? $decoded : ($rawLevels !== '' ? explode(',', $rawLevels) : []);
            }
            if (! is_array($rawLevels)) {
                $rawLevels = [];
            }
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
            foreach ($rawLevels as $level) {
                $key = trim((string) $level);
                if ($key === '') {
                    continue;
                }
                $normalizedLevels[] = $levelMap[$key] ?? strtolower($key);
            }
            $collateral['certificate_levels'] = array_values(array_unique($normalizedLevels));
            $request->merge(['collateral' => $collateral]);
        }

        $jobHistories = $request->input('job_histories');
        if (is_array($jobHistories)) {
            $request->merge([
                'job_histories' => array_values(array_filter($jobHistories, function ($row) {
                    return is_array($row) && $this->employeeJobHistoryRowHasContent($row);
                })),
            ]);
        }

        $disciplinaryActions = $request->input('disciplinary_actions');
        if (is_array($disciplinaryActions)) {
            $request->merge([
                'disciplinary_actions' => array_values(array_filter($disciplinaryActions, function ($row) {
                    if (! is_array($row)) {
                        return false;
                    }

                    return trim((string) ($row['action_date'] ?? '')) !== '';
                })),
            ]);
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


    protected function syncZoneRegionalManagerAssignment(Employee $employee): void
    {
        try {
            $designationName = trim((string) optional($employee->designation)->name);
            if ($designationName === '') {
                return;
            }

            $lineRole = BranchOrganogram::lineManagerRoleName($designationName);
            $isZonalManager = $lineRole === 'Zonal Manager';
            $isRegionalManager = $lineRole === 'Regional Manager';

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
     * Map designation + HO department-head assignment to optional app role names.
     *
     * @return list<string>
     */
    private function additionalRoleNamesForEmployee(Employee $employee): array
    {
        return app(OrganogramLineRoleSyncService::class)->additionalRoleNamesForEmployee($employee);
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
    protected function syncUserAccountForEmployee(Employee $employee): void
    {
        $employee->loadMissing(['designation']);

        $employeeRole = Role::query()->where('name', self::AUTO_USER_EMPLOYEE_ROLE_NAME)->first();
        if (! $employeeRole) {
            Log::warning('Auto user skipped: Employee role missing', ['employee_id' => $employee->id]);

            return;
        }

        $extraNames = $this->additionalRoleNamesForEmployee($employee);
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
        $projects = Project::query()->orderBy('name')->get(['id', 'name', 'code']);

        $statsBaseQuery = Employee::query();
        OrganogramAccessService::constrainVisibleEmployees($statsBaseQuery, $user);
        $this->applyEmployeeDirectoryFilters($statsBaseQuery, $request);

        $mfProjectIds = Project::query()
            ->where(function ($q) {
                $q->whereRaw("LOWER(name) LIKE '%microfinance%'")
                    ->orWhereRaw("LOWER(name) LIKE '%micro-finance%'")
                    ->orWhereRaw("LOWER(name) LIKE '%micro finance%'")
                    ->orWhereRaw("LOWER(name) LIKE '%core%'")
                    ->orWhereRaw("LOWER(code) = 'mf'")
                    ->orWhereRaw("LOWER(code) = 'core'");
            })
            ->pluck('id')
            ->all();

        $mfCondition = empty($mfProjectIds)
            ? 'employees.project_id IS NULL'
            : 'employees.project_id IS NULL OR employees.project_id IN ('.implode(',', array_map('intval', $mfProjectIds)).')';

        $projectCondition = empty($mfProjectIds)
            ? 'employees.project_id IS NOT NULL'
            : 'employees.project_id IS NOT NULL AND employees.project_id NOT IN ('.implode(',', array_map('intval', $mfProjectIds)).')';

        $statusCounts = (clone $statsBaseQuery)->reorder()->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN employees.status = 'active' THEN 1 ELSE 0 END) as active_count,
            SUM(CASE WHEN employees.status = 'on_leave' THEN 1 ELSE 0 END) as on_leave_count,
            SUM(CASE WHEN employees.status NOT IN ('active', 'on_leave') THEN 1 ELSE 0 END) as inactive_count,
            SUM(CASE WHEN {$mfCondition} THEN 1 ELSE 0 END) as core_count,
            SUM(CASE WHEN {$projectCondition} THEN 1 ELSE 0 END) as project_count,
            SUM(CASE WHEN employees.status = 'active' AND ({$mfCondition}) THEN 1 ELSE 0 END) as active_core_count,
            SUM(CASE WHEN employees.status = 'active' AND ({$projectCondition}) THEN 1 ELSE 0 END) as active_project_count
        ")->first();

        $stats = [
            'total' => (int) ($statusCounts->total ?? 0),
            'active' => (int) ($statusCounts->active_count ?? 0),
            'on_leave' => (int) ($statusCounts->on_leave_count ?? 0),
            'inactive' => (int) ($statusCounts->inactive_count ?? 0),
            'core' => (int) ($statusCounts->core_count ?? 0),
            'project' => (int) ($statusCounts->project_count ?? 0),
            'active_core' => (int) ($statusCounts->active_core_count ?? 0),
            'active_project' => (int) ($statusCounts->active_project_count ?? 0),
        ];

        return Inertia::render('employee/index', [
            'employees' => $employees,
            'stats' => $stats,
            'departments' => $departments,
            'branches' => $branches,
            'employee_types' => $employeeTypes,
            'designations' => $designations,
            'projects' => $projects,
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
                    'project_ids' => $this->resolveFilterValues($request, 'project_ids', 'project_id'),
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
        $this->applyNullableIdFilter($query, $request, 'employees.project_id', 'project_ids', 'project_id');

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
            'guarantor_relation' => $relatedValues($guarantors, 'relation'),
            'guarantor_mobile' => $relatedValues($guarantors, 'phone'),
            'guarantor_address' => $relatedValues($guarantors, 'address'),
            'guarantor_cheque_bank' => $relatedValues($guarantorCheques, 'bank_name'),
            'guarantor_cheque_number' => $relatedValues($guarantorCheques, 'cheque_no'),
            'guarantor_cheque_qty' => $relatedValues($guarantorCheques, 'qty'),
            'collateral_has_certificate' => $collateral?->has_certificate ? 'Yes' : 'No',
            'collateral_certificate_levels' => $certificateLevels,
            'collateral_security_amount' => (string) ($collateral->security_amount ?? ''),
            'collateral_interest' => (string) ($collateral->collateral_interest ?? ''),
            'collateral_date' => $fmtDate($collateral->collateral_date ?? null),
            'collateral_notes' => (string) ($collateral->notes ?? ''),
            'collateral_cheque_bank' => $relatedValues($collateralCheques, 'bank_name'),
            'collateral_cheque_number' => $relatedValues($collateralCheques, 'cheque_no'),
            'collateral_cheque_qty' => $relatedValues($collateralCheques, 'qty'),
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
        $educationDegrees = $this->readJsonArrayFile(base_path('data/educationdegrees.json'));
        $educationGroups = $this->readJsonArrayFile(base_path('data/educationgroups.json'));
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
            'educationDegrees' => $educationDegrees,
            'educationGroups' => $educationGroups,
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
                'guarantor_cheques.*.qty' => 'nullable|integer|min:0',

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
                'collateral_receive_cheques.*.qty' => 'nullable|integer|min:0',
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
                        'qty' => $c['qty'] ?? null,
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
                        'qty' => $rc['qty'] ?? null,
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
        $educationDegrees = $this->readJsonArrayFile(base_path('data/educationdegrees.json'));
        $educationGroups = $this->readJsonArrayFile(base_path('data/educationgroups.json'));
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

        $existingManualHistories = EmployeeJobHistory::query()
            ->where('employee_id', $employee->id)
            ->orderBy('event_date', 'asc')
            ->get();

        $jobHistoryRows = [];
        $existingTypes = [];

        foreach ($existingManualHistories as $h) {
            $jobHistoryRows[] = [
                'id' => $h->id,
                'event_type' => $h->event_type,
                'event_date' => $h->event_date?->format('Y-m-d') ?? '',
                'from_designation_id' => $h->from_designation_id ? (string) $h->from_designation_id : '',
                'to_designation_id' => $h->to_designation_id ? (string) $h->to_designation_id : '',
                'from_branch_id' => $h->from_branch_id ? (string) $h->from_branch_id : '',
                'to_branch_id' => $h->to_branch_id ? (string) $h->to_branch_id : '',
                'remarks' => $h->remarks ?? '',
                'cause_of_separation' => $h->cause_of_separation ?? '',
                'amount_received' => $h->amount_received !== null ? (string) $h->amount_received : '',
            ];
            $existingTypes[$h->event_type] = true;
        }

        if (! isset($existingTypes['joining']) && $employee->joining_date) {
            $jobHistoryRows[] = [
                'event_type' => 'joining',
                'event_date' => $employee->joining_date->format('Y-m-d'),
                'from_designation_id' => '',
                'to_designation_id' => $employee->joining_designation_id ? (string) $employee->joining_designation_id : ($employee->designation_id ? (string) $employee->designation_id : ''),
                'from_branch_id' => '',
                'to_branch_id' => '',
                'remarks' => 'Initial Joining',
            ];
        }

        if (! isset($existingTypes['confirmation']) && $employee->confirmation_date) {
            $jobHistoryRows[] = [
                'event_type' => 'confirmation',
                'event_date' => $employee->confirmation_date->format('Y-m-d'),
                'from_designation_id' => '',
                'to_designation_id' => $employee->designation_id ? (string) $employee->designation_id : '',
                'from_branch_id' => '',
                'to_branch_id' => '',
                'remarks' => 'Service Confirmation',
            ];
        }

        $sysTransfers = TransferHistory::where('employee_id', $employee->id)->orderBy('transfer_date', 'asc')->get();
        foreach ($sysTransfers as $th) {
            $tDate = $th->transfer_date?->format('Y-m-d');
            $alreadyAdded = false;
            foreach ($jobHistoryRows as $row) {
                if ($row['event_type'] === 'transfer' && $row['event_date'] === $tDate && (string) $row['to_branch_id'] === (string) $th->to_branch_id) {
                    $alreadyAdded = true;
                    break;
                }
            }
            if (! $alreadyAdded && $tDate) {
                $jobHistoryRows[] = [
                    'event_type' => 'transfer',
                    'event_date' => $tDate,
                    'from_designation_id' => '',
                    'to_designation_id' => '',
                    'from_branch_id' => $th->from_branch_id ? (string) $th->from_branch_id : '',
                    'to_branch_id' => $th->to_branch_id ? (string) $th->to_branch_id : '',
                    'remarks' => 'System Transfer',
                ];
            }
        }

        $sysPromotions = PromotionHistory::where('employee_id', $employee->id)->orderBy('promotion_date', 'asc')->get();
        foreach ($sysPromotions as $ph) {
            $pDate = $ph->promotion_date?->format('Y-m-d');
            $alreadyAdded = false;
            foreach ($jobHistoryRows as $row) {
                if ($row['event_type'] === 'promotion' && $row['event_date'] === $pDate && (string) $row['to_designation_id'] === (string) $ph->to_designation_id) {
                    $alreadyAdded = true;
                    break;
                }
            }
            if (! $alreadyAdded && $pDate) {
                $jobHistoryRows[] = [
                    'event_type' => 'promotion',
                    'event_date' => $pDate,
                    'from_designation_id' => $ph->from_designation_id ? (string) $ph->from_designation_id : '',
                    'to_designation_id' => $ph->to_designation_id ? (string) $ph->to_designation_id : '',
                    'from_branch_id' => '',
                    'to_branch_id' => '',
                    'remarks' => 'System Promotion',
                ];
            }
        }

        $sysDemotions = DemotionHistory::where('employee_id', $employee->id)->orderBy('demotion_date', 'asc')->get();
        foreach ($sysDemotions as $dh) {
            $dDate = $dh->demotion_date?->format('Y-m-d');
            $alreadyAdded = false;
            foreach ($jobHistoryRows as $row) {
                if ($row['event_type'] === 'demotion' && $row['event_date'] === $dDate && (string) $row['to_designation_id'] === (string) $dh->to_designation_id) {
                    $alreadyAdded = true;
                    break;
                }
            }
            if (! $alreadyAdded && $dDate) {
                $jobHistoryRows[] = [
                    'event_type' => 'demotion',
                    'event_date' => $dDate,
                    'from_designation_id' => $dh->from_designation_id ? (string) $dh->from_designation_id : '',
                    'to_designation_id' => $dh->to_designation_id ? (string) $dh->to_designation_id : '',
                    'from_branch_id' => '',
                    'to_branch_id' => '',
                    'remarks' => 'System Demotion',
                ];
            }
        }

        if (! isset($existingTypes['left']) && ($employee->resignation_date || $employee->dropout_date || $employee->dropout_reason || $employee->cause_of_separation)) {
            $leftDate = ($employee->resignation_date ?? $employee->dropout_date)?->format('Y-m-d') ?? '';
            $jobHistoryRows[] = [
                'event_type' => 'left',
                'event_date' => $leftDate,
                'from_designation_id' => '',
                'to_designation_id' => '',
                'from_branch_id' => '',
                'to_branch_id' => '',
                'remarks' => $employee->dropout_reason ?? '',
                'cause_of_separation' => $employee->cause_of_separation ?? '',
            ];
        }

        if (! isset($existingTypes['final_payment']) && ($employee->final_payment_date || $employee->final_payment_amount !== null)) {
            $jobHistoryRows[] = [
                'event_type' => 'final_payment',
                'event_date' => $employee->final_payment_date?->format('Y-m-d') ?? '',
                'from_designation_id' => '',
                'to_designation_id' => '',
                'from_branch_id' => '',
                'to_branch_id' => '',
                'remarks' => 'Final Payment Settled',
                'amount_received' => $employee->final_payment_amount !== null ? (string) $employee->final_payment_amount : '',
            ];
        }

        $jobHistoryRows = $this->normalizeJobHistoryBranchFields($jobHistoryRows, $employee);

        usort($jobHistoryRows, fn ($a, $b) => strcmp((string) ($a['event_date'] ?? ''), (string) ($b['event_date'] ?? '')));
        $employeePayload['job_histories'] = $jobHistoryRows;

        $employeePayload['disciplinary_actions'] = EmployeeDisciplinaryAction::query()
            ->where('employee_id', $employee->id)
            ->orderBy('action_date', 'asc')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'action_type' => $d->action_type,
                'action_date' => $d->action_date?->format('Y-m-d') ?? '',
                'details' => $d->details ?? '',
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
            'educationDegrees' => $educationDegrees,
            'educationGroups' => $educationGroups,
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
                'guarantor_cheques.*.qty' => 'nullable|integer|min:0',

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
                'collateral_receive_cheques.*.qty' => 'nullable|integer|min:0',
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

                'job_histories' => 'nullable|array',
                'job_histories.*.event_type' => 'required|string|max:50',
                'job_histories.*.event_date' => 'nullable|date',
                'job_histories.*.from_designation_id' => 'nullable|exists:designations,id',
                'job_histories.*.to_designation_id' => 'nullable|exists:designations,id',
                'job_histories.*.from_branch_id' => 'nullable|exists:branches,id',
                'job_histories.*.to_branch_id' => 'nullable|exists:branches,id',
                'job_histories.*.remarks' => 'nullable|string',
                'job_histories.*.cause_of_separation' => 'nullable|string|max:200',
                'job_histories.*.amount_received' => 'nullable|numeric|min:0',

                'disciplinary_actions' => 'nullable|array',
                'disciplinary_actions.*.action_type' => 'required|string|max:100',
                'disciplinary_actions.*.action_date' => 'required|date',
                'disciplinary_actions.*.details' => 'nullable|string',

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
                'job_histories',
                'disciplinary_actions',
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

                $now = now();

                $addresses = is_array($validated['addresses'] ?? null) ? $validated['addresses'] : [];
                $addressRows = [];
                foreach ($addresses as $a) {
                    $addressRows[] = [
                        'employee_id' => $eid,
                        'type' => $a['type'],
                        'division' => $a['division'] ?? null,
                        'district' => $a['district'] ?? null,
                        'upazila' => $a['upazila'] ?? null,
                        'union' => $a['union'] ?? null,
                        'village' => $a['village'] ?? null,
                        'address_details' => $a['address_details'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($addressRows)) {
                    DB::table('employee_addresses')->insert($addressRows);
                }

                $educations = is_array($validated['educations'] ?? null) ? $validated['educations'] : [];
                $eduRows = [];
                foreach ($educations as $e) {
                    $eduRows[] = [
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
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($eduRows)) {
                    DB::table('employee_educations')->insert($eduRows);
                }

                $bank = is_array($validated['bank'] ?? null) ? $validated['bank'] : null;
                if ($bank) {
                    DB::table('employee_bank_accounts')->insert(
                        $this->employeeBankInsertRow($eid, $bank)
                    );
                }

                $nominees = is_array($validated['nominees'] ?? null) ? $validated['nominees'] : [];
                $nomineeRows = [];
                foreach ($nominees as $n) {
                    $nomineeRows[] = $this->employeeNomineeInsertRow($eid, $n);
                }
                if (! empty($nomineeRows)) {
                    DB::table('employee_nominees')->insert($nomineeRows);
                }

                $guarantors = is_array($validated['guarantors'] ?? null) ? $validated['guarantors'] : [];
                $guarantorRows = [];
                foreach ($guarantors as $g) {
                    $guarantorRows[] = $this->employeeGuarantorInsertRow($eid, $g);
                }
                if (! empty($guarantorRows)) {
                    DB::table('employee_guarantors')->insert($guarantorRows);
                }

                $guarantorCheques = is_array($validated['guarantor_cheques'] ?? null) ? $validated['guarantor_cheques'] : [];
                $gChequeRows = [];
                foreach ($guarantorCheques as $c) {
                    $gChequeRows[] = [
                        'employee_id' => $eid,
                        'employee_guarantor_id' => null,
                        'bank_name' => $c['bank_name'] ?? null,
                        'branch_name' => $c['branch_name'] ?? null,
                        'cheque_no' => $c['cheque_no'] ?? null,
                        'qty' => $c['qty'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($gChequeRows)) {
                    DB::table('employee_guarantor_cheques')->insert($gChequeRows);
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
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                $receiveCheques = is_array($validated['collateral_receive_cheques'] ?? null) ? $validated['collateral_receive_cheques'] : [];
                $rcRows = [];
                foreach ($receiveCheques as $rc) {
                    $rcRows[] = [
                        'employee_id' => $eid,
                        'employee_collateral_id' => $collateralId,
                        'bank_name' => $rc['bank_name'] ?? null,
                        'branch_name' => $rc['branch_name'] ?? null,
                        'cheque_no' => $rc['cheque_no'] ?? null,
                        'qty' => $rc['qty'] ?? null,
                        'notes' => $rc['notes'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($rcRows)) {
                    DB::table('employee_collateral_receive_cheques')->insert($rcRows);
                }

                $assets = is_array($validated['assets'] ?? null) ? $validated['assets'] : [];
                $assetRows = [];
                foreach ($assets as $as) {
                    $assetRows[] = [
                        'employee_id' => $eid,
                        'serial' => $as['serial'] ?? null,
                        'asset_no' => $as['asset_no'] ?? null,
                        'name' => (string) ($as['name'] ?? ''),
                        'details' => $as['details'] ?? null,
                        'provided_quality' => $as['provided_quality'] ?? null,
                        'asset_price' => $as['asset_price'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($assetRows)) {
                    DB::table('employee_assets')->insert($assetRows);
                }

                $experiences = is_array($validated['experiences'] ?? null) ? $validated['experiences'] : [];
                $expRows = [];
                foreach ($experiences as $ex) {
                    $expRows[] = [
                        'employee_id' => $eid,
                        'organization' => (string) ($ex['organization'] ?? ''),
                        'from_date' => $ex['from_date'] ?? null,
                        'to_date' => $ex['to_date'] ?? null,
                        'designation' => $ex['designation'] ?? null,
                        'department' => $ex['department'] ?? null,
                        'address' => $ex['address'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($expRows)) {
                    DB::table('employee_experiences')->insert($expRows);
                }

                $trainings = is_array($validated['trainings'] ?? null) ? $validated['trainings'] : [];
                $trRows = [];
                foreach ($trainings as $tr) {
                    $trRows[] = [
                        'employee_id' => $eid,
                        'training_title' => (string) ($tr['training_title'] ?? ''),
                        'institute' => $tr['institute'] ?? null,
                        'address' => $tr['address'] ?? null,
                        'duration' => $tr['duration'] ?? null,
                        'remarks' => $tr['remarks'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($trRows)) {
                    DB::table('employee_trainings')->insert($trRows);
                }

                $this->syncEmployeeDocumentsFromTabbedForm($request, $employee, false);

                // Sync Job Histories & update core employee dates in sync
                EmployeeJobHistory::where('employee_id', $eid)->delete();
                $jobHistories = is_array($validated['job_histories'] ?? null) ? $validated['job_histories'] : [];
                $jhRows = [];
                $coreUpdates = [];
                $presentJobHistoryTypes = [];
                $authId = \Illuminate\Support\Facades\Auth::id();
                $now = now();

                foreach ($jobHistories as $jh) {
                    if (! is_array($jh) || empty($jh['event_type']) || ! $this->employeeJobHistoryRowHasContent($jh)) {
                        continue;
                    }
                    $type = $jh['event_type'];
                    $date = trim((string) ($jh['event_date'] ?? ''));
                    $date = $date !== '' ? $date : null;

                    // Confirmation is date-driven. A leftover designation/remarks row
                    // without a date must not keep employees.confirmation_date.
                    if ($type === 'confirmation' && $date === null) {
                        continue;
                    }

                    $presentJobHistoryTypes[$type] = true;

                    if ($type === 'joining') {
                        if ($date) {
                            $coreUpdates['joining_date'] = $date;
                        }
                        if (! empty($jh['to_designation_id'])) {
                            $coreUpdates['joining_designation_id'] = $jh['to_designation_id'];
                        }
                        if (! empty($jh['to_branch_id'])) {
                            $coreUpdates['current_branch_id'] = $jh['to_branch_id'];
                        }
                    } elseif ($type === 'confirmation') {
                        if ($date) {
                            $coreUpdates['confirmation_date'] = $date;
                        }
                    } elseif ($type === 'left') {
                        if ($date) {
                            $coreUpdates['dropout_date'] = $date;
                            $coreUpdates['resignation_date'] = $date;
                        }
                        $reason = trim((string) ($jh['remarks'] ?? ''));
                        $coreUpdates['dropout_reason'] = $reason !== '' ? $reason : null;
                        $cause = trim((string) ($jh['cause_of_separation'] ?? ''));
                        $coreUpdates['cause_of_separation'] = $cause !== '' ? $cause : null;
                    } elseif ($type === 'final_payment') {
                        if ($date) {
                            $coreUpdates['final_payment_date'] = $date;
                        }
                        $amount = $jh['amount_received'] ?? null;
                        $coreUpdates['final_payment_amount'] = $amount === '' || $amount === null ? null : $amount;
                    }

                    if ($date === null) {
                        continue;
                    }

                    $jhRows[] = [
                        'employee_id' => $eid,
                        'event_type' => $type,
                        'event_date' => $date,
                        'from_designation_id' => ! empty($jh['from_designation_id']) ? $jh['from_designation_id'] : null,
                        'to_designation_id' => ! empty($jh['to_designation_id']) ? $jh['to_designation_id'] : null,
                        'from_branch_id' => ! empty($jh['from_branch_id']) ? $jh['from_branch_id'] : null,
                        'to_branch_id' => ! empty($jh['to_branch_id']) ? $jh['to_branch_id'] : null,
                        'remarks' => $type === 'left'
                            ? (trim((string) ($jh['remarks'] ?? '')) !== '' ? trim((string) $jh['remarks']) : null)
                            : ($jh['remarks'] ?? null),
                        'cause_of_separation' => $type === 'left'
                            ? (trim((string) ($jh['cause_of_separation'] ?? '')) !== '' ? trim((string) $jh['cause_of_separation']) : null)
                            : null,
                        'amount_received' => $type === 'final_payment' && ($jh['amount_received'] ?? '') !== '' && $jh['amount_received'] !== null
                            ? $jh['amount_received']
                            : null,
                        'is_manual' => true,
                        'created_by' => $authId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                $datedHistories = array_values(array_filter(
                    is_array($jobHistories) ? $jobHistories : [],
                    fn ($jh) => is_array($jh)
                        && $this->employeeJobHistoryRowHasContent($jh)
                        && trim((string) ($jh['event_date'] ?? '')) !== ''
                ));
                usort($datedHistories, fn ($a, $b) => strcmp((string) ($a['event_date'] ?? ''), (string) ($b['event_date'] ?? '')));
                foreach ($datedHistories as $jh) {
                    $type = (string) ($jh['event_type'] ?? '');
                    if ($type === 'left' || $type === 'final_payment') {
                        continue;
                    }
                    if ($type === 'joining' && ! empty($jh['to_branch_id'])) {
                        $coreUpdates['current_branch_id'] = $jh['to_branch_id'];
                    }
                    if ($type === 'transfer' && ! empty($jh['to_branch_id'])) {
                        if (! empty($coreUpdates['current_branch_id'])) {
                            $coreUpdates['last_branch_id'] = $coreUpdates['current_branch_id'];
                        } elseif (! empty($jh['from_branch_id'])) {
                            $coreUpdates['last_branch_id'] = $jh['from_branch_id'];
                        }
                        $coreUpdates['current_branch_id'] = $jh['to_branch_id'];
                    }
                    if (in_array($type, ['joining', 'confirmation', 'promotion', 'demotion'], true) && ! empty($jh['to_designation_id'])) {
                        $coreUpdates['last_designation_id'] = $jh['to_designation_id'];
                        $coreUpdates['designation_id'] = $jh['to_designation_id'];
                    }
                }

                if (! isset($presentJobHistoryTypes['confirmation'])) {
                    $coreUpdates['confirmation_date'] = null;
                }

                if (! isset($presentJobHistoryTypes['left'])) {
                    $coreUpdates['dropout_date'] = null;
                    $coreUpdates['resignation_date'] = null;
                    $coreUpdates['dropout_reason'] = null;
                    $coreUpdates['cause_of_separation'] = null;
                }

                if (! isset($presentJobHistoryTypes['final_payment'])) {
                    $coreUpdates['final_payment_date'] = null;
                    $coreUpdates['final_payment_amount'] = null;
                }

                if (! empty($coreUpdates)) {
                    $employee->update($coreUpdates);
                }

                if (! empty($jhRows)) {
                    EmployeeJobHistory::insert($jhRows);
                }

                // Sync Disciplinary Actions
                EmployeeDisciplinaryAction::where('employee_id', $eid)->delete();
                $disciplinaryActions = is_array($validated['disciplinary_actions'] ?? null) ? $validated['disciplinary_actions'] : [];
                $daRows = [];
                foreach ($disciplinaryActions as $da) {
                    if (! empty($da['action_type']) && ! empty($da['action_date'])) {
                        $daRows[] = [
                            'employee_id' => $eid,
                            'action_type' => $da['action_type'],
                            'action_date' => $da['action_date'],
                            'details' => $da['details'] ?? null,
                            'created_by' => $authId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                }
                if (! empty($daRows)) {
                    EmployeeDisciplinaryAction::insert($daRows);
                }

                $employee->refresh();
                if ($request->boolean('sync_salary_components')) {
                    $this->syncEmployeeSalaryComponents($employee, $validated);
                }
            });

            return redirect()
                ->route('employees.show', $employee)
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

        $manualJobHistories = EmployeeJobHistory::query()
            ->with(['fromDesignation:id,name', 'toDesignation:id,name', 'fromBranch:id,name', 'toBranch:id,name'])
            ->where('employee_id', $employee->id)
            ->get();

        $disciplinaryActions = EmployeeDisciplinaryAction::query()
            ->where('employee_id', $employee->id)
            ->orderBy('action_date', 'asc')
            ->get();

        // Build unified chronological Job History timeline without duplicates
        $jobHistoryTimeline = [];
        $manualTypes = [];

        foreach ($manualJobHistories as $mh) {
            $mDate = $mh->event_date?->format('Y-m-d');
            $jobHistoryTimeline[] = [
                'id' => 'manual-'.$mh->id,
                'event_type' => $mh->event_type,
                'event_date' => $mDate,
                'from_designation_name' => $mh->fromDesignation?->name,
                'to_designation_name' => $mh->toDesignation?->name,
                'from_branch_name' => $mh->fromBranch?->name,
                'to_branch_name' => $mh->toBranch?->name,
                'remarks' => $mh->remarks,
                'cause_of_separation' => $mh->cause_of_separation,
                'amount_received' => $mh->amount_received,
                'is_manual' => true,
            ];
            $manualTypes[$mh->event_type] = true;
        }

        if (! isset($manualTypes['joining']) && $employee->joining_date) {
            $jobHistoryTimeline[] = [
                'id' => 'auto-joining',
                'event_type' => 'joining',
                'event_date' => $employee->joining_date->format('Y-m-d'),
                'to_designation_name' => $employee->joiningDesignation?->name ?? $employee->designation?->name,
                'to_branch_name' => $employee->branch?->name,
                'remarks' => 'Initial Joining',
                'is_manual' => false,
            ];
        }

        if (! isset($manualTypes['confirmation']) && $employee->confirmation_date) {
            $jobHistoryTimeline[] = [
                'id' => 'auto-confirmation',
                'event_type' => 'confirmation',
                'event_date' => $employee->confirmation_date->format('Y-m-d'),
                'to_designation_name' => $employee->designation?->name,
                'remarks' => 'Confirmed Service',
                'is_manual' => false,
            ];
        }

        if (! isset($manualTypes['left']) && ($employee->resignation_date || $employee->dropout_date || $employee->dropout_reason || $employee->cause_of_separation)) {
            $jobHistoryTimeline[] = [
                'id' => 'auto-left',
                'event_type' => 'left',
                'event_date' => ($employee->resignation_date ?? $employee->dropout_date)?->format('Y-m-d'),
                'from_branch_name' => $employee->branch?->name,
                'remarks' => $employee->dropout_reason,
                'cause_of_separation' => $employee->cause_of_separation,
                'is_manual' => false,
            ];
        }

        if (! isset($manualTypes['final_payment']) && ($employee->final_payment_date || $employee->final_payment_amount !== null)) {
            $jobHistoryTimeline[] = [
                'id' => 'auto-final_payment',
                'event_type' => 'final_payment',
                'event_date' => $employee->final_payment_date?->format('Y-m-d'),
                'remarks' => 'Final Payment Settled',
                'amount_received' => $employee->final_payment_amount,
                'is_manual' => false,
            ];
        }

        foreach ($transferHistories as $th) {
            $tDate = $th->transfer_date?->format('Y-m-d');
            $alreadyAdded = false;
            foreach ($jobHistoryTimeline as $item) {
                if ($item['event_type'] === 'transfer' && $item['event_date'] === $tDate) {
                    $alreadyAdded = true;
                    break;
                }
            }
            if (! $alreadyAdded && $tDate) {
                $jobHistoryTimeline[] = [
                    'id' => 'sys-transfer-'.$th->id,
                    'event_type' => 'transfer',
                    'event_date' => $tDate,
                    'from_branch_name' => $th->fromBranch?->name,
                    'to_branch_name' => $th->toBranch?->name,
                    'order_no' => $th->transfer?->transfer_order_no,
                    'transfer_id' => $th->transfer_id,
                    'is_manual' => false,
                ];
            }
        }

        foreach ($promotionHistories as $ph) {
            $pDate = $ph->promotion_date?->format('Y-m-d');
            $alreadyAdded = false;
            foreach ($jobHistoryTimeline as $item) {
                if ($item['event_type'] === 'promotion' && $item['event_date'] === $pDate) {
                    $alreadyAdded = true;
                    break;
                }
            }
            if (! $alreadyAdded && $pDate) {
                $jobHistoryTimeline[] = [
                    'id' => 'sys-promotion-'.$ph->id,
                    'event_type' => 'promotion',
                    'event_date' => $pDate,
                    'from_designation_name' => $ph->fromDesignation?->name,
                    'to_designation_name' => $ph->toDesignation?->name,
                    'order_no' => $ph->promotion?->promotion_order_no,
                    'promotion_id' => $ph->promotion_id,
                    'is_manual' => false,
                ];
            }
        }

        foreach ($demotionHistories as $dh) {
            $dDate = $dh->demotion_date?->format('Y-m-d');
            $alreadyAdded = false;
            foreach ($jobHistoryTimeline as $item) {
                if ($item['event_type'] === 'demotion' && $item['event_date'] === $dDate) {
                    $alreadyAdded = true;
                    break;
                }
            }
            if (! $alreadyAdded && $dDate) {
                $jobHistoryTimeline[] = [
                    'id' => 'sys-demotion-'.$dh->id,
                    'event_type' => 'demotion',
                    'event_date' => $dDate,
                    'from_designation_name' => $dh->fromDesignation?->name,
                    'to_designation_name' => $dh->toDesignation?->name,
                    'order_no' => $dh->demotion?->demotion_order_no,
                    'demotion_id' => $dh->demotion_id,
                    'is_manual' => false,
                ];
            }
        }

        usort($jobHistoryTimeline, fn ($a, $b) => strcmp((string) ($a['event_date'] ?? ''), (string) ($b['event_date'] ?? '')));

        $today = date('Y-m-d');
        $pastTimeline = [];
        $upcomingEvents = [];

        foreach ($jobHistoryTimeline as $item) {
            if (! empty($item['event_date']) && $item['event_date'] > $today) {
                $upcomingEvents[] = $item;
            } else {
                $pastTimeline[] = $item;
            }
        }

        return Inertia::render('employee/show', [
            'employee' => $employee->toInertiaArray(),
            'currentYearLeaveBalances' => $currentYearLeaveBalances,
            'recentLeaveApplications' => $recentLeaveApplications,
            'recentMovements' => $recentMovements,
            'transferHistories' => $transferHistories,
            'promotionHistories' => $promotionHistories,
            'demotionHistories' => $demotionHistories,
            'jobHistoryTimeline' => $pastTimeline,
            'upcomingEvents' => $upcomingEvents,
            'disciplinaryActions' => $disciplinaryActions,
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

}
