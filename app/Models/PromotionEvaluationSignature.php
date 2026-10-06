<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionEvaluationSignature extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function evaluation()
    {
        return $this->belongsTo(PromotionEvaluation::class, 'promotion_evaluation_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
