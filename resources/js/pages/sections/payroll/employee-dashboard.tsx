import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Banknote, BriefcaseBusiness, ChevronRight, FileText, UserRound, Wallet } from 'lucide-react';
import { payrollEmployeePath } from '@/lib/payroll-employee-nav';
import { formatTakaWhole } from '@/lib/taka-format';

type PayslipSummary = {
    id: number;
    period_label: string;
    salary_type: string;
    branch: string | null;
    gross: number;
    net: number;
    is_withheld: boolean;
    posted_at: string | null;
};

type PayslipLine = {
    id: number;
    head_label: string;
    amount: number;
    is_loan?: boolean;
};

type LatestPayslip = {
    id: number;
    period_label: string;
    salary_type: string;
    branch: string | null;
    designation: string | null;
    grade: string | null;
    step: number | null;
    basic: number;
    gross: number;
    deduction: number;
    net: number;
    is_withheld: boolean;
    posted_at: string | null;
    earnings: PayslipLine[];
    deductions: PayslipLine[];
};

export type PayrollEmployeeDashboardProps = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
        designation?: { name?: string } | null;
        department?: { name?: string } | null;
        branch?: { name?: string } | null;
    };
    summary: {
        year: number;
        payslip_count: number;
        salary_count: number;
        bonus_count: number;
        ytd_gross: number;
        ytd_deduction: number;
        ytd_net: number;
    };
    latestPayslip: LatestPayslip | null;
    recentPayslips: PayslipSummary[];
};

type ViewProps = PayrollEmployeeDashboardProps & {
    embedded?: boolean;
};

const fmt = formatTakaWhole;

export function PayrollEmployeeDashboardView({
    employee,
    summary,
    latestPayslip,
    recentPayslips,
    embedded = false,
}: ViewProps) {
    const { auth } = usePage().props as { auth?: { user?: { name?: string } } };

    const highlights = [
        { label: `Net pay ${summary.year}`, value: fmt(summary.ytd_net), tone: 'violet' as const },
        { label: `Gross ${summary.year}`, value: fmt(summary.ytd_gross), tone: 'slate' as const },
        { label: 'Total deductions', value: fmt(summary.ytd_deduction), tone: 'amber' as const },
    ];

    const dashboardBody = (
        <>
            <Card className="overflow-hidden border-zinc-200/90 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_35%),linear-gradient(to_bottom,_#ffffff,_#faf8ff)] shadow-sm">
                <CardContent className="space-y-5 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-700">
                                <BriefcaseBusiness className="h-3.5 w-3.5" />
                                Payroll overview
                            </p>
                            <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
                                My Payroll Dashboard
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                                Latest salary snapshot, earning components, deductions, and recent posted payslips in one place.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                                    <UserRound className="h-3.5 w-3.5 text-zinc-400" />
                                    {auth?.user?.name ?? '—'}
                                </span>
                                {employee.pin && (
                                    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-zinc-700">
                                        {employee.pin}
                                    </span>
                                )}
                                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                                    {employee?.designation?.name || latestPayslip?.designation || 'Employee'}
                                </span>
                                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                                    {employee?.department?.name ?? 'Department'}
                                </span>
                                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                                    {employee?.branch?.name ?? 'Branch not set'}
                                </span>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm" className="h-9 px-3 text-xs">
                                <Link href="/sections">Sections</Link>
                            </Button>
                            <Button asChild size="sm" className="h-9 bg-violet-600 px-3 text-xs hover:bg-violet-700">
                                <Link href={payrollEmployeePath('/employee/payroll/payslips')}>
                                    All payslips
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        {highlights.map((item) => (
                            <div
                                key={item.label}
                                className={
                                    item.tone === 'violet'
                                        ? 'rounded-2xl border border-violet-200 bg-violet-50/70 p-4'
                                        : item.tone === 'amber'
                                            ? 'rounded-2xl border border-amber-200 bg-amber-50/70 p-4'
                                            : 'rounded-2xl border border-zinc-200 bg-white p-4'
                                }
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
                                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-950">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4 sm:px-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <CardTitle className="text-base font-semibold text-zinc-950">Latest payslip details</CardTitle>
                                <CardDescription className="text-xs">
                                    Grade, step, earnings, and deduction components from your most recent posted payslip.
                                </CardDescription>
                            </div>
                            {latestPayslip && (
                                <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                                    <Link href={payrollEmployeePath(`/employee/payroll/payslips/${latestPayslip.id}`)}>
                                        Open details
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                        {latestPayslip ? (
                            <div className="space-y-5">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Payslip</p>
                                        <p className="mt-1 text-sm font-semibold text-zinc-900">{latestPayslip.period_label}</p>
                                        <p className="mt-1 text-xs text-zinc-500">{latestPayslip.posted_at ? `Posted ${latestPayslip.posted_at}` : 'Posted date unavailable'}</p>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Designation</p>
                                        <p className="mt-1 text-sm font-semibold text-zinc-900">{latestPayslip.designation || employee?.designation?.name || '—'}</p>
                                        <p className="mt-1 text-xs text-zinc-500">{latestPayslip.branch || employee?.branch?.name || '—'}</p>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Grade / Step</p>
                                        <p className="mt-1 text-sm font-semibold text-zinc-900">{latestPayslip.grade || '—'} / {latestPayslip.step ?? '—'}</p>
                                        <p className="mt-1 text-xs text-zinc-500 capitalize">{latestPayslip.salary_type}</p>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Status</p>
                                        <div className="mt-1">
                                            {latestPayslip.is_withheld ? (
                                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                                                    Withheld
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                                    Posted
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-4">
                                    <MetricCard label="Basic" value={latestPayslip.basic} tone="slate" />
                                    <MetricCard label="Gross" value={latestPayslip.gross} tone="emerald" />
                                    <MetricCard label="Deduction" value={latestPayslip.deduction} tone="amber" />
                                    <MetricCard label="Net payable" value={latestPayslip.net} tone="violet" />
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <BreakdownCard
                                        title="Earning Components"
                                        emptyText="No earning components found."
                                        rows={latestPayslip.earnings}
                                        totalLabel="Gross salary"
                                        totalValue={latestPayslip.gross}
                                        tone="emerald"
                                    />
                                    <BreakdownCard
                                        title="Deduction Components"
                                        emptyText="No deduction components found."
                                        rows={latestPayslip.deductions}
                                        totalLabel="Total deduction"
                                        totalValue={latestPayslip.deduction}
                                        tone="amber"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-600">
                                No posted payslip available yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4">
                            <CardTitle className="text-sm font-semibold text-zinc-950">Payroll snapshot</CardTitle>
                            <CardDescription className="text-xs">Year-to-date summary and payslip count.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4">
                            <SnapshotRow label="Posted payslips" value={summary.payslip_count.toString()} />
                            <SnapshotRow label="Salary runs" value={summary.salary_count.toString()} />
                            <SnapshotRow label="Bonus runs" value={summary.bonus_count.toString()} />
                            <SnapshotRow label={`YTD gross (${summary.year})`} value={fmt(summary.ytd_gross)} />
                            <SnapshotRow label="YTD deductions" value={fmt(summary.ytd_deduction)} />
                            <SnapshotRow label="YTD net pay" value={fmt(summary.ytd_net)} strong />
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm font-semibold text-zinc-950">Recent payslips</CardTitle>
                                    <CardDescription className="text-xs">Open any posted payslip for the full report view.</CardDescription>
                                </div>
                                <FileText className="h-4 w-4 text-violet-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3">
                            {recentPayslips.length > 0 ? (
                                <div className="space-y-2">
                                    {recentPayslips.map((p) => (
                                        <Link
                                            key={p.id}
                                            href={payrollEmployeePath(`/employee/payroll/payslips/${p.id}`)}
                                            className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-violet-200 hover:bg-violet-50/30"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                                                {p.salary_type === 'bonus' ? <Banknote className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-zinc-900 group-hover:text-violet-900">{p.period_label}</p>
                                                <p className="truncate text-[11px] text-zinc-500">
                                                    {p.branch || '—'}
                                                    {p.posted_at ? ` · Posted ${p.posted_at}` : ''}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-bold tabular-nums text-zinc-950">{fmt(p.net)}</p>
                                                <p className="text-[10px] text-zinc-500">Gross {fmt(p.gross)}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-violet-500" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-600">
                                    No posted payslips yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Button asChild variant="outline" className="h-11 w-full justify-between rounded-xl border-zinc-200 bg-white px-4 text-sm font-medium">
                        <Link href={payrollEmployeePath('/employee/payroll/payslips')}>
                            <span className="inline-flex items-center gap-2">
                                <FileText className="h-4 w-4 text-violet-600" />
                                View all payslips
                            </span>
                            <ArrowUpRight className="h-4 w-4 text-violet-600" />
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );

    if (embedded) {
        return dashboardBody;
    }

    return (
        <Layout>
            <Head title="My Payroll" />
            <PageSurface className="px-3 sm:px-4">{dashboardBody}</PageSurface>
        </Layout>
    );
}

export default function PayrollEmployeeDashboard(props: PayrollEmployeeDashboardProps) {
    return <PayrollEmployeeDashboardView {...props} />;
}

function MetricCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'slate' | 'emerald' | 'amber' | 'violet';
}) {
    const toneClass = {
        slate: 'border-zinc-200 bg-zinc-50/70 text-zinc-950',
        emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
        amber: 'border-amber-200 bg-amber-50/70 text-amber-950',
        violet: 'border-violet-200 bg-violet-50/70 text-violet-950',
    }[tone];

    return (
        <div className={`rounded-xl border p-3 ${toneClass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 font-mono text-xl font-bold tabular-nums">{fmt(value)}</p>
        </div>
    );
}

function BreakdownCard({
    title,
    rows,
    totalLabel,
    totalValue,
    emptyText,
    tone,
}: {
    title: string;
    rows: PayslipLine[];
    totalLabel: string;
    totalValue: number;
    emptyText: string;
    tone: 'emerald' | 'amber';
}) {
    const totalClass = tone === 'emerald' ? 'text-emerald-800' : 'text-amber-800';

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
            </div>
            <div className="p-4">
                {rows.length > 0 ? (
                    <div className="space-y-2">
                        {rows.map((row) => (
                            <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50/70 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-900">{row.head_label}</p>
                                    {row.is_loan && (
                                        <Badge variant="outline" className="mt-1 border-violet-200 bg-violet-50 text-[10px] text-violet-800">
                                            Loan deduction
                                        </Badge>
                                    )}
                                </div>
                                <p className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${totalClass}`}>{fmt(row.amount)}</p>
                            </div>
                        ))}
                        <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
                            <p className="text-sm font-semibold text-zinc-900">{totalLabel}</p>
                            <p className={`font-mono text-base font-bold tabular-nums ${totalClass}`}>{fmt(totalValue)}</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500">
                        {emptyText}
                    </div>
                )}
            </div>
        </div>
    );
}

function SnapshotRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${strong ? 'bg-violet-50 text-violet-950' : 'bg-zinc-50/70 text-zinc-800'}`}>
            <span className="text-sm">{label}</span>
            <span className={`font-mono text-sm tabular-nums ${strong ? 'font-bold' : 'font-semibold'}`}>{value}</span>
        </div>
    );
}
