<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeGratuityPayment;
use App\Models\EmployeeLoan;
use App\Models\FinalClearance;
use App\Models\FinalClearanceSignature;
use App\Models\LeaveBalance;
use App\Models\RegionalOffice;
use App\Models\SeparationFinalPayment;
use App\Models\User;
use App\Models\Zone;
use App\Support\BranchOrganogram;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinalClearanceService
{
    public function __construct(
        private readonly EmployeeGratuityService $gratuityService,
        private readonly FinalPaymentSettlementService $settlements,
    ) {}

    public function canViewModule(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->hasPermission('final-clearances.view')
            || $user->hasPermission('final-clearances.create')
            || $user->hasPermission('final-clearances.hr')
            || $user->hasPermission('final-clearances.accounts')) {
            return true;
        }

        return $this->isHr($user)
            || $this->isAccounts($user)
            || $this->isDirectorFinance($user)
            || $this->isExecutiveDirector($user)
            || $this->isBranchManager($user)
            || $this->isRegionalManager($user)
            || $this->isZonalManager($user);
    }

    public function eligibleQuery(): Builder
    {
        return Employee::query()
            ->whereNotIn('status', ['active', 'on_leave'])
            ->where(function (Builder $query) {
                $query->whereIn('status', ['inactive', 'terminated'])
                    ->orWhereNotNull('dropout_date')
                    ->orWhereNotNull('resignation_date');
            })
            ->whereNull('final_payment_date')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('separation_final_payments')
                    ->whereColumn('separation_final_payments.employee_id', 'employees.id')
                    ->where('status', SeparationFinalPayment::STATUS_PAID);
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('final_clearances')
                    ->whereColumn('final_clearances.employee_id', 'employees.id')
                    ->where('status', '!=', FinalClearance::STATUS_REJECTED);
            });
    }

    public function canOpenCreate(User $user): bool
    {
        if ($user->isSuperAdmin() || $user->hasPermission('final-clearances.create')) {
            return true;
        }

        return $this->isHr($user)
            || $this->isBranchManager($user)
            || $this->isRegionalManager($user)
            || $this->isZonalManager($user);
    }

    public function creatorScopedQuery(User $user): Builder
    {
        $query = $this->eligibleQuery();
        if ($user->isSuperAdmin()) {
            return $query;
        }

        $query->where(function (Builder $outer) use ($user) {
            $applied = false;
            $employeeId = (int) $user->employee_id;

            if ($this->isBranchManager($user) && $employeeId > 0) {
                $branchIds = Branch::query()
                    ->where('head_employee_id', $employeeId)
                    ->pluck('id');
                $ownBranchId = (int) optional($user->employee)->current_branch_id;
                if ($ownBranchId > 0) {
                    $branchIds->push($ownBranchId);
                }
                $branchIds = $branchIds->filter()->unique()->values();
                if ($branchIds->isNotEmpty()) {
                    $outer->orWhereIn('current_branch_id', $branchIds);
                    $applied = true;
                }
            }

            if ($this->isRegionalManager($user) && $employeeId > 0) {
                $officeIds = RegionalOffice::query()
                    ->where('regional_manager_employee_id', $employeeId)
                    ->pluck('id');
                if ($officeIds->isNotEmpty()) {
                    $outer->orWhereIn('current_branch_id', function ($inner) use ($officeIds) {
                        $inner->select('id')->from('branches')->whereIn('regional_office_id', $officeIds);
                    });
                    $applied = true;
                }
            }

            if ($this->isZonalManager($user) && $employeeId > 0) {
                $zoneIds = Zone::query()->where('zone_manager_employee_id', $employeeId)->pluck('id');
                if ($zoneIds->isNotEmpty()) {
                    $outer->orWhereIn('current_branch_id', function ($inner) use ($zoneIds) {
                        $inner->select('branches.id')
                            ->from('branches')
                            ->join('regional_offices', 'regional_offices.id', '=', 'branches.regional_office_id')
                            ->whereIn('regional_offices.zone_id', $zoneIds);
                    });
                    $applied = true;
                }
            }

            if ($this->isHr($user)) {
                $outer->orWhere(function (Builder $hr) use ($employeeId) {
                    $hr->whereNull('reporting_to');
                    if ($employeeId > 0) {
                        $hr->orWhere('reporting_to', $employeeId);
                    }
                });
                $applied = true;
            }

            if (! $applied) {
                $outer->whereRaw('0 = 1');
            }
        });

        return $query;
    }

    public function canCreateFor(User $user, Employee $employee): bool
    {
        if (! $this->eligibleQuery()->whereKey($employee->id)->exists()) {
            return false;
        }

        return $this->matchesCreator($user, $employee);
    }

    public function matchesCreator(User $user, Employee $employee): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $employee->loadMissing(['designation', 'branch.regionalOffice']);
        $label = (string) (BranchOrganogram::resolveTier($employee->designation?->name)['label'] ?? '');
        $title = mb_strtolower(trim((string) $employee->designation?->name));

        if ($label === 'Branch Manager') {
            return $this->isRegionalManagerOf($user, $employee);
        }

        if ($label === 'Regional Manager') {
            return $this->isZonalManagerOf($user, $employee);
        }

        if ($label === 'Zonal Manager' || str_contains($title, 'director') || str_contains($title, 'executive')) {
            return $this->isReportingManager($user, $employee) || ($this->isHr($user) && ! $employee->reporting_to);
        }

        return $this->isBranchManagerOf($user, $employee);
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshot(Employee $employee): array
    {
        $employee->loadMissing(['designation', 'department', 'branch.regionalOffice', 'program', 'project']);

        $loans = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'active')
            ->where('outstanding_balance', '>', 0)
            ->get()
            ->groupBy('loan_type')
            ->map(fn ($rows) => SalaryStructureCalculator::roundTaka((float) $rows->sum('outstanding_balance')));

        $gratuity = $this->gratuityService->calculate($employee, $employee->getServiceEndDate());
        $gratuityAlreadyPaid = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'paid')
            ->exists();
        $gratuityPayable = (($gratuity['eligible'] ?? false) && ! $gratuityAlreadyPaid)
            ? (float) $gratuity['gratuity_amount']
            : 0.0;

        $leave = (float) LeaveBalance::query()->where('employee_id', $employee->id)->sum('remaining_days');

        $program = trim((string) ($employee->program?->name ?? ''));
        $project = trim((string) ($employee->project?->name ?? ''));
        $programProject = collect([$program, $project])->filter()->implode(' / ');

        $payload = [
            'staff_id' => $employee->pin ?: $employee->employee_id,
            'employee_name' => $employee->name_en ?: $employee->name_bn,
            'designation_name' => $employee->designation?->name,
            'department_name' => $employee->department?->name,
            'fathers_name' => $employee->fathers_name,
            'mothers_name' => $employee->mothers_name,
            'mobile' => $employee->mobile_personal ?: $employee->mobile_official,
            ...$this->addressFields($employee),
            'program_project' => $programProject !== '' ? $programProject : null,
            'workplace' => $employee->branch?->name,
            'branch_id' => $employee->current_branch_id,
            'regional_office_id' => $employee->branch?->regional_office_id,
            'zone_id' => $employee->branch?->regionalOffice?->zone_id,
            'joining_date' => optional($employee->joining_date)->toDateString(),
            'confirmation_date' => optional($employee->confirmation_date)->toDateString(),
            'dropout_date' => optional($employee->dropout_date ?? $employee->resignation_date)->toDateString(),
            'leave_balance' => $leave,
            'service_length_label' => $this->serviceLengthLabel($employee),
            'confirmation_days' => $employee->service_length_from_confirmation_days !== null
                ? (int) abs($employee->service_length_from_confirmation_days)
                : null,
            'pf_amount' => SalaryStructureCalculator::roundTaka((float) ($employee->pf_balance ?? 0)),
            'gratuity_amount' => SalaryStructureCalculator::roundTaka($gratuityPayable),
            'pf_loan' => $loans->get('pf_loan', 0),
            'motorcycle_loan' => $loans->get('motorcycle_loan', 0),
            'laptop_loan' => $loans->get('laptop_loan', 0),
            'other_loan' => $loans->get('other', 0),
        ];

        return $payload;
    }

    public function createDraft(User $user, Employee $employee): FinalClearance
    {
        if (! $this->canCreateFor($user, $employee)) {
            throw ValidationException::withMessages([
                'employee_id' => 'This employee cannot be selected for final clearance.',
            ]);
        }

        $clearance = new FinalClearance($this->snapshot($employee));
        $clearance->employee_id = $employee->id;
        $clearance->initiator_id = $user->id;
        $clearance->status = FinalClearance::STATUS_DRAFT;
        $this->recomputeTotals($clearance);
        $clearance->save();

        return $clearance;
    }

    public function recomputeService(FinalClearance $clearance): void
    {
        $joining = $clearance->joining_date ? Carbon::parse($clearance->joining_date) : null;
        $end = $clearance->dropout_date ? Carbon::parse($clearance->dropout_date) : Carbon::today();

        if ($joining) {
            $diff = $joining->diff($end);
            $clearance->service_length_label = trim(sprintf(
                '%d years %d months %d days',
                $diff->y,
                $diff->m,
                $diff->d,
            ));
        }

        if ($clearance->confirmation_date) {
            $clearance->confirmation_days = (int) abs(Carbon::parse($clearance->confirmation_date)->diffInDays($end));
        }
    }

    public function recomputeTotals(FinalClearance $clearance): void
    {
        $payable = (float) $clearance->unpaid_salary
            + (float) $clearance->pf_amount
            + (float) $clearance->gratuity_amount
            + (float) $clearance->staff_security
            + (float) $clearance->other_payable;

        $adjustable = (float) $clearance->pf_loan
            + (float) $clearance->motorcycle_loan
            + (float) $clearance->laptop_loan
            + (float) $clearance->other_loan
            + (float) $clearance->advance_received;

        $clearance->total_payable = SalaryStructureCalculator::roundTaka($payable);
        $clearance->total_adjustable = SalaryStructureCalculator::roundTaka($adjustable);
        $clearance->net_payable = SalaryStructureCalculator::roundTaka($payable - $adjustable);
    }

    public function visibleQuery(User $user): Builder
    {
        $query = FinalClearance::query()->with([
            'employee:id,pin,name_en,name_bn,employee_id',
            'initiator:id,name',
        ]);

        if ($user->isSuperAdmin()) {
            return $query;
        }

        return $query->where(function (Builder $outer) use ($user) {
            $outer->where('initiator_id', $user->id)
                ->orWhereHas('signatures', fn (Builder $sig) => $sig->where('user_id', $user->id));

            if ($this->isHr($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_HR);
            }
            if ($this->isAccounts($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_ACCOUNTS);
            }
            if ($this->isDirectorFinance($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_DIRECTOR_FA);
            }
            if ($this->isExecutiveDirector($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_ED);
            }
        });
    }

    public function canAct(User $user, FinalClearance $clearance): bool
    {
        if (in_array($clearance->status, [FinalClearance::STATUS_APPROVED, FinalClearance::STATUS_REJECTED], true)) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        return match ($clearance->status) {
            FinalClearance::STATUS_DRAFT => (int) $clearance->initiator_id === (int) $user->id,
            FinalClearance::STATUS_HR => $this->isHr($user),
            FinalClearance::STATUS_ACCOUNTS => $this->isAccounts($user),
            FinalClearance::STATUS_DIRECTOR_FA => $this->isDirectorFinance($user),
            FinalClearance::STATUS_ED => $this->isExecutiveDirector($user),
            default => false,
        };
    }

    public function pendingCount(User $user): int
    {
        if (! $this->canViewModule($user)) {
            return 0;
        }

        $query = FinalClearance::query()->where(function (Builder $outer) use ($user) {
            $outer->where(function (Builder $draft) use ($user) {
                $draft->where('status', FinalClearance::STATUS_DRAFT)
                    ->where('initiator_id', $user->id);
            });

            if ($user->isSuperAdmin()) {
                return;
            }

            if ($this->isHr($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_HR);
            }
            if ($this->isAccounts($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_ACCOUNTS);
            }
            if ($this->isDirectorFinance($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_DIRECTOR_FA);
            }
            if ($this->isExecutiveDirector($user)) {
                $outer->orWhere('status', FinalClearance::STATUS_ED);
            }
        });

        return (int) $query->count();
    }

    public function sign(FinalClearance $clearance, User $user, string $stage, string $action, ?string $comments = null): void
    {
        FinalClearanceSignature::query()->create([
            'final_clearance_id' => $clearance->id,
            'user_id' => $user->id,
            'stage' => $stage,
            'action' => $action,
            'comments' => $comments !== null && trim($comments) !== '' ? trim($comments) : null,
            'signed_at' => now(),
        ]);
    }

    public function approve(FinalClearance $clearance, User $user, ?string $comments = null): FinalClearance
    {
        return DB::transaction(function () use ($clearance, $user, $comments) {
            $clearance->loadMissing('employee');
            $employee = $clearance->employee;
            if (! $employee) {
                throw ValidationException::withMessages(['employee' => 'Employee record is missing.']);
            }

            $payment = $this->settlements->generateForEmployee($employee, $user->id);
            if (! $payment->isPending()) {
                throw ValidationException::withMessages([
                    'employee' => 'Final payment is already paid for this employee.',
                ]);
            }

            $payment = $this->settlements->markPaid(
                $payment,
                Carbon::today(),
                'Final clearance #'.$clearance->id,
                $user->id,
            );

            $employee->refresh();
            $employee->final_payment_date = $employee->final_payment_date ?? Carbon::today()->toDateString();
            $employee->final_payment_amount = $clearance->net_payable;
            $employee->save();

            $payment->net_payable = $clearance->net_payable;
            $note = trim((string) $payment->notes);
            $payment->notes = trim($note."\nApproved from final clearance #".$clearance->id);
            $payment->save();

            $clearance->status = FinalClearance::STATUS_APPROVED;
            $clearance->separation_final_payment_id = $payment->id;
            $clearance->save();

            $this->sign($clearance, $user, 'ed', 'approved', $comments);

            return $clearance->fresh();
        });
    }

    public function stageLabel(string $status): string
    {
        return match ($status) {
            FinalClearance::STATUS_DRAFT => 'Pending with Field',
            FinalClearance::STATUS_HR => 'Pending with HR',
            FinalClearance::STATUS_ACCOUNTS => 'Pending with Accounts',
            FinalClearance::STATUS_DIRECTOR_FA => 'Pending with Director (Finance & Accounts)',
            FinalClearance::STATUS_ED => 'Pending with Executive Director',
            FinalClearance::STATUS_APPROVED => 'Approved',
            FinalClearance::STATUS_REJECTED => 'Rejected',
            default => $status,
        };
    }

    /**
     * Village, post office, thana and district, in the same order they are kept on the employee.
     *
     * @return array{village: ?string, post_office: ?string, upazila: ?string, district: ?string}
     */
    public function addressFields(Employee $employee): array
    {
        $flat = [
            'village' => $this->filledText($employee->village),
            'post_office' => $this->filledText($employee->post_office),
            'upazila' => $this->filledText($employee->upazila),
            'district' => $this->filledText($employee->district),
        ];

        if ($flat['village'] || $flat['post_office'] || $flat['upazila'] || $flat['district']) {
            return $flat;
        }

        $address = DB::table('employee_addresses')
            ->where('employee_id', $employee->id)
            ->orderByRaw("case when type = 'present' then 0 when type = 'permanent' then 1 else 2 end")
            ->first();

        return [
            'village' => $this->filledText($address->village ?? null),
            'post_office' => null,
            'upazila' => $this->filledText($address->upazila ?? null),
            'district' => $this->filledText($address->district ?? null),
        ];
    }

    private function filledText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    private function serviceLengthLabel(Employee $employee): ?string
    {
        if (! $employee->joining_date) {
            return null;
        }

        $diff = Carbon::parse($employee->joining_date)->diff($employee->getServiceEndDate());

        return trim(sprintf('%d years %d months %d days', $diff->y, $diff->m, $diff->d));
    }

    private function roleNames(User $user): array
    {
        return OrganogramAccessService::mergedRoleNames($user);
    }

    private function isHr(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        $roles = $this->roleNames($user);
        if (in_array('HR Manager', $roles, true)
            || in_array('HR Admin', $roles, true)
            || in_array('Assistant Director (HR)', $roles, true)
            || $user->hasPermission('final-clearances.hr')) {
            return true;
        }

        return (int) optional($user->employee)->department_id === 5;
    }

    private function isAccounts(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        return $user->isAccountant() || $user->hasPermission('final-clearances.accounts');
    }

    private function isDirectorFinance(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        $roles = $this->roleNames($user);

        return in_array('Director Finance and Accounts', $roles, true)
            || in_array('Director Finance and Account', $roles, true)
            || in_array('Director (Finance & Accounts)', $roles, true);
    }

    private function isExecutiveDirector(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        $roles = $this->roleNames($user);

        return in_array('Executive Director', $roles, true)
            || $user->hasDirectPermission('organogram.executive_director');
    }

    private function isBranchManager(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        return in_array('Branch Manager', $this->roleNames($user), true)
            || $user->hasDirectPermission('branch_manager')
            || OrganogramAccessService::shouldApplyBranchOnlyEmployeeScope($user);
    }

    private function isRegionalManager(User $user): bool
    {
        return ! $user->isSuperAdmin() && (
            in_array('Regional Manager', $this->roleNames($user), true)
            || OrganogramAccessService::isRegionalManager($user)
        );
    }

    private function isZonalManager(User $user): bool
    {
        return ! $user->isSuperAdmin() && (
            in_array('Zonal Manager', $this->roleNames($user), true)
            || OrganogramAccessService::isZonalManager($user)
        );
    }

    private function isBranchManagerOf(User $user, Employee $employee): bool
    {
        if (! $this->isBranchManager($user)) {
            return false;
        }

        $branchId = (int) $employee->current_branch_id;
        $eid = (int) $user->employee_id;
        if ($branchId <= 0 || $eid <= 0) {
            return false;
        }

        $heads = Branch::query()->whereKey($branchId)->where('head_employee_id', $eid)->exists();
        $sameBranch = (int) optional($user->employee)->current_branch_id === $branchId;

        return $heads || $sameBranch;
    }

    private function isRegionalManagerOf(User $user, Employee $employee): bool
    {
        if (! $this->isRegionalManager($user)) {
            return false;
        }

        $officeId = (int) ($employee->branch?->regional_office_id ?? 0);
        $eid = (int) $user->employee_id;
        if ($officeId <= 0 || $eid <= 0) {
            return false;
        }

        return RegionalOffice::query()
            ->whereKey($officeId)
            ->where('regional_manager_employee_id', $eid)
            ->exists();
    }

    private function isZonalManagerOf(User $user, Employee $employee): bool
    {
        if (! $this->isZonalManager($user)) {
            return false;
        }

        $zoneId = (int) ($employee->branch?->regionalOffice?->zone_id ?? 0);
        $eid = (int) $user->employee_id;
        if ($zoneId <= 0 || $eid <= 0) {
            return false;
        }

        return Zone::query()->whereKey($zoneId)->where('zone_manager_employee_id', $eid)->exists();
    }

    private function isReportingManager(User $user, Employee $employee): bool
    {
        $eid = (int) $user->employee_id;

        return $eid > 0 && (int) $employee->reporting_to === $eid;
    }
}
