<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionEvaluationScore extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'max_score' => 'float',
        'obtained_score' => 'float',
    ];

    public function evaluation()
    {
        return $this->belongsTo(PromotionEvaluation::class, 'promotion_evaluation_id');
    }
}
