<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\EmployeeGratuityPayment;
use App\Services\EmployeeGratuityService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GratuityController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected EmployeeGratuityService $gratuityService,
    ) {}

    public function index(Request $request)
    {
        $asOf = $request->filled('as_of') ? Carbon::parse($request->input('as_of')) : Carbon::today();
        $search = trim((string) $request->input('search', ''));
        $eligibility = (string) $request->input('eligibility', 'all');
        if (! in_array($eligibility, ['all', 'eligible', 'not_eligible'], true)) {
            $eligibility = 'all';
        }

        $paymentStatus = (string) $request->input('payment_status', 'all');
        if (! in_array($paymentStatus, ['all', 'unpaid', 'pending', 'paid'], true)) {
            $paymentStatus = 'all';
        }

        $rows = Employee::query()
            ->with(['branch:id,name', 'department:id,name', 'designation:id,name', 'salaryStep:id,basic_salary'])
            ->when($request->filled('branch_id'), fn ($q) => $q->where('current_branch_id', $request->integer('branch_id')))
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('employee_id'), fn ($q) => $q->whereKey($request->integer('employee_id')))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('pin', 'like', "%{$search}%")
                        ->orWhere('name_en', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->whereIn('status', ['active', 'on_leave', 'inactive', 'terminated'])
            ->whereNotNull('joining_date')
            ->orderBy('pin')
            ->limit(300)
            ->get();

        $employeeIds = $rows->pluck('id');

        $gratuityPayments = EmployeeGratuityPayment::query()
            ->whereIn('employee_id', $employeeIds)
            ->orderByDesc('id')
            ->get()
            ->groupBy('employee_id');

        $rows = $rows->map(function (Employee $employee) use ($asOf, $gratuityPayments) {
                $calc = $this->gratuityService->calculate($employee, $asOf);
                $payments = $gratuityPayments->get($employee->id, collect());

                $paidRecord = $payments->firstWhere('status', 'paid');
                $pendingRecord = $payments->first(
                    fn (EmployeeGratuityPayment $p) => in_array($p->status, ['calculated', 'approved'], true)
                );

                $paymentState = $paidRecord ? 'paid' : ($pendingRecord ? 'pending' : 'unpaid');

                $serviceEndLabel = null;
                if ($employee->dropout_date) {
                    $serviceEndLabel = 'Dropout: '.$employee->dropout_date->format('d-m-Y');
                } elseif ($employee->resignation_date) {
                    $serviceEndLabel = 'Resigned: '.$employee->resignation_date->format('d-m-Y');
                } elseif (in_array($employee->status, ['terminated', 'inactive'], true)) {
                    $serviceEndLabel = ucfirst(str_replace('_', ' ', (string) $employee->status));
                }

                return [
                    'id' => $employee->id,
                    'pin' => $employee->pin,
                    'name_en' => $employee->name_en,
                    'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
                    'employment_status' => $employee->status,
                    'service_end_hint' => $serviceEndLabel,
                    'branch' => $employee->branch?->name,
                    'department' => $employee->department?->name,
                    'designation' => $employee->designation?->name,
                    'joining_date' => $employee->joining_date?->format('d-m-Y'),
                    'service_end_date' => Carbon::parse($calc['service_end'])->format('d-m-Y'),
                    'completed_years' => $calc['completed_years'],
                    'basic_salary' => $calc['basic_salary'],
                    'basic_multiplier' => $calc['basic_multiplier'],
                    'gratuity_amount' => $calc['gratuity_amount'],
                    'eligible' => $calc['eligible'],
                    'tier_label' => $calc['label'],
                    'payment_state' => $paymentState,
                    'paid_amount' => $paidRecord ? (float) $paidRecord->gratuity_amount : null,
                    'paid_on' => $paidRecord?->payment_date?->format('d-m-Y'),
                    'paid_service_end' => $paidRecord?->service_end_date?->format('d-m-Y'),
                ];
            });

        if ($eligibility === 'eligible') {
            $rows = $rows->filter(fn (array $row) => $row['eligible'])->values();
        } elseif ($eligibility === 'not_eligible') {
            $rows = $rows->filter(fn (array $row) => ! $row['eligible'])->values();
        }

        if ($paymentStatus === 'paid') {
            $rows = $rows->filter(fn (array $row) => $row['payment_state'] === 'paid')->values();
        } elseif ($paymentStatus === 'pending') {
            $rows = $rows->filter(fn (array $row) => $row['payment_state'] === 'pending')->values();
        } elseif ($paymentStatus === 'unpaid') {
            $rows = $rows->filter(fn (array $row) => $row['payment_state'] === 'unpaid')->values();
        }

        return Inertia::render('payroll/gratuity/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'as_of' => $asOf->toDateString(),
                'search' => $search,
                'eligibility' => $eligibility,
                'payment_status' => $paymentStatus,
            ]),
            'rows' => $rows,
            'tiers' => config('payroll.gratuity_tiers', []),
        ]);
    }

    public function rules()
    {
        return Inertia::render('payroll/gratuity/rules', [
            'tiers' => collect(config('payroll.gratuity_tiers', []))
                ->sortBy('min_years')
                ->values()
                ->all(),
        ]);
    }

    public function payments(Request $request)
    {
        $records = EmployeeGratuityPayment::query()
            ->with(['employee:id,pin,name_en'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (EmployeeGratuityPayment $p) => [
                'id' => $p->id,
                'employee_label' => trim(($p->employee?->pin ?? '').' — '.($p->employee?->name_en ?? '')),
                'employee_id' => $p->employee_id,
                'service_end_date' => $p->service_end_date?->format('d-m-Y'),
                'completed_years' => $p->completed_years,
                'basic_multiplier' => $p->basic_multiplier,
                'gratuity_amount' => (float) $p->gratuity_amount,
                'status' => $p->status,
                'payment_date' => $p->payment_date?->format('d-m-Y'),
                'payment_reference' => $p->payment_reference,
            ]);

        return Inertia::render('payroll/gratuity/payments', [
            'records' => $records,
            'filters' => ['status' => $request->input('status', '')],
        ]);
    }

    public function show(Request $request, Employee $employee)
    {
        $employee->load(['branch:id,name', 'department:id,name']);

        $defaultAsOf = $employee->dropout_date
            ?? $employee->resignation_date
            ?? Carbon::today();

        $asOf = $request->filled('as_of') ? Carbon::parse($request->input('as_of')) : Carbon::parse($defaultAsOf);
        $calc = $this->gratuityService->calculate($employee, $asOf);

        $payments = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (EmployeeGratuityPayment $p) => [
                'id' => $p->id,
                'service_end_date' => $p->service_end_date?->format('d-m-Y'),
                'completed_years' => $p->completed_years,
                'basic_multiplier' => $p->basic_multiplier,
                'gratuity_amount' => (float) $p->gratuity_amount,
                'status' => $p->status,
                'payment_date' => $p->payment_date?->format('d-m-Y'),
                'payment_reference' => $p->payment_reference,
                'notes' => $p->notes,
            ]);

        $hasPaid = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'paid')
            ->whereDate('service_end_date', Carbon::parse($calc['service_end'])->toDateString())
            ->exists();

        return Inertia::render('payroll/gratuity/show', [
            'employee' => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
                'branch' => $employee->branch?->name,
                'department' => $employee->department?->name,
                'joining_date' => $employee->joining_date?->format('d-m-Y'),
                'employment_status' => $employee->status,
                'resignation_date' => $employee->resignation_date?->format('Y-m-d'),
                'dropout_date' => $employee->dropout_date?->format('Y-m-d'),
            ],
            'filters' => ['as_of' => $asOf->toDateString()],
            'calculation' => $calc,
            'payments' => $payments,
            'has_paid' => $hasPaid,
            'tiers' => config('payroll.gratuity_tiers', []),
        ]);
    }

    public function storePayment(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'as_of' => 'required|date',
            'payment_date' => 'required|date',
            'payment_reference' => 'nullable|string|max:64',
            'notes' => 'required|string|max:2000',
        ]);

        $asOf = Carbon::parse($validated['as_of']);
        $calc = $this->gratuityService->calculate($employee, $asOf);

        if (! $calc['eligible']) {
            return back()->withErrors(['as_of' => 'Employee is not eligible for gratuity on this service end date.']);
        }

        $serviceEnd = Carbon::parse($calc['service_end'])->toDateString();

        $alreadyPaid = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'paid')
            ->whereDate('service_end_date', $serviceEnd)
            ->exists();

        if ($alreadyPaid) {
            return back()->withErrors([
                'as_of' => 'Gratuity for this service end date is already marked as paid.',
            ]);
        }

        EmployeeGratuityPayment::query()->create([
            'employee_id' => $employee->id,
            'service_end_date' => $serviceEnd,
            'completed_years' => $calc['completed_years'],
            'basic_salary_used' => $calc['basic_salary'],
            'basic_multiplier' => $calc['basic_multiplier'],
            'gratuity_amount' => $calc['gratuity_amount'],
            'payment_date' => $validated['payment_date'],
            'payment_reference' => $validated['payment_reference'] ?? null,
            'status' => 'paid',
            'notes' => $validated['notes'],
            'created_by' => auth()->id(),
        ]);

        return redirect()
            ->route('gratuity.show', $employee)
            ->with('success', 'Gratuity payment recorded. Employee will show as Paid on the entitlement list.');
    }
}
