<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\RegionalOffice;
use App\Models\Employee;

class Zone extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
        'zone_manager_employee_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function regionalOffices()
    {
        return $this->hasMany(RegionalOffice::class);
    }

    public function zoneManager()
    {
        return $this->belongsTo(Employee::class, 'zone_manager_employee_id');
    }
}

