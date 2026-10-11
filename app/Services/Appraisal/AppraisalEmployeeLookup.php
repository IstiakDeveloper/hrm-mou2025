<?php

namespace App\Services\Appraisal;

use App\Models\Employee;
use App\Models\User;
use App\Services\ConfirmationEvaluationWorkflowService;
use App\Services\ProbationIncrementWorkflowService;
use App\Services\PromotionEvaluationWorkflowService;
use App\Support\BranchOrganogram;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AppraisalEmployeeLookup
{
    public function search(User $user, string $module, string $term, int $limit = 20): array
    {
        $limit = max(1, min($limit, 25));
        $term = trim($term);

        $query = Employee::query()->where('employees.status', 'active');
        $userLevel = 0;

        if ($module !== 'trainee') {
            $userLevel = $this->hierarchyLevel($user, $module);
            $this->applyHierarchyScope($query, $user, $userLevel);
            if ($user->employee_id) {
                $query->where('employees.id', '!=', $user->employee_id);
            }
        }

        if ($module === 'confirmation') {
            $this->applyProbationPool($query);
        } elseif ($module === 'probation_increment') {
            $this->applyIncrementPool($query);
        }

        if ($term !== '') {
            $like = '%'.addcslashes($term, '%_\\').'%';
            $query->where(function (Builder $inner) use ($like) {
                $inner->where('employees.pin', 'like', $like)
                    ->orWhere('employees.name_en', 'like', $like)
                    ->orWhere('employees.name_bn', 'like', $like);
            });
        }

        $columns = [
            'employees.id',
            'employees.pin',
            'employees.name_en',
            'employees.name_bn',
            'employees.designation_id',
            'employees.current_branch_id',
            'employees.joining_date',
            'employees.educational_qualification',
        ];

        if ($module === 'promotion') {
            $columns[] = 'employees.last_promotion_date';
        }
        if (in_array($module, ['confirmation', 'probation_increment'], true)) {
            $columns[] = 'employees.employee_type_id';
            $columns[] = 'employees.probation_period_days';
        }

        $pool = $term === '' ? 40 : 30;

        $candidates = $query
            ->with(['designation:id,name'])
            ->orderBy('employees.name_en')
            ->limit($pool)
            ->get($columns);

        if ($module !== 'trainee' && $userLevel > 0) {
            $candidates = $candidates->filter(function (Employee $emp) use ($userLevel, $user) {
                if ($user->employee_id && (int) $emp->id === (int) $user->employee_id) {
                    return false;
                }
                $tier = BranchOrganogram::resolveTier($emp->designation?->name);
                $candLevel = (int) ($tier['level'] ?? 999);

                return $candLevel > $userLevel;
            })->values();
        }

        $employees = $candidates->take($limit)->values();
        if ($employees->isEmpty()) {
            return [];
        }

        $employees->load([
            'branch:id,name,is_head_office,regional_office_id',
            'branch.regionalOffice:id,name,zone_id',
            'branch.regionalOffice.zone:id,name',
        ]);

        if (in_array($module, ['confirmation', 'probation_increment'], true)) {
            $employees->load(['employeeType:id,name,probation_months']);
            if ($employees->contains(fn (Employee $emp) => empty($emp->educational_qualification))) {
                $employees->load('educations');
            }
        }

        $stationDates = $module === 'promotion'
            ? $this->latestTransferDates($employees->pluck('id')->all())
            : [];

        return $employees->map(function (Employee $emp) use ($module, $stationDates) {
            return match ($module) {
                'confirmation' => $this->mapConfirmation($emp),
                'probation_increment' => $this->mapProbationIncrement($emp),
                'trainee' => $this->mapTrainee($emp),
                default => $this->mapPromotion($emp, $stationDates[$emp->id] ?? null),
            };
        })->all();
    }

    private function hierarchyLevel(User $user, string $module): int
    {
        $service = match ($module) {
            'confirmation' => app(ConfirmationEvaluationWorkflowService::class),
            'probation_increment' => app(ProbationIncrementWorkflowService::class),
            default => app(PromotionEvaluationWorkflowService::class),
        };

        return $service->getUserHierarchyLevel($user);
    }

    private function applyHierarchyScope(Builder $query, User $user, int $userLevel): void
    {
        $branchId = $user->employee?->current_branch_id ?? $user->employee?->branch_id ?? $user->branch_id;

        if ($userLevel === 3) {
            $query->where('employees.current_branch_id', $branchId);
        } elseif ($userLevel === 2) {
            $regionalOfficeId = $user->employee?->branch?->regional_office_id;
            $query->whereHas('branch', function ($branch) use ($regionalOfficeId) {
                $branch->where('regional_office_id', $regionalOfficeId);
            });
        } elseif ($userLevel === 1) {
            $zoneId = $user->employee?->branch?->regionalOffice?->zone_id;
            $query->whereHas('branch.regionalOffice', function ($office) use ($zoneId) {
                $office->where('zone_id', $zoneId);
            });
        }
    }

    private function applyProbationPool(Builder $query): void
    {
        $query->where(function (Builder $pool) {
            $pool->whereHas('employeeType', function ($type) {
                $type->where('name', 'like', '%PROBATION%');
            })->orWhere(function (Builder $sub) {
                $sub->whereNull('employees.confirmation_date')
                    ->where(function (Builder $fallback) {
                        $fallback->whereNull('employees.employee_type_id')
                            ->orWhereHas('employeeType', function ($type) {
                                $type->where('name', '!=', 'PERMANENT');
                            });
                    });
            });
        });
    }

    private function applyIncrementPool(Builder $query): void
    {
        $query->where(function (Builder $pool) {
            $pool->where('employees.employee_type_id', 2)
                ->orWhereHas('employeeType', function ($type) {
                    $type->where('name', 'like', '%probation%');
                })
                ->orWhere(function (Builder $sub) {
                    $sub->whereNull('employees.confirmation_date')
                        ->where(function (Builder $fallback) {
                            $fallback->whereNull('employees.employee_type_id')
                                ->orWhereHas('employeeType', function ($type) {
                                    $type->where('name', '!=', 'PERMANENT');
                                });
                        });
                });
        });
    }

    /**
     * @param  list<int>  $employeeIds
     * @return array<int, string>
     */
    private function latestTransferDates(array $employeeIds): array
    {
        if ($employeeIds === []) {
            return [];
        }

        return DB::table('transfers')
            ->select('employee_id', DB::raw('MAX(effective_date) as effective_date'))
            ->whereIn('employee_id', $employeeIds)
            ->groupBy('employee_id')
            ->pluck('effective_date', 'employee_id')
            ->map(fn ($date) => (string) $date)
            ->all();
    }

    private function mapPromotion(Employee $emp, ?string $transferDate): array
    {
        $stationDate = $transferDate ? Carbon::parse($transferDate) : $emp->joining_date;
        $currentStationDate = $stationDate ? $stationDate->format('d/m/Y') : null;

        return [
            'id' => $emp->id,
            'pin' => $emp->pin,
            'name_en' => $emp->name_en,
            'name_bn' => $emp->name_bn,
            'designation_id' => $emp->designation_id,
            'designation' => $this->designationPayload($emp),
            'branch' => $emp->branch ? [
                'id' => $emp->branch->id,
                'name' => $emp->branch->name,
                'regional_office' => $emp->branch->regionalOffice?->name,
                'zone' => $emp->branch->regionalOffice?->zone?->name,
            ] : null,
            'joining_date' => $emp->joining_date ? $emp->joining_date->format('d/m/Y') : null,
            'last_promotion_date' => $emp->last_promotion_date ? $emp->last_promotion_date->format('d/m/Y') : null,
            'current_station_joining_date' => $currentStationDate,
            'service_length_current_post' => $this->serviceLength($stationDate),
            'educational_qualification' => $emp->educational_qualification,
        ];
    }

    private function mapConfirmation(Employee $emp): array
    {
        $joiningDate = $emp->joining_date;
        $probationEndDate = null;
        if ($joiningDate) {
            if ($emp->probation_period_days && $emp->probation_period_days > 0) {
                $probationEndDate = $joiningDate->copy()->addDays($emp->probation_period_days);
            } elseif ($emp->employeeType?->probation_months && $emp->employeeType->probation_months > 0) {
                $probationEndDate = $joiningDate->copy()->addMonths($emp->employeeType->probation_months);
            } else {
                $probationEndDate = $joiningDate->copy()->addMonths(6);
            }
        }

        $regOfficeName = $emp->branch?->regionalOffice?->name ?? ($emp->branch?->is_head_office ? 'প্রধান কার্যালয়' : null);
        $zoneName = $emp->branch?->regionalOffice?->zone?->name ?? ($emp->branch?->is_head_office ? 'প্রধান কার্যালয়' : null);

        return [
            'id' => $emp->id,
            'pin' => $emp->pin,
            'name_en' => $emp->name_en,
            'name_bn' => $emp->name_bn,
            'employee_type' => $emp->employeeType ? [
                'id' => $emp->employeeType->id,
                'name' => $emp->employeeType->name,
            ] : null,
            'designation_id' => $emp->designation_id,
            'designation' => $this->designationPayload($emp),
            'branch' => $emp->branch ? [
                'id' => $emp->branch->id,
                'name' => $emp->branch->name,
                'is_head_office' => (bool) $emp->branch->is_head_office,
                'regional_office' => [
                    'id' => $emp->branch->regionalOffice?->id,
                    'name' => $regOfficeName,
                    'zone' => [
                        'id' => $emp->branch->regionalOffice?->zone?->id,
                        'name' => $zoneName,
                    ],
                ],
                'regional_office_name' => $regOfficeName,
                'zone_name' => $zoneName,
            ] : null,
            'joining_date' => $emp->joining_date ? $emp->joining_date->format('d/m/Y') : null,
            'probation_end_date' => $probationEndDate ? $probationEndDate->format('d/m/Y') : null,
            'educational_qualification' => $emp->resolveEducationalQualification(),
        ];
    }

    private function mapProbationIncrement(Employee $emp): array
    {
        $qual = $emp->resolveEducationalQualification();

        return [
            'id' => $emp->id,
            'pin' => $emp->pin,
            'name_en' => $emp->name_en,
            'name_bn' => $emp->name_bn,
            'designation_id' => $emp->designation_id,
            'designation' => $this->designationPayload($emp),
            'branch' => $emp->branch ? [
                'id' => $emp->branch->id,
                'name' => $emp->branch->name,
                'is_head_office' => (bool) $emp->branch->is_head_office,
                'regional_office' => $emp->branch->regionalOffice ? [
                    'id' => $emp->branch->regionalOffice->id,
                    'name' => $emp->branch->regionalOffice->name,
                    'zone' => $emp->branch->regionalOffice->zone ? [
                        'id' => $emp->branch->regionalOffice->zone->id,
                        'name' => $emp->branch->regionalOffice->zone->name,
                    ] : null,
                ] : null,
                'regional_office_name' => $emp->branch->regionalOffice?->name,
                'zone_name' => $emp->branch->regionalOffice?->zone?->name,
            ] : null,
            'joining_date' => $emp->joining_date?->format('Y-m-d'),
            'probation_3m_completion_date' => $emp->joining_date ? $emp->joining_date->copy()->addMonths(3)->format('Y-m-d') : null,
            'educational_qualification' => $qual,
            'employee_type' => $emp->employeeType ? [
                'id' => $emp->employeeType->id,
                'name' => $emp->employeeType->name,
            ] : ['id' => 2, 'name' => 'PROBATION'],
        ];
    }

    private function mapTrainee(Employee $emp): array
    {
        return [
            'id' => $emp->id,
            'name_en' => $emp->name_en,
            'name_bn' => $emp->name_bn,
            'pin' => $emp->pin,
            'designation' => $emp->designation ? [
                'id' => $emp->designation->id,
                'name' => $emp->designation->name,
                'title' => $emp->designation->name,
            ] : null,
            'branch' => $emp->branch ? [
                'id' => $emp->branch->id,
                'name' => $emp->branch->name,
                'regional_office_id' => $emp->branch->regional_office_id,
                'regional_office' => $emp->branch->regionalOffice ? [
                    'id' => $emp->branch->regionalOffice->id,
                    'name' => $emp->branch->regionalOffice->name,
                    'zone_id' => $emp->branch->regionalOffice->zone_id,
                    'zone' => $emp->branch->regionalOffice->zone ? [
                        'id' => $emp->branch->regionalOffice->zone->id,
                        'name' => $emp->branch->regionalOffice->zone->name,
                    ] : null,
                ] : null,
            ] : null,
            'joining_date' => $emp->joining_date?->format('Y-m-d'),
        ];
    }

    private function designationPayload(Employee $emp): ?array
    {
        if (! $emp->designation) {
            return null;
        }

        return [
            'id' => $emp->designation->id,
            'name' => $emp->designation->name,
            'title' => $emp->designation->name,
        ];
    }

    private function serviceLength(?Carbon $baseDate): ?string
    {
        if (! $baseDate) {
            return null;
        }

        $diff = $baseDate->diff(now());
        $diffYears = (int) $diff->y;
        $diffMonths = (int) $diff->m;
        $toBn = function (int $num): string {
            $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
            $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

            return str_replace($en, $bn, (string) $num);
        };

        if ($diffYears > 0 && $diffMonths > 0) {
            return "{$toBn($diffYears)} বছর {$toBn($diffMonths)} মাস";
        }
        if ($diffYears > 0) {
            return "{$toBn($diffYears)} বছর";
        }
        if ($diffMonths > 0) {
            return "{$toBn($diffMonths)} মাস";
        }

        return '১ মাস';
    }
}
