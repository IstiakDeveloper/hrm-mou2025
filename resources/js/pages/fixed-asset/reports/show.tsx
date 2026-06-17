import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ReportDocumentHeader } from '@/components/reports/ReportDocumentHeader';
import { PayrollField, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, toFormDisplayDate } from '@/lib/display-date';
import { ArrowLeft, Download, FileSpreadsheet, Printer, Search } from 'lucide-react';

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
    subtotal?: { asset_count?: number; purchase_cost?: number; purchase_amount?: number; closing_value?: number };
};

type Props = {
    companyName: string;
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
    error: string | null;
    exportUrls: { print: string; pdf: string; excel: string } | null;
};

function fmt(n: unknown) {
    const v = Number(n);
    return Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

function columnKeys(template: string, firstRow: Record<string, unknown>, payload?: Record<string, unknown>): string[] {
    if (payload?.headers && Array.isArray(payload.headers)) {
        const headerCount = (payload.headers as string[]).length;
        const rowKeys = Object.keys(firstRow);
        if (rowKeys.length >= headerCount) {
            return rowKeys;
        }
    }

    switch (template) {
        case 'asset-tracking':
            return ['sl', 'asset_no', 'model_no', 'purchase_date', 'purchase_amount', 'book_value', 'floor', 'room', 'voucher', 'ledger', 'description'];
        case 'purchase-list':
            return firstRow.category != null
                ? ['category', 'sub_category', 'asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status']
                : ['asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status'];
        case 'disposal-list':
            return ['sl', 'category', 'sub_category', 'asset_no', 'branch', 'purchase_date', 'purchase_amount', 'opening_value', 'depreciation', 'disposal_amount', 'closing_value'];
        case 'depreciation-schedule': {
            const variant = payload?.schedule_variant as string;
            const group = payload?.schedule_group as string;
            if (variant === 'audit') {
                return ['sl', 'group_label', 'asset_count', 'cost_opening', 'cost_addition', 'cost_sales_adj', 'cost_closing', 'depreciation_rate', 'dep_opening', 'dep_charged', 'dep_sales_adj', 'dep_closing', 'written_down_value'];
            }
            if (variant === 'summary') {
                return group === 'category'
                    ? ['sl', 'branch', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day']
                    : ['asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day'];
            }
            return group === 'branch'
                ? ['sub_category', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value']
                : ['asset_no', 'location', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value'];
        }
        default:
            return Object.keys(firstRow);
    }
}

function DataTable({
    headers,
    rows,
    colKeys,
    totals,
    template,
}: {
    headers: string[];
    rows: Record<string, unknown>[];
    colKeys: string[];
    totals?: Record<string, unknown>;
    template: string;
}) {
    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">No rows.</p>;
    }

    return (
        <div className="overflow-x-auto border border-slate-300">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-slate-300 bg-slate-50">
                        {headers.map((h) => (
                            <th key={h} className="border-r border-slate-200 px-2 py-1.5 text-left font-semibold last:border-r-0">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-200">
                            {colKeys.map((k) => (
                                <td key={k} className="border-r border-slate-100 px-2 py-1 last:border-r-0">
                                    {typeof row[k] === 'number' ? fmt(row[k]) : String(row[k] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {totals && (
                        <tr className="bg-slate-50 font-semibold">
                            <td className="px-2 py-1">Total</td>
                            {colKeys.slice(1).map((k) => (
                                <td key={k} className="px-2 py-1">
                                    {totals[k] != null ? fmt(totals[k]) : ''}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ReportPreview({ payload }: { payload: Record<string, unknown> }) {
    const headers = (payload.headers as string[]) ?? [];
    const rows = (payload.rows as Record<string, unknown>[]) ?? [];
    const sections = (payload.sections as Section[]) ?? [];
    const totals = payload.totals as Record<string, unknown> | undefined;
    const template = String(payload.template ?? '');
    const meta = payload.meta as { row_count?: number } | undefined;

    if (rows.length === 0 && sections.length === 0) {
        return <p className="text-sm text-muted-foreground">No rows in this report.</p>;
    }

    const colKeys = columnKeys(template, rows[0] ?? sections[0]?.rows?.[0] ?? {}, payload);

    if (sections.length > 0) {
        return (
            <div className="space-y-6">
                {meta?.row_count != null && (
                    <p className="text-xs text-muted-foreground">{meta.row_count} record(s)</p>
                )}
                {sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">
                            {section.title}
                            <span className="ml-2 font-normal text-muted-foreground">
                                ({section.rows.length} assets
                                {section.subtotal?.purchase_amount != null
                                    ? ` · ৳${fmt(section.subtotal.purchase_amount)}`
                                    : section.subtotal?.purchase_cost != null
                                      ? ` · ৳${fmt(section.subtotal.purchase_cost)}`
                                      : ''}
                                )
                            </span>
                        </h3>
                        <DataTable headers={headers} rows={section.rows} colKeys={colKeys} />
                    </div>
                ))}
                {totals && (
                    <p className="text-sm font-semibold">
                        Grand total: {totals.asset_count != null ? `${totals.asset_count} assets · ` : ''}
                        Purchase ৳{fmt(totals.purchase_amount ?? totals.purchase_cost)}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div>
            {meta?.row_count != null && (
                <p className="mb-2 text-xs text-muted-foreground">{meta.row_count} record(s)</p>
            )}
            <DataTable headers={headers} rows={rows} colKeys={colKeys} totals={totals} template={template} />
        </div>
    );
}

export default function FixedAssetReportShow({
    companyName,
    report,
    filterOptions,
    filters: initFilters,
    branchScoped,
    generated,
    payload,
    periodLabel,
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
                        <ReportDocumentHeader
                            companyName={companyName}
                            title={report.title}
                            periodLabel={periodLabel}
                            rowCount={(payload.meta as { row_count?: number } | undefined)?.row_count}
                        />
                        <ReportPreview payload={payload} />
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
