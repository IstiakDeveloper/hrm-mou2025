import React from 'react';
import { formatTakaWhole } from '@/lib/taka-format';

export type ReportColumn = {
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    numeric?: boolean;
};

type TablePayload = {
    template?: string;
    columns?: ReportColumn[];
    group_columns?: ReportColumn[];
    rows?: Record<string, unknown>[];
    totals?: Record<string, unknown>;
    sections?: Record<string, unknown>[];
    meta?: { message?: string };
};

function fmt(n: unknown) {
    const v = Number(n);
    return Number.isFinite(v) ? formatTakaWhole(v) : String(n ?? '—');
}

function cellAlign(align?: string) {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
}

function renderCell(val: unknown, numeric?: boolean) {
    if (numeric && typeof val === 'number') return fmt(val);
    if (typeof val === 'number') return fmt(val);
    return String(val ?? '');
}

export function WordTableReport({ payload }: { payload: TablePayload }) {
    if (payload.meta?.message) {
        return <p className="text-sm text-muted-foreground">{payload.meta.message}</p>;
    }

    const template = payload.template ?? 'gratuity-table';

    if (template === 'gratuity-rules') {
        const rows = (payload.rows as { sl?: number; min_years?: string | number; multiplier?: string | number; description?: string }[]) ?? [];
        return (
            <div className="overflow-x-auto border border-black bg-white">
                <table className="w-full border-collapse text-[11px] text-black">
                    <thead>
                        <tr className="border-b border-black bg-emerald-50/80">
                            <th className="border-r border-black p-1 text-center">SL</th>
                            <th className="border-r border-black p-1 text-left">Minimum service (years)</th>
                            <th className="border-r border-black p-1 text-center">× Basic</th>
                            <th className="p-1 text-left">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-black">
                                <td className="border-r border-black p-1 text-center">{row.sl ?? ''}</td>
                                <td className="border-r border-black p-1">{row.min_years ?? ''}</td>
                                <td className="border-r border-black p-1 text-center">{row.multiplier ?? ''}</td>
                                <td className="p-1">{row.description ?? ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (template === 'loan-grouped') {
        const columns = payload.group_columns ?? [];
        const sections = payload.sections ?? [];
        const totals = payload.totals;
        return (
            <div className="overflow-x-auto border border-black bg-white">
                <table className="w-full border-collapse text-[11px] text-black">
                    <thead>
                        <tr className="border-b border-black bg-emerald-50/80">
                            {columns.map((col) => (
                                <th key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((s, i) => (
                            <tr key={i} className="border-b border-black">
                                {columns.map((col) => (
                                    <td key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                        {renderCell(s[col.key], col.numeric)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {totals && (
                            <tr className="border-t-2 border-black font-bold bg-emerald-50/50">
                                {columns.map((col) => (
                                    <td key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                        {renderCell(totals[col.key], col.numeric)}
                                    </td>
                                ))}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    if (template === 'pf-grouped') {
        const columns = payload.group_columns ?? [];
        const sections = payload.sections ?? [];
        const totals = payload.totals;
        const headerGroups = (payload as { header_groups?: { label?: string; colspan?: number; rowspan?: number; align?: string }[] }).header_groups ?? [];
        const childColumns = columns.filter((col) => Boolean((col as { group?: string }).group));
        const hasGroupedHeaders = headerGroups.length > 0 && childColumns.length > 0;
        return (
            <div className="overflow-x-auto border border-black bg-white">
                <table className="w-full border-collapse text-[11px] text-black">
                    <thead>
                        {hasGroupedHeaders ? (
                            <>
                                <tr className="border-b border-black bg-emerald-50/80">
                                    {headerGroups.map((group, index) => (
                                        <th
                                            key={`group-${index}`}
                                            colSpan={group.colspan}
                                            rowSpan={group.rowspan}
                                            className="border-r border-black p-1 text-center last:border-r-0"
                                        >
                                            {group.label ?? ''}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="border-b border-black bg-emerald-50/80">
                                    {childColumns.map((col) => (
                                        <th key={col.key} className="border-r border-black p-1 text-center last:border-r-0">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </>
                        ) : (
                            <tr className="border-b border-black bg-emerald-50/80">
                                {columns.map((col) => (
                                    <th key={col.key} className="border-r border-black p-1 text-center last:border-r-0">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {sections.map((s, i) => (
                            <tr key={i} className="border-b border-black">
                                {columns.map((col) => (
                                    <td key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                        {renderCell(s[col.key], col.numeric)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {totals && (
                            <tr className="border-t-2 border-black font-bold bg-emerald-50/50">
                                {columns.map((col) => (
                                    <td key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                        {renderCell(
                                            col.key === 'branch' && totals.title ? totals.title : totals[col.key],
                                            col.numeric,
                                        )}
                                    </td>
                                ))}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    if (template === 'gratuity-grouped') {
        const sections = payload.sections ?? [];
        const totals = payload.totals;
        return (
            <div className="overflow-x-auto border border-black bg-white">
                <table className="w-full border-collapse text-[11px] text-black">
                    <thead>
                        <tr className="border-b border-black bg-emerald-50/80">
                            <th className="border-r border-black p-1 text-left">Group</th>
                            <th className="border-r border-black p-1 text-center">Employees</th>
                            <th className="border-r border-black p-1 text-right">Total basic</th>
                            <th className="p-1 text-right">Total gratuity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((s, i) => (
                            <tr key={i} className="border-b border-black">
                                <td className="border-r border-black p-1 font-medium">{s.title ?? '—'}</td>
                                <td className="border-r border-black p-1 text-center">{s.employee_count ?? 0}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(s.total_basic)}</td>
                                <td className="p-1 text-right">{fmt(s.total_gratuity)}</td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="border-t-2 border-black font-bold bg-emerald-50/50">
                                <td className="border-r border-black p-1">{String(totals.title ?? 'Grand total')}</td>
                                <td className="border-r border-black p-1 text-center">{totals.employee_count ?? 0}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.total_basic)}</td>
                                <td className="p-1 text-right">{fmt(totals.total_gratuity)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    if (template === 'loan-statement-employee') {
        const rows = payload.rows ?? [];
        const totals = payload.totals;

        if (rows.length === 0) {
            return <p className="text-sm text-muted-foreground">No rows for the selected filters.</p>;
        }

        const headerClass = 'border-b border-black bg-zinc-700 font-semibold text-center text-amber-400';

        return (
            <div className="overflow-x-auto border border-black bg-white">
                <table className="w-full border-collapse text-[10px] text-black">
                    <thead>
                        <tr className={headerClass}>
                            <th colSpan={2} className="border-r border-black p-1">Employee</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-left">Policy</th>
                            <th colSpan={3} className="border-r border-black p-1">Opening Loan Outstanding</th>
                            <th colSpan={3} className="border-r border-black p-1">Disburse</th>
                            <th colSpan={3} className="border-r border-black p-1">Collection</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-center">Full Paid Loanee</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-right">Rebate Amt</th>
                            <th colSpan={2} className="border-r border-black p-1">Transfer</th>
                            <th colSpan={3} className="p-1">Closing Outstanding</th>
                        </tr>
                        <tr className={headerClass}>
                            <th className="border-r border-black p-1">ID</th>
                            <th className="border-r border-black p-1 text-left">Name</th>
                            <th className="border-r border-black p-1 text-right">PR</th>
                            <th className="border-r border-black p-1 text-right">SC</th>
                            <th className="border-r border-black p-1 text-right">Total</th>
                            <th className="border-r border-black p-1 text-right">PR</th>
                            <th className="border-r border-black p-1 text-right">SC</th>
                            <th className="border-r border-black p-1 text-right">Total</th>
                            <th className="border-r border-black p-1 text-right">PR</th>
                            <th className="border-r border-black p-1 text-right">SC</th>
                            <th className="border-r border-black p-1 text-right">Total</th>
                            <th className="border-r border-black p-1 text-right">In</th>
                            <th className="border-r border-black p-1 text-right">Out</th>
                            <th className="border-r border-black p-1 text-right">PR</th>
                            <th className="border-r border-black p-1 text-right">SC</th>
                            <th className="p-1 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-black">
                                <td className="border-r border-black p-1 text-center font-mono text-[9px]">{row.pin}</td>
                                <td className="border-r border-black p-1 text-left">{row.name}</td>
                                <td className="border-r border-black p-1 text-left">{row.policy}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.open_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.open_sc)}</td>
                                <td className="border-r border-black p-1 text-right font-medium">{fmt(row.open_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.disburse_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.disburse_sc)}</td>
                                <td className="border-r border-black p-1 text-right font-medium">{fmt(row.disburse_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.coll_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.coll_sc)}</td>
                                <td className="border-r border-black p-1 text-right font-medium">{fmt(row.coll_total)}</td>
                                <td className="border-r border-black p-1 text-center">{row.full_paid_loanee ? '1' : ''}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.rebate_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.transfer_in)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.transfer_out)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.close_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.close_sc)}</td>
                                <td className="p-1 text-right font-medium">{fmt(row.close_total)}</td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="border-t-2 border-black bg-zinc-100 font-bold">
                                <td colSpan={3} className="border-r border-black p-1 text-center">Total</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.open_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.open_sc)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.open_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.disburse_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.disburse_sc)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.disburse_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.coll_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.coll_sc)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.coll_total)}</td>
                                <td className="border-r border-black p-1 text-center">{totals.full_paid_loanee ?? ''}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.rebate_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.transfer_in)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.transfer_out)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.close_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.close_sc)}</td>
                                <td className="p-1 text-right">{fmt(totals.close_total)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    if (template === 'loan-collection-register') {
        const rows = payload.rows ?? [];
        const totals = payload.totals;

        if (rows.length === 0) {
            return <p className="text-sm text-muted-foreground">No rows for the selected filters.</p>;
        }

        return (
            <div className="overflow-x-auto border border-black bg-white">
                <table className="w-full border-collapse text-[10px] text-black">
                    <thead>
                        <tr className="border-b border-black bg-emerald-50/80 font-semibold text-center">
                            <th colSpan={2} className="border-r border-black p-1">Employee</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-left">Policy</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-center">Disburse Date</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-right">Disburse Amt</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-right">Install Amt</th>
                            <th colSpan={3} className="border-r border-black p-1">Opening Outstanding</th>
                            <th colSpan={3} className="border-r border-black p-1">Collection</th>
                            <th rowSpan={2} className="border-r border-black p-1 align-middle text-right">Rebate Amount</th>
                            <th colSpan={3} className="p-1">Loan Balance</th>
                        </tr>
                        <tr className="border-b border-black bg-emerald-50/80 font-semibold text-center">
                            <th className="border-r border-black p-1">ID</th>
                            <th className="border-r border-black p-1 text-left">Name</th>
                            <th className="border-r border-black p-1 text-right">PR</th>
                            <th className="border-r border-black p-1 text-right">SC</th>
                            <th className="border-r border-black p-1 text-right">Total</th>
                            <th className="border-r border-black p-1 text-right">PR</th>
                            <th className="border-r border-black p-1 text-right">SC</th>
                            <th className="border-r border-black p-1 text-right">Total</th>
                            <th className="border-r border-black p-1 text-right">PR</th>
                            <th className="border-r border-black p-1 text-right">SC</th>
                            <th className="p-1 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-black">
                                <td className="border-r border-black p-1 text-center font-mono text-[9px]">{row.pin}</td>
                                <td className="border-r border-black p-1 text-left">{row.name}</td>
                                <td className="border-r border-black p-1 text-left">{row.policy}</td>
                                <td className="border-r border-black p-1 text-center whitespace-nowrap">{row.disburse_date}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.disburse_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.install_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.open_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.open_sc)}</td>
                                <td className="border-r border-black p-1 text-right font-medium">{fmt(row.open_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.coll_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.coll_sc)}</td>
                                <td className="border-r border-black p-1 text-right font-medium">{fmt(row.coll_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.rebate_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.close_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.close_sc)}</td>
                                <td className="p-1 text-right font-medium">{fmt(row.close_total)}</td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="border-t-2 border-black font-bold bg-emerald-50/50">
                                <td colSpan={4} className="border-r border-black p-1 text-center font-bold">Total</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.disburse_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.install_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.open_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.open_sc)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.open_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.coll_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.coll_sc)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.coll_total)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.rebate_amount)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.close_pr)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(totals.close_sc)}</td>
                                <td className="p-1 text-right">{fmt(totals.close_total)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    const columns = payload.columns ?? [];
    const rows = payload.rows ?? [];
    const totals = payload.totals;

    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">No rows for the selected filters.</p>;
    }

    return (
        <div className="overflow-x-auto border border-black bg-white">
            <table className="w-full border-collapse text-[11px] text-black">
                <thead>
                    <tr className="border-b border-black bg-emerald-50/80">
                        {columns.map((col) => (
                            <th key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-black">
                            {columns.map((col) => (
                                <td key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                    {renderCell(row[col.key], col.numeric)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {totals && (
                        <tr className="border-t-2 border-black font-bold bg-emerald-50/50">
                            {columns.map((col) => (
                                <td key={col.key} className={`border-r border-black p-1 last:border-r-0 ${cellAlign(col.align)}`}>
                                    {renderCell(totals[col.key], col.numeric)}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
