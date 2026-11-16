<?php

namespace App\Services\Appraisal;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

trait AllowsInitiatorResubmitPastRm
{
    public function initiatorMayResubmitPastRm(User $user, Model $evaluation): bool
    {
        if ((int) $evaluation->getAttribute('initiator_id') !== (int) $user->id) {
            return false;
        }

        if ($evaluation->getAttribute('status') !== 'submitted_to_rm') {
            return false;
        }

        if ($evaluation->getAttribute('form_type') === 'bm_and_above') {
            return true;
        }

        return $this->getUserHierarchyLevel($user) <= 2;
    }

    public function resubmitPastRm(Model $evaluation, User $user, string $comments): void
    {
        DB::transaction(function () use ($evaluation, $user, $comments): void {
            $nextStatus = $this->determineNextStatus($evaluation, 'draft');

            $evaluation->signatures()->create([
                'user_id' => $user->id,
                'stage' => 'initiator',
                'action' => 'submitted',
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            $evaluation->status = $nextStatus;
            $evaluation->save();
        });

        $this->notifyStakeholders($evaluation->fresh(), 'submitted', $comments);
    }
}
