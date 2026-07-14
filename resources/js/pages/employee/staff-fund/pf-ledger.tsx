import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Landmark, User } from 'lucide-react';
import { formatPfAmount } from '@/lib/pf-format';
import { staffFundEmployeePath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';

type Tx = {
    id: number;
    transaction_type: string;
    transaction_type_label: string;
    payroll_period: string | null;
    transaction_date: string;
    employee_contribution: number;
    employer_contribution: number;
    credit_amount: number;
    debit_amount: number;
    balance_after: number;
    notes: string | null;
    reference_no: string | null;
};

type Props = {
    employee: {
        id: number;
        pin: string | null;
        name_en: string | null;
        label: string;
        branch: string | null;
        department: string | null;
        pf_balance: number;
        pf_enrolled: boolean;
        own_contribution: number;
        org_contribution: number;
    };
    filters: { from: string; to: string };
    totals: { employee_contribution: number; employer_contribution: number; credits: number; debits: number };
    transactions: Tx[];
};

const fmt = formatPfAmount;

export default function EmployeePfLedger({ employee, filters: init, totals, transactions }: Props) {
    const [range, setRange] = useState({ from: init.from, to: init.to });

    const applyRange = () => {
        router.get(route('employee.staff-fund.pf-ledger'), range, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="My PF Ledger" />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={staffFundEmployeePath('/sections/staff-fund')}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Dashboard
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900">My PF Ledger</h1>
                            <p className="text-xs text-zinc-500">
                                {employee.pin && <span className="mr-2 font-mono">{employee.pin}</span>}
                                {employee.name_en || employee.label} · {employee.branch || '—'} · {employee.department || '—'}
                            </p>
                        </div>
                    </div>
                    {!employee.pf_enrolled && (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
                            PF not enrolled
                        </span>
                    )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-white p-2.5 shadow-sm">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">My contribution</p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-800">{fmt(employee.own_contribution)}</p>
                        </div>
                        <User className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-white p-2.5 shadow-sm">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Org contribution</p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-800">{fmt(employee.org_contribution)}</p>
                        </div>
                        <Landmark className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/20 p-2.5 shadow-sm">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Current balance</p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-950">{fmt(employee.pf_balance)}</p>
                        </div>
                        <Landmark className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div className="rounded-lg border border-zinc-200/80 bg-white p-2 shadow-sm">
                        <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">Date range</label>
                        <div className="flex items-end gap-1">
                            <Input
                                type="date"
                                value={range.from}
                                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                                className="h-7 text-xs px-1.5"
                            />
                            <span className="text-[10px] text-zinc-400">—</span>
                            <Input
                                type="date"
                                value={range.to}
                                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                                className="h-7 text-xs px-1.5"
                            />
                            <Button size="sm" onClick={applyRange} className="h-7 bg-emerald-600 text-xs px-2">
                                Filter
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="mt-4 overflow-hidden border-zinc-200/80 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 px-3 py-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-zinc-800">Transactions</CardTitle>
                        <div className="flex flex-wrap gap-x-2 text-[10px] font-semibold text-zinc-600">
                            <span>Own: {fmt(totals.employee_contribution)}</span>
                            <span className="text-zinc-300">|</span>
                            <span>Org: {fmt(totals.employer_contribution)}</span>
                            <span className="text-zinc-300">|</span>
                            <span className="text-emerald-700">Credits: {fmt(totals.credits)}</span>
                            <span className="text-zinc-300">|</span>
                            <span className="text-red-700">Debits: {fmt(totals.debits)}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {transactions.length === 0 ? (
                            <div className="px-4 py-10 text-center text-xs text-zinc-500">No transactions in this period.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-zinc-50/50">
                                            <TableHead className="text-[9px] uppercase">Period</TableHead>
                                            <TableHead className="text-[9px] uppercase">Date</TableHead>
                                            <TableHead className="text-[9px] uppercase">Type</TableHead>
                                            <TableHead className="text-right text-[9px] uppercase">Own</TableHead>
                                            <TableHead className="text-right text-[9px] uppercase">Org</TableHead>
                                            <TableHead className="text-right text-[9px] uppercase">Credit</TableHead>
                                            <TableHead className="text-right text-[9px] uppercase">Debit</TableHead>
                                            <TableHead className="text-right text-[9px] uppercase">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((tx) => {
                                            const isDebit = tx.debit_amount > 0;
                                            const isCredit = tx.credit_amount > 0;
                                            return (
                                                <TableRow key={tx.id} className="border-b border-zinc-100/80">
                                                    <TableCell className="py-1.5">{tx.payroll_period || '—'}</TableCell>
                                                    <TableCell className="py-1.5 whitespace-nowrap">{tx.transaction_date}</TableCell>
                                                    <TableCell className="py-1.5">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded px-1 py-0.5 text-[10px] font-medium',
                                                                tx.transaction_type === 'interest' && 'bg-emerald-50 text-emerald-700',
                                                                tx.transaction_type === 'payroll' && 'bg-purple-50 text-purple-700',
                                                                isDebit && 'bg-red-50 text-red-700',
                                                            )}
                                                        >
                                                            {tx.transaction_type_label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right py-1.5 tabular-nums">
                                                        {tx.employee_contribution > 0 ? fmt(tx.employee_contribution) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right py-1.5 tabular-nums">
                                                        {tx.employer_contribution > 0 ? fmt(tx.employer_contribution) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right py-1.5 tabular-nums text-emerald-600">
                                                        {isCredit ? (
                                                            <span className="inline-flex items-center gap-0.5 justify-end">
                                                                +{fmt(tx.credit_amount)}
                                                                <ArrowUpRight className="h-2.5 w-2.5" />
                                                            </span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right py-1.5 tabular-nums text-red-600">
                                                        {isDebit ? (
                                                            <span className="inline-flex items-center gap-0.5 justify-end">
                                                                -{fmt(tx.debit_amount)}
                                                                <ArrowDownRight className="h-2.5 w-2.5" />
                                                            </span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right py-1.5 tabular-nums font-semibold">{fmt(tx.balance_after)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
