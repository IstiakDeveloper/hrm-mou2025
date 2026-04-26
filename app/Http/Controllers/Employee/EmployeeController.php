<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use App\Models\RegionalOffice;
use App\Models\Zone;
use App\Services\OrganogramAccessService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    private const EMPLOYEE_IMPORT_MAX_ROWS = 5000;
    private const EMPLOYEE_IMPORT_CACHE_TTL_SECONDS = 3600;

    /** Default password for auto-created login accounts (change after first login in production). */
    private const AUTO_USER_DEFAULT_PASSWORD = '12345678';

    private const AUTO_USER_EMPLOYEE_ROLE_NAME = 'Employee';

    /**
     * Normalize empty strings to null so nullable unique columns (e.g. nid) and FKs do not break inserts.
     */
    private function normalizeEmployeeRequestPayload(Request $request): void
    {
        $nullableEmptiesToNull = [
            'nid', 'nid_number', 'smart_card_number', 'birth_registration_number',
            'email_id', 'phone', 'name_bn', 'gender', 'blood_group', 'date_of_birth',
            'confirmation_date', 'address', 'village', 'post_office', 'union_pouroshova',
            'ward_no', 'upazila', 'district', 'educational_qualification', 'emergency_contact',
            'fathers_name', 'fathers_mobile', 'mothers_name', 'mothers_mobile',
            'marital_status', 'spouse_name', 'spouse_mobile',
            'dropout_date', 'dropout_reason', 'final_payment_date', 'last_promotion_date',
            'reporting_to', 'last_branch_id',
        ];

        foreach ($nullableEmptiesToNull as $field) {
            if (! $request->has($field)) {
                continue;
            }
            $v = $request->input($field);
            if ($v === '' || $v === 'null') {
                $request->merge([$field => null]);
            }
        }
    }

    /**
     * Rich server-side logging when employee create/update fails outside validation.
     */
    private function logEmployeeSaveFailure(string $action, Request $request, ?Employee $employee, \Throwable $e): void
    {
        $context = [
            'action' => $action,
            'employee_id' => $employee?->id,
            'exception_class' => $e::class,
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ];

        if ($e instanceof QueryException) {
            $context['sql_state'] = $e->errorInfo[0] ?? null;
            $context['driver_code'] = $e->errorInfo[1] ?? null;
            $context['driver_message'] = $e->errorInfo[2] ?? null;
            $context['sql'] = Str::limit((string) $e->getSql(), 2000);
            $context['bindings'] = $this->sanitizeBindingsForLog($e->getBindings());
        }

        $context['request_keys'] = array_keys($request->except(['photo', 'password', 'password_confirmation']));
        $context['payload_preview'] = Arr::only(
            $request->except(['photo', 'password', 'password_confirmation']),
            [
                'pin', 'name_en', 'email', 'department_id', 'joining_designation_id',
                'last_designation_id', 'current_branch_id', 'last_branch_id', 'reporting_to', 'status',
                'is_dropout', 'joining_date', 'confirmation_date',
            ]
        );

        if (config('app.debug')) {
            $context['trace'] = Str::limit($e->getTraceAsString(), 12000);
        }

        Log::error('Employee save failed', $context);

        $prev = $e->getPrevious();
        if ($prev instanceof \Throwable) {
            Log::error('Employee save failed (previous exception)', [
                'action' => $action,
                'previous_class' => $prev::class,
                'previous_message' => $prev->getMessage(),
            ]);
        }

        report($e);
    }

    /**
     * @param  array<int, mixed>  $bindings
     * @return array<int, mixed>
     */
    private function sanitizeBindingsForLog(array $bindings): array
    {
        return array_map(function ($b) {
            if (is_resource($b)) {
                return '[resource]';
            }
            if (is_string($b) && strlen($b) > 200) {
                return substr($b, 0, 200).'…';
            }

            return $b;
        }, $bindings);
    }

    private function buildEmployeeSaveErrorMessage(\Throwable $e): string
    {
        if ($e instanceof \RuntimeException && str_contains($e->getMessage(), 'user account')) {
            return $e->getMessage();
        }

        $msg = $e->getMessage();
        if (str_contains($msg, 'Duplicate entry') || str_contains($msg, 'UNIQUE constraint')) {
            return 'Duplicate value: PIN, employee ID, email, or NID may already exist. Please change them and try again.';
        }

        if ($e instanceof QueryException) {
            $driverMsg = (string) ($e->errorInfo[2] ?? '');
            if ($driverMsg !== '' && (str_contains($driverMsg, 'Duplicate') || str_contains($driverMsg, 'UNIQUE'))) {
                return 'Duplicate value: PIN, employee ID, email, or NID may already exist. Please change them and try again.';
            }
            $mysqlDriverCode = (int) ($e->errorInfo[1] ?? 0);
            if ($mysqlDriverCode === 3988 || str_contains($driverMsg, 'latin1_swedish_ci')) {
                return 'Database table encoding is outdated (latin1 vs utf8mb4). Bangla/Unicode text cannot be saved. Run: php artisan migrate — or ask DBA to run: ALTER TABLE employees CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;';
            }
            if ($driverMsg !== '' && str_contains(strtolower($driverMsg), 'foreign key constraint')) {
                return 'Linked data error (branch, department, designation, or manager). Please check selections and try again.';
            }
        }

        $base = 'Employee could not be saved. Please try again.';
        if (config('app.debug')) {
            $detail = $e instanceof QueryException && ! empty($e->errorInfo[2])
                ? (string) $e->errorInfo[2]
                : $msg;

            return $base.' [Debug] '.Str::limit($detail, 500);
        }

        return $base;
    }

    private function syncZoneRegionalManagerAssignment(Employee $employee): void
    {
        try {
            $designationName = trim((string) optional($employee->designation)->name);
            if ($designationName === '') {
                return;
            }

            // Keep it simple: our manager designations are English strings
            $designationNameLower = strtolower($designationName);
            $isZonalManager = $designationNameLower === 'zonal manager';
            $isRegionalManager = $designationNameLower === 'regional manager';

            if (! $isZonalManager && ! $isRegionalManager) {
                return;
            }

            $employee->loadMissing([
                'branch.regionalOffice.zone',
            ]);

            $branch = $employee->branch;
            $regionalOffice = $branch?->regionalOffice;
            $zone = $regionalOffice?->zone;

            if ($isZonalManager && $zone) {
                $zone->zone_manager_employee_id = $employee->id;
                $zone->save();
            }

            if ($isRegionalManager && $regionalOffice) {
                $regionalOffice->regional_manager_employee_id = $employee->id;
                $regionalOffice->save();
            }
        } catch (\Throwable $e) {
            Log::error('Manager auto-assignment failed', [
                'employee_id' => $employee->id ?? null,
                'current_branch_id' => $employee->current_branch_id ?? null,
                'designation_id' => $employee->designation_id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Map designation title (English, case-insensitive) to optional app role names (see DatabaseSeeder).
     *
     * @return list<string>
     */
    private function designationNameToAdditionalRoleNames(?string $designationName): array
    {
        if (! is_string($designationName) || trim($designationName) === '') {
            return [];
        }

        $n = mb_strtolower(trim($designationName));

        if (str_contains($n, 'executive') && str_contains($n, 'director')) {
            return ['Executive Director'];
        }
        if (str_contains($n, 'assistant') && str_contains($n, 'director')) {
            return ['Assistant Director (Microfinance)'];
        }
        if ((str_contains($n, 'microfinance') && str_contains($n, 'director')) || $n === 'director (microfinance)' || $n === 'director') {
            return ['Director (Microfinance)'];
        }
        if ($n === 'zonal manager') {
            return ['Zonal Manager'];
        }
        if ($n === 'regional manager') {
            return ['Regional Manager'];
        }
        if ($n === 'branch manager') {
            return ['Branch Manager'];
        }
        if ($n === 'department head') {
            return ['Department Head'];
        }

        return [];
    }

    private function buildUsernameBaseFromPin(string $pin): string
    {
        $local = strtolower($pin);
        $local = preg_replace('/[^a-z0-9_]/', '', $local) ?: 'user';

        return Str::limit($local, 180, '');
    }

    private function allocateUniqueUsername(string $base, ?int $exceptUserId = null): string
    {
        $username = $base;
        $n = 0;
        while (User::query()
            ->where('username', $username)
            ->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists()) {
            $n++;
            $suffix = (string) $n;
            $username = Str::limit($base, max(1, 191 - strlen($suffix)), '').$suffix;
        }

        return $username;
    }

    /**
     * Create or update a User for this employee: username from PIN, email from employee, password on first create only.
     * Pivot roles: always "Employee", plus organogram roles when designation matches.
     *
     * @throws \RuntimeException When email is taken by another user
     */
    private function syncUserAccountForEmployee(Employee $employee): void
    {
        $employee->loadMissing(['designation']);

        $employeeRole = Role::query()->where('name', self::AUTO_USER_EMPLOYEE_ROLE_NAME)->first();
        if (! $employeeRole) {
            Log::warning('Auto user skipped: Employee role missing', ['employee_id' => $employee->id]);

            return;
        }

        $extraNames = $this->designationNameToAdditionalRoleNames($employee->designation?->name);
        $roleIds = [$employeeRole->id];
        foreach ($extraNames as $roleName) {
            $r = Role::query()->where('name', $roleName)->first();
            if ($r) {
                $roleIds[] = $r->id;
            } else {
                Log::warning('Auto user: optional role not found', ['role_name' => $roleName, 'employee_id' => $employee->id]);
            }
        }
        $roleIds = array_values(array_unique($roleIds));

        $primaryRoleId = $employeeRole->id;
        foreach ($roleIds as $rid) {
            if ($rid !== $employeeRole->id) {
                $primaryRoleId = $rid;
                break;
            }
        }

        $email = trim((string) ($employee->email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Log::warning('Auto user skipped: invalid employee email', ['employee_id' => $employee->id]);

            return;
        }

        if (User::query()->where('email', $email)->where('employee_id', '!=', $employee->id)->exists()) {
            throw new \RuntimeException('This email is already used by another user account. Choose a different employee email.');
        }

        $pinRaw = (string) ($employee->getRawOriginal('pin') ?? $employee->getRawOriginal('employee_id') ?? '');
        $pin = trim($pinRaw);
        if ($pin === '') {
            Log::warning('Auto user skipped: empty PIN', ['employee_id' => $employee->id]);

            return;
        }

        $user = User::query()->where('employee_id', $employee->id)->first();
        $base = $this->buildUsernameBaseFromPin($pin);
        $username = $this->allocateUniqueUsername($base, $user?->id);

        $name = trim((string) ($employee->getRawOriginal('name_en') ?? ''));
        if ($name === '') {
            $name = trim((string) ($employee->getRawOriginal('first_name') ?? 'User'));
        }

        $payload = [
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'role_id' => $primaryRoleId,
            'employee_id' => $employee->id,
            'branch_id' => $employee->current_branch_id,
            'active_status' => $employee->status === 'active',
        ];

        if ($user) {
            $user->fill($payload);
            $user->save();
        } else {
            // User model uses 'password' => 'hashed' cast — assign plain string
            $payload['password'] = self::AUTO_USER_DEFAULT_PASSWORD;
            $user = User::create($payload);
        }

        $user->roles()->sync($roleIds);
    }

    /**
     * Display a listing of employees.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Employee::with(['department', 'designation', 'branch']);
        OrganogramAccessService::constrainVisibleEmployees($query, $user);

        $query
            ->when($request->search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('current_branch_id', $branchId);
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            });

        $employees = $query->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        $deptIds = OrganogramAccessService::accessibleDepartmentIdList($user);
        $departments = $deptIds === null
            ? Department::query()->orderBy('name')->get()
            : Department::query()->whereIn('id', $deptIds)->orderBy('name')->get();

        $branchIds = OrganogramAccessService::accessibleBranchIdList($user);
        $branches = $branchIds === null
            ? Branch::query()->orderBy('name')->get()
            : Branch::query()->whereIn('id', $branchIds)->orderBy('name')->get();

        return Inertia::render('employee/index', [
            'employees' => $employees,
            'departments' => $departments,
            'branches' => $branches,
            'filters' => $request->only(['search', 'department_id', 'branch_id', 'status']),
        ]);
    }

    /**
     * Show form to create a new employee.
     */
    public function create()
    {
        $departments = Department::all();
        $designations = Designation::all();
        $branches = Branch::query()
            ->with([
                'regionalOffice.zone.zoneManager:id,employee_id,first_name,last_name',
                'regionalOffice.regionalManager:id,employee_id,first_name,last_name',
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'regional_office_id']);
        $managers = Employee::where('status', 'active')->get();

        return Inertia::render('employee/create', [
            'oldInput' => old(),
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches->map(function (Branch $branch) {
                $regionalManager = $branch->regionalOffice?->regionalManager;
                $zoneManager = $branch->regionalOffice?->zone?->zoneManager;

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'regionalManager' => $regionalManager ? [
                        'id' => $regionalManager->id,
                        'employee_id' => $regionalManager->employee_id,
                        'first_name' => $regionalManager->first_name,
                        'last_name' => $regionalManager->last_name,
                    ] : null,
                    'zoneManager' => $zoneManager ? [
                        'id' => $zoneManager->id,
                        'employee_id' => $zoneManager->employee_id,
                        'first_name' => $zoneManager->first_name,
                        'last_name' => $zoneManager->last_name,
                    ] : null,
                ];
            }),
            'managers' => $managers,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
        ]);
    }

    /**
     * Store a newly created employee.
     */
    public function store(Request $request)
    {
        $createdEmployee = null;

        try {
            $this->normalizeEmployeeRequestPayload($request);

            $validated = $request->validate([
                'pin' => 'required|string|max:20|unique:employees,pin',
                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',
                'email' => 'required|email|unique:employees,email',
                'email_id' => 'nullable|email',
                'phone' => 'nullable|string|max:20',
                'gender' => 'nullable|in:male,female,other',
                'blood_group' => 'nullable',
                'date_of_birth' => 'nullable|date',
                'joining_date' => 'required|date',
                'confirmation_date' => 'nullable|date|after_or_equal:joining_date',
                'address' => 'nullable|string',
                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
                'nid' => 'nullable|string|unique:employees,nid',
                'nid_number' => 'nullable|string|max:50',
                'smart_card_number' => 'nullable|string|max:50',
                'birth_registration_number' => 'nullable|string|max:50',
                'emergency_contact' => 'nullable|string',
                'fathers_name' => 'nullable|string|max:255',
                'fathers_mobile' => 'nullable|string|max:20',
                'mothers_name' => 'nullable|string|max:255',
                'mothers_mobile' => 'nullable|string|max:20',
                'marital_status' => 'nullable|string|max:30',
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',
                'village' => 'nullable|string|max:255',
                'post_office' => 'nullable|string|max:255',
                'union_pouroshova' => 'nullable|string|max:255',
                'ward_no' => 'nullable|string|max:20',
                'upazila' => 'nullable|string|max:255',
                'district' => 'nullable|string|max:255',
                'educational_qualification' => 'nullable|string',
                'department_id' => 'required|exists:departments,id',
                'joining_designation_id' => 'required|exists:designations,id',
                'last_designation_id' => 'nullable|exists:designations,id',
                'current_branch_id' => 'required|exists:branches,id',
                'last_branch_id' => 'nullable|exists:branches,id',
                'reporting_to' => 'nullable|exists:employees,id',
                'status' => 'required|in:active,inactive,on_leave,terminated',
                'is_dropout' => 'nullable|boolean',
                'resignation_date' => 'nullable|date|after_or_equal:joining_date',
                'dropout_date' => 'nullable|date|after_or_equal:joining_date|required_if:is_dropout,1',
                'dropout_reason' => 'nullable|string|required_if:is_dropout,1',
                'final_payment_date' => 'nullable|date|required_if:is_dropout,1|after_or_equal:dropout_date',
                'last_promotion_date' => 'nullable|date',
                'probation_period_days' => 'nullable|integer|min:0|max:3650',
                'basic_salary' => 'nullable|numeric',
                'bank_account_details' => 'nullable|array',
            ]);

            if (empty($validated['last_designation_id'])) {
                $validated['last_designation_id'] = $validated['joining_designation_id'];
            }

            $employeeData = $validated;
            unset($employeeData['is_dropout']);
            unset($employeeData['photo']);

            $employeeData['employee_id'] = $employeeData['pin'];
            $employeeData['first_name'] = $employeeData['name_en'];
            $employeeData['last_name'] = $employeeData['last_name'] ?? null;
            $employeeData['designation_id'] = $employeeData['last_designation_id'];

            // Auto-generate probation period from Joining -> Confirmation
            if (!empty($employeeData['joining_date']) && !empty($employeeData['confirmation_date'])) {
                $employeeData['probation_period_days'] = Carbon::parse($employeeData['joining_date'])
                    ->diffInDays(Carbon::parse($employeeData['confirmation_date']));
            } else {
                $employeeData['probation_period_days'] = null;
            }

            if ($request->hasFile('photo')) {
                try {
                    $photo = $request->file('photo');
                    $extension = $photo->getClientOriginalExtension();
                    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

                    if (!in_array(strtolower($extension), $allowedExtensions)) {
                        return back()
                            ->withInput()
                            ->withErrors(['photo' => 'Invalid image format. Only jpg, jpeg, png, and gif are allowed.']);
                    }

                    $targetDir = public_path('storage/employee_photos');
                    if (!is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }

                    $filename = time() . '_' . uniqid() . '.' . $extension;
                    $photo->move($targetDir, $filename);
                    $employeeData['photo'] = 'employee_photos/' . $filename;
                } catch (\Throwable $e) {
                    Log::warning('Employee photo upload failed (create)', [
                        'message' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ]);
                    report($e);

                    return back()
                        ->withInput()
                        ->withErrors(['photo' => 'Error uploading image. Please try again.']);
                }
            }

            if (isset($employeeData['bank_account_details'])) {
                $employeeData['bank_account_details'] = json_encode($employeeData['bank_account_details']);
            }

            DB::transaction(function () use ($employeeData, &$createdEmployee) {
                $createdEmployee = Employee::create($employeeData);
                $createdEmployee->load('designation');
                $this->syncZoneRegionalManagerAssignment($createdEmployee);
                $this->syncUserAccountForEmployee($createdEmployee);
            });

            $successMsg = 'Employee created successfully. A user account was created (username from PIN, email from employee).';
            if (config('app.debug')) {
                $successMsg .= ' Default password: '.self::AUTO_USER_DEFAULT_PASSWORD;
            }

            return redirect()->route('employees.index')
                ->with('success', $successMsg);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            $this->logEmployeeSaveFailure('store', $request, $createdEmployee, $e);
            $message = $this->buildEmployeeSaveErrorMessage($e);

            return back()
                ->withInput()
                ->withErrors(['submit' => $message])
                ->with('error', $message);
        }
    }

    /**
     * Show form to edit an employee.
     */
    public function edit(Employee $employee)
    {
        $departments = Department::all();
        $designations = Designation::all();
        $branches = Branch::query()
            ->with([
                'regionalOffice.zone.zoneManager:id,employee_id,first_name,last_name',
                'regionalOffice.regionalManager:id,employee_id,first_name,last_name',
            ])
            ->orderBy('name')
            ->get(['id', 'name', 'regional_office_id']);
        $managers = Employee::where('status', 'active')
            ->where('id', '!=', $employee->id)
            ->get();

        return Inertia::render('employee/edit', [
            'oldInput' => old(),
            'employee' => $employee,
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches->map(function (Branch $branch) {
                $regionalManager = $branch->regionalOffice?->regionalManager;
                $zoneManager = $branch->regionalOffice?->zone?->zoneManager;

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'regionalManager' => $regionalManager ? [
                        'id' => $regionalManager->id,
                        'employee_id' => $regionalManager->employee_id,
                        'first_name' => $regionalManager->first_name,
                        'last_name' => $regionalManager->last_name,
                    ] : null,
                    'zoneManager' => $zoneManager ? [
                        'id' => $zoneManager->id,
                        'employee_id' => $zoneManager->employee_id,
                        'first_name' => $zoneManager->first_name,
                        'last_name' => $zoneManager->last_name,
                    ] : null,
                ];
            }),
            'managers' => $managers,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
        ]);
    }

    /**
     * Update the specified employee.
     */
    public function update(Request $request, Employee $employee)
    {
        try {
            $this->normalizeEmployeeRequestPayload($request);

            $validated = $request->validate([
                'pin' => 'required|string|max:20|unique:employees,pin,' . $employee->id,
                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',
                'email' => 'required|email|unique:employees,email,' . $employee->id,
                'email_id' => 'nullable|email',
                'phone' => 'nullable|string|max:20',
                'gender' => 'nullable|in:male,female,other',
                'blood_group' => 'nullable',
                'date_of_birth' => 'nullable|date',
                'joining_date' => 'required|date',
                'confirmation_date' => 'nullable|date|after_or_equal:joining_date',
                'address' => 'nullable|string',
                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
                'nid' => 'nullable|string|unique:employees,nid,' . $employee->id,
                'nid_number' => 'nullable|string|max:50',
                'smart_card_number' => 'nullable|string|max:50',
                'birth_registration_number' => 'nullable|string|max:50',
                'emergency_contact' => 'nullable|string',
                'fathers_name' => 'nullable|string|max:255',
                'fathers_mobile' => 'nullable|string|max:20',
                'mothers_name' => 'nullable|string|max:255',
                'mothers_mobile' => 'nullable|string|max:20',
                'marital_status' => 'nullable|string|max:30',
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',
                'village' => 'nullable|string|max:255',
                'post_office' => 'nullable|string|max:255',
                'union_pouroshova' => 'nullable|string|max:255',
                'ward_no' => 'nullable|string|max:20',
                'upazila' => 'nullable|string|max:255',
                'district' => 'nullable|string|max:255',
                'educational_qualification' => 'nullable|string',
                'department_id' => 'required|exists:departments,id',
                'joining_designation_id' => 'required|exists:designations,id',
                'last_designation_id' => 'nullable|exists:designations,id',
                'current_branch_id' => 'required|exists:branches,id',
                'last_branch_id' => 'nullable|exists:branches,id',
                'reporting_to' => 'nullable|exists:employees,id',
                'status' => 'required|in:active,inactive,on_leave,terminated',
                'is_dropout' => 'nullable|boolean',
                'resignation_date' => 'nullable|date|after_or_equal:joining_date',
                'dropout_date' => 'nullable|date|after_or_equal:joining_date|required_if:is_dropout,1',
                'dropout_reason' => 'nullable|string|required_if:is_dropout,1',
                'final_payment_date' => 'nullable|date|required_if:is_dropout,1|after_or_equal:dropout_date',
                'last_promotion_date' => 'nullable|date',
                'probation_period_days' => 'nullable|integer|min:0|max:3650',
                'basic_salary' => 'nullable|numeric',
                'bank_account_details' => 'nullable|array',
            ]);

            if (empty($validated['last_designation_id'])) {
                $validated['last_designation_id'] = $validated['joining_designation_id'];
            }

            $employeeData = $validated;
            unset($employeeData['is_dropout']);
            unset($employeeData['photo']);

            $employeeData['employee_id'] = $employeeData['pin'];
            $employeeData['first_name'] = $employeeData['name_en'];
            $employeeData['designation_id'] = $employeeData['last_designation_id'];

            // Auto-generate probation period from Joining -> Confirmation
            if (!empty($employeeData['joining_date']) && !empty($employeeData['confirmation_date'])) {
                $employeeData['probation_period_days'] = Carbon::parse($employeeData['joining_date'])
                    ->diffInDays(Carbon::parse($employeeData['confirmation_date']));
            } else {
                $employeeData['probation_period_days'] = null;
            }

            if ($request->hasFile('photo')) {
                try {
                    if ($employee->photo) {
                        $oldPhotoPath = public_path('storage/' . $employee->photo);
                        if (file_exists($oldPhotoPath)) {
                            @unlink($oldPhotoPath);
                        }
                    }

                    $photo = $request->file('photo');
                    $extension = $photo->getClientOriginalExtension();
                    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

                    if (!in_array(strtolower($extension), $allowedExtensions)) {
                        return back()
                            ->withInput()
                            ->withErrors(['photo' => 'Invalid image format. Only jpg, jpeg, png, and gif are allowed.']);
                    }

                    $targetDir = public_path('storage/employee_photos');
                    if (!is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }

                    $filename = time() . '_' . uniqid() . '.' . $extension;
                    $photo->move($targetDir, $filename);
                    $employeeData['photo'] = 'employee_photos/' . $filename;
                } catch (\Throwable $e) {
                    Log::warning('Employee photo upload failed (update)', [
                        'employee_id' => $employee->id,
                        'message' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ]);
                    report($e);

                    return back()
                        ->withInput()
                        ->withErrors(['photo' => 'Error uploading image. Please try again.']);
                }
            }

            if (isset($employeeData['bank_account_details'])) {
                $employeeData['bank_account_details'] = json_encode($employeeData['bank_account_details']);
            }

            DB::transaction(function () use ($employee, $employeeData) {
                $employee->update($employeeData);
                $employee->load('designation');
                $this->syncZoneRegionalManagerAssignment($employee);
                $this->syncUserAccountForEmployee($employee->fresh());
            });

            return redirect()->route('employees.index')
                ->with('success', 'Employee updated successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            $this->logEmployeeSaveFailure('update', $request, $employee, $e);
            $message = $this->buildEmployeeSaveErrorMessage($e);

            return back()
                ->withInput()
                ->withErrors(['submit' => $message])
                ->with('error', $message);
        }
    }

    public function show(Employee $employee)
    {
        $employee->load([
            'department',
            'designation',
            'branch',
            'manager',
            'joiningDesignation',
            'lastDesignation',
            'lastBranch',
            'leaveApplications.leaveType',
            'leaveBalances.leaveType',
            'movements'
        ]);

        // Get current year leave balances
        $currentYearLeaveBalances = $employee->leaveBalances()
            ->where('year', date('Y'))
            ->with('leaveType')
            ->get();

        // Get recent leave applications (last 5)
        $recentLeaveApplications = $employee->leaveApplications()
            ->with('leaveType')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Get recent movements (last 5)
        $recentMovements = $employee->movements()
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return Inertia::render('employee/show', [
            'employee' => $employee,
            'currentYearLeaveBalances' => $currentYearLeaveBalances,
            'recentLeaveApplications' => $recentLeaveApplications,
            'recentMovements' => $recentMovements,
        ]);
    }

    /**
     * Delete the specified employee.
     */
    public function destroy(Employee $employee)
    {
        try {
            // Check if employee has a user account
            $user = User::where('employee_id', $employee->id)->first();
            if ($user) {
                return redirect()->route('employees.index')
                    ->with('error', 'Cannot delete employee that has a user account.');
            }

            // Delete photo if exists
            if ($employee->photo) {
                $photoPath = public_path('storage/' . $employee->photo);
                if (file_exists($photoPath)) {
                    unlink($photoPath);
                }
            }

            // Delete employee
            $deleted = $employee->delete();

            if (!$deleted) {
                return redirect()->route('employees.index')
                    ->with('error', 'Failed to delete employee. Please try again.');
            }

            return redirect()->route('employees.index')
                ->with('success', 'Employee deleted successfully.');
        } catch (\Exception $e) {
            // Log the error
            Log::error('Employee deletion error: ' . $e->getMessage());

            return redirect()->route('employees.index')
                ->with('error', 'An error occurred while deleting the employee: ' . $e->getMessage());
        }
    }

    /**
     * Display organization chart.
     */
    public function organizationChart()
    {
        $departments = Department::with(['headEmployee', 'employees.designation'])
            ->orderBy('name')
            ->get();

        return Inertia::render('employee/organization-chart', [
            'departments' => $departments,
        ]);
    }

    /**
     * Display blank employee form for printing.
     */
    public function blankForm()
    {
        $departments = Department::orderBy('name')->get();
        $designations = Designation::orderBy('name')->get();
        $branches = Branch::orderBy('name')->get();

        return view('pdf.employee-blank-form', [
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
        ]);
    }

    public function importPreview(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240|mimes:csv,txt,xlsx',
        ]);

        $file = $request->file('file');
        $ext = strtolower((string) $file->getClientOriginalExtension());
        $debug = [
            'step' => 'importPreview:start',
            'original_name' => $file?->getClientOriginalName(),
            'extension' => $ext,
            'size_bytes' => $file?->getSize(),
            'time' => now()->toDateTimeString(),
        ];
        Log::info('Employee import preview started', $debug);

        if ($ext === 'xlsx') {
            Log::warning('Employee import preview blocked: xlsx requires ext-zip', $debug);
            return back()->withErrors([
                'file' => 'XLSX import requires PHP zip extension (ext-zip). Please upload CSV for now, or enable ext-zip to support XLSX.',
            ]);
        }

        $path = $file->store('imports/employees', 'local');
        $absPath = storage_path('app/' . $path);

        try {
            $rows = $this->readCsvRows($absPath, $path);
            if (count($rows) === 0) {
                Log::warning('Employee import preview failed: empty file', $debug + ['stored_path' => $path]);
                return back()->withErrors(['file' => 'The file is empty.']);
            }

            if (count($rows) > self::EMPLOYEE_IMPORT_MAX_ROWS + 1) {
                Log::warning('Employee import preview failed: too many rows', $debug + ['row_count' => count($rows)]);
                return back()->withErrors([
                    'file' => 'Too many rows. Please split the file and try again.',
                ]);
            }

            [$header, $dataRows] = $this->splitHeaderRows($rows);
            $headerMap = $this->normalizeHeaderMap($header);

            $previewRows = [];
            foreach ($dataRows as $i => $row) {
                $rowNumber = $i + 2;
                $rowAssoc = $this->rowToAssoc($row, $headerMap);

                unset($rowAssoc['sl'], $rowAssoc['serial'], $rowAssoc['ক্রমিক'], $rowAssoc['ক্রমিক_no'], $rowAssoc['ক্রমিকনং']);

                $previewRows[] = [
                    'source_row' => $rowNumber,
                    'pin' => $this->firstNonEmpty($rowAssoc, ['pin', 'employee_id', 'id', 'emp_id']) ?? '',
                    'name_en' => $this->firstNonEmpty($rowAssoc, ['name_en', 'name', 'full_name', 'employee_name', 'first_name']) ?? '',
                    'last_name' => $this->valueOrNull($rowAssoc, ['last_name']) ?? '',
                    'email' => $this->firstNonEmpty($rowAssoc, ['email', 'mail']) ?? '',
                    'joining_date' => $this->firstNonEmpty($rowAssoc, ['joining_date', 'join_date', 'date_of_joining', 'doj']) ?? '',
                    'department' => $this->firstNonEmpty($rowAssoc, ['department_id', 'dept_id', 'department']) ?? '',
                    'joining_designation' => $this->firstNonEmpty($rowAssoc, ['joining_designation_id', 'joining_designation', 'designation_id', 'desig_id', 'designation']) ?? '',
                    'last_designation' => $this->firstNonEmpty($rowAssoc, ['last_designation_id', 'last_designation']) ?? '',
                    'current_branch' => $this->firstNonEmpty($rowAssoc, ['current_branch_id', 'branch_id', 'branch', 'current_branch']) ?? '',
                    'last_branch' => $this->firstNonEmpty($rowAssoc, ['last_branch_id', 'last_branch', 'previous_branch']) ?? '',
                    'status' => $this->firstNonEmpty($rowAssoc, ['status']) ?? '',
                ];
            }

            $importId = (string) Str::uuid();
            $debug['step'] = 'importPreview:cached';
            $debug['importId'] = $importId;
            $debug['row_count'] = count($previewRows);

            Cache::put(
                "employee_import_preview:{$importId}",
                [
                    'header' => $headerMap,
                    'rows' => $previewRows,
                    'debug' => $debug,
                ],
                self::EMPLOYEE_IMPORT_CACHE_TTL_SECONDS
            );

            Log::info('Employee import preview cached; redirecting to review', $debug);
            // Force navigation to the review page (works reliably even for file uploads)
            return Inertia::location(route('employees.import.review', ['importId' => $importId]));
        } catch (\Throwable $e) {
            Log::error('Employee import failed', [
                'error' => $e->getMessage(),
                'context' => $debug,
            ]);

            return back()->withErrors([
                'file' => 'Import failed. Please check the file format and try again.',
            ]);
        } finally {
            try {
                Storage::disk('local')->delete($path);
            } catch (\Throwable $e) {
                // ignore cleanup failures
            }
        }
    }

    public function importReview(string $importId)
    {
        $cached = Cache::get("employee_import_preview:{$importId}");
        if (! is_array($cached) || ! isset($cached['rows'])) {
            return redirect()->route('employees.index')
                ->with('error', 'Import preview expired. Please upload the file again.');
        }

        $rows = is_array($cached['rows']) ? $cached['rows'] : [];
        $debug = is_array($cached['debug'] ?? null) ? $cached['debug'] : null;

        $pins = [];
        $emails = [];
        foreach ($rows as $r) {
            $pin = trim((string) ($r['pin'] ?? ''));
            $email = trim((string) ($r['email'] ?? ''));
            if ($pin !== '') $pins[] = $pin;
            if ($email !== '') $emails[] = $email;
        }

        $pins = array_values(array_unique($pins));
        $emails = array_values(array_unique($emails));

        $existingPins = [];
        if (count($pins) > 0) {
            $existingPins = Employee::query()
                ->whereIn('pin', $pins)
                ->orWhereIn('employee_id', $pins)
                ->pluck('pin')
                ->merge(Employee::query()->whereIn('employee_id', $pins)->pluck('employee_id'))
                ->filter()
                ->map(fn ($v) => (string) $v)
                ->unique()
                ->values()
                ->all();
        }
        $existingPinSet = array_fill_keys($existingPins, true);

        $existingEmailSet = [];
        if (count($emails) > 0) {
            $existingEmails = Employee::query()->whereIn('email', $emails)->pluck('email')->all();
            $existingEmailSet = array_fill_keys(array_map('strtolower', $existingEmails), true);
        }

        $dupInFilePins = [];
        $pinCounts = array_count_values(array_map('strtolower', $pins));
        foreach ($pinCounts as $p => $c) {
            if ($c > 1) $dupInFilePins[$p] = true;
        }

        $dupInFileEmails = [];
        $emailCounts = array_count_values(array_map('strtolower', $emails));
        foreach ($emailCounts as $e => $c) {
            if ($c > 1) $dupInFileEmails[$e] = true;
        }

        $issuesByRow = [];
        foreach ($rows as $idx => $r) {
            $sourceRow = (int) ($r['source_row'] ?? ($idx + 2));
            $issues = [];

            $pin = trim((string) ($r['pin'] ?? ''));
            $nameEn = trim((string) ($r['name_en'] ?? ''));
            $email = trim((string) ($r['email'] ?? ''));
            $joiningDate = trim((string) ($r['joining_date'] ?? ''));

            if ($pin === '') $issues[] = 'Missing PIN';
            if ($nameEn === '') $issues[] = 'Missing name';
            if ($email === '') $issues[] = 'Missing email';
            if ($joiningDate === '') $issues[] = 'Missing joining_date';

            if ($pin !== '' && isset($existingPinSet[$pin])) $issues[] = 'Duplicate PIN exists in system';
            if ($email !== '' && isset($existingEmailSet[strtolower($email)])) $issues[] = 'Duplicate email exists in system';
            if ($pin !== '' && isset($dupInFilePins[strtolower($pin)])) $issues[] = 'Duplicate PIN inside file';
            if ($email !== '' && isset($dupInFileEmails[strtolower($email)])) $issues[] = 'Duplicate email inside file';

            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                $issues[] = 'Invalid email format';
            }

            if ($joiningDate !== '') {
                try {
                    Carbon::parse($joiningDate);
                } catch (\Throwable $e) {
                    $issues[] = 'Invalid joining_date';
                }
            }

            $issuesByRow[$sourceRow] = $issues;
        }

        $departments = Department::orderBy('name')->get(['id', 'name']);
        $designations = Designation::orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);

        return Inertia::render('employee/import-review', [
            'importId' => $importId,
            'rows' => $rows,
            'issuesByRow' => $issuesByRow,
            'debug' => $debug,
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
        ]);
    }

    public function importCommit(Request $request)
    {
        $validated = $request->validate([
            'importId' => 'required|string',
            'rows' => 'required|array|max:' . self::EMPLOYEE_IMPORT_MAX_ROWS,
            'rows.*.pin' => 'required|string|max:20',
            'rows.*.name_en' => 'required|string|max:255',
            'rows.*.email' => 'required|email',
            'rows.*.joining_date' => 'required|date',
            'rows.*.department_id' => 'required|integer|exists:departments,id',
            'rows.*.joining_designation_id' => 'required|integer|exists:designations,id',
            'rows.*.last_designation_id' => 'required|integer|exists:designations,id',
            'rows.*.current_branch_id' => 'required|integer|exists:branches,id',
            'rows.*.last_branch_id' => 'nullable|integer|exists:branches,id',
            'rows.*.status' => 'required|in:active,inactive,on_leave,terminated',
            'rows.*.source_row' => 'nullable|integer',
        ]);

        $importId = (string) $validated['importId'];
        $cached = Cache::get("employee_import_preview:{$importId}");
        if (! is_array($cached)) {
            return back()->withErrors([
                'importId' => 'Import preview expired. Please upload the file again.',
            ]);
        }

        $created = 0;
        $skipped = 0;
        $rowErrors = [];
        $createdByBranchId = [];

        DB::beginTransaction();
        try {
            foreach ($validated['rows'] as $idx => $row) {
                $rowNumber = (int) ($row['source_row'] ?? ($idx + 2));
                $pin = trim((string) $row['pin']);
                $email = trim((string) $row['email']);

                $errors = [];
                if (Employee::where('pin', $pin)->orWhere('employee_id', $pin)->exists()) {
                    $errors[] = 'Duplicate PIN/Employee ID';
                }
                if (Employee::where('email', $email)->exists()) {
                    $errors[] = 'Duplicate email';
                }
                if (User::where('email', $email)->exists()) {
                    $errors[] = 'Email already used by a user account';
                }

                if (count($errors) > 0) {
                    $skipped++;
                    $rowErrors[] = ['row' => $rowNumber, 'errors' => $errors];
                    continue;
                }

                $employeeData = [
                    'employee_id' => $pin,
                    'first_name' => (string) $row['name_en'],
                    'last_name' => (string) ($row['last_name'] ?? ''),

                    'pin' => $pin,
                    'name_en' => (string) $row['name_en'],
                    'email' => $email,
                    'joining_date' => Carbon::parse($row['joining_date'])->toDateString(),
                    'department_id' => (int) $row['department_id'],
                    'designation_id' => (int) $row['last_designation_id'],
                    'joining_designation_id' => (int) $row['joining_designation_id'],
                    'last_designation_id' => (int) $row['last_designation_id'],
                    'current_branch_id' => (int) $row['current_branch_id'],
                    'last_branch_id' => $row['last_branch_id'] ? (int) $row['last_branch_id'] : null,
                    'status' => (string) $row['status'],
                ];

                $employee = Employee::create($employeeData);
                $employee->load('designation');
                $this->syncZoneRegionalManagerAssignment($employee);
                $this->syncUserAccountForEmployee($employee);

                $created++;
                $bid = (int) $row['current_branch_id'];
                $createdByBranchId[$bid] = ($createdByBranchId[$bid] ?? 0) + 1;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        Cache::forget("employee_import_preview:{$importId}");

        $branchBreakdown = [];
        if (count($createdByBranchId) > 0) {
            $branchNames = Branch::whereIn('id', array_keys($createdByBranchId))->pluck('name', 'id');
            foreach ($createdByBranchId as $bid => $count) {
                $branchBreakdown[] = [
                    'branch_id' => $bid,
                    'branch_name' => $branchNames[$bid] ?? ('Branch #' . $bid),
                    'created' => $count,
                ];
            }
            usort($branchBreakdown, fn ($a, $b) => $b['created'] <=> $a['created']);
        }

        $message = "Import confirmed. Created {$created}, skipped {$skipped}.";
        return redirect()->route('employees.index')
            ->with('success', $message)
            ->with('import_summary', [
                'created' => $created,
                'skipped' => $skipped,
                'branches' => $branchBreakdown,
            ])
            ->with('import_row_errors', array_slice($rowErrors, 0, 50));
    }

    public function downloadImportExample()
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="employee-import-example.csv"',
        ];

        $csvHeader = [
            'sl',
            // Identity
            'pin',
            'name_en',
            'name_bn',
            'email',
            'email_id',
            'phone',
            // Personal
            'gender', // male|female|other
            'blood_group',
            'date_of_birth', // yyyy-mm-dd
            // Employment / Org
            'joining_date', // yyyy-mm-dd
            'confirmation_date', // yyyy-mm-dd (optional)
            'department', // id OR exact name
            'joining_designation', // id OR exact name
            'last_designation', // id OR exact name
            'branch', // id OR exact name (current branch)
            'last_branch', // id OR exact name (optional)
            'reporting_to', // manager employee pin OR employee_id OR numeric employee table id (optional)
            'status', // active|inactive|on_leave|terminated
            // Address
            'address',
            'village',
            'post_office',
            'union_pouroshova',
            'ward_no',
            'upazila',
            'district',
            // Education
            'educational_qualification',
            // IDs
            'nid',
            'nid_number',
            'smart_card_number',
            'birth_registration_number',
            // Emergency / Family
            'emergency_contact',
            'fathers_name',
            'fathers_mobile',
            'mothers_name',
            'mothers_mobile',
            'marital_status',
            'spouse_name',
            'spouse_mobile',
            // Service lifecycle
            'resignation_date', // yyyy-mm-dd (optional)
            'dropout_date', // yyyy-mm-dd (optional)
            'dropout_reason',
            'final_payment_date', // yyyy-mm-dd (optional)
            'last_promotion_date', // yyyy-mm-dd (optional)
        ];

        $rows = [
            [
                '1',
                '1001',
                'Demo Employee',
                '',
                'demo.employee@example.com',
                '2026-01-01',
                'active',
            ],
            [
                '2',
                '1002',
                'Second Employee',
                '',
                'second.employee@example.com',
                '2026-02-15',
                'active',
            ],
        ];

        // Expand sample rows to match header length (keep most optional fields blank).
        $rows = array_map(function (array $r) use ($csvHeader) {
            $targetCount = count($csvHeader);
            if (count($r) < $targetCount) {
                $r = array_pad($r, $targetCount, '');
            } elseif (count($r) > $targetCount) {
                $r = array_slice($r, 0, $targetCount);
            }
            return $r;
        }, $rows);

        // Fill a few meaningful defaults into the sample rows (by column name).
        $headerIndex = array_flip($csvHeader);
        $set = function (&$row, string $col, string $val) use ($headerIndex) {
            if (isset($headerIndex[$col])) {
                $row[$headerIndex[$col]] = $val;
            }
        };

        if (isset($rows[0])) {
            $set($rows[0], 'joining_date', '2026-01-01');
            $set($rows[0], 'department', 'Accounts');
            $set($rows[0], 'joining_designation', 'Officer');
            $set($rows[0], 'last_designation', 'Officer');
            $set($rows[0], 'branch', 'Head Office');
            $set($rows[0], 'status', 'active');
        }
        if (isset($rows[1])) {
            $set($rows[1], 'joining_date', '2026-02-15');
            $set($rows[1], 'department', '5');
            $set($rows[1], 'joining_designation', '9');
            $set($rows[1], 'last_designation', '9');
            $set($rows[1], 'branch', '2');
            $set($rows[1], 'last_branch', '1');
            $set($rows[1], 'status', 'active');
        }

        return response()->stream(function () use ($csvHeader, $rows) {
            $out = fopen('php://output', 'wb');
            // UTF-8 BOM for Excel
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $csvHeader);
            foreach ($rows as $r) {
                fputcsv($out, $r);
            }
            fclose($out);
        }, 200, $headers);
    }

    private function readCsvRows(string $absPath, ?string $storageRelativePath = null): array
    {
        $raw = @file_get_contents($absPath);
        if ($raw === false) {
            $exists = @file_exists($absPath);
            $isReadable = @is_readable($absPath);
            Log::warning('Employee import: file_get_contents failed', [
                'path' => $absPath,
                'exists' => $exists,
                'readable' => $isReadable,
                'relative_path' => $storageRelativePath,
            ]);

            if (is_string($storageRelativePath) && $storageRelativePath !== '') {
                try {
                    $rawFromStorage = Storage::disk('local')->get($storageRelativePath);
                    if (is_string($rawFromStorage) && $rawFromStorage !== '') {
                        $raw = $rawFromStorage;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Employee import: Storage::get failed', [
                        'relative_path' => $storageRelativePath,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if ($raw === false) {
                return [];
            }
        }

        if ($raw === '') {
            Log::warning('Employee import: file is empty string', ['path' => $absPath]);
            return [];
        }

        // Normalize encoding (common case: Excel "Unicode Text" / UTF-16 CSV)
        // Heuristic: presence of null bytes usually means UTF-16.
        $hasNullBytes = strpos($raw, "\0") !== false;

        if ($hasNullBytes) {
            $converted = null;
            if (function_exists('mb_convert_encoding')) {
                // Try UTF-16LE first (most common), fallback to UTF-16BE
                $tryLe = @mb_convert_encoding($raw, 'UTF-8', 'UTF-16LE');
                $tryBe = @mb_convert_encoding($raw, 'UTF-8', 'UTF-16BE');

                $converted = is_string($tryLe) && $tryLe !== '' ? $tryLe : null;
                if ($converted === null && is_string($tryBe) && $tryBe !== '') {
                    $converted = $tryBe;
                }
            }

            if (is_string($converted) && $converted !== '') {
                $raw = $converted;
            } else {
                Log::warning('Employee import: detected null bytes but could not convert encoding', [
                    'path' => $absPath,
                ]);
            }
        }

        // Strip UTF-8 BOM if present
        $raw = preg_replace('/^\\xEF\\xBB\\xBF/', '', $raw) ?? $raw;

        $lines = preg_split("/\r\n|\n|\r/", $raw) ?: [];
        // Remove trailing empty lines
        while (count($lines) > 0 && trim((string) end($lines)) === '') {
            array_pop($lines);
        }

        if (count($lines) === 0) {
            Log::warning('Employee import: no lines after split', [
                'path' => $absPath,
                'has_null_bytes' => $hasNullBytes,
            ]);
            return [];
        }

        $firstLine = (string) $lines[0];
        $delimiter = $this->guessCsvDelimiter($firstLine);

        $rows = [];
        foreach ($lines as $line) {
            $line = (string) $line;
            if (trim($line) === '') continue;
            $data = str_getcsv($line, $delimiter);
            if (! is_array($data)) continue;
            if (count(array_filter($data, fn ($v) => trim((string) $v) !== '')) === 0) continue;
            $rows[] = $data;
        }

        if (count($rows) === 0) {
            Log::warning('Employee import: parsed 0 CSV rows', [
                'path' => $absPath,
                'has_null_bytes' => $hasNullBytes,
                'delimiter' => $delimiter,
            ]);
        }

        return $rows;
    }

    private function guessCsvDelimiter(string $line): string
    {
        $candidates = [',', ';', "\t", '|'];
        $best = ',';
        $bestCount = -1;

        foreach ($candidates as $d) {
            $count = count(str_getcsv($line, $d));
            if ($count > $bestCount) {
                $bestCount = $count;
                $best = $d;
            }
        }

        return $best;
    }

    private function splitHeaderRows(array $rows): array
    {
        $header = $rows[0] ?? [];
        $data = array_slice($rows, 1);
        return [$header, $data];
    }

    private function normalizeHeaderMap(array $header): array
    {
        $map = [];
        foreach ($header as $idx => $name) {
            $key = strtolower(trim((string) $name));
            $key = preg_replace('/\s+/', '_', $key);
            $key = preg_replace('/[^a-z0-9_\x{0980}-\x{09FF}]/u', '', $key);
            if ($key === '') {
                $key = 'col_' . $idx;
            }
            $map[$idx] = $key;
        }
        return $map;
    }

    private function rowToAssoc(array $row, array $headerMap): array
    {
        $assoc = [];
        foreach ($headerMap as $idx => $key) {
            $assoc[$key] = $row[$idx] ?? null;
        }
        return $assoc;
    }

    private function firstNonEmpty(array $rowAssoc, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (! array_key_exists($k, $rowAssoc)) continue;
            $v = trim((string) $rowAssoc[$k]);
            if ($v !== '') return $v;
        }
        return null;
    }

    private function valueOrNull(array $rowAssoc, array $keys): ?string
    {
        $v = $this->firstNonEmpty($rowAssoc, $keys);
        return $v !== null ? $v : null;
    }

    private function resolveIdFromRowOrDefault(
        array $rowAssoc,
        array $keys,
        ?int $defaultId,
        string $modelClass,
        string $nameField
    ): ?int {
        $raw = $this->firstNonEmpty($rowAssoc, $keys);
        if ($raw === null) {
            return $defaultId;
        }

        if (ctype_digit($raw)) {
            return (int) $raw;
        }

        // Try match by name (case-insensitive)
        $name = trim($raw);
        $model = $modelClass::query()
            ->whereRaw('LOWER(' . $nameField . ') = ?', [strtolower($name)])
            ->first(['id']);

        return $model?->id ?? $defaultId;
    }
}
