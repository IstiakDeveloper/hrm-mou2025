<?php

namespace App\Models;

use App\Models\Concerns\RecordsCommentCorrection;
use Illuminate\Database\Eloquent\Model;

class PromotionEvaluationSignature extends Model
{
    use RecordsCommentCorrection;

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
