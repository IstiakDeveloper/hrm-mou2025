<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionEvaluation extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'has_cashier' => 'boolean',
        'hr_financial_irregularity' => 'boolean',
        'hr_disciplinary_action' => 'boolean',
        'hr_audit_objection' => 'boolean',
        'hr_leave_without_pay' => 'boolean',
        'hr_acr_satisfactory' => 'boolean',
        'loan_balance' => 'decimal:2',
        'savings_balance' => 'decimal:2',
        'overdue_amount' => 'decimal:2',
        'otr_pct' => 'decimal:2',
        'par_pct' => 'decimal:2',
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

    public function proposedDesignation()
    {
        return $this->belongsTo(Designation::class, 'proposed_designation_id');
    }

    public function proposedGrade()
    {
        return $this->belongsTo(SalaryGrade::class, 'proposed_grade_id');
    }

    public function proposedStep()
    {
        return $this->belongsTo(SalaryStep::class, 'proposed_step_id');
    }

    public function scores()
    {
        return $this->hasMany(PromotionEvaluationScore::class);
    }

    public function signatures()
    {
        return $this->hasMany(PromotionEvaluationSignature::class)->orderBy('signed_at', 'asc');
    }
}
