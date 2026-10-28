<?php

namespace App\Services\Appraisal;

use App\Models\User;
use App\Services\OrganogramAccessService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Appraisal comments only flow downwards: a viewer sees the signatures/comments of
 * their own level and of the levels below them, never of the levels above.
 * The workflow status / stepper is not affected (it is driven by evaluation.status).
 *
 * Rank: initiator 0, RM 1, ZM 2, Director 3, HR 4, ED 5. Super admin / ED see everything.
 */
class AppraisalSignatureVisibility
{
    public const RANK_TOP = 99;

    public const RANK_HR = 4;

    private const STAGE_RANKS = [
        'initiator' => 0,
        'rm' => 1,
        'submitted_to_rm' => 1,
        'zm' => 2,
        'submitted_to_zm' => 2,
        'director' => 3,
        'director_mf' => 3,
        'director_fa' => 3,
        'submitted_to_director' => 3,
        'submitted_to_director_fa' => 3,
        'hr' => 4,
        'submitted_to_hr' => 4,
        'ed' => 5,
        'submitted_to_ed' => 5,
        'approved' => 5,
    ];

    private const HR_FIELDS = [
        'hr_financial_irregularity',
        'hr_disciplinary_action',
        'hr_audit_objection',
        'hr_leave_without_pay',
        'hr_acr_satisfactory',
    ];

    /** Auto-generated texts that carry no information; never shown to anybody. */
    private const DEFAULT_COMMENTS = [
        'Initial Evaluation Drafted',
        'Initial Confirmation Evaluation Drafted',
        'Initial appraisal created',
        'Resubmitted by creator',
        'খসড়া তৈরি ও ১ম তত্ত্বাবধায়ক কর্তৃক মূল্যায়ন সম্পন্ন।',
        'সুপারিশ ও স্বাক্ষরসহ সংশোধনপূর্বক অনুমোদন করা হলো।',
        'সুপারিশ ও স্বাক্ষরসহ অনুমোদনপূর্বক পরবর্তী স্তরে অগ্রবর্তী করা হলো।',
    ];

    public static function isDefaultComment(?string $comment): bool
    {
        $normalized = trim((string) preg_replace('/\s+/u', ' ', (string) $comment));

        if ($normalized === '') {
            return false;
        }

        if (in_array($normalized, self::DEFAULT_COMMENTS, true)) {
            return true;
        }

        // "মূল্যায়নটি <পদবি> বরাবর দাখিল করা হয়েছে।" (auto text on submit)
        return (bool) preg_match('/^মূল্যায়নটি .+ বরাবর দাখিল করা হয়েছে।$/u', $normalized);
    }

    /** Blank auto-generated comments in memory only (nothing is saved). */
    public static function stripDefaultComments(Collection $signatures): void
    {
        foreach ($signatures as $signature) {
            if (self::isDefaultComment($signature->comments)) {
                $signature->setAttribute('comments', null);
            }
        }
    }

    /** Unknown stages are treated as top-level, i.e. hidden from everybody except super admin / ED. */
    public static function stageRank(?string $stage): int
    {
        return self::STAGE_RANKS[$stage ?? ''] ?? self::RANK_TOP;
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

    public static function viewerRank(User $user, Model $evaluation): int
    {
        if ($user->isSuperAdmin()) {
            return self::RANK_TOP;
        }

        $roleNames = OrganogramAccessService::mergedRoleNames($user);

        if (in_array('Executive Director', $roleNames, true) || OrganogramAccessService::isExecutiveDirector($user)) {
            return self::RANK_TOP;
        }

        $rank = 0;

        if (
            array_intersect(['HR Manager', 'HR Admin', 'Assistant Director (HR)'], $roleNames)
            || (int) optional($user->employee)->department_id === 5
        ) {
            $rank = max($rank, 4);
        }

        if (
            array_intersect([
                'Director (Microfinance)',
                'Assistant Director (Microfinance)',
                'Director Finance and Accounts',
                'Director Finance and Account',
                'Director (Finance & Accounts)',
            ], $roleNames)
            || OrganogramAccessService::isMicrofinanceDirector($user)
            || OrganogramAccessService::isMicrofinanceAssistantDirector($user)
            || OrganogramAccessService::isFinanceAndAccountsDepartmentHead($user)
        ) {
            $rank = max($rank, 3);
        }

        if (
            in_array('Zonal Manager', $roleNames, true)
            || $user->hasDirectPermission('organogram.zonal_manager')
            || OrganogramAccessService::isZonalManager($user)
        ) {
            $rank = max($rank, 2);
        }

        if (
            in_array('Regional Manager', $roleNames, true)
            || $user->hasDirectPermission('organogram.regional_manager')
            || OrganogramAccessService::isRegionalManager($user)
        ) {
            $rank = max($rank, 1);
        }

        // Anyone who already signed at a level can see that level.
        foreach ($evaluation->signatures->where('user_id', $user->id) as $own) {
            $stageRank = self::stageRank($own->stage);
            if ($stageRank < self::RANK_TOP) {
                $rank = max($rank, $stageRank);
            }
        }

        return $rank;
    }

    /**
     * Strip signatures/HR data above the viewer's level from an already loaded evaluation.
     * Call AFTER all permission flags (hasSigned, canReview, ...) were computed.
     */
    public static function apply(User $user, Model $evaluation): void
    {
        self::stripDefaultComments($evaluation->signatures);

        $rank = self::viewerRank($user, $evaluation);

        if ($rank >= self::RANK_TOP) {
            return;
        }

        $evaluation->setRelation('signatures', self::filter(
            $evaluation->signatures,
            $rank,
            (int) $user->id,
            (int) $evaluation->initiator_id === (int) $user->id,
        ));

        if ($rank < self::RANK_HR) {
            $evaluation->makeHidden(self::HR_FIELDS);
        }
    }
}
