<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\AssetAssignment;
use App\Models\FixedAsset;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeAssetController extends Controller
{
    public function index(Request $request)
    {
        /** @var User|null $user */
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        $user->loadMissing('employee');
        $employee = $user->employee;

        if (! $employee) {
            return Inertia::render('employee/my-assets', [
                'assets' => [],
                'hasEmployeeProfile' => false,
            ]);
        }

        $assignmentRows = AssetAssignment::query()
            ->where('employee_id', $employee->id)
            ->whereNull('released_date')
            ->with([
                'fixedAsset.category:id,code,name',
                'fixedAsset.branch:id,name,branch_code',
            ])
            ->orderByDesc('assigned_date')
            ->get();

        $custodianRows = FixedAsset::query()
            ->where('custodian_employee_id', $employee->id)
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->with(['category:id,code,name', 'branch:id,name,branch_code'])
            ->orderBy('name')
            ->get();

        $seen = [];
        $assets = [];

        foreach ($assignmentRows as $assignment) {
            $asset = $assignment->fixedAsset;
            if (! $asset || isset($seen[$asset->id])) {
                continue;
            }
            $seen[$asset->id] = true;
            $assets[] = $this->mapAsset($asset, 'assignment', $assignment->assigned_date?->format('Y-m-d'));
        }

        foreach ($custodianRows as $asset) {
            if (isset($seen[$asset->id])) {
                continue;
            }
            $seen[$asset->id] = true;
            $assets[] = $this->mapAsset($asset, 'custodian', null);
        }

        usort($assets, fn ($a, $b) => strcmp($a['name'], $b['name']));

        return Inertia::render('employee/my-assets', [
            'assets' => $assets,
            'hasEmployeeProfile' => true,
            'employee' => [
                'id' => $employee->id,
                'employee_id' => $employee->employee_id,
                'name' => trim("{$employee->first_name} {$employee->last_name}"),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAsset(FixedAsset $asset, string $custodyType, ?string $assignedDate): array
    {
        return [
            'id' => $asset->id,
            'asset_tag' => $asset->asset_tag,
            'name' => $asset->name,
            'status' => $asset->status,
            'status_label' => FixedAsset::STATUSES[$asset->status] ?? $asset->status,
            'serial_number' => $asset->serial_number,
            'custody_type' => $custodyType,
            'custody_label' => $custodyType === 'assignment' ? 'Assigned to you' : 'Custodian',
            'assigned_date' => $assignedDate,
            'category' => $asset->category ? [
                'code' => $asset->category->code,
                'name' => $asset->category->name,
            ] : null,
            'branch' => $asset->branch ? [
                'name' => $asset->branch->name,
                'branch_code' => $asset->branch->branch_code,
            ] : null,
        ];
    }
}
