<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\Employee;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $users = User::with('roles', 'employee', 'branch')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
            ->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show form to create a new user.
     */
    public function create()
    {
        // Include email field in the employee selection
        $employees = Employee::select('id', 'employee_id', 'first_name', 'last_name', 'email')->get();
        $roles = Role::all();
        $branches = Branch::all();

        return Inertia::render('admin/users/create', [
            'roles' => $roles,
            'employees' => $employees,
            'branches' => $branches,
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
            'employee_id' => 'required|exists:employees,id', // Changed to required
            'branch_id' => 'nullable|exists:branches,id',
            'active_status' => 'boolean',
        ]);

        // Use the first selected role as the primary role
        $primaryRoleId = $request->primary_role_id ?? ($request->role_ids[0] ?? null);

        if (!$primaryRoleId) {
            return back()->withErrors(['role_ids' => 'At least one role must be selected'])->withInput();
        }

        // Verify that employee email matches the provided email
        $employee = Employee::find($request->employee_id);
        if ($employee && $employee->email !== $request->email) {
            return back()->withErrors(['email' => 'The email must match the selected employee\'s email'])->withInput();
        }

        // Store the plain password temporarily for the email
        $plainPassword = $request->password;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($plainPassword),
            'role_id' => $primaryRoleId, // Use primary role or first selected
            'employee_id' => $request->employee_id,
            'branch_id' => $request->branch_id,
            'active_status' => $request->active_status ?? true,
        ]);

        // Sync roles
        $user->roles()->sync($request->role_ids);

        // Send welcome email with login information
        $this->sendWelcomeEmail($user, $plainPassword);

        return redirect()->route('admin.users.index')
            ->with('success', 'User created successfully and welcome email sent.');
    }

    /**
     * Send welcome email with login information to the new user
     */
    private function sendWelcomeEmail(User $user, string $password)
    {
        // Get site URL from config or environment
        $siteUrl = config('app.url');

        // Get the employee details
        $employee = $user->employee;

        // Prepare the role names
        $roleNames = $user->roles->pluck('name')->implode(', ');

        // Send email using Laravel's Mail facade
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
                    ->subject('Welcome to ' . config('app.name') . ' - Your Account Information');
            }
        );
    }

    /**
     * Show form to edit a user.
     */
    public function edit(User $user)
    {
        $roles = Role::all();
        $employees = Employee::select('id', 'employee_id', 'first_name', 'last_name', 'email')->get();
        $branches = Branch::all();

        // Load roles relationship to have access to all assigned roles
        $user->load('roles');

        return Inertia::render('admin/users/edit', [
            'user' => $user,
            'roles' => $roles,
            'employees' => $employees,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:8|confirmed',
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
            'employee_id' => 'required|exists:employees,id', // Changed to required
            'branch_id' => 'nullable|exists:branches,id',
            'active_status' => 'boolean',
        ];

        // If it's just a status update, we only validate the active_status field
        if ($request->has('active_status') && count($request->all()) === 1) {
            $rules = ['active_status' => 'boolean'];
        }

        $request->validate($rules);

        // Only update provided fields in a status-only update
        if ($request->has('active_status') && count($request->all()) === 1) {
            $user->active_status = $request->active_status;
            $user->save();
        } else {
            // Verify that employee email matches the provided email
            if ($request->employee_id) {
                $employee = Employee::find($request->employee_id);
                if ($employee && $employee->email !== $request->email) {
                    return back()->withErrors(['email' => 'The email must match the selected employee\'s email'])->withInput();
                }
            }

            $user->name = $request->name;
            $user->email = $request->email;
            $user->employee_id = $request->employee_id;
            $user->branch_id = $request->branch_id;
            $user->active_status = $request->active_status ?? $user->active_status;

            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }

            $user->save();

            // Set primary role if provided
            if ($request->primary_role_id) {
                $user->role_id = $request->primary_role_id;
                $user->save();
            }

            // Sync roles (this will remove roles not in the array and add new ones)
            $user->roles()->sync($request->role_ids);
        }

        return redirect()->route('admin.users.index')
            ->with('success', 'User updated successfully.');
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
