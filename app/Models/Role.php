<?php

namespace App\Models;

<<<<<<< HEAD
=======
use App\Support\PermissionRegistry;
use App\Support\SectionRegistry;
>>>>>>> feature/flutter-mobile-app
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'permissions',
<<<<<<< HEAD
=======
        'blocked_sections',
        'block_payroll_module',
>>>>>>> feature/flutter-mobile-app
    ];

    protected $casts = [
        'permissions' => 'array',
<<<<<<< HEAD
=======
        'blocked_sections' => 'array',
        'block_payroll_module' => 'boolean',
>>>>>>> feature/flutter-mobile-app
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function roleUsers()
    {
        return $this->belongsToMany(User::class, 'role_user');
    }
<<<<<<< HEAD
=======

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
>>>>>>> feature/flutter-mobile-app
}
