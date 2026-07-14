import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, BookOpen, CalendarClock, HandCoins, ReceiptText, UserRound, Wallet } from 'lucide-react';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';
import { fmtLoanAmount } from '@/lib/employee-loan-format';

type LoanCard = {
    id: number;
    loan_number: string;
    loan_type_label: string;
    policy_name: string | null;
    principal_amount: number;
    service_charge_amount: number;
    total_payable: number;
    installment_amount: number;
    outstanding_balance: number;
    outstanding_principal: number;
    outstanding_service_charge: number;
    installment_count: number;
    paid_installments: number;
    next_due_date: string | null;
    status: string;
    disbursement_date: string | null;
};

type TransactionRow = {
    id: number;
    loan_id: number;
    loan_number: string | null;
    loan_type_label: string | null;
    transaction_type: string;
    transaction_type_label: string;
    debit_amount: number;
    credit_amount: number;
    balance_after: number;
    transaction_date: string | null;
    notes: string | null;
    reference_no: string | null;
};

export type EmployeeLoanEmployeeDashboardProps = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
        designation?: { name?: string } | null;
        department?: { name?: string } | null;
        branch?: { name?: string } | null;
    };
    summary: {
        total_loans: number;
        active_loans: number;
        completed_loans: number;
        total_outstanding: number;
        total_principal: number;
        total_service_charge: number;
        total_recovered: number;
        outstanding_principal: number;
        outstanding_service_charge: number;
        recovered_principal: number;
        recovered_service_charge: number;
    };
    nextInstallment: {
        loan_id: number;
        loan_number: string;
        loan_type_label: string;
        installment_no: number;
        installment_count: number;
        due_date: string | null;
        amount: number;
        status: string;
    } | null;
    recentRecovery: {
        loan_id: number;
        loan_number: string | null;
        transaction_type: string;
        transaction_type_label: string;
        amount: number;
        transaction_date: string | null;
    } | null;
    activeLoanCards: LoanCard[];
    recentTransactions: TransactionRow[];
};

type ViewProps = EmployeeLoanEmployeeDashboardProps & {
    embedded?: boolean;
};

const fmt = fmtLoanAmount;

export function EmployeeLoanEmployeeDashboardView({
    employee,
    summary,
    nextInstallment,
    recentRecovery,
    activeLoanCards,
    recentTransactions,
    embedded = false,
}: ViewProps) {
    const { auth } = usePage().props as { auth?: { user?: { name?: string } } };

    const dashboardBody = (
        <>
            <Card className="overflow-hidden border-zinc-200/90 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_35%),linear-gradient(to_bottom,_#ffffff,_#fffaf1)] shadow-sm">
                <CardContent className="space-y-5 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                                <HandCoins className="h-3.5 w-3.5" />
                                Loan overview
                            </p>
                            <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">My Loan Dashboard</h1>
                            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                                Active loans, upcoming installment, outstanding balance, and recent payroll deductions in one place.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">
                                    <UserRound className="h-3.5 w-3.5 text-zinc-400" />
                                    {auth?.user?.name ?? employee.name_en ?? '—'}
                                </span>
                                {employee.pin && <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-zinc-700">{employee.pin}</span>}
                                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">{employee.designation?.name || 'Employee'}</span>
                                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700">{employee.department?.name || 'Department'}</span>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm" className="h-9 px-3 text-xs">
                                <Link href="/sections">Sections</Link>
                            </Button>
                            <Button asChild size="sm" className="h-9 bg-amber-600 px-3 text-xs hover:bg-amber-700">
                                <Link href={employeeLoanEmployeePath('/employee/loan')}>My loans</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                        <MetricCard label="Total outstanding" value={summary.total_outstanding} tone="amber" />
                        <MetricCard label="Out. PR" value={summary.outstanding_principal} tone="slate" />
                        <MetricCard label="Out. SC" value={summary.outstanding_service_charge} tone="slate" />
                        <MetricCard label="Total principal" value={summary.total_principal} tone="slate" />
                        <MetricCard label="Total SC" value={summary.total_service_charge} tone="slate" />
                        <MetricCard label="Recovered so far" value={summary.total_recovered} tone="emerald" />
                    </div>
                </CardContent>
            </Card>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                    <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4 sm:px-5">
                            <CardTitle className="text-base font-semibold text-zinc-950">Active loans</CardTitle>
                            <CardDescription className="text-xs">Your current loan accounts with progress and next due date.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4 sm:p-5">
                            {activeLoanCards.length > 0 ? (
                                activeLoanCards.map((loan) => (
                                    <div key={loan.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-zinc-950">{loan.loan_type_label}</h3>
                                                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                                                        {loan.loan_number}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {loan.policy_name || 'Policy not assigned'}
                                                    {loan.disbursement_date ? ` · Disbursed ${loan.disbursement_date}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                                                    <Link href={employeeLoanEmployeePath(`/employee/loan/${loan.id}`)}>Details</Link>
                                                </Button>
                                                <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                                                    <Link href={employeeLoanEmployeePath(`/employee/loan/${loan.id}/ledger`)}>Ledger</Link>
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                                            <MiniMetric label="Out. PR" value={fmt(loan.outstanding_principal)} accent="text-zinc-900" />
                                            <MiniMetric label="Out. SC" value={fmt(loan.outstanding_service_charge)} accent="text-violet-900" />
                                            <MiniMetric label="Outstanding" value={fmt(loan.outstanding_balance)} accent="text-amber-800" />
                                            <MiniMetric label="PR" value={fmt(loan.principal_amount)} accent="text-zinc-900" />
                                            <MiniMetric label="SC" value={fmt(loan.service_charge_amount)} accent="text-violet-900" />
                                            <MiniMetric label="Progress" value={`${loan.paid_installments}/${loan.installment_count}`} accent="text-zinc-900" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-600">
                                    No active loans found.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4">
                            <CardTitle className="text-sm font-semibold text-zinc-950">Recent loan transactions</CardTitle>
                            <CardDescription className="text-xs">Latest loan deductions, manual payments, or adjustments.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3">
                            {recentTransactions.length > 0 ? (
                                <div className="space-y-2">
                                    {recentTransactions.map((tx) => (
                                        <Link
                                            key={tx.id}
                                            href={employeeLoanEmployeePath(`/employee/loan/${tx.loan_id}/ledger`)}
                                            className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-amber-200 hover:bg-amber-50/30"
                                        >
                                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                                <ReceiptText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-zinc-900 group-hover:text-amber-900">{tx.transaction_type_label}</p>
                                                <p className="text-[11px] text-zinc-500">
                                                    {tx.loan_number || 'Loan'}
                                                    {tx.transaction_date ? ` · ${tx.transaction_date}` : ''}
                                                </p>
                                                {(tx.notes || tx.reference_no) && (
                                                    <p className="mt-1 truncate text-[11px] text-zinc-500">{tx.notes || tx.reference_no}</p>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className={`text-sm font-bold tabular-nums ${tx.credit_amount > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                    {fmt(tx.credit_amount > 0 ? tx.credit_amount : tx.debit_amount)}
                                                </p>
                                                <p className="text-[10px] text-zinc-500">Balance {fmt(tx.balance_after)}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-600">
                                    No recent loan transactions yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4">
                            <CardTitle className="text-sm font-semibold text-zinc-950">Loan snapshot</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4">
                            <SnapshotRow label="Total loans" value={String(summary.total_loans)} />
                            <SnapshotRow label="Active loans" value={String(summary.active_loans)} />
                            <SnapshotRow label="Completed loans" value={String(summary.completed_loans)} />
                            <SnapshotRow label="Total outstanding" value={fmt(summary.total_outstanding)} strong />
                            <SnapshotRow label="Outstanding PR" value={fmt(summary.outstanding_principal)} />
                            <SnapshotRow label="Outstanding SC" value={fmt(summary.outstanding_service_charge)} />
                            <SnapshotRow label="Recovered PR" value={fmt(summary.recovered_principal)} />
                            <SnapshotRow label="Recovered SC" value={fmt(summary.recovered_service_charge)} />
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4">
                            <div className="flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 text-amber-600" />
                                <CardTitle className="text-sm font-semibold text-zinc-950">Next installment</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {nextInstallment ? (
                                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                                    <p className="text-sm font-semibold text-zinc-950">{nextInstallment.loan_type_label}</p>
                                    <p className="text-xs text-zinc-600">
                                        {nextInstallment.loan_number} · Installment {nextInstallment.installment_no}/{nextInstallment.installment_count}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <MiniMetric label="Due date" value={nextInstallment.due_date || '—'} accent="text-zinc-900" />
                                        <MiniMetric label="Amount" value={fmt(nextInstallment.amount)} accent="text-amber-800" />
                                    </div>
                                    <Button asChild className="h-9 w-full bg-amber-600 text-xs hover:bg-amber-700">
                                        <Link href={employeeLoanEmployeePath(`/employee/loan/${nextInstallment.loan_id}`)}>Open loan details</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-600">
                                    No pending installment right now.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-emerald-600" />
                                <CardTitle className="text-sm font-semibold text-zinc-950">Latest recovery</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {recentRecovery ? (
                                <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                                    <p className="text-sm font-semibold text-zinc-950">{recentRecovery.transaction_type_label}</p>
                                    <p className="text-xl font-bold tabular-nums text-emerald-800">{fmt(recentRecovery.amount)}</p>
                                    <p className="text-xs text-zinc-600">
                                        {recentRecovery.loan_number || 'Loan'}
                                        {recentRecovery.transaction_date ? ` · ${recentRecovery.transaction_date}` : ''}
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-600">
                                    No recovery recorded yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Button asChild variant="outline" className="h-11 w-full justify-between rounded-xl border-zinc-200 bg-white px-4 text-sm font-medium">
                        <Link href={employeeLoanEmployeePath('/employee/loan')}>
                            <span className="inline-flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-amber-600" />
                                View all my loans
                            </span>
                            <ArrowUpRight className="h-4 w-4 text-amber-600" />
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
            <Head title="My Loan Dashboard" />
            <PageSurface className="px-3 sm:px-4">{dashboardBody}</PageSurface>
        </Layout>
    );
}

export default function EmployeeLoanEmployeeDashboard(props: EmployeeLoanEmployeeDashboardProps) {
    return <EmployeeLoanEmployeeDashboardView {...props} />;
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'amber' | 'emerald' }) {
    const toneClass = {
        slate: 'border-zinc-200 bg-white text-zinc-950',
        amber: 'border-amber-200 bg-amber-50/70 text-amber-950',
        emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
    }[tone];

    return (
        <div className={`rounded-2xl border p-4 ${toneClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums">{fmt(value)}</p>
        </div>
    );
}

function MiniMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <div className="rounded-xl bg-white/80 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className={`mt-1 text-sm font-semibold ${accent}`}>{value}</p>
        </div>
    );
}

function SnapshotRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${strong ? 'bg-amber-50 text-amber-950' : 'bg-zinc-50/70 text-zinc-800'}`}>
            <span className="text-sm">{label}</span>
            <span className={`font-mono text-sm tabular-nums ${strong ? 'font-bold' : 'font-semibold'}`}>{value}</span>
        </div>
    );
}
