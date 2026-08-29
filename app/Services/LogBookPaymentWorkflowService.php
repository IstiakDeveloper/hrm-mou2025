<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\MovementLogBookPayment;
use App\Models\User;
use App\Models\Zone;

class LogBookPaymentWorkflowService
{
    public const TIER_STAFF = 'staff';
    public const TIER_BRANCH_MANAGER = 'branch_manager';
    public const TIER_REGIONAL_MANAGER = 'regional_manager';
    public const TIER_ZONAL_MANAGER = 'zonal_manager';
    public const TIER_ASSISTANT_DIRECTOR = 'assistant_director';
    public const TIER_DIRECTOR = 'director';
    public const TIER_EXECUTIVE_DIRECTOR = 'executive_director';
    public const TIER_HEAD_OFFICE = 'head_office';

    public function resolveSubmitterTier(Employee $employee): string
    {
        $employee->loadMissing(['designation', 'branch.regionalOffice', 'user']);

        $user = $this->userForEmployee((int) $employee->id);
        $title = mb_strtolower(trim((string) ($employee->designation?->name ?? '')));

        if ($this->userIsEd($user) || $this->titleIsExecutiveDirector($title)) {
            return self::TIER_EXECUTIVE_DIRECTOR;
        }

        if ($this->userIsAd($user) || $this->titleIsAssistantDirector($title)) {
            return self::TIER_ASSISTANT_DIRECTOR;
        }

        if ($this->userIsDirector($user) || $this->titleIsDirector($title)) {
            return self::TIER_DIRECTOR;
        }

        if ($this->isAssignedZonalManager($employee) || $this->userIsZm($user) || $this->titleIs($title, 'zonal manager')) {
            return self::TIER_ZONAL_MANAGER;
        }

        if ($this->isAssignedRegionalManager($employee) || $this->userIsRm($user) || $this->titleIs($title, 'regional manager')) {
            return self::TIER_REGIONAL_MANAGER;
        }

        if ($this->isAssignedBranchManager($employee) || $this->userIsBm($user) || $this->titleIs($title, 'branch manager')) {
            return self::TIER_BRANCH_MANAGER;
        }

        if ($employee->branch?->is_head_office) {
            return self::TIER_HEAD_OFFICE;
        }

        return self::TIER_STAFF;
    }

    /**
     * Resolves eligibility and monthly official KM limit for an employee.
     *
     * @return array{eligible: bool, km_limit: ?float, role_label: string, ineligible_reason: ?string}
     */
    public function resolveKmLimit(Employee $employee): array
    {
        $employee->loadMissing(['designation', 'branch.regionalOffice']);
        $title = mb_strtolower(trim((string) ($employee->designation?->name ?? '')));
        $isHeadOffice = (bool) ($employee->branch?->is_head_office);

        // 1. Executive Director & Directors / Assistant Directors (No Limit)
        if (
            str_contains($title, 'executive director')
            || str_contains($title, 'director')
            || $title === 'director'
            || $title === 'assistant director'
            || str_contains($title, 'director (microfinance)')
            || str_contains($title, 'assistant director (mf)')
            || str_contains($title, 'deputy executive director')
            || str_contains($title, 'deputy assistant director')
        ) {
            return [
                'eligible' => true,
                'km_limit' => null,
                'role_label' => 'Director / Executive Director',
                'ineligible_reason' => null,
            ];
        }

        // 2. Zonal Manager (1200 KM)
        $isZM = str_contains($title, 'zonal manager')
            || Zone::query()->where('zone_manager_employee_id', $employee->id)->exists();
        if ($isZM) {
            return [
                'eligible' => true,
                'km_limit' => 1200.0,
                'role_label' => 'Zonal Manager',
                'ineligible_reason' => null,
            ];
        }

        // 3. Regional Manager (1000 KM)
        $isRM = str_contains($title, 'regional manager')
            || (int) ($employee->branch?->regionalOffice?->regional_manager_employee_id ?: 0) === (int) $employee->id
            || \App\Models\RegionalOffice::query()->where('regional_manager_employee_id', $employee->id)->exists();
        if ($isRM) {
            return [
                'eligible' => true,
                'km_limit' => 1000.0,
                'role_label' => 'Regional Manager',
                'ineligible_reason' => null,
            ];
        }

        // 4. Assistant Branch Manager / Assistant Manager (900 KM) - Check BEFORE Branch Manager
        if (
            str_contains($title, 'assistant branch manager')
            || str_contains($title, 'asst. branch manager')
            || str_contains($title, 'asst branch manager')
            || (! $isHeadOffice && ($title === 'assistant manager' || str_contains($title, 'assistant manager')))
        ) {
            return [
                'eligible' => true,
                'km_limit' => 900.0,
                'role_label' => 'Assistant Branch Manager',
                'ineligible_reason' => null,
            ];
        }

        // 5. Branch Manager (1000 KM)
        $isBM = str_contains($title, 'branch manager')
            || ($employee->branch && ! $isHeadOffice && $employee->branch->isEmployeeBranchHead($employee));
        if ($isBM) {
            return [
                'eligible' => true,
                'km_limit' => 1000.0,
                'role_label' => 'Branch Manager',
                'ineligible_reason' => null,
            ];
        }

        // 6. Accountant (500 KM)
        if (
            str_contains($title, 'accountant')
            || str_contains($title, 'accounts officer')
        ) {
            return [
                'eligible' => true,
                'km_limit' => 500.0,
                'role_label' => 'Accountant',
                'ineligible_reason' => null,
            ];
        }

        // 7. Head Office Staff (800 KM)
        if ($isHeadOffice) {
            return [
                'eligible' => true,
                'km_limit' => 800.0,
                'role_label' => 'Head Office Staff',
                'ineligible_reason' => null,
            ];
        }

        // 8. Field Officers & all other branch field staff (Ineligible)
        return [
            'eligible' => false,
            'km_limit' => 0.0,
            'role_label' => 'Field Officer / Branch Staff',
            'ineligible_reason' => 'Officer-level and field staff are not eligible for monthly log book payment processing.',
        ];
    }

    public function calculateBilledKm(float $totalOfficialKm, ?float $kmLimit): float
    {
        if ($kmLimit !== null && $totalOfficialKm > $kmLimit) {
            return round($kmLimit, 2);
        }

        return round($totalOfficialKm, 2);
    }

    public function needsRecommendation(string $tier): bool
    {
        return in_array($tier, [
            self::TIER_STAFF,
            self::TIER_BRANCH_MANAGER,
            self::TIER_REGIONAL_MANAGER,
            self::TIER_ZONAL_MANAGER,
        ], true);
    }

    public function userCanRecommend(User $user, MovementLogBookPayment $payment): bool
    {
        if (! $payment->needs_recommendation || $payment->status !== 'pending') {
            return false;
        }

        if ($this->isOwnPayment($user, $payment)) {
            return false;
        }

        $payment->loadMissing(['employee.designation', 'employee.branch.regionalOffice']);

        return $this->actorMatchesRecommenders($user, $payment);
    }

    public function userCanApprove(User $user, MovementLogBookPayment $payment): bool
    {
        if (! $this->isInApprovePhase($payment)) {
            return false;
        }

        if ($this->isOwnPayment($user, $payment) && ! OrganogramAccessService::isExecutiveDirector($user)) {
            return false;
        }

        $payment->loadMissing(['employee.designation', 'employee.branch.regionalOffice']);
        $tier = (string) $payment->submitter_tier;

        if (in_array($tier, [self::TIER_HEAD_OFFICE, self::TIER_ASSISTANT_DIRECTOR, self::TIER_DIRECTOR, self::TIER_EXECUTIVE_DIRECTOR], true)) {
            return OrganogramAccessService::isExecutiveDirector($user);
        }

        if ($tier === self::TIER_STAFF) {
            $rmId = $this->regionalManagerEmployeeId($payment->employee);
            if ($rmId) {
                return (int) $user->employee_id === $rmId;
            }

            return OrganogramAccessService::isMicrofinanceAssistantDirector($user);
        }

        if (in_array($tier, [self::TIER_BRANCH_MANAGER, self::TIER_REGIONAL_MANAGER], true)) {
            return OrganogramAccessService::isMicrofinanceAssistantDirector($user)
                || OrganogramAccessService::isMicrofinanceDirector($user);
        }

        if ($tier === self::TIER_ZONAL_MANAGER) {
            return OrganogramAccessService::isMicrofinanceDirector($user);
        }

        return false;
    }

    public function userCanReject(User $user, MovementLogBookPayment $payment): bool
    {
        if ($payment->needs_recommendation && $payment->status === 'pending') {
            return $this->userCanRecommend($user, $payment);
        }

        return $this->userCanApprove($user, $payment);
    }

    public function nextActionLabel(MovementLogBookPayment $payment): ?string
    {
        if ($payment->status === 'approved' || $payment->status === 'rejected') {
            return null;
        }

        $tier = (string) $payment->submitter_tier;

        if (! $payment->needs_recommendation) {
            return 'Awaiting Executive Director approval';
        }

        if ($payment->status === 'pending') {
            return match ($tier) {
                self::TIER_STAFF => $this->branchManagerEmployeeId($payment->employee)
                    ? 'Awaiting Branch Manager recommendation'
                    : 'Awaiting Assistant Director recommendation (BM vacant)',
                self::TIER_BRANCH_MANAGER, self::TIER_REGIONAL_MANAGER => $this->zonalManagerEmployeeId($payment->employee)
                    ? 'Awaiting Zonal Manager recommendation'
                    : 'Awaiting Assistant Director recommendation (ZM vacant)',
                self::TIER_ZONAL_MANAGER => 'Awaiting Assistant Director recommendation',
                default => 'Awaiting recommendation',
            };
        }

        if ($payment->status === 'recommended') {
            return match ($tier) {
                self::TIER_STAFF => $this->regionalManagerEmployeeId($payment->employee)
                    ? 'Awaiting Regional Manager approval'
                    : 'Awaiting Assistant Director approval (RM vacant)',
                self::TIER_BRANCH_MANAGER, self::TIER_REGIONAL_MANAGER => 'Awaiting Assistant Director or Director (Microfinance) approval',
                self::TIER_ZONAL_MANAGER => 'Awaiting Director (Microfinance) approval',
                default => 'Awaiting approval',
            };
        }

        return null;
    }

    private function isInApprovePhase(MovementLogBookPayment $payment): bool
    {
        if ($payment->needs_recommendation) {
            return $payment->status === 'recommended';
        }

        return $payment->status === 'pending';
    }

    private function isOwnPayment(User $user, MovementLogBookPayment $payment): bool
    {
        return $user->employee_id && (int) $payment->employee_id === (int) $user->employee_id;
    }

    private function actorMatchesRecommenders(User $user, MovementLogBookPayment $payment): bool
    {
        $tier = (string) $payment->submitter_tier;
        $employee = $payment->employee;

        if ($tier === self::TIER_STAFF) {
            $bmId = $this->branchManagerEmployeeId($employee);
            if ($bmId) {
                return (int) $user->employee_id === $bmId;
            }

            return OrganogramAccessService::isMicrofinanceAssistantDirector($user);
        }

        if (in_array($tier, [self::TIER_BRANCH_MANAGER, self::TIER_REGIONAL_MANAGER], true)) {
            $zmId = $this->zonalManagerEmployeeId($employee);
            if ($zmId) {
                return (int) $user->employee_id === $zmId;
            }

            return OrganogramAccessService::isMicrofinanceAssistantDirector($user);
        }

        if ($tier === self::TIER_ZONAL_MANAGER) {
            return OrganogramAccessService::isMicrofinanceAssistantDirector($user);
        }

        return false;
    }

    private function branchManagerEmployeeId(Employee $employee): ?int
    {
        $employee->loadMissing('branch');
        $branch = $employee->branch;
        if (! $branch || $branch->is_head_office) {
            return null;
        }

        $head = $branch->resolveBranchHeadEmployee();
        if ($head && (int) $head->id !== (int) $employee->id && $this->hasLogin((int) $head->id)) {
            return (int) $head->id;
        }

        $byDesignation = Employee::query()
            ->with('designation:id,name')
            ->where('status', 'active')
            ->where('current_branch_id', $branch->id)
            ->where('id', '!=', $employee->id)
            ->whereHas('designation', function ($q) {
                $q->where(function ($inner) {
                    $inner->whereRaw('LOWER(name) LIKE ?', ['branch manager%'])
                        ->orWhereRaw('LOWER(name) = ?', ['branch manager']);
                });
            })
            ->orderBy('id')
            ->get();

        foreach ($byDesignation as $candidate) {
            if ($this->titleLooksLikeBranchManager((string) ($candidate->designation?->name ?? '')) && $this->hasLogin((int) $candidate->id)) {
                return (int) $candidate->id;
            }
        }

        $users = User::query()
            ->whereNotNull('employee_id')
            ->where('employee_id', '!=', $employee->id)
            ->whereHas('employee', function ($q) use ($branch) {
                $q->where('current_branch_id', $branch->id)->where('status', 'active');
            })
            ->with(['role', 'roles', 'employee.designation'])
            ->get();

        foreach ($users as $user) {
            if (! OrganogramAccessService::shouldApplyBranchOnlyEmployeeScope($user)) {
                continue;
            }

            $eid = (int) $user->employee_id;
            if ($eid > 0 && $this->hasLogin($eid)) {
                return $eid;
            }
        }

        return null;
    }

    private function titleLooksLikeBranchManager(string $title): bool
    {
        $normalized = mb_strtolower(trim($title));
        if ($normalized === '' || str_contains($normalized, 'assistant')) {
            return false;
        }

        return $normalized === 'branch manager' || str_starts_with($normalized, 'branch manager');
    }

    private function regionalManagerEmployeeId(Employee $employee): ?int
    {
        $employee->loadMissing('branch.regionalOffice');
        $eid = (int) ($employee->branch?->regionalOffice?->regional_manager_employee_id ?: 0);
        if ($eid > 0 && $eid !== (int) $employee->id && $this->hasLogin($eid)) {
            return $eid;
        }

        return null;
    }

    private function zonalManagerEmployeeId(Employee $employee): ?int
    {
        $employee->loadMissing('branch.regionalOffice');
        $zoneId = (int) ($employee->branch?->regionalOffice?->zone_id ?: 0);
        if ($zoneId <= 0) {
            return null;
        }

        $eid = (int) (Zone::query()->where('id', $zoneId)->value('zone_manager_employee_id') ?: 0);
        if ($eid > 0 && $eid !== (int) $employee->id && $this->hasLogin($eid)) {
            return $eid;
        }

        return null;
    }

    private function isAssignedZonalManager(Employee $employee): bool
    {
        return Zone::query()->where('zone_manager_employee_id', $employee->id)->exists();
    }

    private function isAssignedRegionalManager(Employee $employee): bool
    {
        $employee->loadMissing('branch.regionalOffice');

        return (int) ($employee->branch?->regionalOffice?->regional_manager_employee_id ?: 0) === (int) $employee->id;
    }

    private function isAssignedBranchManager(Employee $employee): bool
    {
        $employee->loadMissing('branch');
        $branch = $employee->branch;
        if (! $branch || $branch->is_head_office) {
            return false;
        }

        return $branch->isEmployeeBranchHead($employee);
    }

    private function userForEmployee(int $employeeId): ?User
    {
        if ($employeeId <= 0) {
            return null;
        }

        return User::query()
            ->with(['role', 'roles', 'employee.designation'])
            ->where('employee_id', $employeeId)
            ->orderBy('id')
            ->first();
    }

    private function hasLogin(int $employeeId): bool
    {
        return User::query()->where('employee_id', $employeeId)->exists();
    }

    private function userIsEd(?User $user): bool
    {
        return $user ? OrganogramAccessService::isExecutiveDirector($user) : false;
    }

    private function userIsDirector(?User $user): bool
    {
        return $user ? OrganogramAccessService::isMicrofinanceDirector($user) : false;
    }

    private function userIsAd(?User $user): bool
    {
        return $user ? OrganogramAccessService::isMicrofinanceAssistantDirector($user) : false;
    }

    private function userIsZm(?User $user): bool
    {
        return $user ? OrganogramAccessService::isZonalManager($user) : false;
    }

    private function userIsRm(?User $user): bool
    {
        return $user ? OrganogramAccessService::isRegionalManager($user) : false;
    }

    private function userIsBm(?User $user): bool
    {
        return $user ? OrganogramAccessService::shouldApplyBranchOnlyEmployeeScope($user) : false;
    }

    private function titleIs(string $title, string $needle): bool
    {
        return $title !== '' && ($title === $needle || str_contains($title, $needle));
    }

    private function titleIsExecutiveDirector(string $title): bool
    {
        return $title !== '' && str_contains($title, 'executive') && str_contains($title, 'director');
    }

    private function titleIsAssistantDirector(string $title): bool
    {
        return $title !== ''
            && str_contains($title, 'assistant')
            && str_contains($title, 'director')
            && ! str_contains($title, 'deputy assistant');
    }

    private function titleIsDirector(string $title): bool
    {
        if ($title === '' || str_contains($title, 'assistant') || str_contains($title, 'executive') || str_contains($title, 'deputy')) {
            return false;
        }

        return $title === 'director' || str_contains($title, 'director');
    }
}
