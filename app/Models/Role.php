<?php

namespace App\Models;

use App\Support\PermissionRegistry;
use App\Support\SectionRegistry;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'permissions',
        'blocked_sections',
    ];

    protected $casts = [
        'permissions' => 'array',
        'blocked_sections' => 'array',
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

    /**
     * @return list<string>
     */
    public function blockedSectionList(): array
    {
        if (! SectionRegistry::supportsRoleSectionLocks()) {
            return [];
        }

        return SectionRegistry::filterValid(
            is_array($this->blocked_sections) ? $this->blocked_sections : []
        );
    }
}
