<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\Program;
use App\Models\Project;
use App\Models\SalaryIncrement;
use App\Models\User;
use App\Services\SalaryIncrementService;
use App\Support\BangladeshDate;
use App\Support\HeadOfficeOrganogram;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryIncrementController extends Controller
{
    public function __construct(private readonly SalaryIncrementService $increments) {}

    public function index(Request $request)
    {
        $status = (string) $request->input('status', '');
        $search = trim((string) $request->input('search', ''));

        $orders = SalaryIncrement::query()
            ->with(['branch:id,name', 'creator:id,name'])
            ->withCount([
                'lines',
                'lines as grant_count' => fn ($q) => $q->where('action', 'grant'),
                'lines as stop_count' => fn ($q) => $q->where('action', 'stop'),
            ])
            ->withSum('lines as increment_total', 'increment_amount')
            ->withSum('lines as arrear_total', 'arrear_amount')
            ->when($status === 'scheduled', fn ($q) => $q->whereIn('status', SalaryIncrement::openStatuses()))
            ->when($status !== '' && $status !== 'all' && $status !== 'scheduled', fn ($q) => $q->where('status', $status))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('order_no', 'like', '%'.$search.'%')
                        ->orWhere('notes', 'like', '%'.$search.'%');
                });
            })
            ->orderByDesc('increment_date')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        /** @var User $user */
        $user = Auth::user();

        return Inertia::render('salary-increments/index', [
            'orders' => $orders,
            'filters' => [
                'status' => $status !== '' ? $status : 'all',
                'search' => $search,
            ],
            'canCreate' => $user->hasPermission('salary-increments.create'),
        ]);
    }

    public function create(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        $branchLock = $user->isBranchAccount() && $user->branch_id ? (int) $user->branch_id : null;

        $filters = [
            'branch_id' => $branchLock ? (string) $branchLock : (string) $request->input('branch_id', ''),
            'program_id' => (string) $request->input('program_id', ''),
            'project_id' => (string) $request->input('project_id', ''),
            'employee_type_id' => (string) $request->input('employee_type_id', ''),
            'order_no' => trim((string) $request->input('order_no', '')),
            'increment_date' => (string) $request->input('increment_date', BangladeshDate::todayString()),
            'effective_date' => (string) $request->input('effective_date', BangladeshDate::todayString()),
            'arrear_months' => (string) $request->input('arrear_months', '0'),
            'notes' => (string) $request->input('notes', ''),
            'searched' => $request->boolean('searched'),
        ];

        if ($filters['order_no'] === '') {
            $filters['order_no'] = $this->increments->nextOrderNo();
        }

        $preview = ['eligible' => [], 'held' => []];
        if ($filters['searched']) {
            $request->validate([
                'increment_date' => 'required|date',
                'effective_date' => 'required|date',
                'arrear_months' => 'nullable|integer|min:0|max:24',
            ]);

            $preview = $this->increments->preview(
                $filters,
                Carbon::parse($filters['effective_date']),
                $branchLock,
            );
        }

        return Inertia::render('salary-increments/create', [
            'filters' => $filters,
            'eligible' => $preview['eligible'],
            'held' => $preview['held'],
            'branches' => $this->branchOptions($branchLock),
            'programs' => Program::query()->orderBy('name')->get(['id', 'name']),
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
            'employeeTypes' => EmployeeType::query()
                ->where('probation_months', 0)
                ->orderBy('name')
                ->get(['id', 'name']),
            'branchLocked' => $branchLock !== null,
            'canRelease' => $user->hasPermission('salary-increments.edit'),
        ]);
    }

    public function store(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        $branchLock = $user->isBranchAccount() && $user->branch_id ? (int) $user->branch_id : null;

        $validated = $request->validate([
            'order_no' => 'required|string|max:50|unique:salary_increments,order_no',
            'increment_date' => 'required|date',
            'effective_date' => 'required|date',
            'arrear_months' => 'required|integer|min:0|max:24',
            'notes' => 'nullable|string|max:2000',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'program_id' => 'nullable|integer|exists:programs,id',
            'project_id' => 'nullable|integer|exists:projects,id',
            'employee_type_id' => 'nullable|integer|exists:employee_types,id',
            'lines' => 'required|array|min:1|max:2000',
            'lines.*.employee_id' => 'required|integer|exists:employees,id',
            'lines.*.action' => 'required|in:grant,stop',
            'lines.*.steps' => 'required|integer|min:0|max:30',
        ]);

        if ($branchLock) {
            $validated['branch_id'] = $branchLock;
        }

        $order = $this->increments->createOrder($validated, $validated['lines'], (int) $user->id, $branchLock);
        $order->refresh();

        $message = $order->status === SalaryIncrement::STATUS_APPLIED
            ? 'Increment order '.$order->order_no.' saved. Salary is updated.'
            : 'Increment order '.$order->order_no.' is scheduled for '.$order->effective_date?->toDateString().'. Salary updates that day.';

        return redirect()
            ->route('salary-increments.show', $order)
            ->with('success', $message);
    }

    public function show(SalaryIncrement $salaryIncrement)
    {
        $salaryIncrement->load([
            'creator:id,name',
            'rolledBackBy:id,name',
            'branch:id,name',
            'program:id,name',
            'project:id,name',
            'employeeType:id,name',
            'lines.employee:id,employee_id,name_en,name_bn,current_branch_id',
            'lines.employee.branch:id,name',
            'lines.grade:id,code,name',
        ]);
        $this->sortLinesByOrganogram($salaryIncrement);

        /** @var User $user */
        $user = Auth::user();

        return Inertia::render('salary-increments/show', [
            'order' => $this->presentOrder($salaryIncrement),
            'canRollback' => $user->hasPermission('salary-increments.edit') || $user->hasPermission('salary-increments.approve'),
            'due' => BangladeshDate::isDue($salaryIncrement->effective_date),
        ]);
    }

    public function rollback(SalaryIncrement $salaryIncrement)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('salary-increments.edit') && ! $user->hasPermission('salary-increments.approve')) {
            return redirect()->route('error.403', [
                'permission' => 'salary-increments.edit',
                'reason' => 'missing_permission',
            ]);
        }

        try {
            $this->increments->rollback($salaryIncrement, (int) $user->id);
        } catch (ValidationException $exception) {
            return back()->with('error', collect($exception->errors())->flatten()->first());
        }

        return back()->with('success', 'Increment order '.$salaryIncrement->order_no.' rolled back.');
    }

    public function releaseStop(Request $request, Employee $employee)
    {
        $this->increments->releaseStop($employee);

        return back()->with('success', trim((string) ($employee->name_en ?: $employee->employee_id)).' can be included in the next increment order.');
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function branchOptions(?int $branchLock): array
    {
        $query = Branch::query()->orderBy('name');
        if ($branchLock) {
            $query->where('id', $branchLock);
        }

        return $query->get(['id', 'name'])->map(fn (Branch $branch) => [
            'id' => (int) $branch->id,
            'name' => (string) $branch->name,
        ])->all();
    }

    private function sortLinesByOrganogram(SalaryIncrement $order): void
    {
        $ids = $order->lines->pluck('employee_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        if ($ids === []) {
            return;
        }

        $query = Employee::query()->select('employees.id')->whereIn('employees.id', $ids);
        HeadOfficeOrganogram::applyToEmployeeQuery($query);
        $rank = [];
        foreach ($query->pluck('id') as $index => $id) {
            $rank[(int) $id] = $index;
        }

        $order->setRelation(
            'lines',
            $order->lines
                ->sortBy(fn ($line) => $rank[(int) $line->employee_id] ?? PHP_INT_MAX)
                ->values(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function presentOrder(SalaryIncrement $order): array
    {
        $lines = $order->lines->map(function ($line) {
            $employee = $line->employee;
            $grade = $line->grade;

            return [
                'id' => (int) $line->id,
                'employee_id' => (int) $line->employee_id,
                'employee_code' => (string) ($employee?->employee_id ?? ''),
                'name' => trim((string) ($employee?->name_en ?: $employee?->name_bn ?: 'Employee')),
                'branch' => $employee?->branch?->name ?: '—',
                'grade' => $grade?->name ?: ($grade?->code ? strtoupper((string) $grade->code) : '—'),
                'action' => $line->action,
                'steps' => (int) $line->steps,
                'from_step' => $line->from_step_number,
                'to_step' => $line->to_step_number,
                'from_basic' => (float) $line->from_basic,
                'to_basic' => $line->to_basic !== null ? (float) $line->to_basic : null,
                'from_gross' => (float) $line->from_gross,
                'to_gross' => $line->to_gross !== null ? (float) $line->to_gross : null,
                'increment_amount' => (float) $line->increment_amount,
                'arrear_amount' => (float) $line->arrear_amount,
                'arrear_paid' => $line->arrear_payslip_id !== null,
                'status' => $line->status,
                'skip_reason' => $line->skip_reason,
            ];
        })->values()->all();

        return [
            'id' => (int) $order->id,
            'order_no' => $order->order_no,
            'increment_date' => $order->increment_date?->toDateString(),
            'effective_date' => $order->effective_date?->toDateString(),
            'arrear_months' => (int) $order->arrear_months,
            'status' => $order->status,
            'notes' => $order->notes,
            'branch' => $order->branch?->name,
            'program' => $order->program?->name,
            'project' => $order->project?->name,
            'employee_type' => $order->employeeType?->name,
            'created_by' => $order->creator?->name,
            'rolled_back_by' => $order->rolledBackBy?->name,
            'rolled_back_at' => $order->rolled_back_at?->toDateTimeString(),
            'applied_at' => $order->applied_at?->toDateTimeString(),
            'increment_total' => (float) $order->lines->sum('increment_amount'),
            'arrear_total' => (float) $order->lines->sum('arrear_amount'),
            'grant_count' => $order->lines->where('action', 'grant')->count(),
            'stop_count' => $order->lines->where('action', 'stop')->count(),
            'lines' => $lines,
        ];
    }
}
