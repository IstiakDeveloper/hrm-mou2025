<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanMigration extends Model
{
    protected $fillable = [
        'migration_number',
        'closing_date',
        'loan_committee_id',
        'item_count',
        'created_by',
    ];

    protected $casts = [
        'closing_date' => 'date',
    ];

    public function committee(): BelongsTo
    {
        return $this->belongsTo(LoanCommittee::class, 'loan_committee_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(LoanMigrationItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function loans(): HasMany
    {
        return $this->hasMany(EmployeeLoan::class);
    }
}
