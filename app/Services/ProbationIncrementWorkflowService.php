<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\ProbationIncrementEvaluation;
use App\Models\ProbationIncrementEvaluationSignature;
use App\Models\User;
use App\Notifications\ProbationIncrementEvaluationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class ProbationIncrementWorkflowService
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

        // Form A: Officer and Assistant Branch Manager (Default for field / line staff)
        return 'officer_abm';
    }

    /**
     * Submit / Forward an evaluation to the next stage.
     */
    public function forward(ProbationIncrementEvaluation $evaluation, User $user, string $comments, ?string $recommendationStatus = null, ?array $additionalData = []): void
    {
        DB::transaction(function () use ($evaluation, $user, $comments, $recommendationStatus, $additionalData) {
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
    public function sendBack(ProbationIncrementEvaluation $evaluation, User $user, string $comments): void
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

    public function hrVerify(ProbationIncrementEvaluation $evaluation, User $user, array $verificationData, string $comments): void
    {
        DB::transaction(function () use ($evaluation, $user, $verificationData, $comments) {
            $evaluation->fill([
                'hr_financial_irregularity' => $verificationData['hr_financial_irregularity'] ?? false,
                'hr_disciplinary_action' => $verificationData['hr_disciplinary_action'] ?? false,
                'hr_audit_objection' => $verificationData['hr_audit_objection'] ?? false,
                'hr_leave_without_pay' => $verificationData['hr_leave_without_pay'] ?? false,
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

    public function edApprove(ProbationIncrementEvaluation $evaluation, User $user, string $comments, bool $isApproved): void
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
        return $title === 'branch manager' || str_contains($title, 'branch manager') || str_contains($title, ' শাখা ব্যবস্থাপক');
    }

    /**
     * Hierarchy level of the user:
     * 0 = Head Office / ED / Director / Super Admin
     * 1 = Zonal Manager
     * 2 = Regional Manager
     * 3 = Branch Manager
     * >3 = Subordinate staff
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

    public function canUserReview(User $user, ProbationIncrementEvaluation $evaluation): bool
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

    private function isUserAuthorizedForRm(User $user, ProbationIncrementEvaluation $evaluation, array $roleNames): bool
    {
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

    private function isUserAuthorizedForZm(User $user, ProbationIncrementEvaluation $evaluation, array $roleNames): bool
    {
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
        if ($this->isExecutiveDirector($user)) {
            return false;
        }

        return in_array('Director Finance and Accounts', $roleNames, true)
            || in_array('Director Finance and Account', $roleNames, true)
            || in_array('Director (Finance & Accounts)', $roleNames, true);
    }

    private function isUserAuthorizedForHr(User $user, array $roleNames): bool
    {
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

    public function determineNextStatus(ProbationIncrementEvaluation $evaluation, string $currentStatus): string
    {
        if ($currentStatus === 'draft') {
            $evaluation->loadMissing('initiator');
            $initiator = $evaluation->initiator;
            $initiatorLevel = $initiator ? $this->getUserHierarchyLevel($initiator) : 3;
            if ($initiatorLevel === 2) {
                return 'submitted_to_zm';
            } elseif ($initiatorLevel === 1) {
                return $evaluation->form_type === 'accountant' ? 'submitted_to_director_fa' : 'submitted_to_director';
            } elseif ($initiatorLevel === 0) {
                return 'submitted_to_hr';
            }
            return 'submitted_to_rm';
        }

        return match ($currentStatus) {
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
            'submitted_to_director' => 'মাইক্রোফাইন্যান্স বিভাগ',
            'submitted_to_director_fa' => 'অর্থ ও হিসাব বিভাগ',
            'submitted_to_hr' => 'মানবসম্পদ বিভাগ (HR)',
            'submitted_to_ed' => 'নির্বাহী পরিচালক (ED)',
            'approved' => 'অনুমোদিত (Approved)',
            'rejected' => 'বাতিল (Rejected)',
        ];

        $labelsEn = [
            'draft' => 'Draft',
            'submitted_to_rm' => 'Regional Manager',
            'submitted_to_zm' => 'Zonal Manager',
            'submitted_to_director' => 'Director (MF)',
            'submitted_to_director_fa' => 'Director (F&A)',
            'submitted_to_hr' => 'HR Department',
            'submitted_to_ed' => 'Executive Director',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
        ];

        return ($lang === 'bn' ? $labelsBn[$status] : $labelsEn[$status]) ?? $status;
    }

    public function notifyStakeholders(ProbationIncrementEvaluation $evaluation, string $action, ?string $comments = null): void
    {
        try {
            $evaluation->loadMissing(['employee.designation', 'employee.branch.regionalOffice.zone', 'signatures']);
            $emp = $evaluation->employee;
            $empName = $emp?->name_bn ?: ($emp?->name_en ?: 'কর্মী');
            $pin = $emp?->pin ? "({$emp->pin})" : '';
            $link = "/probation-increment-evaluations/{$evaluation->id}";

            if ($action === 'submitted' || $action === 'forwarded') {
                $stageLabel = $this->getStageLabel($evaluation->status, 'bn');
                $title = "শিক্ষানবিস ইনক্রিমেন্ট মূল্যায়ন: {$stageLabel}";
                $message = "কর্মী {$empName} {$pin}-এর ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন আপনার পর্যালোচনার জন্য অপেক্ষমাণ।";
                
                $targets = $this->getTargetReviewerUsers($evaluation, $evaluation->status);
                if (!empty($targets)) {
                    Notification::send($targets, new ProbationIncrementEvaluationNotification($title, $message, 'info', $link, $evaluation->id));
                }
            } elseif ($action === 'sent_back') {
                $initiator = User::find($evaluation->initiator_id);
                if ($initiator) {
                    $title = 'শিক্ষানবিস ইনক্রিমেন্ট মূল্যায়ন ফেরত পাঠানো হয়েছে ⚠️';
                    $reason = $comments ? "কারণ: {$comments}" : 'সংশোধনের জন্য ফেরত পাঠানো হয়েছে।';
                    $message = "কর্মী {$empName} {$pin}-এর ইনক্রিমেন্ট মূল্যায়ন সংশোধনের জন্য ফেরত পাঠানো হয়েছে। {$reason}";
                    $initiator->notify(new ProbationIncrementEvaluationNotification($title, $message, 'warning', $link, $evaluation->id));
                }
            } elseif ($action === 'approved') {
                $title = 'শিক্ষানবিস ইনক্রিমেন্ট মূল্যায়ন চূড়ান্তভাবে অনুমোদিত 🎉';
                $message = "কর্মী {$empName} {$pin}-এর ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন নির্বাহী পরিচালক কর্তৃক চূড়ান্ত অনুমোদন পেয়েছে।";
                
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
                    Notification::send($recipients, new ProbationIncrementEvaluationNotification($title, $message, 'success', $link, $evaluation->id));
                }
            } elseif ($action === 'rejected') {
                $initiator = User::find($evaluation->initiator_id);
                if ($initiator) {
                    $title = 'শিক্ষানবিস ইনক্রিমেন্ট মূল্যায়ন নামঞ্জুর করা হয়েছে';
                    $message = "কর্মী {$empName} {$pin}-এর ইনক্রিমেন্ট মূল্যায়নটি নামঞ্জুর করা হয়েছে।";
                    $initiator->notify(new ProbationIncrementEvaluationNotification($title, $message, 'error', $link, $evaluation->id));
                }
            }
        } catch (\Throwable $e) {
            Log::error('Failed to send probation increment evaluation notification: ' . $e->getMessage());
        }
    }

    public function getTargetReviewerUsers(ProbationIncrementEvaluation $evaluation, string $status): array
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
