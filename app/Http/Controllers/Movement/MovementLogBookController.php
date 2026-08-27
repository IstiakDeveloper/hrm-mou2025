<?php

namespace App\Http\Controllers\Movement;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Movement\Concerns\ResolvesLogBookScopeView;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\MovementLogBook;
use App\Models\MovementLogBookPayment;
use App\Models\RegionalOffice;
use App\Models\User;
use App\Models\Zone;
use App\Services\OrganogramAccessService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Shuchkin\SimpleXLSXGen;

class MovementLogBookController extends Controller
{
    use PaginatesForInertia;
    use ResolvesLogBookScopeView;

    // ─── Filter keys ──────────────────────────────────────────────
    private function logBookFilterKeys(): array
    {
        return [
            'payment_status', 'department_id', 'employee_id', 'zone_id',
            'regional_office_id', 'branch_id', 'from_date', 'to_date',
            'search', 'per_page', 'page', 'view',
        ];
    }

    private function filledFilter(Request $request, string $key): bool
    {
        $value = $request->input($key);

        return $value !== null && $value !== '' && $value !== 'all';
    }

    // ─── Build query ──────────────────────────────────────────────
    private function buildLogBookQuery(Request $request, User $user, array $scope)
    {
        $query = MovementLogBook::query()
            ->with([
                'employee:id,employee_id,pin,name_en,department_id,designation_id,current_branch_id',
                'employee.department:id,name',
                'employee.designation:id,name',
                'employee.branch:id,name,branch_code,is_head_office,regional_office_id',
                'employee.branch.regionalOffice:id,zone_id',
                'paymentBatch:id,voucher_no,status,period_year,period_month',
                'movement:id,movement_type,status',
            ]);

        $this->constrainVisibleLogBooks($query, $user);
        $this->applyLogBookScopeView($query, $user, $scope['view'], $scope['showTabs']);
        $this->applyLogBookFilters($query, $request, $scope['view']);

        return $query;
    }

    private function applyLogBookFilters($query, Request $request, string $view = 'team'): void
    {
        $query
            ->when($request->filled('payment_status') && $request->payment_status !== 'all', function ($q) use ($request) {
                $q->where('payment_status', $request->payment_status);
            });

        if ($view !== 'mine') {
            $query
                ->when($request->filled('department_id') && $request->department_id !== 'all', function ($q) use ($request) {
                    $q->whereHas('employee', fn ($eq) => $eq->where('department_id', $request->department_id));
                })
                ->when($request->filled('employee_id') && $request->employee_id !== 'all', function ($q) use ($request) {
                    $q->where('employee_id', $request->employee_id);
                })
                ->when($request->filled('branch_id') && $request->branch_id !== 'all', function ($q) use ($request) {
                    $q->whereHas('employee', fn ($eq) => $eq->where('current_branch_id', $request->branch_id));
                })
                ->when(
                    $request->filled('regional_office_id') && $request->regional_office_id !== 'all'
                        && ! ($request->filled('branch_id') && $request->branch_id !== 'all'),
                    function ($q) use ($request) {
                        $q->whereHas('employee.branch', fn ($eq) => $eq->where('regional_office_id', $request->regional_office_id));
                    }
                )
                ->when(
                    $request->filled('zone_id') && $request->zone_id !== 'all'
                        && ! ($request->filled('branch_id') && $request->branch_id !== 'all')
                        && ! ($request->filled('regional_office_id') && $request->regional_office_id !== 'all'),
                    function ($q) use ($request) {
                        $q->whereHas('employee.branch.regionalOffice', fn ($eq) => $eq->where('zone_id', $request->zone_id));
                    }
                );
        }

        $query
            ->when($this->filledFilter($request, 'from_date'), function ($q) use ($request) {
                $q->whereDate('date', '>=', $request->input('from_date'));
            })
            ->when($this->filledFilter($request, 'to_date'), function ($q) use ($request) {
                $q->whereDate('date', '<=', $request->input('to_date'));
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('destination', 'like', "%{$search}%")
                        ->orWhere('purpose', 'like', "%{$search}%")
                        ->orWhere('start_place', 'like', "%{$search}%")
                        ->orWhereHas('employee', function ($eq) use ($search) {
                            $eq->where('name_en', 'like', "%{$search}%")
                                ->orWhere('pin', 'like', "%{$search}%")
                                ->orWhere('employee_id', 'like', "%{$search}%");
                        });
                });
            });
    }

    // ─── Filter summary for print ─────────────────────────────────
    private function logBookFilterSummary(Request $request, array $scope): string
    {
        $parts = [];

        if ($scope['showTabs'] || $scope['view'] === 'mine') {
            $parts[] = $scope['view'] === 'mine' ? 'My log book' : 'Team';
        }

        if ($this->filledFilter($request, 'from_date')) {
            $parts[] = 'From ' . $request->input('from_date');
        }
        if ($this->filledFilter($request, 'to_date')) {
            $parts[] = 'To ' . $request->input('to_date');
        }
        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $parts[] = 'Payment: ' . ucfirst((string) $request->payment_status);
        }
        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $branch = Branch::find($request->branch_id);
            $parts[] = 'Branch: ' . ($branch->name ?? $request->branch_id);
        }
        if ($request->search) {
            $parts[] = 'Search: ' . $request->search;
        }

        return $parts !== [] ? implode(' · ', $parts) : 'All entries';
    }

    // ─── Organization filter dropdowns ────────────────────────────
    private function getOrganizationFilters(User $user): array
    {
        $branchIds = OrganogramAccessService::accessibleBranchIdList($user);

        if ($branchIds === []) {
            return ['zones' => collect(), 'regionalOffices' => collect(), 'branches' => collect()];
        }

        $branchesQuery = Branch::query()->where('is_active', true)->orderBy('name')
            ->select(['id', 'name', 'branch_code', 'regional_office_id']);

        if ($branchIds !== null) {
            $branchesQuery->whereIn('id', $branchIds);
        }

        $branches = $branchesQuery->get();
        $roIds = $branches->pluck('regional_office_id')->filter()->unique()->values();

        $regionalOffices = $roIds->isEmpty() ? collect()
            : RegionalOffice::query()->whereIn('id', $roIds)->where('is_active', true)
                ->orderBy('name')->get(['id', 'name', 'code', 'zone_id']);

        $zoneIds = $regionalOffices->pluck('zone_id')->filter()->unique()->values();

        $zones = $zoneIds->isEmpty() ? collect()
            : Zone::query()->whereIn('id', $zoneIds)->where('is_active', true)
                ->orderBy('name')->get(['id', 'name', 'code']);

        return ['zones' => $zones, 'regionalOffices' => $regionalOffices, 'branches' => $branches];
    }

    private function getAccessibleDepartments(User $user)
    {
        $ids = OrganogramAccessService::accessibleDepartmentIdList($user);
        if ($ids === null) {
            return Department::query()->orderBy('name')->get();
        }

        return $ids === [] ? collect([]) : Department::query()->whereIn('id', $ids)->orderBy('name')->get();
    }

    private function getAccessibleEmployees(User $user)
    {
        $q = Employee::query()->where('status', 'active')->orderBy('name_en');
        OrganogramAccessService::constrainVisibleEmployees($q, $user);

        return $q->get();
    }

    private function getSingleAccessibleEmployeeSummary(User $user, ?Request $request = null): ?array
    {
        if ($request && $request->filled('employee_id') && $request->employee_id !== 'all') {
            $employee = Employee::query()
                ->with([
                    'department:id,name',
                    'designation:id,name',
                    'branch:id,name,branch_code',
                ])
                ->find($request->employee_id);

            if ($employee) {
                return [
                    'id' => $employee->id,
                    'name_en' => $employee->name_en,
                    'employee_id' => $employee->employee_id,
                    'pin' => $employee->pin,
                    'department' => $employee->department ? [
                        'id' => $employee->department->id,
                        'name' => $employee->department->name,
                    ] : null,
                    'designation' => $employee->designation ? [
                        'id' => $employee->designation->id,
                        'name' => $employee->designation->name,
                    ] : null,
                    'branch' => $employee->branch ? [
                        'id' => $employee->branch->id,
                        'name' => $employee->branch->name,
                        'branch_code' => $employee->branch->branch_code,
                    ] : null,
                ];
            }
        }

        /** @var Builder $employees */
        $employees = Employee::query();
        $employees
            ->where('status', 'active')
            ->with([
                'department:id,name',
                'designation:id,name',
                'branch:id,name,branch_code',
            ])
            ->orderBy('name_en');

        OrganogramAccessService::constrainVisibleEmployees($employees, $user);

        $visibleEmployees = $employees->limit(2)->get([
            'id',
            'name_en',
            'employee_id',
            'pin',
            'department_id',
            'designation_id',
            'current_branch_id',
        ]);

        if ($visibleEmployees->count() !== 1) {
            return null;
        }

        $employee = $visibleEmployees->first();

        return $this->formatEmployeeSummary($employee);
    }

    private function viewerEmployeeSummary(User $user): ?array
    {
        if (! $user->employee_id) {
            return null;
        }

        $employee = Employee::query()
            ->with([
                'department:id,name',
                'designation:id,name',
                'branch:id,name,branch_code',
            ])
            ->find($user->employee_id);

        return $employee ? $this->formatEmployeeSummary($employee) : null;
    }

    private function formatEmployeeSummary(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'name_en' => $employee->name_en,
            'employee_id' => $employee->employee_id,
            'pin' => $employee->pin,
            'department' => $employee->department ? [
                'id' => $employee->department->id,
                'name' => $employee->department->name,
            ] : null,
            'designation' => $employee->designation ? [
                'id' => $employee->designation->id,
                'name' => $employee->designation->name,
            ] : null,
            'branch' => $employee->branch ? [
                'id' => $employee->branch->id,
                'name' => $employee->branch->name,
                'branch_code' => $employee->branch->branch_code,
            ] : null,
        ];
    }

    // ─── Index ────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);

        if (! $request->filled('from_date') && ! $request->filled('to_date') && ! $request->filled('search')) {
            $request->merge([
                'from_date' => now()->startOfMonth()->toDateString(),
                'to_date' => now()->endOfMonth()->toDateString(),
            ]);
        }

        $scope = $this->resolveLogBookScopeView($request, $user);
        $isMine = $scope['view'] === 'mine';
        $query = $this->buildLogBookQuery($request, $user, $scope);

        $summaryQuery = clone $query;
        $summary = [
            'total' => $summaryQuery->count(),
            'unpaid' => (clone $summaryQuery)->where('payment_status', 'unpaid')->count(),
            'paid' => (clone $summaryQuery)->where('payment_status', 'paid')->count(),
            'totalKm' => round((float) (clone $summaryQuery)->sum('distance_km'), 2),
            'officialKm' => round((float) (clone $summaryQuery)->sum('official_km'), 2),
            'personalKm' => round((float) (clone $summaryQuery)->sum('personal_km'), 2),
        ];

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $logBooks = $query->orderByDesc('date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $orgFilters = $isMine
            ? ['zones' => collect(), 'regionalOffices' => collect(), 'branches' => collect()]
            : $this->getOrganizationFilters($user);

        $singleEmployee = $isMine
            ? $this->viewerEmployeeSummary($user)
            : $this->getSingleAccessibleEmployeeSummary($user, $request);

        return Inertia::render('movement/log-book/index', [
            'logBooks' => $this->inertiaPagination($logBooks),
            'summary' => $summary,
            'departments' => $isMine ? collect() : $this->getAccessibleDepartments($user),
            'employees' => $isMine ? collect() : $this->getAccessibleEmployees($user),
            'singleEmployee' => $singleEmployee,
            'zones' => $orgFilters['zones'],
            'regionalOffices' => $orgFilters['regionalOffices'],
            'branches' => $orgFilters['branches'],
            'filters' => $request->only($this->logBookFilterKeys()),
            'ratePerKm' => (float) config('movement_log_book.rate_per_km', 5),
            'canManageLogBook' => $user->isSuperAdmin(),
            'scopeView' => $scope['view'],
            'showScopeTabs' => $scope['showTabs'],
        ]);
    }

    // ─── Print ────────────────────────────────────────────────────
    public function printIndex(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);

        $scope = $this->resolveLogBookScopeView($request, $user);
        $logBooks = $this->buildLogBookQuery($request, $user, $scope)
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        $singleEmployee = $scope['view'] === 'mine'
            ? $this->viewerEmployeeSummary($user)
            : $this->getSingleAccessibleEmployeeSummary($user, $request);

        return Inertia::render('movement/log-book/print', [
            'logBooks' => $logBooks,
            'filterSummary' => $this->logBookFilterSummary($request, $scope),
            'generatedAt' => now()->toIso8601String(),
            'companyName' => config('payroll_reports.company_name', config('app.name')),
            'companyAddress' => config('payroll_reports.company_address', ''),
            'singleEmployee' => $singleEmployee,
        ]);
    }

    // ─── XLSX export ──────────────────────────────────────────────
    public function exportXlsx(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);

        $scope = $this->resolveLogBookScopeView($request, $user);
        $logBooks = $this->buildLogBookQuery($request, $user, $scope)
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        $rows = [[
            'Date',
            'PIN',
            'Employee',
            'Branch',
            'Department',
            'Designation',
            'Start Place',
            'Destination',
            'Purpose',
            'Start Time',
            'Return Time',
            'Start Meter',
            'End Meter',
            'Total KM',
            'Personal KM',
            'Official KM',
            'Work Result',
            'Payment Status',
        ]];

        foreach ($logBooks as $lb) {
            $emp = $lb->employee;
            $rows[] = [
                Carbon::parse($lb->date)->format('Y-m-d'),
                (string) ($emp->pin ?? $emp->employee_id ?? ''),
                (string) ($emp->name_en ?? ''),
                (string) ($emp->branch->name ?? ''),
                (string) ($emp->department->name ?? ''),
                (string) ($emp->designation->name ?? ''),
                (string) $lb->start_place,
                (string) ($lb->destination ?? ''),
                (string) $lb->purpose,
                Carbon::parse($lb->start_time)->format('Y-m-d H:i'),
                Carbon::parse($lb->return_time)->format('Y-m-d H:i'),
                (float) $lb->start_meter_reading,
                (float) $lb->end_meter_reading,
                (float) $lb->distance_km,
                $lb->personal_km !== null ? (float) $lb->personal_km : 0,
                (float) ($lb->official_km ?? $lb->distance_km),
                (string) ($lb->work_result ?? ''),
                ucfirst((string) ($lb->payment_status ?? 'unpaid')),
            ];
        }

        $path = tempnam(sys_get_temp_dir(), 'logbook-xlsx-');
        if ($path === false) {
            abort(500, 'Could not create export file.');
        }

        SimpleXLSXGen::fromArray($rows)->saveAs($path);
        $content = file_get_contents($path);
        @unlink($path);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="log-book-register-' . now()->format('Y-m-d-His') . '.xlsx"',
        ]);
    }

    // ─── Show ─────────────────────────────────────────────────────
    public function show(MovementLogBook $logBook)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);
        abort_unless($this->userCanViewLogBook($user, $logBook), 403);

        $logBook->load([
            'employee.department',
            'employee.designation',
            'employee.branch',
            'paymentBatch.processor:id,name',
            'paymentBatch.approver:id,name',
            'movement',
        ]);

        return Inertia::render('movement/log-book/show', [
            'logBook' => $logBook,
            'ratePerKm' => (float) config('movement_log_book.rate_per_km', 5),
            'canManageLogBook' => $this->userCanManageLogBook($user, $logBook),
        ]);
    }

    public function edit(MovementLogBook $logBook)
    {
        $user = Auth::user();
        abort_unless($user->hasPermission('movements.view'), 403);
        abort_unless($this->userCanManageLogBook($user, $logBook), 403);

        $logBook->load([
            'employee.department',
            'employee.designation',
            'employee.branch',
        ]);

        return Inertia::render('movement/log-book/edit', [
            'logBook' => $logBook,
            'ratePerKm' => (float) config('movement_log_book.rate_per_km', 5),
        ]);
    }

    public function update(Request $request, MovementLogBook $logBook)
    {
        $user = Auth::user();
        abort_unless($this->userCanManageLogBook($user, $logBook), 403);

        $validated = $request->validate([
            'start_place' => 'required|string|max:255',
            'destination' => 'nullable|string|max:255',
            'purpose' => 'required|string|max:500',
            'work_result' => 'nullable|string|max:5000',
            'start_meter_reading' => 'required|numeric|min:0',
            'end_meter_reading' => 'required|numeric|gt:start_meter_reading',
            'personal_km' => 'nullable|numeric|min:0',
        ]);

        $startReading = (float) $validated['start_meter_reading'];
        $endReading = (float) $validated['end_meter_reading'];
        $totalKm = round($endReading - $startReading, 2);
        $personalKm = isset($validated['personal_km']) && $validated['personal_km'] !== ''
            ? round((float) $validated['personal_km'], 2)
            : null;

        if ($personalKm !== null && $personalKm > $totalKm) {
            return redirect()->back()->withErrors(['personal_km' => 'Personal KM cannot exceed total distance.'])->withInput();
        }

        $officialKm = round($totalKm - ($personalKm ?? 0), 2);
        $paymentId = $logBook->log_book_payment_id;

        DB::beginTransaction();
        try {
            $logBook->update([
                'start_place' => trim($validated['start_place']),
                'destination' => $validated['destination'] ?? null,
                'purpose' => trim($validated['purpose']),
                'work_result' => $validated['work_result'] ?? null,
                'start_meter_reading' => $startReading,
                'end_meter_reading' => $endReading,
                'distance_km' => $totalKm,
                'personal_km' => $personalKm,
                'official_km' => $officialKm,
            ]);

            if ($paymentId) {
                $payment = MovementLogBookPayment::find($paymentId);
                if ($payment && $payment->status === 'pending') {
                    $this->syncPendingPaymentBatch($payment);
                }
            }

            DB::commit();

            return redirect()->route('movement-log-books.show', $logBook)
                ->with('success', 'Log book register entry updated.');
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Could not update log book entry.')->withInput();
        }
    }

    public function destroy(MovementLogBook $logBook)
    {
        $user = Auth::user();
        abort_unless($this->userCanManageLogBook($user, $logBook), 403);

        $paymentId = $logBook->log_book_payment_id;

        DB::beginTransaction();
        try {
            $logBook->delete();

            if ($paymentId) {
                $payment = MovementLogBookPayment::find($paymentId);
                if ($payment && $payment->status === 'pending') {
                    $this->syncPendingPaymentBatch($payment);
                }
            }

            DB::commit();

            return redirect()->route('movement-log-books.index')
                ->with('success', 'Log book register entry deleted.');
        } catch (\Throwable $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Could not delete log book entry.');
        }
    }

    // ─── Visibility ───────────────────────────────────────────────
    private function constrainVisibleLogBooks($query, User $user): void
    {
        if ($user->isSuperAdmin() || $user->hasPermission('employees.admin') || $user->hasPermission('movements.edit')) {
            return;
        }

        if ($user->hasPermission('movements.view')) {
            OrganogramAccessService::constrainViaEmployeeRelation($query, $user, 'employee');

            return;
        }

        if ($user->employee_id) {
            $query->where('employee_id', $user->employee_id);

            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function userCanViewLogBook(User $user, MovementLogBook $logBook): bool
    {
        if ($user->isSuperAdmin() || $user->hasPermission('employees.admin') || $user->hasPermission('movements.edit')) {
            return true;
        }

        return OrganogramAccessService::userCanSeeEmployee($user, (int) $logBook->employee_id);
    }

    private function userCanManageLogBook(User $user, MovementLogBook $logBook): bool
    {
        return $user->isSuperAdmin() && $logBook->payment_status === 'unpaid';
    }

    private function syncPendingPaymentBatch(MovementLogBookPayment $payment): void
    {
        if ($payment->status !== 'pending') {
            return;
        }

        $entries = MovementLogBook::query()
            ->where('log_book_payment_id', $payment->id)
            ->get();

        if ($entries->isEmpty()) {
            $payment->delete();

            return;
        }

        $totalOfficialKm = round((float) $entries->sum('official_km'), 2);
        $rate = (float) $payment->rate_per_km;

        $payment->update([
            'total_official_km' => $totalOfficialKm,
            'total_amount' => round($totalOfficialKm * $rate, 2),
            'entry_count' => $entries->count(),
        ]);
    }

}
