import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowUpRight,
    Award,
    Banknote,
    BriefcaseBusiness,
    Building2,
    Calculator,
    Layers,
    ListOrdered,
    Pencil,
    Settings2,
    Wallet,
    FileBarChart2,
    Coins,
    Users,
    CheckCircle2,
    Lock,
    Unlock,
    AlertTriangle,
    ArrowRight,
    Play,
    User,
    ShieldAlert,
    RotateCcw,
    SlidersHorizontal,
    FileText,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import {
    PayrollEmployeeDashboardView,
    type PayrollEmployeeDashboardProps,
} from '@/pages/sections/payroll/employee-dashboard';

type BatchRun = {
    id: number;
    branch: string;
    branch_code?: string | null;
    salary_type: string;
    year: number;
    month: number;
    period_label: string;
    status: string;
    employee_count: number;
    total_net: number;
    processed_at?: string | null;
    posted_at?: string | null;
};

type Props = {
    stats: {
        payscales: number;
        grades: number;
        steps: number;
        heads: number;
        structures: number;
        branchBanks: number;
        branchesUnmapped: number;
        processedRuns: number;
        postedRuns: number;
    };
    cycle?: {
        year: number;
        month: number;
        label: string;
        net: number;
        gross: number;
        deduction: number;
        employee_count: number;
        total_employees: number;
        open_runs: number;
        posted_runs: number;
        arrear_total: number;
        withheld_count: number;
    };
    recentRuns?: BatchRun[];
    userRole: string;
    showEmployeeTab?: boolean;
    employeeDashboard?: PayrollEmployeeDashboardProps | null;
};

function NavTile({
    href,
    title,
    badge,
    icon: Icon,
    color = 'slate',
}: {
    href: string;
    title: string;
    badge?: number | string | null;
    icon: LucideIcon;
    color?: 'emerald' | 'indigo' | 'slate' | 'amber';
}) {
    const colorStyles = {
        emerald: 'bg-emerald-50/70 text-emerald-700 ring-emerald-600/15 group-hover:bg-emerald-100/70',
        indigo: 'bg-indigo-50/70 text-indigo-700 ring-indigo-600/15 group-hover:bg-indigo-100/70',
        amber: 'bg-amber-50/70 text-amber-700 ring-amber-600/15 group-hover:bg-amber-100/70',
        slate: 'bg-slate-100 text-slate-700 ring-slate-200/80 group-hover:bg-slate-200/60',
    };

    return (
        <Link
            href={href}
            className="group relative flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 text-xs font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
        >
            <span className={cn('grid h-8.5 w-8.5 shrink-0 place-items-center rounded-lg ring-1 transition-colors', colorStyles[color])}>
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">{title}</span>
            {badge !== undefined && badge !== null && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
                    {badge}
                </span>
            )}
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-600" />
        </Link>
    );
}

export default function PayrollDashboard({
    stats,
    cycle,
    recentRuns = [],
    userRole,
    showEmployeeTab: showEmployeeTabProp,
    employeeDashboard,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: string) => hasAppPermission(auth, p);
    const section = '?section=payroll';
    const showEmployeeTab = Boolean(showEmployeeTabProp && employeeDashboard);
    const [dashboardMode, setDashboardMode] = useState<'admin' | 'employee'>('admin');

    const cycleCoveragePercent = cycle?.total_employees && cycle.total_employees > 0
        ? Math.min(100, Math.round(((cycle.employee_count || 0) / cycle.total_employees) * 100))
        : 0;

    const netRatioPercent = cycle?.gross && cycle.gross > 0
        ? Math.min(100, Math.round(((cycle.net || 0) / cycle.gross) * 100))
        : 0;

    const adminDashboardBody = (
        <div className="space-y-6">
            {/* Health & Compliance Alerts */}
            {stats.branchesUnmapped > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600" />
                        <div>
                            <span className="font-bold">Missing Disbursement Bank:</span>
                            <span className="ml-1 text-amber-800">
                                {stats.branchesUnmapped} branch{stats.branchesUnmapped === 1 ? '' : 'es'} have no payroll bank account configured.
                            </span>
                        </div>
                    </div>
                    {can('payroll.create') && (
                        <Button asChild size="sm" className="h-7.5 shrink-0 bg-amber-800 text-[11px] font-semibold text-white hover:bg-amber-900">
                            <Link href={`/branch-payroll-banks/create${section}`}>Configure Branch Bank</Link>
                        </Button>
                    )}
                </div>
            )}

            {cycle && cycle.withheld_count > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-xs text-rose-900 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>
                            <strong>Salary On Hold:</strong> {cycle.withheld_count} employee(s) have salaries withheld in {cycle.label}.
                        </span>
                    </div>
                    {can('payroll.view') && (
                        <Link
                            href={`/salary-withheld${section}`}
                            className="font-semibold text-rose-800 underline underline-offset-2 hover:text-rose-950"
                        >
                            Review Withheld List →
                        </Link>
                    )}
                </div>
            )}

            {/* Financial Health & Executive KPI Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Net Disbursement */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Net Disbursement
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <Wallet className="h-4 w-4" />
                        </span>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-xl md:text-2xl font-bold font-mono tracking-tight text-slate-900">
                            {formatTakaWithSymbol(cycle?.net || 0)}
                        </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Period: <strong>{cycle?.label || 'Current'}</strong></span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                            ● {cycle?.posted_runs || 0} Posted
                        </span>
                    </div>
                </div>

                {/* 2. Gross vs Deductions */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Gross & Deductions
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <Calculator className="h-4 w-4" />
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                        <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Gross</span>
                            <span className="text-sm font-bold font-mono text-slate-900">
                                {formatTakaWithSymbol(cycle?.gross || 0)}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase">Deductions</span>
                            <span className="text-sm font-bold font-mono text-rose-600">
                                -{formatTakaWithSymbol(cycle?.deduction || 0)}
                            </span>
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                            <div className="bg-indigo-600 h-full" style={{ width: `${netRatioPercent}%` }} />
                            <div className="bg-rose-400 h-full" style={{ width: `${100 - netRatioPercent}%` }} />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                            <span>Net Ratio {netRatioPercent}%</span>
                            <span>Deductions {100 - netRatioPercent}%</span>
                        </div>
                    </div>
                </div>

                {/* 3. Payroll Staff Coverage */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Staff Covered
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                            <Users className="h-4 w-4" />
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-slate-900">
                            {cycle?.employee_count || 0}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            / {cycle?.total_employees || 0} Total
                        </span>
                    </div>
                    <div className="mt-2">
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${cycleCoveragePercent}%` }} />
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400 flex justify-between">
                            <span>Coverage</span>
                            <span className="font-semibold text-blue-700">{cycleCoveragePercent}%</span>
                        </div>
                    </div>
                </div>

                {/* 4. Arrears & Open Runs */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Arrears & Open Runs
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                            <Coins className="h-4 w-4" />
                        </span>
                    </div>
                    <div className="mt-2.5">
                        <div className="text-xl font-bold font-mono tracking-tight text-slate-900">
                            {formatTakaWithSymbol(cycle?.arrear_total || 0)}
                        </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Allocated Arrear</span>
                        {cycle && cycle.open_runs > 0 ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                                {cycle.open_runs} Open for Arrear
                            </span>
                        ) : (
                            <span className="text-slate-400">All Batches Posted</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactive 5-Step Payroll Lifecycle Funnel */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                            Monthly Payroll Processing Lifecycle
                        </h2>
                        <p className="text-[11px] text-slate-400">
                            Interactive operational funnel — click any step to execute that phase
                        </p>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        Target Cycle: <strong className="text-slate-800">{cycle?.label || 'Current Period'}</strong>
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 text-xs">
                    {/* Step 1: Master Setup */}
                    <Link
                        href={`/payscales${section}`}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="mt-2 font-bold text-slate-800 group-hover:text-emerald-700">
                            Master Setup
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                            Grades, Heads & Structures
                        </div>
                    </Link>

                    {/* Step 2: Adjustments */}
                    <Link
                        href={`/salary-head-modifications${section}`}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 2</span>
                            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <div className="mt-2 font-bold text-slate-800 group-hover:text-emerald-700">
                            Pre-Run Holds
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                            Head Mods & Withheld
                        </div>
                    </Link>

                    {/* Step 3: Process */}
                    <Link
                        href={`/salary-process${section}`}
                        className="group flex flex-col justify-between rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-2xs"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Step 3</span>
                            <Play className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div className="mt-2 font-bold text-emerald-950">
                            Salary Process
                        </div>
                        <div className="mt-1 text-[10px] text-emerald-800">
                            Batch Calculation
                        </div>
                    </Link>

                    {/* Step 4: Arrear */}
                    <Link
                        href="/salary-arrear"
                        className="group flex flex-col justify-between rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-3 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-2xs"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Step 4</span>
                            <Coins className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        <div className="mt-2 font-bold text-indigo-950">
                            Arrear Allocation
                        </div>
                        <div className="mt-1 text-[10px] text-indigo-800">
                            Adjust Before Post
                        </div>
                    </Link>

                    {/* Step 5: Post */}
                    <Link
                        href={`/salary-post${section}`}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 5</span>
                            <Lock className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <div className="mt-2 font-bold text-slate-800 group-hover:text-emerald-700">
                            Review & Post
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                            Lock & Bank Advice
                        </div>
                    </Link>
                </div>
            </div>

            {/* Live Operational Queue: Recent Payroll Batches */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                            Recent Payroll Batches & Status Queue
                        </h2>
                    </div>
                    {can('payroll.view') && (
                        <Link
                            href={`/salary-post${section}`}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                            View all batches →
                        </Link>
                    )}
                </div>

                {recentRuns.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                        No recent payroll runs recorded yet. Start by running Salary Process.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-3 py-2.5">Branch / Unit</th>
                                    <th className="px-3 py-2.5">Type</th>
                                    <th className="px-3 py-2.5">Period</th>
                                    <th className="px-3 py-2.5 text-right">Staff</th>
                                    <th className="px-3 py-2.5 text-right">Net Payout</th>
                                    <th className="px-3 py-2.5">Status</th>
                                    <th className="px-3 py-2.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentRuns.map((run) => (
                                    <tr key={run.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-3 py-2.5">
                                            <span className="font-semibold text-slate-900 block">
                                                {run.branch}
                                            </span>
                                            {run.branch_code && (
                                                <span className="text-[10px] text-slate-400">
                                                    Code: {run.branch_code}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 capitalize text-slate-600">
                                            {run.salary_type}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-slate-700">
                                            {run.period_label}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                                            {run.employee_count}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                                            {formatTakaWithSymbol(run.total_net)}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {run.status === 'processed' ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                                    <Unlock className="h-3 w-3" />
                                                    Unposted (Open)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                                    <Lock className="h-3 w-3" />
                                                    Posted & Locked
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            {run.status === 'processed' ? (
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                                                >
                                                    <Link href={`/salary-post${section}`}>
                                                        Review & Post
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2.5 text-[11px] border-slate-200 text-slate-600"
                                                >
                                                    <Link href={`/salary-arrear`}>
                                                        View Records
                                                    </Link>
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Categorized Management Bento Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* 1. Monthly Payroll Operations */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <Play className="h-3.5 w-3.5 text-emerald-600" />
                            Monthly Payroll Operations
                        </h3>
                        <span className="text-[10px] text-slate-400">Core Run Actions</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {can('payroll.view') && (
                            <NavTile href={`/salary-process${section}`} title="Salary Process" icon={Calculator} color="emerald" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href="/salary-arrear" title="Salary Arrear" icon={Coins} color="emerald" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/salary-post${section}`} title="Salary Post" icon={Wallet} color="emerald" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/salary-withheld${section}`} title="Salary Withheld" icon={Banknote} color="amber" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/salary-rollback${section}`} title="Salary Rollback" icon={RotateCcw} color="slate" />
                        )}
                    </div>
                </div>

                {/* 2. Master Setup & Pay Scale */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <Settings2 className="h-3.5 w-3.5 text-indigo-600" />
                            Structure & Pay Scale Setup
                        </h3>
                        <span className="text-[10px] text-slate-400">Framework Master</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {can('payroll.view') && (
                            <NavTile href={`/payscales${section}`} title="Payscales" badge={stats.payscales} icon={BriefcaseBusiness} color="indigo" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/salary-grades${section}`} title="Grades" badge={stats.grades} icon={Layers} color="indigo" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/salary-steps${section}`} title="Steps" badge={stats.steps} icon={ListOrdered} color="indigo" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/salary-heads${section}`} title="Salary Heads" badge={stats.heads} icon={Wallet} color="indigo" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/salary-structures/manual${section}`} title="Structure (Manual)" badge={stats.structures} icon={Settings2} color="indigo" />
                        )}
                    </div>
                </div>

                {/* 3. Employee Pay Rules & Adjustments */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <Pencil className="h-3.5 w-3.5 text-slate-600" />
                            Employee Pay Rules & Adjustments
                        </h3>
                        <span className="text-[10px] text-slate-400">Custom Salaries</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {can('payroll.view') && (
                            <NavTile href={`/salary-head-modifications${section}`} title="Head Modification" icon={Pencil} color="slate" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/probation-salary${section}`} title="Probation Salary" icon={Banknote} color="slate" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/fixed-salary${section}`} title="Fixed Salary" icon={Banknote} color="slate" />
                        )}
                    </div>
                </div>

                {/* 4. Festival & Bonus Management */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <Award className="h-3.5 w-3.5 text-amber-600" />
                            Festival & Bonus Management
                        </h3>
                        <span className="text-[10px] text-slate-400">Bonus Cycles</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {can('payroll.view') && (
                            <NavTile href={`/bonus-types${section}`} title="Bonus Type" icon={Award} color="amber" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/bonus-configurations${section}`} title="Bonus Configuration" icon={Settings2} color="amber" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/bonus-calculation${section}`} title="Bonus Calculation" icon={Award} color="amber" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/bonus-post${section}`} title="Bonus Post" icon={Award} color="amber" />
                        )}
                    </div>
                </div>

                {/* 5. Banking, Disbursal & Reports */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <FileBarChart2 className="h-3.5 w-3.5 text-emerald-600" />
                            Banking, Financial Statements & Reports
                        </h3>
                        <span className="text-[10px] text-slate-400">Disbursement & Audits</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {can('payroll.view') && (
                            <NavTile href={`/branch-payroll-banks${section}`} title="Branch Wise Bank" badge={stats.branchBanks} icon={Building2} color="emerald" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/financial-statement${section}`} title="Financial Statement" icon={FileText} color="emerald" />
                        )}
                        {can('payroll.view') && (
                            <NavTile href={`/payroll/reports${section}`} title="All Payroll Reports" icon={FileBarChart2} color="emerald" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Layout>
            <Head title="Payroll Command Center" />

            <PageSurface className="max-w-7xl bg-slate-50/50 py-5 px-3 sm:px-5">
                {/* Executive Command Header */}
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                                <Banknote className="h-4.5 w-4.5" />
                            </span>
                            <h1 className="text-base font-bold tracking-tight text-slate-900 md:text-lg">
                                Payroll Command Center
                            </h1>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80">
                                {userRole}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Executive operations & monthly disbursal management · {cycle?.label || 'Current Period'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {can('payroll.create') && (
                            <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                                <Link href={`/salary-process${section}`}>
                                    <Play className="mr-1.5 h-3.5 w-3.5" /> Run Salary Process
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                            <Link href="/sections">Sections Overview</Link>
                        </Button>
                    </div>
                </div>

                {/* Dual Mode Switcher (Admin vs Personal Employee Dashboard) */}
                {showEmployeeTab ? (
                    <Tabs
                        value={dashboardMode}
                        onValueChange={(v) => setDashboardMode(v as 'admin' | 'employee')}
                        className="w-full"
                    >
                        <TabsList className="mb-4 h-9 w-fit min-w-0 gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                            <TabsTrigger
                                value="admin"
                                className="h-8 min-w-[6rem] flex-none rounded-md px-3 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                            >
                                Admin Command Center
                            </TabsTrigger>
                            <TabsTrigger
                                value="employee"
                                className="h-8 min-w-[6rem] flex-none gap-1.5 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                            >
                                <User className="h-3.5 w-3.5" />
                                My Personal Payroll
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="admin">{adminDashboardBody}</TabsContent>
                        <TabsContent value="employee">
                            {employeeDashboard ? (
                                <PayrollEmployeeDashboardView embedded {...employeeDashboard} />
                            ) : null}
                        </TabsContent>
                    </Tabs>
                ) : (
                    adminDashboardBody
                )}
            </PageSurface>
        </Layout>
    );
}
