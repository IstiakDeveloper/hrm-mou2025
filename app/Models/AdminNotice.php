<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class AdminNotice extends Model
{
    protected $appends = [
        'attachment_url',
    ];

    protected $fillable = [
        'sender_id',
        'title',
        'message',
        'type',
        'link',
        'attachment_path',
        'attachment_original_name',
        'audience',
        'department_ids',
        'user_ids',
        'recipient_count',
        'push_sent',
    ];

    protected $casts = [
        'department_ids' => 'array',
        'user_ids' => 'array',
        'push_sent' => 'boolean',
        'recipient_count' => 'integer',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function getAttachmentUrlAttribute(): ?string
    {
        if (! $this->attachment_path) {
            return null;
        }

        return Storage::disk('public')->url($this->attachment_path);
    }
}
