<?php

namespace App\Http\Controllers\Employee;

use App\Models\Employee;
use App\Models\LocationUnion;
use App\Models\LocationVillage;
use App\Services\OrganogramAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class EmployeeLookupController extends EmployeeController
{
    public function locationsUpazilas(Request $request)
    {
        $this->authorizeEmployeeDirectoryAccess($request);

        $district = trim((string) $request->query('district', ''));
        if ($district === '') {
            return response()->json([]);
        }

        $payload = $this->cachedLocationsPayload();

        return response()->json($payload['upazilas'][$district] ?? []);
    }

    public function locationsUnions(Request $request)
    {
        $this->authorizeEmployeeDirectoryAccess($request);

        $upazila = trim((string) $request->query('upazila', ''));
        if ($upazila === '') {
            return response()->json([]);
        }

        $payload = $this->cachedLocationsPayload();

        return response()->json($payload['unions'][$upazila] ?? []);
    }

    /**
     * Lightweight employee search for dropdowns (payroll, reports, forms).
     */
    public function lookup(Request $request)
    {
        $this->authorizeEmployeeDirectoryAccess($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'payroll_ready' => ['nullable', 'boolean'],
            'for_gratuity' => ['nullable', 'boolean'],
            'for_pf' => ['nullable', 'boolean'],
            'for_loan' => ['nullable', 'boolean'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 25);
        $selectedEmployeeId = isset($validated['employee_id']) ? (int) $validated['employee_id'] : null;
        $forPf = $request->boolean('for_pf');
        $forLoan = $request->boolean('for_loan');

        $query = Employee::query()
            ->select(['id', 'pin', 'name_en', 'name_bn', 'employee_id', 'pf_balance', 'status'])
            ->when($forPf, fn ($q) => $q->forPf())
            ->when($forLoan, fn ($q) => $q->forLoan())
            ->when(! $forPf && ! $forLoan, fn ($q) => $q->where('status', 'active'))
            ->when($validated['branch_id'] ?? null, fn ($q, $branchId) => $q->where('current_branch_id', $branchId))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->orderBy('pin')
            ->limit($limit);

        if ($request->boolean('payroll_ready')) {
            $query->payrollReady();
        }

        if ($request->boolean('for_gratuity')) {
            $query->forGratuity();
        }

        OrganogramAccessService::constrainVisibleEmployees($query, $request->user());

        $results = $query->get();

        if ($selectedEmployeeId && ! $results->contains('id', $selectedEmployeeId)) {
            $selected = Employee::query()
                ->select(['id', 'pin', 'name_en', 'name_bn', 'employee_id', 'pf_balance', 'status'])
                ->where('id', $selectedEmployeeId)
                ->when($forPf, fn ($q) => $q->forPf())
                ->when($forLoan, fn ($q) => $q->forLoan())
                ->when(! $forPf && ! $forLoan, fn ($q) => $q->where('status', 'active'))
                ->first();

            if ($selected) {
                $visible = Employee::query()
                    ->select(['id'])
                    ->where('id', $selectedEmployeeId);
                OrganogramAccessService::constrainVisibleEmployees($visible, $request->user());

                if ($visible->exists()) {
                    $results->prepend($selected);
                }
            }
        }

        return response()->json(
            $results->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'name_bn' => $employee->name_bn,
                'employee_id' => $employee->employee_id,
                'pf_balance' => $employee->pf_balance,
                'status' => $employee->status,
            ])->values()
        );
    }

    /**
     * Fast live search for global employee search with PIN priority ranking.
     */
    public function globalSearch(Request $request)
    {
        $this->authorizeEmployeeDirectoryAccess($request);

        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $search = trim((string) $validated['q']);
        $limit = (int) ($validated['limit'] ?? 10);

        if ($search === '') {
            return response()->json([]);
        }

        $query = Employee::query()
            ->select([
                'id',
                'pin',
                'employee_id',
                'name_en',
                'name_bn',
                'mobile_personal',
                'mobile_official',
                'photo',
                'status',
                'department_id',
                'designation_id',
                'current_branch_id',
            ])
            ->with([
                'designation:id,name',
                'department:id,name',
                'branch:id,name',
            ])
            ->where(function ($inner) use ($search) {
                $inner->where('pin', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('name_bn', 'like', "%{$search}%")
                    ->orWhere('mobile_personal', 'like', "%{$search}%")
                    ->orWhere('mobile_official', 'like', "%{$search}%");
            });

        OrganogramAccessService::constrainVisibleEmployees($query, $request->user());

        $likeStart = $search.'%';
        $likeContain = '%'.$search.'%';

        $query->orderByRaw(
            "CASE
                WHEN pin = ? OR employee_id = ? THEN 1
                WHEN pin LIKE ? OR employee_id LIKE ? THEN 2
                WHEN pin LIKE ? OR employee_id LIKE ? THEN 3
                WHEN name_en LIKE ? OR name_bn LIKE ? THEN 4
                WHEN name_en LIKE ? OR name_bn LIKE ? THEN 5
                WHEN mobile_personal LIKE ? OR mobile_official LIKE ? THEN 6
                ELSE 7
            END",
            [
                $search, $search,
                $likeStart, $likeStart,
                $likeContain, $likeContain,
                $likeStart, $likeStart,
                $likeContain, $likeContain,
                $likeContain, $likeContain,
            ]
        )
        ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
        ->orderBy('pin', 'asc')
        ->limit($limit);

        $employees = $query->get()->map(function (Employee $emp) {
            return [
                'id' => $emp->id,
                'pin' => $emp->pin,
                'employee_id' => $emp->employee_id,
                'name_en' => $emp->name_en,
                'name_bn' => $emp->name_bn,
                'display_name' => $emp->full_name_en ?: ($emp->name_bn ?: 'Employee #'.$emp->id),
                'mobile_personal' => $emp->mobile_personal,
                'mobile_official' => $emp->mobile_official,
                'photo_url' => $emp->photo ? '/storage/'.ltrim($emp->photo, '/') : null,
                'status' => $emp->status,
                'designation' => $emp->designation?->name,
                'department' => $emp->department?->name,
                'branch' => $emp->branch?->name,
                'url' => route('employees.show', ['employee' => $emp->id, 'section' => 'human-resources']),
            ];
        });

        return response()->json($employees);
    }

    public function pinSuggestion(Request $request)
    {
        $pins = Employee::query()
            ->whereNotNull('pin')
            ->pluck('pin')
            ->map(fn ($v) => trim((string) $v))
            ->filter()
            ->values()
            ->all();

        $maxNormal = 0;
        $maxProject = 0;
        foreach ($pins as $p) {
            if (preg_match('/^\\d+$/', $p)) {
                $maxNormal = max($maxNormal, (int) $p);

                continue;
            }
            if (preg_match('/^p-(\\d+)$/i', $p, $m)) {
                $maxProject = max($maxProject, (int) $m[1]);
            }
        }

        $nextNormal = str_pad((string) ($maxNormal + 1), 4, '0', STR_PAD_LEFT);
        $nextProject = 'p-'.str_pad((string) ($maxProject + 1), 4, '0', STR_PAD_LEFT);

        return response()->json([
            'next_normal_pin' => $nextNormal,
            'next_project_pin' => $nextProject,
            'last_normal_pin' => $maxNormal > 0 ? str_pad((string) $maxNormal, 4, '0', STR_PAD_LEFT) : null,
        ]);
    }

    public function storeVillage(Request $request)
    {
        $validated = $request->validate([
            'division' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'upazila' => 'nullable|string|max:120',
            'union' => 'nullable|string|max:120',
            'name' => 'required|string|max:150',
        ]);

        $validated = array_map(fn ($v) => is_string($v) ? trim($v) : $v, $validated);
        $validated['created_by'] = $request->user()?->id;

        $village = LocationVillage::query()->firstOrCreate(
            Arr::only($validated, ['division', 'district', 'upazila', 'union', 'name']),
            Arr::only($validated, ['created_by'])
        );

        // Persist to data/locations/villages.json so it can be selected later (starts empty).
        try {
            $villagesPath = base_path('data/locations/villages.json');
            if (! file_exists($villagesPath)) {
                @file_put_contents($villagesPath, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
            }

            $existing = $this->readJsonArrayFile($villagesPath);
            if (! is_array($existing)) {
                $existing = [];
            }

            $unionId = $this->resolveBdGeoUnionId(
                (string) ($validated['division'] ?? ''),
                (string) ($validated['district'] ?? ''),
                (string) ($validated['upazila'] ?? ''),
                (string) ($validated['union'] ?? '')
            );

            $newEntry = [
                'name' => $village->name,
            ];
            if (is_string($unionId) && $unionId !== '') {
                $newEntry['union_id'] = $unionId;
            } else {
                // fallback so we can still match by names
                $newEntry['upazila'] = (string) ($village->upazila ?? '');
                $newEntry['union'] = (string) ($village->union ?? '');
            }

            $existsAlready = false;
            foreach ($existing as $row) {
                if (! is_array($row)) {
                    continue;
                }
                if (trim((string) ($row['name'] ?? '')) !== $newEntry['name']) {
                    continue;
                }
                if (! empty($newEntry['union_id']) && trim((string) ($row['union_id'] ?? '')) === $newEntry['union_id']) {
                    $existsAlready = true;
                    break;
                }
                if (empty($newEntry['union_id']) && trim((string) ($row['upazila'] ?? '')) === ($newEntry['upazila'] ?? '') && trim((string) ($row['union'] ?? '')) === ($newEntry['union'] ?? '')) {
                    $existsAlready = true;
                    break;
                }
            }

            if (! $existsAlready) {
                $existing[] = $newEntry;
                @file_put_contents($villagesPath, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                $this->forgetLocationsPayloadCache();
            }
        } catch (\Throwable) {
            // ignore file persistence errors
        }

        return response()->json([
            'id' => $village->id,
            'division' => $village->division,
            'district' => $village->district,
            'upazila' => $village->upazila,
            'union' => $village->union,
            'name' => $village->name,
        ]);
    }

    public function storeUnion(Request $request)
    {
        $validated = $request->validate([
            'division' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'upazila' => 'required|string|max:120',
            'name' => 'required|string|max:120',
        ]);

        $validated = array_map(fn ($v) => is_string($v) ? trim($v) : $v, $validated);
        $validated['created_by'] = $request->user()?->id;

        $union = LocationUnion::query()->firstOrCreate(
            Arr::only($validated, ['division', 'district', 'upazila', 'name']),
            Arr::only($validated, ['created_by'])
        );

        try {
            $unionsPath = base_path('data/locations/unions_custom.json');
            if (! file_exists($unionsPath)) {
                @file_put_contents($unionsPath, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
            }

            $existing = $this->readJsonArrayFile($unionsPath);
            if (! is_array($existing)) {
                $existing = [];
            }

            $newEntry = [
                'division' => (string) $union->division,
                'district' => (string) $union->district,
                'upazila' => (string) $union->upazila,
                'name' => (string) $union->name,
            ];

            $existsAlready = false;
            foreach ($existing as $row) {
                if (! is_array($row)) {
                    continue;
                }
                if (
                    trim((string) ($row['name'] ?? '')) === $newEntry['name']
                    && trim((string) ($row['upazila'] ?? '')) === $newEntry['upazila']
                    && trim((string) ($row['district'] ?? '')) === $newEntry['district']
                    && trim((string) ($row['division'] ?? '')) === $newEntry['division']
                ) {
                    $existsAlready = true;
                    break;
                }
            }

            if (! $existsAlready) {
                $existing[] = $newEntry;
                @file_put_contents($unionsPath, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                $this->forgetLocationsPayloadCache();
            }
        } catch (\Throwable) {
            // ignore file persistence errors
        }

        return response()->json([
            'id' => $union->id,
            'division' => $union->division,
            'district' => $union->district,
            'upazila' => $union->upazila,
            'name' => $union->name,
        ]);
    }

}
