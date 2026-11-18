<?php

namespace App\Http\Controllers\StaffFund;

use App\Http\Controllers\Controller;
use App\Services\FinalPaymentWaitingListService;
use App\Support\FinalPaymentWaitingListXlsxExporter;
use App\Support\PayrollReportPrintPdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Mpdf\Mpdf;

class FinalPaymentReportController extends Controller
{
    public function __construct(
        protected FinalPaymentWaitingListService $waitingListService,
    ) {}

    public function show(Request $request)
    {
        $filters = $this->extractFilters($request);
        $payload = $this->waitingListService->build($filters);
        $filterOptions = $this->waitingListService->filterOptions();

        $companyName = config('staff_fund_reports.company_name', config('payroll_reports.company_name', 'Mousumi'));
        $companyAddress = config('staff_fund_reports.company_address', config('payroll_reports.company_address', ''));

        return Inertia::render('staff-fund/reports/final-payment-waiting-list', [
            'companyName' => $companyName,
            'companyAddress' => $companyAddress,
            'report' => [
                'title' => 'Final Payment Waiting List',
                'description' => 'Comprehensive list of separated/left staff awaiting final payment settlement with real-time clearance status, left duration, and net payable amounts.',
                'orientation' => 'landscape',
            ],
            'filterOptions' => $filterOptions,
            'filters' => $filters,
            'payload' => $payload,
            'exportUrls' => [
                'print' => route('staff-fund.reports.final-payment-waiting-list.print', $filters),
                'pdf' => route('staff-fund.reports.final-payment-waiting-list.pdf', $filters),
                'excel' => route('staff-fund.reports.final-payment-waiting-list.excel', $filters),
            ],
        ]);
    }

    public function print(Request $request)
    {
        $data = $this->documentData($request);
        $data['printMode'] = true;

        return view('staff-fund.reports.document', $data);
    }

    public function pdf(Request $request)
    {
        $data = $this->documentData($request);
        $html = view('staff-fund.reports.document', array_merge($data, ['pdfMode' => true]))->render();
        $filename = 'final-payment-waiting-list-'.now()->format('Y-m-d').'.pdf';

        try {
            if (! PayrollReportPrintPdf::canGenerate()) {
                throw new \RuntimeException('Chrome is not available for PDF export.');
            }

            $pdf = PayrollReportPrintPdf::generate($html);
        } catch (\Throwable $e) {
            report($e);

            return $this->downloadPdfViaMpdf($data, $filename);
        }

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function excel(Request $request): Response
    {
        $data = $this->documentData($request);
        $filename = 'final-payment-waiting-list-'.now()->format('Y-m-d').'.xlsx';

        return FinalPaymentWaitingListXlsxExporter::download($filename, $data['payload'], [
            'companyName' => $data['companyName'],
            'companyAddress' => $data['companyAddress'],
            'title' => $data['title'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function documentData(Request $request): array
    {
        $filters = $this->extractFilters($request);
        $payload = $this->waitingListService->build($filters);

        return [
            'companyName' => config('staff_fund_reports.company_name', config('payroll_reports.company_name', 'Mousumi')),
            'companyAddress' => config('staff_fund_reports.company_address', config('payroll_reports.company_address', '')),
            'signatureBlocks' => config('staff_fund_reports.signature_blocks', []),
            'title' => 'Final Payment Waiting List',
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => 'landscape',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function extractFilters(Request $request): array
    {
        return [
            'as_of_date' => $request->input('as_of_date', now()->toDateString()),
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
            'payment_status' => $request->input('payment_status', 'waiting_pending'),
            'clearance_status' => $request->input('clearance_status', 'all'),
            'zone_id' => $request->filled('zone_id') ? $request->integer('zone_id') : null,
            'regional_office_id' => $request->filled('regional_office_id') ? $request->integer('regional_office_id') : null,
            'branch_id' => $request->filled('branch_id') ? $request->integer('branch_id') : null,
            'search' => trim((string) $request->input('search', '')),
        ];
    }

    protected function downloadPdfViaMpdf(array $data, string $filename): Response
    {
        $html = view('staff-fund.reports.document', array_merge($data, ['mpdfMode' => true]))->render();

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4-L',
            'margin_left' => 8,
            'margin_right' => 8,
            'margin_top' => 10,
            'margin_bottom' => 10,
            'default_font_size' => 8,
            'default_font' => 'nikosh',
        ]);

        $mpdf->autoScriptToLang = true;
        $mpdf->autoLangToFont = true;
        $mpdf->WriteHTML($html);

        return response($mpdf->Output($filename, 'S'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
