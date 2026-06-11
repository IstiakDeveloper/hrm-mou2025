<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeType extends Model
{
    protected $fillable = [
        'name',
        'probation_months',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'probation_months' => 'integer',
    ];

    /**
     * Resolve the permanent (non-probation) employee type for confirmation.
     */
    public static function resolvePermanentTypeId(?int $currentProbationTypeId = null): ?int
    {
        $base = static::query()
            ->where('is_active', true)
            ->where('probation_months', 0);

        if ($currentProbationTypeId) {
            $base->where('id', '!=', $currentProbationTypeId);
        }

        $byName = (clone $base)
            ->whereRaw('LOWER(name) LIKE ?', ['%permanent%'])
            ->orderBy('id')
            ->value('id');

        if ($byName) {
            return (int) $byName;
        }

        $fallback = (clone $base)->orderBy('id')->value('id');

        return $fallback ? (int) $fallback : null;
    }
}
