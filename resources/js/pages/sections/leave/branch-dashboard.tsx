import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock,
    Search,
    Users,
    Wallet,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { employeeDisplayName } from '@/lib/employee-name';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type LeaveTypeCol = {
    id: number;
    name: string;
    days_allowed: number;
};

type EmployeeBalance = {
    leave_type_id: number;
    name: string;
    allocated: number;
    used: number;
    remaining: number;
};

type BranchLeaveEmployee = {
    id: number;
    employee_id: string;
    pin?: string | null;
    name_en?: string | null;
    name_bn?: string | null;
    designation?: string | null;
    status: string;
    on_leave_today: boolean;
    pending_count: number;
    balances: EmployeeBalance[];
    total_allocated: number;
    total_used: number;
    total_remaining: number;
};

type PendingApplication = {
    id: number;
    employee: {
        id?: number | null;
        employee_id?: string | null;
        name_en?: string | null;
        name_bn?: string | null;
    } | null;
    leave_type?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    days: number;
    applied_at?: string | null;
};

export interface BranchLeaveDashboardProps {
    branch: {
        id: number;
        name: string;
        branch_code?: string | null;
    };
    year: number;
    leaveTypes: LeaveTypeCol[];
    stats: {
        activeStaff: number;
        totalStaff: number;
        pending: number;
        todayOnLeave: number;
        approvedThisMonth: number;
    };
    employees: BranchLeaveEmployee[];
    pendingApplications: PendingApplication[];
    quickLinks: {
        applications: string;
        pending: string;
        balances: string;
    };
}

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
        return value;
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function balanceForType(employee: BranchLeaveEmployee, typeId: number): EmployeeBalance | undefined {
    return employee.balances.find((b) => b.leave_type_id === typeId);
}

export default function BranchLeaveDashboard({
    branch,
    year,
    leaveTypes = [],
    stats,
    employees = [],
    pendingApplications = [],
    quickLinks,
}: BranchLeaveDashboardProps) {
    const [search, setSearch] = useState('');
    const branchTitle = branch?.name ?? 'Branch';
    const branchCode = branch?.branch_code ? `(${branch.branch_code})` : '';

    const filteredEmployees = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) {
            return employees;
        }
        return employees.filter((emp) => {
            const name = employeeDisplayName(emp).toLowerCase();
            const pin = (emp.pin ?? '').toLowerCase();
            const code = (emp.employee_id ?? '').toLowerCase();
            const designation = (emp.designation ?? '').toLowerCase();
            return name.includes(q) || pin.includes(q) || code.includes(q) || designation.includes(q);
        });
    }, [employees, search]);

    return (
        <Layout>
            <Head title={`Leave Dashboard — ${branchTitle}`} />

            <PageSurface>
                <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-600 via-pink-600 to-orange-600 p-5 sm:p-7 text-white shadow-lg">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 -mb-10 h-36 w-36 rounded-full bg-rose-400/20 blur-xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md mb-2.5 border border-white/20">
                                <Building2 className="h-3.5 w-3.5" />
                                <span>Branch Leave Portal</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                                {branchTitle} <span className="text-rose-100 text-lg sm:text-xl font-normal">{branchCode}</span>
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-rose-50/90 max-w-xl leading-relaxed">
                                Staff leave allocation, days taken, remaining balance, and pending applications for this branch only ({year}).
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={quickLinks.pending}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-rose-900 shadow-md transition-all hover:bg-rose-50 hover:shadow-lg active:scale-95"
                            >
                                <Clock className="h-4 w-4 text-amber-600" />
                                <span>Pending applications</span>
                            </Link>
                            <Link
                                href={quickLinks.balances}
                                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs sm:text-sm font-bold text-white border border-white/25 backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
                            >
                                <Wallet className="h-4 w-4 text-amber-200" />
                                <span>Leave balances</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Branch staff</span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.activeStaff}</span>
                            <span className="text-xs font-medium text-slate-400">/ {stats.totalStaff} total</span>
                        </div>
                        <p className="mt-1 text-xs text-emerald-700 font-medium">Active and on-leave staff at this branch</p>
                    </div>

                    <Link href={quickLinks.pending} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40">
                        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-amber-200 hover:shadow-md transition-all h-full">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending</span>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.pending}</span>
                            </div>
                            <p className="mt-1 text-xs text-amber-700 font-medium">Applications waiting for approval</p>
                        </div>
                    </Link>

                    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">On leave today</span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.todayOnLeave}</span>
                        </div>
                        <p className="mt-1 text-xs text-sky-700 font-medium">Approved leave covering today</p>
                    </div>

                    <Link href={quickLinks.applications} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40">
                        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-rose-200 hover:shadow-md transition-all h-full">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved this month</span>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.approvedThisMonth}</span>
                            </div>
                            <p className="mt-1 text-xs text-rose-700 font-medium">Approved applications starting in {year}</p>
                        </div>
                    </Link>
                </div>

                <div className="mt-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-rose-600" />
                            <span>Employee leave — allocated vs taken ({year})</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name, PIN, ID…"
                                    className="h-8 w-56 pl-8 text-xs"
                                />
                            </div>
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                <Link href={quickLinks.balances}>
                                    Full balances
                                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                        <th className="py-3 px-4 sticky left-0 bg-slate-50/95">Employee</th>
                                        {leaveTypes.map((type) => (
                                            <th key={type.id} className="py-3 px-3 text-center whitespace-nowrap">
                                                {type.name}
                                                <span className="block font-medium normal-case tracking-normal text-[10px] text-slate-400">
                                                    used / allocated
                                                </span>
                                            </th>
                                        ))}
                                        <th className="py-3 px-3 text-center">Remaining</th>
                                        <th className="py-3 px-3 text-center">Pending</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={Math.max(4, leaveTypes.length + 4)} className="py-8 text-center text-slate-400">
                                                <p className="text-sm font-medium text-slate-500">
                                                    {employees.length === 0
                                                        ? 'No staff found for this branch.'
                                                        : 'No employees match this search.'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEmployees.map((emp) => (
                                            <tr key={emp.id} className="transition-colors hover:bg-slate-50/80">
                                                <td className="py-3 px-4 sticky left-0 bg-white">
                                                    <div className="font-bold text-slate-900">{employeeDisplayName(emp)}</div>
                                                    <div className="mt-0.5 text-[10px] text-slate-500">
                                                        {emp.employee_id}
                                                        {emp.pin ? ` · PIN ${emp.pin}` : ''}
                                                        {emp.designation ? ` · ${emp.designation}` : ''}
                                                    </div>
                                                </td>
                                                {leaveTypes.map((type) => {
                                                    const bal = balanceForType(emp, type.id);
                                                    if (!bal) {
                                                        return (
                                                            <td key={type.id} className="py-3 px-3 text-center text-slate-300">
                                                                —
                                                            </td>
                                                        );
                                                    }
                                                    return (
                                                        <td key={type.id} className="py-3 px-3 text-center tabular-nums">
                                                            <span className="font-bold text-slate-900">{bal.used}</span>
                                                            <span className="text-slate-400"> / {bal.allocated}</span>
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-3 px-3 text-center font-bold tabular-nums text-emerald-700">
                                                    {emp.total_remaining}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {emp.pending_count > 0 ? (
                                                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px]">
                                                            {emp.pending_count}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-300">0</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {emp.on_leave_today ? (
                                                        <Badge className="bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-[10px]">
                                                            On leave today
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-500 capitalize">{emp.status.replace('_', ' ')}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span>Pending applications</span>
                        </h2>
                        <Link href={quickLinks.pending} className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900">
                            View all
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                        {pendingApplications.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                <p className="text-sm font-medium text-slate-500">No pending leave applications for this branch.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            <th className="py-3 px-4">Employee</th>
                                            <th className="py-3 px-3">Leave type</th>
                                            <th className="py-3 px-3">Dates</th>
                                            <th className="py-3 px-3 text-center">Days</th>
                                            <th className="py-3 px-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pendingApplications.map((app) => (
                                            <tr key={app.id} className="hover:bg-slate-50/80">
                                                <td className="py-3 px-4 font-bold text-slate-900">{employeeDisplayName(app.employee)}</td>
                                                <td className="py-3 px-3 text-slate-700">{app.leave_type ?? '—'}</td>
                                                <td className="py-3 px-3 text-slate-600">
                                                    {formatDate(app.start_date)} – {formatDate(app.end_date)}
                                                </td>
                                                <td className="py-3 px-3 text-center tabular-nums font-medium">{app.days}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <Link
                                                        href={`/leave/applications/${app.id}?section=leave`}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-rose-600 hover:text-white transition-colors"
                                                    >
                                                        View
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
