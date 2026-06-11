<?php

namespace App\Http\Controllers\Employee;

use App\Http\Concerns\EmployedEmployeeUniqueIdentifiers;
use App\Http\Concerns\ResolvesEmployeeNidSmartCard;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\LocationVillage;
use App\Models\Program;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class EmployeeV2Controller extends Controller
{
    use EmployedEmployeeUniqueIdentifiers;
    use ResolvesEmployeeNidSmartCard;

    /** Default role name used for employee user accounts. */
    private const AUTO_USER_EMPLOYEE_ROLE_NAME = 'Employee';

    private const AUTO_EMAIL_DOMAIN_ENV = 'HRM_AUTO_EMAIL_DOMAIN';

    private function readJsonArrayFile(string $absPath): array
    {
        try {
            $raw = @file_get_contents($absPath);
            if (! is_string($raw) || trim($raw) === '') {
                return [];
            }
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable) {
            return [];
        }
    }

    private function getAutoEmailDomain(): string
    {
        $d = (string) env(self::AUTO_EMAIL_DOMAIN_ENV, 'auto.local');
        $d = trim($d);

        return $d !== '' ? $d : 'auto.local';
    }

    private function normalizeEmployeeRequestPayload(Request $request): void
    {
        $nullableEmptiesToNull = [
            'email',
            'mobile_personal',
            'mobile_official',
            'gender',
            'religion',
            'blood_group',
            'date_of_birth',
            'confirmation_date',
            'nid_number',
            'smart_card_number',
            'tin_certificate_no',
            'driving_license_no',
            'passport_no',
            'identification_mark',
            'employee_type_id',
            'program_id',
            'project_id',
            'reporting_to',
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

    public function create(Request $request)
    {
        $departments = Department::orderBy('name')->get(['id', 'name']);
        $designations = Designation::orderBy('name')->get(['id', 'name']);
        $branches = Branch::query()->orderBy('name')->get(['id', 'name']);
        $managers = Employee::query()
            ->where('status', 'active')
            ->orderBy('name_en')
            ->get(['id', 'employee_id', 'pin', 'name_en']);

        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get();
        $programs = Program::query()->where('is_active', true)->orderBy('name')->get();
        $projects = Project::query()->where('is_active', true)->orderBy('name')->get();

        $banks = $this->readJsonArrayFile(base_path('data/bank.json'));
        $relations = $this->readJsonArrayFile(base_path('data/relation.json'));
        $educationBoards = $this->readJsonArrayFile(base_path('data/educationboard.json'));
        $locations = $this->readJsonArrayFile(base_path('data/locations.json'));

        return Inertia::render('employee-v2/create', [
            'oldInput' => old(),
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
            'managers' => $managers,
            'employeeTypes' => $employeeTypes,
            'programs' => $programs,
            'projects' => $projects,
            'banks' => $banks,
            'relations' => $relations,
            'educationBoards' => $educationBoards,
            'locations' => $locations,
            'defaultBankName' => 'Prime Bank PLC',
        ]);
    }

    public function edit(Request $request, Employee $employee)
    {
        $departments = Department::orderBy('name')->get(['id', 'name']);
        $designations = Designation::orderBy('name')->get(['id', 'name']);
        $branches = Branch::query()->orderBy('name')->get(['id', 'name']);
        $managers = Employee::query()
            ->where('status', 'active')
            ->where('id', '!=', $employee->id)
            ->orderBy('name_en')
            ->get(['id', 'employee_id', 'pin', 'name_en']);

        $employeeTypes = EmployeeType::query()->where('is_active', true)->orderBy('name')->get();
        $programs = Program::query()->where('is_active', true)->orderBy('name')->get();
        $projects = Project::query()->where('is_active', true)->orderBy('name')->get();

        $banks = $this->readJsonArrayFile(base_path('data/bank.json'));
        $relations = $this->readJsonArrayFile(base_path('data/relation.json'));
        $educationBoards = $this->readJsonArrayFile(base_path('data/educationboard.json'));
        $locations = $this->readJsonArrayFile(base_path('data/locations.json'));

        $employee->loadMissing(['department', 'designation', 'branch']);

        $payload = $employee->toArray();
        $payload['pin'] = $employee->pin;

        $payload['addresses'] = DB::table('employee_addresses')->where('employee_id', $employee->id)->get()->all();
        $payload['educations'] = DB::table('employee_educations')->where('employee_id', $employee->id)->get()->all();
        $payload['bank_accounts'] = DB::table('employee_bank_accounts')->where('employee_id', $employee->id)->get()->all();
        $payload['nominees'] = DB::table('employee_nominees')->where('employee_id', $employee->id)->get()->all();
        $payload['guarantors'] = DB::table('employee_guarantors')->where('employee_id', $employee->id)->get()->all();
        $payload['guarantor_cheques'] = DB::table('employee_guarantor_cheques')->where('employee_id', $employee->id)->get()->all();
        $payload['collaterals'] = DB::table('employee_collaterals')->where('employee_id', $employee->id)->get()->all();
        $payload['collateral_receive_cheques'] = DB::table('employee_collateral_receive_cheques')->where('employee_id', $employee->id)->get()->all();
        $payload['assets'] = DB::table('employee_assets')->where('employee_id', $employee->id)->get()->all();
        $payload['experiences'] = DB::table('employee_experiences')->where('employee_id', $employee->id)->get()->all();
        $payload['trainings'] = DB::table('employee_trainings')->where('employee_id', $employee->id)->get()->all();

        return Inertia::render('employee-v2/edit', [
            'oldInput' => old(),
            'employee' => $payload,
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
            'managers' => $managers,
            'employeeTypes' => $employeeTypes,
            'programs' => $programs,
            'projects' => $projects,
            'banks' => $banks,
            'relations' => $relations,
            'educationBoards' => $educationBoards,
            'locations' => $locations,
            'defaultBankName' => 'Prime Bank PLC',
        ]);
    }

    public function pinSuggestion(Request $request)
    {
        $pins = Employee::query()
            ->whereNotNull('pin')
            ->pluck('pin')
            ->map(fn ($v) => trim((string) $v))
            ->filter()
            ->values()
            ->all();

        $maxNormal = 0;
        $maxProject = 0;
        foreach ($pins as $p) {
            if (preg_match('/^\\d+$/', $p)) {
                $maxNormal = max($maxNormal, (int) $p);

                continue;
            }
            if (preg_match('/^p-(\\d+)$/i', $p, $m)) {
                $maxProject = max($maxProject, (int) $m[1]);
            }
        }

        $nextNormal = str_pad((string) ($maxNormal + 1), 4, '0', STR_PAD_LEFT);
        $nextProject = 'p-'.str_pad((string) ($maxProject + 1), 4, '0', STR_PAD_LEFT);

        return response()->json([
            'next_normal_pin' => $nextNormal,
            'next_project_pin' => $nextProject,
            'last_normal_pin' => $maxNormal > 0 ? str_pad((string) $maxNormal, 4, '0', STR_PAD_LEFT) : null,
        ]);
    }

    public function storeVillage(Request $request)
    {
        $validated = $request->validate([
            'division' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'upazila' => 'nullable|string|max:120',
            'union' => 'nullable|string|max:120',
            'name' => 'required|string|max:150',
        ]);

        $validated = array_map(fn ($v) => is_string($v) ? trim($v) : $v, $validated);
        $validated['created_by'] = $request->user()?->id;

        $village = LocationVillage::query()->firstOrCreate(
            Arr::only($validated, ['division', 'district', 'upazila', 'union', 'name']),
            Arr::only($validated, ['created_by'])
        );

        return response()->json([
            'id' => $village->id,
            'division' => $village->division,
            'district' => $village->district,
            'upazila' => $village->upazila,
            'union' => $village->union,
            'name' => $village->name,
        ]);
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

    private function syncUserAccountForEmployeeV2(Employee $employee, string $plainPasswordForNewUser): void
    {
        $employeeRole = Role::query()->where('name', self::AUTO_USER_EMPLOYEE_ROLE_NAME)->first();
        if (! $employeeRole) {
            Log::warning('Auto user skipped: Employee role missing', ['employee_id' => $employee->id]);

            return;
        }

        $pinRaw = (string) ($employee->getRawOriginal('pin') ?? $employee->getRawOriginal('employee_id') ?? '');
        $pin = trim($pinRaw);
        if ($pin === '') {
            Log::warning('Auto user skipped: empty PIN', ['employee_id' => $employee->id]);

            return;
        }

        $email = trim((string) ($employee->email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = strtolower($pin).'@'.$this->getAutoEmailDomain();
        }

        if (User::query()->where('email', $email)->where('employee_id', '!=', $employee->id)->exists()) {
            throw new \RuntimeException('This email is already used by another user account. Choose a different employee email.');
        }

        $user = User::query()->where('employee_id', $employee->id)->first();
        $base = $this->buildUsernameBaseFromPin($pin);
        $username = $this->allocateUniqueUsername($base, $user?->id);

        $name = trim((string) ($employee->getRawOriginal('name_en') ?? ''));
        if ($name === '') {
            $name = 'User';
        }

        $payload = [
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'role_id' => $employeeRole->id,
            'employee_id' => $employee->id,
            'branch_id' => $employee->current_branch_id,
            'active_status' => $employee->status === 'active',
        ];

        if ($user) {
            $user->fill($payload);
            $user->save();
        } else {
            $payload['password'] = $plainPasswordForNewUser; // hashed cast
            $user = User::create($payload);
        }

        $user->roles()->sync([$employeeRole->id]);
    }

    private function buildEmployeeSaveErrorMessage(\Throwable $e): string
    {
        $msg = $e->getMessage();
        if (str_contains($msg, 'Duplicate entry') || str_contains($msg, 'UNIQUE constraint')) {
            return 'Duplicate value: PIN or email may already exist. Please change them and try again.';
        }
        if ($e instanceof QueryException) {
            $driverMsg = (string) ($e->errorInfo[2] ?? '');
            if ($driverMsg !== '' && (str_contains($driverMsg, 'Duplicate') || str_contains($driverMsg, 'UNIQUE'))) {
                return 'Duplicate value: PIN or email may already exist. Please change them and try again.';
            }
        }

        return 'Employee could not be saved. Please try again.';
    }

    public function store(Request $request)
    {
        $createdEmployee = null;

        try {
            $this->normalizeEmployeeRequestPayload($request);
            $this->resolveNidAndSmartCardFromRequest($request);

            $maritalStatuses = [
                'Single',
                'Never Married',
                'Unmarried',
                'Separated',
                'Divorced',
                'Widowed',
                'Married',
            ];

            $validated = $request->validate([
                'current_branch_id' => 'required|exists:branches,id',
                'employee_type_id' => 'nullable|exists:employee_types,id',
                'pin' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('pin')],

                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',

                'gender' => 'nullable|string|max:20',
                'religion' => 'nullable|string|max:50',
                'marital_status' => 'nullable|string|in:'.implode(',', $maritalStatuses),
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',

                'date_of_birth' => 'nullable|date',

                'blood_group' => 'nullable|string|max:10',
                'joining_date' => 'required|date',
                'confirmation_date' => 'nullable|date|after_or_equal:joining_date',

                'fathers_name' => 'nullable|string|max:255',
                'fathers_mobile' => 'nullable|string|max:20',
                'mothers_name' => 'nullable|string|max:255',
                'mothers_mobile' => 'nullable|string|max:20',

                'department_id' => 'required|exists:departments,id',
                'joining_designation_id' => 'required|exists:designations,id',
                'last_designation_id' => 'nullable|exists:designations,id',
                'program_id' => 'nullable|exists:programs,id',
                'project_id' => 'nullable|exists:projects,id',

                'nid_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('nid_number')],
                'smart_card_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('smart_card_number')],
                'tin_certificate_no' => 'nullable|string|max:50',
                'driving_license_no' => 'nullable|string|max:50',
                'passport_no' => 'nullable|string|max:50',

                'is_project_employee' => 'nullable|boolean',
                'is_custodian' => 'nullable|boolean',
                'identification_mark' => 'nullable|string|max:255',

                'email' => 'nullable|email',
                'mobile_personal' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('mobile_personal')],
                'mobile_official' => 'nullable|string|max:20',

                'addresses' => 'nullable|array',
                'addresses.*.type' => 'required_with:addresses|in:present,permanent',
                'addresses.*.division' => 'nullable|string|max:100',
                'addresses.*.district' => 'nullable|string|max:100',
                'addresses.*.upazila' => 'nullable|string|max:120',
                'addresses.*.union' => 'nullable|string|max:120',
                'addresses.*.village' => 'nullable|string|max:150',
                'addresses.*.address_details' => 'nullable|string',

                'educations' => 'nullable|array',
                'educations.*.degree' => 'required_with:educations|string|max:150',
                'educations.*.institute' => 'nullable|string|max:255',
                'educations.*.group_name' => 'nullable|string|max:150',
                'educations.*.board' => 'nullable|string|max:255',
                'educations.*.subject' => 'nullable|string|max:255',
                'educations.*.result_type' => 'nullable|in:gpa,cgpa,other',
                'educations.*.result_value' => 'nullable|string|max:50',

                'bank' => 'nullable|array',
                'bank.bank_name' => 'nullable|string|max:200',
                'bank.branch_name' => 'nullable|string|max:200',
                'bank.account_no' => 'nullable|string|max:80',
                'bank.account_type' => 'nullable|in:current,savings',
                'bank.bank_address' => 'nullable|string',
                'bank.remark' => 'nullable|string',

                'nominees' => 'nullable|array',
                'nominees.*.name' => 'required_with:nominees|string|max:200',
                'nominees.*.relation' => 'nullable|string|max:80',
                'nominees.*.date_of_birth' => 'nullable|date',
                'nominees.*.share' => 'nullable|numeric|min:0|max:100',
                'nominees.*.contact' => 'nullable|string|max:30',

                'guarantors' => 'nullable|array',
                'guarantors.*.name' => 'required_with:guarantors|string|max:200',
                'guarantors.*.age' => 'nullable|integer|min:0|max:150',
                'guarantors.*.occupation' => 'nullable|string|max:150',
                'guarantors.*.relation' => 'nullable|string|max:80',
                'guarantors.*.phone' => 'nullable|string|max:30',
                'guarantors.*.email' => 'nullable|email',

                'guarantor_cheques' => 'nullable|array',
                'guarantor_cheques.*.bank_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.branch_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.cheque_no' => 'nullable|string|max:80',

                'collateral' => 'nullable|array',
                'collateral.has_certificate' => 'nullable|boolean',
                'collateral.certificate_levels' => 'nullable|array',
                'collateral.certificate_levels.*' => 'in:ssc,hsc,honors,masters',
                'collateral.security_amount' => 'nullable|numeric|min:0',
                'collateral.collateral_interest' => 'nullable|numeric|min:0',
                'collateral.collateral_date' => 'nullable|date',
                'collateral.notes' => 'nullable|string',

                'collateral_receive_cheques' => 'nullable|array',
                'collateral_receive_cheques.*.bank_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.branch_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.cheque_no' => 'nullable|string|max:80',
                'collateral_receive_cheques.*.notes' => 'nullable|string',

                'assets' => 'nullable|array',
                'assets.*.serial' => 'nullable|integer|min:0',
                'assets.*.asset_no' => 'nullable|string|max:100',
                'assets.*.name' => 'required_with:assets|string|max:200',
                'assets.*.details' => 'nullable|string',
                'assets.*.provided_quality' => 'nullable|string|max:120',
                'assets.*.asset_price' => 'nullable|numeric|min:0',

                'experiences' => 'nullable|array',
                'experiences.*.organization' => 'required_with:experiences|string|max:255',
                'experiences.*.from_date' => 'nullable|date',
                'experiences.*.to_date' => 'nullable|date',
                'experiences.*.designation' => 'nullable|string|max:200',
                'experiences.*.department' => 'nullable|string|max:200',
                'experiences.*.address' => 'nullable|string',

                'trainings' => 'nullable|array',
                'trainings.*.training_title' => 'required_with:trainings|string|max:255',
                'trainings.*.institute' => 'nullable|string|max:255',
                'trainings.*.address' => 'nullable|string',
                'trainings.*.duration' => 'nullable|string|max:100',
                'trainings.*.remarks' => 'nullable|string',

                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
                'signature' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            $marital = trim((string) ($validated['marital_status'] ?? ''));
            $needsSpouse = in_array($marital, ['Married', 'Widowed', 'Separated'], true);
            if ($needsSpouse) {
                $request->validate([
                    'spouse_name' => 'required|string|max:255',
                    'spouse_mobile' => 'required|string|max:20',
                ]);
            }

            $employeeData = Arr::only($validated, [
                'pin',
                'name_en',
                'name_bn',
                'email',
                'mobile_personal',
                'mobile_official',
                'gender',
                'religion',
                'marital_status',
                'spouse_name',
                'spouse_mobile',
                'date_of_birth',
                'blood_group',
                'joining_date',
                'confirmation_date',
                'fathers_name',
                'fathers_mobile',
                'mothers_name',
                'mothers_mobile',
                'department_id',
                'joining_designation_id',
                'last_designation_id',
                'current_branch_id',
                'employee_type_id',
                'program_id',
                'project_id',
                'nid_number',
                'smart_card_number',
                'tin_certificate_no',
                'driving_license_no',
                'passport_no',
                'is_project_employee',
                'is_custodian',
                'identification_mark',
            ]);

            $employeeData['employee_id'] = $employeeData['pin'];

            // Ensure employees.email is always filled (DB column is NOT NULL in existing schema)
            $email = trim((string) ($employeeData['email'] ?? ''));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $employeeData['email'] = strtolower((string) $employeeData['pin']).'@'.$this->getAutoEmailDomain();
            }

            if (empty($employeeData['last_designation_id'])) {
                $employeeData['last_designation_id'] = $employeeData['joining_designation_id'];
            }
            $employeeData['designation_id'] = $employeeData['last_designation_id'];

            // Auto probation/confirmation from employee type (months)
            if (! empty($employeeData['joining_date']) && empty($employeeData['confirmation_date']) && ! empty($employeeData['employee_type_id'])) {
                $etype = EmployeeType::query()->find($employeeData['employee_type_id']);
                $months = (int) ($etype?->probation_months ?? 0);
                if ($months > 0) {
                    $employeeData['confirmation_date'] = Carbon::parse($employeeData['joining_date'])->addMonthsNoOverflow($months)->toDateString();
                    $employeeData['probation_period_days'] = Carbon::parse($employeeData['joining_date'])->diffInDays(Carbon::parse($employeeData['confirmation_date']));
                } else {
                    $employeeData['probation_period_days'] = 0;
                    $employeeData['confirmation_date'] = Carbon::parse($employeeData['joining_date'])->toDateString();
                }
            }

            DB::transaction(function () use ($request, $employeeData, $validated, &$createdEmployee) {
                // Photo upload
                if ($request->hasFile('photo')) {
                    $photo = $request->file('photo');
                    $ext = strtolower((string) $photo->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_photos');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $photo->move($targetDir, $filename);
                    $employeeData['photo'] = 'employee_photos/'.$filename;
                }

                // Signature upload
                if ($request->hasFile('signature')) {
                    $sig = $request->file('signature');
                    $ext = strtolower((string) $sig->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_signatures');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $sig->move($targetDir, $filename);
                    $employeeData['signature'] = 'employee_signatures/'.$filename;
                }

                $createdEmployee = Employee::create($employeeData);

                $this->syncUserAccountForEmployeeV2($createdEmployee, (string) $employeeData['pin']);

                $eid = $createdEmployee->id;

                $addresses = is_array($validated['addresses'] ?? null) ? $validated['addresses'] : [];
                foreach ($addresses as $a) {
                    DB::table('employee_addresses')->updateOrInsert(
                        ['employee_id' => $eid, 'type' => $a['type']],
                        [
                            'division' => $a['division'] ?? null,
                            'district' => $a['district'] ?? null,
                            'upazila' => $a['upazila'] ?? null,
                            'union' => $a['union'] ?? null,
                            'village' => $a['village'] ?? null,
                            'address_details' => $a['address_details'] ?? null,
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }

                $educations = is_array($validated['educations'] ?? null) ? $validated['educations'] : [];
                foreach ($educations as $e) {
                    DB::table('employee_educations')->insert([
                        'employee_id' => $eid,
                        'degree' => (string) ($e['degree'] ?? ''),
                        'institute' => $e['institute'] ?? null,
                        'group_name' => $e['group_name'] ?? null,
                        'board' => $e['board'] ?? null,
                        'subject' => $e['subject'] ?? null,
                        'result_type' => $e['result_type'] ?? null,
                        'result_value' => $e['result_value'] ?? null,
                        'passing_year' => $e['passing_year'] ?? null,
                        'remarks' => $e['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $bank = is_array($validated['bank'] ?? null) ? $validated['bank'] : null;
                if ($bank) {
                    DB::table('employee_bank_accounts')->insert([
                        'employee_id' => $eid,
                        'bank_name' => (string) ($bank['bank_name'] ?? ''),
                        'branch_name' => $bank['branch_name'] ?? null,
                        'account_no' => $bank['account_no'] ?? null,
                        'account_type' => $bank['account_type'] ?? null,
                        'bank_address' => $bank['bank_address'] ?? null,
                        'remark' => $bank['remark'] ?? null,
                        'is_primary' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $nominees = is_array($validated['nominees'] ?? null) ? $validated['nominees'] : [];
                foreach ($nominees as $n) {
                    DB::table('employee_nominees')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($n['name'] ?? ''),
                        'relation' => $n['relation'] ?? null,
                        'date_of_birth' => $n['date_of_birth'] ?? null,
                        'share' => $n['share'] ?? null,
                        'contact' => $n['contact'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantors = is_array($validated['guarantors'] ?? null) ? $validated['guarantors'] : [];
                foreach ($guarantors as $g) {
                    DB::table('employee_guarantors')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($g['name'] ?? ''),
                        'age' => $g['age'] ?? null,
                        'occupation' => $g['occupation'] ?? null,
                        'relation' => $g['relation'] ?? null,
                        'phone' => $g['phone'] ?? null,
                        'email' => $g['email'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantorCheques = is_array($validated['guarantor_cheques'] ?? null) ? $validated['guarantor_cheques'] : [];
                foreach ($guarantorCheques as $c) {
                    DB::table('employee_guarantor_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_guarantor_id' => null,
                        'bank_name' => $c['bank_name'] ?? null,
                        'branch_name' => $c['branch_name'] ?? null,
                        'cheque_no' => $c['cheque_no'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $collateral = is_array($validated['collateral'] ?? null) ? $validated['collateral'] : null;
                $collateralId = null;
                if ($collateral) {
                    $collateralId = DB::table('employee_collaterals')->insertGetId([
                        'employee_id' => $eid,
                        'has_certificate' => (bool) ($collateral['has_certificate'] ?? false),
                        'certificate_levels' => isset($collateral['certificate_levels']) ? json_encode($collateral['certificate_levels']) : null,
                        'security_amount' => $collateral['security_amount'] ?? null,
                        'collateral_interest' => $collateral['collateral_interest'] ?? null,
                        'collateral_date' => $collateral['collateral_date'] ?? null,
                        'notes' => $collateral['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $receiveCheques = is_array($validated['collateral_receive_cheques'] ?? null) ? $validated['collateral_receive_cheques'] : [];
                foreach ($receiveCheques as $rc) {
                    DB::table('employee_collateral_receive_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_collateral_id' => $collateralId,
                        'bank_name' => $rc['bank_name'] ?? null,
                        'branch_name' => $rc['branch_name'] ?? null,
                        'cheque_no' => $rc['cheque_no'] ?? null,
                        'notes' => $rc['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $assets = is_array($validated['assets'] ?? null) ? $validated['assets'] : [];
                foreach ($assets as $as) {
                    DB::table('employee_assets')->insert([
                        'employee_id' => $eid,
                        'serial' => $as['serial'] ?? null,
                        'asset_no' => $as['asset_no'] ?? null,
                        'name' => (string) ($as['name'] ?? ''),
                        'details' => $as['details'] ?? null,
                        'provided_quality' => $as['provided_quality'] ?? null,
                        'asset_price' => $as['asset_price'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $experiences = is_array($validated['experiences'] ?? null) ? $validated['experiences'] : [];
                foreach ($experiences as $ex) {
                    DB::table('employee_experiences')->insert([
                        'employee_id' => $eid,
                        'organization' => (string) ($ex['organization'] ?? ''),
                        'from_date' => $ex['from_date'] ?? null,
                        'to_date' => $ex['to_date'] ?? null,
                        'designation' => $ex['designation'] ?? null,
                        'department' => $ex['department'] ?? null,
                        'address' => $ex['address'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $trainings = is_array($validated['trainings'] ?? null) ? $validated['trainings'] : [];
                foreach ($trainings as $tr) {
                    DB::table('employee_trainings')->insert([
                        'employee_id' => $eid,
                        'training_title' => (string) ($tr['training_title'] ?? ''),
                        'institute' => $tr['institute'] ?? null,
                        'address' => $tr['address'] ?? null,
                        'duration' => $tr['duration'] ?? null,
                        'remarks' => $tr['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            return redirect()->route('employees.index')
                ->with('success', 'Employee created (V2) successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Employee V2 save failed', [
                'action' => 'store',
                'message' => $e->getMessage(),
                'class' => $e::class,
                'request_keys' => array_keys($request->except(['photo', 'signature'])),
            ]);
            $message = $this->buildEmployeeSaveErrorMessage($e);

            return back()
                ->withInput()
                ->withErrors(['submit' => $message])
                ->with('error', $message);
        }
    }

    public function update(Request $request, Employee $employee)
    {
        try {
            $this->normalizeEmployeeRequestPayload($request);
            $this->resolveNidAndSmartCardFromRequest($request);

            $validated = $request->validate([
                'current_branch_id' => 'required|exists:branches,id',
                'employee_type_id' => 'nullable|exists:employee_types,id',
                'pin' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('pin', $employee->id)],
                'name_en' => 'required|string|max:255',
                'name_bn' => 'nullable|string|max:255',
                'gender' => 'nullable|string|max:20',
                'religion' => 'nullable|string|max:50',
                'marital_status' => 'nullable|string|max:30',
                'spouse_name' => 'nullable|string|max:255',
                'spouse_mobile' => 'nullable|string|max:20',
                'date_of_birth' => 'nullable|date',
                'blood_group' => 'nullable|string|max:10',
                'joining_date' => 'required|date',
                'confirmation_date' => 'nullable|date|after_or_equal:joining_date',
                'fathers_name' => 'nullable|string|max:255',
                'fathers_mobile' => 'nullable|string|max:20',
                'mothers_name' => 'nullable|string|max:255',
                'mothers_mobile' => 'nullable|string|max:20',
                'department_id' => 'required|exists:departments,id',
                'joining_designation_id' => 'required|exists:designations,id',
                'last_designation_id' => 'nullable|exists:designations,id',
                'program_id' => 'nullable|exists:programs,id',
                'project_id' => 'nullable|exists:projects,id',
                'nid_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('nid_number', $employee->id)],
                'smart_card_number' => ['nullable', 'string', 'max:50', $this->uniqueAmongEmployed('smart_card_number', $employee->id)],
                'tin_certificate_no' => 'nullable|string|max:50',
                'driving_license_no' => 'nullable|string|max:50',
                'passport_no' => 'nullable|string|max:50',
                'is_project_employee' => 'nullable|boolean',
                'is_custodian' => 'nullable|boolean',
                'identification_mark' => 'nullable|string|max:255',
                'email' => 'nullable|email',
                'mobile_personal' => ['required', 'string', 'max:20', $this->uniqueAmongEmployed('mobile_personal', $employee->id)],
                'mobile_official' => 'nullable|string|max:20',

                'addresses' => 'nullable|array',
                'addresses.*.type' => 'required_with:addresses|in:present,permanent',
                'addresses.*.division' => 'nullable|string|max:100',
                'addresses.*.district' => 'nullable|string|max:100',
                'addresses.*.upazila' => 'nullable|string|max:120',
                'addresses.*.union' => 'nullable|string|max:120',
                'addresses.*.village' => 'nullable|string|max:150',
                'addresses.*.address_details' => 'nullable|string',

                'educations' => 'nullable|array',
                'educations.*.degree' => 'required_with:educations|string|max:150',
                'educations.*.institute' => 'nullable|string|max:255',
                'educations.*.group_name' => 'nullable|string|max:150',
                'educations.*.board' => 'nullable|string|max:255',
                'educations.*.subject' => 'nullable|string|max:255',
                'educations.*.result_type' => 'nullable|in:gpa,cgpa,other',
                'educations.*.result_value' => 'nullable|string|max:50',

                'bank' => 'nullable|array',
                'bank.bank_name' => 'nullable|string|max:200',
                'bank.branch_name' => 'nullable|string|max:200',
                'bank.account_no' => 'nullable|string|max:80',
                'bank.account_type' => 'nullable|in:current,savings',
                'bank.bank_address' => 'nullable|string',
                'bank.remark' => 'nullable|string',

                'nominees' => 'nullable|array',
                'nominees.*.name' => 'required_with:nominees|string|max:200',
                'nominees.*.relation' => 'nullable|string|max:80',
                'nominees.*.date_of_birth' => 'nullable|date',
                'nominees.*.share' => 'nullable|numeric|min:0|max:100',
                'nominees.*.contact' => 'nullable|string|max:30',

                'guarantors' => 'nullable|array',
                'guarantors.*.name' => 'required_with:guarantors|string|max:200',
                'guarantors.*.age' => 'nullable|integer|min:0|max:150',
                'guarantors.*.occupation' => 'nullable|string|max:150',
                'guarantors.*.relation' => 'nullable|string|max:80',
                'guarantors.*.phone' => 'nullable|string|max:30',
                'guarantors.*.email' => 'nullable|email',

                'guarantor_cheques' => 'nullable|array',
                'guarantor_cheques.*.bank_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.branch_name' => 'nullable|string|max:200',
                'guarantor_cheques.*.cheque_no' => 'nullable|string|max:80',

                'collateral' => 'nullable|array',
                'collateral.has_certificate' => 'nullable|boolean',
                'collateral.certificate_levels' => 'nullable|array',
                'collateral.certificate_levels.*' => 'in:ssc,hsc,honors,masters',
                'collateral.security_amount' => 'nullable|numeric|min:0',
                'collateral.collateral_interest' => 'nullable|numeric|min:0',
                'collateral.collateral_date' => 'nullable|date',
                'collateral.notes' => 'nullable|string',

                'collateral_receive_cheques' => 'nullable|array',
                'collateral_receive_cheques.*.bank_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.branch_name' => 'nullable|string|max:200',
                'collateral_receive_cheques.*.cheque_no' => 'nullable|string|max:80',
                'collateral_receive_cheques.*.notes' => 'nullable|string',

                'assets' => 'nullable|array',
                'assets.*.serial' => 'nullable|integer|min:0',
                'assets.*.asset_no' => 'nullable|string|max:100',
                'assets.*.name' => 'required_with:assets|string|max:200',
                'assets.*.details' => 'nullable|string',
                'assets.*.provided_quality' => 'nullable|string|max:120',
                'assets.*.asset_price' => 'nullable|numeric|min:0',

                'experiences' => 'nullable|array',
                'experiences.*.organization' => 'required_with:experiences|string|max:255',
                'experiences.*.from_date' => 'nullable|date',
                'experiences.*.to_date' => 'nullable|date',
                'experiences.*.designation' => 'nullable|string|max:200',
                'experiences.*.department' => 'nullable|string|max:200',
                'experiences.*.address' => 'nullable|string',

                'trainings' => 'nullable|array',
                'trainings.*.training_title' => 'required_with:trainings|string|max:255',
                'trainings.*.institute' => 'nullable|string|max:255',
                'trainings.*.address' => 'nullable|string',
                'trainings.*.duration' => 'nullable|string|max:100',
                'trainings.*.remarks' => 'nullable|string',

                'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
                'signature' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            $employeeData = Arr::except($validated, [
                'addresses',
                'educations',
                'bank',
                'nominees',
                'guarantors',
                'guarantor_cheques',
                'collateral',
                'collateral_receive_cheques',
                'assets',
                'experiences',
                'trainings',
                'photo',
                'signature',
            ]);

            $employeeData['employee_id'] = $employeeData['pin'];
            if (empty($employeeData['last_designation_id'])) {
                $employeeData['last_designation_id'] = $employeeData['joining_designation_id'];
            }
            $employeeData['designation_id'] = $employeeData['last_designation_id'];

            $email = trim((string) ($employeeData['email'] ?? ''));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $employeeData['email'] = strtolower((string) $employeeData['pin']).'@'.$this->getAutoEmailDomain();
            }

            DB::transaction(function () use ($request, $employee, $employeeData, $validated) {
                // Photo upload (replace)
                if ($request->hasFile('photo')) {
                    if ($employee->photo) {
                        $old = public_path('storage/'.$employee->photo);
                        if (file_exists($old)) {
                            @unlink($old);
                        }
                    }
                    $photo = $request->file('photo');
                    $ext = strtolower((string) $photo->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_photos');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $photo->move($targetDir, $filename);
                    $employeeData['photo'] = 'employee_photos/'.$filename;
                }

                // Signature upload (replace)
                if ($request->hasFile('signature')) {
                    if ($employee->signature) {
                        $old = public_path('storage/'.$employee->signature);
                        if (file_exists($old)) {
                            @unlink($old);
                        }
                    }
                    $sig = $request->file('signature');
                    $ext = strtolower((string) $sig->getClientOriginalExtension());
                    $filename = time().'_'.uniqid().'.'.$ext;
                    $targetDir = public_path('storage/employee_signatures');
                    if (! is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                    }
                    $sig->move($targetDir, $filename);
                    $employeeData['signature'] = 'employee_signatures/'.$filename;
                }

                $employee->update($employeeData);
                $this->syncUserAccountForEmployeeV2($employee->fresh(), (string) $employeeData['pin']);

                $eid = $employee->id;

                DB::table('employee_addresses')->where('employee_id', $eid)->delete();
                DB::table('employee_educations')->where('employee_id', $eid)->delete();
                DB::table('employee_bank_accounts')->where('employee_id', $eid)->delete();
                DB::table('employee_nominees')->where('employee_id', $eid)->delete();
                DB::table('employee_guarantors')->where('employee_id', $eid)->delete();
                DB::table('employee_guarantor_cheques')->where('employee_id', $eid)->delete();
                DB::table('employee_collaterals')->where('employee_id', $eid)->delete();
                DB::table('employee_collateral_receive_cheques')->where('employee_id', $eid)->delete();
                DB::table('employee_assets')->where('employee_id', $eid)->delete();
                DB::table('employee_experiences')->where('employee_id', $eid)->delete();
                DB::table('employee_trainings')->where('employee_id', $eid)->delete();

                $addresses = is_array($validated['addresses'] ?? null) ? $validated['addresses'] : [];
                foreach ($addresses as $a) {
                    DB::table('employee_addresses')->insert([
                        'employee_id' => $eid,
                        'type' => $a['type'],
                        'division' => $a['division'] ?? null,
                        'district' => $a['district'] ?? null,
                        'upazila' => $a['upazila'] ?? null,
                        'union' => $a['union'] ?? null,
                        'village' => $a['village'] ?? null,
                        'address_details' => $a['address_details'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $educations = is_array($validated['educations'] ?? null) ? $validated['educations'] : [];
                foreach ($educations as $e) {
                    DB::table('employee_educations')->insert([
                        'employee_id' => $eid,
                        'degree' => (string) ($e['degree'] ?? ''),
                        'institute' => $e['institute'] ?? null,
                        'group_name' => $e['group_name'] ?? null,
                        'board' => $e['board'] ?? null,
                        'subject' => $e['subject'] ?? null,
                        'result_type' => $e['result_type'] ?? null,
                        'result_value' => $e['result_value'] ?? null,
                        'passing_year' => $e['passing_year'] ?? null,
                        'remarks' => $e['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $bank = is_array($validated['bank'] ?? null) ? $validated['bank'] : null;
                if ($bank) {
                    DB::table('employee_bank_accounts')->insert([
                        'employee_id' => $eid,
                        'bank_name' => (string) ($bank['bank_name'] ?? ''),
                        'branch_name' => $bank['branch_name'] ?? null,
                        'account_no' => $bank['account_no'] ?? null,
                        'account_type' => $bank['account_type'] ?? null,
                        'bank_address' => $bank['bank_address'] ?? null,
                        'remark' => $bank['remark'] ?? null,
                        'is_primary' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $nominees = is_array($validated['nominees'] ?? null) ? $validated['nominees'] : [];
                foreach ($nominees as $n) {
                    DB::table('employee_nominees')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($n['name'] ?? ''),
                        'relation' => $n['relation'] ?? null,
                        'date_of_birth' => $n['date_of_birth'] ?? null,
                        'share' => $n['share'] ?? null,
                        'contact' => $n['contact'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantors = is_array($validated['guarantors'] ?? null) ? $validated['guarantors'] : [];
                foreach ($guarantors as $g) {
                    DB::table('employee_guarantors')->insert([
                        'employee_id' => $eid,
                        'name' => (string) ($g['name'] ?? ''),
                        'age' => $g['age'] ?? null,
                        'occupation' => $g['occupation'] ?? null,
                        'relation' => $g['relation'] ?? null,
                        'phone' => $g['phone'] ?? null,
                        'email' => $g['email'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $guarantorCheques = is_array($validated['guarantor_cheques'] ?? null) ? $validated['guarantor_cheques'] : [];
                foreach ($guarantorCheques as $c) {
                    DB::table('employee_guarantor_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_guarantor_id' => null,
                        'bank_name' => $c['bank_name'] ?? null,
                        'branch_name' => $c['branch_name'] ?? null,
                        'cheque_no' => $c['cheque_no'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $collateral = is_array($validated['collateral'] ?? null) ? $validated['collateral'] : null;
                $collateralId = null;
                if ($collateral) {
                    $collateralId = DB::table('employee_collaterals')->insertGetId([
                        'employee_id' => $eid,
                        'has_certificate' => (bool) ($collateral['has_certificate'] ?? false),
                        'certificate_levels' => isset($collateral['certificate_levels']) ? json_encode($collateral['certificate_levels']) : null,
                        'security_amount' => $collateral['security_amount'] ?? null,
                        'collateral_interest' => $collateral['collateral_interest'] ?? null,
                        'collateral_date' => $collateral['collateral_date'] ?? null,
                        'notes' => $collateral['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $receiveCheques = is_array($validated['collateral_receive_cheques'] ?? null) ? $validated['collateral_receive_cheques'] : [];
                foreach ($receiveCheques as $rc) {
                    DB::table('employee_collateral_receive_cheques')->insert([
                        'employee_id' => $eid,
                        'employee_collateral_id' => $collateralId,
                        'bank_name' => $rc['bank_name'] ?? null,
                        'branch_name' => $rc['branch_name'] ?? null,
                        'cheque_no' => $rc['cheque_no'] ?? null,
                        'notes' => $rc['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $assets = is_array($validated['assets'] ?? null) ? $validated['assets'] : [];
                foreach ($assets as $as) {
                    DB::table('employee_assets')->insert([
                        'employee_id' => $eid,
                        'serial' => $as['serial'] ?? null,
                        'asset_no' => $as['asset_no'] ?? null,
                        'name' => (string) ($as['name'] ?? ''),
                        'details' => $as['details'] ?? null,
                        'provided_quality' => $as['provided_quality'] ?? null,
                        'asset_price' => $as['asset_price'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $experiences = is_array($validated['experiences'] ?? null) ? $validated['experiences'] : [];
                foreach ($experiences as $ex) {
                    DB::table('employee_experiences')->insert([
                        'employee_id' => $eid,
                        'organization' => (string) ($ex['organization'] ?? ''),
                        'from_date' => $ex['from_date'] ?? null,
                        'to_date' => $ex['to_date'] ?? null,
                        'designation' => $ex['designation'] ?? null,
                        'department' => $ex['department'] ?? null,
                        'address' => $ex['address'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $trainings = is_array($validated['trainings'] ?? null) ? $validated['trainings'] : [];
                foreach ($trainings as $tr) {
                    DB::table('employee_trainings')->insert([
                        'employee_id' => $eid,
                        'training_title' => (string) ($tr['training_title'] ?? ''),
                        'institute' => $tr['institute'] ?? null,
                        'address' => $tr['address'] ?? null,
                        'duration' => $tr['duration'] ?? null,
                        'remarks' => $tr['remarks'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            return redirect()->route('employees.index')->with('success', 'Employee updated (V2) successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Employee V2 save failed', [
                'action' => 'update',
                'employee_id' => $employee->id,
                'message' => $e->getMessage(),
                'class' => $e::class,
            ]);
            $message = $this->buildEmployeeSaveErrorMessage($e);

            return back()
                ->withInput()
                ->withErrors(['submit' => $message])
                ->with('error', $message);
        }
    }
}
