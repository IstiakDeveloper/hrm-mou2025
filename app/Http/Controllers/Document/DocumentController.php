<?php

namespace App\Http\Controllers\Document;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentCategory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    /**
     * Determine if the user has authority to manage documents (upload, category creation).
     */
    public static function canUserManage(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        // Super Admin
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Admin roles or direct management permissions
        if ($user->hasPermission('admin.access')
            || $user->hasPermission('employees.admin')
            || $user->hasPermission('documents.manage')) {
            return true;
        }

        $roleName = strtolower($user->role?->name ?? '');
        if (in_array($roleName, ['admin', 'super admin', 'administrator', 'hr admin'], true)) {
            return true;
        }

        if ($user->roles && $user->roles->contains(function ($r) {
            return in_array(strtolower($r->name ?? ''), ['admin', 'super admin', 'administrator', 'hr admin'], true);
        })) {
            return true;
        }

        // Department Head
        if ($user->isDepartmentHead()) {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user has authority to edit, delete, or pin documents.
     * Strictly restricted to Super Admin only.
     */
    public static function canUserEditOrDelete(?User $user): bool
    {
        return $user ? $user->isSuperAdmin() : false;
    }

    /**
     * Display a listing of documents.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $canManage = self::canUserManage($user);
        $canEditDelete = self::canUserEditOrDelete($user);

        // Seed default categories if none exist
        if (DocumentCategory::count() === 0) {
            $defaultCategories = [
                ['name' => 'HR Policies & Circulars', 'description' => 'Official HR rules, leave policy, employee manual and internal circulars.'],
                ['name' => 'Forms & Templates', 'description' => 'Official application forms, request letters, requisition and voucher templates.'],
                ['name' => 'Standard Operating Procedures (SOP)', 'description' => 'Standard operating procedures, manuals and process workflows.'],
                ['name' => 'Financial & Audit Reports', 'description' => 'Organizational financial policies, budget guidelines and audit documentations.'],
                ['name' => 'Training & Guidelines', 'description' => 'Staff training materials, guides, tutorials and presentations.'],
            ];

            foreach ($defaultCategories as $cat) {
                DocumentCategory::create([
                    'name' => $cat['name'],
                    'slug' => Str::slug($cat['name']),
                    'description' => $cat['description'],
                    'created_by' => $user?->id,
                ]);
            }
        }

        $search = trim((string) $request->input('search', ''));
        $categoryId = $request->input('category_id');
        $fileType = $request->input('file_type');
        $onlyPinned = $request->boolean('pinned_only');

        $query = Document::query()
            ->with([
                'category:id,name,slug',
                'uploader:id,name',
                'updater:id,name',
            ]);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('file_name', 'like', "%{$search}%");
            });
        }

        if ($categoryId && $categoryId !== 'all') {
            $query->where('category_id', $categoryId);
        }

        if ($fileType && $fileType !== 'all') {
            $query->where('file_type', strtolower($fileType));
        }

        if ($onlyPinned) {
            $query->where('is_pinned', true);
        }

        // Pinned documents ALWAYS come first, then latest documents
        $documents = $query
            ->orderByDesc('is_pinned')
            ->orderByDesc('pinned_at')
            ->orderByDesc('created_at')
            ->paginate(24)
            ->withQueryString();

        $categories = DocumentCategory::query()
            ->withCount('documents')
            ->orderBy('name')
            ->get();

        $stats = [
            'total_documents' => Document::count(),
            'total_pinned' => Document::where('is_pinned', true)->count(),
            'total_downloads' => (int) Document::sum('download_count'),
            'total_categories' => DocumentCategory::count(),
        ];

        return Inertia::render('documents/index', [
            'documents' => $documents,
            'categories' => $categories,
            'filters' => [
                'search' => $search,
                'category_id' => $categoryId ?? 'all',
                'file_type' => $fileType ?? 'all',
                'pinned_only' => $onlyPinned,
            ],
            'stats' => $stats,
            'canManage' => $canManage,
            'canEditDelete' => $canEditDelete,
            'isDepartmentHead' => $user ? $user->isDepartmentHead() : false,
            'isSuperAdmin' => $user ? $user->isSuperAdmin() : false,
        ]);
    }

    /**
     * Store a newly uploaded document.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (! self::canUserManage($user)) {
            abort(403, 'You do not have permission to upload documents.');
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:document_categories,id',
            'description' => 'nullable|string|max:2000',
            'file' => 'required|file|max:51200', // 50MB max
            'is_pinned' => 'nullable|boolean',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = strtolower($file->getClientOriginalExtension());
        $mimeType = $file->getClientMimeType();
        $fileSize = $file->getSize();

        $filePath = $file->store('documents', 'public');

        $isPinned = $request->boolean('is_pinned');

        $document = Document::create([
            'category_id' => $request->category_id,
            'title' => $request->title,
            'description' => $request->description,
            'file_name' => $originalName,
            'file_path' => $filePath,
            'file_type' => $extension ?: 'bin',
            'file_size_bytes' => $fileSize,
            'mime_type' => $mimeType,
            'is_pinned' => $isPinned,
            'pinned_at' => $isPinned ? now() : null,
            'uploaded_by' => $user->id,
            'department_id' => $user->employee?->department_id,
        ]);

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    /**
     * Update an existing document (title, category, description, pinning, or replace file).
     */
    public function update(Request $request, Document $document)
    {
        $user = $request->user();
        if (! self::canUserEditOrDelete($user)) {
            abort(403, 'Only Super Admin is authorized to edit documents.');
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:document_categories,id',
            'description' => 'nullable|string|max:2000',
            'file' => 'nullable|file|max:51200', // optional replacement
            'is_pinned' => 'nullable|boolean',
        ]);

        $updateData = [
            'title' => $request->title,
            'category_id' => $request->category_id,
            'description' => $request->description,
            'updated_by' => $user->id,
        ];

        // Handle pin change
        if ($request->has('is_pinned')) {
            $isPinned = $request->boolean('is_pinned');
            $updateData['is_pinned'] = $isPinned;
            if ($isPinned && ! $document->is_pinned) {
                $updateData['pinned_at'] = now();
            } elseif (! $isPinned) {
                $updateData['pinned_at'] = null;
            }
        }

        // Handle file replacement if a new file is uploaded
        if ($request->hasFile('file')) {
            $file = $request->file('file');

            // Delete old file from public storage if it exists
            if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
                Storage::disk('public')->delete($document->file_path);
            }

            $updateData['file_name'] = $file->getClientOriginalName();
            $updateData['file_path'] = $file->store('documents', 'public');
            $updateData['file_type'] = strtolower($file->getClientOriginalExtension()) ?: 'bin';
            $updateData['file_size_bytes'] = $file->getSize();
            $updateData['mime_type'] = $file->getClientMimeType();
        }

        $document->update($updateData);

        return redirect()->back()->with('success', 'Document updated successfully.');
    }

    /**
     * Toggle the pinned status of a document.
     */
    public function togglePin(Request $request, Document $document)
    {
        $user = $request->user();
        if (! self::canUserEditOrDelete($user)) {
            abort(403, 'Only Super Admin is authorized to pin or unpin documents.');
        }

        $newPinned = ! $document->is_pinned;
        $document->update([
            'is_pinned' => $newPinned,
            'pinned_at' => $newPinned ? now() : null,
            'updated_by' => $user->id,
        ]);

        $statusText = $newPinned ? 'pinned to the top' : 'unpinned';

        return redirect()->back()->with('success', "Document {$statusText} successfully.");
    }

    /**
     * Download document file and increment download count.
     * Accessible to ANY authenticated user.
     */
    public function download(Document $document)
    {
        $document->increment('download_count');

        if (Storage::disk('public')->exists($document->file_path)) {
            return Storage::disk('public')->download($document->file_path, $document->file_name);
        }

        abort(404, 'File not found on storage server.');
    }

    /**
     * Preview document inline in browser (e.g. PDF, images).
     */
    public function preview(Document $document)
    {
        if (Storage::disk('public')->exists($document->file_path)) {
            return Storage::disk('public')->response($document->file_path, $document->file_name);
        }

        abort(404, 'File not found on storage server.');
    }

    /**
     * Delete a document.
     */
    public function destroy(Request $request, Document $document)
    {
        $user = $request->user();
        if (! self::canUserEditOrDelete($user)) {
            abort(403, 'Only Super Admin is authorized to delete documents.');
        }

        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return redirect()->back()->with('success', 'Document deleted successfully.');
    }
}
