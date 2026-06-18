import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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

type SummaryRow = {
    sl: number;
    product_id: number;
    product_name: string;
    unit: string;
    before_qty: number;
    current_in_qty: number;
    current_disburse_qty: number;
    available_stock: number;
    description: string;
};

type Props = {
    companyName?: string;
    summary: SummaryRow[];
    filters: { date_from: string; date_to: string; branch_id: string };
    dateLabel: string;
    branches: { headOffice: { id: number; name: string }[]; branches: { id: number; name: string }[] };
    branchScope?: InventoryBranchScope;
    exportUrls: { print: string; pdf: string; excel: string };
};

function ExportButtons({ printUrl, pdfUrl, excelUrl }: { printUrl: string; pdfUrl: string; excelUrl: string }) {
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

function PrintTable({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto border border-black text-black">
            <table className="w-full border-collapse text-[9px] print:text-[6.5px]">{children}</table>
        </div>
    );
}

const thCenter = 'border-r border-black p-1 text-center font-bold last:border-r-0 whitespace-nowrap';
const thLeft = 'border-r border-black p-1 text-left font-bold last:border-r-0 whitespace-nowrap';
const tdCenter = 'border-r border-black p-1 text-center tabular-nums';
const tdLeft = 'border-r border-black p-1 text-left';

export default function StockLedgerReport({ companyName, summary, filters, dateLabel, branches, branchScope, exportUrls }: Props) {
    const fixedBranchId = lockedBranchId(branchScope);
    const branchLocked = Boolean(branchScope?.locked);
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [branchId, setBranchId] = useState<string | null>(fixedBranchId ?? (filters.branch_id || null));

    const apply = () => {
        router.get(route('inventory.reports.stock-ledger'), {
            date_from: dateFrom,
            date_to: dateTo,
            branch_id: branchId || undefined,
        }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Stock Ledger" />
            <PageSurface>
                <div className="mb-5 border-b border-slate-200 pb-4 print:hidden">
                    <h1 className="text-2xl font-bold text-gray-900">Product Stock Ledger</h1>
                    <p className="mt-1 text-sm text-slate-500">All products summary — click product name for single product ledger</p>
                </div>

                <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end print:hidden">
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
                    <Button className="bg-sky-600 hover:bg-sky-700" onClick={apply}>Generate</Button>
                </div>

                {summary.length > 0 && (
                    <ExportButtons
                        printUrl={exportUrls.print}
                        pdfUrl={exportUrls.pdf}
                        excelUrl={exportUrls.excel}
                    />
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
                    <InventoryReportDocumentHeader
                        companyName={companyName}
                        title="Product Stock Ledger Summary"
                        dateLabel={dateLabel}
                    />
                    <PrintTable>
                        <thead>
                            <tr className="border-b border-black">
                                <th className={thCenter}>SL</th>
                                <th className={thLeft}>Product</th>
                                <th className={thCenter}>Unit</th>
                                <th className={thCenter}>Before Period</th>
                                <th className={thCenter}>Stock In</th>
                                <th className={thCenter}>Disburse</th>
                                <th className={thCenter}>Closing</th>
                                <th className={thLeft}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.length ? summary.map((row) => (
                                <tr key={row.product_id} className="border-b border-black">
                                    <td className={tdCenter}>{row.sl}</td>
                                    <td className={`${tdLeft} font-medium`}>
                                        <Link
                                            href={route('inventory.reports.product-ledger', {
                                                date_from: dateFrom,
                                                date_to: dateTo,
                                                branch_id: branchId || undefined,
                                                product_id: row.product_id,
                                            })}
                                            className="text-sky-700 hover:underline print:text-black print:no-underline"
                                        >
                                            {row.product_name}
                                        </Link>
                                    </td>
                                    <td className={tdCenter}>{row.unit}</td>
                                    <td className={tdCenter}>{row.before_qty.toLocaleString()}</td>
                                    <td className={tdCenter}>{row.current_in_qty.toLocaleString()}</td>
                                    <td className={tdCenter}>{row.current_disburse_qty.toLocaleString()}</td>
                                    <td className={`${tdCenter} font-semibold`}>{row.available_stock.toLocaleString()}</td>
                                    <td className={`${tdLeft} last:border-r-0`}>{row.description || '—'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="p-6 text-center text-slate-500">No data for selected period.</td></tr>
                            )}
                        </tbody>
                    </PrintTable>
                </div>
            </PageSurface>
        </Layout>
    );
}
