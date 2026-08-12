<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmployeeDisciplinaryAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DisciplinaryActionController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $actionType = trim((string) $request->input('action_type', ''));
        $branchId = $request->input('branch_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = EmployeeDisciplinaryAction::query()
            ->with([
                'employee:id,pin,employee_id,name_en,name_bn,photo,designation_id,current_branch_id',
                'employee.designation:id,name',
                'employee.branch:id,name',
                'creator:id,name',
            ])
            ->orderBy('action_date', 'desc')
            ->orderBy('id', 'desc');

        if ($search !== '') {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('pin', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('name_bn', 'like', "%{$search}%");
            });
        }

        if ($actionType !== '') {
            $query->where('action_type', $actionType);
        }

        if ($branchId) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        }

        if ($dateFrom) {
            $query->whereDate('action_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('action_date', '<=', $dateTo);
        }

        $disciplinaryActions = $query->paginate(20)->withQueryString();

        $actionTypes = array_map(function ($key, $label) {
            return ['value' => $key, 'label' => $label];
        }, array_keys(EmployeeDisciplinaryAction::ACTION_TYPES), array_values(EmployeeDisciplinaryAction::ACTION_TYPES));

        $branches = Branch::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('disciplinary-actions/index', [
            'disciplinaryActions' => $disciplinaryActions,
            'actionTypes' => $actionTypes,
            'branches' => $branches,
            'filters' => [
                'search' => $search,
                'action_type' => $actionType,
                'branch_id' => $branchId ? (string) $branchId : '',
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
            ],
        ]);
    }

    public function create(Request $request)
    {
        $preselectedEmployeeId = $request->input('employee_id');

        $employees = Employee::query()
            ->with(['designation:id,name', 'branch:id,name'])
            ->orderBy('name_en')
            ->get(['id', 'pin', 'name_en', 'name_bn', 'designation_id', 'current_branch_id'])
            ->map(function ($e) {
                return [
                    'id' => $e->id,
                    'pin' => $e->pin,
                    'name_en' => $e->name_en,
                    'name_bn' => $e->name_bn,
                    'designation_name' => $e->designation?->name ?? '',
                    'branch_name' => $e->branch?->name ?? '',
                ];
            });

        $actionTypes = array_map(function ($key, $label) {
            return ['value' => $key, 'label' => $label];
        }, array_keys(EmployeeDisciplinaryAction::ACTION_TYPES), array_values(EmployeeDisciplinaryAction::ACTION_TYPES));

        return Inertia::render('disciplinary-actions/create', [
            'employees' => $employees,
            'preselectedEmployeeId' => $preselectedEmployeeId ? (string) $preselectedEmployeeId : '',
            'actionTypes' => $actionTypes,
        ]);
    }

    public function store(Request $request)
    {
        $allowedTypes = array_keys(EmployeeDisciplinaryAction::ACTION_TYPES);

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'action_type' => 'required|string|in:'.implode(',', $allowedTypes),
            'action_date' => 'required|date',
            'details' => 'nullable|string|max:2000',
        ]);

        $validated['created_by'] = Auth::id();

        $action = EmployeeDisciplinaryAction::create($validated);

        if ($request->input('redirect_to') === 'employee_show') {
            return redirect()
                ->route('employees.show', $action->employee_id)
                ->with('success', 'Disciplinary action issued successfully.');
        }

        return redirect()
            ->route('disciplinary-actions.index')
            ->with('success', 'Disciplinary action issued successfully.');
    }

    public function destroy(EmployeeDisciplinaryAction $disciplinaryAction)
    {
        $employeeId = $disciplinaryAction->employee_id;
        $disciplinaryAction->delete();

        return back()->with('success', 'Disciplinary action record deleted.');
    }
}
