<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Designation;
use App\Models\Employee;

class Branch extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'regional_office_id',
        'name',
        'address',
        'contact_number',
        'email',
        'branch_code',
        'head_employee_id',
        'branch_head_designation_id',
        'is_head_office',
        'is_active',
        'geofence_latitude',
        'geofence_longitude',
        'geofence_radius_meters',
        'geofence_max_accuracy_meters',
        'geofence_enabled',
    ];

    protected $casts = [
        'is_head_office' => 'boolean',
        'is_active' => 'boolean',
        'geofence_latitude' => 'float',
        'geofence_longitude' => 'float',
        'geofence_radius_meters' => 'integer',
        'geofence_max_accuracy_meters' => 'integer',
        'geofence_enabled' => 'boolean',
    ];

    public function regionalOffice(): BelongsTo
    {
        return $this->belongsTo(RegionalOffice::class);
    }

    public function headEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'head_employee_id');
    }

    public function branchHeadDesignation(): BelongsTo
    {
        return $this->belongsTo(Designation::class, 'branch_head_designation_id');
    }

    public function resolveBranchHeadEmployee(): ?Employee
    {
        if (! $this->branch_head_designation_id) {
            return $this->headEmployee;
        }

        return Employee::query()
            ->where('status', 'active')
            ->where('current_branch_id', $this->id)
            ->where('designation_id', $this->branch_head_designation_id)
            ->orderBy('id', 'desc')
            ->first();
    }

    public function isEmployeeBranchHead(Employee $employee): bool
    {
        if ((int) $employee->current_branch_id !== (int) $this->id) {
            return false;
        }

        if ($this->branch_head_designation_id) {
            return (int) $employee->designation_id === (int) $this->branch_head_designation_id;
        }

        return $this->head_employee_id && (int) $employee->id === (int) $this->head_employee_id;
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
