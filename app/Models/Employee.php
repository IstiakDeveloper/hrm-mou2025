<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        // Legacy fields (kept for backward compatibility)
        'employee_id',
        'first_name',
        'last_name',

        // Preferred fields
        'pin',
        'name_en',
        'name_bn',
        'email',
        'email_id',
        'phone',
        'mobile_personal',
        'mobile_official',
        'gender',
        'religion',
        'blood_group',
        'date_of_birth',
        'birth_date_certificate',
        'birth_date_original',
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
        'nid',
        'nid_number',
        'smart_card_number',
        'birth_registration_number',
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
        'basic_salary',
        'payscale_id',
        'salary_grade_id',
        'salary_step_id',
        'bank_account_details',
        'signature',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'birth_date_certificate' => 'date',
        'birth_date_original' => 'date',
        'joining_date' => 'date',
        'confirmation_date' => 'date',
        'resignation_date' => 'date',
        'dropout_date' => 'date',
        'final_payment_date' => 'date',
        'last_promotion_date' => 'date',
        'basic_salary' => 'decimal:2',
        'bank_account_details' => 'array',
        'is_project_employee' => 'boolean',
        'is_custodian' => 'boolean',
    ];

    /**
     * Employees in these statuses still "hold" unique identifiers (PIN, NID, employee_id, phone, etc.).
     * Inactive / terminated employees may share values with a new hire.
     *
     * @return list<string>
     */
    public static function statusesReservingUniqueIdentifiers(): array
    {
        return ['active', 'on_leave'];
    }

    protected $appends = [
        'pin',
        'full_name_en',
        'total_service_length_days',
        'service_length_from_confirmation_days',
        'staff_age_years',
        'length_of_service_on_last_promotion_days',
        'last_branch_name',
        'joining_designation_name',
        'last_designation_name',
    ];

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

        $first = (string) ($this->attributes['first_name'] ?? '');
        $last = (string) ($this->attributes['last_name'] ?? '');
        $fallback = trim($first.' '.$last);

        return $fallback !== '' ? $fallback : null;
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

    public function currentBranch()
    {
        return $this->belongsTo(Branch::class, 'current_branch_id');
    }
}
