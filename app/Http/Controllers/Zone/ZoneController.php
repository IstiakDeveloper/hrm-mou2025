<?php

namespace App\Http\Controllers\Zone;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ZoneController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 10);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500])) {
            $perPage = 10;
        }

        $zones = Zone::query()
            ->with('zoneManager:id,employee_id,first_name,last_name')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('zone/index', [
            'zones' => $zones,
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function create()
    {
        $employees = Employee::query()
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get(['id', 'employee_id', 'first_name', 'last_name']);

        return Inertia::render('zone/create', [
            'employees' => $employees,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:zones,code',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'zone_manager_employee_id' => 'nullable|exists:employees,id',
        ]);

        Zone::create($validated);

        return redirect()->route('zones.index')->with('success', 'Zone created successfully.');
    }

    public function edit(Zone $zone)
    {
        $employees = Employee::query()
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get(['id', 'employee_id', 'first_name', 'last_name']);

        return Inertia::render('zone/edit', [
            'zone' => $zone,
            'employees' => $employees,
        ]);
    }

    public function update(Request $request, Zone $zone)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20|unique:zones,code,'.$zone->id,
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'zone_manager_employee_id' => 'nullable|exists:employees,id',
        ]);

        $zone->update($validated);

        return redirect()->route('zones.index')->with('success', 'Zone updated successfully.');
    }

    public function destroy(Zone $zone)
    {
        $zone->delete();

        return redirect()->route('zones.index')->with('success', 'Zone deleted successfully.');
    }
}
