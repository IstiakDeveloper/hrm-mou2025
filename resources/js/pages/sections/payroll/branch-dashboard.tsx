import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Banknote,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    FileText,
    Layers,
    MapPin,
    Receipt,
    Sparkles,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { formatTakaAmount } from '@/lib/taka-format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface BranchPayrollDashboardProps {
    branch: {
        id: number;
        name: string;
        branch_code?: string | null;
    };
    stats: {
        activeStaff: number;
        totalStaff: number;
        latestPostedMonth: string | null;
        latestPostedYear: number | null;
        latestPostedMonthNum: number | null;
        latestPostedNet: number;
        latestPostedEmployees: number;
        latestProcessedMonth: string | null;
        latestProcessedYear: number | null;
        latestProcessedMonthNum: number | null;
        latestProcessedNet: number;
        latestProcessedEmployees: number;
        yearlyPostedTotal: number;
        postedRunsCount: number;
        unpostedRunsCount: number;
    };
    recentRuns: Array<{
        id: number;
        year: number;
        month: number;
        period_label: string;
        status: 'posted' | 'processed' | string;
        employee_count: number;
        total_gross: number;
        total_deduction: number;
        total_net: number;
        process_date?: string | null;
        posted_at?: string | null;
        report_url: string;
    }>;
    quickLinks: {
        postedSheet: string;
        unpostedSheet: string;
    };
}

export default function BranchPayrollDashboard({
    branch,
    stats,
    recentRuns = [],
    quickLinks,
}: BranchPayrollDashboardProps) {
    const branchTitle = branch?.name ?? 'Branch';
    const branchCode = branch?.branch_code ? `(${branch.branch_code})` : '';

    return (
        <Layout>
            <Head title={`Payroll Dashboard — ${branchTitle}`} />

            <PageSurface>
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-5 sm:p-7 text-white shadow-lg">
                    {/* Background glowing decorations */}
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 -mb-10 h-36 w-36 rounded-full bg-violet-400/20 blur-xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md mb-2.5 border border-white/20">
                                <Building2 className="h-3.5 w-3.5" />
                                <span>Branch Payroll Portal</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                                {branchTitle} <span className="text-violet-200 text-lg sm:text-xl font-normal">{branchCode}</span>
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-violet-100/90 max-w-xl leading-relaxed">
                                Overview of staff payroll runs, posted disbursements, and processed salary sheets for this branch.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={quickLinks.postedSheet}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-violet-900 shadow-md transition-all hover:bg-violet-50 hover:shadow-lg active:scale-95"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-violet-600" />
                                <span>Posted Salary Sheet</span>
                            </Link>

                            <Link
                                href={quickLinks.unpostedSheet}
                                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs sm:text-sm font-bold text-white border border-white/25 backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
                            >
                                <Clock className="h-4 w-4 text-amber-300" />
                                <span>Un-posted Sheet</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics Grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active Staff */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Branch Staff
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                    {stats.activeStaff}
                                </span>
                                <span className="text-xs font-medium text-slate-400">
                                    / {stats.totalStaff} Total
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-emerald-700 font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active employees at branch
                            </p>
                        </div>
                    </div>

                    {/* Latest Posted Salary */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-violet-200">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Latest Posted
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                    ৳ {formatTakaAmount(stats.latestPostedNet || 0, 0)}
                                </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{stats.latestPostedMonth ?? 'No posted run'}</span>
                                {stats.latestPostedEmployees > 0 && (
                                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[10px] py-0 px-1.5">
                                        {stats.latestPostedEmployees} staff
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* In-Process / Unposted */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-amber-200">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                In-Process (Unposted)
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                    {stats.latestProcessedNet > 0
                                        ? `৳ ${formatTakaAmount(stats.latestProcessedNet, 0)}`
                                        : '৳ 0'}
                                </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{stats.latestProcessedMonth ?? 'None pending'}</span>
                                {stats.latestProcessedEmployees > 0 && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 px-1.5">
                                        {stats.latestProcessedEmployees} staff
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Yearly Posted Total */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                YTD Net Disbursed
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                    ৳ {formatTakaAmount(stats.yearlyPostedTotal || 0, 0)}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                Year {new Date().getFullYear()} total posted ({stats.postedRunsCount} runs)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Action / Reports Section */}
                <div className="mt-6">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-violet-600" />
                        <span>Branch Salary Reports</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Posted Salary Sheet Card */}
                        <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-semibold">
                                    Disbursed / Final
                                </Badge>
                            </div>
                            <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                Salary Sheet (Posted)
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                View, print or export the final posted salary sheet for this branch. Filter by year, month, department, designation or project.
                            </p>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    {stats.latestPostedMonth ? `Latest: ${stats.latestPostedMonth}` : 'No posted sheet'}
                                </span>
                                <Link
                                    href={quickLinks.postedSheet}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800"
                                >
                                    <span>Open Report</span>
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Unposted Salary Sheet Card */}
                        <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-amber-300 hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-semibold">
                                    Processed / Pending
                                </Badge>
                            </div>
                            <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                                Salary Sheet (Un-posted)
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                Review salary sheets that have been calculated/processed by Head Office but not yet permanently posted. Verify staff amounts and deductions.
                            </p>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    {stats.latestProcessedMonth ? `Current: ${stats.latestProcessedMonth}` : 'No in-process sheet'}
                                </span>
                                <Link
                                    href={quickLinks.unpostedSheet}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800"
                                >
                                    <span>Open Report</span>
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branch Payroll History Table */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-violet-600" />
                            <span>Recent Branch Payroll Runs</span>
                        </h2>
                        <span className="text-xs text-slate-400">
                            Showing up to 12 recent payroll months
                        </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                        <th className="py-3 px-4">Period</th>
                                        <th className="py-3 px-3">Status</th>
                                        <th className="py-3 px-3 text-center">Staff Count</th>
                                        <th className="py-3 px-3 text-right">Total Gross</th>
                                        <th className="py-3 px-3 text-right">Total Deductions</th>
                                        <th className="py-3 px-4 text-right">Net Payable</th>
                                        <th className="py-3 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentRuns.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <FileText className="h-8 w-8 text-slate-300" />
                                                    <p className="text-sm font-medium text-slate-500">No payroll runs found for this branch yet.</p>
                                                    <p className="text-xs text-slate-400">When payroll is processed for {branchTitle}, it will appear here.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        recentRuns.map((run) => {
                                            const isPosted = run.status === 'posted';
                                            return (
                                                <tr
                                                    key={run.id}
                                                    className="transition-colors hover:bg-slate-50/80 group"
                                                >
                                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>{run.period_label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-3">
                                                        {isPosted ? (
                                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                                                                Posted
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px]">
                                                                Un-posted
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-center font-medium text-slate-700">
                                                        {run.employee_count}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                                                        ৳ {formatTakaAmount(run.total_gross, 2)}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-right font-medium text-rose-600">
                                                        ৳ {formatTakaAmount(run.total_deduction, 2)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                                                        ৳ {formatTakaAmount(run.total_net, 2)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <Link
                                                            href={run.report_url}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-violet-600 hover:text-white transition-colors shadow-2xs"
                                                        >
                                                            <span>View Sheet</span>
                                                            <ArrowUpRight className="h-3 w-3" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
