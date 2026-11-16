<?php

namespace App\Services\Mobile;

use App\Models\Document;
use App\Models\User;
use App\Support\OfficeMapLocations;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MobileOpsCatalogService
{
    /**
     * @return array<string, mixed>
     */
    public function documents(User $user): array
    {
        if (! $user->canAccessSection('documents') && ! $user->isSuperAdmin()) {
            throw new HttpException(403, 'Document Center not accessible.');
        }

        $rows = Document::query()
            ->with('category:id,name')
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'title', 'category_id', 'created_at', 'is_pinned']);

        return [
            'data' => $rows->map(fn (Document $doc) => [
                'id' => $doc->id,
                'title' => $doc->title,
                'category' => $doc->category?->name,
                'is_pinned' => (bool) ($doc->is_pinned ?? false),
                'created_at' => optional($doc->created_at)?->toIso8601String(),
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function myAssets(User $user): array
    {
        $user->loadMissing('employee');
        if (! $user->employee) {
            throw new HttpException(403, 'Employee profile not found.');
        }

        $rows = \App\Models\AssetAssignment::query()
            ->where('employee_id', $user->employee_id)
            ->whereNull('released_date')
            ->with(['fixedAsset:id,name,status,manual_asset_code'])
            ->orderByDesc('assigned_date')
            ->limit(50)
            ->get();

        return [
            'data' => $rows->map(function ($row) {
                $asset = $row->fixedAsset;

                return [
                    'id' => $row->id,
                    'name' => $asset?->name ?? 'Asset',
                    'tag' => $asset?->manual_asset_code,
                    'status' => $asset?->status,
                    'assigned_date' => optional($row->assigned_date)?->toDateString(),
                ];
            })->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function officeMap(): array
    {
        return OfficeMapLocations::payload();
    }

    /**
     * @return array<string, mixed>
     */
    public function reportsCatalog(User $user): array
    {
        $families = [
            'payroll' => config('payroll_reports.reports', []),
            'pf' => config('pf_reports.reports', []),
            'gratuity' => config('gratuity_reports.reports', []),
            'employee_loan' => config('employee_loan_reports.reports', []),
            'fixed_asset' => config('fixed_asset_reports.reports', []),
            'hr_web' => [
                'attendance' => ['title' => 'Attendance report'],
                'leave' => ['title' => 'Leave report'],
                'movement' => ['title' => 'Movement report'],
                'transfer' => ['title' => 'Transfer report'],
                'employee' => ['title' => 'Employee report'],
            ],
        ];

        $data = [];
        foreach ($families as $family => $reports) {
            if (! is_array($reports)) {
                continue;
            }
            foreach ($reports as $slug => $meta) {
                if (! is_array($meta)) {
                    continue;
                }
                $data[] = [
                    'family' => $family,
                    'slug' => $slug,
                    'title' => $meta['title'] ?? $slug,
                    'filters' => $meta['filters'] ?? [],
                ];
            }
        }

        return [
            'data' => $data,
            'note' => 'Official PDF/XLSX generation remains server-side; mobile run/download jobs land in P18 async phase.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function inventoryProducts(User $user): array
    {
        if (! $user->canAccessSection('inventory') && ! $user->isSuperAdmin()) {
            throw new HttpException(403, 'Inventory not accessible.');
        }

        $rows = \App\Models\InventoryProduct::query()
            ->orderBy('name')
            ->limit(100)
            ->get();

        return [
            'data' => $rows->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'sku' => $row->sku ?? $row->code ?? null,
                'unit' => $row->unit ?? null,
            ])->values()->all(),
            'note' => 'Stock-in/disburse ops remain on web until P15 write APIs close.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function adminSummary(User $user): array
    {
        if (! $user->canAccessSection('administration') && ! $user->isSuperAdmin()) {
            throw new HttpException(403, 'Administration not accessible.');
        }

        return [
            'users_count' => class_exists(User::class) ? User::query()->count() : null,
            'mobile_tokens_note' => 'Token revoke UI parity tracked in P02.11 / P17.04.',
            'allowed_actions' => ['open_web_admin'],
        ];
    }
}
