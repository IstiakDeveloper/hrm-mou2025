<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationCriterion extends Model
{
    use HasFactory;

    protected $table = 'evaluation_criteria';

    protected $fillable = [
        'section_id',
        'criteria_key',
        'name_en',
        'name_bn',
        'max_score',
        'order',
        'is_active',
    ];

    protected $casts = [
        'max_score' => 'decimal:2',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function section()
    {
        return $this->belongsTo(EvaluationSection::class, 'section_id');
    }
}
