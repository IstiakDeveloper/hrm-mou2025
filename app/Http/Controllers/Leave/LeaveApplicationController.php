<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveApproval;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class LeaveApplicationController extends Controller
{
    /**
     * Display a listing of leave applications.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = LeaveApplication::with(['employee.department', 'employee.designation', 'leaveType', 'approver']);

        // If user is not an admin, filter by relevant leaves
        if (!$user->hasPermission('leaves.view')) {
            if ($user->employee) {
                // Regular employee can only see their own applications
                $query->where('employee_id', $user->employee->id);
            } elseif ($user->hasPermission('leaves.approve')) {
                // User with approval permission but no employee record (like branch admin)
                $query->where('status', 'pending');
            }
        }

        $query->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            })
            ->when($request->from_date, function ($query, $fromDate) {
                $query->where('start_date', '>=', $fromDate);
            })
            ->when($request->to_date, function ($query, $toDate) {
                $query->where('end_date', '<=', $toDate);
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        $applications = $query->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        $departments = Department::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('leave/applications/index', [
            'applications' => $applications,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'from_date', 'to_date', 'search']),
            'canApprove' => $user->hasPermission('leaves.approve'),
        ]);
    }

    /**
     * Show form to create a new leave application.
     */
    public function create()
    {
        $user = Auth::user();
        $employee = $user->employee;

        if (!$employee) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You must be associated with an employee record to apply for leave.');
        }

        $leaveTypes = LeaveType::all();
        $balances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', Carbon::now()->year)
            ->with('leaveType')
            ->get();

        return Inertia::render('leave/applications/create', [
            'employee' => $employee,
            'leaveTypes' => $leaveTypes,
            'balances' => $balances,
        ]);
    }

    /**
     * Store a newly created leave application.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $employee = $user->employee;

        if (!$employee) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You must be associated with an employee record to apply for leave.');
        }

        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string',
            'documents' => 'nullable|array',
            'documents.*' => 'file|mimes:jpeg,png,jpg,pdf,doc,docx|max:2048',
        ]);

        // Calculate number of days
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $days = $endDate->diffInDays($startDate) + 1;

        // Check leave balance
        $currentYear = Carbon::now()->year;
        $balance = LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_type_id', $request->leave_type_id)
            ->where('year', $currentYear)
            ->first();

        if (!$balance) {
            return redirect()->back()->withErrors([
                'leave_type_id' => 'You do not have a leave balance for this leave type.',
            ]);
        }

        if ($balance->remaining_days < $days) {
            return redirect()->back()->withErrors([
                'leave_type_id' => 'You do not have enough leave balance. Available: ' . $balance->remaining_days . ' days.',
            ]);
        }

        // Handle document uploads
        $documents = [];
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $path = $file->store('leave_documents', 'public');
                $documents[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'type' => $file->getClientMimeType(),
                ];
            }
        }

        LeaveApplication::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'days' => $days,
            'reason' => $request->reason,
            'status' => 'pending',
            'applied_at' => now(),
            'documents' => !empty($documents) ? json_encode($documents) : null,
        ]);

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application submitted successfully.');
    }

    /**
     * Display the specified leave application.
     */
    public function show(LeaveApplication $application)
    {
        $application->load(['employee.department', 'employee.designation', 'leaveType', 'approver', 'approvals.approver']);
        $application->documents = json_decode($application->documents, true);

        $user = Auth::user();
        $canApprove = $user->hasPermission('leaves.approve');

        return Inertia::render('leave/applications/show', [
            'application' => $application,
            'canApprove' => $canApprove,
        ]);
    }

    /**
     * Cancel the specified leave application.
     */
    public function cancel(LeaveApplication $application)
    {
        $user = Auth::user();
        $employee = $user->employee;

        if (!$employee || $employee->id !== $application->employee_id) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You can only cancel your own leave applications.');
        }

        if ($application->status !== 'pending') {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You can only cancel pending leave applications.');
        }

        $application->status = 'cancelled';
        $application->save();

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application cancelled successfully.');
    }

    /**
     * Approve the specified leave application.
     */
    public function approve(Request $request, LeaveApplication $application)
    {
        $user = Auth::user();

        if (!$user->hasPermission('leaves.approve')) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to approve leave applications.');
        }

        if ($application->status !== 'pending') {
            return redirect()->route('leave.applications.index')
                ->with('error', 'This leave application is not pending approval.');
        }

        $request->validate([
            'comments' => 'nullable|string',
        ]);

        // Update leave application
        $application->status = 'approved';
        $application->approved_by = $user->id;
        $application->save();

        // Create approval record
        LeaveApproval::create([
            'leave_application_id' => $application->id,
            'approved_by' => $user->id,
            'level' => 1,
            'status' => 'approved',
            'comments' => $request->comments,
            'approved_at' => now(),
        ]);

        // Update leave balance
        $currentYear = Carbon::now()->year;
        $balance = LeaveBalance::where('employee_id', $application->employee_id)
            ->where('leave_type_id', $application->leave_type_id)
            ->where('year', $currentYear)
            ->first();

        if ($balance) {
            $balance->used_days += $application->days;
            $balance->remaining_days = $balance->allocated_days - $balance->used_days;
            $balance->save();
        }

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application approved successfully.');
    }
    /**
     * Reject the specified leave application.
     */
    public function reject(Request $request, LeaveApplication $application)
    {
        $user = Auth::user();

        if (!$user->hasPermission('leaves.approve')) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to reject leave applications.');
        }

        if ($application->status !== 'pending') {
            return redirect()->route('leave.applications.index')
                ->with('error', 'This leave application is not pending approval.');
        }

        $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        // Update leave application
        $application->status = 'rejected';
        $application->approved_by = $user->id;
        $application->rejection_reason = $request->rejection_reason;
        $application->save();

        // Create approval record
        LeaveApproval::create([
            'leave_application_id' => $application->id,
            'approved_by' => $user->id,
            'level' => 1,
            'status' => 'rejected',
            'comments' => $request->rejection_reason,
            'approved_at' => now(),
        ]);

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application rejected successfully.');
    }

    /**
     * Download a leave application document.
     */
    public function downloadDocument(LeaveApplication $application, $index)
    {
        $documents = json_decode($application->documents, true);

        if (!isset($documents[$index])) {
            abort(404);
        }

        $document = $documents[$index];
        return response()->download(storage_path('app/public/' . $document['path']), $document['name']);
    }

    /**
     * Display leave application report.
     */
    public function report(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = LeaveApplication::with(['employee.department', 'employee.designation', 'leaveType'])
            ->whereBetween('start_date', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->leave_type_id, function ($query, $leaveTypeId) {
                $query->where('leave_type_id', $leaveTypeId);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $applications = $query->orderBy('start_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics
        $summary = [
            'total' => $query->count(),
            'approved' => $query->where('status', 'approved')->count(),
            'rejected' => $query->where('status', 'rejected')->count(),
            'pending' => $query->where('status', 'pending')->count(),
            'totalDays' => $query->sum('days'),
        ];

        $departments = Department::all();
        $leaveTypes = LeaveType::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('leave/applications/report', props: [
            'applications' => $applications,
            'departments' => $departments,
            'leaveTypes' => $leaveTypes,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'status', 'department_id', 'leave_type_id', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
        ]);
    }

}
