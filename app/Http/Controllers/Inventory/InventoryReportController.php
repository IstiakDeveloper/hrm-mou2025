<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\InventoryProduct;
use App\Services\InventoryLedgerService;
use App\Support\InventoryBranchScope;
use App\Support\InventoryReportCsvExporter;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InventoryReportController extends Controller
{
    public function stockLedger(Request $request, InventoryLedgerService $ledger)
    {
        $user = $request->user();

        if ($request->filled('product_id')) {
            return redirect()->route('inventory.reports.product-ledger', $request->only([
                'date_from', 'date_to', 'branch_id', 'product_id',
            ]));
        }

        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $branchId = InventoryBranchScope::resolveBranchId($user, $request->integer('branch_id') ?: null);
        $branchLabel = $this->branchLabel($branchId);

        $summary = $ledger->summaryLedger($dateFrom, $dateTo, $branchId);

        $query = http_build_query(array_filter([
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'branch_id' => $branchId,
        ], fn ($v) => $v !== null && $v !== ''));

        return Inertia::render('inventory/reports/stock-ledger', [
            'companyName' => config('inventory_reports.company_name'),
            'summary' => $summary,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId ? (string) $branchId : '',
            ],
            'dateLabel' => $ledger->dateLabel($dateFrom, $dateTo),
            'periodLabel' => $ledger->periodLabel($dateFrom, $dateTo, $branchId ? $branchLabel : null),
            'branches' => InventoryDashboardController::branchOptions($user),
            'branchScope' => InventoryBranchScope::frontendMeta($user),
            'exportUrls' => [
                'print' => route('inventory.reports.stock-ledger.print').'?'.$query,
                'pdf' => route('inventory.reports.stock-ledger.pdf').'?'.$query,
                'excel' => route('inventory.reports.stock-ledger.excel').'?'.$query,
            ],
        ]);
    }

    public function productLedger(Request $request, InventoryLedgerService $ledger)
    {
        $user = $request->user();
        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $branchId = InventoryBranchScope::resolveBranchId($user, $request->integer('branch_id') ?: null);
        $productId = $request->integer('product_id') ?: null;
        $branchLabel = $this->branchLabel($branchId);

        $detail = null;
        $selectedProduct = null;
        $error = null;

        if (! $productId) {
            $error = 'Select a product and click Generate.';
        } else {
            $selectedProduct = InventoryProduct::find($productId);
            if (! $selectedProduct) {
                $error = 'Product not found.';
            } else {
                $detail = $ledger->productDetailLedger($productId, $dateFrom, $dateTo, $branchId);
            }
        }

        $query = http_build_query(array_filter([
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'branch_id' => $branchId,
            'product_id' => $productId,
        ], fn ($v) => $v !== null && $v !== ''));

        return Inertia::render('inventory/reports/product-ledger', [
            'companyName' => config('inventory_reports.company_name'),
            'detail' => $detail,
            'selectedProduct' => $selectedProduct ? [
                'id' => $selectedProduct->id,
                'name' => $selectedProduct->name,
                'unit' => $selectedProduct->unit,
            ] : null,
            'error' => $error,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId ? (string) $branchId : '',
                'product_id' => $productId ? (string) $productId : '',
            ],
            'dateLabel' => $ledger->dateLabel($dateFrom, $dateTo),
            'periodLabel' => $ledger->periodLabel(
                $dateFrom,
                $dateTo,
                $branchLabel,
                $selectedProduct?->name,
            ),
            'branches' => InventoryDashboardController::branchOptions($user),
            'branchScope' => InventoryBranchScope::frontendMeta($user),
            'products' => InventoryProduct::orderBy('name')->get(['id', 'name', 'unit']),
            'exportUrls' => [
                'print' => route('inventory.reports.product-ledger.print').'?'.$query,
                'pdf' => route('inventory.reports.product-ledger.pdf').'?'.$query,
                'excel' => route('inventory.reports.product-ledger.excel').'?'.$query,
            ],
        ]);
    }

    public function stockLedgerPrint(Request $request, InventoryLedgerService $ledger)
    {
        return $this->renderSummaryDocument($request, $ledger, true);
    }

    public function stockLedgerPdf(Request $request, InventoryLedgerService $ledger)
    {
        return $this->downloadPdf($this->summaryDocumentData($request, $ledger));
    }

    public function stockLedgerExcel(Request $request, InventoryLedgerService $ledger): StreamedResponse
    {
        return $this->downloadExcel($this->summaryDocumentData($request, $ledger));
    }

    public function productLedgerPrint(Request $request, InventoryLedgerService $ledger)
    {
        return $this->renderProductDocument($request, $ledger, true);
    }

    public function productLedgerPdf(Request $request, InventoryLedgerService $ledger)
    {
        return $this->downloadPdf($this->productDocumentData($request, $ledger));
    }

    public function productLedgerExcel(Request $request, InventoryLedgerService $ledger): StreamedResponse
    {
        return $this->downloadExcel($this->productDocumentData($request, $ledger));
    }

    /** @deprecated use stockLedgerPrint */
    public function print(Request $request, InventoryLedgerService $ledger)
    {
        return $request->filled('product_id')
            ? $this->productLedgerPrint($request, $ledger)
            : $this->stockLedgerPrint($request, $ledger);
    }

    /** @deprecated use stockLedgerPdf */
    public function pdf(Request $request, InventoryLedgerService $ledger)
    {
        return $request->filled('product_id')
            ? $this->productLedgerPdf($request, $ledger)
            : $this->stockLedgerPdf($request, $ledger);
    }

    /** @deprecated use stockLedgerExcel */
    public function excel(Request $request, InventoryLedgerService $ledger): StreamedResponse
    {
        return $request->filled('product_id')
            ? $this->productLedgerExcel($request, $ledger)
            : $this->stockLedgerExcel($request, $ledger);
    }

    /**
     * @return \Illuminate\View\View
     */
    protected function renderSummaryDocument(Request $request, InventoryLedgerService $ledger, bool $printMode)
    {
        $data = $this->summaryDocumentData($request, $ledger);
        $data['printMode'] = $printMode;

        return view('inventory.reports.document', $data);
    }

    /**
     * @return \Illuminate\View\View
     */
    protected function renderProductDocument(Request $request, InventoryLedgerService $ledger, bool $printMode)
    {
        $data = $this->productDocumentData($request, $ledger);
        $data['printMode'] = $printMode;

        return view('inventory.reports.document', $data);
    }

    /**
     * @return array<string, mixed>
     */
    protected function summaryDocumentData(Request $request, InventoryLedgerService $ledger): array
    {
        $user = $request->user();
        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $branchId = InventoryBranchScope::resolveBranchId($user, $request->integer('branch_id') ?: null);
        $branchLabel = $this->branchLabel($branchId);

        $summary = $ledger->summaryLedger($dateFrom, $dateTo, $branchId);
        $title = 'Product Stock Ledger Summary';
        $dateLabel = $ledger->dateLabel($dateFrom, $dateTo);

        return $this->attachExportMeta([
            'companyName' => config('inventory_reports.company_name'),
            'title' => $title,
            'dateLabel' => $dateLabel,
            'payload' => $ledger->summaryExportPayload($summary),
            'orientation' => 'portrait',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function productDocumentData(Request $request, InventoryLedgerService $ledger): array
    {
        $user = $request->user();
        $dateFrom = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = $request->input('date_to', Carbon::now()->format('Y-m-d'));
        $branchId = InventoryBranchScope::resolveBranchId($user, $request->integer('branch_id') ?: null);
        $productId = $request->integer('product_id') ?: abort(422, 'Product is required.');
        $branchLabel = $this->branchLabel($branchId);

        $product = InventoryProduct::findOrFail($productId);
        $detail = $ledger->productDetailLedger($productId, $dateFrom, $dateTo, $branchId);
        $title = 'Single Product Stock Ledger';
        $dateLabel = $ledger->dateLabel($dateFrom, $dateTo);

        return $this->attachExportMeta([
            'companyName' => config('inventory_reports.company_name'),
            'title' => $title,
            'dateLabel' => $dateLabel,
            'payload' => $ledger->productLedgerSplitExportPayload($product, $detail, $branchLabel),
            'orientation' => 'landscape',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function downloadPdf(array $data)
    {
        $pdf = Pdf::loadView('inventory.reports.document', $data)
            ->setPaper('a4', $data['orientation'] ?? 'portrait');
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function downloadExcel(array $data): StreamedResponse
    {
        $template = $data['payload']['template'] ?? 'summary-ledger';
        $rows = InventoryReportCsvExporter::buildExportRows($template, $data['payload']);
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.csv';

        return InventoryReportCsvExporter::download($filename, $rows);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function attachExportMeta(array $data): array
    {
        $data['payload']['export_meta'] = [
            'company_name' => $data['companyName'],
            'title' => $data['title'],
            'date_label' => $data['dateLabel'],
        ];

        return $data;
    }

    private function branchLabel(?int $branchId): string
    {
        if (! $branchId) {
            return 'All branches';
        }

        return Branch::find($branchId)?->name ?? 'Branch';
    }
}
