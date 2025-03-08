<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeaveTypeController extends Controller
{
    /**
     * Display a listing of leave types.
     */
    public function index(Request $request)
    {
        $leaveTypes = LeaveType::when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('leave/types/index', [
            'leaveTypes' => $leaveTypes,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show form to create a new leave type.
     */
    public function create()
    {
        return Inertia::render('leave/types/create');
    }

    /**
     * Store a newly created leave type.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:leave_types',
            'days_allowed' => 'required|integer|min:0',
            'is_paid' => 'required|boolean',
            'description' => 'nullable|string',
            'carry_forward' => 'required|boolean',
        ]);

        LeaveType::create($request->all());

        return redirect()->route('leave.types.index')
            ->with('success', 'Leave type created successfully.');
    }

    /**
     * Show form to edit a leave type.
     */
    public function edit(LeaveType $leaveType)
    {
        return Inertia::render('leave/types/edit', [
            'leaveType' => $leaveType,
        ]);
    }

    /**
     * Update the specified leave type.
     */
    public function update(Request $request, LeaveType $leaveType)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:leave_types,name,' . $leaveType->id,
            'days_allowed' => 'required|integer|min:0',
            'is_paid' => 'required|boolean',
            'description' => 'nullable|string',
            'carry_forward' => 'required|boolean',
        ]);

        $leaveType->update($request->all());

        return redirect()->route('leave.types.index')
            ->with('success', 'Leave type updated successfully.');
    }

    /**
     * Delete the specified leave type.
     */
    public function destroy(LeaveType $leaveType)
    {
        // Check if leave type has applications
        $applicationCount = $leaveType->leaveApplications()->count();
        if ($applicationCount > 0) {
            return redirect()->route('leave.types.index')
                ->with('error', 'Cannot delete leave type that has applications.');
        }

        // Check if leave type has balances
        $balanceCount = $leaveType->leaveBalances()->count();
        if ($balanceCount > 0) {
            return redirect()->route('leave.types.index')
                ->with('error', 'Cannot delete leave type that has balances.');
        }

        $leaveType->delete();

        return redirect()->route('leave.types.index')
            ->with('success', 'Leave type deleted successfully.');
    }
}
