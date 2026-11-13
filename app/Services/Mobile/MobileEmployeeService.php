<?php

namespace App\Services\Mobile;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\User;
use App\Services\OrganogramAccessService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MobileEmployeeService
{
    /**
     * @return array<string, mixed>
     */
    public function directory(User $user, Request $request): array
    {
        if (! $user->hasPermission('employees.view') && ! $user->isSuperAdmin()) {
            throw new HttpException(403, 'You do not have permission to view employees.');
        }

        $search = trim((string) $request->query('q', ''));
        $query = Employee::query()
            ->with(['branch:id,name', 'currentBranch:id,name', 'designation:id,name', 'department:id,name'])
            ->orderBy('name_en')
            ->limit(50);

        $branchIds = OrganogramAccessService::accessibleBranchIdList($user);
        if (is_array($branchIds) && ! $user->isSuperAdmin() && ! $user->hasPermission('employees.admin')) {
            $query->where(function ($q) use ($branchIds) {
                $q->whereIn('current_branch_id', $branchIds)
                    ->orWhereIn('branch_id', $branchIds);
            });
        }

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name_en', 'like', $like)
                    ->orWhere('name_bn', 'like', $like)
                    ->orWhere('pin', 'like', $like)
                    ->orWhere('employee_id', 'like', $like);
            });
        }

        return [
            'data' => $query->get()->map(fn (Employee $e) => $this->serializeLite($e))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(User $user, Employee $employee): array
    {
        if (! $user->hasPermission('employees.view') && ! $user->isSuperAdmin()) {
            if (! ($user->employee_id && (int) $user->employee_id === (int) $employee->id)) {
                throw new HttpException(403, 'You do not have permission to view this employee.');
            }
        }

        $employee->loadMissing([
            'branch:id,name',
            'currentBranch:id,name',
            'designation:id,name',
            'department:id,name',
        ]);

        return [
            'employee' => [
                ...$this->serializeLite($employee),
                'email' => $employee->email ?? null,
                'mobile' => $employee->mobile ?? $employee->phone ?? null,
                // Sensitive fields intentionally omitted from mobile directory detail.
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function me(User $user): array
    {
        $user->loadMissing(['employee.branch', 'employee.currentBranch', 'employee.designation', 'employee.department']);
        if (! $user->employee) {
            throw new HttpException(403, 'Employee profile not found.');
        }

        return $this->show($user, $user->employee);
    }

    /**
     * @return array<string, mixed>
     */
    public function organizationLookups(): array
    {
        return [
            'branches' => Branch::query()->where('is_active', true)->orderBy('name')->limit(500)
                ->get(['id', 'name', 'branch_code', 'is_head_office'])
                ->map(fn (Branch $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'branch_code' => $b->branch_code,
                    'is_head_office' => (bool) $b->is_head_office,
                ])->values()->all(),
            'departments' => Department::query()->orderBy('name')->limit(200)
                ->get(['id', 'name'])->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values()->all(),
            'designations' => Designation::query()->orderBy('name')->limit(300)
                ->get(['id', 'name'])->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeLite(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'pin' => $employee->pin,
            'employee_code' => $employee->employee_id,
            'name' => $employee->name_en ?? $employee->name_bn,
            'name_bn' => $employee->name_bn,
            'branch_name' => $employee->currentBranch?->name ?? $employee->branch?->name,
            'department_name' => $employee->department?->name,
            'designation_name' => $employee->designation?->name,
            'status' => $employee->status ?? $employee->employment_status ?? null,
        ];
    }
}
