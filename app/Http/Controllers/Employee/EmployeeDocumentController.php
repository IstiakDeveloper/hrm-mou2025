<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class EmployeeDocumentController extends Controller
{
    /**
     * Display a listing of employee documents.
     */
    public function index(Employee $employee)
    {
        $documents = EmployeeDocument::where('employee_id', $employee->id)
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('employee/documents/index', [
            'employee' => $employee,
            'documents' => $documents,
        ]);
    }

    /**
     * Show form to upload a new document.
     */
    public function create(Employee $employee)
    {
        return Inertia::render('employee/documents/create', [
            'employee' => $employee,
            'documentTypes' => [
                'national_id', 'passport', 'driving_license', 'education',
                'certificate', 'contract', 'other'
            ],
        ]);
    }

    /**
     * Store a newly created document.
     */
    public function store(Request $request, Employee $employee)
    {
        $request->validate([
            'document_type' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'file' => 'required|file|mimes:jpeg,png,jpg,pdf,doc,docx|max:5120',
            'description' => 'nullable|string',
            'expiry_date' => 'nullable|date',
        ]);

        // Handle file upload
        $filePath = $request->file('file')->store('employee_documents', 'public');

        EmployeeDocument::create([
            'employee_id' => $employee->id,
            'document_type' => $request->document_type,
            'title' => $request->title,
            'file_path' => $filePath,
            'description' => $request->description,
            'expiry_date' => $request->expiry_date,
        ]);

        return redirect()->route('employees.documents.index', $employee)
            ->with('success', 'Document uploaded successfully.');
    }

    /**
     * Show form to edit a document.
     */
    public function edit(Employee $employee, EmployeeDocument $document)
    {
        if ($document->employee_id !== $employee->id) {
            abort(404);
        }

        return Inertia::render('employee/documents/edit', [
            'employee' => $employee,
            'document' => $document,
            'documentTypes' => [
                'national_id', 'passport', 'driving_license', 'education',
                'certificate', 'contract', 'other'
            ],
        ]);
    }

    /**
     * Update the specified document.
     */
    public function update(Request $request, Employee $employee, EmployeeDocument $document)
    {
        if ($document->employee_id !== $employee->id) {
            abort(404);
        }

        $request->validate([
            'document_type' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'file' => 'nullable|file|mimes:jpeg,png,jpg,pdf,doc,docx|max:5120',
            'description' => 'nullable|string',
            'expiry_date' => 'nullable|date',
        ]);

        // Handle file upload if new file provided
        if ($request->hasFile('file')) {
            // Delete old file
            if ($document->file_path) {
                Storage::disk('public')->delete($document->file_path);
            }

            // Store new file
            $filePath = $request->file('file')->store('employee_documents', 'public');
            $document->file_path = $filePath;
        }

        $document->document_type = $request->document_type;
        $document->title = $request->title;
        $document->description = $request->description;
        $document->expiry_date = $request->expiry_date;
        $document->save();

        return redirect()->route('employees.documents.index', $employee)
            ->with('success', 'Document updated successfully.');
    }

    /**
     * Delete the specified document.
     */
    public function destroy(Employee $employee, EmployeeDocument $document)
    {
        if ($document->employee_id !== $employee->id) {
            abort(404);
        }

        // Delete file
        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return redirect()->route('employees.documents.index', $employee)
            ->with('success', 'Document deleted successfully.');
    }

    /**
     * Download the specified document.
     */
    public function download(Employee $employee, EmployeeDocument $document)
    {
        if ($document->employee_id !== $employee->id) {
            abort(404);
        }

        if (!$document->file_path || !Storage::disk('public')->exists($document->file_path)) {
            return redirect()->route('employees.documents.index', $employee)
                ->with('error', 'Document file not found.');
        }

        $path = Storage::disk('public')->path($document->file_path);
        $filename = $document->title . '.' . pathinfo($path, PATHINFO_EXTENSION);

        return response()->download($path, $filename);
    }
}
