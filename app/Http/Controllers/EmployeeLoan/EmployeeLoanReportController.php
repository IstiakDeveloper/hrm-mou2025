<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Services\EmployeeLoanReportService;
use App\Support\EmployeeLoanReportCsvExporter;
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
        $error = null;

        if ($generated) {
            $needsAsOf = in_array('as_of', $config['filters'] ?? [], true);
            $needsRange = in_array('date_from', $config['filters'] ?? [], true);

            if ($needsAsOf && ! $filters['as_of']) {
                $error = 'Please select an as-of date.';
            } elseif (
                $needsRange
                && ($config['report'] ?? '') !== 'loan_ledger'
                && ! $filters['date_from']
                && ! $filters['date_to']
            ) {
                $error = 'Please select a date range (from and/or to).';
            } else {
                $payload = $this->reports->build($report, $config, $filters);
            }
        }

        return Inertia::render('employee-loan/reports/show', [
            'companyName' => config('employee_loan_reports.company_name'),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
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
                'loan_type' => $request->input('loan_type', ''),
                'loan_cycle' => $request->input('loan_cycle', ''),
                'loan_id' => $request->input('loan_id', ''),
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

        $pdf = Pdf::loadView('employee-loan.reports.document', $data)
            ->setPaper('a4', $data['orientation'] ?? 'portrait');

        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
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
