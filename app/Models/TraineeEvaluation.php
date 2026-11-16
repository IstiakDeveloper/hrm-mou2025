<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TraineeEvaluation extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'training_joining_date' => 'date',
        'training_completion_date' => 'date',
        'total_score' => 'float',
        'extension_days' => 'integer',
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
        return $this->hasMany(TraineeEvaluationScore::class)->orderBy('sl_no', 'asc');
    }

    public function ratings()
    {
        return $this->hasMany(TraineeEvaluationRating::class)->orderBy('sl_no', 'asc');
    }

    public function signatures()
    {
        return $this->hasMany(TraineeEvaluationSignature::class)->orderBy('signed_at', 'asc');
    }
}
