<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryIncrement extends Model
{
    public const STATUS_SCHEDULED = 'scheduled';

    /** @deprecated Earlier workflow. Treated as scheduled. */
    public const STATUS_PENDING = 'pending';

    /** @deprecated Earlier workflow. Treated as scheduled. */
    public const STATUS_APPROVED = 'approved';

    public const STATUS_APPLIED = 'applied';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_ROLLED_BACK = 'rolled_back';

    /**
     * Orders that have not changed salary yet and still reserve the staff member.
     *
     * @return list<string>
     */
    public static function openStatuses(): array
    {
        return [
            self::STATUS_SCHEDULED,
            self::STATUS_PENDING,
            self::STATUS_APPROVED,
        ];
    }

    /**
     * Orders that should update salary once the effective date has started.
     * Pending orders were never confirmed, so they are not included.
     *
     * @return list<string>
     */
    public static function dueStatuses(): array
    {
        return [
            self::STATUS_SCHEDULED,
            self::STATUS_APPROVED,
        ];
    }

    protected $fillable = [
        'order_no',
        'increment_date',
        'effective_date',
        'arrear_months',
        'status',
        'notes',
        'branch_id',
        'program_id',
        'project_id',
        'employee_type_id',
        'created_by',
        'approved_by',
        'approved_at',
        'applied_at',
        'cancelled_at',
        'rolled_back_by',
        'rolled_back_at',
    ];

    protected $casts = [
        'increment_date' => 'date',
        'effective_date' => 'date',
        'arrear_months' => 'integer',
        'approved_at' => 'datetime',
        'applied_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'rolled_back_at' => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(SalaryIncrementLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rolledBackBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rolled_back_by');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function employeeType(): BelongsTo
    {
        return $this->belongsTo(EmployeeType::class);
    }
}
