<?php

namespace App\Http\Controllers\Document;

use App\Http\Controllers\Controller;
use App\Models\DocumentCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DocumentCategoryController extends Controller
{
    /**
     * Store a newly created category.
     * Can respond with JSON (for on-the-fly Combobox creation) or redirect back.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (! DocumentController::canUserManage($user)) {
            abort(403, 'You do not have permission to manage categories.');
        }

        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
        ]);

        $name = trim($request->name);
        $slug = Str::slug($name);

        // Check if category with this name or slug already exists
        $category = DocumentCategory::where('name', $name)
            ->orWhere('slug', $slug)
            ->first();

        if (! $category) {
            $category = DocumentCategory::create([
                'name' => $name,
                'slug' => $slug,
                'description' => $request->description,
                'created_by' => $user->id,
            ]);
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'category' => $category,
                'message' => 'Category created successfully.',
            ]);
        }

        return redirect()->back()->with('success', 'Category created successfully.');
    }

    /**
     * Remove the specified category from storage.
     */
    public function destroy(Request $request, DocumentCategory $category)
    {
        $user = $request->user();
        if (! DocumentController::canUserManage($user)) {
            abort(403, 'You do not have permission to delete categories.');
        }

        if ($category->documents()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete category that contains documents. Please reassign or delete the documents first.');
        }

        $category->delete();

        return redirect()->back()->with('success', 'Category deleted successfully.');
    }
}
