import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Banknote,
    CheckCircle2,
    CircleDollarSign,
    HandCoins,
    Layers,
    ListChecks,
    Users,
    Wallet,
    XCircle,
    Clock,
    Send,
    FileText,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type SharedData } from '@/types';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { cn } from '@/lib/utils';

const fmt = fmtLoanAmount;
const fmtInt = fmtLoanAmount;

type LoanTypeRow = {
    loan_type: string;
    label: string;
    loan_count: number;
    outstanding: number;
    principal: number;
};

type Stats = {
    activeLoans: number;
    completedLoans: number;
    cancelledLoans: number;
    totalLoans: number;
    employeesWithActiveLoan: number;
    totalOutstanding: number;
    totalPrincipalActive: number;
    totalDisbursedAll: number;
    totalRecoveredActive: number;
    pendingApplications: number;
    approvedAwaitingDisburse: number;
    pendingInstallments: number;
    scheduledInstallments: number;
    collectionsThisMonth: number;
    collectionBatchesThisMonth: number;
    activeLoanPolicies: number;
    byLoanType: LoanTypeRow[];
};

type Props = {
    stats: Stats;
    userRole: string;
};

function StatCard({
    label,
    value,
    icon: Icon,
    format = 'number',
    accent = 'emerald',
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    format?: 'number' | 'currency';
    accent?: 'emerald' | 'teal' | 'amber' | 'indigo' | 'rose' | 'zinc';
}) {
    const display = format === 'currency' ? fmt(value) : fmtInt(value);

    const accentClasses = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
        teal: 'bg-teal-50 text-teal-700 ring-teal-600/10',
        amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
        indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
        rose: 'bg-rose-50 text-rose-700 ring-rose-600/10',
        zinc: 'bg-zinc-50 text-zinc-700 ring-zinc-600/10',
    };

    return (
        <div className="flex flex-col rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm">
            <span className={cn('grid h-8 w-8 place-items-center rounded-lg ring-1', accentClasses[accent])}>
                <Icon className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-zinc-900">{display}</p>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{children}</h2>
        </div>
    );
}

export default function EmployeeLoanDashboard({ stats, userRole }: Props) {
    const { auth } = usePage<SharedData>().props;

    return (
        <Layout>
            <Head title="Employee Loan Dashboard" />

            <PageSurface className="max-w-7xl bg-zinc-50/40 px-3 py-4 md:px-4 md:py-5">
                <div className="mb-5 border-b border-emerald-100 pb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
                            <HandCoins className="h-5 w-5" />
                        </span>
                        <div>
                            <h1 className="text-base font-bold tracking-tight text-zinc-900 md:text-lg">Employee Loan</h1>
                            <p className="text-[11px] text-zinc-500">
                                {userRole} · Portfolio & recovery snapshot
                                {auth?.user?.name ? ` · ${auth.user.name}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <section className="mb-6">
                    <SectionTitle>Loan portfolio</SectionTitle>
                    <div className="grid grid-cols-1 gap-2.5 min-[340px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                        <StatCard label="Active loans" value={stats.activeLoans} icon={HandCoins} accent="emerald" />
                        <StatCard label="Employees with loan" value={stats.employeesWithActiveLoan} icon={Users} accent="teal" />
                        <StatCard label="Completed" value={stats.completedLoans} icon={CheckCircle2} accent="indigo" />
                        <StatCard label="Cancelled" value={stats.cancelledLoans} icon={XCircle} accent="rose" />
                        <StatCard label="Total loans" value={stats.totalLoans} icon={Layers} accent="zinc" />
                        <StatCard label="Active policies" value={stats.activeLoanPolicies} icon={FileText} accent="zinc" />
                    </div>
                </section>

                <section className="mb-6">
                    <SectionTitle>Financial summary (৳)</SectionTitle>
                    <div className="grid grid-cols-1 gap-2.5 min-[340px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                        <StatCard
                            label="Outstanding (active)"
                            value={stats.totalOutstanding}
                            icon={CircleDollarSign}
                            format="currency"
                            accent="emerald"
                        />
                        <StatCard
                            label="Principal (active)"
                            value={stats.totalPrincipalActive}
                            icon={Wallet}
                            format="currency"
                            accent="teal"
                        />
                        <StatCard
                            label="Recovered (active)"
                            value={stats.totalRecoveredActive}
                            icon={Banknote}
                            format="currency"
                            accent="indigo"
                        />
                        <StatCard
                            label="Total disbursed"
                            value={stats.totalDisbursedAll}
                            icon={Send}
                            format="currency"
                            accent="zinc"
                        />
                        <StatCard
                            label="Collections (this month)"
                            value={stats.collectionsThisMonth}
                            icon={Banknote}
                            format="currency"
                            accent="amber"
                        />
                    </div>
                </section>

                <div className="mb-6 grid gap-6 lg:grid-cols-2">
                    <section>
                        <SectionTitle>Application pipeline</SectionTitle>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            <StatCard label="Pending approval" value={stats.pendingApplications} icon={Clock} accent="amber" />
                            <StatCard
                                label="Approved (not disbursed)"
                                value={stats.approvedAwaitingDisburse}
                                icon={FileText}
                                accent="indigo"
                            />
                        </div>
                    </section>

                    <section>
                        <SectionTitle>Installments & collection</SectionTitle>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                            <StatCard label="Pending installments" value={stats.pendingInstallments} icon={ListChecks} accent="amber" />
                            <StatCard label="On payroll (scheduled)" value={stats.scheduledInstallments} icon={ListChecks} accent="teal" />
                            <StatCard
                                label="Collection batches (month)"
                                value={stats.collectionBatchesThisMonth}
                                icon={Banknote}
                                accent="emerald"
                            />
                        </div>
                    </section>
                </div>

                {stats.byLoanType.length > 0 && (
                    <section>
                        <SectionTitle>Active loans by type</SectionTitle>
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-xs font-semibold text-zinc-700">Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                                <th className="px-4 py-2.5">Loan type</th>
                                                <th className="px-4 py-2.5 text-right">Count</th>
                                                <th className="px-4 py-2.5 text-right">Principal (৳)</th>
                                                <th className="px-4 py-2.5 text-right">Outstanding (৳)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.byLoanType.map((row) => (
                                                <tr key={row.loan_type} className="border-b border-zinc-50 last:border-0">
                                                    <td className="px-4 py-2.5 font-medium text-zinc-800">{row.label}</td>
                                                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                                                        {fmtInt(row.loan_count)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                                                        {fmt(row.principal)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-800">
                                                        {fmt(row.outstanding)}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-emerald-50/40 font-semibold text-zinc-900">
                                                <td className="px-4 py-2.5">Total</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(stats.activeLoans)}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums">{fmt(stats.totalPrincipalActive)}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-800">
                                                    {fmt(stats.totalOutstanding)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                )}
            </PageSurface>
        </Layout>
    );
}
