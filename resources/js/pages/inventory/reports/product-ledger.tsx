import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSurface } from '@/components/page-surface';
import { BranchTypeSelect } from '@/components/inventory/BranchTypeSelect';
import { ComboSelect } from '@/components/ComboSelect';
import { InventoryReportDocumentHeader } from '@/components/inventory/InventoryReportDocumentHeader';
import { formatDisplayDate } from '@/lib/display-date';
import { lockedBranchId, type InventoryBranchScope } from '@/lib/inventory-branch-scope';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type StockInRow = { sl: number; date: string; branch_name: string; quantity: number; description: string };
type DisburseRow = { sl: number; date: string; branch_name: string; quantity: number; disburse_to: string; description: string };

type Props = {
    companyName?: string;
    detail: {
        opening: number;
        closing: number;
        period_stock_in: number;
        period_disburse: number;
        stock_in_rows: StockInRow[];
        disburse_rows: DisburseRow[];
    } | null;
    selectedProduct: { id: number; name: string; unit: string } | null;
    error: string | null;
    filters: { date_from: string; date_to: string; branch_id: string; product_id: string };
    dateLabel: string;
    branches: { headOffice: { id: number; name: string }[]; branches: { id: number; name: string }[] };
    branchScope?: InventoryBranchScope;
    products: { id: number; name: string; unit: string }[];
    exportUrls: { print: string; pdf: string; excel: string };
};

function ExportButtons({ printUrl, pdfUrl, excelUrl, disabled }: { printUrl: string; pdfUrl: string; excelUrl: string; disabled?: boolean }) {
    if (disabled) return null;
    return (
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => window.open(printUrl, '_blank')}>
                <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button asChild variant="outline" size="sm">
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" /> PDF
                </a>
            </Button>
            <Button asChild variant="outline" size="sm">
                <a href={excelUrl}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (CSV)
                </a>
            </Button>
        </div>
    );
}

function SectionTable({
    title,
    total,
    headers,
    children,
}: {
    title: string;
    total: number;
    headers: { key: string; label: string; align: 'left' | 'center' }[];
    children: React.ReactNode;
}) {
    const thClass = (align: 'left' | 'center') => (
        align === 'center'
            ? 'border-r border-black p-1 text-center font-bold last:border-r-0 whitespace-nowrap'
            : 'border-r border-black p-1 text-left font-bold last:border-r-0 whitespace-nowrap'
    );

    return (
        <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 mb-2 print:text-black">{title}</h3>
            <div className="overflow-x-auto border border-black text-black">
                <table className="w-full border-collapse text-[9px] print:text-[6.5px]">
                    <thead>
                        <tr className="border-b border-black">
                            {headers.map((h) => (
                                <th key={h.key} className={thClass(h.align)}>{h.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {children}
                        <tr className="border-t border-black font-semibold bg-slate-50">
                            <td colSpan={headers.length} className="p-1 text-center tabular-nums">
                                Total qty: {total.toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ProductLedgerReport({
    companyName,
    detail,
    selectedProduct,
    error,
    filters,
    dateLabel,
    branches,
    branchScope,
    products,
    exportUrls,
}: Props) {
    const fixedBranchId = lockedBranchId(branchScope);
    const branchLocked = Boolean(branchScope?.locked);
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [branchId, setBranchId] = useState<string | null>(fixedBranchId ?? (filters.branch_id || null));
    const [productId, setProductId] = useState<string | null>(filters.product_id || null);

    const productItems = useMemo(
        () => products.map((p) => ({ value: String(p.id), label: p.name, keywords: p.name })),
        [products],
    );

    const branchLabel = useMemo(() => {
        if (!branchId) return 'All branches';
        const all = [...branches.headOffice, ...branches.branches];
        return all.find((b) => String(b.id) === branchId)?.name ?? 'Branch';
    }, [branchId, branches]);

    const apply = () => {
        router.get(route('inventory.reports.product-ledger'), {
            date_from: dateFrom,
            date_to: dateTo,
            branch_id: branchId || undefined,
            product_id: productId || undefined,
        }, { preserveState: true });
    };

    const generated = Boolean(selectedProduct && detail && !error);

    const stockInHeaders = [
        { key: 'sl', label: 'SL', align: 'center' as const },
        { key: 'date', label: 'Date', align: 'center' as const },
        { key: 'branch', label: 'Branch', align: 'left' as const },
        { key: 'qty', label: 'Qty', align: 'center' as const },
        { key: 'desc', label: 'Description', align: 'left' as const },
    ];

    const disburseHeaders = [
        { key: 'sl', label: 'SL', align: 'center' as const },
        { key: 'date', label: 'Date', align: 'center' as const },
        { key: 'branch', label: 'Branch', align: 'left' as const },
        { key: 'qty', label: 'Qty', align: 'center' as const },
        { key: 'to', label: 'Disburse To', align: 'left' as const },
        { key: 'desc', label: 'Description', align: 'left' as const },
    ];

    return (
        <Layout>
            <Head title={selectedProduct ? `Ledger — ${selectedProduct.name}` : 'Single Product Ledger'} />
            <PageSurface>
                <div className="mb-5 border-b border-slate-200 pb-4 print:hidden">
                    <h1 className="text-2xl font-bold text-gray-900">Single Product Ledger</h1>
                    <p className="mt-1 text-sm text-slate-500">Stock in and disburse in two side-by-side tables</p>
                </div>

                <div className="mb-4 grid grid-cols-2 md:grid-cols-6 gap-2 items-end print:hidden">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">From</label>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400">To</label>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                    <BranchTypeSelect
                        value={branchId}
                        onChange={setBranchId}
                        branches={branches}
                        placeholder="All branches"
                        disabled={branchLocked}
                        clearable={!branchLocked}
                    />
                    <ComboSelect
                        value={productId}
                        onChange={setProductId}
                        items={productItems}
                        placeholder="Select product"
                    />
                    <Button className="bg-sky-600 hover:bg-sky-700" onClick={apply}>Generate</Button>
                </div>

                {error && !generated && (
                    <Alert className="mb-4 print:hidden">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {generated && (
                    <div className="space-y-4">
                        <ExportButtons
                            printUrl={exportUrls.print}
                            pdfUrl={exportUrls.pdf}
                            excelUrl={exportUrls.excel}
                        />

                        <div className="rounded-xl border border-slate-200 bg-white p-4 print:border-black print:rounded-none print:p-0">
                            <InventoryReportDocumentHeader
                                companyName={companyName}
                                title="Single Product Stock Ledger"
                                dateLabel={dateLabel}
                            />

                            <div className="overflow-x-auto border border-black text-black mb-3 print:mb-2">
                                <table className="w-full border-collapse text-[9px] print:text-[6.5px]">
                                    <tbody>
                                        <tr className="border-b border-black">
                                            <th className="border-r border-black p-1 text-left w-[22%]">Product</th>
                                            <td className="border-r border-black p-1 text-left">{selectedProduct!.name} ({selectedProduct!.unit})</td>
                                            <th className="border-r border-black p-1 text-left w-[22%]">Branch</th>
                                            <td className="p-1 text-left">{branchLabel}</td>
                                        </tr>
                                        <tr className="border-b border-black">
                                            <th className="border-r border-black p-1 text-left">Opening (before period)</th>
                                            <td className="border-r border-black p-1 text-center tabular-nums">{detail!.opening.toLocaleString()}</td>
                                            <th className="border-r border-black p-1 text-left">Closing (after period)</th>
                                            <td className="p-1 text-center tabular-nums font-semibold">{detail!.closing.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2">
                                <SectionTable title="Stock In" total={detail!.period_stock_in} headers={stockInHeaders}>
                                    {detail!.stock_in_rows.length ? detail!.stock_in_rows.map((row) => (
                                        <tr key={row.sl} className="border-b border-black">
                                            <td className="border-r border-black p-1 text-center">{row.sl}</td>
                                            <td className="border-r border-black p-1 text-center whitespace-nowrap">{formatDisplayDate(row.date)}</td>
                                            <td className="border-r border-black p-1 text-left">{row.branch_name}</td>
                                            <td className="border-r border-black p-1 text-center tabular-nums">{row.quantity.toLocaleString()}</td>
                                            <td className="p-1 text-left">{row.description}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-3 text-center text-slate-500">No stock in in this period.</td>
                                        </tr>
                                    )}
                                </SectionTable>

                                <SectionTable title="Disburse" total={detail!.period_disburse} headers={disburseHeaders}>
                                    {detail!.disburse_rows.length ? detail!.disburse_rows.map((row) => (
                                        <tr key={row.sl} className="border-b border-black">
                                            <td className="border-r border-black p-1 text-center">{row.sl}</td>
                                            <td className="border-r border-black p-1 text-center whitespace-nowrap">{formatDisplayDate(row.date)}</td>
                                            <td className="border-r border-black p-1 text-left">{row.branch_name}</td>
                                            <td className="border-r border-black p-1 text-center tabular-nums">{row.quantity.toLocaleString()}</td>
                                            <td className="border-r border-black p-1 text-left max-w-[100px] truncate">{row.disburse_to}</td>
                                            <td className="p-1 text-left max-w-[100px] truncate">{row.description}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-3 text-center text-slate-500">No disburse in this period.</td>
                                        </tr>
                                    )}
                                </SectionTable>
                            </div>
                        </div>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
