import {
    PayrollBranchSelect,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Layout from '@/layouts/AdminLayout';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { formatTakaAmount, formatTakaSheetCell } from '@/lib/taka-format';
import { takaInWords } from '@/lib/taka-in-words';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BarChart3, Building2, Download, FileSpreadsheet, Layers, Printer, Search, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

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

const FINAL_PAYMENT_STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
];

function fmt(n: unknown) {
    const v = Number(n);
    return Number.isFinite(v) ? formatTakaAmount(v, 2) : '—';
}

function fmtSheet(n: unknown) {
    return formatTakaSheetCell(n);
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
    const words = text
        .split(/\s+/)
        .map((word) => word.replace(/[()]/g, ''))
        .filter(Boolean);
    return Math.max(2, ...words.map((word) => word.length));
}

function SalarySheetTable({
    earningHeads,
    deductionHeads,
    headLabels,
    rows,
    totals,
    totalsLabel = 'Total',
    topsheet = false,
}: {
    earningHeads: string[];
    deductionHeads: string[];
    headLabels: Record<string, string>;
    rows: Record<string, unknown>[];
    totals?: Record<string, unknown>;
    totalsLabel?: string;
    topsheet?: boolean;
}) {
    const labelFor = useCallback((key: string) => headLabels[key] ?? key, [headLabels]);
    const employeeCols = topsheet ? 3 : 4;
    const earningCols = earningHeads.length + 1;
    const deductionCols = deductionHeads.length + 1;
    const infoLabel = topsheet ? 'Branch Info' : 'Employee Info';
    const nameLabel = topsheet ? 'Branch' : 'Name';
    const designationLabel = topsheet ? 'Employees' : 'Designation';
    const thClass = 'border-r border-black px-0.5 py-0.5 text-center align-middle whitespace-normal break-normal leading-[1.05]';
    const tdClass = 'border-r border-black px-0.5 py-0.5 align-middle overflow-visible';
    const textClass = `${tdClass} whitespace-nowrap text-left`;
    const nowrapClass = textClass;
    const amountClass = `${tdClass} whitespace-nowrap text-center tabular-nums text-[9px] print:text-[8px]`;
    const amountHeadClass = `${thClass} text-[8px] print:text-[7px]`;

    const dataWidths = useMemo(() => {
        const nameTexts = rows.map((row) => String(row.name ?? ''));
        if (totals) nameTexts.push(totalsLabel);

        return {
            serial: maxTextLen(
                rows.map((_, i) => String(i + 1)),
                2,
            ),
            name: maxTextLen(nameTexts, 4),
            pin: topsheet
                ? 0
                : maxTextLen(
                      rows.map((row) => String(row.pin ?? '')),
                      3,
                  ),
            designation: maxTextLen(
                rows.map((row) => String(row.designation ?? '')),
                4,
            ),
            earning: Object.fromEntries(
                earningHeads.map((head) => [head, amountColWidth(rows, totals, (row) => (row.components as Record<string, number>)?.[head])]),
            ),
            gross: amountColWidth(rows, totals, (row) => row.gross),
            deduction: Object.fromEntries(
                deductionHeads.map((head) => [head, amountColWidth(rows, totals, (row) => (row.components as Record<string, number>)?.[head])]),
            ),
            ded: amountColWidth(rows, totals, (row) => row.deduction),
            net: amountColWidth(rows, totals, (row) => row.net),
            bank: topsheet
                ? 0
                : maxTextLen(
                      rows.map((row) => String(row.account_no ?? '')),
                      14,
                  ),
        };
    }, [rows, totals, totalsLabel, earningHeads, deductionHeads, topsheet]);

    const colWidths = useMemo(
        () => ({
            serial: serialColumnWidth(Math.max(dataWidths.serial, headerMinWidth('SL'))),
            name: textColumnWidth(dataWidths.name, nameLabel),
            pin: topsheet ? 0 : textColumnWidth(dataWidths.pin, 'PIN'),
            designation: textColumnWidth(dataWidths.designation, designationLabel),
            earning: Object.fromEntries(earningHeads.map((head) => [head, amountColumnWidth(dataWidths.earning[head], labelFor(head))])),
            gross: amountColumnWidth(dataWidths.gross, 'Gross Salary'),
            deduction: Object.fromEntries(deductionHeads.map((head) => [head, amountColumnWidth(dataWidths.deduction[head], labelFor(head))])),
            ded: amountColumnWidth(dataWidths.ded, 'Total Deduction'),
            net: amountColumnWidth(dataWidths.net, 'Net Payable'),
            bank: topsheet ? 0 : textColumnWidth(dataWidths.bank, 'Account No.') + 4,
        }),
        [dataWidths, earningHeads, deductionHeads, labelFor, topsheet, nameLabel, designationLabel],
    );

    const dataTotalChars = useMemo(() => {
        const all = [
            dataWidths.serial,
            dataWidths.name,
            ...(topsheet ? [] : [dataWidths.pin]),
            dataWidths.designation,
            ...earningHeads.map((h) => dataWidths.earning[h]),
            dataWidths.gross,
            ...deductionHeads.map((h) => dataWidths.deduction[h]),
            dataWidths.ded,
            dataWidths.net,
            ...(topsheet ? [] : [dataWidths.bank]),
        ];
        return all.reduce((sum, n) => sum + n, 0);
    }, [dataWidths, earningHeads, deductionHeads, topsheet]);

    const layoutTotalChars = useMemo(() => {
        const all = [
            colWidths.serial,
            colWidths.name,
            ...(topsheet ? [] : [colWidths.pin]),
            colWidths.designation,
            ...earningHeads.map((h) => colWidths.earning[h]),
            colWidths.gross,
            ...deductionHeads.map((h) => colWidths.deduction[h]),
            colWidths.ded,
            colWidths.net,
            ...(topsheet ? [] : [colWidths.bank]),
        ];
        return all.reduce((sum, n) => sum + n, 0);
    }, [colWidths, earningHeads, deductionHeads, topsheet]);

    const fillPage = dataTotalChars < 195;
    const colCss = useCallback(
        (chars: number) => {
            if (fillPage) {
                return `${Math.max(1, Math.round((chars / layoutTotalChars) * 10000) / 100)}%`;
            }
            return `${chars}ch`;
        },
        [fillPage, layoutTotalChars],
    );

    return (
        <div className="overflow-x-auto border-y border-black print:overflow-visible print:border-y-0">
            <table
                className={`border-collapse text-[10px] text-black print:text-[8px] ${
                    fillPage ? 'w-full min-w-full' : 'w-max min-w-max'
                }`}
            >
                <colgroup>
                    <col style={{ width: colCss(colWidths.serial) }} />
                    <col style={{ width: colCss(colWidths.name) }} />
                    {!topsheet && <col style={{ width: colCss(colWidths.pin) }} />}
                    <col style={{ width: colCss(colWidths.designation) }} />
                    {earningHeads.map((h) => (
                        <col key={h} style={{ width: colCss(colWidths.earning[h]) }} />
                    ))}
                    <col style={{ width: colCss(colWidths.gross) }} />
                    {deductionHeads.map((h) => (
                        <col key={h} style={{ width: colCss(colWidths.deduction[h]) }} />
                    ))}
                    <col style={{ width: colCss(colWidths.ded) }} />
                    <col style={{ width: colCss(colWidths.net) }} />
                    {!topsheet && <col style={{ width: colCss(colWidths.bank) }} />}
                </colgroup>
                <thead>
                    <tr className="bg-muted/30 border-b border-black">
                        <th colSpan={employeeCols} className={`${thClass} text-center font-bold`}>
                            {infoLabel}
                        </th>
                        <th colSpan={earningCols} className={`${thClass} text-center font-bold`}>
                            Salary & Allowances
                        </th>
                        <th colSpan={deductionCols} className={`${thClass} text-center font-bold`}>
                            Deduction
                        </th>
                        <th rowSpan={2} className={`${amountHeadClass} font-bold`}>
                            Net Payable
                        </th>
                        {!topsheet && (
                            <th rowSpan={2} className={`${thClass} font-bold`}>
                                Account No.
                            </th>
                        )}
                    </tr>
                    <tr className="border-b border-black">
                        <th className={`${thClass}`}>SL</th>
                        <th className={`${thClass} whitespace-normal`}>{nameLabel}</th>
                        {!topsheet && <th className={thClass}>PIN</th>}
                        <th className={thClass}>{designationLabel}</th>
                        {earningHeads.map((h) => (
                            <th key={h} className={amountHeadClass}>
                                {labelFor(h)}
                            </th>
                        ))}
                        <th className={amountHeadClass}>Gross Salary</th>
                        {deductionHeads.map((h) => (
                            <th key={h} className={amountHeadClass}>
                                {labelFor(h)}
                            </th>
                        ))}
                        <th className={amountHeadClass}>Total Deduction</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-black">
                            <td className={`${tdClass} text-center`}>{i + 1}</td>
                            <td className={nowrapClass}>{String(row.name ?? '')}</td>
                            {!topsheet && <td className={`${tdClass} whitespace-nowrap text-center`}>{String(row.pin ?? '')}</td>}
                            <td className={nowrapClass}>{String(row.designation ?? '')}</td>
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
                            {!topsheet && <td className={nowrapClass}>{String(row.account_no ?? '')}</td>}
                        </tr>
                    ))}
                    {totals && (
                        <tr className="border-t border-black font-bold">
                            <td colSpan={employeeCols} className={`${thClass} text-center`}>
                                {totalsLabel}
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
                            {!topsheet && <td className={nowrapClass} />}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function SalarySheetFooter({
    net,
    showInWords = true,
    signatureBlocks = [],
}: {
    net: unknown;
    showInWords?: boolean;
    signatureBlocks?: SignatureBlock[];
}) {
    const netNum = Number(net);
    const inWords = Number.isFinite(netNum) && netNum > 0 ? takaInWords(netNum) : '';

    return (
        <div className="mt-2 space-y-2">
            {showInWords && inWords ? (
                <div className="text-[10px] text-black">
                    <span className="font-semibold">In Words:</span> {inWords}
                </div>
            ) : null}
            <PayrollReportSignatureSection blocks={signatureBlocks} />
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
        return <p className="text-muted-foreground text-sm">{(payload.meta as { message: string }).message}</p>;
    }

    if (template === 'final-payment') {
        const rows = (payload.rows as Record<string, unknown>[]) ?? [];
        const totals = (payload.totals as Record<string, unknown>) ?? {};
        const meta = (payload.meta as Record<string, unknown>) ?? {};
        const thClass = 'border-r border-black px-1 py-1 text-center align-middle text-[8px] leading-tight';
        const tdClass = 'border-r border-black px-1 py-1 align-middle';
        const amountClass = `${tdClass} text-center font-mono tabular-nums whitespace-nowrap`;

        if (rows.length === 0) {
            return <p className="text-muted-foreground text-sm">No final payment records found for the selected filters.</p>;
        }

        return (
            <div>
                <div className="mb-1 flex justify-between text-[9px] font-semibold text-black">
                    <span>
                        Records: {String(meta.row_count ?? rows.length)} · Pending: {String(meta.pending_count ?? 0)} · Paid:{' '}
                        {String(meta.paid_count ?? 0)}
                    </span>
                    <span>Date filter: Payment date</span>
                </div>
                <div className="overflow-x-auto border border-black print:overflow-visible">
                    <table className="w-full min-w-max table-fixed border-collapse text-[9px] text-black print:text-[8px]">
                        <thead>
                            <tr className="border-b border-black">
                                <th colSpan={5} className={`${thClass} font-bold`}>
                                    Employee Information
                                </th>
                                <th colSpan={2} className={`${thClass} font-bold`}>
                                    Dates
                                </th>
                                <th colSpan={3} className={`${thClass} font-bold`}>
                                    Payable Components
                                </th>
                                <th className={`${thClass} font-bold`}>Deduction</th>
                                <th colSpan={2} className={`${thClass} font-bold`}>
                                    Settlement
                                </th>
                            </tr>
                            <tr className="border-b border-black">
                                {[
                                    '#',
                                    'Name (PIN)',
                                    'Designation',
                                    'Department',
                                    'Branch',
                                    'Separation',
                                    'Payment',
                                    'PF Refund',
                                    'Gratuity',
                                    'Gross',
                                    'Loan',
                                    'Net Payable',
                                    'Status',
                                ].map((header) => (
                                    <th key={header} className={thClass}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={index} className="border-b border-black">
                                    <td className={`${tdClass} text-center`}>{index + 1}</td>
                                    <td className={`${tdClass} whitespace-nowrap`}>{nameWithPin(row)}</td>
                                    <td className={`${tdClass} whitespace-nowrap`}>{String(row.designation ?? '—')}</td>
                                    <td className={`${tdClass} whitespace-nowrap`}>{String(row.department ?? '—')}</td>
                                    <td className={`${tdClass} whitespace-nowrap`}>
                                        {String(row.branch ?? '—')}
                                        {row.branch_code ? ` (${String(row.branch_code)})` : ''}
                                    </td>
                                    <td className={`${tdClass} text-center whitespace-nowrap`}>{String(row.separation_date ?? '—')}</td>
                                    <td className={`${tdClass} text-center whitespace-nowrap`}>{String(row.payment_date ?? '—')}</td>
                                    <td className={amountClass}>{fmtSheet(row.pf_balance)}</td>
                                    <td className={amountClass}>{fmtSheet(row.gratuity_amount)}</td>
                                    <td className={amountClass}>{fmtSheet(row.gross)}</td>
                                    <td className={amountClass}>{fmtSheet(row.loan_outstanding)}</td>
                                    <td className={`${amountClass} font-bold`}>{fmtSheet(row.net_payable)}</td>
                                    <td className={`${tdClass} text-center font-semibold`}>{String(row.status ?? '')}</td>
                                </tr>
                            ))}
                            <tr className="font-bold">
                                <td colSpan={7} className={`${tdClass} text-right`}>
                                    Total
                                </td>
                                <td className={amountClass}>{fmtSheet(totals.pf_balance)}</td>
                                <td className={amountClass}>{fmtSheet(totals.gratuity_amount)}</td>
                                <td className={amountClass}>{fmtSheet(totals.gross)}</td>
                                <td className={amountClass}>{fmtSheet(totals.loan_outstanding)}</td>
                                <td className={amountClass}>{fmtSheet(totals.net_payable)}</td>
                                <td className={tdClass} />
                            </tr>
                        </tbody>
                    </table>
                </div>
                <SalarySheetFooter net={totals.net_payable} showInWords signatureBlocks={signatureBlocks} />
            </div>
        );
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
        const rows = (payload.rows as Record<string, unknown>[]) ?? [];
        const totals = payload.totals as Record<string, unknown> | undefined;
        const headLabels = (payload.head_labels as Record<string, string>) ?? {};
        const labelFor = (k: string) => headLabels[k] ?? k;

        return (
            <div className="overflow-x-auto border border-black print:overflow-visible">
                <table className="w-full min-w-max border-collapse text-[10px] text-black print:text-[9px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="border-r border-black p-1 text-left">Payscale</th>
                            <th className="border-r border-black p-1 text-left">Grade</th>
                            <th className="border-r border-black p-1 text-right">Step</th>
                            {heads.map((h) => (
                                <th
                                    key={h}
                                    className="max-w-[5.5rem] min-w-[3.5rem] border-r border-black p-1 text-right align-bottom leading-tight whitespace-normal"
                                >
                                    {labelFor(h)}
                                </th>
                            ))}
                            <th className="border-r border-black p-1 text-right">Gross Salary</th>
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
                                <td colSpan={3} className="border-r border-black p-1">
                                    Total
                                </td>
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
            const sections = (payload.sections as {
                label: string;
                rows: Record<string, unknown>[];
                totals?: Record<string, unknown>;
                earning_heads?: string[];
                deduction_heads?: string[];
                head_labels?: Record<string, string>;
            }[]) ?? [];
            const salaryMonth = String(payload.salary_month ?? '');
            if (sections.length === 0) {
                return <p className="text-muted-foreground text-sm">No payslips found for the selected filters.</p>;
            }
            const defaultEarningHeads = (payload.earning_heads as string[]) ?? [];
            const defaultDeductionHeads = (payload.deduction_heads as string[]) ?? [];
            const defaultHeadLabels = (payload.head_labels as Record<string, string>) ?? {};
            return (
                <div className="space-y-4">
                    {sections.map((section, si) => (
                        <div key={si}>
                            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs font-bold text-black">
                                <span>{section.label}</span>
                                {salaryMonth !== '' && <span className="shrink-0">Salary Month: {salaryMonth}</span>}
                            </div>
                            <div className="flex flex-col">
                                <SalarySheetTable
                                    earningHeads={section.earning_heads ?? defaultEarningHeads}
                                    deductionHeads={section.deduction_heads ?? defaultDeductionHeads}
                                    headLabels={section.head_labels ?? defaultHeadLabels}
                                    rows={section.rows ?? []}
                                    totals={section.totals}
                                />
                                <SalarySheetFooter net={section.totals?.net} showInWords signatureBlocks={signatureBlocks} />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        const rows = (payload.rows as Record<string, unknown>[]) ?? [];
        const totals = payload.totals as Record<string, unknown> | undefined;
        const topsheet = Boolean(payload.topsheet);
        return (
            <div>
                <SalarySheetTable
                    earningHeads={earningHeads}
                    deductionHeads={deductionHeads}
                    headLabels={headLabels}
                    rows={rows}
                    totals={totals}
                    topsheet={topsheet}
                />
                {totals && <SalarySheetFooter net={totals.net} showInWords signatureBlocks={signatureBlocks} />}
            </div>
        );
    }

    const simpleRows = (payload.rows as Record<string, unknown>[]) ?? [];
    if (simpleRows.length === 0) {
        return <p className="text-muted-foreground text-sm">No rows in this report.</p>;
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
            paymentStatus: f.includes('payment_status'),
            branch: f.includes('branch_id'),
            program: f.includes('program_id'),
            project: f.includes('project_id'),
            department: f.includes('department_id'),
            designation: f.includes('designation_id'),
        };
    }, [report.filters]);

    const isFinalPaymentReport = report.slug === 'final-payment';
    const reportBasePath = isFinalPaymentReport ? staffFundPath(`/payroll/reports/${report.slug}`) : `/payroll/reports/${report.slug}`;

    const generate = () => {
        router.get(reportBasePath, { ...filters, generate: '1' }, { preserveState: true });
    };

    const query = useMemo(() => {
        const p = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v) p.set(k, v);
        });
        if (isFinalPaymentReport) {
            p.set('section', 'staff-fund');
        }
        return p.toString();
    }, [filters, isFinalPaymentReport]);

    const printUrl = `/payroll/reports/${report.slug}/print?${query}`;
    const pdfUrl = `/payroll/reports/${report.slug}/pdf?${query}`;
    const excelUrl = `/payroll/reports/${report.slug}/excel?${query}`;

    // Calculate detailed summary overview across all rows/sections
    const summaryData = useMemo(() => {
        if (!payload) return null;
        const template = String(payload.template ?? '');

        let totalEmployees = 0;
        const uniqueBranches = new Set<string>();
        const headTotals: Record<string, number> = {};
        let grossTotal = 0;
        let deductionTotal = 0;
        let netTotal = 0;
        let earningHeads: string[] = (payload.earning_heads as string[]) ?? [];
        let deductionHeads: string[] = (payload.deduction_heads as string[]) ?? [];
        const headLabels: Record<string, string> = (payload.head_labels as Record<string, string>) ?? {};

        if (template === 'salary-sheet-grouped') {
            const sections = (payload.sections as {
                label?: string;
                rows?: Record<string, unknown>[];
                totals?: Record<string, unknown>;
                earning_heads?: string[];
                deduction_heads?: string[];
            }[]) ?? [];

            sections.forEach((sec) => {
                if (sec.label) {
                    uniqueBranches.add(sec.label.replace(/^Branch:\s*/i, '').trim());
                }
                const secRows = (sec.rows as Record<string, unknown>[]) ?? [];
                totalEmployees += secRows.length;
                secRows.forEach((r) => {
                    if (r.branch) uniqueBranches.add(String(r.branch));
                    else if (r.branch_code) uniqueBranches.add(String(r.branch_code));
                });
                if (sec.totals) {
                    grossTotal += Number(sec.totals.gross || 0);
                    deductionTotal += Number(sec.totals.deduction || 0);
                    netTotal += Number(sec.totals.net || 0);
                    const comps = (sec.totals.components as Record<string, number>) || {};
                    Object.entries(comps).forEach(([k, v]) => {
                        headTotals[k] = (headTotals[k] || 0) + Number(v || 0);
                    });
                }
            });

            if (earningHeads.length === 0 && sections[0]?.earning_heads) {
                earningHeads = sections[0].earning_heads;
            }
            if (deductionHeads.length === 0 && sections[0]?.deduction_heads) {
                deductionHeads = sections[0].deduction_heads;
            }
        } else if (template === 'salary-sheet') {
            const rows = (payload.rows as Record<string, unknown>[]) ?? [];
            const isTopsheet = Boolean(payload.topsheet);
            if (isTopsheet) {
                rows.forEach((r) => {
                    const b = String(r.name || r.branch || '').trim();
                    if (b) uniqueBranches.add(b);
                });
                totalEmployees = Number(
                    (payload.meta as Record<string, unknown>)?.employee_count ||
                    rows.reduce((acc, r) => acc + Number(r.employee_count || 1), 0)
                );
            } else {
                totalEmployees = rows.length;
                rows.forEach((r) => {
                    if (r.branch) uniqueBranches.add(String(r.branch));
                    else if (r.branch_code) uniqueBranches.add(String(r.branch_code));
                });
            }
            if (payload.totals) {
                const tot = payload.totals as Record<string, unknown>;
                grossTotal = Number(tot.gross || 0);
                deductionTotal = Number(tot.deduction || 0);
                netTotal = Number(tot.net || 0);
                const comps = (tot.components as Record<string, number>) || {};
                Object.entries(comps).forEach(([k, v]) => {
                    headTotals[k] = (headTotals[k] || 0) + Number(v || 0);
                });
            }
        } else {
            return null;
        }

        return {
            totalBranches: uniqueBranches.size || (template === 'salary-sheet-grouped' ? (payload.sections as unknown[])?.length || 1 : 1),
            totalEmployees,
            grossTotal,
            deductionTotal,
            netTotal,
            earningHeads,
            deductionHeads,
            headLabels,
            headTotals,
        };
    }, [payload]);

    return (
        <Layout>
            <Head title={report.title} />
            <PayrollPage>
                <PayrollPageHeader title={report.title} description={report.description}>
                    <Button asChild variant="outline" size="sm">
                        <Link href={isFinalPaymentReport ? staffFundPath('/sections/staff-fund') : '/payroll/reports'}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> {isFinalPaymentReport ? 'Staff Fund' : 'All reports'}
                        </Link>
                    </Button>
                </PayrollPageHeader>

                <PayrollSectionCard title="Filters" description="Set criteria and click Generate report.">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 items-end">
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

                        {show.branch && (
                            <PayrollBranchSelect
                                value={filters.branch_id}
                                onChange={(v) => setFilter('branch_id', v)}
                                branches={filterOptions.branches}
                                allowAll
                                allLabel="All branches"
                            />
                        )}

                        {show.program && (
                            <PayrollComboField
                                label="Program"
                                value={filters.program_id}
                                onChange={(v) => setFilter('program_id', v)}
                                items={[
                                    { value: '', label: 'All programs' },
                                    ...filterOptions.programs.map((p) => ({ value: String(p.id), label: p.name ?? '—' })),
                                ]}
                                placeholder="All programs"
                            />
                        )}

                        {show.project && (
                            <PayrollComboField
                                label="Project"
                                value={filters.project_id}
                                onChange={(v) => setFilter('project_id', v)}
                                items={[
                                    { value: '', label: 'All projects' },
                                    ...filterOptions.projects.map((p) => ({ value: String(p.id), label: p.name ?? '—' })),
                                ]}
                                placeholder="All projects"
                            />
                        )}

                        {show.department && (
                            <PayrollComboField
                                label="Department"
                                value={filters.department_id}
                                onChange={(v) => setFilter('department_id', v)}
                                items={[
                                    { value: '', label: 'All departments' },
                                    ...filterOptions.departments.map((d) => ({ value: String(d.id), label: d.name ?? '—' })),
                                ]}
                                placeholder="All departments"
                            />
                        )}

                        {show.designation && (
                            <PayrollComboField
                                label="Designation"
                                value={filters.designation_id}
                                onChange={(v) => setFilter('designation_id', v)}
                                items={[
                                    { value: '', label: 'All designations' },
                                    ...filterOptions.designations.map((d) => ({ value: String(d.id), label: d.name ?? '—' })),
                                ]}
                                placeholder="All designations"
                            />
                        )}

                        {show.employee && (
                            <PayrollEmployeeSelect
                                value={filters.employee_id}
                                onChange={(v) => setFilter('employee_id', v)}
                                employees={filterOptions.employees}
                                branchId={filters.branch_id || undefined}
                                required={report.requireEmployee}
                                allowAll={!report.requireEmployee}
                            />
                        )}

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
                                required
                                allowAll={false}
                            />
                        )}

                        {show.dateRange && (
                            <>
                                <PayrollField label="Date from">
                                    <Input
                                        type="date"
                                        className="h-8.5 bg-white text-xs"
                                        value={filters.date_from}
                                        onChange={(e) => setFilter('date_from', e.target.value)}
                                    />
                                </PayrollField>
                                <PayrollField label="Date to">
                                    <Input
                                        type="date"
                                        className="h-8.5 bg-white text-xs"
                                        value={filters.date_to}
                                        onChange={(e) => setFilter('date_to', e.target.value)}
                                    />
                                </PayrollField>
                            </>
                        )}

                        {show.paymentStatus && (
                            <PayrollComboField
                                label="Payment status"
                                value={filters.payment_status}
                                onChange={(v) => setFilter('payment_status', v)}
                                items={FINAL_PAYMENT_STATUS_OPTIONS}
                                placeholder="All statuses"
                            />
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

                        {/* Inline Generate Action Button */}
                        <div className="flex items-end gap-2">
                            <Button
                                type="button"
                                onClick={generate}
                                size="sm"
                                className="h-8.5 w-full bg-emerald-600 font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.99] transition-all cursor-pointer"
                            >
                                <Search className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                Generate
                            </Button>
                        </div>
                    </div>
                </PayrollSectionCard>

                {/* 2-Row Summary Card Ribbon under Filters (Screen only · Full width · No scroll) */}
                {generated && payload && !error && summaryData && (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-slate-200/90 bg-white p-2 shadow-2xs print:hidden">
                        {/* Row 1: Branches, Employees, Earning Heads, Gross Salary */}
                        <div className="flex w-full flex-wrap items-center gap-1.5 lg:flex-nowrap">
                            <div className="flex-1 min-w-[85px] rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-center">
                                <p className="truncate text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">Branches</p>
                                <p className="truncate text-xs font-bold text-slate-900">{summaryData.totalBranches}</p>
                            </div>
                            <div className="flex-1 min-w-[85px] rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-center">
                                <p className="truncate text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">Employees</p>
                                <p className="truncate text-xs font-bold text-slate-900">{summaryData.totalEmployees}</p>
                            </div>
                            {summaryData.earningHeads.map((head) => (
                                <div
                                    key={head}
                                    className="flex-1 min-w-[85px] rounded-lg border border-emerald-100 bg-emerald-50/50 px-2 py-1 text-center"
                                >
                                    <p className="truncate text-[9.5px] font-semibold text-emerald-800 uppercase tracking-tight" title={summaryData.headLabels[head] ?? head}>
                                        {summaryData.headLabels[head] ?? head}
                                    </p>
                                    <p className="truncate text-xs font-bold text-emerald-950 tabular-nums">
                                        {formatTakaAmount(summaryData.headTotals[head] || 0, 2)}
                                    </p>
                                </div>
                            ))}
                            <div className="flex-1 min-w-[105px] rounded-lg border border-emerald-300 bg-emerald-100/90 px-2 py-1 text-center shadow-2xs">
                                <p className="truncate text-[9.5px] font-bold text-emerald-900 uppercase tracking-tight">Gross Salary</p>
                                <p className="truncate text-xs font-extrabold text-emerald-950 tabular-nums">
                                    {formatTakaAmount(summaryData.grossTotal, 2)}
                                </p>
                            </div>
                        </div>

                        {/* Row 2: Deduction Heads, Total Deduction, Net Payable */}
                        <div className="flex w-full flex-wrap items-center gap-1.5 lg:flex-nowrap">
                            {summaryData.deductionHeads.map((head) => (
                                <div
                                    key={head}
                                    className="flex-1 min-w-[85px] rounded-lg border border-rose-100 bg-rose-50/50 px-2 py-1 text-center"
                                >
                                    <p className="truncate text-[9.5px] font-semibold text-rose-800 uppercase tracking-tight" title={summaryData.headLabels[head] ?? head}>
                                        {summaryData.headLabels[head] ?? head}
                                    </p>
                                    <p className="truncate text-xs font-bold text-rose-950 tabular-nums">
                                        {formatTakaAmount(summaryData.headTotals[head] || 0, 2)}
                                    </p>
                                </div>
                            ))}
                            <div className="flex-1 min-w-[105px] rounded-lg border border-rose-300 bg-rose-100/90 px-2 py-1 text-center shadow-2xs">
                                <p className="truncate text-[9.5px] font-bold text-rose-900 uppercase tracking-tight">Total Deduction</p>
                                <p className="truncate text-xs font-extrabold text-rose-950 tabular-nums">
                                    {formatTakaAmount(summaryData.deductionTotal, 2)}
                                </p>
                            </div>
                            <div className="flex-1 min-w-[115px] rounded-lg bg-emerald-600 px-2.5 py-1 text-center text-white shadow-2xs">
                                <p className="truncate text-[9.5px] font-bold text-emerald-100 uppercase tracking-tight">Net Payable</p>
                                <p className="truncate text-xs font-extrabold text-white tabular-nums">
                                    {formatTakaAmount(summaryData.netTotal, 2)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Cannot generate</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {generated && payload && !error && (
                    <PayrollSectionCard
                        className="mt-4"
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
                        <PayrollReportDocumentHeader companyName={companyName} companyAddress={companyAddress} title={report.title} />
                        <ReportPreview payload={payload} signatureBlocks={signatureBlocks} />
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
