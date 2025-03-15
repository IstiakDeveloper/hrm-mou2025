<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'employee_id',
        'branch_id',
        'active_status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'active_status' => 'boolean',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }


    // In User.php model
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    // Helper method to check permissions
    public function hasPermission($permission)
    {
        foreach ($this->roles as $role) {
            $permissions = json_decode($role->permissions, true) ?? [];
            if (in_array($permission, $permissions)) {
                return true;
            }
        }
        return false;
    }


}
