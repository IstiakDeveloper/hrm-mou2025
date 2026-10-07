<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\PromotionEvaluation;
use App\Models\PromotionEvaluationSignature;
use App\Models\User;
use App\Notifications\PromotionEvaluationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class PromotionEvaluationWorkflowService
{
    /**
     * Determine the correct form type based on employee designation.
     */
    public function determineFormType(Employee $employee): string
    {
        $employee->loadMissing('designation');
        $title = strtolower($employee->designation?->name ?? $employee->designation?->title ?? '');

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

        // Form B: Accountant
        if (
            str_contains($title, 'accountant') || 
            str_contains($title, 'হিসাবরক্ষক') ||
            str_contains($title, 'probationary-ac')
        ) {
            return 'accountant';
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

        // Form A: Officer and Assistant Branch Manager (Default for line staff)
        return 'officer_abm';
    }

    /**
     * Submit an evaluation to the next stage.
     */
    public function forward(PromotionEvaluation $evaluation, User $user, string $comments, ?string $recommendationStatus = null, ?int $considerMonths = null, ?array $additionalData = []): void
    {
        DB::transaction(function () use ($evaluation, $user, $comments, $recommendationStatus, $considerMonths, $additionalData) {
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
            
            if ($recommendationStatus) {
                $evaluation->recommendation_status = $recommendationStatus;
                $evaluation->consider_after_months = $considerMonths;
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
     * When rejected/sent back by an approver, it returns to the creator (draft status)
     * so that the initiator can see reviewer comments, revise, and re-submit.
     */
    public function sendBack(PromotionEvaluation $evaluation, User $user, string $comments): void
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

            // Returned back to creator as draft
            $evaluation->status = 'draft';
            $evaluation->save();
        });

        $this->notifyStakeholders($evaluation, 'sent_back', $comments);
    }

    public function hrVerify(PromotionEvaluation $evaluation, User $user, array $verificationData, string $comments): void
    {
        DB::transaction(function () use ($evaluation, $user, $verificationData, $comments) {
            $evaluation->fill([
                'hr_financial_irregularity' => $verificationData['hr_financial_irregularity'] ?? false,
                'hr_disciplinary_action' => $verificationData['hr_disciplinary_action'] ?? false,
                'hr_audit_objection' => $verificationData['hr_audit_objection'] ?? false,
                'hr_leave_without_pay' => $verificationData['hr_leave_without_pay'] ?? false,
                'hr_acr_satisfactory' => $verificationData['hr_acr_satisfactory'] ?? false,
                'status' => 'submitted_to_ed',
            ]);

            $evaluation->signatures()->create([
                'user_id' => $user->id,
                'stage' => 'hr',
                'action' => 'forwarded',
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            $evaluation->save();
        });

        $this->notifyStakeholders($evaluation, 'forwarded', $comments);
    }

    public function edApprove(PromotionEvaluation $evaluation, User $user, string $comments, bool $isApproved): void
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

    /**
     * Get hierarchy level of user:
     * 0 = Head Office / ED / Director
     * 1 = Zonal Manager
     * 2 = Regional Manager
     * 3 = Branch Manager
     * >3 = Subordinate staff (ABM=4, Accountant=5, Officer=7, etc.)
     */
    public function getUserHierarchyLevel(User $user): int
    {
        $roleNames = OrganogramAccessService::mergedRoleNames($user);

        if (
            in_array('Executive Director', $roleNames, true) || 
            OrganogramAccessService::isExecutiveDirector($user) ||
            $user->isSuperAdmin()
        ) {
            return 0;
        }

        if (
            in_array('Director (Microfinance)', $roleNames, true) || 
            in_array('Assistant Director (Microfinance)', $roleNames, true) ||
            in_array('Director Finance and Accounts', $roleNames, true) ||
            in_array('Director Finance and Account', $roleNames, true) ||
            OrganogramAccessService::isMicrofinanceDirector($user) ||
            OrganogramAccessService::isMicrofinanceAssistantDirector($user)
        ) {
            return 0;
        }

        if (
            in_array('Zonal Manager', $roleNames, true) || 
            $user->hasDirectPermission('organogram.zonal_manager') || 
            OrganogramAccessService::isZonalManager($user)
        ) {
            return 1;
        }

        if (
            in_array('Regional Manager', $roleNames, true) || 
            $user->hasDirectPermission('organogram.regional_manager') || 
            OrganogramAccessService::isRegionalManager($user)
        ) {
            return 2;
        }

        if (
            in_array('Branch Manager', $roleNames, true) || 
            $user->hasDirectPermission('branch_manager') || 
            $this->isBranchManager($user)
        ) {
            return 3;
        }

        $user->loadMissing('employee.designation');
        if ($user->employee?->designation) {
            $tier = \App\Support\BranchOrganogram::resolveTier($user->employee->designation->name);
            return (int) ($tier['level'] ?? 999);
        }

        return 999;
    }

    /**
     * Check if a user is a Branch Manager
     */
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

    /**
     * Check if the user is authorized to review/approve the evaluation at its current status.
     * Rules:
     * 1. Cannot review own evaluation.
     * 2. Creator can only manage 'draft' status, never subsequent approval stages.
     * 3. Once signed/forwarded, approver cannot review/approve again.
     * 4. Approver must strictly match the designated stage and regional/zonal jurisdiction.
     */
    public function canUserReview(User $user, PromotionEvaluation $evaluation): bool
    {
        // 1. Cannot review self
        if ($user->employee_id && (int) $user->employee_id === (int) $evaluation->employee_id) {
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

        // 3. If user has already signed (forwarded/submitted/approved), they cannot act again
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

    public function isExecutiveDirector(User $user): bool
    {
        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        if (in_array('Executive Director', $roleNames, true)) {
            return true;
        }

        $user->loadMissing('employee.designation');
        $desigName = mb_strtolower(trim((string) optional($user->employee?->designation)->name));
        return $desigName !== '' && (str_contains($desigName, 'executive director') || str_contains($desigName, 'নির্বাহী পরিচালক'));
    }

    private function isUserAuthorizedForRm(User $user, PromotionEvaluation $evaluation, array $roleNames): bool
    {
        // Branch Manager or Executive Director cannot approve as Regional Manager
        if ($this->isBranchManager($user) || $this->isExecutiveDirector($user)) {
            return false;
        }

        $isRm = in_array('Regional Manager', $roleNames, true)
            || $user->hasDirectPermission('organogram.regional_manager')
            || OrganogramAccessService::isRegionalManager($user);

        if (!$isRm && $user->employee_id) {
            $isRm = \App\Models\RegionalOffice::where('regional_manager_employee_id', $user->employee_id)->exists();
        }

        if (!$isRm) {
            return false;
        }

        // Check regional office jurisdiction
        $rmOfficeIds = [];
        if ($user->employee_id) {
            $rmOfficeIds = \App\Models\RegionalOffice::where('regional_manager_employee_id', $user->employee_id)->pluck('id')->all();
        }
        $branchRoId = $user->employee?->branch?->regional_office_id;
        if ($branchRoId) {
            $rmOfficeIds[] = (int) $branchRoId;
        }
        $rmOfficeIds = array_unique(array_filter($rmOfficeIds));

        if (!empty($rmOfficeIds)) {
            if ($evaluation->regional_office_id) {
                return in_array((int) $evaluation->regional_office_id, $rmOfficeIds, true);
            }
            return true;
        }

        return true;
    }

    private function isUserAuthorizedForZm(User $user, PromotionEvaluation $evaluation, array $roleNames): bool
    {
        // BM, RM and Executive Director cannot approve as ZM
        if ($this->isBranchManager($user) || OrganogramAccessService::isRegionalManager($user) || $this->isExecutiveDirector($user)) {
            return false;
        }

        $isZm = in_array('Zonal Manager', $roleNames, true)
            || $user->hasDirectPermission('organogram.zonal_manager')
            || OrganogramAccessService::isZonalManager($user);

        if (!$isZm && $user->employee_id) {
            $isZm = \App\Models\Zone::where('zone_manager_employee_id', $user->employee_id)->exists();
        }

        if (!$isZm) {
            return false;
        }

        // Check zonal jurisdiction
        $zmZoneIds = [];
        if ($user->employee_id) {
            $zmZoneIds = \App\Models\Zone::where('zone_manager_employee_id', $user->employee_id)->pluck('id')->all();
        }
        $branchZoneId = $user->employee?->branch?->regionalOffice?->zone_id;
        if ($branchZoneId) {
            $zmZoneIds[] = (int) $branchZoneId;
        }
        $zmZoneIds = array_unique(array_filter($zmZoneIds));

        if (!empty($zmZoneIds)) {
            if ($evaluation->zone_id) {
                return in_array((int) $evaluation->zone_id, $zmZoneIds, true);
            }
            return true;
        }

        return true;
    }

    private function isUserAuthorizedForDirectorMf(User $user, array $roleNames): bool
    {
        // Executive Director cannot approve as Director Microfinance
        if ($this->isExecutiveDirector($user)) {
            return false;
        }

        return in_array('Director (Microfinance)', $roleNames, true)
            || in_array('Assistant Director (Microfinance)', $roleNames, true)
            || $user->hasDirectPermission('organogram.microfinance_director')
            || $user->hasDirectPermission('organogram.microfinance_assistant_director')
            || OrganogramAccessService::isMicrofinanceDirector($user)
            || OrganogramAccessService::isMicrofinanceAssistantDirector($user);
    }

    private function isUserAuthorizedForDirectorFa(User $user, array $roleNames): bool
    {
        // Executive Director cannot approve as Director FA
        if ($this->isExecutiveDirector($user)) {
            return false;
        }

        return in_array('Director Finance and Accounts', $roleNames, true)
            || in_array('Director Finance and Account', $roleNames, true)
            || in_array('Director (Finance & Accounts)', $roleNames, true);
    }

    private function isUserAuthorizedForHr(User $user, array $roleNames): bool
    {
        // Executive Director cannot approve as HR; HR stage is strictly for the HR team
        if ($this->isExecutiveDirector($user)) {
            return false;
        }

        return in_array('HR Manager', $roleNames, true)
            || in_array('HR Admin', $roleNames, true)
            || in_array('Assistant Director (HR)', $roleNames, true)
            || ((int) optional($user->employee)->department_id === 5);
    }

    private function isUserAuthorizedForEd(User $user, array $roleNames): bool
    {
        return $this->isExecutiveDirector($user) || $user->isSuperAdmin();
    }

    public function determineNextStatus(PromotionEvaluation $evaluation, string $currentStatus): string
    {
        return match ($currentStatus) {
            'draft' => 'submitted_to_rm',
            'submitted_to_rm' => 'submitted_to_zm',
            'submitted_to_zm' => $evaluation->form_type === 'accountant' ? 'submitted_to_director_fa' : 'submitted_to_director',
            'submitted_to_director', 'submitted_to_director_fa' => 'submitted_to_hr',
            'submitted_to_hr' => 'submitted_to_ed',
            'submitted_to_ed' => 'approved',
            default => $currentStatus,
        };
    }

    public function determineStageRole(string $status): string
    {
        return match ($status) {
            'draft' => 'initiator',
            'submitted_to_rm' => 'rm',
            'submitted_to_zm' => 'zm',
            'submitted_to_director' => 'director_mf',
            'submitted_to_director_fa' => 'director_fa',
            'submitted_to_hr' => 'hr',
            'submitted_to_ed' => 'ed',
            default => 'unknown',
        };
    }

    public function getStageLabel(string $status, string $lang = 'bn'): string
    {
        $labelsBn = [
            'draft' => 'খসড়া (Draft)',
            'submitted_to_rm' => 'আঞ্চলিক ব্যবস্থাপক (RM)',
            'submitted_to_zm' => 'জোনাল ম্যানেজার (ZM)',
            'submitted_to_director' => 'পরিচালক (মাইক্রোফাইন্যান্স)',
            'submitted_to_director_fa' => 'পরিচালক (অর্থ ও হিসাব)',
            'submitted_to_hr' => 'মানবসম্পদ বিভাগ (HR)',
            'submitted_to_ed' => 'নির্বাহী পরিচালক (ED)',
            'approved' => 'অনুমোদিত (Approved)',
            'rejected' => 'বাতিল (Rejected)',
        ];

        $labelsEn = [
            'draft' => 'Draft',
            'submitted_to_rm' => 'Regional Manager (RM)',
            'submitted_to_zm' => 'Zonal Manager (ZM)',
            'submitted_to_director' => 'Director (Microfinance)',
            'submitted_to_director_fa' => 'Director (Finance & Accounts)',
            'submitted_to_hr' => 'Human Resources (HR)',
            'submitted_to_ed' => 'Executive Director (ED)',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
        ];

        return $lang === 'bn' ? ($labelsBn[$status] ?? $status) : ($labelsEn[$status] ?? $status);
    }

    /**
     * Send in-app notification to the relevant stakeholders based on the workflow action.
     */
    public function notifyStakeholders(PromotionEvaluation $evaluation, string $action, ?string $comments = null): void
    {
        try {
            $evaluation->loadMissing(['employee.designation', 'employee.branch.regionalOffice.zone', 'signatures']);
            $emp = $evaluation->employee;
            $empName = $emp?->name_bn ?: ($emp?->name_en ?: 'কর্মী');
            $pin = $emp?->pin ? "({$emp->pin})" : '';
            $link = "/promotion-evaluations/{$evaluation->id}";

            if ($action === 'submitted' || $action === 'forwarded') {
                $stageLabel = $this->getStageLabel($evaluation->status, 'bn');
                $title = "পদোন্নতি মূল্যায়ন: {$stageLabel}";
                $message = "কর্মী {$empName} {$pin}-এর পদোন্নতি মূল্যায়ন আপনার পর্যালোচনার জন্য অপেক্ষমাণ।";
                
                $targets = $this->getTargetReviewerUsers($evaluation, $evaluation->status);
                if (!empty($targets)) {
                    Notification::send($targets, new PromotionEvaluationNotification($title, $message, 'info', $link, $evaluation->id));
                }
            } elseif ($action === 'sent_back') {
                $initiator = User::find($evaluation->initiator_id);
                if ($initiator) {
                    $title = 'পদোন্নতি মূল্যায়ন ফেরত পাঠানো হয়েছে ⚠️';
                    $reason = $comments ? "কারণ: {$comments}" : 'সংশোধনের জন্য ফেরত পাঠানো হয়েছে।';
                    $message = "কর্মী {$empName} {$pin}-এর পদোন্নতি মূল্যায়ন সংশোধনের জন্য ফেরত পাঠানো হয়েছে। {$reason}";
                    $initiator->notify(new PromotionEvaluationNotification($title, $message, 'warning', $link, $evaluation->id));
                }
            } elseif ($action === 'approved') {
                $title = 'পদোন্নতি মূল্যায়ন চূড়ান্তভাবে অনুমোদিত 🎉';
                $message = "কর্মী {$empName} {$pin}-এর পদোন্নতি মূল্যায়ন নির্বাহী পরিচালক কর্তৃক চূড়ান্ত অনুমোদন পেয়েছে।";
                
                $recipients = collect();
                if ($evaluation->initiator_id) {
                    $initiatorUser = User::find($evaluation->initiator_id);
                    if ($initiatorUser) $recipients->push($initiatorUser);
                }
                $signerIds = $evaluation->signatures->pluck('user_id')->unique()->all();
                if (!empty($signerIds)) {
                    $recipients = $recipients->merge(User::whereIn('id', $signerIds)->get());
                }
                $recipients = $recipients->filter()->unique('id')->values();
                if ($recipients->isNotEmpty()) {
                    Notification::send($recipients, new PromotionEvaluationNotification($title, $message, 'success', $link, $evaluation->id));
                }
            } elseif ($action === 'rejected') {
                $initiator = User::find($evaluation->initiator_id);
                if ($initiator) {
                    $title = 'পদোন্নতি মূল্যায়ন নামঞ্জুর করা হয়েছে';
                    $message = "কর্মী {$empName} {$pin}-এর পদোন্নতি মূল্যায়নটি নামঞ্জুর করা হয়েছে।";
                    $initiator->notify(new PromotionEvaluationNotification($title, $message, 'error', $link, $evaluation->id));
                }
            }
        } catch (\Throwable $e) {
            Log::error('Failed to send promotion evaluation notification: ' . $e->getMessage());
        }
    }

    /**
     * Resolve users authorized to review at the specified stage.
     */
    public function getTargetReviewerUsers(PromotionEvaluation $evaluation, string $status): array
    {
        $users = collect();
        $evaluation->loadMissing(['employee.branch.regionalOffice.zone']);

        switch ($status) {
            case 'submitted_to_rm':
                $regOfficeId = $evaluation->regional_office_id ?? $evaluation->employee?->branch?->regional_office_id;
                if ($regOfficeId) {
                    $ro = \App\Models\RegionalOffice::find($regOfficeId);
                    if ($ro?->regional_manager_employee_id) {
                        $u = User::where('employee_id', $ro->regional_manager_employee_id)->first();
                        if ($u) $users->push($u);
                    }
                }
                $rms = User::whereHas('role', fn($q) => $q->where('name', 'Regional Manager'))
                    ->orWhereHas('roles', fn($q) => $q->where('name', 'Regional Manager'))
                    ->with('employee.branch')
                    ->get()
                    ->filter(function ($u) use ($regOfficeId) {
                        if (!$regOfficeId) return true;
                        return (int) $u->employee?->branch?->regional_office_id === (int) $regOfficeId;
                    });
                $users = $users->merge($rms);
                break;

            case 'submitted_to_zm':
                $zoneId = $evaluation->zone_id ?? $evaluation->employee?->branch?->regionalOffice?->zone_id;
                if ($zoneId) {
                    $z = \App\Models\Zone::find($zoneId);
                    if ($z?->zone_manager_employee_id) {
                        $u = User::where('employee_id', $z->zone_manager_employee_id)->first();
                        if ($u) $users->push($u);
                    }
                }
                $zms = User::whereHas('role', fn($q) => $q->where('name', 'Zonal Manager'))
                    ->orWhereHas('roles', fn($q) => $q->where('name', 'Zonal Manager'))
                    ->with('employee.branch.regionalOffice')
                    ->get()
                    ->filter(function ($u) use ($zoneId) {
                        if (!$zoneId) return true;
                        return (int) $u->employee?->branch?->regionalOffice?->zone_id === (int) $zoneId;
                    });
                $users = $users->merge($zms);
                break;

            case 'submitted_to_director':
                $directors = User::whereHas('role', fn($q) => $q->whereIn('name', ['Director (Microfinance)', 'Assistant Director (Microfinance)']))
                    ->orWhereHas('roles', fn($q) => $q->whereIn('name', ['Director (Microfinance)', 'Assistant Director (Microfinance)']))
                    ->get();
                $users = $users->merge($directors);
                break;

            case 'submitted_to_director_fa':
                $directorsFa = User::whereHas('role', fn($q) => $q->whereIn('name', ['Director Finance and Accounts', 'Director Finance and Account', 'Director (Finance & Accounts)']))
                    ->orWhereHas('roles', fn($q) => $q->whereIn('name', ['Director Finance and Accounts', 'Director Finance and Account', 'Director (Finance & Accounts)']))
                    ->get();
                $users = $users->merge($directorsFa);
                break;

            case 'submitted_to_hr':
                $hrs = User::whereHas('role', fn($q) => $q->whereIn('name', ['HR Manager', 'HR Admin', 'Assistant Director (HR)']))
                    ->orWhereHas('roles', fn($q) => $q->whereIn('name', ['HR Manager', 'HR Admin', 'Assistant Director (HR)']))
                    ->orWhereHas('employee', fn($q) => $q->where('department_id', 5))
                    ->get();
                $users = $users->merge($hrs);
                break;

            case 'submitted_to_ed':
                $eds = User::whereHas('role', fn($q) => $q->where('name', 'Executive Director'))
                    ->orWhereHas('roles', fn($q) => $q->where('name', 'Executive Director'))
                    ->get();
                if ($eds->isEmpty()) {
                    $eds = User::whereHas('role', fn($q) => $q->where('name', 'Super Admin'))->get();
                }
                $users = $users->merge($eds);
                break;
        }

        return $users->unique('id')
            ->reject(fn($u) => (int) $u->id === (int) $evaluation->initiator_id)
            ->values()
            ->all();
    }
}
