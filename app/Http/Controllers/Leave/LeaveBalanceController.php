<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LeaveBalanceController extends Controller
{
    private function abortUnlessSuperAdmin(): void
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        if (! $user || ! $user->isSuperAdmin()) {
            abort(403);
        }
    }

    /**
     * Apply default leave balances for all active employees for a year.
     *
     * Defaults are based on leave type names:
     * - Annual Leave, Casual Leave, Medical Leave: all employees
     * - Maternity Leave: female only
     * - Paternity Leave: male only
     *
     * If update_existing is true, allocated_days will be set to leaveType.days_allowed
     * while preserving used_days; remaining_days will be recalculated.
     */
    public function applyDefaults(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'update_existing' => 'sometimes|boolean',
        ]);

        $year = (int) $validated['year'];
        $updateExisting = (bool) ($validated['update_existing'] ?? false);

        // Find required leave types by name:
        // 1) exact match on lower(trim(name)) for common canonical names
        // 2) fallback: keyword match (e.g. "paternity" anywhere in the name)
        $wanted = [
            'annual' => ['annual leave', 'annual'],
            'casual' => ['casual leave', 'casual'],
            'maternity' => ['maternity leave', 'maternity'],
            'paternity' => ['paternity leave', 'paternity'],
            'medical' => ['medical leave', 'medical'],
        ];

        $allTypes = LeaveType::query()->get(['id', 'name', 'days_allowed']);

        // For gender clean-up, consider ANY leave type whose name contains these keywords
        // (handles variants like double spaces, "(Paid)", etc).
        $maternityTypeIds = $allTypes
            ->filter(function (LeaveType $lt) {
                $n = strtolower(trim((string) $lt->name));
                return $n !== '' && str_contains($n, 'maternity');
            })
            ->pluck('id')
            ->values();

        $paternityTypeIds = $allTypes
            ->filter(function (LeaveType $lt) {
                $n = strtolower(trim((string) $lt->name));
                return $n !== '' && str_contains($n, 'paternity');
            })
            ->pluck('id')
            ->values();
        $byNormalizedName = $allTypes->mapWithKeys(function (LeaveType $lt) {
            $key = strtolower(trim((string) $lt->name));
            return [$key => $lt];
        });

        /** @var array<string, LeaveType> $resolvedTypes */
        $resolvedTypes = [];

        foreach ($wanted as $key => [$canonical, $keyword]) {
            $exact = $byNormalizedName->get($canonical);
            if ($exact) {
                $resolvedTypes[$canonical] = $exact;
                continue;
            }

            $match = $allTypes->first(function (LeaveType $lt) use ($keyword) {
                $n = strtolower(trim((string) $lt->name));
                return $n !== '' && str_contains($n, $keyword);
            });

            if ($match) {
                $resolvedTypes[$canonical] = $match;
            }
        }

        $leaveTypes = collect($resolvedTypes);

        $missing = collect($wanted)
            ->map(fn (array $v) => $v[0])
            ->reject(fn (string $canonical) => $leaveTypes->has($canonical))
            ->values()
            ->all();

        if (count($missing) > 0) {
            return redirect()->back()->with('error', 'Missing leave types: ' . implode(', ', $missing) . '. Please create them first.');
        }

        $employees = Employee::query()
            ->where('status', 'active')
            ->get(['id', 'gender']);

        $created = 0;
        $updated = 0;
        $skippedExisting = 0;
        $deletedWrongGender = 0;
        $keptWrongGenderWithUsage = 0;

        foreach ($employees as $employee) {
            $gender = strtolower(trim((string) ($employee->gender ?? '')));
            $isMale = $gender === 'male' || $gender === 'm';
            $isFemale = $gender === 'female' || $gender === 'f';

            // Always clean up gender-inapplicable balances even if the defaults list doesn't match exactly.
            // Rule:
            // - Maternity: ONLY female may have it → if NOT female, remove
            // - Paternity: ONLY male may have it → if NOT male, remove
            // (when used_days == 0; keep otherwise to avoid destroying history)
            if (! $isFemale && $maternityTypeIds->isNotEmpty()) {
                $wrong = LeaveBalance::query()
                    ->where('employee_id', $employee->id)
                    ->where('year', $year)
                    ->whereIn('leave_type_id', $maternityTypeIds)
                    ->get();
                foreach ($wrong as $existing) {
                    if ((int) $existing->used_days <= 0) {
                        $existing->delete();
                        $deletedWrongGender++;
                    } else {
                        $keptWrongGenderWithUsage++;
                    }
                }
            }
            if (! $isMale && $paternityTypeIds->isNotEmpty()) {
                $wrong = LeaveBalance::query()
                    ->where('employee_id', $employee->id)
                    ->where('year', $year)
                    ->whereIn('leave_type_id', $paternityTypeIds)
                    ->get();
                foreach ($wrong as $existing) {
                    if ((int) $existing->used_days <= 0) {
                        $existing->delete();
                        $deletedWrongGender++;
                    } else {
                        $keptWrongGenderWithUsage++;
                    }
                }
            }

            foreach ($wanted as $key => [$typeName, $_keyword]) {
                /** @var LeaveType|null $leaveType */
                $leaveType = $leaveTypes->get($typeName);
                if (! $key) {
                    continue;
                }
                if (! $leaveType) {
                    // Shouldn't happen because of the $missing check, but keep it safe.
                    continue;
                }

                $applicable = match ($key) {
                    'maternity' => $isFemale,
                    'paternity' => $isMale,
                    default => true,
                };

                $existing = LeaveBalance::query()
                    ->where('employee_id', $employee->id)
                    ->where('leave_type_id', $leaveType->id)
                    ->where('year', $year)
                    ->first();

                if (! $applicable) {
                    if ($existing) {
                        if ((int) $existing->used_days <= 0) {
                            $existing->delete();
                            $deletedWrongGender++;
                        } else {
                            // Don't destroy historical usage.
                            $keptWrongGenderWithUsage++;
                        }
                    }
                    continue;
                }

                if ($existing) {
                    if (! $updateExisting) {
                        $skippedExisting++;
                        continue;
                    }

                    $existing->allocated_days = (int) $leaveType->days_allowed;
                    $existing->remaining_days = max(0, (int) $existing->allocated_days - (int) $existing->used_days);
                    $existing->save();
                    $updated++;
                    continue;
                }

                $allocated = (int) $leaveType->days_allowed;
                LeaveBalance::create([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                    'allocated_days' => $allocated,
                    'used_days' => 0,
                    'remaining_days' => $allocated,
                ]);
                $created++;
            }
        }

        $msg = "Defaults applied for year {$year}. Created {$created}.";
        if ($updateExisting) {
            $msg .= " Updated {$updated}.";
        } else {
            $msg .= " Skipped existing {$skippedExisting}.";
        }
        if ($deletedWrongGender > 0) {
            $msg .= " Removed {$deletedWrongGender} wrong-gender balances with zero usage.";
        }
        if ($keptWrongGenderWithUsage > 0) {
            $msg .= " Kept {$keptWrongGenderWithUsage} wrong-gender balances because they have used days.";
        }

        return redirect()->route('leave.balances.index', ['year' => $year])
            ->with('success', $msg);
    }

    /**
     * Display a listing of leave balances.
     */
    public function index(Request $request)
    {
        $year = (int) ($request->year ?? Carbon::now()->year);
        $branchId = $request->input('branch_id');
        $search = trim((string) $request->input('search', ''));

        $query = Employee::query()
            ->select([
                'id',
                'employee_id',
                'first_name',
                'last_name',
                'pin',
                'name_en',
                'gender',
                'department_id',
                'designation_id',
                'current_branch_id',
                'status',
            ])
            ->with([
                'department',
                'designation',
                'currentBranch',
                'leaveBalances' => function ($q) use ($year) {
                    $q->where('year', $year)->with('leaveType');
                },
            ])
            ->where('status', 'active')
            ->when($branchId, function ($q, $branchId) {
                $q->where('current_branch_id', $branchId);
            })
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%")
                        ->orWhere('name_en', 'like', "%{$search}%");
                });
            });

        $employees = $query
            ->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString();

        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        $leaveTypes = LeaveType::query()
            ->orderBy('name')
            ->get(['id', 'name', 'days_allowed']);

        return Inertia::render('leave/balances/index', [
            'employees' => $employees,
            'branches' => $branches,
            'leaveTypes' => $leaveTypes,
            'filters' => [
                'year' => (string) $year,
                'branch_id' => $branchId ? (string) $branchId : '',
                'search' => $search,
            ],
            'year' => $year,
            'years' => range(Carbon::now()->year - 2, Carbon::now()->year + 1),
        ]);
    }

    /**
     * Show form to create a new leave balance.
     */
    public function create()
    {
        $employees = Employee::where('status', 'active')->get();
        $leaveTypes = LeaveType::all();
        $currentYear = Carbon::now()->year;

        return Inertia::render('leave/balances/create', [
            'employees' => $employees,
            'leaveTypes' => $leaveTypes,
            'currentYear' => $currentYear,
            'years' => range($currentYear - 1, $currentYear + 1),
        ]);
    }

    /**
     * Store a newly created leave balance.
     */
    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'year' => 'required|integer|min:2000|max:2100',
            'allocated_days' => 'required|integer|min:0',
            'used_days' => 'required|integer|min:0',
        ]);

        // Check for existing balance
        $existing = LeaveBalance::where('employee_id', $request->employee_id)
            ->where('leave_type_id', $request->leave_type_id)
            ->where('year', $request->year)
            ->first();

        if ($existing) {
            return redirect()->back()->withErrors([
                'employee_id' => 'Leave balance already exists for this employee, leave type, and year.',
            ]);
        }

        $data = $request->all();
        $data['remaining_days'] = $request->allocated_days - $request->used_days;

        LeaveBalance::create($data);

        return redirect()->route('leave.balances.index', ['year' => $request->year])
            ->with('success', 'Leave balance created successfully.');
    }

    /**
     * Show form to edit a leave balance.
     */
    public function edit(LeaveBalance $leaveBalance)
    {
        $this->abortUnlessSuperAdmin();

        $leaveBalance->load([
            'employee.department',
            'employee.designation',
            'leaveType',
        ]);

        $employees = Employee::with(['department', 'designation'])
            ->where('status', 'active')
            ->get();
        $leaveTypes = LeaveType::all();
        $currentYear = Carbon::now()->year;

        return Inertia::render('leave/balances/edit', [
            'leaveBalance' => $leaveBalance,
            'employees' => $employees,
            'leaveTypes' => $leaveTypes,
            'years' => range($currentYear - 1, $currentYear + 1),
        ]);
    }

    /**
     * Update the specified leave balance.
     */
    public function update(Request $request, LeaveBalance $leaveBalance)
    {
        $this->abortUnlessSuperAdmin();

        $request->validate([
            'allocated_days' => 'required|integer|min:0',
            'used_days' => 'required|integer|min:0',
        ]);

        $leaveBalance->allocated_days = $request->allocated_days;
        $leaveBalance->used_days = $request->used_days;
        $leaveBalance->remaining_days = $request->allocated_days - $request->used_days;
        $leaveBalance->save();

        return redirect()->route('leave.balances.index', ['year' => $leaveBalance->year])
            ->with('success', 'Leave balance updated successfully.');
    }

    /**
     * Allocate leave balances to multiple employees.
     */
    public function allocateBulk()
    {
        $employees = Employee::with(['department', 'designation'])
        ->where('status', 'active')
        ->get();
        $departments = Department::all();
        $leaveTypes = LeaveType::all();
        $currentYear = Carbon::now()->year;

        return Inertia::render('leave/balances/allocate-bulk', [
            'employees' => $employees,
            'departments' => $departments,
            'leaveTypes' => $leaveTypes,
            'currentYear' => $currentYear,
            'years' => range($currentYear - 1, $currentYear + 1),
        ]);
    }

    /**
     * Process bulk allocation of leave balances.
     */
    public function storeBulk(Request $request)
    {
        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'year' => 'required|integer|min:2000|max:2100',
            'allocated_days' => 'required|integer|min:0',
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
        ]);

        $leaveType = LeaveType::find($request->leave_type_id);
        $year = $request->year;
        $allocatedDays = $request->allocated_days;
        $created = 0;
        $skipped = 0;

        foreach ($request->employee_ids as $employeeId) {
            // Check for existing balance
            $existing = LeaveBalance::where('employee_id', $employeeId)
                ->where('leave_type_id', $request->leave_type_id)
                ->where('year', $year)
                ->first();

            if ($existing) {
                $skipped++;
                continue;
            }

            LeaveBalance::create([
                'employee_id' => $employeeId,
                'leave_type_id' => $request->leave_type_id,
                'year' => $year,
                'allocated_days' => $allocatedDays,
                'used_days' => 0,
                'remaining_days' => $allocatedDays,
            ]);

            $created++;
        }

        return redirect()->route('leave.balances.index', ['year' => $year])
            ->with('success', "Leave balance allocated successfully for {$created} employees. Skipped {$skipped} employees with existing balances.");
    }

    /**
     * Reset leave balances for a new year.
     */
    public function resetForNewYear(Request $request)
    {
        $request->validate([
            'from_year' => 'required|integer|min:2000|max:2100',
            'to_year' => 'required|integer|min:2000|max:2100|gt:from_year',
        ]);

        $fromYear = $request->from_year;
        $toYear = $request->to_year;

        // Get all leave balances from previous year
        $previousBalances = LeaveBalance::where('year', $fromYear)->get();
        $created = 0;

        foreach ($previousBalances as $prevBalance) {
            // Check if the leave type allows carry forward
            $leaveType = LeaveType::find($prevBalance->leave_type_id);

            // Check for existing balance in new year
            $existing = LeaveBalance::where('employee_id', $prevBalance->employee_id)
                ->where('leave_type_id', $prevBalance->leave_type_id)
                ->where('year', $toYear)
                ->first();

            if ($existing) {
                continue;
            }

            // Calculate new allocation
            $allocatedDays = $leaveType->days_allowed;

            // Add carry forward days if applicable
            $carryForwardDays = 0;
            if ($leaveType->carry_forward && $prevBalance->remaining_days > 0) {
                $carryForwardDays = $prevBalance->remaining_days;
            }

            LeaveBalance::create([
                'employee_id' => $prevBalance->employee_id,
                'leave_type_id' => $prevBalance->leave_type_id,
                'year' => $toYear,
                'allocated_days' => $allocatedDays + $carryForwardDays,
                'used_days' => 0,
                'remaining_days' => $allocatedDays + $carryForwardDays,
            ]);

            $created++;
        }

        return redirect()->route('leave.balances.index', ['year' => $toYear])
            ->with('success', "Created {$created} leave balances for year {$toYear}.");
    }
}
