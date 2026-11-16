<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\RegionalOffice;
use App\Models\SalaryGrade;
use App\Models\Zone;
use App\Support\BranchOrganogram;
use App\Support\HeadOfficeOrganogram;
use App\Support\HrDesignationBucket;
use App\Support\HrReportGrade;
use App\Support\ServiceDuration;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class HrReportService
{
    public function __construct(
        protected PayrollCalculationService $payrollCalc
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function filtersFromRequest(Request $request): array
    {
        $today = Carbon::today()->toDateString();

        return [
            'as_of_date' => $request->input('as_of_date') ?: $today,
            'branch_id' => $request->filled('branch_id') ? (int) $request->input('branch_id') : null,
            'zone_id' => $request->filled('zone_id') ? (int) $request->input('zone_id') : null,
            'regional_office_id' => $request->filled('regional_office_id') ? (int) $request->input('regional_office_id') : null,
            'designation_id' => $request->filled('designation_id') ? (int) $request->input('designation_id') : null,
            'date_from' => $request->input('date_from') ?: Carbon::today()->startOfYear()->toDateString(),
            'date_to' => $request->input('date_to') ?: $today,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  array<string, mixed>  $config
     */
    public function periodLabel(array $filters, array $config): string
    {
        if (! empty($config['date_range'])) {
            $from = ! empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->format('d M Y') : 'Start';
            $to = ! empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->format('d M Y') : 'End';

            return "{$from} to {$to}";
        }

        $asOf = ! empty($filters['as_of_date']) ? Carbon::parse($filters['as_of_date'])->format('d M Y') : Carbon::today()->format('d M Y');

        return "As on {$asOf}";
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function build(string $slug, array $config, array $filters): array
    {
        return match ($slug) {
            'staff-by-designation' => $this->staffByDesignation($config, $filters),
            'active-staff-all-units' => $this->activeStaffAllUnits($config, $filters),
            'branch-wise-active-staff' => $this->branchWiseActiveStaff($config, $filters),
            'branch-wise-active-staff-pksf' => $this->branchWiseActiveStaffPksf($config, $filters),
            'microfinance-field-staff-summary' => $this->microfinanceFieldStaffSummary($config, $filters),
            'zone-region-wise-summary' => $this->zoneRegionWiseSummary($config, $filters),
            'zone-wise-summary' => $this->zoneWiseSummary($config, $filters),
            'location-wise-summary-ratio' => $this->locationWiseSummaryRatio($config, $filters),
            'microfinance-head-office-staff-summary' => $this->microfinanceHeadOfficeStaffSummary($config, $filters),
            'designation-recruitment-separation-final-payment' => $this->designationRecruitmentSeparationPayment($config, $filters),
            'branch-wise-probation-salary-increase' => $this->branchWiseEligibilityList('probation_increase', $config, $filters),
            'branch-wise-active-staff-confirmation' => $this->branchWiseEligibilityList('confirmation', $config, $filters),
            'branch-wise-active-promotion' => $this->branchWiseEligibilityList('promotion', $config, $filters),
            default => abort(404, 'Unknown report slug.'),
        };
    }

    // ==========================================
    // 1. STAFF REPORT BY DESIGNATION (PORTRAIT)
    // ==========================================
    protected function staffByDesignation(array $config, array $filters): array
    {
        $employees = $this->queryEmployees(false, $filters)->get();

        $rows = [];
        $totals = [
            'active_male' => 0,
            'active_female' => 0,
            'active_total' => 0,
            'inactive_male' => 0,
            'inactive_female' => 0,
            'inactive_total' => 0,
            'grand_total' => 0,
        ];

        // Group by resolved designation name
        $byDesignation = $employees->groupBy(function (Employee $e) {
            $isActive = $this->isEmployeeActive($e);
            if ($isActive) {
                return $e->designation?->name ?: 'Unassigned Designation';
            }

            return $e->lastDesignation?->name ?: ($e->designation?->name ?: 'Unassigned Designation');
        });

        foreach ($byDesignation as $designationName => $group) {
            $actMale = 0;
            $actFemale = 0;
            $actTotal = 0;
            $inactMale = 0;
            $inactFemale = 0;
            $inactTotal = 0;

            foreach ($group as $emp) {
                $isActive = $this->isEmployeeActive($emp);
                $gender = strtolower(trim((string) $emp->gender));

                if ($isActive) {
                    $actTotal++;
                    if ($gender === 'male') {
                        $actMale++;
                    } elseif ($gender === 'female') {
                        $actFemale++;
                    }
                } else {
                    $inactTotal++;
                    if ($gender === 'male') {
                        $inactMale++;
                    } elseif ($gender === 'female') {
                        $inactFemale++;
                    }
                }
            }

            $rowGrandTotal = $actTotal + $inactTotal;

            $rows[] = [
                'designation' => $designationName,
                'active_male' => $actMale,
                'active_female' => $actFemale,
                'active_total' => $actTotal,
                'inactive_male' => $inactMale,
                'inactive_female' => $inactFemale,
                'inactive_total' => $inactTotal,
                'grand_total' => $rowGrandTotal,
            ];

            $totals['active_male'] += $actMale;
            $totals['active_female'] += $actFemale;
            $totals['active_total'] += $actTotal;
            $totals['inactive_male'] += $inactMale;
            $totals['inactive_female'] += $inactFemale;
            $totals['inactive_total'] += $inactTotal;
            $totals['grand_total'] += $rowGrandTotal;
        }

        // Sort designations alphabetically
        usort($rows, fn ($a, $b) => strnatcasecmp($a['designation'], $b['designation']));

        return [
            'template' => 'designation-matrix',
            'orientation' => 'portrait',
            'rows' => $rows,
            'totals' => $totals,
        ];
    }

    // ==========================================
    // 2. ACTIVE STAFF REPORT (AU) (LANDSCAPE)
    // ==========================================
    protected function activeStaffAllUnits(array $config, array $filters): array
    {
        $asOf = Carbon::parse($filters['as_of_date'] ?? 'now');
        $employees = $this->queryEmployees(true, $filters)->get();

        $employeeIds = $employees->pluck('id')->all();
        $histories = $this->loadAssignmentHistories($employeeIds);
        $addresses = $this->loadAddresses($employeeIds);

        $staffRows = [];
        foreach ($employees as $employee) {
            $staffRows[] = $this->formatStaffRow($employee, $histories->get($employee->id, collect()), $addresses->get($employee->id, collect()), $asOf);
        }

        $staffRows = $this->sortStaffRows($staffRows);

        // Assign serial numbers after sort
        foreach ($staffRows as $index => &$row) {
            $row['sl'] = $index + 1;
        }
        unset($row);

        return [
            'template' => 'staff-list',
            'orientation' => 'landscape',
            'rows' => $staffRows,
            'total_count' => count($staffRows),
        ];
    }

    // ==========================================
    // 3. BRANCH-WISE ACTIVE STAFF REPORT
    // ==========================================
    protected function branchWiseActiveStaff(array $config, array $filters): array
    {
        $asOf = Carbon::parse($filters['as_of_date'] ?? 'now');
        $employees = $this->queryEmployees(true, $filters)->get();

        $employeeIds = $employees->pluck('id')->all();
        $histories = $this->loadAssignmentHistories($employeeIds);
        $addresses = $this->loadAddresses($employeeIds);

        $staffRows = [];
        foreach ($employees as $employee) {
            $staffRows[] = $this->formatStaffRow($employee, $histories->get($employee->id, collect()), $addresses->get($employee->id, collect()), $asOf);
        }

        $staffRows = $this->sortStaffRows($staffRows);

        // Group rows by branch
        $sections = $this->groupRowsByBranch($staffRows);

        return [
            'template' => 'staff-list-grouped',
            'orientation' => 'landscape',
            'sections' => $sections,
            'grand_total' => count($staffRows),
        ];
    }

    // ==========================================
    // 4. BRANCH-WISE ACTIVE STAFF (FOR PKSF)
    // ==========================================
    protected function branchWiseActiveStaffPksf(array $config, array $filters): array
    {
        $asOf = Carbon::parse($filters['as_of_date'] ?? 'now');
        $employees = $this->queryEmployees(true, $filters)->get();

        $employeeIds = $employees->pluck('id')->all();
        $histories = $this->loadAssignmentHistories($employeeIds);
        $addresses = $this->loadAddresses($employeeIds);

        $staffRows = [];
        foreach ($employees as $employee) {
            $staffRows[] = $this->formatStaffRow($employee, $histories->get($employee->id, collect()), $addresses->get($employee->id, collect()), $asOf, true);
        }

        $staffRows = $this->sortStaffRows($staffRows);
        $sections = $this->groupRowsByBranch($staffRows);

        return [
            'template' => 'staff-pksf',
            'orientation' => 'landscape',
            'print_date' => Carbon::now()->format('d-m-Y'),
            'sections' => $sections,
            'grand_total' => count($staffRows),
        ];
    }

    // ========================================================
    // 5. MICROFINANCE FIELD STAFF SUMMARY (WITHOUT HEAD OFFICE)
    // ========================================================
    protected function microfinanceFieldStaffSummary(array $config, array $filters): array
    {
        $employees = $this->queryEmployees(true, $filters)->get();

        // Exclude head office
        $fieldEmployees = $employees->reject(fn (Employee $e) => $this->isHeadOffice($e->currentBranch));

        // Group by branch
        $byBranch = $fieldEmployees->groupBy(fn (Employee $e) => $e->current_branch_id ?: 0);

        $rows = [];
        $sl = 1;

        $grandTotals = [
            'officer_male' => 0, 'officer_female' => 0, 'officer_total' => 0,
            'accountant_male' => 0, 'accountant_female' => 0, 'accountant_total' => 0,
            'bm_male' => 0, 'bm_female' => 0, 'bm_total' => 0,
            'rm_male' => 0, 'rm_female' => 0, 'rm_total' => 0,
            'zm_male' => 0, 'zm_female' => 0, 'zm_total' => 0,
            'other_male' => 0, 'other_female' => 0, 'other_total' => 0,
            'total_male' => 0, 'total_female' => 0, 'row_total' => 0,
        ];

        foreach ($byBranch as $branchId => $branchEmps) {
            $sample = $branchEmps->first();
            $branch = $sample?->currentBranch;
            $regOffice = $branch?->regionalOffice;
            $zone = $regOffice?->zone;

            $counts = $this->aggregateDesignationBuckets($branchEmps);

            $rows[] = array_merge([
                'sl' => $sl++,
                'branch_id' => $branchId,
                'branch_model' => $branch,
                'zone' => $zone?->name ?: 'No Zone',
                'region' => $regOffice?->name ?: 'No Region',
                'branch' => $this->branchLabel($branch),
            ], $counts);

            foreach ($grandTotals as $k => $v) {
                $grandTotals[$k] += $counts[$k] ?? 0;
            }
        }

        // Sort rows by zone, region, branch code
        usort($rows, function ($a, $b) {
            $cmpZone = strnatcasecmp($a['zone'], $b['zone']);
            if ($cmpZone !== 0) {
                return $cmpZone;
            }
            $cmpReg = strnatcasecmp($a['region'], $b['region']);
            if ($cmpReg !== 0) {
                return $cmpReg;
            }

            return BranchOrganogram::compareBranchesByCode($a['branch_model'], $b['branch_model']);
        });

        // Re-index SL
        foreach ($rows as $idx => &$r) {
            $r['sl'] = $idx + 1;
        }
        unset($r);

        $hoConfig = config('hr_reports.reports.microfinance-head-office-staff-summary', []);
        $hoSummary = $this->microfinanceHeadOfficeStaffSummary($hoConfig, ['as_of_date' => $filters['as_of_date'] ?? null]);

        return [
            'template' => 'field-summary',
            'orientation' => 'landscape',
            'rows' => $rows,
            'totals' => $grandTotals,
            'head_office_summary' => $hoSummary,
            'combined_total' => $grandTotals['row_total'] + ($hoSummary['grand_total'] ?? 0),
        ];
    }

    // ==========================================
    // 6. ZONE & REGION-WISE SUMMARY
    // ==========================================
    protected function zoneRegionWiseSummary(array $config, array $filters): array
    {
        $employees = $this->queryEmployees(true, $filters)->get();

        $groups = $employees->groupBy(function (Employee $e) {
            if ($this->isHeadOffice($e->currentBranch)) {
                return 'HO||Head Office';
            }
            $reg = $e->currentBranch?->regionalOffice;
            $zone = $reg?->zone;
            $zoneName = $zone?->name ?: 'Unassigned Zone';
            $regName = $reg?->name ?: 'Unassigned Region';

            return "{$zoneName}||{$regName}";
        });

        $rows = [];
        $sl = 1;
        $grandTotals = $this->emptyDesignationTotals();

        foreach ($groups as $key => $groupEmps) {
            [$zoneName, $regName] = explode('||', $key, 2);
            $isHo = ($zoneName === 'HO');

            $counts = $this->aggregateDesignationBuckets($groupEmps);

            $rows[] = array_merge([
                'sl' => $sl++,
                'is_head_office' => $isHo,
                'zone' => $isHo ? 'Head Office' : $zoneName,
                'region' => $isHo ? 'Head Office' : $regName,
            ], $counts);

            foreach ($grandTotals as $k => $v) {
                $grandTotals[$k] += $counts[$k] ?? 0;
            }
        }

        // Sort: Head office first, then Zone name, then Region name
        usort($rows, function ($a, $b) {
            if ($a['is_head_office'] !== $b['is_head_office']) {
                return $a['is_head_office'] ? -1 : 1;
            }
            $zCmp = strnatcasecmp($a['zone'], $b['zone']);
            if ($zCmp !== 0) {
                return $zCmp;
            }

            return strnatcasecmp($a['region'], $b['region']);
        });

        foreach ($rows as $idx => &$r) {
            $r['sl'] = $idx + 1;
        }
        unset($r);

        return [
            'template' => 'zone-region-summary',
            'orientation' => 'landscape',
            'rows' => $rows,
            'totals' => $grandTotals,
        ];
    }

    // ==========================================
    // 7. ZONE WISE SUMMARY
    // ==========================================
    protected function zoneWiseSummary(array $config, array $filters): array
    {
        $employees = $this->queryEmployees(true, $filters)->get();

        $groups = $employees->groupBy(function (Employee $e) {
            if ($this->isHeadOffice($e->currentBranch)) {
                return 'HO||Head Office';
            }
            $zone = $e->currentBranch?->regionalOffice?->zone;

            return $zone?->name ?: 'Unassigned Zone';
        });

        $rows = [];
        $sl = 1;
        $grandTotals = $this->emptyDesignationTotals();

        foreach ($groups as $zoneKey => $groupEmps) {
            $isHo = str_starts_with($zoneKey, 'HO||');
            $zoneName = $isHo ? 'Head Office' : $zoneKey;

            $counts = $this->aggregateDesignationBuckets($groupEmps);

            $rows[] = array_merge([
                'sl' => $sl++,
                'is_head_office' => $isHo,
                'zone' => $zoneName,
            ], $counts);

            foreach ($grandTotals as $k => $v) {
                $grandTotals[$k] += $counts[$k] ?? 0;
            }
        }

        // Sort: Head office first, then Zone name
        usort($rows, function ($a, $b) {
            if ($a['is_head_office'] !== $b['is_head_office']) {
                return $a['is_head_office'] ? -1 : 1;
            }

            return strnatcasecmp($a['zone'], $b['zone']);
        });

        foreach ($rows as $idx => &$r) {
            $r['sl'] = $idx + 1;
        }
        unset($r);

        return [
            'template' => 'zone-summary',
            'orientation' => 'landscape',
            'rows' => $rows,
            'totals' => $grandTotals,
        ];
    }

    // ==========================================
    // 8. LOCATION-WISE SUMMARY & RATIO
    // ==========================================
    protected function locationWiseSummaryRatio(array $config, array $filters): array
    {
        $employees = $this->queryEmployees(true, $filters)->get();

        $fieldMale = 0;
        $fieldFemale = 0;
        $fieldTotal = 0;

        $hoMale = 0;
        $hoFemale = 0;
        $hoTotal = 0;

        foreach ($employees as $e) {
            $isHo = $this->isHeadOffice($e->currentBranch);
            $gender = strtolower(trim((string) $e->gender));

            if ($isHo) {
                $hoTotal++;
                if ($gender === 'male') {
                    $hoMale++;
                } elseif ($gender === 'female') {
                    $hoFemale++;
                }
            } else {
                $fieldTotal++;
                if ($gender === 'male') {
                    $fieldMale++;
                } elseif ($gender === 'female') {
                    $fieldFemale++;
                }
            }
        }

        $grandMale = $fieldMale + $hoMale;
        $grandFemale = $fieldFemale + $hoFemale;
        $grandTotal = $fieldTotal + $hoTotal;

        $makeRow = function (string $label, int $male, int $female, int $total) {
            $ratio = $this->computeRatio($male, $female);
            $malePct = $total > 0 ? round(($male / $total) * 100, 1) : 0.0;
            $femalePct = $total > 0 ? round(100.0 - $malePct, 1) : 0.0;

            return [
                'location' => $label,
                'male' => $male,
                'female' => $female,
                'total' => $total,
                'ratio' => $ratio,
                'male_percentage' => number_format($malePct, 1).'%',
                'female_percentage' => number_format($femalePct, 1).'%',
            ];
        };

        $rows = [
            $makeRow('Field Staff Total', $fieldMale, $fieldFemale, $fieldTotal),
            $makeRow('Head Office Total', $hoMale, $hoFemale, $hoTotal),
            $makeRow('Grand Total', $grandMale, $grandFemale, $grandTotal),
        ];

        return [
            'template' => 'location-ratio',
            'orientation' => 'landscape',
            'rows' => $rows,
        ];
    }

    // ========================================================
    // 9. MICROFINANCE HEAD OFFICE STAFF SUMMARY (HO ONLY)
    // ========================================================
    protected function microfinanceHeadOfficeStaffSummary(array $config, array $filters): array
    {
        $employees = $this->queryEmployees(true, $filters)->get();

        // Keep Head Office only
        $hoEmployees = $employees->filter(fn (Employee $e) => $this->isHeadOffice($e->currentBranch));

        // Group by salary grade
        $byGrade = $hoEmployees->groupBy(function (Employee $e) {
            $grade = $e->salaryGrade;
            $sort = $grade?->sort_order ?? 9999;
            $name = $grade ? ($grade->name.' ('.($grade->code ?: '').')') : 'No Salary Grade';

            return "{$sort}||{$name}";
        });

        // Sort grades by sort_order
        $sortedKeys = $byGrade->keys()->sort(function ($a, $b) {
            $sortA = (int) explode('||', $a)[0];
            $sortB = (int) explode('||', $b)[0];

            return $sortA <=> $sortB;
        });

        $rows = [];
        $sl = 1;
        $grandTotal = ['male' => 0, 'female' => 0, 'total' => 0];

        foreach ($sortedKeys as $gradeKey) {
            $gradeEmps = $byGrade[$gradeKey];
            [, $gradeLabel] = explode('||', $gradeKey, 2);

            // Group by designation
            $byDesig = $gradeEmps->groupBy(fn (Employee $e) => $e->designation?->name ?: 'Unassigned Designation');

            $gradeRows = [];
            foreach ($byDesig as $desigName => $desigEmps) {
                $male = 0;
                $female = 0;
                $total = count($desigEmps);

                foreach ($desigEmps as $emp) {
                    $gender = strtolower(trim((string) $emp->gender));
                    if ($gender === 'male') {
                        $male++;
                    } elseif ($gender === 'female') {
                        $female++;
                    }
                }

                $gradeRows[] = [
                    'salary_grade' => $gradeLabel,
                    'designation' => $desigName,
                    'male' => $male,
                    'female' => $female,
                    'total' => $total,
                ];

                $grandTotal['male'] += $male;
                $grandTotal['female'] += $female;
                $grandTotal['total'] += $total;
            }

            // Sort rows within grade by designation sequence
            usort($gradeRows, fn ($a, $b) => BranchOrganogram::compareDesignationSequence($a['designation'], $b['designation']));

            foreach ($gradeRows as $gr) {
                $gr['sl'] = $sl++;
                $rows[] = $gr;
            }
        }

        return [
            'template' => 'ho-grade-summary',
            'orientation' => 'landscape',
            'rows' => $rows,
            'totals' => $grandTotal,
            'grand_total' => $grandTotal['total'],
        ];
    }

    // =========================================================================
    // 10. DESIGNATION-WISE RECRUITMENT, SEPARATION & FINAL PAYMENT (DATE RANGE)
    // =========================================================================
    protected function designationRecruitmentSeparationPayment(array $config, array $filters): array
    {
        $from = Carbon::parse($filters['date_from'] ?? Carbon::today()->startOfYear()->toDateString())->startOfDay();
        $to = Carbon::parse($filters['date_to'] ?? Carbon::today()->toDateString())->endOfDay();

        // 1. Recruitment: joining_date between from and to
        $recruited = Employee::query()
            ->with('designation')
            ->whereNotNull('joining_date')
            ->whereBetween('joining_date', [$from->toDateString(), $to->toDateString()])
            ->get();

        // 2. Separation: dropout_date or resignation_date between from and to
        $separated = Employee::query()
            ->with(['designation', 'lastDesignation'])
            ->where(function (Builder $q) use ($from, $to) {
                $q->whereBetween('dropout_date', [$from->toDateString(), $to->toDateString()])
                    ->orWhere(function (Builder $sq) use ($from, $to) {
                        $sq->whereNull('dropout_date')
                            ->whereBetween('resignation_date', [$from->toDateString(), $to->toDateString()]);
                    });
            })
            ->get();

        // 3. Final Payment: employees with final_payment_date between from and to
        $finalPaid = Employee::query()
            ->with(['designation', 'lastDesignation'])
            ->whereNotNull('final_payment_date')
            ->whereBetween('final_payment_date', [$from->toDateString(), $to->toDateString()])
            ->get();

        return [
            'template' => 'recruitment-separation-payment',
            'orientation' => 'landscape',
            'date_range_label' => $from->format('d M Y').' to '.$to->format('d M Y'),
            'sections' => [
                'recruitment' => $this->buildMovementGrid('Recruitment', $recruited, 'joining_date', $from, $to),
                'separation' => $this->buildMovementGrid('Separation', $separated, 'service_end', $from, $to),
                'final_payment' => $this->buildMovementGrid('Final Payment Settlement', $finalPaid, 'final_payment_date', $from, $to),
            ],
        ];
    }

    // =========================================================
    // 11, 12, 13. ELIGIBILITY LISTS (PROBATION, CONFIRMATION, PROMO)
    // =========================================================
    protected function branchWiseEligibilityList(string $type, array $config, array $filters): array
    {
        $asOf = Carbon::parse($filters['as_of_date'] ?? 'now')->startOfDay();
        $horizon = $asOf->copy()->addMonths(6)->endOfDay();

        $query = $this->queryEmployees(true, $filters);
        if ($type === 'probation_increase' || $type === 'confirmation') {
            $query->where(function (Builder $q) {
                $q->where('employee_type_id', 2)
                    ->orWhereHas('employeeType', function (Builder $et) {
                        $et->whereRaw('LOWER(name) LIKE ?', ['%probation%'])
                            ->orWhere('probation_months', '>', 0);
                    });
            });
        }

        $employees = $query->get();
        $employeeIds = $employees->pluck('id')->all();
        $histories = $this->loadAssignmentHistories($employeeIds);
        $addresses = $this->loadAddresses($employeeIds);

        $eligibleStaff = [];

        foreach ($employees as $employee) {
            $joining = $employee->joining_date ? Carbon::parse($employee->joining_date)->startOfDay() : null;
            if (! $joining) {
                continue;
            }

            if ($type === 'probation_increase') {
                if (! $this->isProbationEmployee($employee)) {
                    continue;
                }
                // Not yet confirmed, upcoming increase date = joining + 3 months
                if ($employee->confirmation_date !== null) {
                    continue;
                }
                $upcomingDate = $joining->copy()->addMonths(3);
                if ($upcomingDate->gt($horizon)) {
                    continue;
                }

                $staffRow = $this->formatStaffRow($employee, $histories->get($employee->id, collect()), $addresses->get($employee->id, collect()), $asOf);
                $staffRow['upcoming_date'] = $upcomingDate->format('d-m-Y');
                $staffRow['upcoming_month'] = $upcomingDate->format('F Y');
                $eligibleStaff[] = $staffRow;
            } elseif ($type === 'confirmation') {
                if (! $this->isProbationEmployee($employee)) {
                    continue;
                }
                // Not yet confirmed, upcoming confirmation date = joining + 6 months
                if ($employee->confirmation_date !== null) {
                    continue;
                }
                $upcomingDate = $joining->copy()->addMonths(6);
                if ($upcomingDate->gt($horizon)) {
                    continue;
                }

                $staffRow = $this->formatStaffRow($employee, $histories->get($employee->id, collect()), $addresses->get($employee->id, collect()), $asOf);
                $staffRow['upcoming_date'] = $upcomingDate->format('d-m-Y');
                $staffRow['upcoming_month'] = $upcomingDate->format('F Y');
                $eligibleStaff[] = $staffRow;
            } elseif ($type === 'promotion') {
                // Salary Grade I to XIV, 2 years since last promo/grade change
                $grade = $employee->salaryGrade;
                if (! HrReportGrade::isGradeOneToFourteen($grade)) {
                    continue;
                }

                $anchorDate = $this->resolvePromotionAnchorDate($employee, $histories->get($employee->id, collect()));
                if (! $anchorDate) {
                    continue;
                }

                $upcomingDate = $anchorDate->copy()->addYears(2);
                if ($upcomingDate->gt($horizon)) {
                    continue;
                }

                $staffRow = $this->formatStaffRow($employee, $histories->get($employee->id, collect()), $addresses->get($employee->id, collect()), $asOf);
                $staffRow['last_promo_date'] = $anchorDate->format('d-m-Y');
                $staffRow['upcoming_date'] = $upcomingDate->format('d-m-Y');
                $staffRow['upcoming_month'] = $upcomingDate->format('F Y');
                $eligibleStaff[] = $staffRow;
            }
        }

        $eligibleStaff = $this->sortStaffRows($eligibleStaff);
        $sections = $this->groupRowsByBranch($eligibleStaff);

        return [
            'template' => 'eligibility-list',
            'orientation' => 'landscape',
            'eligibility_type' => $type,
            'eligibility_banner' => $config['eligibility_banner'] ?? '',
            'generated_date' => Carbon::now()->format('d-m-Y'),
            'sections' => $sections,
            'grand_total' => count($eligibleStaff),
        ];
    }

    // ==========================================
    // HELPER & QUERY METHODS
    // ==========================================

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Employee>
     */
    protected function queryEmployees(bool $activeOnly, array $filters): Builder
    {
        $query = Employee::query()
            ->with([
                'currentBranch.regionalOffice.zone',
                'lastBranch.regionalOffice.zone',
                'designation',
                'lastDesignation',
                'salaryGrade',
                'salaryStep',
                'employeeType',
            ]);

        if ($activeOnly) {
            $query->whereIn('status', ['active', 'on_leave']);
        }

        if (! empty($filters['branch_id'])) {
            $query->where('current_branch_id', $filters['branch_id']);
        }

        if (! empty($filters['designation_id'])) {
            $query->where('designation_id', $filters['designation_id']);
        }

        if (! empty($filters['regional_office_id']) || ! empty($filters['zone_id'])) {
            $query->whereHas('currentBranch', function (Builder $bq) use ($filters) {
                if (! empty($filters['regional_office_id'])) {
                    $bq->where('regional_office_id', $filters['regional_office_id']);
                }
                if (! empty($filters['zone_id'])) {
                    $bq->whereHas('regionalOffice', fn (Builder $rq) => $rq->where('zone_id', $filters['zone_id']));
                }
            });
        }

        return $query;
    }

    /**
     * Determine whether an employee is currently on probation.
     */
    protected function isProbationEmployee(Employee $employee): bool
    {
        $typeName = strtoupper(trim((string) ($employee->employeeType?->name ?? '')));
        if (str_contains($typeName, 'PROBATION')) {
            return true;
        }

        if ((int) $employee->employee_type_id === 2) {
            return true;
        }

        return (int) ($employee->employeeType?->probation_months ?? 0) > 0;
    }

    /**
     * @param  list<int>  $employeeIds
     * @return Collection<int, Collection<int, EmployeeAssignmentHistory>>
     */
    protected function loadAssignmentHistories(array $employeeIds): Collection
    {
        if (empty($employeeIds)) {
            return collect();
        }

        return EmployeeAssignmentHistory::query()
            ->whereIn('employee_id', $employeeIds)
            ->orderBy('effective_from', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->groupBy('employee_id');
    }

    /**
     * @param  list<int>  $employeeIds
     * @return Collection<int, Collection<int, object>>
     */
    protected function loadAddresses(array $employeeIds): Collection
    {
        if (empty($employeeIds)) {
            return collect();
        }

        return DB::table('employee_addresses')
            ->whereIn('employee_id', $employeeIds)
            ->get()
            ->groupBy('employee_id');
    }

    /**
     * @param  Collection<int, EmployeeAssignmentHistory>  $employeeHistories
     * @param  Collection<int, object>  $employeeAddresses
     * @return array<string, mixed>
     */
    protected function formatStaffRow(Employee $employee, Collection $employeeHistories, Collection $employeeAddresses, Carbon $asOf, bool $isPksf = false): array
    {
        $branch = $this->isEmployeeActive($employee)
            ? $employee->currentBranch
            : ($employee->lastBranch ?: $employee->currentBranch);

        $designation = $this->isEmployeeActive($employee)
            ? $employee->designation?->name
            : ($employee->lastDesignation?->name ?: $employee->designation?->name);

        $serviceEnd = $employee->getServiceEndDate();
        $joiningDate = $employee->joining_date ? Carbon::parse($employee->joining_date) : null;
        $presentLocJoiningDate = $this->resolvePresentLocationJoiningDate($employee, $branch?->id, $employeeHistories);

        $calc = $this->payrollCalc->calculateForEmployee($employee, $asOf);
        $basicSalary = $employee->resolveBasicSalary();
        $grossSalary = (float) ($calc['gross_salary'] ?? 0.0);

        $mobile = $employee->mobile_personal ?: $employee->mobile_official;

        $row = [
            'employee_id' => $employee->id,
            'pin' => $employee->pin ?: (string) $employee->id,
            'name' => $employee->name_en ?: ($employee->full_name_en ?: $employee->name),
            'designation' => $designation ?: 'N/A',
            'branch' => $this->branchLabel($branch),
            'branch_code' => $branch?->branch_code ?: '',
            'branch_model' => $branch,
            'is_head_office' => $this->isHeadOffice($branch),
            'joining_date' => $joiningDate ? $joiningDate->format('d-m-Y') : '',
            'present_location_joining_date' => $presentLocJoiningDate ? $presentLocJoiningDate->format('d-m-Y') : '',
            'duration_at_present_location' => ServiceDuration::format($presentLocJoiningDate, $serviceEnd, true),
            'service_length' => ServiceDuration::format($joiningDate, $serviceEnd, true),
            'mobile' => $mobile ?: '',
            'address_combined' => $this->resolveCombinedAddress($employee, $employeeAddresses),
            'salary_grade' => $employee->salaryGrade ? ($employee->salaryGrade->code ?: $employee->salaryGrade->name) : '',
            'salary_step' => $employee->salaryStep ? (string) $employee->salaryStep->step_number : '',
            'basic_salary' => $basicSalary > 0 ? number_format($basicSalary, 0) : '',
            'gross_salary' => $grossSalary > 0 ? number_format($grossSalary, 0) : '',
            'confirmation_date' => $employee->confirmation_date ? Carbon::parse($employee->confirmation_date)->format('d-m-Y') : '',
        ];

        if ($isPksf) {
            $row['father_name'] = $employee->father_name ?: '';
            $row['nid_smart_card'] = $employee->nid_number ?: $employee->smart_card_number ?: '';
            $row['date_of_birth'] = $employee->date_of_birth ? Carbon::parse($employee->date_of_birth)->format('d-m-Y') : '';
            $row['permanent_address'] = $this->resolvePermanentAddress($employee, $employeeAddresses);
        }

        return $row;
    }

    /**
     * @param  Collection<int, EmployeeAssignmentHistory>  $employeeHistories
     */
    protected function resolvePresentLocationJoiningDate(Employee $employee, ?int $currentBranchId, Collection $employeeHistories): ?Carbon
    {
        $joining = $employee->joining_date ? Carbon::parse($employee->joining_date)->startOfDay() : null;

        if (! $currentBranchId || $employeeHistories->isEmpty()) {
            return $joining;
        }

        // Trace backward from latest history row while branch matches currentBranchId
        $reversed = $employeeHistories->reverse();
        $streak = [];

        foreach ($reversed as $history) {
            if ((int) $history->branch_id === (int) $currentBranchId) {
                $streak[] = $history;
            } else {
                break;
            }
        }

        if (empty($streak)) {
            return $joining;
        }

        // The first row of this continuous streak
        $firstOfStreak = end($streak);
        $stintStart = Carbon::parse($firstOfStreak->effective_from)->startOfDay();

        // If the streak includes the very first history record and employee had no other branches
        $hasOtherBranches = $employeeHistories->contains(fn ($h) => (int) $h->branch_id !== (int) $currentBranchId);
        if (! $hasOtherBranches && $joining && $joining->lt($stintStart)) {
            return $joining;
        }

        return $stintStart;
    }

    /**
     * @param  Collection<int, EmployeeAssignmentHistory>  $employeeHistories
     */
    protected function resolvePromotionAnchorDate(Employee $employee, Collection $employeeHistories): ?Carbon
    {
        $promoDate = $employee->last_promotion_date ? Carbon::parse($employee->last_promotion_date)->startOfDay() : null;

        // Check history for salary grade change
        $lastGradeChangeDate = null;
        $prevGradeId = null;

        foreach ($employeeHistories as $h) {
            if ($h->salary_grade_id !== null) {
                if ($prevGradeId !== null && (int) $h->salary_grade_id !== (int) $prevGradeId) {
                    $lastGradeChangeDate = Carbon::parse($h->effective_from)->startOfDay();
                }
                $prevGradeId = $h->salary_grade_id;
            }
        }

        if ($promoDate && $lastGradeChangeDate) {
            return $promoDate->gte($lastGradeChangeDate) ? $promoDate : $lastGradeChangeDate;
        }

        if ($promoDate) {
            return $promoDate;
        }

        if ($lastGradeChangeDate) {
            return $lastGradeChangeDate;
        }

        return $employee->joining_date ? Carbon::parse($employee->joining_date)->startOfDay() : null;
    }

    /**
     * @param  Collection<int, object>  $employeeAddresses
     */
    protected function resolveCombinedAddress(Employee $employee, Collection $employeeAddresses): string
    {
        $present = $employeeAddresses->firstWhere('type', 'present');
        if ($present) {
            $parts = array_filter([
                $present->village,
                $present->union,
                $present->upazila,
                $present->district,
                $present->address_details,
            ], fn ($v) => $v !== null && trim((string) $v) !== '');

            if (! empty($parts)) {
                return implode(', ', $parts);
            }
        }

        $flatParts = array_filter([
            $employee->village,
            $employee->post_office,
            $employee->union_pouroshova,
            $employee->ward_no,
            $employee->upazila,
            $employee->district,
            $employee->address,
        ], fn ($v) => $v !== null && trim((string) $v) !== '');

        return implode(', ', $flatParts);
    }

    /**
     * @param  Collection<int, object>  $employeeAddresses
     */
    protected function resolvePermanentAddress(Employee $employee, Collection $employeeAddresses): string
    {
        $perm = $employeeAddresses->firstWhere('type', 'permanent');
        if ($perm) {
            $parts = array_filter([
                $perm->village,
                $perm->union,
                $perm->upazila,
                $perm->district,
                $perm->address_details,
            ], fn ($v) => $v !== null && trim((string) $v) !== '');

            if (! empty($parts)) {
                return implode(', ', $parts);
            }
        }

        $flatParts = array_filter([
            $employee->village,
            $employee->post_office,
            $employee->union_pouroshova,
            $employee->ward_no,
            $employee->upazila,
            $employee->district,
            $employee->address,
        ], fn ($v) => $v !== null && trim((string) $v) !== '');

        return implode(', ', $flatParts);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    protected function sortStaffRows(array $rows): array
    {
        usort($rows, function ($a, $b) {
            // 1. Head office first
            $isHoA = ! empty($a['is_head_office']);
            $isHoB = ! empty($b['is_head_office']);
            if ($isHoA !== $isHoB) {
                return $isHoA ? -1 : 1;
            }

            // 2. Branch code
            $branchCmp = BranchOrganogram::compareBranchesByCode($a['branch_model'] ?? null, $b['branch_model'] ?? null);
            if ($branchCmp !== 0) {
                return $branchCmp;
            }

            // 3. Designation hierarchy
            $desigCmp = BranchOrganogram::compareBranchStaffRow($a, $b);
            if ($desigCmp !== 0) {
                return $desigCmp;
            }

            // 4. PIN
            $pinCmp = HeadOfficeOrganogram::compareEmployeePins($a['pin'] ?? null, $b['pin'] ?? null);
            if ($pinCmp !== 0) {
                return $pinCmp;
            }

            // 5. Name
            return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
        });

        return $rows;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array{branch_name: string, staff_count: int, rows: list<array<string, mixed>>}>
     */
    protected function groupRowsByBranch(array $rows): array
    {
        $grouped = [];
        foreach ($rows as $row) {
            $branchName = $row['branch'] ?: 'Unassigned Branch';
            $grouped[$branchName] ??= [];
            $grouped[$branchName][] = $row;
        }

        $sections = [];
        foreach ($grouped as $bName => $bRows) {
            foreach ($bRows as $idx => &$item) {
                $item['sl'] = $idx + 1;
            }
            unset($item);

            $sections[] = [
                'branch_name' => $bName,
                'staff_count' => count($bRows),
                'rows' => $bRows,
            ];
        }

        return $sections;
    }

    /**
     * @param  Collection<int, Employee>  $employees
     * @return array<string, int>
     */
    protected function aggregateDesignationBuckets(Collection $employees): array
    {
        $counts = $this->emptyDesignationTotals();

        foreach ($employees as $employee) {
            $desig = $employee->designation?->name;
            $bucket = HrDesignationBucket::resolve($desig);
            $gender = strtolower(trim((string) $employee->gender));

            $prefix = match ($bucket) {
                HrDesignationBucket::BUCKET_OFFICER => 'officer',
                HrDesignationBucket::BUCKET_ACCOUNTANT => 'accountant',
                HrDesignationBucket::BUCKET_BRANCH_MANAGER => 'bm',
                HrDesignationBucket::BUCKET_REGIONAL_MANAGER => 'rm',
                HrDesignationBucket::BUCKET_ZONAL_MANAGER => 'zm',
                default => 'other',
            };

            $counts["{$prefix}_total"]++;
            $counts['row_total']++;

            if ($gender === 'male') {
                $counts["{$prefix}_male"]++;
                $counts['total_male']++;
            } elseif ($gender === 'female') {
                $counts["{$prefix}_female"]++;
                $counts['total_female']++;
            }
        }

        return $counts;
    }

    /**
     * @return array<string, int>
     */
    protected function emptyDesignationTotals(): array
    {
        return [
            'officer_male' => 0, 'officer_female' => 0, 'officer_total' => 0,
            'accountant_male' => 0, 'accountant_female' => 0, 'accountant_total' => 0,
            'bm_male' => 0, 'bm_female' => 0, 'bm_total' => 0,
            'rm_male' => 0, 'rm_female' => 0, 'rm_total' => 0,
            'zm_male' => 0, 'zm_female' => 0, 'zm_total' => 0,
            'other_male' => 0, 'other_female' => 0, 'other_total' => 0,
            'total_male' => 0, 'total_female' => 0, 'row_total' => 0,
        ];
    }

    /**
     * @param  Collection<int, Employee>  $collection
     */
    protected function buildMovementGrid(string $sectionTitle, Collection $collection, string $dateField, Carbon $rangeStart, Carbon $rangeEnd): array
    {
        // 1. Identify distinct active designations in this collection
        $designationNames = $collection->map(function (Employee $e) {
            return $e->designation?->name ?: ($e->lastDesignation?->name ?: 'Unassigned');
        })->unique()->filter()->values()->all();

        sort($designationNames);

        // 2. Build month periods from rangeStart to rangeEnd
        $months = [];
        $cursor = $rangeStart->copy()->startOfMonth();
        $endMonth = $rangeEnd->copy()->startOfMonth();

        while ($cursor->lte($endMonth)) {
            $monthKey = $cursor->format('Y-m');
            $yearKey = $cursor->format('Y');
            $monthLabel = $cursor->format('M Y');

            $months[$monthKey] = [
                'month_key' => $monthKey,
                'year_key' => $yearKey,
                'label' => $monthLabel,
                'counts' => array_fill_keys($designationNames, 0),
                'total' => 0,
            ];

            $cursor->addMonth();
        }

        // 3. Populate counts
        foreach ($collection as $emp) {
            $date = null;
            if ($dateField === 'joining_date') {
                $date = $emp->joining_date ? Carbon::parse($emp->joining_date) : null;
            } elseif ($dateField === 'service_end') {
                $date = $emp->dropout_date ? Carbon::parse($emp->dropout_date) : ($emp->resignation_date ? Carbon::parse($emp->resignation_date) : null);
            } elseif ($dateField === 'final_payment_date') {
                $date = $emp->final_payment_date ? Carbon::parse($emp->final_payment_date) : null;
            }

            if (! $date) {
                continue;
            }

            $mKey = $date->format('Y-m');
            if (! isset($months[$mKey])) {
                continue;
            }

            $desigName = $emp->designation?->name ?: ($emp->lastDesignation?->name ?: 'Unassigned');
            if (isset($months[$mKey]['counts'][$desigName])) {
                $months[$mKey]['counts'][$desigName]++;
                $months[$mKey]['total']++;
            }
        }

        // 4. Group months by year to provide year subtotals
        $byYear = collect($months)->groupBy('year_key');
        $gridRows = [];
        $grandTotalCounts = array_fill_keys($designationNames, 0);
        $grandTotalSum = 0;

        foreach ($byYear as $year => $yearMonths) {
            $yearSubtotal = [
                'is_subtotal' => true,
                'label' => "Total {$year}",
                'counts' => array_fill_keys($designationNames, 0),
                'total' => 0,
            ];

            foreach ($yearMonths as $m) {
                $gridRows[] = [
                    'is_subtotal' => false,
                    'label' => $m['label'],
                    'counts' => $m['counts'],
                    'total' => $m['total'],
                ];

                foreach ($designationNames as $dn) {
                    $yearSubtotal['counts'][$dn] += $m['counts'][$dn];
                    $grandTotalCounts[$dn] += $m['counts'][$dn];
                }
                $yearSubtotal['total'] += $m['total'];
                $grandTotalSum += $m['total'];
            }

            if ($byYear->count() > 1 || count($yearMonths) > 1) {
                $gridRows[] = $yearSubtotal;
            }
        }

        return [
            'title' => $sectionTitle,
            'designations' => $designationNames,
            'rows' => $gridRows,
            'totals' => [
                'counts' => $grandTotalCounts,
                'total' => $grandTotalSum,
            ],
        ];
    }

    protected function computeRatio(int $male, int $female): string
    {
        if ($male === 0 && $female === 0) {
            return '0 : 0';
        }
        if ($male === 0) {
            return "0 : {$female}";
        }
        if ($female === 0) {
            return "{$male} : 0";
        }

        $gcd = $this->gcd($male, $female);

        return ($male / $gcd).' : '.($female / $gcd);
    }

    protected function gcd(int $a, int $b): int
    {
        return $b === 0 ? $a : $this->gcd($b, $a % $b);
    }

    protected function isEmployeeActive(Employee $employee): bool
    {
        return in_array($employee->status, ['active', 'on_leave'], true);
    }

    protected function isHeadOffice(?Branch $branch): bool
    {
        if (! $branch) {
            return false;
        }

        return BranchOrganogram::isHeadOfficeStaffRow([
            'is_head_office' => (bool) $branch->is_head_office,
            'branch_code' => $branch->branch_code,
            'branch' => $branch->name,
        ]);
    }

    protected function branchLabel(?Branch $branch): string
    {
        if (! $branch) {
            return 'Unassigned Branch';
        }

        $code = trim((string) $branch->branch_code);
        $name = trim((string) $branch->name);

        return $code !== '' ? "[{$code}] {$name}" : $name;
    }
}
