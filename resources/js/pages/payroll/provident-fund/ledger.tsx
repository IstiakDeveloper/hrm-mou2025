import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    PayrollField,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Pencil, Save, Trash2, Calendar, FileText, Landmark, User, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { formatPfAmount, roundPfAmount } from '@/lib/pf-format';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';

type Tx = {
    id: number;
    transaction_type: string;
    transaction_type_label: string;
    can_correct: boolean;
    payroll_year: number | null;
    payroll_month: number | null;
    payroll_period: string | null;
    transaction_date: string;
    transaction_date_iso: string | null;
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
        label: string;
        status?: string;
        branch: string | null;
        department: string | null;
        pf_balance: number;
        own_contribution: number;
        org_contribution: number;
    };
    filters: { from: string; to: string };
    totals: { employee_contribution: number; employer_contribution: number; credits: number; debits: number };
    transactions: Tx[];
    months: { value: number; label: string }[];
    years: number[];
};

const fmt = formatPfAmount;

const TYPE_OPENING = 'opening_balance';
const TYPE_MANUAL = 'manual';

export default function ProvidentFundLedger({ employee, filters: init, totals, transactions, months, years }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');

    const [range, setRange] = useState({ from: init.from, to: init.to });
    const [editTx, setEditTx] = useState<Tx | null>(null);

    const editForm = useForm({
        employee_amount: '',
        employer_amount: '',
        transaction_date: '',
        year: '',
        month: '',
        reference_no: '',
        notes: '',
    });

    const applyRange = () => {
        router.get(route('provident-fund.ledger', employee.id), range, { preserveState: true });
    };

    const openEdit = (tx: Tx) => {
        setEditTx(tx);
        editForm.setData({
            employee_amount: String(tx.employee_contribution),
            employer_amount: String(tx.employer_contribution),
            transaction_date: tx.transaction_date_iso || '',
            year: tx.payroll_year ? String(tx.payroll_year) : String(new Date().getFullYear()),
            month: tx.payroll_month ? String(tx.payroll_month) : String(new Date().getMonth() + 1),
            reference_no: tx.reference_no || '',
            notes: tx.notes || '',
        });
        editForm.clearErrors();
    };

    const closeEdit = () => {
        setEditTx(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTx) return;

        editForm.put(route('provident-fund.transactions.update', editTx.id), {
            onSuccess: () => closeEdit(),
        });
    };

    const removeTx = (tx: Tx) => {
        const label = tx.transaction_type === TYPE_OPENING ? 'initial PF balance' : 'manual PF entry';
        if (!confirm(`Remove this ${label}? Balance will be recalculated.`)) return;

        router.delete(route('provident-fund.transactions.destroy', tx.id));
    };

    const editTotal =
        roundPfAmount(editForm.data.employee_amount) + roundPfAmount(editForm.data.employer_amount);

    return (
        <StaffFundLayout title={`PF Ledger — ${employee.label}`} activeTab="pf-register" description="Detailed transaction ledger of employee provident fund contributions and interest.">
            {/* Header section with back button and quick stats */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Link
                        href={route('provident-fund.index')}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
                    >
                        <ArrowLeft className="h-3 w-3" /> Back to Register
                    </Link>
                    <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                        <span>{employee.branch || '—'} · {employee.department || '—'}</span>
                        {employee.status && employee.status !== 'active' && employee.status !== 'on_leave' && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 capitalize">
                                {employee.status.replace('_', ' ')}
                            </Badge>
                        )}
                    </div>
                </div>
                {canEdit && (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 font-medium">
                        Initial and manual PF contributions can be modified here.
                    </div>
                )}
            </div>

            {/* KPI Cards & Date Filter - Highly space-efficient grid */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {/* Own Contribution */}
                <div className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-white p-2.5 shadow-2xs hover:border-emerald-100 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Employee Contribution</p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-800">{fmt(employee.own_contribution)}</p>
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                        <User className="h-3.5 w-3.5" />
                    </span>
                </div>

                {/* Organization Contribution */}
                <div className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-white p-2.5 shadow-2xs hover:border-emerald-100 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Org Contribution</p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-800">{fmt(employee.org_contribution)}</p>
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                        <Landmark className="h-3.5 w-3.5" />
                    </span>
                </div>

                {/* Total Balance */}
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/20 p-2.5 shadow-2xs hover:bg-emerald-50/40 transition-colors">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Accumulated Balance</p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-950">{fmt(employee.pf_balance)}</p>
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white shadow-3xs">
                        <Landmark className="h-3.5 w-3.5" />
                    </span>
                </div>

                {/* Date Filter Card - High Density */}
                <div className="rounded-lg border border-zinc-200/80 bg-white p-2 shadow-2xs">
                    <div className="flex items-end gap-1.5 h-full">
                        <div className="flex-1">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Date Range</label>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="date"
                                    value={range.from}
                                    onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                                    className="h-7 text-xs px-1.5 py-0 border-zinc-200 focus-visible:ring-emerald-500 bg-zinc-50 rounded"
                                />
                                <span className="text-[10px] text-zinc-400 font-semibold">—</span>
                                <Input
                                    type="date"
                                    value={range.to}
                                    onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                                    className="h-7 text-xs px-1.5 py-0 border-zinc-200 focus-visible:ring-emerald-500 bg-zinc-50 rounded"
                                />
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={applyRange}
                            className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs px-2.5 rounded font-semibold text-white"
                        >
                            Filter
                        </Button>
                    </div>
                </div>
            </div>

            {/* Transaction Ledger Table Card - Reduced padding & high-density layout */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                    <div>
                        <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Transaction Ledger</CardTitle>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Showing detailed records of additions, withdrawals, and interest postings.
                        </p>
                    </div>
                    {/* Summaries within Header */}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-semibold text-zinc-600">
                        <span>Own: <strong className="text-zinc-800">{fmt(totals.employee_contribution)}</strong></span>
                        <span className="text-zinc-300">|</span>
                        <span>Org: <strong className="text-zinc-800">{fmt(totals.employer_contribution)}</strong></span>
                        <span className="text-zinc-300">|</span>
                        <span className="text-emerald-700">Credits: <strong className="text-emerald-800">{fmt(totals.credits)}</strong></span>
                        <span className="text-zinc-300">|</span>
                        <span className="text-red-700">Debits: <strong className="text-red-800">{fmt(totals.debits)}</strong></span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {transactions.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-zinc-500">No transactions recorded in this period.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50 border-b border-zinc-200/60">
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pl-3">Period</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Date</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Type</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Own Cont.</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Org Cont.</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Credit (In)</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Debit (Out)</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right pr-3">Balance After</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Reference & Notes</TableHead>
                                        {canEdit && <TableHead className="w-16 h-8 py-1 pr-3"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => {
                                        const isDebit = tx.debit_amount > 0;
                                        const isCredit = tx.credit_amount > 0;

                                        return (
                                            <TableRow key={tx.id} className="hover:bg-emerald-50/10 transition-colors border-b border-zinc-100/80 group">
                                                <TableCell className="pl-3 py-1.5 font-medium text-zinc-700">{tx.payroll_period || '—'}</TableCell>
                                                <TableCell className="py-1.5 text-zinc-600 whitespace-nowrap">{tx.transaction_date}</TableCell>
                                                <TableCell className="py-1.5">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[10px] font-medium",
                                                        tx.transaction_type === TYPE_OPENING && "bg-blue-50 text-blue-700 border border-blue-100",
                                                        tx.transaction_type === TYPE_MANUAL && "bg-amber-50 text-amber-700 border border-amber-100",
                                                        tx.transaction_type === 'interest' && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                                                        tx.transaction_type === 'payroll' && "bg-purple-50 text-purple-700 border border-purple-100",
                                                        isDebit && "bg-red-50 text-red-700 border border-red-100"
                                                    )}>
                                                        {tx.transaction_type_label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{tx.employee_contribution > 0 ? fmt(tx.employee_contribution) : '—'}</TableCell>
                                                <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{tx.employer_contribution > 0 ? fmt(tx.employer_contribution) : '—'}</TableCell>
                                                <TableCell className="text-right py-1.5 tabular-nums font-medium text-emerald-600">
                                                    {isCredit ? (
                                                        <span className="inline-flex items-center gap-0.5 justify-end w-full">
                                                            +{fmt(tx.credit_amount)}
                                                            <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" />
                                                        </span>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right py-1.5 tabular-nums font-medium text-red-600">
                                                    {isDebit ? (
                                                        <span className="inline-flex items-center gap-0.5 justify-end w-full">
                                                            -{fmt(tx.debit_amount)}
                                                            <ArrowDownRight className="h-2.5 w-2.5 text-red-500" />
                                                        </span>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right py-1.5 tabular-nums font-semibold text-zinc-800 pr-3">{fmt(tx.balance_after)}</TableCell>
                                                <TableCell className="py-1.5 max-w-[240px] truncate text-zinc-500" title={tx.notes || undefined}>
                                                    {tx.reference_no && (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-600 rounded px-1 py-0.2 mr-1">
                                                            {tx.reference_no}
                                                        </span>
                                                    )}
                                                    {tx.notes || '—'}
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell className="py-1.5 pr-3 text-right">
                                                        {tx.can_correct && (
                                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-transparent hover:border-emerald-100"
                                                                    title="Edit Transaction"
                                                                    onClick={() => openEdit(tx)}
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-600 hover:bg-red-50 hover:text-red-700 rounded border border-transparent hover:border-red-100"
                                                                    title="Remove Entry"
                                                                    onClick={() => removeTx(tx)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog for Edit Transaction - High density grid form */}
            <Dialog open={editTx !== null} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent className="sm:max-w-md p-4 gap-3 border-zinc-200 rounded-lg shadow-lg">
                    <DialogHeader className="gap-0.5">
                        <DialogTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wide">
                            {editTx?.transaction_type === TYPE_OPENING ? 'Edit Initial PF Balance' : 'Edit Manual PF Contribution'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-400">
                            Amounts and dates entered will update the ledger balances automatically.
                        </DialogDescription>
                    </DialogHeader>

                    {editTx && (
                        <form onSubmit={submitEdit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Own Amount (Employee)</label>
                                    <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={editForm.data.employee_amount}
                                        onChange={(e) => editForm.setData('employee_amount', e.target.value)}
                                        className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                        required
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Organization Amount</label>
                                    <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={editForm.data.employer_amount}
                                        onChange={(e) => editForm.setData('employer_amount', e.target.value)}
                                        className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] bg-zinc-50 border border-zinc-100 rounded px-2.5 py-1 text-zinc-600">
                                <span>Total Contribution Amount:</span>
                                <span className="font-bold text-zinc-800 tabular-nums text-xs">{fmt(editTotal)}</span>
                            </div>

                            {editTx.transaction_type === TYPE_OPENING ? (
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">As of Date</label>
                                    <Input
                                        type="date"
                                        value={editForm.data.transaction_date}
                                        onChange={(e) => editForm.setData('transaction_date', e.target.value)}
                                        className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                        required
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2.5">
                                    <PayrollYearSelect
                                        label="Payroll Year"
                                        value={editForm.data.year}
                                        onChange={(v) => editForm.setData('year', v)}
                                        years={years}
                                        required
                                        className="h-8 text-xs"
                                    />
                                    <PayrollMonthSelect
                                        label="Payroll Month"
                                        value={editForm.data.month}
                                        onChange={(v) => editForm.setData('month', v)}
                                        months={months}
                                        required
                                        className="h-8 text-xs"
                                    />
                                </div>
                            )}

                            <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Reference No.</label>
                                <Input
                                    value={editForm.data.reference_no}
                                    onChange={(e) => editForm.setData('reference_no', e.target.value)}
                                    placeholder="e.g. Bank slip, check, voucher #"
                                    className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                />
                            </div>

                            <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Notes & Remarks</label>
                                <Textarea
                                    value={editForm.data.notes}
                                    onChange={(e) => editForm.setData('notes', e.target.value)}
                                    rows={2}
                                    placeholder="Provide description..."
                                    className="text-xs border-zinc-200 focus-visible:ring-emerald-500 resize-none p-2 min-h-[50px]"
                                    required={editTx.transaction_type === TYPE_MANUAL}
                                />
                            </div>

                            {editForm.errors.employee_amount && (
                                <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 font-medium">
                                    {editForm.errors.employee_amount}
                                </p>
                            )}

                            <DialogFooter className="border-t border-zinc-100 pt-2 flex items-center justify-end gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeEdit}
                                    className="h-8 text-xs px-3 rounded"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
                                >
                                    <Save className="mr-1 h-3.5 w-3.5" /> Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </StaffFundLayout>
    );
}
