<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Designation extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
<<<<<<< HEAD
        'department_id',
        'rank',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
=======
        'rank',
    ];

    protected $appends = [
        'title',
    ];

    public function getTitleAttribute(): ?string
    {
        return $this->name;
>>>>>>> feature/flutter-mobile-app
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}
