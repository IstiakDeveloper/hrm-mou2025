<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\RegionalOffice;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrganizationStructureController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->get('search', ''));

        $zones = Zone::query()
            ->with([
                'zoneManager:id,employee_id,name_en',
                'regionalOffices' => function ($q) use ($search) {
                    $q->orderBy('name')
                        ->with([
                            'regionalManager:id,employee_id,name_en',
                            'zone:id,name,code',
                            'branches' => function ($bq) use ($search) {
                                $bq->where('is_head_office', false)
                                    ->orderBy('branch_code')
                                    ->orderBy('name')
                                    ->when($search !== '', function ($inner) use ($search) {
                                        $inner->where(function ($w) use ($search) {
                                            $w->where('name', 'like', "%{$search}%")
                                                ->orWhere('branch_code', 'like', "%{$search}%");
                                        });
                                    });
                            },
                        ])
                        ->when($search !== '', function ($q) use ($search) {
                            $q->where(function ($w) use ($search) {
                                $w->where('name', 'like', "%{$search}%")
                                    ->orWhere('code', 'like', "%{$search}%")
                                    ->orWhereHas('branches', function ($bq) use ($search) {
                                        $bq->where('is_head_office', false)
                                            ->where(function ($bw) use ($search) {
                                                $bw->where('name', 'like', "%{$search}%")
                                                    ->orWhere('branch_code', 'like', "%{$search}%");
                                            });
                                    });
                            });
                        });
                },
            ])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($w) use ($search) {
                    $w->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhereHas('regionalOffices', function ($ro) use ($search) {
                            $ro->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%")
                                ->orWhereHas('branches', function ($bq) use ($search) {
                                    $bq->where('is_head_office', false)
                                        ->where(function ($bw) use ($search) {
                                            $bw->where('name', 'like', "%{$search}%")
                                                ->orWhere('branch_code', 'like', "%{$search}%");
                                        });
                                });
                        });
                });
            })
            ->orderBy('name')
            ->get();

        $headOffice = Branch::query()
            ->where('is_head_office', true)
            ->first(['id', 'name', 'branch_code', 'is_active', 'regional_office_id']);

        $unassignedBranches = Branch::query()
            ->where('is_head_office', false)
            ->whereNull('regional_office_id')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($w) use ($search) {
                    $w->where('name', 'like', "%{$search}%")
                        ->orWhere('branch_code', 'like', "%{$search}%");
                });
            })
            ->orderBy('branch_code')
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'is_active', 'regional_office_id']);

        $zoneOptions = Zone::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'is_active']);

        $regionalOfficeOptions = RegionalOffice::query()
            ->with('zone:id,name,code')
            ->orderBy('name')
            ->get(['id', 'zone_id', 'name', 'code', 'is_active']);

        $user = $request->user();

        return Inertia::render('organization/structure/index', [
            'headOffice' => $headOffice,
            'zones' => $zones,
            'unassignedBranches' => $unassignedBranches,
            'zoneOptions' => $zoneOptions,
            'regionalOfficeOptions' => $regionalOfficeOptions,
            'filters' => ['search' => $search],
            'can' => [
                'viewBranches' => (bool) $user?->hasPermission('branches.view'),
                'viewZones' => (bool) $user?->hasPermission('zones.view'),
                'viewRegionalOffices' => (bool) $user?->hasPermission('regional-offices.view'),
                'editBranches' => (bool) $user?->hasPermission('branches.edit'),
                'editRegionalOffices' => (bool) $user?->hasPermission('regional-offices.edit'),
                'editZones' => (bool) $user?->hasPermission('zones.edit'),
                'createBranch' => (bool) $user?->hasPermission('branches.create'),
                'createRegionalOffice' => (bool) $user?->hasPermission('regional-offices.create'),
                'createZone' => (bool) $user?->hasPermission('zones.create'),
            ],
        ]);
    }

    public function updateBranchRegionalOffice(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'regional_office_id' => 'nullable|exists:regional_offices,id',
        ]);

        if ($branch->is_head_office) {
            return back()->withErrors([
                'regional_office_id' => 'Head Office is not assigned to a regional office.',
            ]);
        }

        $branch->update([
            'regional_office_id' => $validated['regional_office_id'] ?? null,
        ]);

        return back()->with('success', 'Branch regional assignment updated.');
    }

    public function updateRegionalOfficeZone(Request $request, RegionalOffice $regionalOffice)
    {
        $validated = $request->validate([
            'zone_id' => 'required|exists:zones,id',
        ]);

        $regionalOffice->update([
            'zone_id' => $validated['zone_id'],
        ]);

        return back()->with('success', 'Regional office zone assignment updated.');
    }
}
