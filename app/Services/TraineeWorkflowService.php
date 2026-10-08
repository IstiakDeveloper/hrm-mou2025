<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\TraineeEvaluation;
use App\Models\TraineeEvaluationSignature;
use App\Models\User;
use App\Notifications\TraineeEvaluationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class TraineeWorkflowService
{
    /**
     * Determine the correct form type based on designation string or employee designation.
     */
    public function determineFormType(?Employee $employee = null, ?string $designationTitle = null): string
    {
        $title = '';
        if ($designationTitle) {
            $title = mb_strtolower(trim($designationTitle));
        } elseif ($employee) {
            $employee->loadMissing('designation');
            $title = mb_strtolower(trim($employee->designation?->name ?? $employee->designation?->title ?? ''));
        }

        // Form B: Accountant
        if (
            str_contains($title, 'accountant') || 
            str_contains($title, 'হিসাবরক্ষক') ||
            str_contains($title, 'trainee-ac')
        ) {
            return 'accountant';
        }

        // Form A: Assistant Branch Manager (Check BEFORE Branch Manager so ABM is not classified as BM)
        if (
            str_contains($title, 'assistant branch manager') || 
            str_contains($title, 'asst. branch manager') || 
            str_contains($title, 'asst branch manager') || 
            str_contains($title, 'সহকারী শাখা ব্যবস্থাপক') ||
            str_contains($title, 'abm')
        ) {
            return 'officer_abm';
        }

        // Form C: Branch Manager to Zonal Manager
        if (
            str_contains($title, 'branch manager') || 
            str_contains($title, 'regional manager') || 
            str_contains($title, 'zonal manager') ||
            str_contains($title, 'area manager') ||
            str_contains($title, 'area coordinator') ||
            str_contains($title, 'শাখা ব্যবস্থাপক') ||
            str_contains($title, 'আঞ্চলিক ব্যবস্থাপক') ||
            str_contains($title, 'জোনাল ম্যানেজার')
        ) {
            return 'bm_and_above';
        }

        // Form A: Officer and Assistant Branch Manager (Default for field / line staff)
        return 'officer_abm';
    }

    /**
     * Submit / Forward an evaluation to the next stage.
     */
    public function forward(TraineeEvaluation $evaluation, User $user, string $comments, ?string $recommendationType = null, ?int $extensionDays = null, ?array $additionalData = []): void
    {
        DB::transaction(function () use ($evaluation, $user, $comments, $recommendationType, $extensionDays, $additionalData) {
            $currentStatus = $evaluation->status;
            $nextStatus = $this->determineNextStatus($evaluation, $currentStatus);
            $stage = $this->determineStageRole($currentStatus);

            // Create signature record
            $evaluation->signatures()->create([
                'user_id' => $user->id,
                'stage' => $stage,
                'action' => $currentStatus === 'draft' ? 'submitted' : 'forwarded',
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            // Update evaluation
            $evaluation->status = $nextStatus;
            
            if ($recommendationType) {
                $evaluation->recommendation_type = $recommendationType;
            }
            if ($extensionDays !== null) {
                $evaluation->extension_days = $extensionDays;
            }

            if (!empty($additionalData)) {
                $evaluation->fill($additionalData);
            }

            $evaluation->save();
        });

        $this->notifyStakeholders($evaluation, $evaluation->status === 'submitted_to_rm' ? 'submitted' : 'forwarded', $comments);
    }

    /**
     * Send back an evaluation for revision.
     */
    public function sendBack(TraineeEvaluation $evaluation, User $user, string $comments): void
    {
        DB::transaction(function () use ($evaluation, $user, $comments) {
            $currentStatus = $evaluation->status;
            $stage = $this->determineStageRole($currentStatus);

            $evaluation->signatures()->create([
                'user_id' => $user->id,
                'stage' => $stage,
                'action' => 'sent_back',
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            $evaluation->status = 'draft';
            $evaluation->save();
        });

        $this->notifyStakeholders($evaluation, 'sent_back', $comments);
    }

    /**
     * ED final approval.
     */
    public function edApprove(TraineeEvaluation $evaluation, User $user, string $comments, bool $isApproved): void
    {
        DB::transaction(function () use ($evaluation, $user, $comments, $isApproved) {
            $evaluation->status = $isApproved ? 'approved' : 'rejected';
            
            $evaluation->signatures()->create([
                'user_id' => $user->id,
                'stage' => 'ed',
                'action' => $isApproved ? 'approved' : 'rejected',
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            $evaluation->save();
        });

        $this->notifyStakeholders($evaluation, $isApproved ? 'approved' : 'rejected', $comments);
    }

    public function isBranchManager(User $user): bool
    {
        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        if (
            in_array('Branch Manager', $roleNames, true) ||
            $user->hasPermission('branch_manager') ||
            $user->hasDirectPermission('branch_manager')
        ) {
            return true;
        }

        $user->loadMissing('employee.designation');
        $title = mb_strtolower(trim((string) optional($user->employee?->designation)->name));
        return $title === 'branch manager' || str_contains($title, 'branch manager') || str_contains($title, 'শাখা ব্যবস্থাপক');
    }

    public function canUserReview(User $user, TraineeEvaluation $evaluation): bool
    {
        // 1. Cannot review self
        if ($user->employee_id && $evaluation->employee_id && (int) $user->employee_id === (int) $evaluation->employee_id) {
            return false;
        }

        $status = $evaluation->status;

        // Draft stage: only creator can review/submit draft
        if ($status === 'draft') {
            return (int) $evaluation->initiator_id === (int) $user->id;
        }

        // 2. Creator can NEVER act as reviewer/approver in subsequent stages
        if ((int) $evaluation->initiator_id === (int) $user->id) {
            return false;
        }

        // 3. If user has already signed, they cannot act again
        $alreadySigned = $evaluation->signatures
            ->where('user_id', $user->id)
            ->whereIn('action', ['submitted', 'forwarded', 'approved'])
            ->isNotEmpty();
        if ($alreadySigned) {
            return false;
        }

        $roleNames = OrganogramAccessService::mergedRoleNames($user);

        return match ($status) {
            'submitted_to_rm' => $this->isUserAuthorizedForRm($user, $evaluation, $roleNames),
            'submitted_to_zm' => $this->isUserAuthorizedForZm($user, $evaluation, $roleNames),
            'submitted_to_director' => $this->isUserAuthorizedForDirectorMf($user, $roleNames),
            'submitted_to_director_fa' => $this->isUserAuthorizedForDirectorFa($user, $roleNames),
            'submitted_to_hr' => $this->isUserAuthorizedForHr($user, $roleNames),
            'submitted_to_ed' => $this->isUserAuthorizedForEd($user, $roleNames),
            default => false,
        };
    }

    private function isUserAuthorizedForRm(User $user, TraineeEvaluation $evaluation, array $roleNames): bool
    {
        if ($user->isSuperAdmin()) return true;
        if (
            in_array('Regional Manager', $roleNames, true) ||
            $user->hasDirectPermission('organogram.regional_manager') ||
            OrganogramAccessService::isRegionalManager($user)
        ) {
            if (!$evaluation->regional_office_id) return true;
            $userRegId = $user->employee?->branch?->regional_office_id;
            return !$userRegId || (int) $userRegId === (int) $evaluation->regional_office_id;
        }
        return false;
    }

    private function isUserAuthorizedForZm(User $user, TraineeEvaluation $evaluation, array $roleNames): bool
    {
        if ($user->isSuperAdmin()) return true;
        if (
            in_array('Zonal Manager', $roleNames, true) ||
            $user->hasDirectPermission('organogram.zonal_manager') ||
            OrganogramAccessService::isZonalManager($user)
        ) {
            if (!$evaluation->zone_id) return true;
            $userZoneId = $user->employee?->branch?->regionalOffice?->zone_id;
            return !$userZoneId || (int) $userZoneId === (int) $evaluation->zone_id;
        }
        return false;
    }

    private function isUserAuthorizedForDirectorMf(User $user, array $roleNames): bool
    {
        if ($user->isSuperAdmin()) return true;
        return in_array('Director (Microfinance)', $roleNames, true) ||
            in_array('Assistant Director (Microfinance)', $roleNames, true) ||
            OrganogramAccessService::isMicrofinanceDirector($user) ||
            OrganogramAccessService::isMicrofinanceAssistantDirector($user);
    }

    private function isUserAuthorizedForDirectorFa(User $user, array $roleNames): bool
    {
        if ($user->isSuperAdmin()) return true;
        return in_array('Director Finance and Accounts', $roleNames, true) ||
            in_array('Director Finance and Account', $roleNames, true) ||
            in_array('Finance Director', $roleNames, true);
    }

    private function isUserAuthorizedForHr(User $user, array $roleNames): bool
    {
        if ($user->isSuperAdmin()) return true;
        return in_array('HR Admin', $roleNames, true) ||
            in_array('HR Manager', $roleNames, true) ||
            in_array('Assistant Director (HR)', $roleNames, true) ||
            $user->hasPermission('trainee-evaluations.hr_verify');
    }

    private function isUserAuthorizedForEd(User $user, array $roleNames): bool
    {
        if ($user->isSuperAdmin()) return true;
        return in_array('Executive Director', $roleNames, true) ||
            OrganogramAccessService::isExecutiveDirector($user) ||
            $user->hasPermission('trainee-evaluations.approve');
    }

    public function determineNextStatus(TraineeEvaluation $evaluation, string $currentStatus): string
    {
        if ($currentStatus === 'draft') {
            return 'submitted_to_rm';
        }

        if ($currentStatus === 'submitted_to_rm') {
            return 'submitted_to_zm';
        }

        if ($currentStatus === 'submitted_to_zm') {
            return $evaluation->form_type === 'accountant' ? 'submitted_to_director_fa' : 'submitted_to_director';
        }

        if ($currentStatus === 'submitted_to_director' || $currentStatus === 'submitted_to_director_fa') {
            return 'submitted_to_hr';
        }

        if ($currentStatus === 'submitted_to_hr') {
            return 'submitted_to_ed';
        }

        if ($currentStatus === 'submitted_to_ed') {
            return 'approved';
        }

        return $currentStatus;
    }

    public function getStageLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'খসড়া (Draft)',
            'submitted_to_rm' => 'আঞ্চলিক ব্যবস্থাপক পর্যালোচনা (RM Review)',
            'submitted_to_zm' => 'জোনাল ম্যানেজার পর্যালোচনা (ZM Review)',
            'submitted_to_director' => 'পরিচালক (এমএফ) পর্যালোচনা (Director MF Review)',
            'submitted_to_director_fa' => 'পরিচালক (অর্থ ও হিসাব) পর্যালোচনা (Director FA Review)',
            'submitted_to_hr' => 'এইচআর যাচাই (HR Verification)',
            'submitted_to_ed' => 'নির্বাহী পরিচালক অনুমোদন (ED Approval)',
            'approved' => 'চূড়ান্ত অনুমোদিত (Approved)',
            'rejected' => 'নামঞ্জুরকৃত (Rejected)',
            'sent_back' => 'সংশোধনে ফেরত (Sent Back)',
            default => $status,
        };
    }

    public function determineStageRole(string $status): string
    {
        return match ($status) {
            'draft' => 'initiator',
            'submitted_to_rm' => 'rm',
            'submitted_to_zm' => 'zm',
            'submitted_to_director' => 'director',
            'submitted_to_director_fa' => 'director_fa',
            'submitted_to_hr' => 'hr',
            'submitted_to_ed' => 'ed',
            default => 'reviewer',
        };
    }

    public function getNextStageRole(string $status, string $formType): string
    {
        return match ($status) {
            'draft' => 'Regional Manager (RM)',
            'submitted_to_rm' => 'Zonal Manager (ZM)',
            'submitted_to_zm' => $formType === 'accountant' ? 'Director (Finance & Accounts)' : 'Director (Microfinance)',
            'submitted_to_director', 'submitted_to_director_fa' => 'HR Department',
            'submitted_to_hr' => 'Executive Director (ED)',
            'submitted_to_ed' => 'Final Approved',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            default => '-',
        };
    }

    private function notifyStakeholders(TraineeEvaluation $evaluation, string $event, string $comments): void
    {
        try {
            $candidateName = $evaluation->candidate_name ?? 'Candidate';
            $title = match ($event) {
                'submitted' => "প্রশিক্ষণার্থী মূল্যায়ন দাখিল: {$candidateName}",
                'forwarded' => "প্রশিক্ষণার্থী মূল্যায়ন পর্যালোচনা ও অগ্রবর্তী: {$candidateName}",
                'approved' => "প্রশিক্ষণার্থী মূল্যায়ন চূড়ান্ত অনুমোদিত: {$candidateName}",
                'rejected' => "প্রশিক্ষণার্থী মূল্যায়ন বাতিল: {$candidateName}",
                'sent_back' => "প্রশিক্ষণার্থী মূল্যায়ন সংশোধনের জন্য ফেরত: {$candidateName}",
                default => "প্রশিক্ষণার্থী মূল্যায়ন আপডেট: {$candidateName}",
            };

            $message = "প্রশিক্ষণার্থী {$candidateName}-এর মূল্যায়ন স্থিতি: {$evaluation->status}। মন্তব্য: {$comments}";
            $link = "/trainee-evaluations/{$evaluation->id}";

            // Notify initiator
            if ($evaluation->initiator) {
                $evaluation->initiator->notify(new TraineeEvaluationNotification(
                    title: $title,
                    message: $message,
                    type: $event === 'approved' ? 'success' : ($event === 'sent_back' || $event === 'rejected' ? 'warning' : 'info'),
                    link: $link,
                    evaluationId: $evaluation->id,
                ));
            }
        } catch (\Throwable $e) {
            Log::error("Failed to notify stakeholders for TraineeEvaluation #{$evaluation->id}: " . $e->getMessage());
        }
    }
}
