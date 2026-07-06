<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Services\EmployeeProvidentFundService;
use App\Services\PfReportService;
use App\Support\PayrollReportPrintPdf;
use App\Support\PfReportXlsxExporter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Mpdf\HTMLParserMode;
use Mpdf\Mpdf;
use Symfony\Component\HttpFoundation\Response;

class PfReportController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PfReportService $reports,
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
            $needsRange = in_array('date_from', $config['filters'] ?? [], true);
            $needsEndDate = in_array('date_to', $config['filters'] ?? [], true)
                && ! $needsRange;
            $needsYear = in_array('year', $config['filters'] ?? [], true);

            if ($needsEmployee && ! $filters['employee_id']) {
                $error = 'Please select an employee.';
            } elseif ($needsRange && ! $filters['date_from'] && ! $filters['date_to']) {
                $error = 'Please select a date range (from and/or to).';
            } elseif ($needsEndDate && ! $filters['date_to']) {
                $error = 'Please select an end date.';
            } elseif ($needsYear && ! $filters['year']) {
                $error = 'Please select a year.';
            } else {
                $payload = $this->reports->build($report, $config, $filters);
            }
        }

        return Inertia::render('payroll/provident-fund/reports/show', [
            'companyName' => config('pf_reports.company_name'),
            'companyAddress' => config('pf_reports.company_address'),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'requireEmployee' => (bool) ($config['require_employee'] ?? false),
            ],
            'filterOptions' => $this->reportFilterOptions(),
            'transactionTypeOptions' => collect([
                EmployeeProvidentFundService::TYPE_PAYROLL => 'Salary (payroll)',
                EmployeeProvidentFundService::TYPE_MANUAL => 'Manual PF',
                EmployeeProvidentFundService::TYPE_OPENING => 'Opening balance',
                EmployeeProvidentFundService::TYPE_ADJUSTMENT => 'Adjustment',
                EmployeeProvidentFundService::TYPE_WITHDRAWAL => 'PF payment (withdrawal)',
                EmployeeProvidentFundService::TYPE_INTEREST => 'Interest',
            ])->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values()->all(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
                'transaction_type' => $request->input('transaction_type', ''),
            ]),
            'generated' => $generated,
            'payload' => $payload,
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'error' => $error,
            'exportUrls' => [
                'print' => route('provident-fund.reports.print', $report).'?'.$request->getQueryString(),
                'pdf' => route('provident-fund.reports.pdf', $report).'?'.$request->getQueryString(),
                'excel' => route('provident-fund.reports.excel', $report).'?'.$request->getQueryString(),
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
        $viewData = array_merge($data, ['pdfMode' => true]);
        $html = view('pf.reports.document', $viewData)->render();
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        try {
            if (! PayrollReportPrintPdf::canGenerate()) {
                throw new \RuntimeException('Chrome is not available for PDF export.');
            }

            $pdf = PayrollReportPrintPdf::generate($html);
        } catch (\Throwable $e) {
            report($e);

            return $this->downloadPdfViaMpdf($data, $filename);
        }

        return response()->make(
            $pdf,
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'public, must-revalidate, max-age=0',
            ]
        );
    }

    public function excel(Request $request, string $report): Response
    {
        $data = $this->documentData($request, $report);
        $template = $data['payload']['template'] ?? 'pf-table';
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.xlsx';

        return PfReportXlsxExporter::download($filename, $template, $data['payload'], [
            'companyName' => $data['companyName'],
            'companyAddress' => $data['companyAddress'],
            'title' => $data['title'],
            'periodLabel' => $data['periodLabel'],
        ]);
    }

    /**
     * @return \Illuminate\View\View
     */
    protected function renderDocument(Request $request, string $report, string $mode)
    {
        $data = $this->documentData($request, $report);
        $data['printMode'] = $mode === 'print';

        return view('pf.reports.document', $data);
    }

    /**
     * @return array<string, mixed>
     */
    protected function documentData(Request $request, string $report): array
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        $payload = $this->reports->build($report, $config, $filters);

        return [
            'companyName' => config('pf_reports.company_name'),
            'companyAddress' => config('pf_reports.company_address'),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => $this->reportOrientation($payload),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function reportOrientation(array $payload): string
    {
        if (PfReportXlsxExporter::isBranchBalanceGrouped($payload)) {
            return 'landscape';
        }

        $colCount = count($payload['columns'] ?? $payload['group_columns'] ?? []);

        return $colCount > 9 ? 'landscape' : 'portrait';
    }

    protected function downloadPdfViaMpdf(array $data, string $filename): Response
    {
        $isLandscape = ($data['orientation'] ?? 'portrait') === 'landscape';
        $isBranchBalance = PfReportXlsxExporter::isBranchBalanceGrouped($data['payload'] ?? []);

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => $isLandscape ? 'A4-L' : 'A4',
            'margin_left' => $this->printSideMarginMm(),
            'margin_right' => $this->printSideMarginMm(),
            'margin_top' => (float) (config('payroll_reports.print.margin_top_mm') ?? 4),
            'margin_bottom' => (float) (config('payroll_reports.print.margin_bottom_mm') ?? 4),
            'default_font' => 'dejavusans',
            'shrink_tables_to_fit' => $isBranchBalance ? 1.0 : 1.4,
        ]);

        $mpdf->SetTitle($data['title']);
        $mpdf->SetAuthor(config('app.name'));
        $this->writeReportHtml($mpdf, view('pf.reports.document', array_merge($data, ['pdfMode' => true]))->render());

        return response()->make(
            $mpdf->Output($filename, 'S'),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'public, must-revalidate, max-age=0',
            ]
        );
    }

    protected function writeReportHtml(Mpdf $mpdf, string $html): void
    {
        if (function_exists('ini_set')) {
            @ini_set('pcre.backtrack_limit', '10000000');
        }

        if (preg_match('/<style\b[^>]*>.*?<\/style>/is', $html, $styleMatch)) {
            $mpdf->WriteHTML($styleMatch[0], HTMLParserMode::HEADER_CSS);
        }

        if (! preg_match('/<body[^>]*>(.*)<\/body>/is', $html, $bodyMatch)) {
            $mpdf->WriteHTML($html);

            return;
        }

        $mpdf->WriteHTML(trim($bodyMatch[1]));
    }

    protected function printSideMarginMm(): float
    {
        $mm = (float) (config('payroll_reports.print.margin_side_mm') ?? 3);
        $extraPx = (int) (config('payroll_reports.print.margin_side_extra_px') ?? 10);

        return $mm + ($extraPx * 25.4 / 96);
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportConfig(string $report): array
    {
        $config = config("pf_reports.reports.{$report}");
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
