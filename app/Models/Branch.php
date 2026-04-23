<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'contact_number',
        'branch_code',
        'head_employee_id',
        'is_head_office',
        'geofence_latitude',
        'geofence_longitude',
        'geofence_radius_meters',
        'geofence_max_accuracy_meters',
        'geofence_enabled',
    ];

    protected $casts = [
        'is_head_office' => 'boolean',
        'geofence_latitude' => 'float',
        'geofence_longitude' => 'float',
        'geofence_radius_meters' => 'integer',
        'geofence_max_accuracy_meters' => 'integer',
        'geofence_enabled' => 'boolean',
    ];

    public function headEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'head_employee_id');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class, 'current_branch_id');
    }

    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    public function attendanceDevices()
    {
        return $this->hasMany(AttendanceDevice::class);
    }

    public function attendanceSettings()
    {
        return $this->hasOne(AttendanceSetting::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
