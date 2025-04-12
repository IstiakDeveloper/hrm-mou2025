<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class EmployeeLeaveController extends Controller
{
    /**
     * Display a listing of the employee's leaves.
     */
    public function index(Request $request, Employee $employee)
    {
        // Load employee with basic relationships
        $employee->load(['department', 'designation']);

        // Get leave balances for current year
        $currentYear = date('Y');
        $leaveBalances = $employee->leaveBalances()
            ->where('year', $currentYear)
            ->with('leaveType')
            ->get();

        // Get all leave types (for filtering)
        $leaveTypes = LeaveType::all();

        // Date filters from request
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $status = $request->input('status');
        $leaveTypeId = $request->input('leave_type_id');

        // Base query
        $query = $employee->leaveApplications()
            ->with(['leaveType', 'approvedBy']);

        // Apply date filters if present
        if ($startDate) {
            $query->where('start_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('end_date', '<=', $endDate);
        }

        // Apply status filter if present
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        // Apply leave type filter if present
        if ($leaveTypeId && $leaveTypeId !== 'all') {
            $query->where('leave_type_id', $leaveTypeId);
        }

        // Get leave applications with pagination
        $leaveApplications = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('employee/leaves/index', [
            'employee' => $employee,
            'leaveBalances' => $leaveBalances,
            'leaveTypes' => $leaveTypes,
            'leaveApplications' => $leaveApplications,
            'currentYear' => $currentYear,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => $status,
                'leave_type_id' => $leaveTypeId,
            ],
        ]);
    }

    /**
     * Generate PDF report of leave applications
     */
    public function downloadPdf(Request $request, Employee $employee)
    {
        // Date filters from request
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $status = $request->input('status');
        $leaveTypeId = $request->input('leave_type_id');

        // Load employee with relationships
        $employee->load(['department', 'designation']);

        // Base query
        $query = $employee->leaveApplications()
            ->with(['leaveType', 'approvedBy']);

        // Apply date filters if present
        if ($startDate) {
            $query->where('start_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('end_date', '<=', $endDate);
        }

        // Apply status filter if present
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        // Apply leave type filter if present
        if ($leaveTypeId && $leaveTypeId !== 'all') {
            $query->where('leave_type_id', $leaveTypeId);
        }

        // Get leave applications
        $leaveApplications = $query->orderBy('start_date', 'desc')->get();

        // Format date range for filename
        $fileStartDate = $startDate ? Carbon::parse($startDate)->format('Y-m-d') : 'all';
        $fileEndDate = $endDate ? Carbon::parse($endDate)->format('Y-m-d') : 'all';
        $filename = "leave_report_{$employee->employee_id}_{$fileStartDate}_to_{$fileEndDate}.pdf";

        // Generate PDF
        $pdf = PDF::loadView('pdf.employee-leaves', [
            'employee' => $employee,
            'leaveApplications' => $leaveApplications,
            'startDate' => $startDate ? Carbon::parse($startDate)->format('d M, Y') : 'All Time',
            'endDate' => $endDate ? Carbon::parse($endDate)->format('d M, Y') : 'Present',
            'status' => $status ? ucfirst($status) : 'All',
            'generatedAt' => Carbon::now()->format('d M, Y H:i')
        ]);

        return $pdf->download($filename);
    }
}
