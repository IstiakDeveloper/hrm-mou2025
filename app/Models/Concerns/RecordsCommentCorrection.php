<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait RecordsCommentCorrection
{
    public function initializeRecordsCommentCorrection(): void
    {
        $this->casts['comment_updated_at'] = 'datetime';
        $this->appends = array_values(array_unique([...$this->appends, 'comment_updated_by_name']));
        $this->hidden = array_values(array_unique([...$this->hidden, 'comment_editor']));
    }

    public function commentEditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'comment_updated_by');
    }

    public function getCommentUpdatedByNameAttribute(): ?string
    {
        if (! $this->comment_updated_by) {
            return null;
        }

        return $this->commentEditor?->name;
    }
}
