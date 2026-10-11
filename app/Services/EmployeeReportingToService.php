<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\Zone;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class EmployeeReportingToService
{
    protected ?Employee $cachedExecutiveDirector = null;

    protected ?Employee $cachedMicrofinanceDirector = null;

    /** @var array<int, ?Employee> */
    protected array $cachedBranchManagers = [];

    /**
     * Resolve the appropriate supervisor / reporting manager for an employee.
     */
    public function resolveReportingManager(Employee $employee): ?Employee
    {
        $employee->loadMissing(['designation', 'department', 'branch.regionalOffice.zone']);
        $desigName = mb_strtolower(trim((string) ($employee->designation?->name ?? '')));

        // 1. Executive Director reports to no one
        if (str_contains($desigName, 'executive director') && ! str_contains($desigName, 'deputy')) {
            return null;
        }

        $branch = $employee->currentBranch ?: $employee->branch;
        $isHeadOffice = $branch ? (bool) $branch->is_head_office : true;

        // 2. Head Office
        if ($isHeadOffice) {
            return $this->resolveHeadOfficeReportingManager($employee, $desigName);
        }

        // 3. Field / Branch
        return $this->resolveBranchEmployeeReportingManager($employee, $branch, $desigName);
    }

    /**
     * Head Office reporting rules:
     * - Department Head / Director / Advisor / Deputy ED -> Reports to Executive Director
     * - Regular HO Employee -> Reports to their Department Head (or ED if none)
     */
    protected function resolveHeadOfficeReportingManager(Employee $employee, string $desigName): ?Employee
    {
        $ed = $this->getExecutiveDirector();

        $isDeptHead = false;
        if ($employee->department_id) {
            $dept = Department::find($employee->department_id);
            if ($dept && (int) $dept->head_employee_id === (int) $employee->id) {
                $isDeptHead = true;
            }
        }

        if (
            str_contains($desigName, 'director')
            || str_contains($desigName, 'advisor')
            || str_contains($desigName, 'deputy executive director')
            || str_contains($desigName, 'department head')
        ) {
            $isDeptHead = true;
        }

        if ($isDeptHead) {
            if ($ed && (int) $ed->id !== (int) $employee->id) {
                return $ed;
            }

            return null;
        }

        // Regular Head Office employee reports to their Department Head
        $dept = $employee->department;
        $deptHead = $dept?->headEmployee;
        if ($deptHead && (int) $deptHead->id !== (int) $employee->id) {
            return $deptHead;
        }

        // Fallback to Executive Director
        if ($ed && (int) $ed->id !== (int) $employee->id) {
            return $ed;
        }

        return null;
    }

    /**
     * Branch / Field reporting rules:
     * - Zonal Manager -> Reports to Director (Microfinance) or ED
     * - Regional Manager -> Reports to Zonal Manager
     * - Branch Manager -> Reports to Regional Manager
     * - Branch Staff -> Reports to Branch Manager
     */
    protected function resolveBranchEmployeeReportingManager(Employee $employee, ?Branch $branch, string $desigName): ?Employee
    {
        $ed = $this->getExecutiveDirector();
        $mfDirector = $this->getMicrofinanceDirector() ?: $ed;

        // A. Zonal Manager
        $isZm = Zone::query()->where('zone_manager_employee_id', $employee->id)->exists()
            || str_contains($desigName, 'zonal manager')
            || str_contains($desigName, 'zone manager');

        if ($isZm) {
            if ($mfDirector && (int) $mfDirector->id !== (int) $employee->id) {
                return $mfDirector;
            }

            return $ed && (int) $ed->id !== (int) $employee->id ? $ed : null;
        }

        // B. Regional Manager
        $isRm = RegionalOffice::query()->where('regional_manager_employee_id', $employee->id)->exists()
            || (str_contains($desigName, 'regional manager') && ! str_contains($desigName, 'assistant'));

        if ($isRm) {
            $ro = RegionalOffice::query()->where('regional_manager_employee_id', $employee->id)->first()
                ?? $branch?->regionalOffice;
            $zm = $ro?->zone?->zoneManager;
            if ($zm && (int) $zm->id !== (int) $employee->id) {
                return $zm;
            }

            return $mfDirector && (int) $mfDirector->id !== (int) $employee->id ? $mfDirector : $ed;
        }

        // C. Branch Manager / Head
        $isBm = false;
        if ($branch) {
            if ((int) $branch->head_employee_id === (int) $employee->id) {
                $isBm = true;
            } elseif ($branch->branch_head_designation_id && (int) $branch->branch_head_designation_id === (int) $employee->designation_id) {
                $isBm = true;
            } elseif (preg_match('/\b(branch manager|acting branch manager|junior branch manager|trainee branch manager|sbm)\b/i', $desigName)) {
                $isBm = true;
            }
        }

        if ($isBm) {
            $ro = $branch?->regionalOffice;
            $rm = $ro?->regionalManager;
            if ($rm && (int) $rm->id !== (int) $employee->id) {
                return $rm;
            }

            // Fallback to ZM
            $zm = $ro?->zone?->zoneManager;
            if ($zm && (int) $zm->id !== (int) $employee->id) {
                return $zm;
            }

            return $mfDirector && (int) $mfDirector->id !== (int) $employee->id ? $mfDirector : $ed;
        }

        // D. Regular Branch Staff -> Reports to Branch Manager of their branch
        if ($branch) {
            $bm = $this->resolveBranchManagerForBranch($branch);
            if ($bm && (int) $bm->id !== (int) $employee->id) {
                return $bm;
            }

            // Fallback to Regional Manager
            $rm = $branch->regionalOffice?->regionalManager;
            if ($rm && (int) $rm->id !== (int) $employee->id) {
                return $rm;
            }
        }

        return $ed && (int) $ed->id !== (int) $employee->id ? $ed : null;
    }

    /**
     * Resolve the active Branch Manager / Head for a branch.
     */
    public function resolveBranchManagerForBranch(Branch $branch): ?Employee
    {
        if (array_key_exists($branch->id, $this->cachedBranchManagers)) {
            return $this->cachedBranchManagers[$branch->id];
        }

        // 1. Explicit head_employee_id
        if ($branch->head_employee_id) {
            $head = Employee::query()->where('status', 'active')->find($branch->head_employee_id);
            if ($head) {
                return $this->cachedBranchManagers[$branch->id] = $head;
            }
        }

        // 2. Explicit branch_head_designation_id
        if ($branch->branch_head_designation_id) {
            $head = Employee::query()
                ->where('status', 'active')
                ->where('current_branch_id', $branch->id)
                ->where('designation_id', $branch->branch_head_designation_id)
                ->first();
            if ($head) {
                return $this->cachedBranchManagers[$branch->id] = $head;
            }
        }

        // 3. Find active employee with BM title (excluding Assistant Branch Manager)
        $bm = Employee::query()
            ->where('current_branch_id', $branch->id)
            ->where('status', 'active')
            ->whereHas('designation', function ($q) {
                $q->where(function ($inner) {
                    $inner->where('name', 'Branch Manager')
                        ->orWhere('name', 'like', 'Branch Manager-%')
                        ->orWhere('name', 'like', 'Senior Branch Manager%')
                        ->orWhere('name', 'like', 'Acting Branch Manager%')
                        ->orWhere('name', 'like', 'Trainee Branch Manager%')
                        ->orWhere('name', 'like', 'Junior Branch Manager%')
                        ->orWhere('name', 'like', 'SBM%');
                })->where('name', 'not like', '%Assistant%');
            })
            ->orderBy('id')
            ->first();

        if ($bm) {
            return $this->cachedBranchManagers[$branch->id] = $bm;
        }

        // 4. Fallback: Assistant Branch Manager if no full BM exists
        $abm = Employee::query()
            ->where('current_branch_id', $branch->id)
            ->where('status', 'active')
            ->whereHas('designation', fn ($q) => $q->where('name', 'like', '%Assistant Branch Manager%'))
            ->orderBy('id')
            ->first();

        return $this->cachedBranchManagers[$branch->id] = $abm;
    }

    /**
     * Find Executive Director (cached).
     */
    public function getExecutiveDirector(): ?Employee
    {
        if ($this->cachedExecutiveDirector !== null) {
            return $this->cachedExecutiveDirector;
        }

        $this->cachedExecutiveDirector = Employee::query()
            ->where('status', 'active')
            ->whereHas('designation', fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', ['%executive director%'])
                ->whereRaw('LOWER(name) NOT LIKE ?', ['%deputy%']))
            ->orderBy('id')
            ->first();

        return $this->cachedExecutiveDirector;
    }

    /**
     * Find Director (Microfinance) (cached).
     */
    public function getMicrofinanceDirector(): ?Employee
    {
        if ($this->cachedMicrofinanceDirector !== null) {
            return $this->cachedMicrofinanceDirector;
        }

        $this->cachedMicrofinanceDirector = Employee::query()
            ->where('status', 'active')
            ->whereHas('designation', fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', ['%director (microfinance)%']))
            ->first()
            ?? Department::query()->where('name', 'like', '%Microfinance%')->first()?->headEmployee;

        return $this->cachedMicrofinanceDirector;
    }

    /**
     * Automatically update reporting_to for a specific employee.
     */
    public function syncEmployee(Employee $employee, bool $save = true): ?Employee
    {
        $manager = $this->resolveReportingManager($employee);
        $newReportingId = $manager?->id;

        if ($employee->reporting_to !== $newReportingId) {
            $employee->reporting_to = $newReportingId;
            if ($save) {
                $employee->saveQuietly();
            }
        }

        return $manager;
    }

    /**
     * Sync all employees.
     *
     * @return array{total: int, updated: int, unchanged: int, details: list<array<string, mixed>>}
     */
    public function syncAll(bool $dryRun = false, bool $activeOnly = true, ?callable $onProgress = null): array
    {
        $query = Employee::query()->with(['designation', 'department', 'branch.regionalOffice.zone']);
        if ($activeOnly) {
            $query->where('status', 'active');
        }

        $employees = $query->orderBy('id')->get();
        $updated = 0;
        $unchanged = 0;
        $details = [];

        foreach ($employees as $emp) {
            $oldManagerId = $emp->reporting_to;
            $oldManager = $oldManagerId ? Employee::query()->find($oldManagerId) : null;

            $newManager = $this->resolveReportingManager($emp);
            $newManagerId = $newManager?->id;

            $changed = ($oldManagerId !== $newManagerId);

            if ($changed) {
                $updated++;
                if (! $dryRun) {
                    $emp->reporting_to = $newManagerId;
                    $emp->saveQuietly();
                }
            } else {
                $unchanged++;
            }

            $detail = [
                'employee_id' => $emp->id,
                'pin' => $emp->pin,
                'name' => $emp->name_en,
                'designation' => $emp->designation?->name,
                'branch' => $emp->branch?->name,
                'department' => $emp->department?->name,
                'old_manager' => $oldManager ? "{$oldManager->pin} - {$oldManager->name_en}" : 'None',
                'new_manager' => $newManager ? "{$newManager->pin} - {$newManager->name_en}" : 'None',
                'changed' => $changed,
            ];

            $details[] = $detail;

            if ($onProgress) {
                $onProgress($detail);
            }
        }

        return [
            'total' => $employees->count(),
            'updated' => $updated,
            'unchanged' => $unchanged,
            'details' => $details,
        ];
    }
}
