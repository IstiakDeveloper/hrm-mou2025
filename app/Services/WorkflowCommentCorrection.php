<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class WorkflowCommentCorrection
{
    /**
     * Replace the written comment only. The signer and signed_at stay as they were.
     */
    public function apply(Model $signature, User $editor, string $comments): void
    {
        $signature->comments = trim($comments);
        $signature->comment_updated_by = $editor->id;
        $signature->comment_updated_at = now();
        $signature->save();
    }
}
