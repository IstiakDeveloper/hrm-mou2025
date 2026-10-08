<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfirmationEvaluation extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'joining_date' => 'date',
        'probation_end_date' => 'date',
        'has_cashier' => 'boolean',
        'hr_financial_irregularity' => 'boolean',
        'hr_disciplinary_action' => 'boolean',
        'hr_audit_objection' => 'boolean',
        'hr_leave_without_pay' => 'boolean',
        'joining_loan_balance' => 'decimal:2',
        'closing_loan_balance' => 'decimal:2',
        'diff_loan_balance' => 'decimal:2',
        'joining_savings_balance' => 'decimal:2',
        'closing_savings_balance' => 'decimal:2',
        'diff_savings_balance' => 'decimal:2',
        'joining_overdue_amount' => 'decimal:2',
        'closing_overdue_amount' => 'decimal:2',
        'diff_overdue_amount' => 'decimal:2',
        'joining_otr_pct' => 'decimal:2',
        'closing_otr_pct' => 'decimal:2',
        'diff_otr_pct' => 'decimal:2',
        'joining_par_pct' => 'decimal:2',
        'closing_par_pct' => 'decimal:2',
        'diff_par_pct' => 'decimal:2',
        'total_score' => 'float',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function initiator()
    {
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function regionalOffice()
    {
        return $this->belongsTo(RegionalOffice::class);
    }

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    public function scores()
    {
        return $this->hasMany(ConfirmationEvaluationScore::class);
    }

    public function signatures()
    {
        return $this->hasMany(ConfirmationEvaluationSignature::class)->orderBy('signed_at', 'asc');
    }
}
