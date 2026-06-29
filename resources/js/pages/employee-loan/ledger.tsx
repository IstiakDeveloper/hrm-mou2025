import React, { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PayrollField, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

type Tx = {
    id: number;
    transaction_type: string;
    transaction_type_label: string;
    can_correct: boolean;
    debit_amount: number;
    credit_amount: number;
    balance_after: number;
    amount: number;
    transaction_date: string | null;
    transaction_date_iso: string | null;
    payroll_year: number | null;
    payroll_month: number | null;
    payroll_period: string | null;
    notes: string | null;
    reference_no: string | null;
};

type HeaderRow = { label: string; value: string | number | null | undefined };

type Props = {
    loan: {
        id: number;
        loan_number: string;
        loan_type_label: string;
        status: string;
        outstanding_balance: number;
        principal_amount: number;
        service_charge_amount: number;
        total_payable: number;
        interest_rate: number;
        installment_count: number;
        disbursement_date: string | null;
        first_installment_date: string | null;
        last_installment_date: string | null;
        loan_close_date: string | null;
        rebate_amount: number;
        policy: { code: string; name: string; label: string } | null;
        loan_cycle: number;
        application_number: string | null;
        employee: {
            id: number;
            pin: string | null;
            name: string | null;
            label: string;
            department: string | null;
            designation: string | null;
            program: string | null;
            unit: string | null;
            project: string | null;
            branch: string | null;
        };
    };
    transactions: Tx[];
    months: { value: number; label: string }[];
    years: number[];
};

const fmt = fmtLoanAmount;

const display = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
};

function LedgerHeaderTable({ rows }: { rows: HeaderRow[] }) {
    return (
        <table className="w-full border-collapse text-xs">
            <tbody>
                {rows.map((row) => (
                    <tr key={row.label} className="border border-zinc-300">
                        <td className="w-[42%] border border-zinc-300 bg-zinc-100 px-2 py-1 font-medium text-zinc-700">
                            {row.label}
                        </td>
                        <td className="border border-zinc-300 bg-white px-2 py-1 text-zinc-900">
                            {display(row.value)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function EmployeeLoanLedger({ loan, transactions, months, years }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [editTx, setEditTx] = useState<Tx | null>(null);

    const paymentForm = useForm({
        amount: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        reference_no: '',
        notes: '',
    });

    const editForm = useForm({
        amount: '',
        transaction_date: '',
        year: '',
        month: '',
        reference_no: '',
        notes: '',
    });

    const employeeRows: HeaderRow[] = [
        { label: 'Employee Id', value: loan.employee.pin },
        { label: 'Employee Name', value: loan.employee.name },
        { label: 'Department', value: loan.employee.department },
        { label: 'Designation', value: loan.employee.designation },
        { label: 'Program', value: loan.employee.program },
        { label: 'Unit', value: loan.employee.unit ?? 'N/A' },
        { label: 'Project', value: loan.employee.project },
    ];

    const policyRows: HeaderRow[] = [
        { label: 'Policy', value: loan.policy?.label },
        { label: 'Loan Cycle', value: loan.loan_cycle },
        { label: 'Application No', value: loan.application_number },
        { label: 'Rate', value: loan.interest_rate },
        { label: 'Total Install', value: loan.installment_count },
        { label: 'Install Start Date', value: loan.first_installment_date },
        { label: 'Install End Date', value: loan.last_installment_date },
    ];

    const financialRows: HeaderRow[] = [
        { label: 'Disburse Date', value: loan.disbursement_date },
        { label: 'Disburse Branch', value: loan.employee.branch },
        { label: 'Loan Amount (PR)', value: fmt(loan.principal_amount) },
        { label: 'Loan Amount (SC)', value: fmt(loan.service_charge_amount) },
        { label: 'Loan Amount (Total)', value: fmt(loan.total_payable) },
        { label: 'Rebate Amt', value: fmt(loan.rebate_amount) },
        { label: 'Loan Close Date', value: loan.loan_close_date },
    ];

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post(route('employee-loans.manual-payment.store', loan.id), {
            onSuccess: () => {
                setPaymentOpen(false);
                paymentForm.reset();
            },
        });
    };

    const openEdit = (tx: Tx) => {
        setEditTx(tx);
        editForm.setData({
            amount: String(tx.amount),
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

        editForm.put(route('employee-loans.transactions.update', editTx.id), {
            onSuccess: () => closeEdit(),
        });
    };

    const deleteTx = (tx: Tx) => {
        if (!confirm('Remove this ledger entry? Balances will be recalculated.')) return;
        router.delete(route('employee-loans.transactions.destroy', tx.id));
    };

    return (
        <EmployeeLoanLayout title={`Ledger — ${loan.loan_number}`} activeTab="register">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Link
                    href={employeeLoanPath(route('employee-loans.show', loan.id))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-amber-700"
                >
                    <ArrowLeft className="h-3 w-3" /> Loan details
                </Link>
                {canEdit && loan.status === 'active' && (
                    <Button size="sm" className="h-7 bg-amber-600 hover:bg-amber-700 text-xs" onClick={() => setPaymentOpen(true)}>
                        <Plus className="mr-1 h-3 w-3" /> Manual payment
                    </Button>
                )}
            </div>

            <div className="mb-3 grid gap-3 lg:grid-cols-3">
                <LedgerHeaderTable rows={employeeRows} />
                <LedgerHeaderTable rows={policyRows} />
                <LedgerHeaderTable rows={financialRows} />
            </div>

            <Card className="mb-3 border-amber-200 bg-amber-50/20 shadow-2xs">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase text-amber-800">Outstanding balance</p>
                        <p className="text-xl font-bold tabular-nums text-amber-900">{fmt(loan.outstanding_balance)}</p>
                        <p className="text-xs text-zinc-500">{loan.employee.label} · {loan.loan_type_label}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Period</TableHead>
                            <TableHead className="text-xs text-right">Debit</TableHead>
                            <TableHead className="text-xs text-right">Credit</TableHead>
                            <TableHead className="text-xs text-right">Balance</TableHead>
                            <TableHead className="text-xs">Notes</TableHead>
                            {canEdit && <TableHead className="text-xs w-20" />}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 8 : 7} className="py-8 text-center text-sm text-zinc-500">
                                    No ledger entries yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="text-xs">{tx.transaction_date}</TableCell>
                                    <TableCell className="text-xs font-medium">{tx.transaction_type_label}</TableCell>
                                    <TableCell className="text-xs text-zinc-500">{tx.payroll_period || '—'}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">
                                        {tx.debit_amount > 0 ? (
                                            <span className="inline-flex items-center gap-0.5 text-red-700">
                                                <ArrowUpRight className="h-3 w-3" /> {fmt(tx.debit_amount)}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">
                                        {tx.credit_amount > 0 ? (
                                            <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                                <ArrowDownRight className="h-3 w-3" /> {fmt(tx.credit_amount)}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-semibold tabular-nums">
                                        {fmt(tx.balance_after)}
                                    </TableCell>
                                    <TableCell className="text-xs text-zinc-500 max-w-[200px] truncate">
                                        {tx.notes || tx.reference_no || '—'}
                                    </TableCell>
                                    {canEdit && (
                                        <TableCell className="text-right">
                                            {tx.can_correct && (
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={() => openEdit(tx)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-red-600 hover:text-red-700"
                                                        onClick={() => deleteTx(tx)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record manual payment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPayment} className="space-y-3">
                        <PayrollField label="Amount (৳)" error={paymentForm.errors.amount}>
                            <Input
                                type="number"
                                min="1"
                                step="0.01"
                                value={paymentForm.data.amount}
                                onChange={(e) => paymentForm.setData('amount', e.target.value)}
                            />
                        </PayrollField>
                        <PayrollField label="Payment date" error={paymentForm.errors.transaction_date}>
                            <Input
                                type="date"
                                value={paymentForm.data.transaction_date}
                                onChange={(e) => paymentForm.setData('transaction_date', e.target.value)}
                            />
                        </PayrollField>
                        <PayrollField label="Reference">
                            <Input
                                value={paymentForm.data.reference_no}
                                onChange={(e) => paymentForm.setData('reference_no', e.target.value)}
                            />
                        </PayrollField>
                        <PayrollField label="Notes" error={paymentForm.errors.notes}>
                            <Textarea
                                value={paymentForm.data.notes}
                                onChange={(e) => paymentForm.setData('notes', e.target.value)}
                            />
                        </PayrollField>
                        <DialogFooter>
                            <Button type="submit" disabled={paymentForm.processing}>
                                <Save className="mr-2 h-4 w-4" />
                                Save payment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editTx} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit ledger entry</DialogTitle>
                    </DialogHeader>
                    {editTx && (
                        <form onSubmit={submitEdit} className="space-y-3">
                            <PayrollField label="Amount (৳)" error={editForm.errors.amount}>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={editForm.data.amount}
                                    onChange={(e) => editForm.setData('amount', e.target.value)}
                                />
                            </PayrollField>
                            <PayrollField label="Transaction date" error={editForm.errors.transaction_date}>
                                <Input
                                    type="date"
                                    value={editForm.data.transaction_date}
                                    onChange={(e) => editForm.setData('transaction_date', e.target.value)}
                                />
                            </PayrollField>
                            {editTx.transaction_type === 'legacy_payment' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <PayrollField label="Payroll year">
                                        <PayrollYearSelect
                                            years={years}
                                            value={editForm.data.year}
                                            onChange={(v) => editForm.setData('year', v)}
                                        />
                                    </PayrollField>
                                    <PayrollField label="Payroll month">
                                        <PayrollMonthSelect
                                            months={months}
                                            value={editForm.data.month}
                                            onChange={(v) => editForm.setData('month', v)}
                                        />
                                    </PayrollField>
                                </div>
                            )}
                            <PayrollField label="Reference">
                                <Input
                                    value={editForm.data.reference_no}
                                    onChange={(e) => editForm.setData('reference_no', e.target.value)}
                                />
                            </PayrollField>
                            <PayrollField label="Notes" error={editForm.errors.notes}>
                                <Textarea
                                    value={editForm.data.notes}
                                    onChange={(e) => editForm.setData('notes', e.target.value)}
                                />
                            </PayrollField>
                            <DialogFooter>
                                <Button type="submit" disabled={editForm.processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </EmployeeLoanLayout>
    );
}
