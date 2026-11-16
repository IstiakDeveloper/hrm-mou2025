<?php

namespace App\Services\Appraisal;

use App\Models\RegionalOffice;
use App\Models\User;
use App\Models\Zone;
use App\Services\OrganogramAccessService;
use App\Services\PromotionEvaluationWorkflowService;
use App\Support\CachedSchema;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Counts performance appraisals waiting on the current user only.
 * A Branch Manager sees their own drafts. RM / ZM / Director / HR / ED
 * see items sitting at their stage, inside their jurisdiction.
 */
class AppraisalPendingCountService
{
    /**
     * @var array<string, array{0: string, 1: string, 2: string}>
     */
    private const MODULES = [
        'promotion' => ['promotion_evaluations', 'promotion_evaluation_signatures', 'promotion_evaluation_id'],
        'confirmation' => ['confirmation_evaluations', 'confirmation_evaluation_signatures', 'confirmation_evaluation_id'],
        'probation_increment' => ['probation_increment_evaluations', 'probation_increment_evaluation_signatures', 'probation_increment_evaluation_id'],
        'trainee' => ['trainee_evaluations', 'trainee_evaluation_signatures', 'trainee_evaluation_id'],
    ];

    public function __construct(private readonly PromotionEvaluationWorkflowService $workflow) {}

    /**
     * @return array{promotion: int, confirmation: int, probation_increment: int, trainee: int, total: int}
     */
    public function countsFor(User $user): array
    {
        $counts = [
            'promotion' => 0,
            'confirmation' => 0,
            'probation_increment' => 0,
            'trainee' => 0,
            'total' => 0,
        ];

        $actor = $this->actor($user);

        foreach (self::MODULES as $key => [$table, $signatureTable, $foreignKey]) {
            if (! CachedSchema::hasTable($table)) {
                continue;
            }

            $counts[$key] = $this->countTable($user, $actor, $table, $signatureTable, $foreignKey);
            $counts['total'] += $counts[$key];
        }

        return $counts;
    }

    /**
     * @param  array{
     *     stages: list<array{status: string, column: ?string, ids: list<int>}>
     * }  $actor
     */
    private function countTable(User $user, array $actor, string $table, string $signatureTable, string $foreignKey): int
    {
        $hasSignatures = CachedSchema::hasTable($signatureTable);

        return (int) DB::table($table)
            ->where(function (Builder $query) use ($user, $actor, $table, $signatureTable, $foreignKey, $hasSignatures) {
                $query->where(function (Builder $draft) use ($user) {
                    $draft->where('status', 'draft')
                        ->where('initiator_id', $user->id);
                });

                if ($actor['stages'] === []) {
                    return;
                }

                $query->orWhere(function (Builder $approval) use ($user, $actor, $table, $signatureTable, $foreignKey, $hasSignatures) {
                    $approval->where(function (Builder $stages) use ($actor) {
                        foreach ($actor['stages'] as $stage) {
                            $stages->orWhere(function (Builder $one) use ($stage) {
                                $one->where('status', $stage['status']);
                                if ($stage['column'] !== null && $stage['ids'] !== []) {
                                    $column = $stage['column'];
                                    $ids = $stage['ids'];
                                    $one->where(function (Builder $office) use ($column, $ids) {
                                        $office->whereIn($column, $ids)->orWhereNull($column);
                                    });
                                }
                            });
                        }
                    });

                    $approval->where(function (Builder $initiator) use ($user) {
                        $initiator->whereNull('initiator_id')
                            ->orWhere('initiator_id', '!=', $user->id);
                    });

                    if ($user->employee_id) {
                        $employeeId = (int) $user->employee_id;
                        $approval->where(function (Builder $self) use ($employeeId) {
                            $self->whereNull('employee_id')
                                ->orWhere('employee_id', '!=', $employeeId);
                        });
                    }

                    if ($hasSignatures) {
                        $approval->whereNotExists(function (Builder $signed) use ($signatureTable, $foreignKey, $table, $user) {
                            $signed->selectRaw('1')
                                ->from($signatureTable)
                                ->whereColumn($signatureTable.'.'.$foreignKey, $table.'.id')
                                ->where($signatureTable.'.user_id', $user->id)
                                ->whereIn($signatureTable.'.action', ['submitted', 'forwarded', 'approved']);
                        });
                    }
                });
            })
            ->count();
    }

    /**
     * Appraisals waiting on this user.
     *
     * @return list<array<string, mixed>>
     */
    public function pendingItems(User $user): array
    {
        $actor = $this->actor($user);
        $labels = [
            'promotion' => 'Promotion appraisal',
            'confirmation' => 'Confirmation appraisal',
            'probation_increment' => 'Probation increment',
            'trainee' => 'Trainee appraisal',
        ];
        $items = [];

        foreach (self::MODULES as $key => [$table, $signatureTable, $foreignKey]) {
            if (! CachedSchema::hasTable($table)) {
                continue;
            }

            $hasSignatures = CachedSchema::hasTable($signatureTable);
            $rows = DB::table($table)
                ->leftJoin('employees', 'employees.id', '=', $table.'.employee_id')
                ->where(function (Builder $query) use ($user, $actor, $table, $signatureTable, $foreignKey, $hasSignatures) {
                    $query->where(function (Builder $draft) use ($user, $table) {
                        $draft->where($table.'.status', 'draft')
                            ->where($table.'.initiator_id', $user->id);
                    });

                    if ($actor['stages'] === []) {
                        return;
                    }

                    $query->orWhere(function (Builder $approval) use ($user, $actor, $table, $signatureTable, $foreignKey, $hasSignatures) {
                        $approval->where(function (Builder $stages) use ($actor, $table) {
                            foreach ($actor['stages'] as $stage) {
                                $stages->orWhere(function (Builder $one) use ($stage, $table) {
                                    $one->where($table.'.status', $stage['status']);
                                    if ($stage['column'] !== null && $stage['ids'] !== []) {
                                        $column = $table.'.'.$stage['column'];
                                        $ids = $stage['ids'];
                                        $one->where(function (Builder $office) use ($column, $ids) {
                                            $office->whereIn($column, $ids)->orWhereNull($column);
                                        });
                                    }
                                });
                            }
                        });

                        $approval->where(function (Builder $initiator) use ($user, $table) {
                            $initiator->whereNull($table.'.initiator_id')
                                ->orWhere($table.'.initiator_id', '!=', $user->id);
                        });

                        if ($user->employee_id) {
                            $employeeId = (int) $user->employee_id;
                            $approval->where(function (Builder $self) use ($employeeId, $table) {
                                $self->whereNull($table.'.employee_id')
                                    ->orWhere($table.'.employee_id', '!=', $employeeId);
                            });
                        }

                        if ($hasSignatures) {
                            $approval->whereNotExists(function (Builder $signed) use ($signatureTable, $foreignKey, $table, $user) {
                                $signed->selectRaw('1')
                                    ->from($signatureTable)
                                    ->whereColumn($signatureTable.'.'.$foreignKey, $table.'.id')
                                    ->where($signatureTable.'.user_id', $user->id)
                                    ->whereIn($signatureTable.'.action', ['submitted', 'forwarded', 'approved']);
                            });
                        }
                    });
                })
                ->orderByDesc($table.'.id')
                ->limit(40)
                ->get([
                    $table.'.id',
                    $table.'.status',
                    'employees.pin',
                    'employees.name_en',
                ]);

            foreach ($rows as $row) {
                $items[] = [
                    'module' => 'appraisal',
                    'kind' => $key,
                    'id' => (int) $row->id,
                    'title' => $labels[$key] ?? 'Appraisal',
                    'subtitle' => trim(($row->pin ? $row->pin.' — ' : '').($row->name_en ?? '')),
                    'status' => $row->status,
                    'can_act' => $row->status !== 'draft' && $row->status !== 'submitted_to_hr',
                    'needs_decision' => $row->status === 'submitted_to_ed',
                ];
            }
        }

        return $items;
    }

    /**
     * Super Admin is not treated as every approver. Only the role, posting,
     * or office assignment that actually holds the file is counted.
     *
     * @return array{stages: list<array{status: string, column: ?string, ids: list<int>}>}
     */
    private function actor(User $user): array
    {
        $user->loadMissing(['employee.designation', 'employee.branch.regionalOffice']);
        $roleNames = OrganogramAccessService::mergedRoleNames($user);
        $isBranchManager = $this->isBranchManager($user, $roleNames);
        $isExecutiveDirector = $this->workflow->isExecutiveDirector($user);

        $stages = [];

        if (! $isBranchManager && ! $isExecutiveDirector && $this->isRegionalManager($user, $roleNames)) {
            $stages[] = [
                'status' => 'submitted_to_rm',
                'column' => 'regional_office_id',
                'ids' => $this->regionalOfficeIds($user),
            ];
        }

        if (! $isBranchManager && ! $isExecutiveDirector && ! OrganogramAccessService::isRegionalManager($user) && $this->isZonalManager($user, $roleNames)) {
            $stages[] = [
                'status' => 'submitted_to_zm',
                'column' => 'zone_id',
                'ids' => $this->zoneIds($user),
            ];
        }

        if (! $isExecutiveDirector && $this->isDirectorMicrofinance($user, $roleNames)) {
            $stages[] = ['status' => 'submitted_to_director', 'column' => null, 'ids' => []];
        }

        if (! $isExecutiveDirector && $this->isDirectorFinance($user, $roleNames)) {
            $stages[] = ['status' => 'submitted_to_director_fa', 'column' => null, 'ids' => []];
        }

        if (! $isExecutiveDirector && $this->isHr($user, $roleNames)) {
            $stages[] = ['status' => 'submitted_to_hr', 'column' => null, 'ids' => []];
        }

        if ($isExecutiveDirector) {
            $stages[] = ['status' => 'submitted_to_ed', 'column' => null, 'ids' => []];
        }

        return ['stages' => $stages];
    }

    /**
     * @param  list<string>  $roleNames
     */
    private function isBranchManager(User $user, array $roleNames): bool
    {
        if (in_array('Branch Manager', $roleNames, true)) {
            return true;
        }

        if ($user->isSuperAdmin()) {
            return false;
        }

        return $this->workflow->isBranchManager($user);
    }

    /**
     * @param  list<string>  $roleNames
     */
    private function isRegionalManager(User $user, array $roleNames): bool
    {
        if (in_array('Regional Manager', $roleNames, true) || $this->allows($user, 'organogram.regional_manager')) {
            return true;
        }

        if (! $user->isSuperAdmin() && OrganogramAccessService::isRegionalManager($user)) {
            return true;
        }

        return $user->employee_id
            && RegionalOffice::query()->where('regional_manager_employee_id', $user->employee_id)->exists();
    }

    /**
     * @param  list<string>  $roleNames
     */
    private function isZonalManager(User $user, array $roleNames): bool
    {
        if (in_array('Zonal Manager', $roleNames, true) || $this->allows($user, 'organogram.zonal_manager')) {
            return true;
        }

        if (! $user->isSuperAdmin() && OrganogramAccessService::isZonalManager($user)) {
            return true;
        }

        return $user->employee_id
            && Zone::query()->where('zone_manager_employee_id', $user->employee_id)->exists();
    }

    /**
     * @param  list<string>  $roleNames
     */
    private function isDirectorMicrofinance(User $user, array $roleNames): bool
    {
        return in_array('Director (Microfinance)', $roleNames, true)
            || in_array('Assistant Director (Microfinance)', $roleNames, true)
            || $this->allows($user, 'organogram.microfinance_director')
            || $this->allows($user, 'organogram.microfinance_assistant_director');
    }

    /**
     * @param  list<string>  $roleNames
     */
    private function isDirectorFinance(User $user, array $roleNames): bool
    {
        return in_array('Director Finance and Accounts', $roleNames, true)
            || in_array('Director Finance and Account', $roleNames, true)
            || in_array('Director (Finance & Accounts)', $roleNames, true)
            || OrganogramAccessService::isFinanceAndAccountsDepartmentHead($user);
    }

    /**
     * @param  list<string>  $roleNames
     */
    private function isHr(User $user, array $roleNames): bool
    {
        if (
            in_array('HR Manager', $roleNames, true)
            || in_array('HR Admin', $roleNames, true)
            || in_array('Assistant Director (HR)', $roleNames, true)
        ) {
            return true;
        }

        return (int) optional($user->employee)->department_id === 5;
    }

    private function allows(User $user, string $permission): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        return $user->hasDirectPermission($permission);
    }

    /**
     * @return list<int>
     */
    private function regionalOfficeIds(User $user): array
    {
        $ids = [];
        if ($user->employee_id) {
            $ids = RegionalOffice::query()
                ->where('regional_manager_employee_id', $user->employee_id)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        $branchOfficeId = $user->employee?->branch?->regional_office_id;
        if ($branchOfficeId) {
            $ids[] = (int) $branchOfficeId;
        }

        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * @return list<int>
     */
    private function zoneIds(User $user): array
    {
        $ids = [];
        if ($user->employee_id) {
            $ids = Zone::query()
                ->where('zone_manager_employee_id', $user->employee_id)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        $branchZoneId = $user->employee?->branch?->regionalOffice?->zone_id;
        if ($branchZoneId) {
            $ids[] = (int) $branchZoneId;
        }

        return array_values(array_unique(array_filter($ids)));
    }
}
