<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\EmployeeType;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeTypeController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100, 200, 500]) ? $perPage : 10;

        $types = EmployeeType::query()
            ->when($request->search, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('organization/employee-types/index', [
            'employeeTypes' => $types,
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function create()
    {
        return Inertia::render('organization/employee-types/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:employee_types,name',
            'probation_months' => 'required|integer|min:0|max:120',
            'is_active' => 'boolean',
        ]);

        EmployeeType::create([
            'name' => $validated['name'],
            'probation_months' => (int) $validated['probation_months'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('employee-types.index')->with('success', 'Employee type created.');
    }

    public function edit(EmployeeType $employee_type)
    {
        return Inertia::render('organization/employee-types/edit', [
            'employeeType' => [
                'id' => $employee_type->id,
                'name' => $employee_type->name,
                'probation_months' => (int) $employee_type->probation_months,
                'is_active' => (bool) $employee_type->is_active,
            ],
        ]);
    }

    public function update(Request $request, EmployeeType $employee_type)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:employee_types,name,'.$employee_type->id,
            'probation_months' => 'required|integer|min:0|max:120',
            'is_active' => 'boolean',
        ]);

        $employee_type->update([
            'name' => $validated['name'],
            'probation_months' => (int) $validated['probation_months'],
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('employee-types.index')->with('success', 'Employee type updated.');
    }

    public function destroy(EmployeeType $employee_type)
    {
        try {
            $employee_type->delete();
        } catch (QueryException) {
            return redirect()->route('employee-types.index')->with('error', 'Cannot delete: this type is still linked to employees.');
        }

        return redirect()->route('employee-types.index')->with('success', 'Employee type deleted.');
    }
}
