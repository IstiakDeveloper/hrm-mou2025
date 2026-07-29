import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Banknote,
    CheckCircle2,
    CircleDollarSign,
    Clock,
    FileText,
    HandCoins,
    Layers,
    ListChecks,
    Send,
    User,
    Users,
    Wallet,
    XCircle,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type SharedData } from '@/types';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { cn } from '@/lib/utils';
import { EmployeeLoanEmployeeDashboardView, type EmployeeLoanEmployeeDashboardProps } from '@/pages/sections/employee-loan/employee-dashboard';

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
    showEmployeeTab?: boolean;
    employeeDashboard?: EmployeeLoanEmployeeDashboardProps | null;
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
        <div className="flex flex-col rounded-xl border border-zinc-200/90 bg-white p-2.5 sm:p-3.5 shadow-sm">
            <span className={cn('grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-lg ring-1', accentClasses[accent])}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <p className="mt-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-zinc-500 truncate">{label}</p>
            <p className="mt-0.5 text-xs sm:text-lg md:text-xl font-bold tabular-nums tracking-tight text-zinc-900 truncate">{display}</p>
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

export default function EmployeeLoanDashboard({ stats, userRole, showEmployeeTab: showEmployeeTabProp, employeeDashboard }: Props) {
    const { auth } = usePage<SharedData>().props;
    const showEmployeeTab = Boolean(showEmployeeTabProp && employeeDashboard);
    const [dashboardMode, setDashboardMode] = useState<'admin' | 'employee'>('admin');

    const adminDashboardBody = (
        <>
            <section className="mb-6">
                <SectionTitle>Loan portfolio</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
                    <StatCard label="Active loans" value={stats.activeLoans} icon={HandCoins} accent="emerald" />
                    <StatCard label="Employees with loan" value={stats.employeesWithActiveLoan} icon={Users} accent="teal" />
                    <StatCard label="Completed" value={stats.completedLoans} icon={CheckCircle2} accent="indigo" />
                    <StatCard label="Cancelled" value={stats.cancelledLoans} icon={XCircle} accent="rose" />
                    <StatCard label="Total loans" value={stats.totalLoans} icon={Layers} accent="zinc" />
                    <StatCard label="Active policies" value={stats.activeLoanPolicies} icon={FileText} accent="zinc" />
                </div>
            </section>

            <section className="mb-6">
                <SectionTitle>Financial summary (Tk)</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
                    <StatCard label="Outstanding (active)" value={stats.totalOutstanding} icon={CircleDollarSign} format="currency" accent="emerald" />
                    <StatCard label="Principal (active)" value={stats.totalPrincipalActive} icon={Wallet} format="currency" accent="teal" />
                    <StatCard label="Recovered (active)" value={stats.totalRecoveredActive} icon={Banknote} format="currency" accent="indigo" />
                    <StatCard label="Total disbursed" value={stats.totalDisbursedAll} icon={Send} format="currency" accent="zinc" />
                    <StatCard label="Collections (this month)" value={stats.collectionsThisMonth} icon={Banknote} format="currency" accent="amber" />
                </div>
            </section>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <section>
                    <SectionTitle>Application pipeline</SectionTitle>
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                        <StatCard label="Pending approval" value={stats.pendingApplications} icon={Clock} accent="amber" />
                        <StatCard label="Approved (awaiting disburse)" value={stats.approvedAwaitingDisburse} icon={FileText} accent="indigo" />
                    </div>
                </section>

                <section>
                    <SectionTitle>Installments & collection</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        <StatCard label="Pending installments" value={stats.pendingInstallments} icon={ListChecks} accent="amber" />
                        <StatCard label="On payroll" value={stats.scheduledInstallments} icon={ListChecks} accent="teal" />
                        <StatCard label="Collection batches" value={stats.collectionBatchesThisMonth} icon={Banknote} accent="emerald" />
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
                            {/* Mobile Card List View */}
                            <div className="p-3 space-y-2.5 sm:hidden">
                                {stats.byLoanType.map((row) => (
                                    <div key={row.loan_type} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-zinc-900">{row.label}</span>
                                            <span className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 font-semibold">Count: {fmtInt(row.loan_count)}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                            <div className="bg-zinc-50 p-2 rounded">
                                                <p className="text-[9px] uppercase font-bold text-zinc-500">Principal</p>
                                                <p className="font-mono font-semibold text-zinc-800 text-[11px]">{fmt(row.principal)}</p>
                                            </div>
                                            <div className="bg-emerald-50 p-2 rounded">
                                                <p className="text-[9px] uppercase font-bold text-emerald-700">Outstanding</p>
                                                <p className="font-mono font-bold text-emerald-800 text-[11px]">{fmt(row.outstanding)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                            <th className="px-4 py-2.5">Loan type</th>
                                            <th className="px-4 py-2.5 text-right">Count</th>
                                            <th className="px-4 py-2.5 text-right">Principal (Tk)</th>
                                            <th className="px-4 py-2.5 text-right">Outstanding (Tk)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.byLoanType.map((row) => (
                                            <tr key={row.loan_type} className="border-b border-zinc-50 last:border-0">
                                                <td className="px-4 py-2.5 font-medium text-zinc-800">{row.label}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">{fmtInt(row.loan_count)}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">{fmt(row.principal)}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-800">{fmt(row.outstanding)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-emerald-50/40 font-semibold text-zinc-900">
                                            <td className="px-4 py-2.5">Total</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(stats.activeLoans)}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">{fmt(stats.totalPrincipalActive)}</td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-emerald-800">{fmt(stats.totalOutstanding)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            )}
        </>
    );

    return (
        <Layout>
            <Head title="Employee Loan Dashboard" />

            <PageSurface className="max-w-7xl bg-zinc-50/40 px-3 py-4 md:px-4 md:py-5">
                <div className="mb-5 border-b border-emerald-100 pb-4">
                    <div className="flex items-center justify-between gap-3">
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
                        <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                            <Link href="/sections">Sections</Link>
                        </Button>
                    </div>
                </div>

                {showEmployeeTab ? (
                    <Tabs value={dashboardMode} onValueChange={(v) => setDashboardMode(v as 'admin' | 'employee')} className="w-full">
                        <TabsList className="mb-4 h-9 w-fit min-w-0 gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm">
                            <TabsTrigger
                                value="admin"
                                className="h-8 min-w-[5.5rem] flex-none rounded-md px-3 text-xs data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                            >
                                Admin
                            </TabsTrigger>
                            <TabsTrigger
                                value="employee"
                                className="h-8 min-w-[5.5rem] flex-none gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                            >
                                <User className="h-3.5 w-3.5" />
                                My loan
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="admin">{adminDashboardBody}</TabsContent>
                        <TabsContent value="employee">
                            {employeeDashboard ? <EmployeeLoanEmployeeDashboardView embedded {...employeeDashboard} /> : null}
                        </TabsContent>
                    </Tabs>
                ) : (
                    adminDashboardBody
                )}
            </PageSurface>
        </Layout>
    );
}
