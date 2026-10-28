<?php

namespace App\Services\Appraisal;

use App\Models\FinalClearance;
use Illuminate\Support\Collection;

/**
 * Final clearance comments only flow downwards: a viewer sees the signatures/comments of
 * their own stage and of the stages below, never of the stages above.
 * The workflow status/stepper is not affected (it is driven by clearance.status).
 *
 * Rank: field/preparer 0, HR 1, accounts 2, director F&A 3, ED 4. Super admin / ED see everything.
 */
class FinalClearanceVisibility
{
    public const RANK_TOP = 99;

    private const STAGE_RANKS = [
        'field' => 0,
        'initiator' => 0,
        'hr' => 1,
        'accounts' => 2,
        'director_fa' => 3,
        'ed' => 4,
    ];

    /** Comment-bearing columns on the clearance itself => minimum rank allowed to see them. */
    private const FIELD_RANKS = [
        'hr_issue' => 1,
        'hr_issue_note' => 1,
        'accounts_comments' => 2,
    ];

    /** Unknown stages are treated as top-level, i.e. hidden from everybody except super admin / ED. */
    public static function stageRank(?string $stage): int
    {
        return self::STAGE_RANKS[$stage ?? ''] ?? self::RANK_TOP;
    }

    /** @return list<string> */
    public static function hiddenFields(int $viewerRank): array
    {
        if ($viewerRank >= self::RANK_TOP) {
            return [];
        }

        return array_keys(array_filter(self::FIELD_RANKS, fn (int $min) => $viewerRank < $min));
    }

    /**
     * Pure filter (no DB access). A viewer always sees their own signatures; the initiator
     * also sees send-back comments, because those are addressed to them.
     */
    public static function filter(Collection $signatures, int $viewerRank, int $viewerId, bool $isInitiator): Collection
    {
        if ($viewerRank >= self::RANK_TOP) {
            return $signatures->values();
        }

        return $signatures->filter(function ($signature) use ($viewerRank, $viewerId, $isInitiator) {
            if ((int) $signature->user_id === $viewerId) {
                return true;
            }

            if (self::stageRank($signature->stage) <= $viewerRank) {
                return true;
            }

            return $isInitiator && $signature->action === 'sent_back';
        })->values();
    }

    /**
     * Strip signatures and higher-stage comment columns from an already loaded clearance.
     * Call right before building the Inertia payload.
     */
    public static function apply(FinalClearance $clearance, int $viewerRank, int $viewerId): void
    {
        if ($viewerRank >= self::RANK_TOP) {
            return;
        }

        $clearance->setRelation('signatures', self::filter(
            $clearance->signatures,
            $viewerRank,
            $viewerId,
            (int) $clearance->initiator_id === $viewerId,
        ));

        $hidden = self::hiddenFields($viewerRank);
        if ($hidden !== []) {
            $clearance->makeHidden($hidden);
        }
    }
}
