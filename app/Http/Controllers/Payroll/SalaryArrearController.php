<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\PayrollRun;
use App\Models\PayslipLine;
use App\Services\ArrearPayrollService;
use App\Support\BranchOrganogram;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SalaryArrearController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected ArrearPayrollService $arrears,
    ) {}

    public function index(Request $request)
    {
        $options = $this->payrollFilterOptions();
        $year = $request->filled('year') ? $request->integer('year') : (int) date('Y');
        $month = $request->filled('month') ? $request->integer('month') : (int) date('n');

        $runs = PayrollRun::query()
            ->with('branch:id,name,branch_code')
            ->where('salary_type', 'salary')
            ->whereIn('status', ['processed', 'posted'])
            ->where('year', $year)
            ->where('month', $month)
            ->when($request->filled('branch_id'), fn ($query) => $query->where('branch_id', $request->integer('branch_id')))
            ->get()
            ->sort(fn (PayrollRun $a, PayrollRun $b) => BranchOrganogram::compareBranches($a->branch, $b->branch))
            ->values();

        $arrearTotals = $this->arrearTotals($runs->pluck('id')->all());

        $rows = $runs->map(function (PayrollRun $run) use ($arrearTotals) {
            $open = $run->status === 'processed';

            return [
                'id' => $run->id,
                'branch_id' => $run->branch_id ? (int) $run->branch_id : null,
                'branch' => $this->branchLabel($run),
                'status' => $run->status,
                'open' => $open,
                'employee_count' => (int) $run->employee_count,
                'arrear_total' => (float) ($arrearTotals[$run->id] ?? 0),
                'processed_at' => $run->processed_at?->format('d-m-Y H:i'),
                'posted_at' => $run->posted_at?->format('d-m-Y H:i'),
            ];
        })->all();

        return Inertia::render('payroll/salary-arrear/index', [
            'filters' => [
                'year' => (string) $year,
                'month' => (string) $month,
                'branch_id' => $request->input('branch_id', ''),
            ],
            'period_label' => $this->periodLabel($year, $month),
            'rows' => $rows,
            'branches' => $options['branches'],
            'months' => $options['months'],
            'years' => $options['years'],
            'canEdit' => $request->user()?->hasPermission('payroll.edit') ?? false,
        ]);
    }

    public function period(Request $request, int $year, int $month)
    {
        $options = $this->payrollFilterOptions();
        $runs = PayrollRun::query()
            ->with([
                'branch:id,name,branch_code',
                'payslips' => fn ($query) => $this->payslipQuery($query),
            ])
            ->where('salary_type', 'salary')
            ->where('year', $year)
            ->where('month', $month)
            ->whereIn('status', ['processed', 'posted'])
            ->get()
            ->sort(fn (PayrollRun $a, PayrollRun $b) => BranchOrganogram::compareBranches($a->branch, $b->branch))
            ->values();

        $openRuns = $runs->where('status', 'processed')->values();
        $postedRuns = $runs->where('status', 'posted')->values();
        $payslips = $openRuns->flatMap(fn (PayrollRun $run) => $run->payslips);

        return Inertia::render('payroll/salary-arrear/period', [
            'period_label' => $this->periodLabel($year, $month),
            'year' => $year,
            'month' => $month,
            'rows' => $this->arrears->rowsForPayslips($payslips),
            'posted_branches' => $postedRuns->map(fn (PayrollRun $run) => $this->branchLabel($run))->values()->all(),
            'branches' => $openRuns->map(fn (PayrollRun $run) => [
                'id' => (int) $run->branch_id,
                'name' => $this->branchLabel($run),
            ])->unique('id')->values()->all(),
            'departments' => $options['departments'],
            'projects' => $options['projects'],
            'initial_branch_id' => $request->input('branch_id', ''),
            'canEdit' => $openRuns->isNotEmpty() && ($request->user()?->hasPermission('payroll.edit') ?? false),
        ]);
    }

    public function apply(Request $request)
    {
        if (! $request->user()?->hasPermission('payroll.edit')) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'rows' => 'You do not have permission to adjust arrear.',
            ]);
        }

        $validated = $request->validate([
            'rows' => 'nullable|array',
            'rows.*.payslip_id' => 'required|integer',
            'rows.*.amount' => 'required|numeric|min:0.01',
            'rows.*.note' => 'nullable|string|max:255',
            'rows.*.line_ids' => 'nullable|array',
            'rows.*.line_ids.*' => 'integer',
            'clear_payslip_ids' => 'nullable|array',
            'clear_payslip_ids.*' => 'integer',
        ]);

        $message = $this->arrears->applyMany(
            $validated['rows'] ?? [],
            $validated['clear_payslip_ids'] ?? [],
        );

        return redirect()->back()->with('success', $message);
    }

    public function show(Request $request, PayrollRun $payroll_run)
    {
        if ($payroll_run->salary_type !== 'salary' || ! in_array($payroll_run->status, ['processed', 'posted'], true)) {
            return redirect()
                ->route('salary-arrear.index')
                ->with('error', 'Arrear is only available for processed or posted salary.');
        }

        $payroll_run->load([
            'branch:id,name,branch_code',
            'payslips' => fn ($query) => $this->payslipQuery($query),
        ]);

        $open = $payroll_run->status === 'processed';

        if ($open) {
            return redirect()->route('salary-arrear.period', [
                'year' => $payroll_run->year,
                'month' => $payroll_run->month,
                'branch_id' => $payroll_run->branch_id,
            ]);
        }

        return Inertia::render('payroll/salary-arrear/show', [
            'run' => [
                'id' => $payroll_run->id,
                'year' => $payroll_run->year,
                'month' => $payroll_run->month,
                'period_label' => $this->periodLabel((int) $payroll_run->year, (int) $payroll_run->month),
                'branch' => $this->branchLabel($payroll_run),
                'status' => $payroll_run->status,
                'open' => $open,
            ],
            'rows' => $this->arrears->rowsForPayslips($payroll_run->payslips),
            'canEdit' => $open && ($request->user()?->hasPermission('payroll.edit') ?? false),
        ]);
    }

    /**
     * @param  list<int>  $runIds
     * @return array<int, float>
     */
    private function payslipQuery($query): void
    {
        $query->with([
            'employee:id,pin,name_en,department_id,project_id',
            'employee.department:id,name',
            'employee.project:id,name',
            'lines.head',
        ])->orderBy('employee_name');
    }

    /**
     * @param  list<int>  $runIds
     * @return array<int, float>
     */
    private function arrearTotals(array $runIds): array
    {
        if ($runIds === []) {
            return [];
        }

        return PayslipLine::query()
            ->join('payslips', 'payslips.id', '=', 'payslip_lines.payslip_id')
            ->whereIn('payslips.payroll_run_id', $runIds)
            ->where('payslip_lines.head_name', 'Arrear')
            ->groupBy('payslips.payroll_run_id')
            ->selectRaw('payslips.payroll_run_id as run_id, SUM(payslip_lines.computed_amount) as total')
            ->pluck('total', 'run_id')
            ->map(fn ($total) => (float) $total)
            ->all();
    }

    private function branchLabel(PayrollRun $run): string
    {
        $branch = $run->branch;
        if (! $branch) {
            return '—';
        }

        return trim($branch->name.(filled($branch->branch_code) ? ' ('.$branch->branch_code.')' : ''));
    }

    private function periodLabel(int $year, int $month): string
    {
        $names = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return ($names[$month] ?? $month).' '.$year;
    }
}
