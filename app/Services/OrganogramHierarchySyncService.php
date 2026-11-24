<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\Zone;
use Illuminate\Support\Facades\Log;

class OrganogramHierarchySyncService
{
    public function __construct(
        protected EmployeeReportingToService $reportingToService,
        protected OrganogramLineRoleSyncService $lineRoleService,
    ) {}

    /**
     * Run full hierarchy sync across Zones, Regional Offices, Branches, Reporting relationships, and User Line Roles.
     *
     * @return array<string, mixed>
     */
    public function syncAll(bool $dryRun = false): array
    {
        $zones = $this->syncZones($dryRun);
        $regionalOffices = $this->syncRegionalOffices($dryRun);
        $branches = $this->syncBranches($dryRun);
        $reportingTo = $this->reportingToService->syncAll($dryRun);
        $roles = $this->lineRoleService->syncAll($dryRun);

        $misLoanResult = null;
        if (! $dryRun) {
            $misLoanResult = app(MisLoanOrganizationSyncService::class)->pushOrganization('hierarchy_sync');
        }

        return [
            'zones' => $zones,
            'regional_offices' => $regionalOffices,
            'branches' => $branches,
            'reporting_to' => $reportingTo,
            'roles' => $roles,
            'misloan' => $misLoanResult,
        ];
    }

    /**
     * Automatically update zone manager for all active zones based on employee posting & designation.
     *
     * @return array{total: int, updated: int, details: list<array<string, mixed>>}
     */
    public function syncZones(bool $dryRun = false): array
    {
        $zones = Zone::query()->where('is_active', true)->with('zoneManager')->get();
        $updated = 0;
        $details = [];

        foreach ($zones as $zone) {
            $oldManagerId = $zone->zone_manager_employee_id;
            $oldManager = $zone->zoneManager;

            // Find active employee with ZM designation posted in one of the branches of this zone
            $newManager = Employee::query()
                ->where('status', 'active')
                ->whereHas('designation', function ($q) {
                    $q->where('name', 'like', '%Zonal Manager%')
                        ->orWhere('name', 'like', '%Acting ZM%')
                        ->orWhere('name', 'like', 'ZM%');
                })
                ->whereHas('branch.regionalOffice', function ($q) use ($zone) {
                    $q->where('zone_id', $zone->id);
                })
                ->orderBy('id')
                ->first();

            $newManagerId = $newManager?->id;
            $changed = ($oldManagerId !== $newManagerId);

            if ($changed && $newManagerId !== null) {
                $updated++;
                if (! $dryRun) {
                    $zone->zone_manager_employee_id = $newManagerId;
                    $zone->save();
                }
            }

            $details[] = [
                'id' => $zone->id,
                'name' => $zone->name,
                'code' => $zone->code,
                'old_manager' => $oldManager ? "{$oldManager->pin} - {$oldManager->name_en}" : 'None',
                'new_manager' => $newManager ? "{$newManager->pin} - {$newManager->name_en}" : 'None',
                'changed' => $changed && $newManagerId !== null,
            ];
        }

        return [
            'total' => $zones->count(),
            'updated' => $updated,
            'details' => $details,
        ];
    }

    /**
     * Automatically update regional manager for all active regional offices based on employee posting & designation.
     *
     * @return array{total: int, updated: int, details: list<array<string, mixed>>}
     */
    public function syncRegionalOffices(bool $dryRun = false): array
    {
        $ros = RegionalOffice::query()->where('is_active', true)->with(['regionalManager', 'zone'])->get();
        $updated = 0;
        $details = [];

        foreach ($ros as $ro) {
            $oldManagerId = $ro->regional_manager_employee_id;
            $oldManager = $ro->regionalManager;

            $newManager = Employee::query()
                ->where('status', 'active')
                ->whereHas('designation', function ($q) {
                    $q->where('name', 'like', '%Regional Manager%')
                        ->orWhere('name', 'like', '%Acting RM%')
                        ->orWhere('name', 'like', 'RM%');
                })
                ->whereHas('branch', function ($q) use ($ro) {
                    $q->where('regional_office_id', $ro->id);
                })
                ->orderBy('id')
                ->first();

            $newManagerId = $newManager?->id;
            $changed = ($oldManagerId !== $newManagerId);

            if ($changed && $newManagerId !== null) {
                $updated++;
                if (! $dryRun) {
                    $ro->regional_manager_employee_id = $newManagerId;
                    $ro->save();
                }
            }

            $details[] = [
                'id' => $ro->id,
                'name' => $ro->name,
                'code' => $ro->code,
                'zone' => $ro->zone?->name,
                'old_manager' => $oldManager ? "{$oldManager->pin} - {$oldManager->name_en}" : 'None',
                'new_manager' => $newManager ? "{$newManager->pin} - {$newManager->name_en}" : 'None',
                'changed' => $changed && $newManagerId !== null,
            ];
        }

        return [
            'total' => $ros->count(),
            'updated' => $updated,
            'details' => $details,
        ];
    }

    /**
     * Automatically update head_employee_id for all active branches based on employee posting & designation.
     *
     * @return array{total: int, updated: int, details: list<array<string, mixed>>}
     */
    public function syncBranches(bool $dryRun = false): array
    {
        $branches = Branch::query()
            ->where('is_head_office', false)
            ->where('is_active', true)
            ->with(['headEmployee', 'regionalOffice.zone'])
            ->get();
        $updated = 0;
        $details = [];

        foreach ($branches as $branch) {
            $oldHeadId = $branch->head_employee_id;
            $oldHead = $branch->headEmployee;

            // Find active BM in this branch
            $newHead = Employee::query()
                ->where('status', 'active')
                ->where('current_branch_id', $branch->id)
                ->whereHas('designation', function ($q) {
                    $q->where(function ($inner) {
                        $inner->where('name', 'like', 'Branch Manager%')
                            ->orWhere('name', 'like', 'Senior Branch Manager%')
                            ->orWhere('name', 'like', 'Acting Branch Manager%')
                            ->orWhere('name', 'like', 'Junior Branch Manager%')
                            ->orWhere('name', 'like', 'Trainee Branch Manager%')
                            ->orWhere('name', 'like', 'SBM%');
                    })->where('name', 'not like', '%Assistant%');
                })
                ->orderBy('id')
                ->first();

            if (! $newHead) {
                $newHead = Employee::query()
                    ->where('status', 'active')
                    ->where('current_branch_id', $branch->id)
                    ->whereHas('designation', fn ($q) => $q->where('name', 'like', '%Assistant Branch Manager%'))
                    ->orderBy('id')
                    ->first();
            }

            $newHeadId = $newHead?->id;
            $changed = ($oldHeadId !== $newHeadId);

            if ($changed && $newHeadId !== null) {
                $updated++;
                if (! $dryRun) {
                    $branch->head_employee_id = $newHeadId;
                    $branch->save();
                }
            }

            $details[] = [
                'id' => $branch->id,
                'name' => $branch->name,
                'branch_code' => $branch->branch_code,
                'regional_office' => $branch->regionalOffice?->name,
                'old_head' => $oldHead ? "{$oldHead->pin} - {$oldHead->name_en}" : 'None',
                'new_head' => $newHead ? "{$newHead->pin} - {$newHead->name_en}" : 'None',
                'changed' => $changed && $newHeadId !== null,
            ];
        }

        return [
            'total' => $branches->count(),
            'updated' => $updated,
            'details' => $details,
        ];
    }

    /**
     * Automatic hook called when an employee transfer is completed.
     * Re-assigns old and new branch/RO/Zone heads and cascades reporting relationships.
     */
    public function handleEmployeeTransfer(Employee $employee, ?int $fromBranchId, int $toBranchId): void
    {
        $employee->loadMissing(['designation', 'user']);
        $desigName = mb_strtolower(trim((string) ($employee->designation?->name ?? '')));

        $fromBranch = $fromBranchId ? Branch::with('regionalOffice.zone')->find($fromBranchId) : null;
        $toBranch = Branch::with('regionalOffice.zone')->find($toBranchId);

        // 1. Release old assignments if employee held head positions in the old branch/RO/zone
        if ($fromBranch) {
            // A. If employee was head of previous branch, clear it
            if ((int) $fromBranch->head_employee_id === (int) $employee->id) {
                $fromBranch->head_employee_id = null;
                $fromBranch->save();
                // Find next BM in the old branch
                $this->syncBranches();
            }

            // B. If employee was RM of previous RO, check if toBranch is in a different RO
            $fromRo = $fromBranch->regionalOffice;
            $toRo = $toBranch?->regionalOffice;
            if ($fromRo && (int) $fromRo->regional_manager_employee_id === (int) $employee->id) {
                if (! $toRo || (int) $toRo->id !== (int) $fromRo->id) {
                    $fromRo->regional_manager_employee_id = null;
                    $fromRo->save();
                    $this->syncRegionalOffices();
                }
            }

            // C. If employee was ZM of previous Zone, check if toBranch is in a different Zone
            $fromZone = $fromRo?->zone;
            $toZone = $toRo?->zone;
            if ($fromZone && (int) $fromZone->zone_manager_employee_id === (int) $employee->id) {
                if (! $toZone || (int) $toZone->id !== (int) $fromZone->id) {
                    $fromZone->zone_manager_employee_id = null;
                    $fromZone->save();
                    $this->syncZones();
                }
            }
        }

        // 2. Assign to new role if employee is BM, RM, or ZM
        if ($toBranch) {
            $isBm = str_contains($desigName, 'branch manager') || preg_match('/\bbm\b/', $desigName);
            $isRm = str_contains($desigName, 'regional manager') || preg_match('/\brm\b/', $desigName);
            $isZm = str_contains($desigName, 'zonal manager') || str_contains($desigName, 'zone manager') || preg_match('/\bzm\b/', $desigName);

            if ($isBm && ! str_contains($desigName, 'assistant')) {
                $toBranch->head_employee_id = $employee->id;
                $toBranch->save();
            }

            if ($isRm && ! str_contains($desigName, 'assistant') && $toBranch->regionalOffice) {
                $toBranch->regionalOffice->regional_manager_employee_id = $employee->id;
                $toBranch->regionalOffice->save();
            }

            if ($isZm && $toBranch->regionalOffice?->zone) {
                $toBranch->regionalOffice->zone->zone_manager_employee_id = $employee->id;
                $toBranch->regionalOffice->zone->save();
            }
        }

        // 3. Automatically sync reporting relationships for affected employees:
        // - Transferred employee
        $this->reportingToService->syncEmployee($employee);

        // - Subordinates in old branch (re-point to new BM)
        if ($fromBranchId) {
            $oldBranchStaff = Employee::where('current_branch_id', $fromBranchId)->where('status', 'active')->get();
            foreach ($oldBranchStaff as $obs) {
                $this->reportingToService->syncEmployee($obs);
            }
        }

        // - Subordinates in new branch (re-point to new BM if this is a BM)
        if ($toBranchId) {
            $newBranchStaff = Employee::where('current_branch_id', $toBranchId)->where('status', 'active')->get();
            foreach ($newBranchStaff as $nbs) {
                $this->reportingToService->syncEmployee($nbs);
            }
        }

        // 4. Sync user line roles
        if ($employee->user) {
            $this->lineRoleService->syncUser($employee->user);
        }

        // 5. If manager transferred, push updated hierarchy to MisLoan
        if ($isBm || $isRm || $isZm) {
            app(MisLoanOrganizationSyncService::class)->pushOrganization('manager_transfer');
        }
    }
}
