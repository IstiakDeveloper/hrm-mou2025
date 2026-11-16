<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'template_id',
        'section_key',
        'name_en',
        'name_bn',
        'max_marks',
        'order',
    ];

    protected $casts = [
        'max_marks' => 'decimal:2',
        'order' => 'integer',
    ];

    public function template()
    {
        return $this->belongsTo(EvaluationTemplate::class, 'template_id');
    }

    public function criteria()
    {
        return $this->hasMany(EvaluationCriterion::class, 'section_id')->orderBy('order');
    }
}
