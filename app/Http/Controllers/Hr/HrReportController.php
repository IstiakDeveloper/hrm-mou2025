<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Designation;
use App\Models\RegionalOffice;
use App\Models\Zone;
use App\Services\HrReportService;
use App\Support\HrReportXlsxExporter;
use App\Support\PayrollReportPrintPdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Mpdf\HTMLParserMode;
use Mpdf\Mpdf;
use Symfony\Component\HttpFoundation\Response;

class HrReportController extends Controller
{
    public function __construct(
        protected HrReportService $reports
    ) {}

    public function index(Request $request)
    {
        $definitions = config('hr_reports.reports', []);
        $list = collect($definitions)->map(fn ($def, $slug) => [
            'slug' => $slug,
            'title' => $def['title'],
            'short_title' => $def['short_title'] ?? $def['title'],
            'description' => $def['description'] ?? '',
            'orientation' => $def['orientation'] ?? 'landscape',
        ])->values();

        return Inertia::render('hr/reports/index', [
            'reports' => $list,
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
            $payload = $this->reports->build($report, $config, $filters);
        }

        return Inertia::render('hr/reports/show', [
            'companyName' => config('hr_reports.company_name', 'MOUSUMI'),
            'companyAddress' => config('hr_reports.company_address', 'Ukilpara, Naogaon'),
            'signatureBlocks' => config('hr_reports.signature_blocks', []),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'shortTitle' => $config['short_title'] ?? $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'orientation' => $config['orientation'] ?? 'landscape',
                'isDateRange' => ! empty($config['date_range']),
            ],
            'filterOptions' => $this->reportFilterOptions(),
            'filters' => $filters,
            'generated' => $generated,
            'payload' => $payload,
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'error' => $error,
            'exportUrls' => [
                'print' => route('hr.reports.print', $report).'?'.$request->getQueryString(),
                'pdf' => route('hr.reports.pdf', $report).'?'.$request->getQueryString(),
                'excel' => route('hr.reports.excel', $report).'?'.$request->getQueryString(),
            ],
        ]);
    }

    public function print(Request $request, string $report)
    {
        $data = $this->documentData($request, $report);
        $data['printMode'] = true;

        return view('hr.reports.document', $data);
    }

    public function pdf(Request $request, string $report)
    {
        $data = $this->documentData($request, $report);
        $html = view('hr.reports.document', array_merge($data, ['pdfMode' => true]))->render();
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
        $template = $data['payload']['template'] ?? 'generic';
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.xlsx';

        return HrReportXlsxExporter::download($filename, $template, $data['payload'], [
            'companyName' => $data['companyName'],
            'companyAddress' => $data['companyAddress'],
            'title' => $data['title'],
            'periodLabel' => $data['periodLabel'],
        ]);
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
            'companyName' => config('hr_reports.company_name', 'MOUSUMI'),
            'companyAddress' => config('hr_reports.company_address', 'Ukilpara, Naogaon'),
            'signatureBlocks' => config('hr_reports.signature_blocks', []),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => $config['orientation'] ?? 'landscape',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportConfig(string $report): array
    {
        $config = config("hr_reports.reports.{$report}");
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
        return [
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name', 'branch_code', 'regional_office_id']),
            'zones' => Zone::query()->orderBy('name')->get(['id', 'name', 'code']),
            'regional_offices' => RegionalOffice::query()->orderBy('name')->get(['id', 'name', 'code', 'zone_id']),
            'designations' => Designation::query()->orderBy('name')->get(['id', 'name']),
        ];
    }

    protected function downloadPdfViaMpdf(array $data, string $filename): Response
    {
        $isLandscape = ($data['orientation'] ?? 'landscape') === 'landscape';

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => $isLandscape ? 'A4-L' : 'A4',
            'margin_left' => 5,
            'margin_right' => 5,
            'margin_top' => 5,
            'margin_bottom' => 5,
            'default_font' => 'dejavusans',
            'shrink_tables_to_fit' => 1.4,
        ]);

        $mpdf->SetTitle($data['title']);
        $mpdf->SetAuthor(config('app.name'));

        $html = view('hr.reports.document', array_merge($data, ['pdfMode' => true]))->render();

        if (function_exists('ini_set')) {
            @ini_set('pcre.backtrack_limit', '10000000');
        }

        if (preg_match('/<style\b[^>]*>.*?<\/style>/is', $html, $styleMatch)) {
            $mpdf->WriteHTML($styleMatch[0], HTMLParserMode::HEADER_CSS);
        }

        $mpdf->WriteHTML($html, HTMLParserMode::HTML_BODY);

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
}
