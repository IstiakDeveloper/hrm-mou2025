import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollEmployeeSelect, PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { ArrowLeft, BookOpen, Save, Search, Wallet, X } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { staffFundPath } from '@/lib/staff-fund-nav';
import type { SharedData } from '@/types';
import { cn } from '@/lib/utils';

type PfEmployee = {
    id: number;
    pin: string | null;
    name_en: string | null;
    label: string;
    pf_balance: number;
    branch: string | null;
};

type Record = {
    id: number;
    employee_id: number;
    employee_label: string;
    transaction_date: string;
    debit_amount: number;
    own_amount: number;
    org_amount: number;
    reference_no: string | null;
    notes: string | null;
};

type Props = {
    filters: { search: string };
    records: Record[];
    pfEmployees: PfEmployee[];
    payableEmployeeCount: number;
    preselectEmployeeId: string;
};

const fmt = (n: number) =>
    Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function splitWholeTaka(amount: number) {
    const total = Math.max(0, Math.round(amount));
    const own = Math.round(total / 2);
    const org = total - own;
    return { total, own, org };
}

export default function ProvidentFundWithdrawals({
    filters: init,
    records,
    pfEmployees,
    payableEmployeeCount,
    preselectEmployeeId,
}: Props) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string } }>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');

    const [search, setSearch] = useState(init.search || '');

    const payForm = useForm({
        employee_id: preselectEmployeeId || '',
        amount: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        reference_no: '',
        notes: '',
    });

    useEffect(() => {
        if (preselectEmployeeId && !payForm.data.employee_id) {
            payForm.setData('employee_id', preselectEmployeeId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preselectEmployeeId]);

    const selected = useMemo(
        () => pfEmployees.find((e) => String(e.id) === payForm.data.employee_id) ?? null,
        [pfEmployees, payForm.data.employee_id],
    );

    const balance = selected?.pf_balance ?? 0;

    const splitPreview = useMemo(() => splitWholeTaka(parseFloat(payForm.data.amount) || 0), [payForm.data.amount]);

    const amountNum = parseFloat(payForm.data.amount) || 0;
    const amountInvalid = selected && amountNum > 0 && amountNum > balance;
    const canSubmit =
        canEdit &&
        selected &&
        balance > 0 &&
        amountNum >= 1 &&
        amountNum <= balance &&
        payForm.data.notes.trim() !== '' &&
        payForm.data.transaction_date !== '';

    const applySearch = () => {
        router.get(route('provident-fund.withdrawals.index'), { search }, { preserveState: true, replace: true });
    };

    const setFullBalance = () => {
        if (selected && balance > 0) {
            payForm.setData('amount', String(Math.round(balance)));
        }
    };

    const submitPay = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        payForm.post(route('provident-fund.withdrawals.store'), {
            preserveScroll: true,
            onSuccess: () => {
                payForm.reset();
                payForm.setData('transaction_date', new Date().toISOString().slice(0, 10));
            },
        });
    };

    return (
        <StaffFundLayout title="PF Withdrawals" activeTab="pf-withdrawal" description="Disburse employee provident fund balances, automatically splitting debit equally between employee and employer shares.">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Link
                        href={staffFundPath('/provident-fund')}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
                    >
                        <ArrowLeft className="h-3 w-3" /> Back to Register
                    </Link>
                </div>
            </div>

            {flash?.success && (
                <div className="rounded-md border border-emerald-250 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 mb-3">
                    {flash.success}
                </div>
            )}

            {canEdit && (
                <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg mb-3">
                    <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50">
                        <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Record PF Payment / Withdrawal</CardTitle>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            {payableEmployeeCount} employee(s) with PF balance currently eligible for withdrawal payouts.
                        </p>
                    </CardHeader>
                    <CardContent className="p-3">
                        {pfEmployees.length === 0 ? (
                            <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-100 rounded px-2.5 py-1.5">
                                No PF-enrolled employees found. Enroll employees in PF from the register first.
                            </p>
                        ) : (
                            <form onSubmit={submitPay} className="space-y-3">
                                <div className="grid gap-3 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <PayrollEmployeeSelect
                                            label="Employee"
                                            value={payForm.data.employee_id}
                                            onChange={(v) => {
                                                payForm.setData({
                                                    ...payForm.data,
                                                    employee_id: v,
                                                    amount: '',
                                                });
                                                payForm.clearErrors();
                                            }}
                                            employees={pfEmployees}
                                            required
                                            allowAll={false}
                                            showPfBalance
                                            disableZeroPfBalance
                                        />
                                    </div>
                                    {selected ? (
                                        <div className="rounded-md border border-zinc-200 bg-zinc-50/50 p-2.5 flex flex-col justify-center">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Available PF Balance</p>
                                            <p className="text-lg font-black tabular-nums text-zinc-800 mt-0.5">৳ {fmt(balance)}</p>
                                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5 line-clamp-1">{selected.label}</p>
                                            {selected.branch && (
                                                <p className="text-[9px] text-zinc-400 line-clamp-1">{selected.branch}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center rounded-md border border-dashed border-zinc-250 bg-zinc-50/20 p-2.5 text-center text-xs text-zinc-400">
                                            Select employee to view current balance details.
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2.5 sm:grid-cols-3">
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Payment Amount (৳)</label>
                                        <div className="flex gap-1">
                                            <Input
                                                type="number"
                                                step="1"
                                                min="1"
                                                max={balance > 0 ? balance : undefined}
                                                value={payForm.data.amount}
                                                onChange={(e) => payForm.setData('amount', e.target.value)}
                                                disabled={!selected || balance <= 0}
                                                className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white tabular-nums w-full"
                                                required
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs shrink-0 px-2.5 rounded border-zinc-200 bg-white"
                                                disabled={!selected || balance <= 0}
                                                onClick={setFullBalance}
                                            >
                                                Full
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Payment Date</label>
                                        <Input
                                            type="date"
                                            value={payForm.data.transaction_date}
                                            onChange={(e) => payForm.setData('transaction_date', e.target.value)}
                                            className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Cheque / Voucher No.</label>
                                        <Input
                                            value={payForm.data.reference_no}
                                            onChange={(e) => payForm.setData('reference_no', e.target.value)}
                                            placeholder="Cheque or voucher Sl#"
                                            className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                                        />
                                    </div>
                                </div>

                                {amountNum > 0 && selected && (
                                    <div className="rounded-md border border-emerald-150 bg-emerald-50/60 px-3 py-1.5 text-xs text-zinc-700 font-semibold flex items-center justify-between">
                                        <span>Debit Breakdown:</span>
                                        <span className="tabular-nums">
                                            Total: <strong className="text-emerald-700">৳ {fmt(splitPreview.total)}</strong> (Employee: ৳ {fmt(splitPreview.own)} · Employer: ৳ {fmt(splitPreview.org)})
                                        </span>
                                    </div>
                                )}

                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Reason & Notes</label>
                                    <Textarea
                                        value={payForm.data.notes}
                                        onChange={(e) => payForm.setData('notes', e.target.value)}
                                        rows={2}
                                        placeholder="e.g. Final settlement, emergency health withdrawal..."
                                        className="text-xs border-zinc-200 focus-visible:ring-emerald-500 resize-none p-2 min-h-[50px]"
                                        required
                                    />
                                </div>

                                {(payForm.errors.employee_id ||
                                    payForm.errors.amount ||
                                    payForm.errors.notes ||
                                    amountInvalid) && (
                                    <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 font-medium">
                                        {payForm.errors.employee_id ||
                                            payForm.errors.amount ||
                                            payForm.errors.notes ||
                                            (amountInvalid
                                                ? `Amount cannot exceed balance (৳ ${fmt(balance)}).`
                                                : null)}
                                    </p>
                                )}

                                <div className="flex items-center gap-1.5 pt-1">
                                    <Button
                                        type="submit"
                                        disabled={payForm.processing || !canSubmit}
                                        className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
                                    >
                                        <Save className="mr-1.5 h-3.5 w-3.5" /> Save Payment
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs px-3 rounded border-zinc-200"
                                        onClick={() => {
                                            payForm.reset();
                                            payForm.setData('transaction_date', new Date().toISOString().slice(0, 10));
                                            payForm.clearErrors();
                                        }}
                                    >
                                        Clear Form
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Payment history list */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">PF Withdrawals History</CardTitle>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                        <div className="relative w-full sm:w-48">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                            <Input
                                placeholder="Search employee..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                                className="h-7 text-xs pl-8 border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                            />
                        </div>
                        <Button size="sm" className="h-7 text-xs bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded px-2.5" onClick={applySearch}>
                            Search
                        </Button>
                        {search && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-zinc-400"
                                onClick={() => {
                                    setSearch('');
                                    router.get(route('provident-fund.withdrawals.index'), {}, {
                                        preserveState: true,
                                        replace: true,
                                    });
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {records.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-zinc-500">No PF payments recorded yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50 border-b border-zinc-200/60">
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pl-3">Employee</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Date</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Paid Amount</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Own Share</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Org Share</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Reference</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Notes</TableHead>
                                        <TableHead className="w-20 text-right pr-3 font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((r) => (
                                        <TableRow key={r.id} className="hover:bg-emerald-50/10 border-b border-zinc-100/80 transition-colors group">
                                            <TableCell className="pl-3 py-1.5 font-bold text-zinc-800">{r.employee_label}</TableCell>
                                            <TableCell className="py-1.5 text-zinc-500 whitespace-nowrap">{r.transaction_date}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums font-bold text-zinc-850">{fmt(r.debit_amount)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmt(r.own_amount)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmt(r.org_amount)}</TableCell>
                                            <TableCell className="py-1.5 text-zinc-500 whitespace-nowrap">{r.reference_no || '—'}</TableCell>
                                            <TableCell className="py-1.5 max-w-[180px] truncate text-zinc-500" title={r.notes || ''}>
                                                {r.notes || '—'}
                                            </TableCell>
                                            <TableCell className="py-1.5 pr-3 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {canEdit && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className="h-6 text-[10px] text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-zinc-150 hover:border-emerald-200 px-1.5 font-medium transition-colors"
                                                            onClick={() => {
                                                                payForm.setData({
                                                                    employee_id: String(r.employee_id),
                                                                    amount: '',
                                                                    transaction_date: new Date().toISOString().slice(0, 10),
                                                                    reference_no: '',
                                                                    notes: '',
                                                                });
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                        >
                                                            Pay Again
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-transparent hover:border-emerald-100"
                                                        asChild
                                                        title="View Ledger"
                                                    >
                                                        <Link href={route('provident-fund.ledger', r.employee_id)}>
                                                            <BookOpen className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </StaffFundLayout>
    );
}
