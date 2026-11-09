<?php

namespace App\Http\Controllers\Redesignation;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Redesignation;
use App\Models\User;
use App\Services\RedesignationApplyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RedesignationController extends Controller
{
    use PaginatesForInertia;

    public function __construct(
        private readonly RedesignationApplyService $redesignationApplyService
    ) {}

    private function generateOrderNo(): string
    {
        $prefix = 'RED-'.now()->format('Ymd').'-';
        for ($i = 0; $i < 20; $i++) {
            $candidate = $prefix.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $exists = Redesignation::query()->where('order_no', $candidate)->exists();
            if (! $exists) {
                return $candidate;
            }
        }

        return $prefix.now()->format('His');
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function activeEmployees()
    {
        return Employee::query()
            ->where('status', 'active')
            ->orderBy('employee_id')
            ->get(['id', 'employee_id', 'name_en', 'name_bn', 'department_id', 'designation_id']);
    }

    private function formOptions(): array
    {
        return [
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'designations' => Designation::query()->orderBy('name')->get(['id', 'name']),
        ];
    }

    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        $query = Redesignation::with([
            'employee',
            'fromDepartment',
            'toDepartment',
            'fromDesignation',
            'toDesignation',
        ]);

        $query->when($request->employee_id, fn ($q, $employeeId) => $q->where('employee_id', $employeeId))
            ->when($request->from_date, fn ($q, $fromDate) => $q->whereDate('effective_date', '>=', $fromDate))
            ->when($request->to_date, fn ($q, $toDate) => $q->whereDate('effective_date', '<=', $toDate))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('order_no', 'like', "%{$search}%")
                        ->orWhereHas('employee', function ($eq) use ($search) {
                            $eq->where('name_en', 'like', "%{$search}%")
                                ->orWhere('name_bn', 'like', "%{$search}%")
                                ->orWhere('employee_id', 'like', "%{$search}%")
                                ->orWhere('pin', 'like', "%{$search}%");
                        });
                });
            });

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $redesignations = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        return Inertia::render('redesignation/index', [
            'redesignations' => $redesignations,
            'employees' => $this->activeEmployees(),
            'filters' => $request->only(['employee_id', 'from_date', 'to_date', 'search', 'per_page']),
            'canCreate' => $user->hasPermission('redesignations.create'),
            'canEdit' => $user->hasPermission('redesignations.edit'),
        ]);
    }

    public function create()
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('redesignations.create')) {
            return redirect()->route('redesignations.index')
                ->with('error', 'You do not have permission to record a re designation.');
        }

        return Inertia::render('redesignation/create', array_merge($this->formOptions(), [
            'employees' => $this->activeEmployees(),
            'suggestedOrderNo' => $this->generateOrderNo(),
        ]));
    }

    public function store(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('redesignations.create')) {
            return redirect()->route('redesignations.index')
                ->with('error', 'You do not have permission to record a re designation.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'to_department_id' => 'required|exists:departments,id',
            'to_designation_id' => 'required|exists:designations,id',
            'effective_date' => 'required|date',
            'order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $employee = Employee::query()->findOrFail($request->employee_id);
        $toDepartmentId = (int) $request->input('to_department_id');
        $toDesignationId = (int) $request->input('to_designation_id');
        $this->assertChange(
            $employee->department_id,
            $toDepartmentId,
            $employee->designation_id,
            $toDesignationId,
        );

        $orderNo = trim((string) $request->input('order_no', ''));
        if ($orderNo === '') {
            $orderNo = $this->generateOrderNo();
        }

        $redesignation = DB::transaction(function () use ($request, $employee, $orderNo, $user, $toDepartmentId, $toDesignationId) {
            $redesignation = Redesignation::create([
                'employee_id' => $employee->id,
                'from_department_id' => $employee->department_id,
                'to_department_id' => $toDepartmentId,
                'from_designation_id' => $employee->designation_id,
                'to_designation_id' => $toDesignationId,
                'effective_date' => $request->effective_date,
                'order_no' => $orderNo,
                'reason' => $request->reason,
                'created_by' => $user->id,
            ]);

            $this->redesignationApplyService->apply($redesignation, $user->id);

            return $redesignation;
        });

        return redirect()->route('redesignations.show', $redesignation)
            ->with('success', 'Department and designation updated.');
    }

    public function show(Redesignation $redesignation)
    {
        /** @var User $user */
        $user = Auth::user();

        $redesignation->load([
            'employee',
            'fromDepartment',
            'toDepartment',
            'fromDesignation',
            'toDesignation',
            'creator',
        ]);

        return Inertia::render('redesignation/show', [
            'redesignation' => $redesignation,
            'canEdit' => $user->hasPermission('redesignations.edit'),
        ]);
    }

    public function edit(Redesignation $redesignation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('redesignations.edit')) {
            return redirect()->route('redesignations.show', $redesignation)
                ->with('error', 'You do not have permission to edit this re designation.');
        }

        $redesignation->load(['employee', 'fromDepartment', 'toDepartment', 'fromDesignation', 'toDesignation']);

        return Inertia::render('redesignation/edit', array_merge($this->formOptions(), [
            'redesignation' => $redesignation,
        ]));
    }

    public function update(Request $request, Redesignation $redesignation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('redesignations.edit')) {
            return redirect()->route('redesignations.show', $redesignation)
                ->with('error', 'You do not have permission to edit this re designation.');
        }

        $request->validate([
            'to_department_id' => 'required|exists:departments,id',
            'to_designation_id' => 'required|exists:designations,id',
            'effective_date' => 'required|date',
            'order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $toDepartmentId = (int) $request->input('to_department_id');
        $toDesignationId = (int) $request->input('to_designation_id');
        $this->assertChange(
            $redesignation->from_department_id,
            $toDepartmentId,
            $redesignation->from_designation_id,
            $toDesignationId,
        );

        DB::transaction(function () use ($request, $redesignation, $user, $toDepartmentId, $toDesignationId) {
            $redesignation->to_department_id = $toDepartmentId;
            $redesignation->to_designation_id = $toDesignationId;
            $redesignation->effective_date = $request->effective_date;
            $orderNo = trim((string) $request->input('order_no', ''));
            $redesignation->order_no = $orderNo !== '' ? $orderNo : $redesignation->order_no;
            $redesignation->reason = $request->reason;
            $redesignation->save();

            $this->redesignationApplyService->apply($redesignation, $user->id);
        });

        return redirect()->route('redesignations.show', $redesignation)
            ->with('success', 'Re designation updated.');
    }

    private function assertChange(mixed $fromDepartmentId, int $toDepartmentId, mixed $fromDesignationId, int $toDesignationId): void
    {
        $sameDepartment = (int) $fromDepartmentId === $toDepartmentId;
        $sameDesignation = (int) $fromDesignationId === $toDesignationId;

        if ($sameDepartment && $sameDesignation) {
            throw ValidationException::withMessages([
                'to_designation_id' => 'Change the department or the designation.',
            ]);
        }
    }
}
