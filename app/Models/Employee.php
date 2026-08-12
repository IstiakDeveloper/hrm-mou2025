<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

class Employee extends Model
{
    use HasFactory;

    /**
     * Transient metadata for EmployeeAssignmentObserver (not persisted).
     *
     * @var array{effective_from?: mixed, source_type?: string, source_id?: ?int, created_by?: ?int, notes?: ?string}|null
     */
    public ?array $assignmentHistoryContext = null;

    protected $fillable = [
        'employee_id',
        'pin',
        'name_en',
        'name_bn',
        'email',
        'mobile_personal',
        'mobile_official',
        'gender',
        'religion',
        'blood_group',
        'date_of_birth',
        'joining_date',
        'confirmation_date',
        'address',
        'village',
        'post_office',
        'union_pouroshova',
        'ward_no',
        'upazila',
        'district',
        'educational_qualification',
        'photo',
        'nid_number',
        'smart_card_number',
        'tin_certificate_no',
        'driving_license_no',
        'passport_no',
        'emergency_contact',
        'fathers_name',
        'fathers_mobile',
        'mothers_name',
        'mothers_mobile',
        'marital_status',
        'spouse_name',
        'spouse_mobile',
        'is_project_employee',
        'is_custodian',
        'identification_mark',
        'department_id',
        'designation_id',
        'joining_designation_id',
        'last_designation_id',
        'current_branch_id',
        'last_branch_id',
        'employee_type_id',
        'program_id',
        'project_id',
        'reporting_to',
        'status',
        'resignation_date',
        'dropout_date',
        'dropout_reason',
        'final_payment_date',
        'last_promotion_date',
        'probation_period_days',
        'pf_balance',
        'pf_enrolled',
        'pf_enrollment_date',
        'payscale_id',
        'salary_grade_id',
        'salary_step_id',
        'basic_salary',
        'custom_salary_assigned_at',
        'probation_salary',
        'fixed_salary',
        'signature',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'joining_date' => 'date',
        'confirmation_date' => 'date',
        'resignation_date' => 'date',
        'dropout_date' => 'date',
        'final_payment_date' => 'date',
        'last_promotion_date' => 'date',
        'probation_salary' => 'decimal:2',
        'fixed_salary' => 'decimal:2',
        'basic_salary' => 'decimal:2',
        'custom_salary_assigned_at' => 'datetime',
        'pf_balance' => 'decimal:2',
        'pf_enrolled' => 'boolean',
        'pf_enrollment_date' => 'date',
        'is_project_employee' => 'boolean',
        'is_custodian' => 'boolean',
    ];

    /**
     * Date-only columns serialized for Inertia/API (Y-m-d, no UTC ISO shift in browsers).
     *
     * @return list<string>
     */
    public static function dateOnlyAttributes(): array
    {
        return [
            'date_of_birth',
            'joining_date',
            'confirmation_date',
            'resignation_date',
            'dropout_date',
            'final_payment_date',
            'last_promotion_date',
            'pf_enrollment_date',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toInertiaArray(): array
    {
        $data = $this->toArray();

        foreach (self::dateOnlyAttributes() as $attribute) {
            $value = $this->getAttribute($attribute);
            if ($value instanceof \DateTimeInterface) {
                $data[$attribute] = $value->format('Y-m-d');
            }
        }

        return $data;
    }

    /**
     * Employees in these statuses still "hold" unique identifiers (PIN, NID, employee_id, mobile, etc.).
     * Inactive employees may share values with a new hire.
     *
     * @return list<string>
     */
    public static function statusesReservingUniqueIdentifiers(): array
    {
        return ['active'];
    }

    protected $appends = [
        'pin',
        'full_name_en',
        'first_name',
        'last_name',
        'total_service_length_days',
        'service_length_from_confirmation_days',
        'staff_age_years',
        'length_of_service_on_last_promotion_days',
    ];

    /**
     * Detail views only — avoids N+1 queries when serializing employee lists.
     *
     * @return list<string>
     */
    public static function detailAppends(): array
    {
        return [
            'last_branch_name',
            'joining_designation_name',
            'last_designation_name',
        ];
    }

    public function getPinAttribute($value)
    {
        return $this->attributes['pin'] ?? $this->attributes['employee_id'] ?? null;
    }

    public function getFullNameEnAttribute(): ?string
    {
        $name = $this->attributes['name_en'] ?? null;
        if (is_string($name) && trim($name) !== '') {
            return trim($name);
        }

        return null;
    }

    /** @deprecated Legacy API — full English name; use name_en / full_name_en in new code. */
    public function getFirstNameAttribute(): ?string
    {
        return $this->full_name_en;
    }

    /** @deprecated Legacy API — always empty; full name is in first_name (name_en). */
    public function getLastNameAttribute(): string
    {
        return '';
    }

    public function hasEffectiveCustomBasic(): bool
    {
        // basic_salary may be 0 for intentional custom packages (e.g. ECC: zero earnings, PF only).
        // Null basic + custom timestamp is incomplete/legacy and is not treated as custom.
        return $this->custom_salary_assigned_at !== null
            && $this->basic_salary !== null;
    }

    public function resolveBasicSalary(): float
    {
        if ($this->hasEffectiveCustomBasic()) {
            return (float) $this->basic_salary;
        }

        if ($this->basic_salary !== null && (float) $this->basic_salary > 0) {
            return (float) $this->basic_salary;
        }

        if ($this->payscale_id && $this->salary_grade_id && $this->salary_step_id) {
            $structure = SalaryStructure::query()
                ->where('payscale_id', $this->payscale_id)
                ->where('salary_grade_id', $this->salary_grade_id)
                ->where('salary_step_id', $this->salary_step_id)
                ->with('step')
                ->first();

            if ($structure?->basic_salary !== null) {
                return (float) $structure->basic_salary;
            }

            $this->loadMissing('salaryStep');
            if ($this->salaryStep?->basic_salary) {
                return (float) $this->salaryStep->basic_salary;
            }
        }

        return 0.0;
    }

    public function getServiceEndDate(): Carbon
    {
        if ($this->dropout_date) {
            return Carbon::parse($this->dropout_date);
        }

        // Backward compatibility for old records
        if ($this->resignation_date) {
            return Carbon::parse($this->resignation_date);
        }

        return Carbon::today();
    }

    public function getTotalServiceLengthDaysAttribute(): ?int
    {
        if (! $this->joining_date) {
            return null;
        }

        return Carbon::parse($this->joining_date)->diffInDays($this->getServiceEndDate());
    }

    public function getServiceLengthFromConfirmationDaysAttribute(): ?int
    {
        if (! $this->confirmation_date) {
            return null;
        }

        return Carbon::parse($this->confirmation_date)->diffInDays($this->getServiceEndDate());
    }

    public function getStaffAgeYearsAttribute(): ?int
    {
        if (! $this->date_of_birth) {
            return null;
        }

        return Carbon::parse($this->date_of_birth)->diffInYears($this->getServiceEndDate());
    }

    public function getLengthOfServiceOnLastPromotionDaysAttribute(): ?int
    {
        if (! $this->joining_date || ! $this->last_promotion_date) {
            return null;
        }

        return Carbon::parse($this->joining_date)->diffInDays(Carbon::parse($this->last_promotion_date));
    }

    public function getFullNameAttribute(): string
    {
        return $this->full_name_en ?? '';
    }

    public function headOfBranch(): HasOne
    {
        return $this->hasOne(Branch::class, 'head_employee_id');
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function employeeType()
    {
        return $this->belongsTo(EmployeeType::class);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function joiningDesignation()
    {
        return $this->belongsTo(Designation::class, 'joining_designation_id');
    }

    public function lastDesignation()
    {
        return $this->belongsTo(Designation::class, 'last_designation_id');
    }

    public function payscale()
    {
        return $this->belongsTo(Payscale::class);
    }

    public function salaryGrade()
    {
        return $this->belongsTo(SalaryGrade::class, 'salary_grade_id');
    }

    public function salaryStep()
    {
        return $this->belongsTo(SalaryStep::class, 'salary_step_id');
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'current_branch_id');
    }

    public function lastBranch()
    {
        return $this->belongsTo(Branch::class, 'last_branch_id');
    }

    public function getLastBranchNameAttribute(): ?string
    {
        return $this->lastBranch?->name;
    }

    public function getJoiningDesignationNameAttribute(): ?string
    {
        return $this->joiningDesignation?->name;
    }

    public function getLastDesignationNameAttribute(): ?string
    {
        return $this->lastDesignation?->name;
    }

    public function manager()
    {
        return $this->belongsTo(Employee::class, 'reporting_to');
    }

    public function subordinates()
    {
        return $this->hasMany(Employee::class, 'reporting_to');
    }

    public function headOfBranches()
    {
        return $this->hasMany(Branch::class, 'head_employee_id');
    }

    public function headOfDepartments()
    {
        return $this->hasMany(Department::class, 'head_employee_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function attendanceTime()
    {
        return $this->hasOne(EmployeeAttendanceTime::class);
    }

    public function hasCustomAttendanceTime(): bool
    {
        return (bool) $this->attendanceTime?->isConfigured();
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveApplications()
    {
        return $this->hasMany(LeaveApplication::class);
    }

    public function transfers()
    {
        return $this->hasMany(Transfer::class);
    }

    public function movements()
    {
        return $this->hasMany(Movement::class);
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }

    public function pfTransactions()
    {
        return $this->hasMany(EmployeePfTransaction::class);
    }

    public function loans()
    {
        return $this->hasMany(EmployeeLoan::class);
    }

    public function assignmentHistories()
    {
        return $this->hasMany(EmployeeAssignmentHistory::class);
    }

    public function salaryHeadModifications()
    {
        return $this->hasMany(SalaryHeadModification::class);
    }

    public function gratuityPayments()
    {
        return $this->hasMany(EmployeeGratuityPayment::class);
    }

    public function jobHistories()
    {
        return $this->hasMany(EmployeeJobHistory::class);
    }

    public function disciplinaryActions()
    {
        return $this->hasMany(EmployeeDisciplinaryAction::class);
    }

    public function currentBranch()
    {
        return $this->belongsTo(Branch::class, 'current_branch_id');
    }

    public function scopePayrollReady(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where(function (Builder $q2) {
                $q2->whereNotNull('payscale_id')
                    ->whereNotNull('salary_grade_id')
                    ->whereNotNull('salary_step_id');
            })->orWhere(function (Builder $q2) {
                $q2->whereNotNull('probation_salary')->where('probation_salary', '>', 0);
            })->orWhereHas('employeeType', function (Builder $et) {
                $et->where('probation_months', '>', 0);
            })->orWhere(function (Builder $q2) {
                $q2->whereNotNull('fixed_salary')->where('fixed_salary', '>', 0);
            });
        });
    }

    /**
     * Probation or fixed salary path — no active payscale / grade / step required.
     */
    public function scopeNonGradePayrollPath(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where(function (Builder $q2) {
                $q2->whereNotNull('probation_salary')->where('probation_salary', '>', 0);
            })->orWhereHas('employeeType', function (Builder $et) {
                $et->where('probation_months', '>', 0);
            })->orWhere(function (Builder $q2) {
                $q2->whereNotNull('fixed_salary')->where('fixed_salary', '>', 0);
            });
        });
    }

    public function scopeWithFullGradePayroll(Builder $query, ?int $activePayscaleId = null): Builder
    {
        return $query
            ->whereNotNull('payscale_id')
            ->whereNotNull('salary_grade_id')
            ->whereNotNull('salary_step_id')
            ->when($activePayscaleId, fn (Builder $q) => $q->where('payscale_id', $activePayscaleId));
    }

    /**
     * Permanent employees with payscale, grade, and step assigned (gratuity scope).
     */
    public function scopeForGratuity(Builder $query): Builder
    {
        return $query
            ->whereHas('employeeType', fn (Builder $et) => $et->where('probation_months', 0))
            ->whereNotNull('payscale_id')
            ->whereNotNull('salary_grade_id')
            ->whereNotNull('salary_step_id');
    }

    /**
     * Employees in PF scope: enrolled, with balance, or any PF ledger activity.
     */
    public function scopeForPf(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where('pf_enrolled', true)
                ->orWhere('pf_balance', '>', 0)
                ->orWhereHas('pfTransactions');
        });
    }

    /**
     * Sync linked login account(s) active/inactive with this employee's employment status.
     */
    public function syncLinkedUserActiveStatus(): void
    {
        $status = $this->status;
        if ($status === null || $status === '') {
            $status = static::query()->whereKey($this->id)->value('status') ?? 'active';
        }

        $isActive = $status === 'active';
        $email = strtolower(trim((string) ($this->email ?? '')));

        User::query()
            ->where(function (Builder $query) use ($email) {
                $query->where('employee_id', $this->id);
                if ($email !== '') {
                    $query->orWhere(function (Builder $inner) use ($email) {
                        $inner->whereNull('employee_id')->whereRaw('LOWER(email) = ?', [$email]);
                    });
                }
            })
            ->update(['active_status' => $isActive]);
    }
}
