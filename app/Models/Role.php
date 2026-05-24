<?php

namespace App\Models;

use App\Support\PermissionRegistry;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function roleUsers()
    {
        return $this->belongsToMany(User::class, 'role_user');
    }

    public function parent()
    {
        return $this->belongsTo(Role::class, 'parent_id');
    }

    /**
     * @return list<string>
     */
    public function permissionList(): array
    {
        return PermissionRegistry::permissionsFromStorage($this->permissions);
    }

    /**
     * @return list<string>
     */
    public function getAllPermissions(): array
    {
        $permissions = $this->permissionList();

        if ($this->parent) {
            $permissions = array_merge($permissions, $this->parent->getAllPermissions());
        }

        return array_values(array_unique($permissions));
    }
}
