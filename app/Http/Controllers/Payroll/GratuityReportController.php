<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Services\GratuityReportService;
use App\Support\GratuityReportCsvExporter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Support\ProjectPdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GratuityReportController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected GratuityReportService $reports,
    ) {}

    public function index()
    {
        return redirect()->route('sections.staff-fund', ['section' => 'staff-fund']);
    }

    public function show(Request $request, string $report)
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        $generated = $request->boolean('generate');
        $payload = null;
        $error = null;

        if ($generated) {
            $needsEmployee = (bool) ($config['require_employee'] ?? false);
            $needsAsOf = in_array('as_of', $config['filters'] ?? [], true);
            $needsRange = in_array('date_from', $config['filters'] ?? [], true)
                && ! in_array('as_of', $config['filters'] ?? [], true);
            $needsEndDate = in_array('date_to', $config['filters'] ?? [], true)
                && ! in_array('date_from', $config['filters'] ?? [], true)
                && ! $needsAsOf;

            if ($needsEmployee && ! $filters['employee_id']) {
                $error = 'Please select an employee.';
            } elseif ($needsAsOf && ! $filters['as_of']) {
                $error = 'Please select an as-of date.';
            } elseif ($needsEndDate && ! $filters['date_to']) {
                $error = 'Please select an end date.';
            } elseif ($needsRange && ! $filters['date_from'] && ! $filters['date_to']) {
                $error = 'Please select a date range (from and/or to).';
            } else {
                $payload = $this->reports->build($report, $config, $filters);
            }
        }

        return Inertia::render('payroll/gratuity/reports/show', [
            'companyName' => config('gratuity_reports.company_name'),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'requireEmployee' => (bool) ($config['require_employee'] ?? false),
            ],
            'filterOptions' => $this->reportFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'as_of' => $request->input('as_of', date('Y-m-d')),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', $report === 'gratuity-ledger' ? date('Y-m-d') : ''),
                'eligibility' => $request->input('eligibility', 'all'),
                'payment_status' => $request->input('payment_status', 'all'),
            ]),
            'generated' => $generated,
            'payload' => $payload,
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'error' => $error,
            'exportUrls' => [
                'print' => route('gratuity.reports.print', $report).'?'.$request->getQueryString(),
                'pdf' => route('gratuity.reports.pdf', $report).'?'.$request->getQueryString(),
                'excel' => route('gratuity.reports.excel', $report).'?'.$request->getQueryString(),
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

        $pdf = Pdf::loadView('gratuity.reports.document', $data)
            ->setPaper('a4', $data['orientation'] ?? 'portrait');

        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }

    public function excel(Request $request, string $report): StreamedResponse
    {
        $data = $this->documentData($request, $report);
        $template = $data['payload']['template'] ?? 'gratuity-table';
        [$headers, $rows] = GratuityReportCsvExporter::rowsFromPayload($template, $data['payload']);
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.csv';

        return GratuityReportCsvExporter::download($filename, $headers, $rows);
    }

    /**
     * @return \Illuminate\View\View
     */
    protected function renderDocument(Request $request, string $report, string $mode)
    {
        $data = $this->documentData($request, $report);
        $data['printMode'] = $mode === 'print';

        return view('gratuity.reports.document', $data);
    }

    /**
     * @return array<string, mixed>
     */
    protected function documentData(Request $request, string $report): array
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);

        if (! empty($config['require_employee']) && empty($filters['employee_id'])) {
            abort(422, 'Please select an employee.');
        }

        $payload = $this->reports->build($report, $config, $filters);

        $template = $payload['template'] ?? 'gratuity-table';
        $colCount = count($payload['columns'] ?? []);

        return [
            'companyName' => config('gratuity_reports.company_name'),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => $colCount > 10 ? 'landscape' : 'portrait',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportConfig(string $report): array
    {
        $config = config("gratuity_reports.reports.{$report}");
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
