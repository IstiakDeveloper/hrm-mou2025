<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResignationApplication extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'application_date' => 'date',
        'joining_date' => 'date',
        'notice_date' => 'date',
        'last_working_date' => 'date',
        'effective_date' => 'date',
        'approved_effective_date' => 'date',
    ];

    protected $appends = [
        'applicant_signature_path',
        'is_head_office',
    ];

    public function getApplicantSignaturePathAttribute(): ?string
    {
        return $this->initiator?->getSignaturePath() ?: $this->employee?->signature;
    }

    public function getIsHeadOfficeAttribute(): bool
    {
        $branch = $this->branch ?: $this->employee?->branch;
        if (! $branch) {
            return true;
        }
        if ((bool) $branch->is_head_office) {
            return true;
        }
        $name = mb_strtolower(trim($branch->name ?? ''));
        return str_contains($name, 'head office') || str_contains($name, 'প্রধান কার্যালয়');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function initiator()
    {
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function regionalOffice()
    {
        return $this->belongsTo(RegionalOffice::class);
    }

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function separation()
    {
        return $this->belongsTo(Separation::class);
    }

    public function signatures()
    {
        return $this->hasMany(ResignationApplicationSignature::class)->orderBy('signed_at', 'asc');
    }

    /**
     * Map category key to Bengali human label.
     */
    public static function reasonCategoryLabels(): array
    {
        return [
            'family_reason' => 'পারিবারিক কারণ',
            'personal_reason' => 'ব্যক্তিগত কারণ',
            'better_job' => 'অন্যত্র ভালো চাকরি হওয়া',
            'sickness' => 'অসুস্থতা জনিত কারণ',
            'retirement' => 'অবসর জনিত বয়স পূর্ণ হওয়া',
            'project_end' => 'প্রকল্পের মেয়াদ শেষ হওয়া',
            'contract_end' => 'চুক্তির মেয়াদ শেষ হওয়া',
            'other' => 'অন্যান্য',
        ];
    }
}
