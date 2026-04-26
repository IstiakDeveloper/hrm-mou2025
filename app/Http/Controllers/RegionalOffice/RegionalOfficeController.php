<?php

namespace App\Http\Controllers\RegionalOffice;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RegionalOfficeController extends Controller
{
    public function index(Request $request)
    {
        $regionalOffices = RegionalOffice::query()
            ->with([
                'zone:id,name,code',
                'regionalManager:id,employee_id,first_name,last_name',
            ])
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->when($request->zone_id, function ($query, $zoneId) {
                $query->where('zone_id', $zoneId);
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        $zones = Zone::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('regional-office/index', [
            'regionalOffices' => $regionalOffices,
            'zones' => $zones,
            'filters' => $request->only(['search', 'zone_id']),
        ]);
    }

    public function create()
    {
        $zones = Zone::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $employees = Employee::query()
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get(['id', 'employee_id', 'first_name', 'last_name']);

        return Inertia::render('regional-office/create', [
            'zones' => $zones,
            'employees' => $employees,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:regional_offices,code',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'regional_manager_employee_id' => 'nullable|exists:employees,id',
        ]);

        RegionalOffice::create($validated);

        return redirect()->route('regional-offices.index')->with('success', 'Regional Office created successfully.');
    }

    public function edit(RegionalOffice $regionalOffice)
    {
        $zones = Zone::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $employees = Employee::query()
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get(['id', 'employee_id', 'first_name', 'last_name']);

        return Inertia::render('regional-office/edit', [
            'regionalOffice' => $regionalOffice,
            'zones' => $zones,
            'employees' => $employees,
        ]);
    }

    public function update(Request $request, RegionalOffice $regionalOffice)
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:regional_offices,code,'.$regionalOffice->id,
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'regional_manager_employee_id' => 'nullable|exists:employees,id',
        ]);

        $regionalOffice->update($validated);

        return redirect()->route('regional-offices.index')->with('success', 'Regional Office updated successfully.');
    }

    public function destroy(RegionalOffice $regionalOffice)
    {
        $regionalOffice->delete();

        return redirect()->route('regional-offices.index')->with('success', 'Regional Office deleted successfully.');
    }
}

