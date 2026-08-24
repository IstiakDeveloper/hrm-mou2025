import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { PayrollReportDocumentHeader } from '@/components/payroll/PayrollReportDocumentHeader';
import { PayrollField, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, toFormDisplayDate } from '@/lib/display-date';
import { formatTakaWhole } from '@/lib/taka-format';
import {
    ArrowLeft,
    Building2,
    ChevronsDownUp,
    ChevronsUpDown,
    Download,
    FileSpreadsheet,
    Layers,
    Minus,
    Plus,
    Printer,
    Search,
} from 'lucide-react';

type ReportMeta = {
    slug: string;
    title: string;
    description: string;
    filters: string[];
    dateRange: boolean;
    purchaseMonth?: boolean;
    usesFinancialYear?: boolean;
};

type Section = {
    title: string;
    rows: Record<string, unknown>[];
    subtotal?: {
        asset_count?: number;
        purchase_cost?: number;
        purchase_amount?: number;
        closing_value?: number;
        book_value?: number;
        opening_value?: number;
        addition_h1?: number;
        addition_h2?: number;
        depreciation_h1?: number;
        depreciation_h2?: number;
        new_purchase?: number;
        transfer_in?: number;
        addition_total?: number;
        depreciation?: number;
        disposal?: number;
        transfer_out?: number;
        deduction_total?: number;
        cumulative_deduction?: number;
    };
};

type Props = {
    companyName: string;
    companyAddress?: string;
    report: ReportMeta;
    filterOptions: {
        branches: { id: number; name: string; branch_code?: string | null; is_head_office?: boolean }[];
        categories: { id: number; code: string; name: string }[];
        financialYears: { id: number; label: string; start_date: string; end_date: string; is_active: boolean }[];
        statuses: { value: string; label: string }[];
        years: number[];
        months: { value: number; label: string }[];
    };
    filters: Record<string, string>;
    branchScoped: boolean;
    generated: boolean;
    payload: Record<string, unknown> | null;
    periodLabel: string;
    branchLabel: string;
    printMetaLabel: string;
    error: string | null;
    exportUrls: { print: string; pdf: string; excel: string } | null;
};

function fmt(n: unknown) {
    const v = Number(n);
    return Number.isFinite(v) ? formatTakaWhole(v) : '—';
}

function isNumericCol(key: string): boolean {
    const lower = key.toLowerCase();
    return (
        lower.includes('amount') ||
        lower.includes('value') ||
        lower.includes('cost') ||
        lower.includes('depreciation') ||
        lower.includes('addition') ||
        lower.includes('deduction') ||
        lower.includes('disposal') ||
        lower.includes('purchase') ||
        lower.includes('opening') ||
        lower.includes('closing') ||
        lower.includes('wdv') ||
        lower.includes('written_down') ||
        lower.includes('rate') ||
        lower.includes('count') ||
        lower.includes('day') ||
        lower.includes('sl')
    );
}

function isNumericCell(value: unknown): boolean {
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed);
    }
    return false;
}

function cellDisplay(value: unknown, key?: string): string {
    if (value == null || value === '') {
        return '—';
    }
    if (key === 'sl' || key === 'passed_day' || key === 'depreciation_rate' || key === 'asset_count' || key === 'floor' || key === 'room') {
        return String(value);
    }
    return isNumericCell(value) ? fmt(value) : String(value);
}

function StatusBadge({ status }: { status: unknown }) {
    if (!status || status === '—') return <span className="text-zinc-400">—</span>;
    const str = String(status).toLowerCase();
    let variantClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200';
    if (str.includes('active') || str.includes('in use') || str.includes('good')) {
        variantClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (str.includes('maintenance') || str.includes('repair')) {
        variantClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (str.includes('disposed') || str.includes('written off') || str.includes('damaged')) {
        variantClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (str.includes('transfer')) {
        variantClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    }

    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${variantClasses}`}>
            {String(status)}
        </span>
    );
}

function columnKeys(template: string, firstRow: Record<string, unknown>, payload?: Record<string, unknown>): string[] {
    if (firstRow && Object.keys(firstRow).length > 0) {
        return Object.keys(firstRow);
    }

    if (payload?.headers && Array.isArray(payload.headers)) {
        const headerCount = (payload.headers as string[]).length;
        const rowKeys = Object.keys(firstRow || {});
        if (rowKeys.length >= headerCount) {
            return rowKeys;
        }
    }

    switch (template) {
        case 'asset-tracking':
            return ['category', 'sub_category', 'asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'book_value', 'floor', 'room', 'voucher', 'ledger', 'description'];
        case 'purchase-list':
            return ['category', 'sub_category', 'asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status'];
        case 'disposal-list':
            return ['category', 'sub_category', 'asset_no', 'branch', 'purchase_date', 'purchase_amount', 'opening_value', 'depreciation', 'disposal_amount', 'closing_value'];
        case 'depreciation-schedule': {
            const variant = payload?.schedule_variant as string;
            if (variant === 'audit') {
                return ['sl', 'group_label', 'asset_count', 'cost_opening', 'cost_addition', 'cost_sales_adj', 'cost_closing', 'depreciation_rate', 'dep_opening', 'dep_charged', 'dep_sales_adj', 'dep_closing', 'written_down_value'];
            }
            if (variant === 'summary') {
                return ['category', 'sub_category', 'branch', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day'];
            }
            return ['category', 'sub_category', 'asset_no', 'location', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value'];
        }
        default:
            return Object.keys(firstRow || {});
    }
}

function ReportPreview({ payload }: { payload: Record<string, unknown> }) {
    const headers = (payload.headers as string[]) ?? [];
    const rows = (payload.rows as Record<string, unknown>[]) ?? [];
    const sections = (payload.sections as Section[]) ?? [];
    const totals = payload.totals as Record<string, unknown> | undefined;
    const template = String(payload.template ?? '');
    const meta = payload.meta as { row_count?: number } | undefined;

    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        sections.forEach((s, idx) => {
            init[s.title || String(idx)] = sections.length <= 5 || idx < 3;
        });
        return init;
    });

    const [searchQuery, setSearchQuery] = useState('');

    const toggleSection = (title: string) => {
        setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    const expandAll = () => {
        const next: Record<string, boolean> = {};
        sections.forEach((s, idx) => {
            next[s.title || String(idx)] = true;
        });
        setExpanded(next);
    };

    const collapseAll = () => {
        const next: Record<string, boolean> = {};
        sections.forEach((s, idx) => {
            next[s.title || String(idx)] = false;
        });
        setExpanded(next);
    };

    const sampleRow = rows[0] ?? sections[0]?.rows?.[0] ?? {};
    const colKeys = columnKeys(template, sampleRow, payload);

    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase().trim();

        return sections
            .map((sec) => {
                const matchTitle = (sec.title || '').toLowerCase().includes(q);
                const matchingRows = sec.rows.filter((r) =>
                    Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
                );

                if (matchTitle || matchingRows.length > 0) {
                    return {
                        ...sec,
                        rows: matchTitle ? sec.rows : matchingRows,
                    };
                }
                return null;
            })
            .filter((sec): sec is Section => sec !== null);
    }, [sections, searchQuery]);

    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const q = searchQuery.toLowerCase().trim();
        return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)));
    }, [rows, searchQuery]);

    if (rows.length === 0 && sections.length === 0) {
        return (
            <div className="py-12 text-center text-sm text-zinc-500">
                No asset records found for the selected period and filters.
            </div>
        );
    }

    const isGrouped = sections.length > 0;
    const isCategoryReport = template.includes('category') || (payload.purchase_group === 'category');

    return (
        <div className="space-y-4">
            {/* Action Bar / Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-200">
                <div className="flex items-center gap-2">
                    <div className="relative w-64 sm:w-80">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="Search in table (asset code, name, branch...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs bg-white border-zinc-200 focus-visible:ring-1"
                        />
                    </div>
                    {meta?.row_count != null && (
                        <Badge variant="secondary" className="text-[11px] font-normal py-0.5 px-2 bg-zinc-200/70 text-zinc-800">
                            {meta.row_count} total assets
                        </Badge>
                    )}
                </div>

                {isGrouped && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={expandAll}
                            className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 bg-white"
                        >
                            <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5" /> Expand All
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={collapseAll}
                            className="h-7 text-xs px-2.5 text-zinc-700 hover:text-zinc-900 bg-white"
                        >
                            <ChevronsDownUp className="mr-1.5 h-3.5 w-3.5" /> Collapse All
                        </Button>
                    </div>
                )}
            </div>

            {/* Tree Table with Group Accordion */}
            <div className="overflow-x-auto rounded-lg border border-zinc-200 shadow-2xs bg-white">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-800 text-white font-medium">
                            {headers.map((h, i) => (
                                <th
                                    key={h + i}
                                    className={`px-3 py-2.5 border-r border-slate-700 last:border-r-0 whitespace-nowrap text-[11px] tracking-wide ${
                                        isNumericCol(h) ? 'text-right' : 'text-left'
                                    }`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isGrouped ? (
                            filteredSections.length === 0 ? (
                                <tr>
                                    <td colSpan={headers.length} className="py-8 text-center text-zinc-400 font-medium">
                                        No matching records.
                                    </td>
                                </tr>
                            ) : (
                                filteredSections.map((section, idx) => {
                                    const secKey = section.title || String(idx);
                                    const isExpanded = Boolean(expanded[secKey] || searchQuery.trim());
                                    const count = section.rows.length;
                                    const purchaseAmt = section.subtotal?.purchase_amount ?? section.subtotal?.purchase_cost;
                                    const closingVal = section.subtotal?.closing_value ?? section.subtotal?.book_value;

                                    return (
                                        <React.Fragment key={secKey}>
                                            {/* Top-Level Group Header Row */}
                                            <tr
                                                onClick={() => toggleSection(secKey)}
                                                className="bg-blue-50/90 hover:bg-blue-100/80 cursor-pointer border-t-2 border-b border-blue-200 transition-colors select-none group"
                                            >
                                                <td
                                                    colSpan={headers.length}
                                                    className="px-3 py-2 text-zinc-900 font-semibold"
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2.5">
                                                            {/* Expand/Collapse Toggle Button */}
                                                            <button
                                                                type="button"
                                                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-600 text-white shadow-xs group-hover:bg-blue-700 transition-colors"
                                                                title={isExpanded ? 'Collapse' : 'Expand'}
                                                            >
                                                                {isExpanded ? (
                                                                    <Minus className="h-3 w-3 stroke-[3]" />
                                                                ) : (
                                                                    <Plus className="h-3 w-3 stroke-[3]" />
                                                                )}
                                                            </button>

                                                            {/* Group Icon & Title */}
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 tracking-tight">
                                                                {isCategoryReport ? (
                                                                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                                                                ) : (
                                                                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                                                )}
                                                                <span>{section.title || 'Untitled Group'}</span>
                                                            </div>

                                                            <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300 text-[10px] font-semibold py-0 px-1.5">
                                                                {count} {count === 1 ? 'asset' : 'assets'}
                                                            </Badge>
                                                        </div>

                                                        {/* Group Summary Metrics in Header Bar */}
                                                        <div className="flex items-center gap-6 text-[11px] font-mono pr-2">
                                                            {purchaseAmt != null && (
                                                                <span className="text-zinc-700 font-semibold">
                                                                    Purchase:{' '}
                                                                    <strong className="text-zinc-950 font-bold">
                                                                        ৳{fmt(purchaseAmt)}
                                                                    </strong>
                                                                </span>
                                                            )}
                                                            {closingVal != null && (
                                                                <span className="text-zinc-700 font-semibold">
                                                                    Closing:{' '}
                                                                    <strong className="text-emerald-700 font-bold">
                                                                        ৳{fmt(closingVal)}
                                                                    </strong>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Child Single Asset Records */}
                                            {isExpanded &&
                                                section.rows.map((row, rIdx) => (
                                                    <tr
                                                        key={rIdx}
                                                        className={`border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors ${
                                                            rIdx % 2 === 1 ? 'bg-zinc-50/30' : 'bg-white'
                                                        }`}
                                                    >
                                                        {colKeys.map((k, colIdx) => {
                                                            const isNum = isNumericCol(k);
                                                            const val = row[k];

                                                            return (
                                                                <td
                                                                    key={k + colIdx}
                                                                    className={`px-3 py-1.5 text-zinc-700 border-r border-zinc-100 last:border-r-0 whitespace-nowrap ${
                                                                        isNum ? 'text-right font-mono text-[11px]' : 'text-left'
                                                                    }`}
                                                                >
                                                                    {k === 'status' ? (
                                                                        <StatusBadge status={val} />
                                                                    ) : (
                                                                        cellDisplay(val, k)
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}

                                            {/* Subtotal row for expanded section */}
                                            {isExpanded && (
                                                <tr className="bg-blue-50/40 border-b-2 border-blue-200/80 font-semibold text-zinc-800 text-[11px]">
                                                    <td colSpan={Math.max(1, colKeys.length - 2)} className="px-3 py-1.5 text-right font-bold text-slate-700">
                                                        Subtotal ({section.title}):
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono font-bold text-zinc-900">
                                                        {purchaseAmt != null ? `৳${fmt(purchaseAmt)}` : ''}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-800">
                                                        {closingVal != null ? `৳${fmt(closingVal)}` : ''}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )
                        ) : filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length} className="py-8 text-center text-zinc-400 font-medium">
                                    No matching records.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row, i) => (
                                <tr
                                    key={i}
                                    className={`border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors ${
                                        i % 2 === 1 ? 'bg-zinc-50/30' : 'bg-white'
                                    }`}
                                >
                                    {colKeys.map((k, colIdx) => {
                                        const isNum = isNumericCol(k);
                                        const val = row[k];
                                        return (
                                            <td
                                                key={k + colIdx}
                                                className={`px-3 py-1.5 text-zinc-700 border-r border-zinc-100 last:border-r-0 whitespace-nowrap ${
                                                    isNum ? 'text-right font-mono text-[11px]' : 'text-left'
                                                }`}
                                            >
                                                {k === 'status' ? (
                                                    <StatusBadge status={val} />
                                                ) : (
                                                    cellDisplay(val, k)
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}

                        {/* Grand Totals */}
                        {totals && (
                            <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                                <td className="px-3 py-2.5 text-white">Grand Total</td>
                                {colKeys.slice(1).map((k) => {
                                    const isNum = isNumericCol(k);
                                    const val = totals[k];
                                    return (
                                        <td
                                            key={k}
                                            className={`px-3 py-2.5 border-r border-slate-800 last:border-r-0 whitespace-nowrap ${
                                                isNum ? 'text-right font-mono text-[11px]' : 'text-left'
                                            }`}
                                        >
                                            {val != null ? (isNum ? `৳${fmt(val)}` : String(val)) : ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Grand Total Summary Box */}
            {totals && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-zinc-900 text-white rounded-lg shadow-xs text-xs">
                    <div className="font-semibold text-zinc-200">
                        Summary Totals ({meta?.row_count ?? totals.asset_count ?? 0} Assets)
                    </div>
                    <div className="flex items-center gap-6 font-mono">
                        {totals.purchase_amount != null && (
                            <span>
                                Total Purchase: <strong className="text-emerald-400 font-bold text-sm">৳{fmt(totals.purchase_amount)}</strong>
                            </span>
                        )}
                        {totals.closing_value != null && (
                            <span>
                                Total Closing Book Value: <strong className="text-sky-400 font-bold text-sm">৳{fmt(totals.closing_value)}</strong>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function FixedAssetReportShow({
    companyName,
    companyAddress = '',
    report,
    filterOptions,
    filters: initFilters,
    branchScoped,
    generated,
    payload,
    periodLabel,
    branchLabel,
    printMetaLabel,
    error,
    exportUrls,
}: Props) {
    const allowed = report.filters;
    const [filters, setFilters] = useState({
        ...initFilters,
        date_from: toFormDisplayDate(initFilters.date_from),
        date_to: toFormDisplayDate(initFilters.date_to),
    });
    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const showFinancialYear = report.usesFinancialYear || allowed.includes('financial_year_id');
    const showBranch = allowed.includes('branch_id') && !branchScoped;
    const showCategory = allowed.includes('asset_category_id');
    const showStatus = allowed.includes('status');
    const showYear = allowed.includes('year') || report.purchaseMonth;
    const showMonth = allowed.includes('month') || report.purchaseMonth;
    const showOptionalDateRange = report.dateRange;

    const applyFinancialYearDates = (fyId: string) => {
        const fy = filterOptions.financialYears.find((f) => String(f.id) === fyId);
        if (!fy) return;
        setFilters((f) => ({
            ...f,
            financial_year_id: fyId,
            date_from: toFormDisplayDate(fy.start_date),
            date_to: toFormDisplayDate(fy.end_date),
        }));
    };

    const generate = () => {
        router.get(route('fixed-asset.reports.show', report.slug), {
            ...filters,
            date_from: displayDateToServer(toFormDisplayDate(filters.date_from)),
            date_to: displayDateToServer(toFormDisplayDate(filters.date_to)),
            generate: '1',
        }, { preserveState: true });
    };

    const exportQuery = useMemo(() => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (!v) return;
            if (k === 'date_from' || k === 'date_to') {
                p.set(k, displayDateToServer(toFormDisplayDate(v)));
            } else {
                p.set(k, v);
            }
        });
        p.set('generate', '1');
        return p.toString();
    }, [filters]);

    const urls = useMemo(() => {
        if (!exportUrls) return null;
        const q = exportQuery ? `?${exportQuery}` : '';
        return {
            print: `${exportUrls.print.split('?')[0]}${q}`,
            pdf: `${exportUrls.pdf.split('?')[0]}${q}`,
            excel: `${exportUrls.excel.split('?')[0]}${q}`,
        };
    }, [exportUrls, exportQuery]);

    return (
        <Layout>
            <Head title={report.title} />
            <PayrollPage>
                <PayrollPageHeader title={report.title} description={report.description}>
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('sections.fixed-asset')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Fixed Asset
                        </Link>
                    </Button>
                </PayrollPageHeader>

                {branchScoped && (
                    <Alert className="mb-4 border-blue-200 bg-blue-50">
                        <AlertTitle>Branch view</AlertTitle>
                        <AlertDescription>Results are limited to your branch.</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filters" description="Financial year and dates drive the report period. Adjust filters, then generate.">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {showFinancialYear && (
                            <PayrollField label="Financial Year">
                                <ComboSelect
                                    value={filters.financial_year_id ? Number(filters.financial_year_id) : null}
                                    onChange={(id) => id && applyFinancialYearDates(String(id))}
                                    items={filterOptions.financialYears.map((fy) => ({
                                        value: fy.id,
                                        label: `${fy.label}${fy.is_active ? ' (Active)' : ''}`,
                                    }))}
                                    placeholder="Select financial year"
                                />
                            </PayrollField>
                        )}
                        {showBranch && (
                            <PayrollField label="Branch">
                                <ComboSelect
                                    value={filters.branch_id ? Number(filters.branch_id) : null}
                                    onChange={(id) => setFilter('branch_id', id != null ? String(id) : '')}
                                    items={branchComboSelectItems(filterOptions.branches, { numericValue: true })}
                                    placeholder="All branches"
                                />
                            </PayrollField>
                        )}
                        {showCategory && (
                            <PayrollField label="Category">
                                <ComboSelect
                                    value={filters.asset_category_id ? Number(filters.asset_category_id) : null}
                                    onChange={(id) => setFilter('asset_category_id', id != null ? String(id) : '')}
                                    items={filterOptions.categories.map((c) => ({
                                        value: c.id,
                                        label: c.name,
                                        keywords: c.code,
                                    }))}
                                    placeholder="All categories"
                                />
                            </PayrollField>
                        )}
                        {showStatus && (
                            <PayrollField label="Status">
                                <ComboSelect
                                    value={filters.status || null}
                                    onChange={(v) => setFilter('status', v != null ? String(v) : '')}
                                    items={filterOptions.statuses.map((s) => ({
                                        value: s.value,
                                        label: s.label,
                                    }))}
                                    placeholder="All statuses"
                                />
                            </PayrollField>
                        )}
                        {showYear && (
                            <PayrollYearSelect
                                value={filters.year}
                                onChange={(v) => setFilter('year', v)}
                                years={filterOptions.years}
                                required
                            />
                        )}
                        {showMonth && (
                            <PayrollMonthSelect
                                value={filters.month}
                                onChange={(v) => setFilter('month', v)}
                                months={filterOptions.months}
                                required
                            />
                        )}
                        {showOptionalDateRange && (
                            <>
                                <FormDateField
                                    label="Date from"
                                    value={filters.date_from}
                                    onChange={(v) => setFilter('date_from', v)}
                                />
                                <FormDateField
                                    label="Date to"
                                    value={filters.date_to}
                                    onChange={(v) => setFilter('date_to', v)}
                                />
                            </>
                        )}
                    </div>
                    <div className="mt-4">
                        <Button type="button" onClick={generate}>
                            <Search className="mr-2 h-4 w-4" /> Generate report
                        </Button>
                    </div>
                </PayrollSectionCard>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Cannot generate</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {generated && payload && !error && (
                    <PayrollSectionCard
                        className="mt-6"
                        title="Preview"
                        description={`${companyName} · Period: ${periodLabel}`}
                    >
                        {urls && (
                            <div className="mb-4 flex flex-wrap gap-2 print:hidden">
                                <Button type="button" variant="outline" size="sm" onClick={() => window.open(urls.print, '_blank')}>
                                    <Printer className="mr-2 h-4 w-4" /> Print
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <a href={urls.pdf} target="_blank" rel="noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> PDF
                                    </a>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <a href={urls.excel}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (CSV)
                                    </a>
                                </Button>
                            </div>
                        )}
                        <PayrollReportDocumentHeader
                            companyName={companyName}
                            companyAddress={companyAddress}
                            title={report.title}
                        />
                        <div className="mb-3 flex items-baseline justify-between gap-4 text-[11px] font-bold text-slate-900">
                            <span className="text-left">{branchLabel}</span>
                            <span className="shrink-0 text-right whitespace-nowrap">
                                {printMetaLabel}
                                {(payload.meta as { row_count?: number } | undefined)?.row_count != null && (
                                    <> &nbsp;|&nbsp; Records: {(payload.meta as { row_count?: number }).row_count}</>
                                )}
                            </span>
                        </div>
                        <ReportPreview payload={payload} />
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
