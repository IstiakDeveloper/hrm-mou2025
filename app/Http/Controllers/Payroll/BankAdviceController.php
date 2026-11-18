<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\PayrollBankAdvice;
use App\Models\PayrollRun;
use App\Models\Project;
use App\Services\BankAdviceService;
use App\Support\PayrollReportPrintPdf;
use App\Support\PayrollReportXlsxExporter;
use App\Support\ProjectPdf;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BankAdviceController extends Controller
{
    public function __construct(protected BankAdviceService $service) {}

    protected function authorizeOffice(Request $request): void
    {
        abort_if($request->user()?->isBranchAccount(), 403, 'Bank advices are managed by the payroll office.');
    }

    public function index(Request $request)
    {
        $this->authorizeOffice($request);
        $filters = $request->validate(['year' => 'nullable|integer|min:2000|max:2200', 'month' => 'nullable|integer|min:1|max:12']);
        $records = PayrollBankAdvice::query()->select(['id', 'year', 'month', 'reference_prefix', 'reference_year', 'reference_number', 'issue_date', 'total', 'created_at'])
            ->when($filters['year'] ?? null, fn ($q, $value) => $q->where('year', $value))
            ->when($filters['month'] ?? null, fn ($q, $value) => $q->where('month', $value))
            ->orderByDesc('year')->orderByDesc('month')->orderByDesc('id')->paginate(20)->withQueryString();

        return Inertia::render('payroll/bank-advice/index', [
            'records' => $records, 'filters' => $filters,
            'canEdit' => $request->user()?->hasPermission('payroll.edit') ?? false,
            'canDelete' => $request->user()?->isSuperAdmin() ?? false,
        ]);
    }

    public function create(Request $request)
    {
        $this->authorizeOffice($request);
        $defaults = $this->service->defaults();
        $periods = $this->periods();

        return Inertia::render('payroll/bank-advice/form', array_merge($this->formOptions(), [
            'advice' => null,
            'initial' => array_merge($defaults, [
                'year' => $periods[0]['year'] ?? (int) now()->year,
                'month' => $periods[0]['month'] ?? (int) now()->month,
                'reference_year' => now()->format('Y'),
                'reference_number' => $this->service->nextReferenceNumber(now()->format('Y'), $defaults['reference_prefix']),
                'issue_date' => now()->format('Y-m-d'), 'branch_id' => '', 'project_id' => '',
                'include_account_list' => false,
            ]),
        ]));
    }

    public function store(Request $request)
    {
        $this->authorizeOffice($request);
        $data = $this->validated($request);
        try {
            $advice = $this->service->generate($data, $request->user()?->id);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['reference_number' => 'This reference was just used. Enter another reference number.']);
        }

        return redirect()->route('payroll.bank-advice.show', $advice)->with('success', 'Bank advice generated and saved.');
    }

    public function saveDefaults(Request $request)
    {
        $this->authorizeOffice($request);
        $this->service->saveDefaults($this->validated($request, settingsOnly: true));

        return back()->with('success', 'Bank information and signatory defaults saved.');
    }

    public function show(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);

        return Inertia::render('payroll/bank-advice/show', [
            'advice' => $advice,
            'canEdit' => $request->user()?->hasPermission('payroll.edit') ?? false,
            'canExport' => $request->user()?->hasPermission('reports.export') ?? false,
            'canDelete' => $request->user()?->isSuperAdmin() ?? false,
        ]);
    }

    public function edit(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);

        return Inertia::render('payroll/bank-advice/form', array_merge($this->formOptions(), [
            'advice' => $advice,
            'initial' => array_merge($advice->details, $advice->only([
                'year', 'month', 'branch_id', 'project_id', 'reference_prefix', 'reference_year', 'reference_number', 'signatories', 'include_account_list',
            ]), ['issue_date' => $advice->issue_date->format('Y-m-d')]),
        ]));
    }

    public function update(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);
        $data = $this->validated($request, $advice);
        try {
            $this->service->update($advice, $data);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['reference_number' => 'This reference was just used. Enter another reference number.']);
        }

        return redirect()->route('payroll.bank-advice.show', $advice)->with('success', 'Bank advice updated.');
    }

    public function print(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);

        return view('payroll.bank-advice.document', ['advice' => $advice, 'printMode' => true]);
    }

    public function destroy(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);
        abort_unless($request->user()?->isSuperAdmin(), 403, 'Only a superadmin may delete saved bank advices.');
        $advice->delete();

        return redirect()->route('payroll.bank-advice.index')->with('success', 'Bank advice deleted.');
    }

    public function preview(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);

        return view('payroll.bank-advice.document', ['advice' => $advice]);
    }

    public function pdf(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);
        $html = view('payroll.bank-advice.document', ['advice' => $advice])->render();
        $filename = 'bank-advice-'.$advice->year.'-'.str_pad((string) $advice->month, 2, '0', STR_PAD_LEFT).'-'.$advice->id.'.pdf';
        if (PayrollReportPrintPdf::canGenerate()) {
            try {
                return response(PayrollReportPrintPdf::generate($html), 200, [
                    'Content-Type' => 'application/pdf', 'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                ]);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return ProjectPdf::loadHTML($html)->setOption('defaultMediaType', 'print')->setPaper('a4', 'portrait')->download($filename);
    }

    public function excel(Request $request, PayrollBankAdvice $advice)
    {
        $this->authorizeOffice($request);
        abort_unless($advice->include_account_list, 403, 'Enable the Salary Transfer Account List on this advice before exporting it.');
        $rows = array_map(fn ($entry) => [
            'pin' => implode(', ', $entry['pins']), 'name' => implode(', ', $entry['names']),
            'net' => $entry['amount'], 'account_no' => $entry['account_no'],
            'remarks' => 'Salary for the Month of '.$advice->salary_month.' | '.$entry['bank_name'].' | Ref: '.$advice->reference,
        ], $advice->entries);

        return PayrollReportXlsxExporter::download('bank-advice-'.$advice->id.'.xlsx', 'salary-summary', [
            'rows' => $rows, 'totals' => ['net' => (float) $advice->total], 'in_words' => $advice->in_words,
            'salary_month' => $advice->salary_month, 'issue_date' => $advice->issue_date->format('d/m/Y'),
            'amount_decimals' => 2,
        ], ['title' => 'Bank Advice - '.$advice->reference, 'companyName' => $advice->details['account_name']]);
    }

    protected function periods(): array
    {
        return PayrollRun::query()->where('salary_type', 'salary')->where('status', 'posted')
            ->select(['year', 'month'])->distinct()->orderByDesc('year')->orderByDesc('month')->get()->toArray();
    }

    protected function formOptions(): array
    {
        return [
            'periods' => $this->periods(),
            'branches' => Branch::query()->where('is_active', true)->orderBy('branch_code')->get(['id', 'name', 'branch_code']),
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
            'employees' => $this->service->employees()->map(fn ($employee) => [
                'id' => $employee->id, 'name' => $employee->name_en, 'pin' => $employee->pin,
                'designation' => $employee->designation?->name ?? '',
            ]),
        ];
    }

    protected function validated(Request $request, ?PayrollBankAdvice $advice = null, bool $settingsOnly = false): array
    {
        $request->merge(['reference_prefix' => rtrim(trim((string) $request->input('reference_prefix')), '/')]);
        $referenceUnique = Rule::unique('payroll_bank_advices', 'reference_number')
            ->where('reference_year', $request->input('reference_year'))
            ->where('reference_prefix', $request->input('reference_prefix'));
        if ($advice !== null) {
            $referenceUnique->ignore($advice->id);
        }
        $rules = [
            'year' => $advice ? 'sometimes|integer|min:2000|max:2200' : 'required|integer|min:2000|max:2200',
            'month' => $advice ? 'sometimes|integer|min:1|max:12' : 'required|integer|min:1|max:12',
            'branch_id' => 'nullable|integer|exists:branches,id', 'project_id' => 'nullable|integer|exists:projects,id',
            'reference_prefix' => 'required|string|max:100', 'reference_year' => 'required|digits:4',
            'reference_number' => ['required', 'string', 'regex:/^\d{1,9}$/', $referenceUnique],
            'issue_date' => 'required|date_format:Y-m-d',
            'bank_name' => 'required|string|max:200', 'bank_branch' => 'required|string|max:200',
            'bank_address' => 'nullable|string|max:1000', 'account_no' => 'required|string|max:80',
            'account_type' => 'required|string|max:50', 'account_name' => 'required|string|max:200',
            'signatories' => 'required|array|min:1|max:3',
            'signatories.*.employee_id' => 'nullable|integer|exists:employees,id',
            'signatories.*.name' => 'nullable|string|max:200',
            'signatories.*.designation' => 'nullable|string|max:200',
            'signatories.*.organization' => 'nullable|string|max:200',
            'save_defaults' => 'boolean',
            'include_account_list' => 'boolean',
        ];
        if ($settingsOnly) {
            foreach (['year', 'month', 'branch_id', 'project_id', 'reference_year', 'reference_number', 'issue_date'] as $field) {
                unset($rules[$field]);
            }
        }
        $data = $request->validate($rules);
        if (! collect($data['signatories'])->contains(fn ($signer) => trim($signer['name'] ?? '') !== '')) {
            throw ValidationException::withMessages(['signatories' => 'Set at least one signatory name.']);
        }

        return $data;
    }
}
