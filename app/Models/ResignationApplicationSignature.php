<?php

namespace App\Models;

use App\Models\Concerns\RecordsCommentCorrection;
use Illuminate\Database\Eloquent\Model;

class ResignationApplicationSignature extends Model
{
    use RecordsCommentCorrection;

    protected $guarded = ['id'];

    protected $casts = [
        'recommended_date' => 'date',
        'signed_at' => 'datetime',
    ];

    protected $appends = [
        'signature_path',
    ];

    public function getSignaturePathAttribute(): ?string
    {
        return $this->user?->getSignaturePath();
    }

    public function resignationApplication()
    {
        return $this->belongsTo(ResignationApplication::class, 'resignation_application_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
