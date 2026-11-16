<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Program;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProgramController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100, 200, 500]) ? $perPage : 10;

        $programs = Program::query()
            ->when($request->search, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('organization/programs/index', [
            'programs' => $programs,
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function create()
    {
        return Inertia::render('organization/programs/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:programs,name',
            'type' => 'required|in:core,project',
            'is_active' => 'boolean',
        ]);

        Program::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('programs.index')->with('success', 'Program created.');
    }

    public function edit(Program $program)
    {
        return Inertia::render('organization/programs/edit', [
            'program' => [
                'id' => $program->id,
                'name' => $program->name,
                'type' => $program->type,
                'is_active' => (bool) $program->is_active,
            ],
        ]);
    }

    public function update(Request $request, Program $program)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:programs,name,'.$program->id,
            'type' => 'required|in:core,project',
            'is_active' => 'boolean',
        ]);

        $program->update([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('programs.index')->with('success', 'Program updated.');
    }

    public function destroy(Program $program)
    {
        try {
            $program->delete();
        } catch (QueryException) {
            return redirect()->route('programs.index')->with('error', 'Cannot delete: this program is still linked to employees.');
        }

        return redirect()->route('programs.index')->with('success', 'Program deleted.');
    }
}
