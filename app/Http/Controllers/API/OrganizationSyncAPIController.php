<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Zone;
use App\Services\MisLoanFieldOfficerSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationSyncAPIController extends Controller
{
    public function organizationStructure(Request $request): JsonResponse
    {
        if (! $this->authorizeSync($request)) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        $zones = Zone::query()
            ->with([
                'regionalOffices' => fn ($query) => $query->orderBy('code'),
                'regionalOffices.branches' => fn ($query) => $query->orderBy('branch_code'),
            ])
            ->orderBy('code')
            ->get();

        $orphanBranches = Branch::query()
            ->where(function ($query) {
                $query->whereNull('regional_office_id')
                    ->orWhere('is_head_office', true);
            })
            ->orderBy('branch_code')
            ->get();

        $payload = [
            'status' => true,
            'synced_at' => now()->toIso8601String(),
            'orphan_area' => [
                'zone_code' => '00',
                'zone_name' => 'Head Office',
                'area_code' => '000',
                'area_name' => 'Head Office & Unassigned',
            ],
            'orphan_branches' => $orphanBranches
                ->map(fn (Branch $branch) => $this->branchPayload($branch))
                ->values(),
            'zones' => $zones->map(function (Zone $zone) {
                return [
                    'code' => $zone->code,
                    'name' => $zone->name,
                    'description' => $zone->description,
                    'is_active' => (bool) $zone->is_active,
                    'areas' => $zone->regionalOffices->map(function ($regionalOffice) {
                        return [
                            'code' => $regionalOffice->code,
                            'name' => $regionalOffice->name,
                            'description' => $regionalOffice->description,
                            'is_active' => (bool) $regionalOffice->is_active,
                            'branches' => $regionalOffice->branches
                                ->reject(fn (Branch $branch) => $branch->is_head_office || $branch->regional_office_id === null)
                                ->map(fn (Branch $branch) => $this->branchPayload($branch))
                                ->values(),
                        ];
                    })->values(),
                ];
            })->values(),
        ];

        return response()->json($payload);
    }

    public function fieldOfficers(Request $request, MisLoanFieldOfficerSyncService $syncService): JsonResponse
    {
        if (! $this->authorizeSync($request)) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        $officers = $syncService->listOfficerPayloads();

        return response()->json([
            'status' => true,
            'synced_at' => now()->toIso8601String(),
            'officers' => $officers,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function branchPayload(Branch $branch): array
    {
        $loginPinHash = $branch->getRawOriginal('login_pin');

        return [
            'code' => $branch->branch_code,
            'name' => $branch->name,
            'address' => $branch->address,
            'phone' => $branch->contact_number,
            'email' => $branch->email,
            'is_active' => (bool) $branch->is_active,
            'is_head_office' => (bool) $branch->is_head_office,
            'has_login_pin' => filled($loginPinHash),
            'login_pin_hash' => is_string($loginPinHash) && $loginPinHash !== '' ? $loginPinHash : null,
        ];
    }

    private function authorizeSync(Request $request): bool
    {
        $apiKey = (string) config('app.sync_api_key');

        return $apiKey !== '' && $request->header('Authorization') === 'Bearer '.$apiKey;
    }
}
