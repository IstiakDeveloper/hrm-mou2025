import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowUpRight,
    ChevronRight,
    Coins,
    Gift,
    Landmark,
    PiggyBank,
    UserRound,
    Wallet,
} from 'lucide-react';
import { formatPfAmount } from '@/lib/pf-format';
import { formatTakaWhole } from '@/lib/taka-format';
import { staffFundEmployeePath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';

type PfTransaction = {
    id: number;
    transaction_type: string;
    transaction_date: string;
    credit_amount: number;
    debit_amount: number;
    balance_after: number;
};

type GratuityPayment = {
    id: number;
    service_end_date: string | null;
    gratuity_amount: number;
    status: string;
    payment_date: string | null;
};

export type StaffFundEmployeeDashboardProps = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
        department?: { name?: string } | null;
        branch?: { name?: string } | null;
    };
    pf: {
        enrolled: boolean;
        balance: number;
        own_contribution: number;
        org_contribution: number;
        employee_percent: number;
        employer_percent: number;
        recent_transactions: PfTransaction[];
    };
    gratuity: {
        in_scope: boolean;
        calculation: {
            completed_years: number;
            basic_salary: number;
            basic_multiplier: number;
            gratuity_amount: number;
            eligible: boolean;
            label: string;
            service_start: string | null;
            service_end: string;
        };
        recent_payments: GratuityPayment[];
    };
};

type ViewProps = StaffFundEmployeeDashboardProps & {
    embedded?: boolean;
};

const fmtPf = formatPfAmount;
const fmtTk = formatTakaWhole;

function paymentStatusClass(status: string): string {
    const s = String(status).toLowerCase();
    if (s === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    if (s === 'approved') return 'border-blue-200 bg-blue-50 text-blue-900';
    if (s === 'calculated') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-zinc-200 bg-zinc-50 text-zinc-800';
}

export function StaffFundEmployeeDashboardView({
    employee,
    pf,
    gratuity,
    embedded = false,
}: ViewProps) {
    const { auth } = usePage().props as { auth?: { user?: { name?: string } } };
    const calc = gratuity.calculation;

    const dashboardBody = (
        <>
            <Card className="overflow-hidden border-zinc-200/90 border-t-3 border-t-cyan-500 bg-gradient-to-b from-white to-cyan-50/20 shadow-xs">
                <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900">
                                    My Staff Fund
                                </h1>
                                <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-[10px] text-cyan-800 font-semibold px-2 py-0.5">
                                    My Account
                                </Badge>
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-500">
                                <UserRound className="inline h-3.5 w-3.5 text-zinc-400" />
                                <span className="font-semibold text-zinc-800">{auth?.user?.name ?? '—'}</span>
                                {employee.pin && (
                                    <>
                                        <span className="text-zinc-300">·</span>
                                        <span className="font-mono text-zinc-600 font-medium">{employee.pin}</span>
                                    </>
                                )}
                                {employee?.department?.name && (
                                    <>
                                        <span className="text-zinc-300">·</span>
                                        <span className="truncate text-zinc-600">{employee.department.name}</span>
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-2 sm:justify-end">
                            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs bg-white">
                                <Link href="/sections">Sections</Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-3 sm:px-5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                                    <Landmark className="h-4 w-4 text-emerald-600" />
                                    Provident Fund (PF)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {pf.enrolled ? 'Enrolled' : 'Not enrolled'} · {pf.employee_percent}% employee + {pf.employer_percent}% employer
                                </CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                <Link href={staffFundEmployeePath('/employee/staff-fund/pf-ledger')}>
                                    Ledger <ArrowUpRight className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-2.5 shadow-2xs">
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-emerald-800 truncate">Balance</p>
                                <p className="mt-0.5 font-mono text-xs sm:text-lg font-bold tabular-nums text-emerald-900 truncate">{fmtPf(pf.balance)}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-2xs">
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-zinc-500 truncate">My contribution</p>
                                <p className="mt-0.5 font-mono text-xs sm:text-base font-bold tabular-nums text-zinc-900 truncate">{fmtPf(pf.own_contribution)}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-2xs">
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-zinc-500 truncate">Org contribution</p>
                                <p className="mt-0.5 font-mono text-xs sm:text-base font-bold tabular-nums text-zinc-900 truncate">{fmtPf(pf.org_contribution)}</p>
                            </div>
                        </div>

                        {pf.recent_transactions.length > 0 ? (
                            <div className="mt-4 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Recent transactions</p>
                                {pf.recent_transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-xs"
                                    >
                                        <div>
                                            <p className="font-medium text-zinc-800">{tx.transaction_date}</p>
                                            <p className="text-[10px] text-zinc-500 capitalize">{tx.transaction_type.replace(/_/g, ' ')}</p>
                                        </div>
                                        <div className="text-right">
                                            {tx.credit_amount > 0 && (
                                                <p className="font-semibold text-emerald-700">+{fmtPf(tx.credit_amount)}</p>
                                            )}
                                            {tx.debit_amount > 0 && (
                                                <p className="font-semibold text-red-600">-{fmtPf(tx.debit_amount)}</p>
                                            )}
                                            <p className="text-[10px] text-zinc-500">Bal {fmtPf(tx.balance_after)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-500">
                                No PF transactions recorded yet.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-indigo-100 bg-indigo-50/50 px-4 py-3 sm:px-5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                                    <Gift className="h-4 w-4 text-indigo-600" />
                                    Gratuity
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {calc.eligible ? calc.label : calc.label || 'Entitlement estimate'}
                                </CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                <Link href={staffFundEmployeePath('/employee/staff-fund/gratuity')}>
                                    Ledger <ArrowUpRight className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                        {gratuity.in_scope ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <div className="rounded-lg border border-zinc-100 bg-white p-3 shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Service years</p>
                                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-zinc-900">{calc.completed_years}</p>
                                </div>
                                <div className="rounded-lg border border-zinc-100 bg-white p-3 shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Multiplier</p>
                                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-zinc-900">×{calc.basic_multiplier}</p>
                                </div>
                                <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-3 shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Estimated amount</p>
                                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-indigo-900">{fmtTk(calc.gratuity_amount)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-600">
                                {calc.label}
                            </div>
                        )}

                        {gratuity.recent_payments.length > 0 ? (
                            <div className="mt-4 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Payment history</p>
                                {gratuity.recent_payments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-xs"
                                    >
                                        <div>
                                            <p className="font-medium text-zinc-800">{p.service_end_date ?? '—'}</p>
                                            <p className="text-[10px] text-zinc-500">{p.payment_date ? `Paid ${p.payment_date}` : 'Not paid yet'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold tabular-nums text-zinc-900">{fmtTk(p.gratuity_amount)}</span>
                                            <Badge variant="outline" className={cn('text-[10px] capitalize', paymentStatusClass(p.status))}>
                                                {p.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : gratuity.in_scope ? (
                            <p className="mt-4 rounded-lg border border-dashed border-zinc-200 py-4 text-center text-xs text-zinc-500">
                                No gratuity payments recorded yet.
                            </p>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-4 border-zinc-200/90 shadow-sm">
                <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                    <CardTitle className="text-sm font-semibold text-zinc-900">Quick links</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                    <Button asChild variant="outline" size="sm" className="h-10 justify-between rounded-lg px-3 text-xs font-medium">
                        <Link href={staffFundEmployeePath('/employee/staff-fund/pf-ledger')}>
                            <span className="inline-flex items-center gap-2">
                                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                                PF Ledger
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-emerald-600" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-10 justify-between rounded-lg px-3 text-xs font-medium">
                        <Link href={staffFundEmployeePath('/employee/staff-fund/gratuity')}>
                            <span className="inline-flex items-center gap-2">
                                <PiggyBank className="h-3.5 w-3.5 text-indigo-600" />
                                Gratuity Ledger
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-indigo-600" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </>
    );

    if (embedded) {
        return dashboardBody;
    }

    return (
        <Layout>
            <Head title="My Staff Fund" />
            <PageSurface className="px-3 sm:px-4">{dashboardBody}</PageSurface>
        </Layout>
    );
}

export default function StaffFundEmployeeDashboard(props: StaffFundEmployeeDashboardProps) {
    return <StaffFundEmployeeDashboardView {...props} />;
}
