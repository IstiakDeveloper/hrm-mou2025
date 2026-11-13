<?php

namespace App\Services\Mobile;

use App\Models\LeaveApplication;
use App\Models\User;
use App\Services\OrganogramAccessService;
use App\Support\PermissionRegistry;
use App\Support\SectionRegistry;
use Illuminate\Http\Request;

class MobileBootstrapService
{
    /**
     * @return array<string, mixed>
     */
    public function build(User $user, Request $request): array
    {
        $user->loadMissing(['role', 'roles', 'employee.branch', 'employee.designation', 'branch']);

        $permissions = $this->resolvedPermissionKeys($user);
        $blockedSections = $user->effectiveBlockedSections();
        $sections = [];

        foreach (SectionRegistry::sections() as $id => $meta) {
            $accessible = $user->canAccessSection($id);
            $sections[] = [
                'id' => $id,
                'label' => $meta['label'],
                'description' => $meta['description'],
                'accessible' => $accessible,
                // Placeholders stay visible only as discovery — never as "complete".
                'implemented' => ! in_array($id, ['training', 'store'], true), // inventory has read catalog; write ops still web
            ];
        }

        $activePenalty = $user->activeMovementPenalty;
        $canReviewLeave = $user->isSuperAdmin() || $user->hasPermission('leave-applications.approve');
        $pendingLeaveCount = 0;
        if ($canReviewLeave) {
            $leaveQuery = LeaveApplication::query()->where('status', 'pending');
            OrganogramAccessService::constrainLeaveApplications($leaveQuery, $user);
            if ($user->employee_id) {
                $leaveQuery->where('employee_id', '!=', $user->employee_id);
            }
            $pendingLeaveCount = (int) $leaveQuery->count();
        }

        $homeMode = $canReviewLeave ? 'reviewer' : 'employee';
        if ($user->isBranchAccount()) {
            $homeMode = 'branch';
        }

        return [
            'server_time' => now('Asia/Dhaka')->toIso8601String(),
            'timezone' => 'Asia/Dhaka',
            'min_supported_version' => [
                'android' => '1.0.0',
                'ios' => '1.0.0',
            ],
            'force_update' => false,
            'maintenance' => [
                'enabled' => false,
                'message' => null,
            ],
            'auth_recovery' => [
                // Runtime load of routes/auth.php is still a P01 discovery item.
                'mobile_supported' => false,
                'channel' => 'web_only',
                'message' => 'Password recovery remains web-only until auth route runtime reconcile is signed off.',
            ],
            'features' => [
                'biometric_unlock' => true,
                'offline_read_cache' => true,
                'native_push' => false,
                'attendance_geofence' => true,
                'leave_self_service' => true,
            ],
            'home' => [
                'mode' => $homeMode,
                'pending_leave_reviews' => $pendingLeaveCount,
            ],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'account_type' => $user->account_type ?? 'staff',
                'active_status' => (bool) $user->active_status,
                'employee_id' => $user->employee_id,
                'branch_id' => $user->branch_id,
                'is_super_admin' => $user->isSuperAdmin(),
                'is_department_head' => $user->isDepartmentHead(),
                'is_branch_account' => $user->isBranchAccount(),
                'has_signature' => $user->hasSignature(),
                'missing_employee' => $user->isStaffAccount() && ! $user->employee_id,
                'role_names' => $this->roleNames($user),
            ],
            'employee' => $user->employee ? [
                'id' => $user->employee->id,
                'name' => $user->employee->name_en ?? $user->employee->name_bn ?? $user->name,
                'pin' => $user->employee->pin ?? null,
                'branch_id' => $user->employee->branch_id,
                'branch_name' => $user->employee->branch?->name,
                'designation' => $user->employee->designation?->name,
            ] : null,
            'permissions' => $permissions,
            'blocked_sections' => $blockedSections,
            'sections' => $sections,
            'device' => [
                'id' => $request->header('X-Device-Id'),
                'app_version' => $request->header('X-App-Version'),
                'platform' => $request->header('X-Platform'),
            ],
            'locks' => [
                'movement_fine' => $activePenalty ? [
                    'locked' => true,
                    'penalty_id' => $activePenalty->id,
                    'status' => $activePenalty->status,
                    'amount' => (string) $activePenalty->amount,
                ] : [
                    'locked' => false,
                ],
            ],
            'policy' => [
                // Effective live values; Flutter must not hardcode business caps.
                'currency' => 'BDT',
                'locale_default' => 'bn',
            ],
            'permission_catalog_version' => sha1(implode('|', PermissionRegistry::keys())),
        ];
    }

    /**
     * @return list<string>
     */
    private function resolvedPermissionKeys(User $user): array
    {
        if ($user->isSuperAdmin()) {
            return PermissionRegistry::keys();
        }

        $granted = [];
        foreach (PermissionRegistry::keys() as $key) {
            if ($user->hasPermission($key)) {
                $granted[] = $key;
            }
        }

        return $granted;
    }

    /**
     * @return list<string>
     */
    private function roleNames(User $user): array
    {
        $names = [];
        if ($user->roles && $user->roles->isNotEmpty()) {
            foreach ($user->roles as $role) {
                $names[] = (string) $role->name;
            }
        } elseif ($user->role) {
            $names[] = (string) $user->role->name;
        }

        return array_values(array_unique($names));
    }
}
