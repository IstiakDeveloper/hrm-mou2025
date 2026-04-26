<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
use App\Models\Designation;
use App\Models\LeaveApprovalTier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class LeaveSettingController extends Controller
{
    public function index(Request $request)
    {
        $query = LeaveApprovalTier::query()
            ->with('designation')
            ->when($request->filled('context'), function ($q) use ($request) {
                $q->where('context', $request->string('context'));
            })
            ->when($request->filled('is_active'), function ($q) use ($request) {
                $v = $request->input('is_active');
                if ($v === '1' || $v === '0' || $v === 1 || $v === 0) {
                    $q->where('is_active', (bool) (int) $v);
                }
            })
            ->orderBy('context')
            ->orderBy('max_leave_days');

        $paginator = $query->paginate(20)->withQueryString();

        return Inertia::render('leave/settings/index', [
            'tiers' => [
                'data' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'from' => $paginator->firstItem(),
                    'last_page' => $paginator->lastPage(),
                    'links' => $paginator->linkCollection()->toArray(),
                    'path' => $paginator->path(),
                    'per_page' => $paginator->perPage(),
                    'to' => $paginator->lastItem(),
                    'total' => $paginator->total(),
                ],
                'links' => [
                    'first' => $paginator->url(1),
                    'last' => $paginator->url($paginator->lastPage()),
                    'prev' => $paginator->previousPageUrl(),
                    'next' => $paginator->nextPageUrl(),
                ],
            ],
            'filters' => $request->only(['context', 'is_active']),
            'canEdit' => $request->user()->hasPermission('leave-types.edit'),
        ]);
    }

    public function create()
    {
        return Inertia::render('leave/settings/create', [
            'designations' => Designation::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        LeaveApprovalTier::create($this->validatedTier($request));

        return redirect()->route('leave.settings.index')
            ->with('success', 'Approval tier saved.');
    }

    public function edit(LeaveApprovalTier $leaveApprovalTier)
    {
        $leaveApprovalTier->load('designation');

        return Inertia::render('leave/settings/edit', [
            'tier' => $leaveApprovalTier,
            'designations' => Designation::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, LeaveApprovalTier $leaveApprovalTier)
    {
        $leaveApprovalTier->update($this->validatedTier($request, $leaveApprovalTier->id));

        return redirect()->route('leave.settings.index')
            ->with('success', 'Approval tier updated.');
    }

    public function destroy(LeaveApprovalTier $leaveApprovalTier)
    {
        $leaveApprovalTier->delete();

        return redirect()->route('leave.settings.index')
            ->with('success', 'Approval tier deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedTier(Request $request, ?int $ignoreId = null): array
    {
        $uniqueMax = Rule::unique('leave_approval_tiers', 'max_leave_days')
            ->where('context', $request->input('context'));
        if ($ignoreId) {
            $uniqueMax->ignore($ignoreId);
        }

        $validated = $request->validate([
            'context' => 'required|string|in:head_office,branch',
            'max_leave_days' => ['required', 'integer', 'min:1', 'max:366', $uniqueMax],
            'approver_type' => 'required|string|in:department_head,executive_director,branch_manager,branch_head,designation',
            'designation_id' => 'nullable|required_if:approver_type,designation|exists:designations,id',
            'is_active' => 'sometimes|boolean',
        ], [
            'max_leave_days.unique' => 'This head office / branch already has a tier for that max day value. Edit that row or choose another max.',
        ]);

        if (($validated['approver_type'] ?? '') !== 'designation') {
            $validated['designation_id'] = null;
        }

        $validated['is_active'] = array_key_exists('is_active', $validated)
            ? (bool) $validated['is_active']
            : true;

        return $validated;
    }
}
