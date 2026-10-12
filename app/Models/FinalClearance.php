<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinalClearance extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_HR = 'submitted_to_hr';

    public const STATUS_ACCOUNTS = 'submitted_to_accounts';

    public const STATUS_DIRECTOR_FA = 'submitted_to_director_fa';

    public const STATUS_ED = 'submitted_to_ed';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'employee_id', 'initiator_id', 'status', 'branch_id', 'regional_office_id', 'zone_id',
        'staff_id', 'employee_name', 'designation_name', 'department_name',
        'fathers_name', 'mothers_name', 'mobile', 'village', 'post_office', 'upazila', 'district',
        'program_project', 'workplace',
        'id_card_returned', 'sim_returned', 'member_loan_outstanding', 'savings_outstanding',
        'total_member', 'total_borrower', 'preparer_comments',
        'joining_date', 'confirmation_date', 'dropout_date', 'leave_balance', 'hr_issue', 'hr_issue_note',
        'service_length_label', 'confirmation_days',
        'unpaid_salary', 'unpaid_salary_remarks', 'pf_amount', 'pf_remarks',
        'gratuity_amount', 'gratuity_remarks', 'staff_security', 'staff_security_remarks',
        'other_payable', 'other_payable_remarks',
        'pf_loan', 'pf_loan_remarks', 'motorcycle_loan', 'motorcycle_loan_remarks',
        'laptop_loan', 'laptop_loan_remarks', 'other_loan', 'other_loan_remarks',
        'advance_received', 'advance_remarks', 'accounts_comments',
        'total_payable', 'total_adjustable', 'net_payable',
        'separation_final_payment_id', 'rejected_reason',
    ];

    protected $casts = [
        'joining_date' => 'date',
        'confirmation_date' => 'date',
        'dropout_date' => 'date',
        'leave_balance' => 'decimal:2',
        'member_loan_outstanding' => 'decimal:2',
        'savings_outstanding' => 'decimal:2',
        'unpaid_salary' => 'decimal:2',
        'pf_amount' => 'decimal:2',
        'gratuity_amount' => 'decimal:2',
        'staff_security' => 'decimal:2',
        'other_payable' => 'decimal:2',
        'pf_loan' => 'decimal:2',
        'motorcycle_loan' => 'decimal:2',
        'laptop_loan' => 'decimal:2',
        'other_loan' => 'decimal:2',
        'advance_received' => 'decimal:2',
        'total_payable' => 'decimal:2',
        'total_adjustable' => 'decimal:2',
        'net_payable' => 'decimal:2',
    ];

    protected function idCardReturned(): Attribute
    {
        return $this->nullableBoolean();
    }

    protected function simReturned(): Attribute
    {
        return $this->nullableBoolean();
    }

    protected function hrIssue(): Attribute
    {
        return $this->nullableBoolean();
    }

    private function nullableBoolean(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value === null ? null : (bool) $value,
            set: fn ($value) => $value === null || $value === '' ? null : (bool) $value,
        );
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(FinalClearanceSignature::class);
    }

    public function separationFinalPayment(): BelongsTo
    {
        return $this->belongsTo(SeparationFinalPayment::class);
    }
}
