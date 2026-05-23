import React from 'react';

export type ReportColumn = {
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    numeric?: boolean;
};

type TablePayload = {
    template?: string;
    columns?: ReportColumn[];
    rows?: Record<string, unknown>[];
    totals?: Record<string, unknown>;
    sections?: {
        title?: string;
        employee_count?: number;
        total_basic?: number;
        total_gratuity?: number;
    }[];
    meta?: { message?: string };
};

function fmt(n: unknown) {
    const v = Number(n);
    return Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(n ?? '—');
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
