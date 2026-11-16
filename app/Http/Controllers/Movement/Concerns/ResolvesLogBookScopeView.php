<?php

namespace App\Http\Controllers\Movement\Concerns;

use App\Models\Employee;
use App\Models\User;
use App\Services\OrganogramAccessService;
use Illuminate\Http\Request;

trait ResolvesLogBookScopeView
{
    private function userHasPersonalLogBookView(User $user): bool
    {
        return (int) $user->employee_id > 0;
    }

    private function userCanSeeTeamLogBooks(User $user): bool
    {
        if ($user->isSuperAdmin() || $user->hasPermission('employees.admin') || $user->hasPermission('movements.edit')) {
            return true;
        }

        if (! $user->hasPermission('movements.view')) {
            return false;
        }

        $query = Employee::query()->where('status', 'active');
        OrganogramAccessService::constrainVisibleEmployees($query, $user);

        if ($user->employee_id) {
            $query->where('id', '!=', (int) $user->employee_id);
        }

        return $query->exists();
    }

    /**
     * @return array{view: string, canMine: bool, canTeam: bool, showTabs: bool}
     */
    private function resolveLogBookScopeView(Request $request, User $user): array
    {
        $canMine = $this->userHasPersonalLogBookView($user);
        $canTeam = $this->userCanSeeTeamLogBooks($user);
        $showTabs = $canMine && $canTeam;

        if ($showTabs) {
            $view = (string) $request->input('view', 'team');
            $view = in_array($view, ['mine', 'team'], true) ? $view : 'team';
        } elseif ($canMine) {
            $view = 'mine';
        } else {
            $view = 'team';
        }

        return [
            'view' => $view,
            'canMine' => $canMine,
            'canTeam' => $canTeam,
            'showTabs' => $showTabs,
        ];
    }

    private function applyLogBookScopeView($query, User $user, string $view, bool $showTabs): void
    {
        $employeeId = (int) $user->employee_id;

        if ($view === 'mine' && $employeeId > 0) {
            $query->where('employee_id', $employeeId);

            return;
        }

        if ($view === 'team' && $showTabs && $employeeId > 0) {
            $query->where('employee_id', '!=', $employeeId);
        }
    }
}
