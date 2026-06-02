<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransferHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'transfer_id',
        'employee_id',
        'from_branch_id',
        'to_branch_id',
        'transfer_date',
        'created_by',
    ];

    protected $casts = [
        'transfer_date' => 'date',
    ];

    public function transfer()
    {
        return $this->belongsTo(Transfer::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function fromBranch()
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch()
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

