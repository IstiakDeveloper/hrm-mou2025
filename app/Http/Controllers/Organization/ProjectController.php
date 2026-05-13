<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100, 200, 500]) ? $perPage : 10;

        $projects = Project::query()
            ->when($request->search, function ($q, $search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('organization/projects/index', [
            'projects' => $projects,
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function create()
    {
        return Inertia::render('organization/projects/create');
    }

    public function store(Request $request)
    {
        $code = $request->filled('code') ? trim((string) $request->input('code')) : null;
        $request->merge(['code' => $code]);

        $validated = $request->validate([
            'name' => 'required|string|max:200|unique:projects,name',
            'code' => ['nullable', 'string', 'max:50', 'unique:projects,code'],
            'is_active' => 'boolean',
        ]);

        Project::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('projects.index')->with('success', 'Project created.');
    }

    public function edit(Project $project)
    {
        return Inertia::render('organization/projects/edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'code' => $project->code,
                'is_active' => (bool) $project->is_active,
            ],
        ]);
    }

    public function update(Request $request, Project $project)
    {
        $code = $request->filled('code') ? trim((string) $request->input('code')) : null;

        $request->merge(['code' => $code]);

        $validated = $request->validate([
            'name' => 'required|string|max:200|unique:projects,name,'.$project->id,
            'code' => ['nullable', 'string', 'max:50', 'unique:projects,code,'.$project->id],
            'is_active' => 'boolean',
        ]);

        $project->update([
            'name' => $validated['name'],
            'code' => $code,
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('projects.index')->with('success', 'Project updated.');
    }

    public function destroy(Project $project)
    {
        try {
            $project->delete();
        } catch (QueryException) {
            return redirect()->route('projects.index')->with('error', 'Cannot delete: this project is still linked to employees.');
        }

        return redirect()->route('projects.index')->with('success', 'Project deleted.');
    }
}
