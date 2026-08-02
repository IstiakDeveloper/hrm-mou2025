<?php

namespace App\Http\Controllers\Movement;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Mail\NewMovementNotification;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Movement;
use App\Models\MovementLogBook;
use App\Models\RegionalOffice;
use App\Models\User;
use App\Models\Zone;
use App\Notifications\HrmNotification;
use App\Services\OrganogramAccessService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Support\ProjectPdf;
use Shuchkin\SimpleXLSXGen;

class MovementController extends Controller
{
    use PaginatesForInertia;

    /**
     * Parse datetime from the client (ISO 8601 with offset or naive) into app timezone for DB storage.
     */
    private function parseMovementDateTimeToApp(string $value): Carbon
    {
        return Carbon::parse($value)->timezone(config('app.timezone'));
    }

    /**
     * Get branch work start/end times for an employee (fallback 09:00-18:00).
     */
    private function getBranchWorkTimesForEmployee(int $employeeId): array
    {
        $employee = \App\Models\Employee::find($employeeId);
        $branchId = $employee?->current_branch_id ?? $employee?->branch_id ?? null;

        $default = ['work_start_time' => '09:00:00', 'work_end_time' => '18:00:00'];
        if (! $branchId) {
            return $default;
        }

        $settings = \App\Models\AttendanceSetting::where('branch_id', $branchId)->first();
        if (! $settings) {
            return $default;
        }

        return [
            'work_start_time' => $settings->work_start_time ?: $default['work_start_time'],
            'work_end_time' => $settings->work_end_time ?: $default['work_end_time'],
        ];
    }

    /**
     * Merge a time into attendance check_in/check_out using min/max rule.
     * Times are stored as "H:i:s" strings.
     */
    private function mergeAttendanceTimes(Attendance $attendance, ?string $inCandidate, ?string $outCandidate): void
    {
        $toSeconds = function ($value): ?int {
            if ($value === null || $value === '') {
                return null;
            }
            if ($value instanceof Carbon) {
                return ($value->hour * 3600) + ($value->minute * 60) + $value->second;
            }
            if (is_string($value)) {
                try {
                    $dt = Carbon::parse($value);

                    return ($dt->hour * 3600) + ($dt->minute * 60) + $dt->second;
                } catch (\Throwable $e) {
                    return null;
                }
            }

            return null;
        };

        if ($inCandidate) {
            if (! $attendance->check_in) {
                $attendance->check_in = $inCandidate;
            } else {
                $existingSec = $toSeconds($attendance->check_in);
                $candidateSec = $toSeconds($inCandidate);
                if ($existingSec === null || ($candidateSec !== null && $candidateSec < $existingSec)) {
                    $attendance->check_in = $inCandidate;
                }
            }
        }

        if ($outCandidate) {
            if (! $attendance->check_out) {
                $attendance->check_out = $outCandidate;
            } else {
                $existingSec = $toSeconds($attendance->check_out);
                $candidateSec = $toSeconds($outCandidate);
                if ($existingSec === null || ($candidateSec !== null && $candidateSec > $existingSec)) {
                    $attendance->check_out = $outCandidate;
                }
            }
        }
    }

    /**
     * Display a listing of movements.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $userEmployeeId = $user->employee_id;
        $hasViewPermission = $user->hasPermission('movements.view');
        $isBranchManager = $user->hasPermission('branch_manager') && $user->branch_id;
        $userBranchId = $user->branch_id;

        $isBranchHead = false;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            $employee = Employee::find($userEmployeeId);
            $isBranchHead = $branch && $employee && $branch->isEmployeeBranchHead($employee);
        }

        $isDepartmentHead = false;
        $userDepartmentId = null;
        if ($userEmployeeId) {
            $employee = Employee::find($userEmployeeId);
            if ($employee && $employee->department_id) {
                $userDepartmentId = $employee->department_id;
                $department = Department::find($employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $userEmployeeId;
            }
        }

        if (! $request->filled('from_date') && ! $request->filled('to_date') && ! $request->filled('search')) {
            $request->merge([
                'from_date' => now()->startOfMonth()->toDateString(),
                'to_date' => now()->endOfMonth()->toDateString(),
            ]);
        }

        $query = $this->buildMovementIndexQuery($request, $user);

        $summaryQuery = clone $query;
        $summary = [
            'total' => $summaryQuery->count(),
            'active' => (clone $summaryQuery)->where('status', 'active')->count(),
            'completed' => (clone $summaryQuery)->where('status', 'completed')->count(),
            'pending' => (clone $summaryQuery)->where('status', 'pending')->count(),
            'approved' => (clone $summaryQuery)->where('status', 'approved')->count(),
        ];

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $movements = $query->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        // Get accessible departments and employees
        $departments = $this->getAccessibleDepartments($user);
        $employees = $this->getAccessibleEmployees($user);
        $organizationFilters = $this->getAccessibleOrganizationFilters($user);

        return Inertia::render('movement/index', [
            'movements' => $this->inertiaPagination($movements),
            'summary' => $summary,
            'departments' => $departments,
            'employees' => $employees,
            'zones' => $organizationFilters['zones'],
            'regionalOffices' => $organizationFilters['regionalOffices'],
            'branches' => $organizationFilters['branches'],
            'filters' => $request->only($this->movementIndexFilterKeys()),
            'userPermissions' => [
                'canView' => $hasViewPermission,
                'canCreate' => $user->hasPermission('movements.create'),
                'canEdit' => $user->hasPermission('movements.edit'),
                'canDelete' => $user->hasPermission('movements.delete'),
                'isBranchManager' => $isBranchManager,
                'isBranchHead' => $isBranchHead,
                'isDepartmentHead' => $isDepartmentHead,
                'userBranchId' => $userBranchId,
                'userDepartmentId' => $userDepartmentId,
                'isEmployee' => $userEmployeeId ? true : false,
                'employeeId' => $userEmployeeId,
            ],
        ]);
    }

    /**
     * Download the current index listing as PDF (respects active filters).
     */
    public function exportIndexPdf(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);

        $movements = $this->buildMovementIndexQuery($request, $user)
            ->orderByDesc('id')
            ->get();

        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.movement-index', [
            'movements' => $movements,
            'filterSummary' => $this->movementIndexFilterSummary($request),
        ]);

        return $pdf->download('movements-'.now()->format('Y-m-d-His').'.pdf');
    }

    /**
     * Print-friendly TSX document for the current filtered index listing.
     */
    public function printIndex(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);

        $movements = $this->buildMovementIndexQuery($request, $user)
            ->orderByDesc('id')
            ->get();

        return Inertia::render('movement/print', [
            'movements' => $movements,
            'filterSummary' => $this->movementIndexFilterSummary($request),
            'generatedAt' => now()->toIso8601String(),
            'companyName' => config('payroll_reports.company_name', config('app.name')),
            'companyAddress' => config('payroll_reports.company_address', ''),
        ]);
    }

    /**
     * Download the current index listing as XLSX (respects active filters).
     */
    public function exportIndexXlsx(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);

        $movements = $this->buildMovementIndexQuery($request, $user)
            ->orderByDesc('id')
            ->get();

        $rows = [[
            'PIN',
            'Employee',
            'Branch',
            'Department',
            'Designation',
            'Type',
            'From',
            'Return',
            'Destination',
            'Status',
            'Duration',
            'Purpose',
        ]];

        foreach ($movements as $movement) {
            $employee = $movement->employee;
            $rows[] = [
                (string) ($employee->pin ?? $employee->employee_id ?? ''),
                (string) ($employee->name_en ?? $employee->full_name_en ?? ''),
                (string) ($employee->branch->name ?? ''),
                (string) ($employee->department->name ?? ''),
                (string) ($employee->designation->name ?? ''),
                ucfirst((string) $movement->movement_type),
                Carbon::parse($movement->from_datetime)->format('Y-m-d H:i'),
                $movement->status === 'completed' && $movement->actual_return_datetime
                    ? Carbon::parse($movement->actual_return_datetime)->format('Y-m-d H:i')
                    : 'Not returned',
                (string) $movement->destination,
                ucfirst((string) $movement->status),
                $this->movementDurationLabel($movement),
                (string) $movement->purpose,
            ];
        }

        $path = tempnam(sys_get_temp_dir(), 'movement-xlsx-');
        if ($path === false) {
            abort(500, 'Could not create export file.');
        }

        SimpleXLSXGen::fromArray($rows)->saveAs($path);
        $content = file_get_contents($path);
        @unlink($path);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="movements-'.now()->format('Y-m-d-His').'.xlsx"',
        ]);
    }

    private function buildMovementIndexQuery(Request $request, User $user)
    {
        $query = Movement::with(['employee.department', 'employee.designation', 'employee.branch']);

        $hasViewPermission = $user->hasPermission('movements.view');
        $userEmployeeId = $user->employee_id;

        if (! $hasViewPermission) {
            if ($userEmployeeId) {
                $query->where('employee_id', $userEmployeeId);
            } else {
                $query->whereRaw('1 = 0');
            }
        } else {
            OrganogramAccessService::constrainViaEmployeeRelation($query, $user, 'employee');
        }

        $this->applyMovementIndexFilters($query, $request);

        return $query;
    }

    private function applyMovementIndexFilters($query, Request $request): void
    {
        $query->when($request->filled('status') && $request->status !== 'all', function ($query) use ($request) {
            $query->where('status', $request->status);
        })
            ->when($request->filled('department_id') && $request->department_id !== 'all', function ($query) use ($request) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('department_id', $request->department_id);
                });
            })
            ->when($request->filled('employee_id') && $request->employee_id !== 'all', function ($query) use ($request) {
                $query->where('employee_id', $request->employee_id);
            })
            ->when($request->filled('movement_type') && $request->movement_type !== 'all', function ($query) use ($request) {
                $query->where('movement_type', $request->movement_type);
            })
            ->when($request->filled('branch_id') && $request->branch_id !== 'all', function ($query) use ($request) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('current_branch_id', $request->branch_id);
                });
            })
            ->when(
                $request->filled('regional_office_id') && $request->regional_office_id !== 'all' && ! ($request->filled('branch_id') && $request->branch_id !== 'all'),
                function ($query) use ($request) {
                    $query->whereHas('employee.branch', function ($q) use ($request) {
                        $q->where('regional_office_id', $request->regional_office_id);
                    });
                }
            )
            ->when(
                $request->filled('zone_id') && $request->zone_id !== 'all'
                    && ! ($request->filled('branch_id') && $request->branch_id !== 'all')
                    && ! ($request->filled('regional_office_id') && $request->regional_office_id !== 'all'),
                function ($query) use ($request) {
                    $query->whereHas('employee.branch.regionalOffice', function ($q) use ($request) {
                        $q->where('zone_id', $request->zone_id);
                    });
                }
            )
            ->when($this->filledFilter($request, 'from_date'), function ($query) use ($request) {
                $query->whereDate('from_datetime', '>=', $request->input('from_date'));
            })
            ->when($this->filledFilter($request, 'to_date'), function ($query) use ($request) {
                $query->whereDate('from_datetime', '<=', $request->input('to_date'));
            })
            ->when($request->boolean('cross_day_only'), function ($query) {
                $query->where(function ($q) {
                    $q->where(function ($q2) {
                        $q2->where('status', 'completed')
                            ->whereNotNull('actual_return_datetime')
                            ->whereRaw('DATE(from_datetime) != DATE(actual_return_datetime)');
                    })->orWhere(function ($q2) {
                        $q2->where('status', 'active')
                            ->whereRaw('DATE(from_datetime) < CURDATE()');
                    });
                });
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%");
                });
            });
    }

    private function movementDurationLabel(Movement $movement): string
    {
        if ($movement->status !== 'completed' || ! $movement->actual_return_datetime) {
            return '—';
        }

        $from = Carbon::parse($movement->from_datetime);
        $to = Carbon::parse($movement->actual_return_datetime);
        $hours = $from->diffInHours($to);
        $minutes = $from->diffInMinutes($to) % 60;

        return "{$hours}h {$minutes}m";
    }

    private function movementIndexFilterSummary(Request $request): string
    {
        $parts = [];

        if ($this->filledFilter($request, 'from_date')) {
            $parts[] = 'From '.$request->input('from_date');
        }
        if ($this->filledFilter($request, 'to_date')) {
            $parts[] = 'To '.$request->input('to_date');
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $parts[] = 'Status: '.ucfirst((string) $request->status);
        }
        if ($request->filled('movement_type') && $request->movement_type !== 'all') {
            $parts[] = 'Type: '.ucfirst((string) $request->movement_type);
        }
        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $branch = Branch::find($request->branch_id);
            $parts[] = 'Branch: '.($branch->name ?? $request->branch_id);
        }
        if ($request->boolean('cross_day_only')) {
            $parts[] = 'Not closed same day';
        }
        if ($request->search) {
            $parts[] = 'Search: '.$request->search;
        }

        return $parts === [] ? 'All movements' : implode(', ', $parts);
    }

    private function filledFilter(Request $request, string $key): bool
    {
        $value = $request->input($key);

        return $value !== null && $value !== '' && $value !== 'all';
    }

    /**
     * Zone / regional office / branch options scoped to the user's organogram access.
     *
     * @return array{zones: \Illuminate\Support\Collection, regionalOffices: \Illuminate\Support\Collection, branches: \Illuminate\Support\Collection}
     */
    private function getAccessibleOrganizationFilters($user): array
    {
        $branchIds = OrganogramAccessService::accessibleBranchIdList($user);

        if ($branchIds === []) {
            return [
                'zones' => collect(),
                'regionalOffices' => collect(),
                'branches' => collect(),
            ];
        }

        $branchesQuery = Branch::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->select(['id', 'name', 'branch_code', 'regional_office_id']);

        if ($branchIds !== null) {
            $branchesQuery->whereIn('id', $branchIds);
        }

        $branches = $branchesQuery->get();
        $regionalOfficeIds = $branches->pluck('regional_office_id')->filter()->unique()->values();

        $regionalOffices = $regionalOfficeIds->isEmpty()
            ? collect()
            : RegionalOffice::query()
                ->whereIn('id', $regionalOfficeIds)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'zone_id']);

        $zoneIds = $regionalOffices->pluck('zone_id')->filter()->unique()->values();

        $zones = $zoneIds->isEmpty()
            ? collect()
            : Zone::query()
                ->whereIn('id', $zoneIds)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']);

        return [
            'zones' => $zones,
            'regionalOffices' => $regionalOffices,
            'branches' => $branches,
        ];
    }

    /**
     * Get departments accessible to the user based on permissions
     */
    private function getAccessibleDepartments($user)
    {
        $ids = OrganogramAccessService::accessibleDepartmentIdList($user);
        if ($ids === null) {
            return Department::query()->orderBy('name')->get();
        }
        if ($ids === []) {
            return collect([]);
        }

        return Department::query()->whereIn('id', $ids)->orderBy('name')->get();
    }

    /**
     * Get employees accessible to the user based on permissions
     */
    private function getAccessibleEmployees($user)
    {
        $q = Employee::query()->where('status', 'active')->orderBy('name_en');
        OrganogramAccessService::constrainVisibleEmployees($q, $user);

        return $q->get();
    }

    /**
     * Show form to create a new movement.
     */
    /**
     * Whether the user may pick any employee when creating a movement (HR/desk).
     * Regular employees have movements.create but not employees.view — they may only create for themselves.
     */
    private function canSelectEmployeeForMovement($user): bool
    {
        return $user->hasPermission('movements.create') && $user->hasPermission('employees.view');
    }

    private function getActiveMovementForEmployee(int $employeeId): ?Movement
    {
        return Movement::query()
            ->where('employee_id', $employeeId)
            ->where('status', 'active')
            ->orderByDesc('id')
            ->first();
    }

    private function redirectForActiveMovement(Movement $activeMovement)
    {
        return redirect()
            ->route('movements.show', $activeMovement->id)
            ->with(
                'warning',
                'This employee already has an active movement. Please close the existing movement before creating a new one.'
            );
    }

    public function create()
    {
        $user = Auth::user();
        $employee = $user->employee;

        if (! $employee && ! $user->hasPermission('movements.create')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to create movement requests.');
        }

        $canSelectEmployee = $this->canSelectEmployeeForMovement($user);

        if (! $canSelectEmployee && $employee) {
            $activeMovement = $this->getActiveMovementForEmployee((int) $employee->id);
            if ($activeMovement) {
                return $this->redirectForActiveMovement($activeMovement);
            }
        }

        $employees = $canSelectEmployee
            ? Employee::where('status', 'active')->with(['department', 'designation'])->get()
            : ($employee ? collect([$employee->load(['department', 'designation'])]) : collect());

        return Inertia::render('movement/create', [
            'employees' => $employees,
            'currentEmployee' => $employee,
            'isAdmin' => $canSelectEmployee,
            'movementTypes' => ['official', 'personal'],
        ]);
    }

    /**
     * Store a newly created movement.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $employee = $user->employee;

        $canSelectEmployee = $this->canSelectEmployeeForMovement($user);

        // Preprocess request: if to_datetime is missing, default it to from_datetime + 8 hours
        if ($request->filled('from_datetime') && !$request->filled('to_datetime')) {
            try {
                $from = \Carbon\Carbon::parse($request->from_datetime);
                $request->merge([
                    'to_datetime' => $from->copy()->addHours(8)->toIso8601String()
                ]);
            } catch (\Exception $e) {
                // Let validation catch invalid date formatting
            }
        }

        // Validate request
        $request->validate([
            'employee_id' => $canSelectEmployee ? 'required|exists:employees,id' : 'nullable',
            'movement_type' => 'required|in:official,personal',
            'from_datetime' => 'required|date',
            'to_datetime' => 'required|date|after:from_datetime',
            'purpose' => 'required|string|max:500',
            'destination' => 'required|string|max:255',
            'remarks' => 'nullable|string|max:1000',
            'start_meter_reading' => 'nullable|numeric|min:0',
            'start_place' => 'nullable|string|max:255',
        ]);

        // Movement start must be within the last 5 minutes or in the future (small clock / form delay tolerance)
        $from = $this->parseMovementDateTimeToApp($request->from_datetime);
        $to = $this->parseMovementDateTimeToApp($request->to_datetime);
        $now = Carbon::now(config('app.timezone'));

        // Same-day form delay: if the user picked "now" but submitted a few minutes later, snap start to current time.
        if ($from->lt($now) && $from->isSameDay($now)) {
            $from = $now->copy();
            if ($to->lte($from)) {
                $to = $from->copy()->addHours(8);
            }
        }

        if ($from->lt($now->copy()->subMinutes(5))) {
            return redirect()->back()
                ->withErrors(['from_datetime' => 'Movement start (from date & time) cannot be more than 5 minutes in the past.'])
                ->withInput();
        }

        // Determine which employee ID to use
        if ($canSelectEmployee) {
            $employeeId = (int) $request->employee_id;
        } else {
            if (! $employee) {
                return redirect()->route('movements.index')
                    ->with('error', 'You must be associated with an employee record to create a movement.');
            }

            if ($request->filled('employee_id') && (int) $request->employee_id !== (int) $employee->id) {
                return redirect()->back()
                    ->with('error', 'You can only create movements for yourself.')
                    ->withInput();
            }

            $employeeId = (int) $employee->id;
        }

        // Get the actual employee object (might be different from current user's employee)
        $targetEmployee = $employee && (int) $employeeId === (int) $employee->id
            ? $employee
            : Employee::findOrFail($employeeId);

        $activeMovement = $this->getActiveMovementForEmployee($employeeId);
        if ($activeMovement) {
            return $this->redirectForActiveMovement($activeMovement);
        }

        // Create movement
        $movement = Movement::create([
            'employee_id' => $employeeId,
            'movement_type' => $request->movement_type,
            'from_datetime' => $from->format('Y-m-d H:i:s'),
            'to_datetime' => $to->format('Y-m-d H:i:s'),
            'purpose' => $request->purpose,
            'destination' => $request->destination,
            'remarks' => $request->remarks,
            'start_meter_reading' => $request->filled('start_meter_reading') ? (float) $request->start_meter_reading : null,
            'start_place' => $request->filled('start_place') ? trim($request->start_place) : null,
            'status' => 'active', // Set as active instead of pending
        ]);

        // Send notifications to department heads and branch heads
        $this->sendNotificationsToManagers($movement, $targetEmployee);

        // For official movements, update attendance records (non-blocking — movement must still be created)
        if ($movement->movement_type === 'official') {
            try {
                $this->updateAttendanceForMovement($movement);
            } catch (\Throwable $e) {
                \Log::error('Movement attendance update failed after create', [
                    'movement_id' => $movement->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return redirect()->route('movements.index')
            ->with('success', 'Movement created successfully.');
    }

    /**
     * Update attendance records for a movement
     */
    /**
     * Update attendance records for a movement.
     *
     * Only touch the movement start day while active.
     * Planned to_datetime often spans past midnight (e.g. default +8h), and filling
     * those next days with branch work_start (09:00) was inventing false attendance.
     * Extra days are applied only when the movement is closed (actual return).
     */
    private function updateAttendanceForMovement(Movement $movement)
    {
        $movementStart = Carbon::parse($movement->from_datetime);
        $dateStr = $movementStart->format('Y-m-d');

        $attendance = Attendance::where('employee_id', $movement->employee_id)
            ->where('date', $dateStr)
            ->first();

        if (! $attendance) {
            $attendance = new Attendance;
            $attendance->employee_id = $movement->employee_id;
            $attendance->date = $dateStr;
            $attendance->status = 'on_duty';
        } elseif ($attendance->status == 'absent') {
            $attendance->status = 'on_duty';
        }

        $inCandidate = null;
        if (! $attendance->check_in) {
            $inCandidate = $movementStart->format('H:i:s');
        }

        $this->mergeAttendanceTimes($attendance, $inCandidate, null);

        $attendance->movement_id = $movement->id;

        $remarks = 'On official movement: '.$movement->purpose;
        if ($attendance->remarks) {
            if (strpos($attendance->remarks, $remarks) === false) {
                $attendance->remarks = $attendance->remarks.' | '.$remarks;
            }
        } else {
            $attendance->remarks = $remarks;
        }

        $attendance->save();
    }

    /**
     * Send notifications to managers about a new movement
     */
    private function sendNotificationsToManagers(Movement $movement, Employee $employee)
    {
        \Log::info('Starting sendNotificationsToManagers', [
            'movement_id' => $movement->id,
            'employee_id' => $employee->id,
            'employee_name' => $employee->name_en ?? $employee->full_name_en ?? '',
        ]);

        try {
            // Find department head
            $departmentHeads = collect([]);
            if ($employee->department_id) {
                $departmentHeads = $this->getDepartmentHeads($employee->department_id);
            }

            // Find branch head
            $branchHeads = collect([]);
            if ($employee->branch_id) {
                $branchHeads = $this->getBranchHeads($employee->branch_id);
            }

            // Find Super Admin users
            $superAdmins = \App\Models\User::whereHas('roles', function ($query) {
                $query->where('name', 'Super Admin');
            })->get();

            // Combine unique recipients
            $recipients = $departmentHeads->merge($branchHeads)->merge($superAdmins)->unique('id');

            if ($recipients->isEmpty()) {
                \Log::warning('No recipients found for movement notification');

                return;
            }

            // Format movement date/time for notification message
            $fromDate = Carbon::parse($movement->from_datetime)->format('M d, Y h:i A');
            $toDate = Carbon::parse($movement->to_datetime)->format('M d, Y h:i A');

            // Construct full employee name
            $employeeName = $employee->name_en ?? $employee->full_name_en ?? '';

            // Notification details
            $title = 'New Movement Created';
            $message = "{$employeeName} has created a {$movement->movement_type} movement from {$fromDate} to {$toDate} for {$movement->purpose}.";
            $link = route('movements.show', $movement->id);

            // Send emails and in-app notifications to all recipients
            foreach ($recipients as $recipient) {
                try {
                    // Find corresponding user for this recipient
                    $recipientUser = null;

                    // Check if this is directly a User object
                    if (isset($recipient->id) && $recipient instanceof \App\Models\User) {
                        $recipientUser = $recipient;
                    }
                    // Check if this is an Employee with a user relationship
                    elseif (isset($recipient->user_id)) {
                        $recipientUser = \App\Models\User::find($recipient->user_id);
                    }
                    // Try to find user by email
                    elseif (isset($recipient->email)) {
                        $recipientUser = \App\Models\User::where('email', $recipient->email)->first();
                    }

                    // Send in-app notification if we found a user
                    if ($recipientUser) {
                        $recipientUser->notify(new \App\Notifications\HrmNotification(
                            $title,
                            $message,
                            'info',
                            $link
                        ));
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to process recipient: '.$e->getMessage());

                    continue;
                }
            }
        } catch (\Exception $e) {
            \Log::error('Critical error in sendNotificationsToManagers: '.$e->getMessage());
        }
    }

    /**
     * Get users who are department heads for the given department
     */
    private function getDepartmentHeads($departmentId)
    {
        if (! $departmentId) {
            \Log::info('No department ID provided');

            return collect([]);
        }

        $heads = User::whereHas('roles', function ($query) {
            // For JSON stored as string
            $query->where(function ($q) {
                $q->whereRaw("JSON_CONTAINS(permissions, '\"department_head\"')")
                    ->orWhereRaw("permissions LIKE '%department_head%'");
            });
        })
            ->whereHas('employee', function ($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->get(['id', 'name', 'email']);

        \Log::info('Department heads found: '.$heads->count(), [
            'department_id' => $departmentId,
            'heads' => $heads->pluck('email')->toArray(),
        ]);

        return $heads;
    }

    private function getBranchHeads($branchId)
    {
        if (! $branchId) {
            \Log::info('No branch ID provided');

            return collect([]);
        }

        $heads = User::whereHas('roles', function ($query) {
            // For JSON stored as string
            $query->where(function ($q) {
                $q->whereRaw("JSON_CONTAINS(permissions, '\"branch_manager\"')")
                    ->orWhereRaw("permissions LIKE '%branch_manager%'");
            });
        })
            ->whereHas('employee', function ($query) use ($branchId) {
                $query->where('branch_id', $branchId);
            })
            ->get(['id', 'name', 'email']);

        \Log::info('Branch heads found: '.$heads->count(), [
            'branch_id' => $branchId,
            'heads' => $heads->pluck('email')->toArray(),
        ]);

        return $heads;
    }

    /**
     * Display the specified movement.
     */
    public function show(Movement $movement)
    {
        // Eager load related models to avoid N+1 issues
        $movement->load(['employee.department', 'employee.designation', 'employee.branch']);

        // Get the currently authenticated user and their associated employee record
        $user = Auth::user();
        $userEmployee = $user->employee;

        // Determine if the user can close the movement
        $canClose = false;

        if (
            $user->hasPermission('movements.complete')
            && $userEmployee
            && (int) $userEmployee->id === (int) $movement->employee_id
            && $movement->status === 'active'
        ) {
            $canClose = true;
        }

        // Render the inertia view with the movement details and permission flag
        return Inertia::render('movement/show', [
            'movement' => $movement,
            'canClose' => $canClose,
            'canEdit' => $user->hasPermission('movements.edit'),
            'canDelete' => $user->hasPermission('movements.delete'),
        ]);
    }

    /**
     * Get lightweight JSON details of a movement for modals.
     */
    public function details(Movement $movement)
    {
        $movement->loadMissing('employee.branch');

        return response()->json([
            'id' => $movement->id,
            'employee_id' => $movement->employee_id,
            'start_meter_reading' => $movement->start_meter_reading !== null ? (float) $movement->start_meter_reading : null,
            'start_place' => $movement->start_place,
            'movement_type' => $movement->movement_type,
            'from_datetime' => $movement->from_datetime?->toIso8601String(),
            'to_datetime' => $movement->to_datetime?->toIso8601String(),
            'purpose' => $movement->purpose,
            'destination' => $movement->destination,
            'branch_name' => $movement->employee?->branch?->name ?: '',
        ]);
    }

    /**
     * Mark the movement as completed.
     */
    public function complete(Request $request, Movement $movement)
    {

        $user = Auth::user();
        $userEmployee = $user->employee;

        if (! $user->hasPermission('movements.complete')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to complete movements.');
        }

        // Check if user can close this movement - with proper type casting
        if (! $userEmployee || (int) $userEmployee->id !== (int) $movement->employee_id) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to close this movement.');
        }

        if ($movement->status !== 'active') {
            return redirect()->route('movements.index')
                ->with('error', 'This movement has already been closed.');
        }

        $forgotReturn = $request->boolean('forgot_return_time');

        $createLogBook = $request->boolean('create_log_book', true);

        // Determine start reading: prefer movement's stored start_meter_reading, fallback to request for legacy records
        $startReading = $movement->start_meter_reading !== null
            ? (float) $movement->start_meter_reading
            : ($request->filled('start_meter_reading') ? (float) $request->start_meter_reading : null);

        $rules = [
            'forgot_return_time' => 'sometimes|boolean',
            'create_log_book' => 'sometimes|boolean',
            'actual_return_datetime' => $forgotReturn ? 'required|date' : 'nullable|date',
            'work_result' => 'required|string|min:5|max:2000',
            'start_place' => 'nullable|string|max:255',
            'personal_km' => $createLogBook ? 'nullable|numeric|min:0' : 'nullable',
        ];

        if ($createLogBook) {
            if ($startReading !== null) {
                $rules['end_meter_reading'] = "required|numeric|gte:{$startReading}";
            } else {
                $rules['start_meter_reading'] = 'required|numeric|min:0';
                $rules['end_meter_reading'] = 'required|numeric|gte:start_meter_reading';
            }
        } else {
            $rules['end_meter_reading'] = 'nullable';
        }

        $request->validate($rules);

        if ($createLogBook) {
            $effectiveStart = $startReading ?? (float) $request->start_meter_reading;
            $totalKm = round((float) $request->end_meter_reading - $effectiveStart, 2);
            if ($request->filled('personal_km') && (float) $request->personal_km > $totalKm) {
                throw ValidationException::withMessages([
                    'personal_km' => 'Personal distance cannot exceed total distance.',
                ]);
            }
        }

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update movement status
            $movement->status = 'completed';
            $movement->is_returned = true;
            $movement->work_result = trim($request->work_result);

            // Default: close at current time. If user forgot to close, they check the box and set actual return time.
            $returnDateTime = $forgotReturn
                ? Carbon::parse($request->actual_return_datetime)
                : now();

            $from = Carbon::parse($movement->from_datetime);
            if ($returnDateTime->lt($from)) {
                DB::rollBack();

                return redirect()->route('movements.index')
                    ->with('error', 'Return time cannot be before the movement start time.');
            }

            if ($returnDateTime->gt(Carbon::now()->addMinutes(2))) {
                DB::rollBack();

                return redirect()->route('movements.index')
                    ->with('error', 'Return time cannot be in the future.');
            }

            $movement->actual_return_datetime = $returnDateTime;
            $movement->save();

            if ($createLogBook) {
                $this->createLogBookFromMovement($movement, $request, $returnDateTime);
            }

            // Update attendance records for official movements
            if ($movement->movement_type === 'official') {
                $this->updateAttendanceForCompletion($movement, $returnDateTime);
            }

            // Send notifications about movement completion
            $this->sendCompletionNotifications($movement, $returnDateTime);

            DB::commit();

            return redirect()->route('movements.index')
                ->with('success', $createLogBook
                    ? 'Movement closed successfully. Log book entry created and pending approval.'
                    : 'Movement closed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error closing movement: '.$e->getMessage(), [
                'movement_id' => $movement->id,
                'user_id' => $user->id,
                'employee_id' => $userEmployee ? $userEmployee->id : null,
                'movement_employee_id' => $movement->employee_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while closing the movement. Please try again.');
        }
    }

    /**
     * Show form to edit a movement.
     */
    public function edit(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        $isAdminEditor = $user->hasPermission('movements.edit');

        // Admin/HR with movements.edit: can edit active or completed records
        // Employee: only own pending requests (legacy flow)
        if (
            ! $isAdminEditor &&
            (! $employee || (int) $employee->id !== (int) $movement->employee_id || $movement->status !== 'pending')
        ) {
            return $this->redirectToMovementIndex($request, 'error', 'You do not have permission to edit this movement request.');
        }

        if ($isAdminEditor && ! in_array($movement->status, ['active', 'completed', 'pending', 'approved'], true)) {
            return $this->redirectToMovementIndex($request, 'error', 'This movement cannot be edited.');
        }

        $employees = $user->hasPermission('movements.edit') ?
            Employee::where('status', 'active')->get() :
            collect([$employee]);

        return Inertia::render('movement/edit', [
            'movement' => $movement,
            'employees' => $employees,
            'isAdmin' => $user->hasPermission('movements.edit'),
            'movementTypes' => ['official', 'personal'],
            'returnFilters' => $this->movementIndexFiltersFromRequest($request),
        ]);
    }

    /**
     * Update the specified movement.
     */
    public function update(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        $isAdminEditor = $user->hasPermission('movements.edit');

        if (
            ! $isAdminEditor &&
            (! $employee || (int) $employee->id !== (int) $movement->employee_id || $movement->status !== 'pending')
        ) {
            return $this->redirectToMovementIndex($request, 'error', 'You do not have permission to update this movement request.');
        }

        if ($isAdminEditor && ! in_array($movement->status, ['active', 'completed', 'pending', 'approved'], true)) {
            return $this->redirectToMovementIndex($request, 'error', 'This movement cannot be updated.');
        }

        $isCompleted = $movement->status === 'completed';

        $validationRules = [
            'employee_id' => $user->hasPermission('movements.edit') ? 'required|exists:employees,id' : 'nullable',
            'movement_type' => 'required|in:official,personal',
            'from_datetime' => 'required|date',
            'to_datetime' => 'required|date|after:from_datetime',
            'purpose' => 'required|string',
            'destination' => 'required|string',
            'remarks' => 'nullable|string',
            'start_meter_reading' => 'nullable|numeric|min:0',
            'start_place' => 'nullable|string|max:255',
        ];

        if ($isCompleted && $isAdminEditor) {
            $validationRules['actual_return_datetime'] = 'required|date';
        }

        $request->validate($validationRules);

        $previousReturn = $movement->actual_return_datetime
            ? Carbon::parse($movement->actual_return_datetime)
            : null;

        $fromParsed = $this->parseMovementDateTimeToApp($request->from_datetime);
        $toParsed = $this->parseMovementDateTimeToApp($request->to_datetime);

        // Update fields except for employee_id if not admin
        $movement->movement_type = $request->movement_type;
        $movement->from_datetime = $fromParsed->format('Y-m-d H:i:s');
        $movement->to_datetime = $toParsed->format('Y-m-d H:i:s');
        $movement->purpose = $request->purpose;
        $movement->destination = $request->destination;
        $movement->remarks = $request->remarks;
        $movement->start_meter_reading = $request->filled('start_meter_reading') ? (float) $request->start_meter_reading : null;
        $movement->start_place = $request->filled('start_place') ? trim($request->start_place) : null;

        // Update employee_id if admin
        if ($user->hasPermission('movements.edit')) {
            $movement->employee_id = $request->employee_id;
        }

        if ($isCompleted && $isAdminEditor) {
            $newReturn = $this->parseMovementDateTimeToApp($request->actual_return_datetime);

            if ($newReturn->lt($fromParsed)) {
                return redirect()->back()
                    ->withInput()
                    ->withErrors(['actual_return_datetime' => 'Return time cannot be before the movement start time.']);
            }

            $nowApp = Carbon::now(config('app.timezone'));
            if ($newReturn->gt($nowApp->copy()->addMinutes(2))) {
                return redirect()->back()
                    ->withInput()
                    ->withErrors(['actual_return_datetime' => 'Return time cannot be more than a few minutes in the future.']);
            }

            $movement->actual_return_datetime = $newReturn->format('Y-m-d H:i:s');
        }

        $movement->save();

        $newReturnFinal = $movement->actual_return_datetime
            ? Carbon::parse($movement->actual_return_datetime)
            : null;

        if (
            $isCompleted
            && $isAdminEditor
            && $movement->movement_type === 'official'
            && $newReturnFinal
            && (! $previousReturn || ! $previousReturn->equalTo($newReturnFinal))
        ) {
            $this->updateAttendanceForCompletion($movement->fresh(), $newReturnFinal);
        }

        return $this->redirectToMovementIndex($request, 'success', 'Movement request updated successfully.');
    }

    /**
     * Remove the specified movement (admin only).
     */
    public function destroy(Request $request, Movement $movement)
    {
        $user = Auth::user();

        if (! $user->hasPermission('movements.delete')) {
            return $this->redirectToMovementIndex($request, 'error', 'You do not have permission to delete movements.');
        }

        DB::beginTransaction();

        try {
            Attendance::where('movement_id', $movement->id)->update(['movement_id' => null]);
            $movement->delete();
            DB::commit();

            return $this->redirectToMovementIndex($request, 'success', 'Movement deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error deleting movement: '.$e->getMessage(), [
                'movement_id' => $movement->id,
            ]);

            return $this->redirectToMovementIndex($request, 'error', 'Could not delete this movement.');
        }
    }

    /**
     * Remove multiple movements (admin only).
     */
    public function bulkDestroy(Request $request)
    {
        $user = Auth::user();

        if (! $user->hasPermission('movements.delete')) {
            return $this->redirectToMovementIndex($request, 'error', 'You do not have permission to delete movements.');
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:movements,id',
        ]);

        $ids = $validated['ids'];

        DB::beginTransaction();

        try {
            Attendance::whereIn('movement_id', $ids)->update(['movement_id' => null]);
            Movement::whereIn('id', $ids)->delete();
            DB::commit();

            $count = count($ids);
            $message = $count === 1
                ? 'Movement deleted successfully.'
                : "{$count} movements deleted successfully.";

            return $this->redirectToMovementIndex($request, 'success', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error bulk deleting movements: '.$e->getMessage(), [
                'ids' => $ids,
            ]);

            return $this->redirectToMovementIndex($request, 'error', 'Could not delete the selected movements.');
        }
    }

    /**
     * Approve the specified movement and update attendance records.
     */
    public function approve(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can approve this movement based on various conditions
        $canApprove = false;

        // Condition 1: User has explicit movement.approve permission
        if ($user->hasPermission('movements.approve')) {
            $canApprove = true;
        }

        // Condition 2: User is a branch manager for the employee's branch
        elseif (
            $employee &&
            $movement->employee->branch_id &&
            $employee->branch_id === $movement->employee->branch_id &&
            $user->hasPermission('branch_manager')
        ) {
            $canApprove = true;
        }

        // Condition 3: User is a department head for the employee's department
        elseif (
            $employee &&
            $movement->employee->department_id &&
            $employee->department_id === $movement->employee->department_id &&
            $user->hasPermission('department_head')
        ) {
            $canApprove = true;
        }

        if (! $canApprove) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to approve movement requests.');
        }

        if ($movement->status !== 'pending') {
            return redirect()->route('movements.index')
                ->with('error', 'This movement request is not pending approval.');
        }

        $request->validate([
            'remarks' => 'nullable|string',
        ]);

        // Debug information before processing
        \Log::info('Movement data before approval:', [
            'movement_id' => $movement->id,
            'employee_id' => $movement->employee_id,
            'purpose' => $movement->purpose,
            'destination' => $movement->destination,
            'remarks' => $movement->remarks,
        ]);

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update movement
            $movement->status = 'approved';
            $movement->approved_by = $user->id;

            // Handle remarks in a safe way
            if ($request->filled('remarks')) {
                // Store the remarks directly without encoding manipulation
                $movement->remarks = $request->remarks;
            }

            // Save the movement with simple updates first
            $saveResult = $movement->save();

            // Log the save result
            \Log::info('Movement status update result:', [
                'movement_id' => $movement->id,
                'save_result' => $saveResult,
                'new_status' => $movement->status,
                'approved_by' => $movement->approved_by,
            ]);

            // For official movements, create/update attendance for the start day only.
            // Multi-day / return-day attendance is applied when the movement is closed.
            if ($movement->movement_type === 'official') {
                $this->updateAttendanceForMovement($movement);
            }

            DB::commit();

            // Log success after transaction
            \Log::info('Movement approval transaction completed successfully', [
                'movement_id' => $movement->id,
                'employee_id' => $movement->employee_id,
            ]);

            // Handle notifications in a separate try-catch to avoid affecting the main process
            try {
                // Only load employee if not already loaded
                if (! $movement->relationLoaded('employee')) {
                    $movement->load('employee');
                }

                // Check if the employee exists and has a user account
                if ($movement->employee) {
                    // Use relationship or direct lookup by user_id
                    $employeeUser = null;
                    if (isset($movement->employee->user_id)) {
                        $employeeUser = \App\Models\User::find($movement->employee->user_id);
                    } else {
                        // Fallback to looking up by employee_id
                        $employeeUser = \App\Models\User::where('employee_id', $movement->employee_id)->first();
                    }

                    if ($employeeUser) {
                        // Format movement date/time for notification message
                        $fromDate = Carbon::parse($movement->from_datetime)->format('M d, Y h:i A');
                        $toDate = Carbon::parse($movement->to_datetime)->format('M d, Y h:i A');

                        // Keep notification simple to avoid encoding issues
                        $title = 'Movement Request Approved';
                        $message = "Your movement request from {$fromDate} to {$toDate} has been approved.";
                        $link = route('movements.show', $movement->id);

                        // Send in-app notification
                        try {
                            $employeeUser->notify(new \App\Notifications\HrmNotification(
                                $title,
                                $message,
                                'success',
                                $link
                            ));

                            \Log::info('In-app notification sent successfully', [
                                'movement_id' => $movement->id,
                                'user_id' => $employeeUser->id,
                            ]);
                        } catch (\Exception $notificationError) {
                            \Log::error('Error sending in-app notification: '.$notificationError->getMessage(), [
                                'movement_id' => $movement->id,
                            ]);
                            // Continue with the process even if notification fails
                        }

                        // Email notification disabled for movements
                    }
                }
            } catch (\Exception $notificationException) {
                // Log notification errors but don't fail the approval process
                \Log::error('Error in notification process: '.$notificationException->getMessage(), [
                    'movement_id' => $movement->id,
                    'error' => $notificationException->getMessage(),
                ]);
                // Do not throw - approval should succeed even if notifications fail
            }

            return redirect()->route('movements.index')
                ->with('success', 'Movement request approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            // Detailed error logging
            \Log::error('Error approving movement: '.$e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while approving the movement: '.$e->getMessage());
        }
    }

    /**
     * Reject the specified movement and clean up any attendance records.
     */
    public function reject(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can reject this movement based on various conditions
        $canReject = false;

        // Condition 1: User has explicit movement.approve permission
        if ($user->hasPermission('movements.approve')) {
            $canReject = true;
        }

        // Condition 2: User is a branch manager for the employee's branch
        elseif (
            $employee &&
            $movement->employee->branch_id &&
            $employee->branch_id === $movement->employee->branch_id &&
            $user->hasPermission('branch_manager')
        ) {
            $canReject = true;
        }

        // Condition 3: User is a department head for the employee's department
        elseif (
            $employee &&
            $movement->employee->department_id &&
            $employee->department_id === $movement->employee->department_id &&
            $user->hasPermission('department_head')
        ) {
            $canReject = true;
        }

        if (! $canReject) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to reject movement requests.');
        }

        if ($movement->status !== 'pending') {
            return redirect()->route('movements.index')
                ->with('error', 'This movement request is not pending approval.');
        }

        $request->validate([
            'remarks' => 'required|string',
        ]);

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update movement
            $movement->status = 'rejected';
            $movement->approved_by = $user->id;
            $movement->remarks = $request->remarks;
            $movement->save();

            // Remove any associated attendance records that have this movement_id
            // This is to clean up if this movement was pre-approved and then rejected
            Attendance::where('movement_id', $movement->id)->update([
                'movement_id' => null,
                'remarks' => DB::raw("CONCAT(IFNULL(remarks, ''), ' | Movement rejected: ".addslashes($request->remarks)."')"),
                // Do not automatically change status, let the attendance system handle it based on check-in/out
            ]);

            DB::commit();

            return redirect()->route('movements.index')
                ->with('success', 'Movement request rejected successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error rejecting movement: '.$e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while rejecting the movement.');
        }
    }

    /**
     * Cancel the specified movement and clean up any attendance records.
     */
    public function cancel(Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can cancel this movement
        if (
            ! $user->hasPermission('movements.edit') &&
            (! $employee || $employee->id !== $movement->employee_id || $movement->status !== 'pending')
        ) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to cancel this movement request.');
        }

        // Start a database transaction
        DB::beginTransaction();

        try {
            $movement->status = 'cancelled';
            $movement->save();

            // Clean up any attendance records that might have been created for this movement
            // This is to clean up if this movement was pre-approved and then cancelled
            Attendance::where('movement_id', $movement->id)->update([
                'movement_id' => null,
                'remarks' => DB::raw("CONCAT(IFNULL(remarks, ''), ' | Movement cancelled by user')"),
                // Do not automatically change status, let the attendance system handle it based on check-in/out
            ]);

            DB::commit();

            return redirect()->route('movements.index')
                ->with('success', 'Movement request cancelled successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error cancelling movement: '.$e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while cancelling the movement.');
        }
    }

    /**
     * Update attendance records when a movement is completed
     */
    private function updateAttendanceForCompletion(Movement $movement, $returnDateTime)
    {
        // Dates from start through actual return only (not planned to_datetime spillover)
        $movementDates = $movement->getDatesAttribute();
        $workTimes = $this->getBranchWorkTimesForEmployee((int) $movement->employee_id);
        $movementStart = Carbon::parse($movement->from_datetime);
        $return = $returnDateTime instanceof Carbon ? $returnDateTime : Carbon::parse($returnDateTime);
        $workStartNormalized = Carbon::parse($workTimes['work_start_time'])->format('H:i:s');

        foreach ($movementDates as $date) {
            // Find attendance record for this date
            $attendance = Attendance::where('employee_id', $movement->employee_id)
                ->where('date', $date)
                ->first();

            if (! $attendance) {
                // Create new attendance record if none exists
                $attendance = new Attendance;
                $attendance->employee_id = $movement->employee_id;
                $attendance->date = $date;
                $attendance->status = 'on_duty';
            } else {
                // Only bump absent -> on_duty
                if ($attendance->status == 'absent') {
                    $attendance->status = 'on_duty';
                }
            }

            $isStartDay = $movementStart->format('Y-m-d') === $date;
            $isReturnDay = $return->format('Y-m-d') === $date;

            // Only set check-in if there is no existing check-in
            $inCandidate = null;
            if (! $attendance->check_in) {
                $inCandidate = $isStartDay ? $movementStart->format('H:i:s') : $workTimes['work_start_time'];
            }

            // Set check-out to the return time on the return day
            $outCandidate = $isReturnDay ? $return->format('H:i:s') : null;

            $this->mergeAttendanceTimes($attendance, $inCandidate, $outCandidate);

            // Link attendance to movement (this is the key part)
            $attendance->movement_id = $movement->id;

            // Add remarks about movement completion
            $returnInfo = 'Movement completed: '.$returnDateTime->format('Y-m-d H:i:s');
            if ($attendance->remarks) {
                if (strpos($attendance->remarks, 'Movement completed:') === false) {
                    $attendance->remarks .= ' | '.$returnInfo;
                }
            } else {
                $attendance->remarks = 'On official movement: '.$movement->purpose.' | '.$returnInfo;
            }

            $attendance->save();
        }

        // Clear invented next-day rows created earlier from planned to_datetime (e.g. 09:00 auto check-in)
        $this->clearMovementAttendanceSpillover($movement, $return, $workStartNormalized);
    }

    /**
     * Remove false attendance days created when planned to_datetime crossed midnight
     * but the employee actually returned earlier (same calendar day as start, or earlier than planned end).
     */
    private function clearMovementAttendanceSpillover(Movement $movement, Carbon $return, string $workStartNormalized): void
    {
        $spillover = Attendance::where('employee_id', $movement->employee_id)
            ->where('movement_id', $movement->id)
            ->whereDate('date', '>', $return->toDateString())
            ->get();

        foreach ($spillover as $attendance) {
            $checkIn = $attendance->check_in
                ? Carbon::parse($attendance->check_in)->format('H:i:s')
                : null;

            // Invented from movement create: office start with no checkout
            if ($checkIn === $workStartNormalized && ! $attendance->check_out) {
                $attendance->check_in = null;
            }

            $attendance->movement_id = null;

            if ($attendance->remarks) {
                $attendance->remarks = trim(preg_replace(
                    '/\s*\|\s*/',
                    ' | ',
                    preg_replace(
                        '/(?:^|\s*\|\s*)On official movement:[^|]*/i',
                        '',
                        preg_replace('/(?:^|\s*\|\s*)Movement completed:[^|]*/i', '', $attendance->remarks)
                    )
                ), " |\t\n\r\0\x0B");
                if ($attendance->remarks === '') {
                    $attendance->remarks = null;
                }
            }

            if (! $attendance->check_in && ! $attendance->check_out && $attendance->status === 'on_duty') {
                $attendance->status = 'absent';
            }

            $attendance->save();
        }
    }

    /**
     * Create a pending log-book register entry when a movement is closed.
     */
    private function createLogBookFromMovement(Movement $movement, Request $request, Carbon $returnDateTime): void
    {
        if (MovementLogBook::where('movement_id', $movement->id)->exists()) {
            return;
        }

        $movement->loadMissing('employee.branch');
        $branch = $movement->employee?->branch;
        $isHeadOffice = (bool) ($branch?->is_head_office);

        $startReading = $movement->start_meter_reading !== null
            ? (float) $movement->start_meter_reading
            : (float) $request->start_meter_reading;
        $endReading = (float) $request->end_meter_reading;
        $totalKm = round($endReading - $startReading, 2);
        $personalKm = $request->filled('personal_km') ? round((float) $request->personal_km, 2) : null;
        $officialKm = round($totalKm - ($personalKm ?? 0), 2);
        $startPlace = $movement->start_place
            ? trim($movement->start_place)
            : trim((string) $request->start_place);
        if ($startPlace === '') {
            $startPlace = $branch?->name ?: 'Unknown';
        }

        MovementLogBook::create([
            'movement_id' => $movement->id,
            'employee_id' => $movement->employee_id,
            'date' => Carbon::parse($movement->from_datetime)->toDateString(),
            'start_time' => $movement->from_datetime,
            'start_place' => $startPlace,
            'start_meter_reading' => $startReading,
            'destination' => $movement->destination,
            'purpose' => $movement->purpose,
            'work_result' => $movement->work_result,
            'return_time' => $returnDateTime,
            'end_meter_reading' => $endReading,
            'distance_km' => $totalKm,
            'personal_km' => $personalKm,
            'official_km' => $officialKm,
            'approval_scope' => $isHeadOffice ? 'head_office' : 'branch',
            'payment_status' => 'unpaid',
        ]);
    }

    /**
     * Send notifications about movement completion
     */
    private function sendCompletionNotifications(Movement $movement, $returnDateTime)
    {
        try {
            // Load employee if not already loaded
            if (! $movement->relationLoaded('employee')) {
                $movement->load('employee');
            }

            // Find appropriate managers to notify
            $recipients = collect();

            // Add department heads
            if ($movement->employee->department_id) {
                $departmentHeads = $this->getDepartmentHeads($movement->employee->department_id);
                $recipients = $recipients->merge($departmentHeads);
            }

            // Add branch heads
            if ($movement->employee->branch_id) {
                $branchHeads = $this->getBranchHeads($movement->employee->branch_id);
                $recipients = $recipients->merge($branchHeads);
            }

            // Add any super admins
            $superAdmins = \App\Models\User::whereHas('roles', function ($query) {
                $query->where('name', 'Super Admin');
            })->get();
            $recipients = $recipients->merge($superAdmins);

            // Format times for message
            $fromDate = Carbon::parse($movement->from_datetime)->format('M d, Y h:i A');
            $toDate = Carbon::parse($movement->to_datetime)->format('M d, Y h:i A');
            $returnDate = $returnDateTime->format('M d, Y h:i A');

            // Prepare employee name
            $employeeName = $movement->employee->name_en ?? $movement->employee->full_name_en ?? '';

            // Create notification content
            $title = 'Movement Completed';
            $message = "{$employeeName} has returned from their {$movement->movement_type} movement ({$fromDate} to {$toDate}). Actual return time: {$returnDate}";
            $link = route('movements.show', $movement->id);

            // Send notifications to each recipient
            foreach ($recipients as $recipient) {
                // Send in-app notification
                if (isset($recipient->id)) {
                    $recipient->notify(new HrmNotification(
                        $title,
                        $message,
                        'info',
                        $link
                    ));
                }
            }
        } catch (\Exception $e) {
            // Log error but don't stop the process
            \Log::error('Error sending completion notifications: '.$e->getMessage());
        }
    }

    /**
     * Display movement report.
     */
    public function report(Request $request)
    {
        $timezone = config('app.timezone', 'Asia/Dhaka');

        // Parse dates with specified timezone
        $startDate = $request->start_date
            ? Carbon::parse($request->start_date)->setTimezone($timezone)->startOfDay()
            : Carbon::today($timezone)->subDays(30)->startOfDay();

        $endDate = $request->end_date
            ? Carbon::parse($request->end_date)->setTimezone($timezone)->endOfDay()
            : Carbon::today($timezone)->endOfDay();

        $query = Movement::with(['employee.department', 'employee.designation'])
            ->whereBetween('from_datetime', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->movement_type, function ($query, $movementType) {
                $query->where('movement_type', $movementType);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $movements = $query->orderBy('from_datetime', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics
        $summary = [
            'total' => $query->count(),
            'official' => $query->where('movement_type', 'official')->count(),
            'personal' => $query->where('movement_type', 'personal')->count(),
            'active' => $query->where('status', 'active')->count(),
            'completed' => $query->where('status', 'completed')->count(),
            // Keep old summary keys for backward compatibility with frontend
            'approved' => 0,
            'rejected' => 0,
            'pending' => $query->where('status', 'active')->count(), // Map 'active' to 'pending' for compatibility
        ];

        $departments = Department::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('movement/report', [
            'movements' => $movements,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'status', 'department_id', 'movement_type', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
            'movementTypes' => ['official', 'personal'],
        ]);
    }

    /**
     * Download movement report as PDF.
     */
    public function downloadReport(Request $request)
    {
        $timezone = config('app.timezone', 'Asia/Dhaka');

        // Parse dates with specified timezone
        $startDate = $request->start_date
            ? Carbon::parse($request->start_date)->setTimezone($timezone)->startOfDay()
            : Carbon::today($timezone)->subDays(30)->startOfDay();

        $endDate = $request->end_date
            ? Carbon::parse($request->end_date)->setTimezone($timezone)->endOfDay()
            : Carbon::today($timezone)->endOfDay();

        $query = Movement::with(['employee.department', 'employee.designation'])
            ->whereBetween('from_datetime', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->movement_type, function ($query, $movementType) {
                $query->where('movement_type', $movementType);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $movements = $query->orderBy('from_datetime', 'desc')->get();

        // Summary statistics
        $summary = [
            'total' => $movements->count(),
            'official' => $movements->where('movement_type', 'official')->count(),
            'personal' => $movements->where('movement_type', 'personal')->count(),
            'active' => $movements->where('status', 'active')->count(),
            'completed' => $movements->where('status', 'completed')->count(),
        ];

        // Generate PDF
        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.movement-report', [
            'movements' => $movements,
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
            'filters' => [
                'status' => $request->status,
                'department_id' => $request->department_id,
                'movement_type' => $request->movement_type,
                'employee_id' => $request->employee_id,
            ],
        ]);

        return $pdf->download('movement-report-'.now()->format('Y-m-d').'.pdf');
    }

    /**
     * @return list<string>
     */
    private function movementIndexFilterKeys(): array
    {
        return [
            'status',
            'department_id',
            'employee_id',
            'movement_type',
            'zone_id',
            'regional_office_id',
            'branch_id',
            'from_date',
            'to_date',
            'cross_day_only',
            'search',
            'per_page',
            'page',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function movementIndexFiltersFromRequest(Request $request): array
    {
        return array_filter(
            $request->only($this->movementIndexFilterKeys()),
            static fn ($value) => $value !== null && $value !== '',
        );
    }

    /**
     * @return \Illuminate\Http\RedirectResponse
     */
    private function redirectToMovementIndex(Request $request, ?string $flashKey = null, ?string $flashMessage = null)
    {
        $redirect = redirect()->route('movements.index', $this->movementIndexFiltersFromRequest($request));

        if ($flashKey && $flashMessage) {
            $redirect->with($flashKey, $flashMessage);
        }

        return $redirect;
    }
}
