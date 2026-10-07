<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'appraisal_type',
        'category_name_bn',
        'category_name_en',
        'code',
        'title_en',
        'title_bn',
        'description',
        'total_marks',
        'is_active',
        'version',
    ];

    protected $casts = [
        'total_marks' => 'decimal:2',
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function scopeForType($query, string $type)
    {
        return $query->where('appraisal_type', $type);
    }

    public function sections()
    {
        return $this->hasMany(EvaluationSection::class, 'template_id')->orderBy('order');
    }
}
