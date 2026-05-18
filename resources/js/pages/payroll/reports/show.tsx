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
import { ArrowLeft, Download, FileSpreadsheet, Printer, Search } from 'lucide-react';

type ReportMeta = {
    slug: string;
    title: string;
    description: string;
    filters: string[];
    requireEmployee?: boolean;
};

type Props = {
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

function ReportPreview({ payload }: { payload: Record<string, unknown> }) {
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

    if (template === 'grade-step' || template === 'salary-sheet') {
        const heads = (payload.heads as string[]) ?? [];
        const rows = (payload.rows as Record<string, unknown>[]) ?? [];
        const totals = payload.totals as Record<string, unknown> | undefined;
        return (
            <div className="overflow-x-auto border border-black">
                <table className="w-full border-collapse text-[11px] text-black">
                    <thead>
                        <tr className="border-b border-black">
                            {template === 'grade-step' ? (
                                <>
                                    <th className="border-r border-black p-1 text-left">Payscale</th>
                                    <th className="border-r border-black p-1 text-left">Grade</th>
                                    <th className="border-r border-black p-1 text-right">Step</th>
                                </>
                            ) : (
                                <>
                                    <th className="border-r border-black p-1 text-left">PIN</th>
                                    <th className="border-r border-black p-1 text-left">Name</th>
                                    <th className="border-r border-black p-1 text-left">Branch</th>
                                </>
                            )}
                            <th className="border-r border-black p-1 text-right">Basic</th>
                            {heads.filter((h) => h !== 'Basic').map((h) => (
                                <th key={h} className="border-r border-black p-1 text-right">{h}</th>
                            ))}
                            <th className="border-r border-black p-1 text-right">Gross</th>
                            <th className="border-r border-black p-1 text-right">Ded.</th>
                            <th className="p-1 text-right">Net</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-black">
                                {template === 'grade-step' ? (
                                    <>
                                        <td className="border-r border-black p-1">{String(row.payscale ?? '')}</td>
                                        <td className="border-r border-black p-1">{String(row.grade ?? '')}</td>
                                        <td className="border-r border-black p-1 text-right">{String(row.step ?? '')}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="border-r border-black p-1">{String(row.pin ?? '')}</td>
                                        <td className="border-r border-black p-1">{String(row.name ?? '')}</td>
                                        <td className="border-r border-black p-1">{String(row.branch ?? '')}</td>
                                    </>
                                )}
                                <td className="border-r border-black p-1 text-right">
                                    {fmt((row.components as Record<string, number>)?.Basic ?? row.basic)}
                                </td>
                                {heads.filter((h) => h !== 'Basic').map((h) => (
                                    <td key={h} className="border-r border-black p-1 text-right">
                                        {fmt((row.components as Record<string, number>)?.[h])}
                                    </td>
                                ))}
                                <td className="border-r border-black p-1 text-right">{fmt(row.gross)}</td>
                                <td className="border-r border-black p-1 text-right">{fmt(row.deduction)}</td>
                                <td className="p-1 text-right">{fmt(row.net)}</td>
                            </tr>
                        ))}
                        {totals && (
                            <tr className="font-bold">
                                <td colSpan={template === 'grade-step' ? 3 : 3} className="border-r border-black p-1">Total</td>
                                <td className="border-r border-black p-1 text-right">
                                    {fmt((totals.components as Record<string, number>)?.Basic)}
                                </td>
                                {heads.filter((h) => h !== 'Basic').map((h) => (
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
                        description={`Period: ${periodLabel} · Black & white layout for A4 laser print`}
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
                                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (CSV)
                                        </a>
                                    </Button>
                                </>
                            )}
                        </div>
                        <ReportPreview payload={payload} />
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
