<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryGrade extends Model
{
    protected $fillable = [
        'payscale_id',
        'code',
        'name',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function payscale(): BelongsTo
    {
        return $this->belongsTo(Payscale::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(SalaryStep::class)->orderBy('step_number');
    }

    public function displayLabel(): string
    {
        $code = strtoupper((string) $this->code);
        if ($this->name) {
            return "{$code} — {$this->name}";
        }

        return $code;
    }
}
