<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Employee;

class RegionalOffice extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'zone_id',
        'name',
        'code',
        'description',
        'is_active',
        'regional_manager_employee_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function regionalManager()
    {
        return $this->belongsTo(Employee::class, 'regional_manager_employee_id');
    }
}

