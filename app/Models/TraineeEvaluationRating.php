<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TraineeEvaluationRating extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'sl_no' => 'integer',
    ];

    public function evaluation()
    {
        return $this->belongsTo(TraineeEvaluation::class, 'trainee_evaluation_id');
    }
}
