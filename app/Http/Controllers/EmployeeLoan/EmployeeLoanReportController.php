<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Services\EmployeeLoanReportService;
use App\Support\EmployeeLoanReportCsvExporter;
use App\Support\PayrollReportPrintPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeLoanReportController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected EmployeeLoanReportService $reports,
    ) {}

    public function index()
    {
        $reports = collect(config('employee_loan_reports.reports', []))
            ->map(fn (array $config, string $slug) => [
                'slug' => $slug,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
            ])
            ->values()
            ->all();

        return Inertia::render('employee-loan/reports/index', [
            'reports' => $reports,
        ]);
    }

    public function show(Request $request, string $report)
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        $generated = $request->boolean('generate');
        $payload = null;
        [$filters, $error] = $this->applyReportFilterRules($config, $filters, $generated);

        if ($generated && ! $error) {
            $payload = $this->reports->build($report, $config, $filters);
        }

        return Inertia::render('employee-loan/reports/show', [
            'companyName' => config('employee_loan_reports.company_name'),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'requireEmployee' => (bool) ($config['require_employee'] ?? false),
            ],
            'filterOptions' => $this->reportFilterOptions(),
            'loanTypeOptions' => collect(config('employee_loans.loan_types', []))
                ->map(fn ($meta, $key) => ['value' => $key, 'label' => $meta['label']])
                ->values()
                ->all(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'as_of' => $request->input('as_of', date('Y-m-d')),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
                'loan_type' => $filters['loan_type'] ?? '',
                'loan_cycle' => $filters['loan_cycle'] ?? '',
                'loan_id' => $filters['loan_id'] ?? '',
            ]),
            'generated' => $generated,
            'payload' => $payload,
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'error' => $error,
            'exportUrls' => [
                'print' => route('employee-loan.reports.print', $report).'?'.$request->getQueryString(),
                'pdf' => route('employee-loan.reports.pdf', $report).'?'.$request->getQueryString(),
                'excel' => route('employee-loan.reports.excel', $report).'?'.$request->getQueryString(),
            ],
        ]);
    }

    public function print(Request $request, string $report)
    {
        return $this->renderDocument($request, $report, 'print');
    }

    public function pdf(Request $request, string $report)
    {
        $data = $this->documentData($request, $report);
        $html = view('employee-loan.reports.document', $data)->render();
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        try {
            if (! PayrollReportPrintPdf::canGenerate()) {
                throw new \RuntimeException('Chrome is not available for PDF export.');
            }

            $pdf = PayrollReportPrintPdf::generate($html);
        } catch (\Throwable $e) {
            report($e);

            $pdf = Pdf::loadHTML($html)
                ->setPaper('a4', $data['orientation'] ?? 'portrait')
                ->output();
        }

        return response()->make($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'public, must-revalidate, max-age=0',
        ]);
    }

    public function excel(Request $request, string $report): StreamedResponse
    {
        $data = $this->documentData($request, $report);
        $template = $data['payload']['template'] ?? 'loan-table';
        [$headers, $rows] = EmployeeLoanReportCsvExporter::rowsFromPayload($template, $data['payload']);
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.csv';

        return EmployeeLoanReportCsvExporter::download($filename, $headers, $rows);
    }

    /**
     * @return \Illuminate\View\View
     */
    protected function renderDocument(Request $request, string $report, string $mode)
    {
        $data = $this->documentData($request, $report);
        $data['printMode'] = $mode === 'print';

        return view('employee-loan.reports.document', $data);
    }

    /**
     * @return array<string, mixed>
     */
    protected function documentData(Request $request, string $report): array
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        [$filters, $error] = $this->applyReportFilterRules($config, $filters, true);

        if ($error) {
            abort(422, $error);
        }

        $payload = $this->reports->build($report, $config, $filters);

        $template = $payload['template'] ?? 'loan-table';
        $colCount = count($payload['columns'] ?? $payload['group_columns'] ?? []);

        if ($template === 'loan-statement-employee') {
            $colCount = 19;
        }

        return [
            'companyName' => config('employee_loan_reports.company_name'),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => $template === 'loan-installment-ledger'
                ? 'portrait'
                : ($colCount > 8 ? 'landscape' : 'portrait'),
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, string>  $filters
     * @return array{0: array<string, string>, 1: string|null}
     */
    protected function applyReportFilterRules(array $config, array $filters, bool $generated): array
    {
        if (! $generated) {
            return [$filters, null];
        }

        $isLedger = ($config['report'] ?? '') === 'loan_ledger';
        $needsAsOf = in_array('as_of', $config['filters'] ?? [], true);
        $needsRange = in_array('date_from', $config['filters'] ?? [], true);

        if ($isLedger && ! $filters['employee_id']) {
            return [$filters, 'Please select an employee.'];
        }

        if ($isLedger && ! $filters['loan_type']) {
            return [$filters, 'Please select a loan type.'];
        }

        if ($needsAsOf && ! $filters['as_of']) {
            return [$filters, 'Please select an as-of date.'];
        }

        if ($needsRange && ! $isLedger && ! $filters['date_from'] && ! $filters['date_to']) {
            return [$filters, 'Please select a date range (from and/or to).'];
        }

        if ($isLedger) {
            $cycle = $this->reports->resolveLedgerCycle($filters);
            $filters['loan_cycle'] = $cycle ? (string) $cycle : '';
        }

        return [$filters, null];
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportConfig(string $report): array
    {
        $config = config("employee_loan_reports.reports.{$report}");
        if (! $config) {
            abort(404, 'Report not found.');
        }

        return $config;
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportFilterOptions(): array
    {
        return $this->payrollFilterOptions(false);
    }
}
