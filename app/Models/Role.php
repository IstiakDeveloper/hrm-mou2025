<?php

namespace App\Models;

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

    public function getAllPermissions()
    {
        $permissions = json_decode($this->permissions, true) ?? [];

        if ($this->parent) {
            $parentPermissions = $this->parent->getAllPermissions();
            $permissions = array_merge($permissions, $parentPermissions);
        }

        return array_unique($permissions);
    }
}
