import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
    PayrollFilterGrid,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { PayrollReportDocumentHeader } from '@/components/payroll/PayrollReportDocumentHeader';
import { PayrollReportSignatureSection } from '@/components/payroll/PayrollReportSignatureSection';
import { ArrowLeft, Download, FileSpreadsheet, Printer, Search } from 'lucide-react';

type ReportMeta = {
    slug: string;
    title: string;
    description: string;
    filters: string[];
    requireEmployee?: boolean;
};

type SignatureBlock = {
    label: string;
    department: string;
};

type Props = {
    companyName?: string;
    companyAddress?: string;
    signatureBlocks?: SignatureBlock[];
    report: ReportMeta;
    filterOptions: {
        branches: { id: number; name: string; branch_code?: string | null }[];
        departments: { id: number; name: string }[];
        designations: { id: number; name: string }[];
        programs: { id: number; name: string }[];
        projects: { id: number; name: string }[];
        employees: { id: number; pin?: string; name_en?: string; employee_id?: string }[];
        salaryHeads: { id: number; name: string }[];
        payscales: { id: number; name: string; code?: string }[];
        months: { value: number; label: string }[];
        years: number[];
    };
    filters: Record<string, string>;
    generated: boolean;
    payload: Record<string, unknown> | null;
    periodLabel: string;
    error: string | null;
    exportUrls: { print: string; pdf: string; excel: string };
};

function fmt(n: unknown) {
    const v = Number(n);
    return Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

function fmtSheet(n: unknown) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    const rounded = Math.round(v);
    return rounded === 0 ? '-' : rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function nameWithPin(row: Record<string, unknown>): string {
    const name = String(row.name ?? '').trim();
    const pin = String(row.pin ?? '').trim();
    if (name && pin) return `${name} (${pin})`;
    return name || pin;
}

function maxTextLen(values: string[], floor = 1): number {
    let max = floor;
    for (const value of values) {
        const text = value.trim();
        if (text) max = Math.max(max, text.length);
    }
    return max;
}

function amountColWidth(
    rows: Record<string, unknown>[],
    totals: Record<string, unknown> | undefined,
    pick: (row: Record<string, unknown>) => unknown,
): number {
    const texts = rows.map((row) => fmtSheet(pick(row)));
    if (totals) texts.push(fmtSheet(pick(totals)));
    return maxTextLen(texts, 2);
}

function serialColumnWidth(dataWidth: number): number {
    return Math.max(dataWidth, 3) + 2;
}

function textColumnWidth(dataWidth: number, headerLabel: string): number {
    return Math.max(dataWidth, headerLabel.trim().length, 4) + 2;
}

function amountColumnWidth(dataWidth: number, headerLabel: string): number {
    return Math.max(dataWidth, headerMinWidth(headerLabel), 2) + 3;
}

function headerMinWidth(label: string): number {
    const text = label.trim();
    if (!text) return 2;
    if (text.length <= 5) return Math.max(2, text.length);
    const words = text.split(/\s+/).map((word) => word.replace(/[()]/g, '')).filter(Boolean);
    return Math.max(2, ...words.map((word) => word.length));
}

function SalarySheetTable({
    earningHeads,
    deductionHeads,
    headLabels,
    rows,
    totals,
}: {
    earningHeads: string[];
    deductionHeads: string[];
    headLabels: Record<string, string>;
    rows: Record<string, unknown>[];
    totals?: Record<string, unknown>;
}) {
    const labelFor = (key: string) => headLabels[key] ?? key;
    const employeeCols = 4;
    const earningCols = earningHeads.length + 1;
    const deductionCols = deductionHeads.length + 1;
    const summaryCols = 2;
    const thClass = 'border-r border-black px-1 py-1 text-center align-middle whitespace-normal break-normal leading-[1.05]';
    const tdClass = 'border-r border-black px-1 py-1 align-middle overflow-visible';
    const textClass = `${tdClass} whitespace-nowrap text-left`;
    const nowrapClass = textClass;
    const amountClass = `${tdClass} whitespace-nowrap text-center tabular-nums`;
    const amountHeadClass = `${thClass} text-[8px] print:text-[7px]`;

    const dataWidths = useMemo(() => {
        const nameTexts = rows.map(nameWithPin);
        if (totals) nameTexts.push('Total');

        return {
            serial: maxTextLen(rows.map((_, i) => String(i + 1)), 2),
            name: maxTextLen(nameTexts, 4),
            designation: maxTextLen(rows.map((row) => String(row.designation ?? '')), 4),
            grade: maxTextLen(rows.map((row) => String(row.grade_step ?? '')), 4),
            earning: Object.fromEntries(
                earningHeads.map((head) => [
                    head,
                    amountColWidth(rows, totals, (row) => (row.components as Record<string, number>)?.[head]),
                ]),
            ),
            gross: amountColWidth(rows, totals, (row) => row.gross),
            deduction: Object.fromEntries(
                deductionHeads.map((head) => [
                    head,
                    amountColWidth(rows, totals, (row) => (row.components as Record<string, number>)?.[head]),
                ]),
            ),
            ded: amountColWidth(rows, totals, (row) => row.deduction),
            net: amountColWidth(rows, totals, (row) => row.net),
            bank: maxTextLen(rows.map((row) => String(row.account_no ?? '')), 4),
        };
    }, [rows, totals, earningHeads, deductionHeads]);

    const colWidths = useMemo(() => ({
        serial: serialColumnWidth(Math.max(dataWidths.serial, headerMinWidth('#'))),
        name: textColumnWidth(dataWidths.name, 'Name (Pin)'),
        designation: textColumnWidth(dataWidths.designation, 'Designation'),
        grade: textColumnWidth(dataWidths.grade, 'Grade (Step)'),
        earning: Object.fromEntries(
            earningHeads.map((head) => [
                head,
                amountColumnWidth(dataWidths.earning[head], labelFor(head)),
            ]),
        ),
        gross: amountColumnWidth(dataWidths.gross, 'Gross'),
        deduction: Object.fromEntries(
            deductionHeads.map((head) => [
                head,
                amountColumnWidth(dataWidths.deduction[head], labelFor(head)),
            ]),
        ),
        ded: amountColumnWidth(dataWidths.ded, 'Ded.'),
        net: amountColumnWidth(dataWidths.net, 'Net'),
        bank: textColumnWidth(dataWidths.bank, 'Bank Account No.'),
    }), [dataWidths, earningHeads, deductionHeads, headLabels]);

    const dataTotalChars = useMemo(() => {
        const all = [
            dataWidths.serial,
            dataWidths.name,
            dataWidths.designation,
            dataWidths.grade,
            ...earningHeads.map((h) => dataWidths.earning[h]),
            dataWidths.gross,
            ...deductionHeads.map((h) => dataWidths.deduction[h]),
            dataWidths.ded,
            dataWidths.net,
            dataWidths.bank,
        ];

        return Math.max(1, all.reduce((sum, value) => sum + value, 0));
    }, [dataWidths, earningHeads, deductionHeads]);

    const layoutTotalChars = useMemo(() => {
        const all = [
            colWidths.serial,
            colWidths.name,
            colWidths.designation,
            colWidths.grade,
            ...earningHeads.map((h) => colWidths.earning[h]),
            colWidths.gross,
            ...deductionHeads.map((h) => colWidths.deduction[h]),
            colWidths.ded,
            colWidths.net,
            colWidths.bank,
        ];

        return Math.max(1, all.reduce((sum, value) => sum + value, 0));
    }, [colWidths, earningHeads, deductionHeads]);

    const fillPage = dataTotalChars < 195;
    const colCss = (chars: number) =>
        fillPage ? `${((chars / layoutTotalChars) * 100).toFixed(4)}%` : `${chars}ch`;

    return (
        <div className="overflow-x-auto border border-black print:overflow-visible">
            <table
                className={`${fillPage ? 'w-full' : 'w-auto max-w-full'} table-fixed border-collapse text-[10px] text-black print:text-[9px]`}
            >
                <colgroup>
                    <col style={{ width: colCss(colWidths.serial) }} />
                    <col style={{ width: colCss(colWidths.name) }} />
                    <col style={{ width: colCss(colWidths.designation) }} />
                    <col style={{ width: colCss(colWidths.grade) }} />
                    {earningHeads.map((h) => (
                        <col key={h} style={{ width: colCss(colWidths.earning[h]) }} />
                    ))}
                    <col style={{ width: colCss(colWidths.gross) }} />
                    {deductionHeads.map((h) => (
                        <col key={h} style={{ width: colCss(colWidths.deduction[h]) }} />
                    ))}
                    <col style={{ width: colCss(colWidths.ded) }} />
                    <col style={{ width: colCss(colWidths.net) }} />
                    <col style={{ width: colCss(colWidths.bank) }} />
                </colgroup>
                <thead>
                    <tr className="border-b border-black bg-muted/30">
                        <th colSpan={employeeCols} className={`${thClass} text-center font-bold`}>
                            Employee Info
                        </th>
                        <th colSpan={earningCols} className={`${thClass} text-center font-bold`}>
                            Salary &amp; Allowance
                        </th>
                        <th colSpan={deductionCols} className={`${thClass} text-center font-bold`}>
                            Deduction
                        </th>
                        <th colSpan={summaryCols} className="p-1.5 align-middle" />
                    </tr>
                    <tr className="border-b border-black">
                        <th className={`${thClass}`}>#</th>
                        <th className={`${thClass} whitespace-normal`}>Name (Pin)</th>
                        <th className={thClass}>Designation</th>
                        <th className={thClass}>Grade (Step)</th>
                        {earningHeads.map((h) => (
                            <th key={h} className={amountHeadClass}>
                                {labelFor(h)}
                            </th>
                        ))}
                        <th className={amountHeadClass}>Gross</th>
                        {deductionHeads.map((h) => (
                            <th key={h} className={amountHeadClass}>
                                {labelFor(h)}
                            </th>
                        ))}
                        <th className={amountHeadClass}>Ded.</th>
                        <th className={amountHeadClass}>Net</th>
                        <th className="border-r border-black p-1.5 text-center align-middle">Bank Account No.</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-black">
                            <td className={`${tdClass} text-center`}>{i + 1}</td>
                            <td className={nowrapClass}>{nameWithPin(row)}</td>
                            <td className={nowrapClass}>{String(row.designation ?? '')}</td>
                            <td className={nowrapClass}>{String(row.grade_step ?? '')}</td>
                            {earningHeads.map((h) => (
                                <td key={h} className={amountClass}>
                                    {fmtSheet((row.components as Record<string, number>)?.[h])}
                                </td>
                            ))}
                            <td className={amountClass}>{fmtSheet(row.gross)}</td>
                            {deductionHeads.map((h) => (
                                <td key={h} className={amountClass}>
                                    {fmtSheet((row.components as Record<string, number>)?.[h])}
                                </td>
                            ))}
                            <td className={amountClass}>{fmtSheet(row.deduction)}</td>
                            <td className={amountClass}>{fmtSheet(row.net)}</td>
                            <td className={nowrapClass}>{String(row.account_no ?? '')}</td>
                        </tr>
                    ))}
                    {totals && (
                        <tr className="font-bold">
                            <td colSpan={employeeCols} className={`${tdClass} text-right`}>
                                Total
                            </td>
                            {earningHeads.map((h) => (
                                <td key={h} className={amountClass}>
                                    {fmtSheet((totals.components as Record<string, number>)?.[h])}
                                </td>
                            ))}
                            <td className={amountClass}>{fmtSheet(totals.gross)}</td>
                            {deductionHeads.map((h) => (
                                <td key={h} className={amountClass}>
                                    {fmtSheet((totals.components as Record<string, number>)?.[h])}
                                </td>
                            ))}
                            <td className={amountClass}>{fmtSheet(totals.deduction)}</td>
                            <td className={amountClass}>{fmtSheet(totals.net)}</td>
                            <td className="p-1" />
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ReportPreview({
    payload,
    signatureBlocks = [],
}: {
    payload: Record<string, unknown>;
    signatureBlocks?: SignatureBlock[];
}) {
    const template = String(payload.template ?? '');

    if (payload.meta && typeof payload.meta === 'object' && (payload.meta as { message?: string }).message) {
        return <p className="text-sm text-muted-foreground">{(payload.meta as { message: string }).message}</p>;
    }

    if (template === 'salary-certificate') {
        const emp = payload.employee as Record<string, string> | null;
        if (!emp) return <p className="text-sm">No certificate data.</p>;
        return (
            <div className="max-w-2xl space-y-3 text-sm text-black">
                <p className="text-center font-bold">SALARY CERTIFICATE</p>
                <p>
                    <strong>{emp.name}</strong> (PIN: {emp.pin}) — {emp.designation} — {payload.period as string}
                </p>
                <p>Net payable: ৳{fmt(payload.net)}</p>
            </div>
        );
    }

    if (template === 'grade-step') {
        const heads = (payload.heads as string[]) ?? [];
        const headLabels = (payload.head_labels as Record<string, string>) ?? {};
        const rows = (payload.rows as Record<string, unknown>[]) ?? [];
        const totals = payload.totals as Record<string, unknown> | undefined;
        const labelFor = (key: string) => headLabels[key] ?? key;
        return (
            <div className="overflow-x-auto border border-black print:overflow-visible">
                <table className="w-full min-w-max border-collapse text-[10px] text-black print:text-[9px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="border-r border-black p-1 text-left">Payscale</th>
                            <th className="border-r border-black p-1 text-left">Grade</th>
                            <th className="border-r border-black p-1 text-right">Step</th>
                            {heads.map((h) => (
                                <th key={h} className="border-r border-black p-1 text-right align-bottom whitespace-normal leading-tight min-w-[3.5rem] max-w-[5.5rem]">
                                    {labelFor(h)}
                                </th>
                            ))}
                            <th className="border-r border-black p-1 text-right">Gross</th>
                            <th className="border-r border-black p-1 text-right">Deduction Total</th>
                            <th className="p-1 text-right">Net</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-black">
                                <td className="border-r border-black p-1">{String(row.payscale ?? '')}</td>
                                <td className="border-r border-black p-1">{String(row.grade ?? '')}</td>
                                <td className="border-r border-black p-1 text-right">{String(row.step ?? '')}</td>
                                {heads.map((h) => (
                                    <td key={h} className="border-r border-black p-1 text-right">
                                        {fmtSheet((row.components as Record<string, number>)?.[h])}
                                    </td>
                                ))}
                                <td className="border-r border-black p-1 text-right">{fmt(row.gross)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.deduction)}</td>
                                <td className="p-1 text-right">{fmt(row.net)}</td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="font-bold">
                                <td colSpan={3} className="border-r border-black p-1">Total</td>
                                {heads.map((h) => (
                                    <td key={h} className="border-r border-black p-1 text-right">
                                        {fmt((totals.components as Record<string, number>)?.[h])}
                                    </td>
                                ))}
                                <td className="border-r border-black p-1 text-right">{fmt(totals.gross)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.deduction)}</td>
                                <td className="p-1 text-right">{fmt(totals.net)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    if (template === 'salary-sheet' || template === 'salary-sheet-grouped') {
        const earningHeads = (payload.earning_heads as string[]) ?? [];
        const deductionHeads = (payload.deduction_heads as string[]) ?? [];
        const headLabels = (payload.head_labels as Record<string, string>) ?? {};

        if (template === 'salary-sheet-grouped') {
            const sections = (payload.sections as { label: string; rows: Record<string, unknown>[]; totals?: Record<string, unknown> }[]) ?? [];
            const salaryMonth = String(payload.salary_month ?? '');
            if (sections.length === 0) {
                return <p className="text-sm text-muted-foreground">No payslips found for the selected filters.</p>;
            }
            return (
                <div className="space-y-4">
                    {sections.map((section, si) => (
                        <div key={si}>
                            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs font-bold text-black">
                                <span>{section.label}</span>
                                {salaryMonth !== '' && <span className="shrink-0">Salary Month: {salaryMonth}</span>}
                            </div>
                            <div className="flex flex-col print:min-h-[calc(210mm-8mm)]">
                                <SalarySheetTable
                                    earningHeads={earningHeads}
                                    deductionHeads={deductionHeads}
                                    headLabels={headLabels}
                                    rows={section.rows ?? []}
                                    totals={section.totals}
                                />
                                <PayrollReportSignatureSection blocks={signatureBlocks} className="mt-8 shrink-0 pt-2 print:mt-auto print:mb-[100px]" />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        const rows = (payload.rows as Record<string, unknown>[]) ?? [];
        const totals = payload.totals as Record<string, unknown> | undefined;
        return (
            <SalarySheetTable
                earningHeads={earningHeads}
                deductionHeads={deductionHeads}
                headLabels={headLabels}
                rows={rows}
                totals={totals}
            />
        );
    }

    const simpleRows = (payload.rows as Record<string, unknown>[]) ?? [];
    if (simpleRows.length === 0) {
        return <p className="text-sm text-muted-foreground">No rows in this report.</p>;
    }

    const keys = Object.keys(simpleRows[0]).filter((k) => k !== 'components' && k !== 'withheld');
    return (
        <div className="overflow-x-auto border border-black">
            <table className="w-full border-collapse text-[11px] text-black">
                <thead>
                    <tr className="border-b border-black">
                        {keys.map((k) => (
                            <th key={k} className="border-r border-black p-1 text-left capitalize">
                                {k.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {simpleRows.map((row, i) => (
                        <tr key={i} className="border-b border-black">
                            {keys.map((k) => (
                                <td key={k} className="border-r border-black p-1">
                                    {typeof row[k] === 'number' ? fmt(row[k]) : String(row[k] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function PayrollReportShow({
    companyName,
    companyAddress,
    signatureBlocks = [],
    report,
    filterOptions,
    filters: initFilters,
    generated,
    payload,
    periodLabel,
    error,
    exportUrls,
}: Props) {
    const { auth } = usePage().props as { auth?: { permissions?: string[] } };
    const canExport = auth?.permissions?.includes('reports.export') ?? true;

    const [filters, setFilters] = useState(initFilters);
    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const show = useMemo(() => {
        const f = report.filters;
        return {
            year: f.includes('year'),
            month: f.includes('month'),
            dateRange: f.includes('date_from'),
            employee: f.includes('employee_id'),
            salaryHead: f.includes('salary_head_id'),
            payscale: f.includes('payscale_id'),
            grid: f.some((x) => ['branch_id', 'department_id', 'designation_id', 'program_id', 'project_id'].includes(x)),
        };
    }, [report.filters]);

    const generate = () => {
        router.get(`/payroll/reports/${report.slug}`, { ...filters, generate: '1' }, { preserveState: true });
    };

    const query = useMemo(() => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v) p.set(k, v);
        });
        return p.toString();
    }, [filters]);

    const printUrl = `/payroll/reports/${report.slug}/print?${query}`;
    const pdfUrl = `/payroll/reports/${report.slug}/pdf?${query}`;
    const excelUrl = `/payroll/reports/${report.slug}/excel?${query}`;

    return (
        <Layout>
            <Head title={report.title} />
            <PayrollPage>
                <PayrollPageHeader title={report.title} description={report.description}>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/payroll/reports">
                            <ArrowLeft className="mr-2 h-4 w-4" /> All reports
                        </Link>
                    </Button>
                </PayrollPageHeader>

                <PayrollSectionCard title="Filters" description="Set criteria and click Generate report.">
                    <div className="space-y-4">
                        {show.payscale && (
                            <PayrollComboField
                                label="Payscale"
                                value={filters.payscale_id}
                                onChange={(v) => setFilter('payscale_id', v)}
                                items={[
                                    { value: '', label: 'All payscales' },
                                    ...filterOptions.payscales.map((p) => ({
                                        value: String(p.id),
                                        label: p.name,
                                        keywords: p.code,
                                    })),
                                ]}
                                placeholder="All payscales"
                            />
                        )}

                        {show.employee && !show.grid && (
                            <PayrollEmployeeSelect
                                value={filters.employee_id}
                                onChange={(v) => setFilter('employee_id', v)}
                                employees={filterOptions.employees}
                                required={report.requireEmployee}
                                allowAll={!report.requireEmployee}
                            />
                        )}

                        {show.grid && (
                            <PayrollFilterGrid
                                filters={filters}
                                setFilter={setFilter}
                                branches={filterOptions.branches}
                                departments={filterOptions.departments}
                                designations={filterOptions.designations}
                                programs={filterOptions.programs}
                                projects={filterOptions.projects}
                                employees={filterOptions.employees}
                                showEmployee={show.employee}
                                showProgram={report.filters.includes('program_id')}
                                showProject={report.filters.includes('project_id')}
                                showBranch={report.filters.includes('branch_id')}
                            />
                        )}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {show.year && (
                                <PayrollYearSelect
                                    value={filters.year}
                                    onChange={(v) => setFilter('year', v)}
                                    years={filterOptions.years}
                                    required={!show.dateRange}
                                    allowAll={show.dateRange}
                                />
                            )}
                            {show.month && (
                                <PayrollMonthSelect
                                    value={filters.month}
                                    onChange={(v) => setFilter('month', v)}
                                    months={filterOptions.months}
                                    required={!show.dateRange || !!report.requireEmployee}
                                    allowAll={!report.requireEmployee && !show.dateRange}
                                />
                            )}
                            {show.dateRange && (
                                <>
                                    <PayrollField label="Date from">
                                        <Input type="date" className="h-10 bg-white" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} />
                                    </PayrollField>
                                    <PayrollField label="Date to">
                                        <Input type="date" className="h-10 bg-white" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} />
                                    </PayrollField>
                                </>
                            )}
                            {show.salaryHead && (
                                <PayrollComboField
                                    label="Salary component"
                                    value={filters.salary_head_id}
                                    onChange={(v) => setFilter('salary_head_id', v)}
                                    items={[
                                        { value: '', label: 'All components' },
                                        ...filterOptions.salaryHeads.map((h) => ({
                                            value: String(h.id),
                                            label: h.name,
                                        })),
                                    ]}
                                    placeholder="All components"
                                />
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={generate}>
                                <Search className="mr-2 h-4 w-4" /> Generate report
                            </Button>
                        </div>
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
                        description={`Period: ${periodLabel} · ${String(payload.template ?? '') === 'salary-sheet' || String(payload.template ?? '') === 'salary-sheet-grouped' ? 'A4 landscape for print/PDF' : 'Black & white layout for A4 laser print'}`}
                    >
                        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
                            <Button type="button" variant="outline" size="sm" onClick={() => window.open(printUrl, '_blank')}>
                                <Printer className="mr-2 h-4 w-4" /> Print
                            </Button>
                            {canExport && (
                                <>
                                    <Button asChild variant="outline" size="sm">
                                        <a href={pdfUrl} target="_blank" rel="noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> PDF
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <a href={excelUrl}>
                                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                                        </a>
                                    </Button>
                                </>
                            )}
                        </div>
                        <PayrollReportDocumentHeader
                            companyName={companyName}
                            companyAddress={companyAddress}
                            title={report.title}
                        />
                        <ReportPreview payload={payload} signatureBlocks={signatureBlocks} />
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
