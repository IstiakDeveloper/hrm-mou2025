<?php

namespace App\Http\Controllers\Transfer;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Transfer;
use App\Services\TransferCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TransferController extends Controller
{
    use PaginatesForInertia;

    public function __construct(
        private readonly TransferCompletionService $transferCompletionService
    ) {}

    private function generateTransferOrderNo(): string
    {
        $prefix = 'TRF-'.now()->format('Ymd').'-';
        for ($i = 0; $i < 20; $i++) {
            $candidate = $prefix.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $exists = Transfer::query()->where('transfer_order_no', $candidate)->exists();
            if (! $exists) {
                return $candidate;
            }
        }

        return $prefix.now()->format('His');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createApprovedTransfer(array $data, $user): Transfer
    {
        $employee = Employee::findOrFail($data['employee_id']);

        $orderNo = trim((string) ($data['transfer_order_no'] ?? ''));
        if ($orderNo === '') {
            $orderNo = $this->generateTransferOrderNo();
        }

        $transfer = Transfer::create([
            'employee_id' => $data['employee_id'],
            'from_branch_id' => $data['from_branch_id'] ?? $employee->current_branch_id,
            'to_branch_id' => $data['to_branch_id'],
            'from_department_id' => $data['from_department_id'] ?? $employee->department_id,
            'to_department_id' => $data['to_department_id'] ?? null,
            'from_designation_id' => $data['from_designation_id'] ?? $employee->designation_id,
            'to_designation_id' => $data['to_designation_id'] ?? null,
            'effective_date' => $data['effective_date'],
            'transfer_order_no' => $orderNo,
            'reason' => $data['reason'],
            'status' => 'approved',
            'approved_by' => $user->id,
        ]);

        if ($this->transferCompletionService->shouldApplyImmediately($transfer->effective_date)) {
            $this->transferCompletionService->apply($transfer, $user->id);
        }

        return $transfer;
    }
    /**
     * Display a listing of transfers.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Transfer::with([
            'employee.department',
            'employee.designation',
            'fromBranch',
            'toBranch',
            'fromDepartment',
            'toDepartment',
            'fromDesignation',
            'toDesignation',
            'approver',
        ]);

        // If user is not an admin, filter by relevant transfers
        if (! $user->hasPermission('transfers.view')) {
            if ($user->employee) {
                // Regular employee can only see their own transfers
                $query->where('employee_id', $user->employee->id);
            } elseif ($user->hasPermission('transfers.approve')) {
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
            ->when($request->from_branch_id, function ($query, $branchId) {
                $query->where('from_branch_id', $branchId);
            })
            ->when($request->to_branch_id, function ($query, $branchId) {
                $query->where('to_branch_id', $branchId);
            })
            ->when($request->from_date, function ($query, $fromDate) {
                $query->where('effective_date', '>=', $fromDate);
            })
            ->when($request->to_date, function ($query, $toDate) {
                $query->where('effective_date', '<=', $toDate);
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $transfers = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        $departments = Department::all();
        $branches = Branch::query()->active()->orderBy('name')->get();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('transfer/index', [
            'transfers' => $transfers,
            'departments' => $departments,
            'branches' => $branches,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'from_branch_id', 'to_branch_id', 'from_date', 'to_date', 'search', 'per_page']),
            'canApprove' => $user->hasPermission('transfers.approve'),
            'canViewTransferReport' => $user->hasPermission('reports.view') && $user->hasPermission('transfers.view'),
        ]);
    }

    /**
     * Show form to create a new transfer.
     */
    public function create()
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.create')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to create transfer requests.');
        }

        return Inertia::render('transfer/create', $this->transferFormPayload());
    }

    /**
     * Show form to create multiple transfers at once.
     */
    public function bulkCreate()
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.create')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to create transfer requests.');
        }

        return Inertia::render('transfer/bulk', $this->transferFormPayload());
    }

    /**
     * @return array<string, mixed>
     */
    private function transferFormPayload(): array
    {
        return [
            'employees' => Employee::query()
                ->where('status', 'active')
                ->with(['department', 'designation'])
                ->orderBy('employee_id')
                ->get(),
            'branches' => Branch::query()->active()->orderBy('name')->get(),
            'departments' => Department::all(),
            'designations' => Designation::all(),
            'suggestedOrderNo' => $this->generateTransferOrderNo(),
        ];
    }

    /**
     * Store a newly created transfer.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.create')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to create transfer requests.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_branch_id' => 'required|exists:branches,id',
            'to_branch_id' => ['required', Rule::exists('branches', 'id')->where(fn ($q) => $q->where('is_active', true)), 'different:from_branch_id'],
            'from_department_id' => 'nullable|exists:departments,id',
            'to_department_id' => 'nullable|exists:departments,id',
            'from_designation_id' => 'nullable|exists:designations,id',
            'to_designation_id' => 'nullable|exists:designations,id',
            // HR may record back-dated transfers; approval applies immediately in our workflow.
            'effective_date' => 'required|date',
            'transfer_order_no' => 'nullable|string|max:50',
            'reason' => 'required|string',
        ]);

        DB::transaction(function () use ($request, $user) {
            $this->createApprovedTransfer($request->all(), $user);
        });

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer created successfully.');
    }

    /**
     * Store multiple transfer requests in one submission.
     */
    public function storeBulk(Request $request)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.create')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to create transfer requests.');
        }

        $validated = $request->validate([
            'reason' => 'required|string',
            'rows' => 'required|array|min:1',
            'rows.*.employee_id' => 'required|exists:employees,id|distinct',
            'rows.*.to_branch_id' => ['required', Rule::exists('branches', 'id')->where(fn ($q) => $q->where('is_active', true))],
            'rows.*.effective_date' => 'required|date',
            'rows.*.transfer_order_no' => 'nullable|string|max:50',
            'rows.*.to_department_id' => 'nullable|exists:departments,id',
            'rows.*.to_designation_id' => 'nullable|exists:designations,id',
        ]);

        $employeeIds = collect($validated['rows'])->pluck('employee_id')->all();
        $employees = Employee::query()->whereIn('id', $employeeIds)->get()->keyBy('id');

        foreach ($validated['rows'] as $index => $row) {
            $employee = $employees->get($row['employee_id']);
            if (! $employee) {
                continue;
            }

            $fromBranchId = $employee->current_branch_id;
            if (! $fromBranchId) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    "rows.{$index}.employee_id" => 'Employee does not have a current branch.',
                ]);
            }

            if ((int) $fromBranchId === (int) $row['to_branch_id']) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    "rows.{$index}.to_branch_id" => 'Destination branch must be different from current branch.',
                ]);
            }
        }

        $createdCount = 0;

        DB::transaction(function () use ($validated, $employees, $user, &$createdCount) {
            foreach ($validated['rows'] as $row) {
                $employee = $employees->get($row['employee_id']);
                if (! $employee) {
                    continue;
                }

                $this->createApprovedTransfer([
                    'employee_id' => $employee->id,
                    'from_branch_id' => $employee->current_branch_id,
                    'to_branch_id' => $row['to_branch_id'],
                    'from_department_id' => $employee->department_id,
                    'to_department_id' => $row['to_department_id'] ?? null,
                    'from_designation_id' => $employee->designation_id,
                    'to_designation_id' => $row['to_designation_id'] ?? null,
                    'effective_date' => $row['effective_date'],
                    'transfer_order_no' => $row['transfer_order_no'] ?? null,
                    'reason' => $validated['reason'],
                ], $user);

                $createdCount++;
            }
        });

        return redirect()->route('transfers.index')
            ->with('success', "{$createdCount} transfer(s) created successfully.");
    }

    /**
     * Display the specified transfer.
     */
    public function show(Transfer $transfer)
    {
        $transfer->load([
            'employee.department',
            'employee.designation',
            'fromBranch',
            'toBranch',
            'fromDepartment',
            'toDepartment',
            'fromDesignation',
            'toDesignation',
            'approver',
        ]);

        $user = Auth::user();
        $canApprove = $user->hasPermission('transfers.approve');

        return Inertia::render('transfer/show', [
            'transfer' => $transfer,
            'canApprove' => $canApprove,
        ]);
    }

    /**
     * Show form to edit a transfer.
     */
    public function edit(Transfer $transfer)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to edit transfer requests.');
        }

        if (! in_array($transfer->status, ['pending', 'approved'], true)) {
            return redirect()->route('transfers.index')
                ->with('error', 'Only pending or scheduled transfer requests can be edited.');
        }

        $employees = Employee::where('status', 'active')->get();
        $branches = Branch::query()->active()->orderBy('name')->get();
        $departments = Department::all();
        $designations = Designation::all();

        return Inertia::render('transfer/edit', [
            'transfer' => $transfer,
            'employees' => $employees,
            'branches' => $branches,
            'departments' => $departments,
            'designations' => $designations,
        ]);
    }

    /**
     * Update the specified transfer.
     */
    public function update(Request $request, Transfer $transfer)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to update transfer requests.');
        }

        if (! in_array($transfer->status, ['pending', 'approved'], true)) {
            return redirect()->route('transfers.index')
                ->with('error', 'Only pending or scheduled transfer requests can be updated.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_branch_id' => 'required|exists:branches,id',
            'to_branch_id' => ['required', Rule::exists('branches', 'id')->where(fn ($q) => $q->where('is_active', true)), 'different:from_branch_id'],
            'from_department_id' => 'nullable|exists:departments,id',
            'to_department_id' => 'nullable|exists:departments,id',
            'from_designation_id' => 'nullable|exists:designations,id',
            'to_designation_id' => 'nullable|exists:designations,id',
            'effective_date' => 'required|date',
            'transfer_order_no' => 'nullable|string|max:50',
            'reason' => 'required|string',
        ]);

        // Update transfer; re-evaluate completion when effective date changes.
        DB::transaction(function () use ($request, $transfer, $user) {
            $transfer->update($request->all());

            if ($transfer->status === 'approved'
                && $this->transferCompletionService->shouldApplyImmediately($transfer->effective_date)) {
                $this->transferCompletionService->apply($transfer, $user->id);
            }
        });

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request updated successfully.');
    }

    /**
     * Cancel the specified transfer.
     */
    public function cancel(Transfer $transfer)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to cancel transfer requests.');
        }

        if (! in_array($transfer->status, ['pending', 'approved'], true)) {
            return redirect()->route('transfers.index')
                ->with('error', 'Only pending or scheduled transfer requests can be cancelled.');
        }

        $transfer->status = 'cancelled';
        $transfer->save();

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request cancelled successfully.');
    }

    /**
     * Approve the specified transfer.
     */
    public function approve(Request $request, Transfer $transfer)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.approve')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to approve transfer requests.');
        }

        if ($transfer->status !== 'pending') {
            return redirect()->route('transfers.index')
                ->with('error', 'This transfer request is not pending approval.');
        }

        DB::transaction(function () use ($transfer, $user) {
            $transfer->status = 'approved';
            $transfer->approved_by = $user->id;
            $transfer->save();

            if ($this->transferCompletionService->shouldApplyImmediately($transfer->effective_date)) {
                $this->transferCompletionService->apply($transfer, $user->id);
            }
        });

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request approved successfully.');
    }

    /**
     * Reject the specified transfer.
     */
    public function reject(Request $request, Transfer $transfer)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.approve')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to reject transfer requests.');
        }

        if ($transfer->status !== 'pending') {
            return redirect()->route('transfers.index')
                ->with('error', 'This transfer request is not pending approval.');
        }

        $request->validate([
            'reason' => 'required|string',
        ]);

        // Update transfer
        $transfer->status = 'rejected';
        $transfer->approved_by = $user->id;
        $transfer->reason = $request->reason;
        $transfer->save();

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request rejected successfully.');
    }

    /**
     * Complete the specified transfer.
     */
    public function complete(Transfer $transfer)
    {
        $user = Auth::user();

        if (! $user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to complete transfer requests.');
        }

        if ($transfer->status !== 'approved') {
            return redirect()->route('transfers.index')
                ->with('error', 'Only approved transfer requests can be completed.');
        }

        DB::transaction(function () use ($transfer, $user) {
            $this->transferCompletionService->apply($transfer, $user->id);
        });

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer completed successfully.');
    }
}
