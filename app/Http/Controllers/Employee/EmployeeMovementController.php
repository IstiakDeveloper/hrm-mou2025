<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Movement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class EmployeeMovementController extends Controller
{
    /**
     * Display a listing of the employee's movements.
     */
    public function index(Request $request, Employee $employee)
    {
        // Load employee with basic relationships
        $employee->load(['department', 'designation']);

        // Get filters from request
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $status = $request->input('status');
        $type = $request->input('type');

        // Base query
        $query = $employee->movements()
            ->with('approvedBy');

        // Apply date filters if present
        if ($startDate) {
            $query->where('from_datetime', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('to_datetime', '<=', $endDate);
        }

        // Apply status filter if present
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        // Apply movement type filter if present
        if ($type && $type !== 'all') {
            $query->where('movement_type', $type);
        }

        // Get movements with pagination
        $movements = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('employee/movements/index', [
            'employee' => $employee,
            'movements' => $movements,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => $status,
                'type' => $type,
            ],
        ]);
    }

    /**
     * Generate PDF report of movements
     */
    public function downloadPdf(Request $request, Employee $employee)
    {
        // Get filters from request
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $status = $request->input('status');
        $type = $request->input('type');

        // Load employee with relationships
        $employee->load(['department', 'designation']);

        // Base query
        $query = $employee->movements()
            ->with('approvedBy');

        // Apply date filters if present
        if ($startDate) {
            $query->where('from_datetime', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('to_datetime', '<=', $endDate);
        }

        // Apply status filter if present
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        // Apply movement type filter if present
        if ($type && $type !== 'all') {
            $query->where('movement_type', $type);
        }

        // Get movements
        $movements = $query->orderBy('from_datetime', 'desc')->get();

        // Format date range for filename
        $fileStartDate = $startDate ? Carbon::parse($startDate)->format('Y-m-d') : 'all';
        $fileEndDate = $endDate ? Carbon::parse($endDate)->format('Y-m-d') : 'all';
        $filename = "movement_report_{$employee->employee_id}_{$fileStartDate}_to_{$fileEndDate}.pdf";

        // Generate PDF
        $pdf = PDF::loadView('pdf.employee-movements', [
            'employee' => $employee,
            'movements' => $movements,
            'startDate' => $startDate ? Carbon::parse($startDate)->format('d M, Y') : 'All Time',
            'endDate' => $endDate ? Carbon::parse($endDate)->format('d M, Y') : 'Present',
            'status' => $status ? ucfirst($status) : 'All',
            'type' => $type ? ucfirst($type) : 'All Types',
            'generatedAt' => Carbon::now()->format('d M, Y H:i')
        ]);

        return $pdf->download($filename);
    }
}
