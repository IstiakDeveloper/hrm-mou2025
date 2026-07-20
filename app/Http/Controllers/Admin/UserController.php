<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use App\Services\TransferCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    private const AUTO_EMAIL_DOMAIN_ENV = 'HRM_AUTO_EMAIL_DOMAIN';

    private function getAutoEmailDomain(): string
    {
        $domain = trim((string) env(self::AUTO_EMAIL_DOMAIN_ENV, 'auto.local'));

        return $domain !== '' ? $domain : 'auto.local';
    }

    private function resolveEmailForEmployee(Employee $employee): string
    {
        $email = trim((string) ($employee->email ?? ''));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $email;
        }

        $pin = trim((string) ($employee->getRawOriginal('pin') ?? $employee->getRawOriginal('employee_id') ?? ''));
        if ($pin === '') {
            return '';
        }

        return strtolower($pin).'@'.$this->getAutoEmailDomain();
    }

    private function employeeFullName(Employee $employee): string
    {
        $name = trim((string) ($employee->name_en ?? ''));
        if ($name !== '') {
            return $name;
        }

        return 'Employee '.$employee->employee_id;
    }

    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 10);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500], true)) {
            $perPage = 10;
        }

        $users = User::with('roles', 'employee', 'branch')
            ->where('account_type', 'staff')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%");
                });
            })
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('admin/users/index', [
            'users' => [
                'data' => $users->getCollection()->values()->all(),
                'meta' => [
                    'current_page' => $users->currentPage(),
                    'from' => $users->firstItem(),
                    'last_page' => $users->lastPage(),
                    'links' => $users->linkCollection()->toArray(),
                    'path' => $users->path(),
                    'per_page' => $users->perPage(),
                    'to' => $users->lastItem(),
                    'total' => $users->total(),
                ],
                'links' => [
                    'first' => $users->url(1),
                    'last' => $users->url($users->lastPage()),
                    'prev' => $users->previousPageUrl(),
                    'next' => $users->nextPageUrl(),
                ],
            ],
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function syncBranchesFromPosting(TransferCompletionService $transferCompletionService)
    {
        $synced = $transferCompletionService->syncAllUserBranchesFromPosting();

        return redirect()->route('admin.users.index')->with(
            'success',
            $synced > 0
                ? "Synced {$synced} user branch(es) from employee posting."
                : 'All user branches are already in sync.'
        );
    }

    /**
     * Show form to create a new user.
     */
    public function create()
    {
        $employees = Employee::select('id', 'employee_id', 'biometric_id', 'name_en', 'email', 'pin')->get();
        $roles = Role::all();
        $branches = Branch::all();

        return Inertia::render('admin/users/create', [
            'roles' => $roles,
            'employees' => $employees,
            'branches' => $branches,
            'autoEmailDomain' => $this->getAutoEmailDomain(),
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:4|confirmed',
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'branch_id' => 'nullable|exists:branches,id',
            'active_status' => 'boolean',
        ];

        if (! $request->filled('employee_id')) {
            $rules['username'] = 'required|string|max:191|unique:users,username';
        }

        $request->validate($rules);

        $primaryRoleId = $request->primary_role_id ?? ($request->role_ids[0] ?? null);

        if (! $primaryRoleId) {
            return back()->withErrors(['role_ids' => 'At least one role must be selected'])->withInput();
        }

        $plainPassword = $request->password;

        if ($request->filled('employee_id')) {
            $employee = Employee::findOrFail($request->employee_id);
            if ($this->resolveEmailForEmployee($employee) !== $request->email) {
                return back()->withErrors(['email' => 'The email must match the selected employee\'s email'])->withInput();
            }

            $name = $this->employeeFullName($employee);
            $resolvedUsername = $this->ensureUniqueUsername(
                $this->usernameFromEmployee($employee),
                null,
            );
            $employeeId = (int) $employee->id;
        } else {
            $name = $request->name;
            $resolvedUsername = $this->ensureUniqueUsername(trim((string) $request->username), null);
            $employeeId = null;
        }

        $user = User::create([
            'name' => $name,
            'username' => $resolvedUsername,
            'email' => $request->email,
            'password' => Hash::make($plainPassword),
            'role_id' => $primaryRoleId,
            'employee_id' => $employeeId,
            'branch_id' => $request->branch_id ?: null,
            'active_status' => $request->active_status ?? true,
        ]);

        $user->roles()->sync($request->role_ids);

        try {
            $this->sendWelcomeEmail($user, $plainPassword);

            return redirect()->route('admin.users.index')
                ->with('success', 'User created successfully and welcome email sent.');
        } catch (\Throwable $e) {
            Log::error('Failed to send welcome email after user creation.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('admin.users.index')
                ->with('warning', 'User created successfully, but welcome email could not be sent. Please check mail configuration.');
        }
    }

    /**
     * Send welcome email with login information to the new user
     */
    private function sendWelcomeEmail(User $user, string $password)
    {
        $siteUrl = config('app.url');
        $employee = $user->employee;
        $roleNames = $user->roles->pluck('name')->implode(', ');

        Mail::send(
            'emails.welcome_user',
            [
                'user' => $user,
                'employee' => $employee,
                'password' => $password,
                'siteUrl' => $siteUrl,
                'roleNames' => $roleNames,
            ],
            function ($message) use ($user) {
                $message->to($user->email, $user->name)
                    ->subject('Welcome to '.config('app.name').' - Your Account Information');
            }
        );
    }

    /**
     * Show form to edit a user.
     */
    public function edit(User $user)
    {
        $roles = Role::all();
        $employees = Employee::select('id', 'employee_id', 'biometric_id', 'name_en', 'email', 'pin')->get();
        $branches = Branch::all();

        $user->load('roles');

        return Inertia::render('admin/users/edit', [
            'user' => $user,
            'roles' => $roles,
            'employees' => $employees,
            'branches' => $branches,
            'autoEmailDomain' => $this->getAutoEmailDomain(),
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'username' => [
                'required',
                'string',
                'max:191',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:4|confirmed',
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'branch_id' => 'nullable|exists:branches,id',
            'active_status' => 'boolean',
        ];

        if ($request->has('active_status') && count($request->all()) === 1) {
            $rules = ['active_status' => 'boolean'];
        }

        if (isset($rules['username'])) {
            $request->merge([
                'username' => trim((string) ($request->input('username') ?? '')),
            ]);
        }

        $request->validate($rules);

        if ($request->has('active_status') && count($request->all()) === 1) {
            $user->active_status = $request->active_status;
            $user->save();
        } else {
            $employee = null;
            if ($request->employee_id) {
                $employee = Employee::find($request->employee_id);
                if ($employee && $this->resolveEmailForEmployee($employee) !== $request->email) {
                    return back()->withErrors(['email' => 'The email must match the selected employee\'s email'])->withInput();
                }
            }

            $user->name = $employee ? $this->employeeFullName($employee) : $request->name;
            $user->username = trim((string) $request->username);
            $user->email = $request->email;
            $user->employee_id = $request->filled('employee_id') ? $request->employee_id : null;
            $user->branch_id = $request->filled('branch_id') ? $request->branch_id : null;
            $user->active_status = $request->active_status ?? $user->active_status;

            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }

            $user->save();

            if ($request->primary_role_id) {
                $user->role_id = $request->primary_role_id;
                $user->save();
            }

            $user->roles()->sync($request->role_ids);
        }

        return redirect()->route('admin.users.index')
            ->with('success', 'User updated successfully.');
    }

    /**
     * Show bulk email form
     */
    public function bulkEmailForm()
    {
        $users = User::with('employee', 'roles', 'branch')
            ->where('active_status', true)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'employee_id' => $user->employee->employee_id ?? null,
                    'roles' => $user->roles->pluck('name')->implode(', '),
                    'branch' => $user->branch->name ?? null,
                ];
            });

        return Inertia::render('admin/users/BulkEmail', [
            'users' => $users,
        ]);
    }

    /**
     * Send bulk emails to selected users
     */
    public function sendBulkEmails(Request $request)
    {
        // Base validation rules
        $rules = [
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'email_type' => 'required|in:welcome,account_info,custom',
        ];

        // Add custom email validation only if email_type is custom
        if ($request->email_type === 'custom') {
            $rules['custom_subject'] = 'required|string|max:255';
            $rules['custom_message'] = 'required|string';
        }

        $request->validate($rules);

        $users = User::with('roles', 'employee', 'branch')
            ->whereIn('id', $request->user_ids)
            ->where('active_status', true)
            ->get();

        $emailsSent = 0;
        $failedEmails = [];

        foreach ($users as $user) {
            try {
                switch ($request->email_type) {
                    case 'welcome':
                        $this->sendBulkWelcomeEmail($user);
                        break;
                    case 'account_info':
                        $this->sendAccountInfoEmail($user);
                        break;
                    case 'custom':
                        $this->sendCustomEmail($user, $request->custom_subject, $request->custom_message);
                        break;
                }
                $emailsSent++;
            } catch (\Exception $e) {
                $failedEmails[] = $user->email;
                Log::error("Failed to send email to user {$user->id}: ".$e->getMessage());
            }
        }

        $message = "Successfully sent {$emailsSent} emails out of {$users->count()} users.";
        if (count($failedEmails) > 0) {
            $message .= ' Failed to send to: '.implode(', ', $failedEmails);
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Send bulk welcome email
     */
    private function sendBulkWelcomeEmail(User $user)
    {
        $siteUrl = config('app.url');
        $employee = $user->employee;
        $roleNames = $user->roles->pluck('name')->implode(', ');

        Mail::send(
            'emails.bulk_welcome',
            [
                'user' => $user,
                'employee' => $employee,
                'siteUrl' => $siteUrl,
                'roleNames' => $roleNames,
            ],
            function ($message) use ($user) {
                $message->to($user->email, $user->name)
                    ->subject('Welcome to '.config('app.name'));
            }
        );
    }

    /**
     * Send account info email
     */
    private function sendAccountInfoEmail(User $user)
    {
        $siteUrl = config('app.url');
        $employee = $user->employee;
        $roleNames = $user->roles->pluck('name')->implode(', ');

        Mail::send(
            'emails.account_info',
            [
                'user' => $user,
                'employee' => $employee,
                'siteUrl' => $siteUrl,
                'roleNames' => $roleNames,
            ],
            function ($message) use ($user) {
                $message->to($user->email, $user->name)
                    ->subject('Your Account Information - '.config('app.name'));
            }
        );
    }

    /**
     * Send custom email
     */
    private function sendCustomEmail(User $user, string $subject, string $message)
    {
        $siteUrl = config('app.url');
        $employee = $user->employee;

        Mail::send(
            'emails.custom_bulk',
            [
                'user' => $user,
                'employee' => $employee,
                'customMessage' => $message,
                'siteUrl' => $siteUrl,
            ],
            function ($mail) use ($user, $subject) {
                $mail->to($user->email, $user->name)
                    ->subject($subject);
            }
        );
    }

    /**
     * Login username = employee's company employee_id string as stored (e.g. "5" stays "5").
     * If empty, falls back to biometric_id, then emp_{id}.
     */
    private function usernameFromEmployee(Employee $employee): string
    {
        $primary = $employee->employee_id;
        if ($primary !== null && trim((string) $primary) !== '') {
            return Str::limit(trim((string) $primary), 191, '');
        }

        $bio = $employee->biometric_id;
        if ($bio !== null && trim((string) $bio) !== '') {
            return Str::limit(trim((string) $bio), 191, '');
        }

        return 'emp_'.$employee->id;
    }

    /**
     * Ensure username is unique (append _1, _2, … if needed).
     */
    private function ensureUniqueUsername(string $base, ?int $ignoreUserId): string
    {
        $candidate = Str::limit($base, 191, '');
        $i = 0;
        while (User::query()
            ->where('username', $candidate)
            ->when($ignoreUserId !== null, fn ($q) => $q->where('id', '!=', $ignoreUserId))
            ->exists()) {
            $i++;
            $suffix = '_'.$i;
            $candidate = Str::limit($base, max(0, 191 - strlen($suffix)), '').$suffix;
        }

        return $candidate;
    }

    /**
     * Delete the specified user.
     */
    public function destroy(User $user)
    {
        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }
}
