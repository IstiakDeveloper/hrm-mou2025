<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\ResignationApplication;
use App\Models\Separation;
use App\Models\User;
use App\Notifications\ResignationApplicationNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class ResignationWorkflowService
{
    /**
     * Map workflow status to readable label.
     */
    public function getStageLabel(string $status, string $lang = 'bn'): string
    {
        $labelsBn = [
            'draft' => 'খসড়া / আবেদনকারী',
            'submitted_to_supervisor' => '১ম তত্ত্বাবধায়ক পর্যালোচনা',
            'submitted_to_rm' => 'আঞ্চলিক ব্যবস্থাপক পর্যালোচনা',
            'submitted_to_zm' => 'জোনাল ম্যানেজার পর্যালোচনা',
            'submitted_to_director' => 'বিভাগীয় প্রধান পর্যালোচনা',
            'submitted_to_hr' => 'এইচআর যাচাইকরণ',
            'submitted_to_ed' => 'নির্বাহী পরিচালক অনুমোদন',
            'approved' => 'অনুমোদিত',
            'rejected' => 'প্রত্যাখ্যাত',
            'sent_back' => 'সংশোধনের জন্য প্রেরিত',
        ];

        $labelsEn = [
            'draft' => 'Draft / Applicant',
            'submitted_to_supervisor' => '1st Supervisor Review',
            'submitted_to_rm' => 'RM Review',
            'submitted_to_zm' => 'ZM Review',
            'submitted_to_director' => 'Department Head Review',
            'submitted_to_hr' => 'HR Verification',
            'submitted_to_ed' => 'Executive Director Approval',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'sent_back' => 'Sent Back for Revision',
        ];

        return $lang === 'bn' ? ($labelsBn[$status] ?? $status) : ($labelsEn[$status] ?? $status);
    }

    public function isHeadOffice(ResignationApplication $application): bool
    {
        return (bool) $application->is_head_office;
    }

    /**
     * Determine next status in the workflow.
     * For Head Office staff: jumps directly from Draft to Department Head (submitted_to_director),
     * completely skipping 1st Supervisor, RM, and ZM field stages.
     */
    public function determineNextStatus(ResignationApplication $application, string $currentStatus): string
    {
        $application->loadMissing(['employee.designation', 'branch', 'department']);
        $employee = $application->employee;
        $title = mb_strtolower(trim((string) optional($employee?->designation)->name));

        $isHeadOffice = $this->isHeadOffice($application);
        $isBm = str_contains($title, 'branch manager') || str_contains($title, 'শাখা ব্যবস্থাপক');
        $isRm = str_contains($title, 'regional manager') || str_contains($title, 'আঞ্চলিক ব্যবস্থাপক');
        $isZm = str_contains($title, 'zonal manager') || str_contains($title, 'জোনাল ম্যানেজার');
        $isDirector = str_contains($title, 'director') || str_contains($title, 'পরিচালক');

        if ($currentStatus === 'draft' || $currentStatus === 'sent_back') {
            // Head Office staff: goes DIRECTLY to Department Head!
            if ($isHeadOffice) {
                if ($isDirector) {
                    return 'submitted_to_ed';
                }
                return 'submitted_to_director';
            }

            // Field Branch hierarchy
            if ($isDirector) {
                return 'submitted_to_ed';
            }
            if ($isZm) {
                return 'submitted_to_director';
            }
            if ($isRm) {
                return 'submitted_to_zm';
            }
            if ($isBm) {
                return 'submitted_to_rm';
            }

            return 'submitted_to_supervisor';
        }

        return match ($currentStatus) {
            'submitted_to_supervisor' => 'submitted_to_rm',
            'submitted_to_rm' => 'submitted_to_zm',
            'submitted_to_zm' => 'submitted_to_director',
            'submitted_to_director' => 'submitted_to_hr',
            'submitted_to_hr' => 'submitted_to_ed',
            'submitted_to_ed' => 'approved',
            default => $currentStatus,
        };
    }

    public function determineStageRole(string $status): string
    {
        return match ($status) {
            'draft', 'sent_back' => 'applicant',
            'submitted_to_supervisor' => 'supervisor',
            'submitted_to_rm' => 'rm',
            'submitted_to_zm' => 'zm',
            'submitted_to_director' => 'director',
            'submitted_to_hr' => 'hr',
            'submitted_to_ed' => 'ed',
            default => 'applicant',
        };
    }

    /**
     * Check if a user is a Branch Manager
     */
    public function isBranchManager(User $user): bool
    {
        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        if (
            in_array('Regional Manager', $roleNames, true) ||
            in_array('Zonal Manager', $roleNames, true) ||
            in_array('Director (Microfinance)', $roleNames, true) ||
            in_array('Executive Director', $roleNames, true)
        ) {
            return false;
        }

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

    public function isExecutiveDirector(User $user): bool
    {
        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        if (in_array('Executive Director', $roleNames, true) || OrganogramAccessService::isExecutiveDirector($user)) {
            return true;
        }

        $user->loadMissing('employee.designation');
        $desigName = mb_strtolower(trim((string) optional($user->employee?->designation)->name));

        return $desigName !== '' && (str_contains($desigName, 'executive director') || str_contains($desigName, 'নির্বাহী পরিচালক'));
    }

    /**
     * Check if user can review/approve the application at its current status.
     */
    public function canUserReview(User $user, ResignationApplication $application): bool
    {
        // 1. Applicant cannot review self
        if ($user->employee_id && (int) $user->employee_id === (int) $application->employee_id) {
            return false;
        }

        $status = $application->status;

        // Draft or sent_back: only initiator or employee can edit/submit
        if ($status === 'draft' || $status === 'sent_back') {
            return (int) $application->initiator_id === (int) $user->id
                || ($user->employee_id && (int) $application->employee_id === (int) $user->employee_id);
        }

        // Applicant/Initiator can never review subsequent stages
        if ((int) $application->initiator_id === (int) $user->id && ! $user->isSuperAdmin()) {
            return false;
        }

        // User who already signed cannot review again in the same cycle
        $alreadySigned = $application->signatures
            ->where('user_id', $user->id)
            ->whereIn('action', ['submitted', 'forwarded', 'approved'])
            ->isNotEmpty();
        if ($alreadySigned && ! $user->isSuperAdmin()) {
            return false;
        }

        $roleNames = OrganogramAccessService::mergedRoleNames($user);

        return match ($status) {
            'submitted_to_supervisor' => $this->isUserAuthorizedForSupervisor($user, $application, $roleNames),
            'submitted_to_rm' => $this->isUserAuthorizedForRm($user, $application, $roleNames),
            'submitted_to_zm' => $this->isUserAuthorizedForZm($user, $application, $roleNames),
            'submitted_to_director' => $this->isUserAuthorizedForDirector($user, $application, $roleNames),
            'submitted_to_hr' => $this->isUserAuthorizedForHr($user, $roleNames),
            'submitted_to_ed' => $this->isUserAuthorizedForEd($user, $roleNames),
            default => false,
        };
    }

    private function isUserAuthorizedForSupervisor(User $user, ResignationApplication $application, array $roleNames): bool
    {
        if ($this->isExecutiveDirector($user)) {
            return false;
        }

        // If in branch, supervisor is Branch Manager
        if ($application->branch_id) {
            $userBranchId = $user->employee?->current_branch_id ?? $user->branch_id;
            if ($userBranchId && (int) $userBranchId === (int) $application->branch_id) {
                return $this->isBranchManager($user) || $user->isSuperAdmin();
            }
        }

        // If in department / head office, supervisor is Department Head
        if ($application->department_id) {
            $headedDeptIds = OrganogramAccessService::headedDepartmentIdsForUser($user);
            if (in_array((int) $application->department_id, $headedDeptIds, true)) {
                return true;
            }
        }

        return $this->isBranchManager($user) || $user->isSuperAdmin();
    }

    private function isUserAuthorizedForRm(User $user, ResignationApplication $application, array $roleNames): bool
    {
        if ($this->isBranchManager($user) || $this->isExecutiveDirector($user)) {
            return false;
        }

        $isRm = in_array('Regional Manager', $roleNames, true)
            || $user->hasDirectPermission('organogram.regional_manager')
            || OrganogramAccessService::isRegionalManager($user);

        if (! $isRm && $user->employee_id) {
            $isRm = \App\Models\RegionalOffice::where('regional_manager_employee_id', $user->employee_id)->exists();
        }

        if (! $isRm && ! $user->isSuperAdmin()) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
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

        if (! empty($rmOfficeIds) && $application->regional_office_id) {
            return in_array((int) $application->regional_office_id, $rmOfficeIds, true);
        }

        return true;
    }

    private function isUserAuthorizedForZm(User $user, ResignationApplication $application, array $roleNames): bool
    {
        if ($this->isBranchManager($user) || OrganogramAccessService::isRegionalManager($user) || $this->isExecutiveDirector($user)) {
            return false;
        }

        $isZm = in_array('Zonal Manager', $roleNames, true)
            || $user->hasDirectPermission('organogram.zonal_manager')
            || OrganogramAccessService::isZonalManager($user);

        if (! $isZm && $user->employee_id) {
            $isZm = \App\Models\Zone::where('zone_manager_employee_id', $user->employee_id)->exists();
        }

        if (! $isZm && ! $user->isSuperAdmin()) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
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

        if (! empty($zmZoneIds) && $application->zone_id) {
            return in_array((int) $application->zone_id, $zmZoneIds, true);
        }

        return true;
    }

    private function isUserAuthorizedForDirector(User $user, ResignationApplication $application, array $roleNames): bool
    {
        if ($this->isExecutiveDirector($user)) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        // If employee belongs to a specific department, their Department Head is authorized
        if ($application->department_id) {
            $headedDeptIds = OrganogramAccessService::headedDepartmentIdsForUser($user);
            if (in_array((int) $application->department_id, $headedDeptIds, true)) {
                return true;
            }
        }

        // Check if director of microfinance
        $isMfDirector = in_array('Director (Microfinance)', $roleNames, true)
            || in_array('Assistant Director (Microfinance)', $roleNames, true)
            || OrganogramAccessService::isMicrofinanceDirector($user)
            || OrganogramAccessService::isMicrofinanceAssistantDirector($user);

        // Check if director of finance
        $isFaDirector = in_array('Director Finance and Accounts', $roleNames, true)
            || in_array('Director Finance and Account', $roleNames, true)
            || OrganogramAccessService::isFinanceAndAccountsDepartmentHead($user);

        // Or any head office department head
        $isDeptHead = OrganogramAccessService::isHeadOfficeDepartmentHead($user);

        return $isMfDirector || $isFaDirector || $isDeptHead;
    }

    private function isUserAuthorizedForHr(User $user, array $roleNames): bool
    {
        if ($this->isExecutiveDirector($user)) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
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

    /**
     * Submit or forward resignation application to next stage.
     */
    public function forward(ResignationApplication $application, User $user, string $comments, ?string $recommendedDate = null): void
    {
        $currentStatus = $application->status;

        DB::transaction(function () use ($application, $user, $comments, $recommendedDate, $currentStatus) {
            $nextStatus = $this->determineNextStatus($application, $currentStatus);
            $stage = $this->determineStageRole($currentStatus);

            $application->signatures()->create([
                'user_id' => $user->id,
                'stage' => $stage,
                'action' => in_array($currentStatus, ['draft', 'sent_back'], true) ? 'submitted' : 'forwarded',
                'recommended_date' => $recommendedDate ? Carbon::parse($recommendedDate) : null,
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            $application->status = $nextStatus;
            $application->save();
        });

        $this->notifyStakeholders($application, in_array($currentStatus, ['draft', 'sent_back'], true) ? 'submitted' : 'forwarded', $comments);
    }

    /**
     * Send back resignation application for revision.
     */
    public function sendBack(ResignationApplication $application, User $user, string $comments): void
    {
        DB::transaction(function () use ($application, $user, $comments) {
            $currentStatus = $application->status;
            $stage = $this->determineStageRole($currentStatus);

            $application->signatures()->create([
                'user_id' => $user->id,
                'stage' => $stage,
                'action' => 'sent_back',
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            $application->status = 'sent_back';
            $application->save();
        });

        $this->notifyStakeholders($application, 'sent_back', $comments);
    }

    /**
     * Executive Director approval or rejection.
     */
    public function edApprove(ResignationApplication $application, User $user, string $comments, bool $isApproved, ?string $effectiveDate = null): void
    {
        DB::transaction(function () use ($application, $user, $comments, $isApproved, $effectiveDate) {
            $finalEffectiveDate = $effectiveDate ? Carbon::parse($effectiveDate) : $application->effective_date;

            $application->signatures()->create([
                'user_id' => $user->id,
                'stage' => 'ed',
                'action' => $isApproved ? 'approved' : 'rejected',
                'recommended_date' => $finalEffectiveDate,
                'comments' => $comments,
                'signed_at' => now(),
            ]);

            $application->status = $isApproved ? 'approved' : 'rejected';
            $application->approved_effective_date = $isApproved ? $finalEffectiveDate : null;
            $application->ed_decision_notes = $comments;
            $application->save();

            if ($isApproved) {
                $this->syncToSeparation($application, $user);
            }
        });

        $this->notifyStakeholders($application, $isApproved ? 'approved' : 'rejected', $comments);
    }

    /**
     * Automatically create or link a Separation record when ED approves.
     */
    public function syncToSeparation(ResignationApplication $application, User $actorUser): ?Separation
    {
        if ($application->separation_id) {
            return $application->separation;
        }

        $effectiveDate = $application->approved_effective_date ?? $application->effective_date;
        $categoryLabel = ResignationApplication::reasonCategoryLabels()[$application->reason_category] ?? $application->reason_category;

        $separation = Separation::create([
            'employee_id' => $application->employee_id,
            'separation_date' => $effectiveDate,
            'type_of_separation' => 'Resignation',
            'cause_of_separation' => $categoryLabel,
            'reason' => $application->reason_detail ?? 'Employee resignation application approved by Executive Director (App: '.$application->application_no.')',
            'status' => 'approved',
            'approved_by' => $actorUser->id,
        ]);

        $application->separation_id = $separation->id;
        $application->save();

        return $separation;
    }

    /**
     * Send in-app notifications to stakeholders.
     */
    public function notifyStakeholders(ResignationApplication $application, string $action, ?string $comments = null): void
    {
        try {
            $application->loadMissing(['employee', 'initiator']);
            $employeeName = $application->employee?->name_en ?? $application->employee?->name_bn ?? 'Employee';
            $link = "/resignation-applications/{$application->id}";

            if (in_array($action, ['submitted', 'forwarded'], true)) {
                $targetUsers = $this->getTargetReviewerUsers($application, $application->status);
                if (! empty($targetUsers)) {
                    $title = 'চাকরি হতে অব্যাহতির আবেদন পর্যালোচনার জন্য অপেক্ষমাণ';
                    $message = "কর্মী {$employeeName}-এর অব্যাহতির আবেদন ({$application->application_no}) আপনার পর্যালোচনার জন্য জমা হয়েছে।";
                    Notification::send($targetUsers, new ResignationApplicationNotification($title, $message, 'info', $link, $application->id));
                }
            } elseif ($action === 'sent_back') {
                $initiator = $application->initiator;
                if ($initiator) {
                    $title = 'অব্যাহতির আবেদন সংশোধনের জন্য ফেরত পাঠানো হয়েছে';
                    $message = "আপনার দাখিলকৃত অব্যাহতির আবেদনটি ({$application->application_no}) পর্যালোচক কর্তৃক সংশোধনের জন্য ফেরত পাঠানো হয়েছে। মন্তব্য: {$comments}";
                    $initiator->notify(new ResignationApplicationNotification($title, $message, 'warning', $link, $application->id));
                }
            } elseif ($action === 'approved') {
                $recipients = collect([$application->initiator])->filter();
                $hrUsers = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['HR Manager', 'HR Admin', 'Assistant Director (HR)']))->get();
                $allRecipients = $recipients->merge($hrUsers)->unique('id');

                $title = 'চাকরি হতে অব্যাহতির আবেদন অনুমোদিত হয়েছে';
                $message = "কর্মী {$employeeName}-এর অব্যাহতির আবেদন ({$application->application_no}) নির্বাহী পরিচালক কর্তৃক চূড়ান্তভাবে অনুমোদিত হয়েছে।";
                Notification::send($allRecipients, new ResignationApplicationNotification($title, $message, 'success', $link, $application->id));
            } elseif ($action === 'rejected') {
                $initiator = $application->initiator;
                if ($initiator) {
                    $title = 'চাকরি হতে অব্যাহতির আবেদন প্রত্যাখ্যাত হয়েছে';
                    $message = "কর্মী {$employeeName}-এর অব্যাহতির আবেদনটি ({$application->application_no}) বাতিল করা হয়েছে।";
                    $initiator->notify(new ResignationApplicationNotification($title, $message, 'error', $link, $application->id));
                }
            }
        } catch (\Throwable $e) {
            Log::error('Failed to send resignation application notification: '.$e->getMessage());
        }
    }

    /**
     * Get target reviewer users for a given stage.
     */
    public function getTargetReviewerUsers(ResignationApplication $application, string $status): array
    {
        return match ($status) {
            'submitted_to_supervisor' => $application->branch_id
                ? User::where(function ($q) use ($application) {
                    $q->where('branch_id', $application->branch_id)
                        ->orWhereHas('employee', fn ($eq) => $eq->where('current_branch_id', $application->branch_id));
                })->get()->filter(fn (User $u) => $this->canUserReview($u, $application))->all()
                : [],
            'submitted_to_rm' => $application->regional_office_id
                ? User::whereHas('employee.branch', fn ($q) => $q->where('regional_office_id', $application->regional_office_id))
                    ->get()->filter(fn (User $u) => $this->canUserReview($u, $application))->all()
                : [],
            'submitted_to_zm' => $application->zone_id
                ? User::whereHas('employee.branch.regionalOffice', fn ($q) => $q->where('zone_id', $application->zone_id))
                    ->get()->filter(fn (User $u) => $this->canUserReview($u, $application))->all()
                : [],
            'submitted_to_director' => (function () use ($application) {
                $users = User::whereHas('roles', fn ($q) => $q->whereIn('name', [
                    'Director (Microfinance)',
                    'Assistant Director (Microfinance)',
                    'Director Finance and Accounts',
                    'Director Finance and Account',
                ]))->get();

                if ($application->department_id) {
                    $dept = \App\Models\Department::find($application->department_id);
                    if ($dept?->head_employee_id) {
                        $deptHeadUsers = User::where('employee_id', $dept->head_employee_id)->get();
                        $users = $users->merge($deptHeadUsers);
                    }
                }

                return $users->unique('id')->all();
            })(),
            'submitted_to_hr' => User::whereHas('roles', fn ($q) => $q->whereIn('name', ['HR Manager', 'HR Admin', 'Assistant Director (HR)']))
                ->get()->all(),
            'submitted_to_ed' => User::whereHas('roles', fn ($q) => $q->where('name', 'Executive Director'))
                ->get()->all(),
            default => [],
        };
    }
}

