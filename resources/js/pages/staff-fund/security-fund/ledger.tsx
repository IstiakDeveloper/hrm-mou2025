import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Plus,
    RotateCcw,
    AlertTriangle,
    Coins,
    Wallet,
    Calendar,
    Undo2,
    BookOpen,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    FileDown,
    Printer,
    Sparkles,
} from 'lucide-react';
import {
    fundDisplayDate,
    fundDisplayDateReadable,
    fundInterest,
    fundMoney,
    fundRequestKey,
    fundToday,
    type FundSnapshot,
} from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';
import { Errors, Exports, SecurityFundPolicyBanner, StatusBadge, Summary } from './components';

type Transaction = {
    id: number;
    type: string;
    transaction_date: string;
    principal_credit: string;
    principal_debit: string;
    interest_credit: string;
    interest_debit: string;
    reference_no: string | null;
    notes: string | null;
    reversal_of_id: number | null;
    creator?: { name: string } | null;
};

type Props = {
    account: { id: number; status: string; pin: string; name: string; branch: string } | null;
    snapshot: FundSnapshot | null;
    transactions: Transaction[];
    canEdit: boolean;
    canExport: boolean;
    asOf: string;
    selfService: boolean;
};

export default function SecurityFundLedger({
    account,
    snapshot,
    transactions,
    canEdit,
    canExport,
    asOf,
    selfService,
}: Props) {
    const [mode, setMode] = useState<'deposit' | 'refund' | null>(null);
    const [reverseId, setReverseId] = useState<number | null>(null);
    const [page, setPage] = useState(1);

    const reversal = useForm({ reason: '' });

    const reversed = useMemo(() => new Set(transactions.map((tx) => tx.reversal_of_id).filter(Boolean)), [transactions]);
    const ledgerRows = useMemo(() => {
        let principalPaisa = 0;
        let interestPaisa = 0;
        return transactions.map((transaction) => {
            principalPaisa += Math.round(Number(transaction.principal_credit) * 100) - Math.round(Number(transaction.principal_debit) * 100);
            interestPaisa += Math.round(Number(transaction.interest_credit) * 100) - Math.round(Number(transaction.interest_debit) * 100);
            return { transaction, principalPaisa, interestPaisa };
        });
    }, [transactions]);
    useEffect(() => setPage(1), [transactions]);
    const pageSize = 30;
    const pageCount = Math.max(1, Math.ceil(ledgerRows.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visibleRows = ledgerRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleAsOfChange = (dateVal: string) => {
        router.get(
            selfService
                ? staffFundPath('/employee/staff-fund/security-fund')
                : staffFundPath(`/security-fund/${account?.id}/ledger`),
            { as_of: dateVal },
            { preserveState: true }
        );
    };

    const txTypeLabel = (type: string) => {
        const map: Record<string, { label: string; badgeClass: string }> = {
            deposit: { label: 'Deposit (জমা)', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            interest_post: { label: 'Interest Posted (সুদ অর্জিত)', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
            refund: { label: 'Refund (ফেরত)', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
            reversal: { label: 'Reversal (বাতিল)', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
            final_settlement: { label: 'Settlement (নিষ্পত্তি)', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
        };

        const found = map[type.toLowerCase()];
        if (found) {
            return (
                <Badge variant="outline" className={cn('text-[10px] font-medium border px-1.5 py-0 h-4.5', found.badgeClass)}>
                    {found.label}
                </Badge>
            );
        }

        return (
            <Badge variant="outline" className="text-[10px] capitalize border-zinc-200 px-1.5 py-0 h-4.5">
                {type.replaceAll('_', ' ')}
            </Badge>
        );
    };

    return (
        <StaffFundLayout
            title="Security Fund Ledger"
            description={
                account
                    ? `Account Ledger for PIN: ${account.pin} · ${account.name} · ${account.branch ?? ''}`
                    : 'Your Security Fund Account Ledger'
            }
            activeTab="security-register"
        >
            <Head title="Security Fund Ledger" />

            {!account || !snapshot ? (
                <Card className="p-12 text-center border-zinc-200/80 bg-white rounded-lg shadow-2xs">
                    <Wallet className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-700">No Security Fund account found</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                        No active Security Fund account exists for this employee.
                    </p>
                    {!selfService && (
                        <Button variant="outline" size="sm" className="mt-4 text-xs" asChild>
                            <Link href={staffFundPath('/security-fund')}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                Back to Register
                            </Link>
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-3">
                    {/* Header Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 print:hidden">
                        <div className="flex items-center gap-2">
                            {!selfService && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded"
                                    asChild
                                >
                                    <Link href={staffFundPath('/security-fund')}>
                                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                        Back to Register
                                    </Link>
                                </Button>
                            )}

                            <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="border-zinc-200 bg-zinc-50 font-mono font-bold text-xs px-2 py-0.5">
                                    {account.pin}
                                </Badge>
                                <span className="font-bold text-sm text-zinc-900">{account.name}</span>
                                <span className="text-xs text-zinc-400">· {account.branch}</span>
                                <StatusBadge status={account.status} />
                            </div>
                        </div>

                        {/* As of Selector & Actions */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-white border border-zinc-200 rounded px-2 py-1 shadow-2xs">
                                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                <span>As of:</span>
                                <input
                                    type="date"
                                    max={fundToday()}
                                    value={asOf}
                                    onChange={(e) => handleAsOfChange(e.target.value)}
                                    className="h-6 text-xs text-zinc-800 bg-transparent border-none focus:outline-none cursor-pointer"
                                />
                                <span className="text-[10px] text-zinc-400 font-mono">
                                    ({fundDisplayDate(asOf)})
                                </span>
                            </div>

                            {!selfService && (
                                <Exports canExport={canExport} filters={{ account_id: account.id, as_of: asOf }} />
                            )}

                            {canEdit && account.status === 'open' && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        onClick={() => setMode('deposit')}
                                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-3 rounded shadow-2xs"
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        Deposit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMode('refund')}
                                        className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded"
                                    >
                                        Refund
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary KPI Cards */}
                    <Summary values={snapshot} />

                    {/* Policy Banner */}
                    <SecurityFundPolicyBanner />

                    {/* Eligibility & Notice Details */}
                    <div className="rounded-lg border border-zinc-200/80 bg-white p-3 text-xs text-zinc-700 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs">
                        <div className="space-y-0.5">
                            <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                                Interest Calculation Status:
                            </p>
                            <p className="text-[11px] text-zinc-500">
                                Cutoff: <strong className="text-zinc-700 font-mono">{fundDisplayDate(snapshot.interest_as_of)}</strong> · Rate: 6% Simple Interest (Principal only).
                                {snapshot.next_eligibility_date && (
                                    <span className="text-amber-700 ml-1 font-medium">
                                        Next deposit reaches 1-year eligibility on {fundDisplayDate(snapshot.next_eligibility_date)}.
                                    </span>
                                )}
                            </p>
                        </div>
                        {Number(snapshot.unposted_interest) > 0 && (
                            <div className="rounded bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-right">
                                <p className="text-[10px] text-emerald-700 font-medium">Accrued, Unposted Interest</p>
                                <p className="font-mono font-bold text-emerald-800 text-xs">
                                    + ৳ {fundInterest(snapshot.unposted_interest)}
                                </p>
                            </div>
                        )}
                    </div>

                    {snapshot.review_required && (
                        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            {snapshot.review_required}
                        </div>
                    )}

                    {!snapshot.interest_calculation_deferred && snapshot.eligibility_stopped && Number(snapshot.pending_principal) > 0 && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 rounded-lg border border-amber-250 bg-amber-50 p-2.5 text-xs text-amber-900 shadow-2xs"
                        >
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                            <p>
                                Some principal was held for less than one year at departure date. Under company policy, that portion earns no interest upon departure.
                            </p>
                        </div>
                    )}

                    {/* Transaction History Table */}
                    <Card className="overflow-hidden border border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                        <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex justify-between items-center">
                            <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Ledger Transactions ({transactions.length})</span>
                            </CardTitle>
                            <span className="text-[11px] text-zinc-400 font-mono">
                                As of: {fundDisplayDate(asOf)}
                            </span>
                        </CardHeader>

                        <div className="overflow-x-auto">
                            <Table className="w-full text-xs">
                                <TableHeader className="bg-zinc-50/80 border-b border-zinc-200">
                                    <TableRow>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                            Date & Type (তারিখ ও বিবরণ)
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                            Reference & Notes (সূত্র / প্রমাণ)
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                            Principal Credit (+)
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                            Principal Debit (−)
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                            Interest Credit (+)
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                            Interest Debit (−)
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-800 text-right whitespace-nowrap bg-zinc-100/50">
                                            Principal Balance
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-emerald-800 text-right whitespace-nowrap bg-emerald-50/40">
                                            Interest Balance
                                        </TableHead>
                                        <TableHead className="py-2 px-3 font-bold text-zinc-700 text-center whitespace-nowrap print:hidden">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRows.map(({ transaction: tx, principalPaisa, interestPaisa }) => {
                                        const isReversed = reversed.has(tx.id);

                                        return (
                                            <TableRow
                                                key={tx.id}
                                                className={cn(
                                                    'hover:bg-zinc-50/70 border-b border-zinc-100 transition-colors',
                                                    isReversed && 'opacity-60 bg-zinc-50/50'
                                                )}
                                            >
                                                {/* Date & Type (Bangladeshi Format: DD/MM/YYYY) */}
                                                <TableCell className="py-2 px-3 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-mono text-zinc-800 font-medium">
                                                            {fundDisplayDate(tx.transaction_date)}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {txTypeLabel(tx.type)}
                                                            {isReversed && (
                                                                <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-700 border-rose-200 px-1 py-0 h-4">
                                                                    Reversed
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Reference & Notes */}
                                                <TableCell className="py-2 px-3 max-w-xs">
                                                    <p className="font-medium text-zinc-900 truncate">
                                                        {tx.reference_no || '—'}
                                                    </p>
                                                    {tx.notes && (
                                                        <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">
                                                            {tx.notes}
                                                        </p>
                                                    )}
                                                    <p className="text-[9px] text-zinc-400 mt-0.5">
                                                        By {tx.creator?.name ?? 'System Import'}
                                                    </p>
                                                </TableCell>

                                                {/* Principal Credit (+) */}
                                                <TableCell className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                                                    {Number(tx.principal_credit) > 0 ? `+ ৳ ${fundMoney(tx.principal_credit)}` : '—'}
                                                </TableCell>

                                                {/* Principal Debit (-) */}
                                                <TableCell className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                                                    {Number(tx.principal_debit) > 0 ? `− ৳ ${fundMoney(tx.principal_debit)}` : '—'}
                                                </TableCell>

                                                {/* Interest Credit (+) */}
                                                <TableCell className="py-2 px-3 text-right font-mono text-blue-700 whitespace-nowrap">
                                                    {Number(tx.interest_credit) > 0 ? `+ ৳ ${fundInterest(tx.interest_credit)}` : '—'}
                                                </TableCell>

                                                {/* Interest Debit (-) */}
                                                <TableCell className="py-2 px-3 text-right font-mono text-amber-700 whitespace-nowrap">
                                                    {Number(tx.interest_debit) > 0 ? `− ৳ ${fundInterest(tx.interest_debit)}` : '—'}
                                                </TableCell>

                                                {/* Running Principal Balance */}
                                                <TableCell className="py-2 px-3 text-right font-mono font-semibold text-zinc-900 whitespace-nowrap bg-zinc-50/50">
                                                    ৳ {fundMoney(principalPaisa / 100)}
                                                </TableCell>

                                                {/* Running Interest Balance */}
                                                <TableCell className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap bg-emerald-50/20">
                                                    ৳ {fundInterest(interestPaisa / 100)}
                                                </TableCell>

                                                {/* Action (Reversal) */}
                                                <TableCell className="py-2 px-3 text-center whitespace-nowrap print:hidden">
                                                    {canEdit &&
                                                        account.status === 'open' &&
                                                        !isReversed &&
                                                        !['reversal', 'final_settlement'].includes(tx.type) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setReverseId(tx.id)}
                                                                className="h-6 px-1.5 text-[11px] text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                                                            >
                                                                <Undo2 className="mr-1 h-3 w-3" />
                                                                Reverse
                                                            </Button>
                                                        )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {!transactions.length && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="py-10 text-center text-zinc-500">
                                                No transactions recorded on or before {fundDisplayDate(asOf)}.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-zinc-600">
                            <span>{transactions.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, transactions.length)} of {transactions.length} transactions</span>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
                                <span>Page {currentPage} of {pageCount}</span>
                                <Button type="button" variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
                            </div>
                        </div>
                    </Card>

                    {/* Deposit & Refund Modal */}
                    <LedgerTransactionModal
                        accountId={account.id}
                        mode={mode}
                        onClose={() => setMode(null)}
                    />

                    {/* Reversal Modal */}
                    <Dialog open={reverseId !== null} onOpenChange={(open) => !open && setReverseId(null)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                                    <span className="flex h-6 w-6 items-center justify-center rounded bg-rose-50 text-rose-600">
                                        <Undo2 className="h-4 w-4" />
                                    </span>
                                    Reverse Transaction
                                </DialogTitle>
                                <DialogDescription className="text-xs text-zinc-500">
                                    A linked reversal preserves audit history while adjusting balances.
                                </DialogDescription>
                            </DialogHeader>

                            <form
                                className="space-y-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    reversal.post(
                                        staffFundPath(`/security-fund/${account.id}/transactions/${reverseId}/reverse`),
                                        {
                                            onSuccess: () => {
                                                setReverseId(null);
                                                reversal.reset();
                                            },
                                        }
                                    );
                                }}
                            >
                                <Errors errors={reversal.errors} />

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-700 block">
                                        Reason for Reversal (বাতিলের কারণ) <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        minLength={5}
                                        required
                                        rows={3}
                                        placeholder="Explain why this transaction is being reversed (min 5 characters)..."
                                        value={reversal.data.reason}
                                        onChange={(e) => reversal.setData('reason', e.target.value)}
                                        className="w-full rounded border border-zinc-200 bg-white p-2 text-xs text-zinc-800 shadow-2xs focus:border-rose-500 focus:outline-none"
                                    />
                                </div>

                                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setReverseId(null)}
                                        className="h-8 text-xs border-zinc-200"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={reversal.processing}
                                        className="h-8 bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white px-4"
                                    >
                                        {reversal.processing ? 'Reversing...' : 'Record Reversal'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </StaffFundLayout>
    );
}

type LedgerTransactionModalProps = {
    accountId: number;
    mode: 'deposit' | 'refund' | null;
    onClose: () => void;
};

function LedgerTransactionModal({ accountId, mode, onClose }: LedgerTransactionModalProps) {
    const form = useForm({
        amount: '',
        principal: '0',
        interest: '0',
        transaction_date: fundToday(),
        reference_no: '',
        notes: '',
        idempotency_key: fundRequestKey(),
    });

    const displayTransactionDate = useMemo(() => {
        const dt = form.data.transaction_date;
        if (!dt) return '';
        return fundDisplayDate(dt);
    }, [form.data.transaction_date]);

    return (
        <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                            <Plus className="h-4 w-4" />
                        </span>
                        {mode === 'deposit' ? 'Add Security Deposit' : 'Refund Security Deposit'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-500">
                        {mode === 'deposit'
                            ? 'Record an additional principal deposit for this employee.'
                            : 'Process principal and interest refund. Returned principal stops earning interest.'}
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="space-y-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(
                            staffFundPath(`/security-fund/${accountId}/${mode === 'deposit' ? 'deposits' : 'refunds'}`),
                            {
                                onSuccess: () => {
                                    onClose();
                                    form.reset();
                                    form.setData('idempotency_key', fundRequestKey());
                                },
                            }
                        );
                    }}
                >
                    <Errors errors={form.errors} />

                    {mode === 'deposit' ? (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                Deposit Amount (৳) <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                placeholder="e.g. 10000.00"
                                value={form.data.amount}
                                onChange={(e) => form.setData('amount', e.target.value)}
                                className="h-8.5 text-xs font-mono font-semibold border-zinc-200 rounded"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-zinc-700 block">
                                    Principal Refund (৳) <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={form.data.principal}
                                    onChange={(e) => form.setData('principal', e.target.value)}
                                    className="h-8.5 text-xs font-mono font-semibold border-zinc-200 rounded"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-zinc-700 block">
                                    Interest Refund (৳) <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    required
                                    value={form.data.interest}
                                    onChange={(e) => form.setData('interest', e.target.value)}
                                    className="h-8.5 text-xs font-mono font-semibold border-zinc-200 rounded"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                Transaction Date <span className="text-rose-500">*</span>
                            </label>
                            {displayTransactionDate && (
                                <span className="text-[11px] font-mono text-zinc-500">
                                    BD Format: {displayTransactionDate}
                                </span>
                            )}
                        </div>
                        <Input
                            type="date"
                            required
                            max={fundToday()}
                            value={form.data.transaction_date}
                            onChange={(e) => form.setData('transaction_date', e.target.value)}
                            className="h-8.5 text-xs border-zinc-200 rounded"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                Receipt / Voucher Reference
                            </label>
                            <span className="text-[11px] text-zinc-400 font-normal">
                                Optional (Auto-generated if blank)
                            </span>
                        </div>
                        <Input
                            maxLength={120}
                            placeholder="e.g. MR-2026-99 (Leave blank to auto-generate)"
                            value={form.data.reference_no}
                            onChange={(e) => form.setData('reference_no', e.target.value)}
                            className="h-8.5 text-xs border-zinc-200 rounded"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                Notes / Memo
                            </label>
                            <span className="text-[11px] text-zinc-400 font-normal">
                                Optional
                            </span>
                        </div>
                        <textarea
                            rows={2}
                            maxLength={2000}
                            placeholder="Add transaction notes (Optional)..."
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            className="w-full rounded border border-zinc-200 bg-white p-2 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="h-8 text-xs border-zinc-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={form.processing}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-4"
                        >
                            {form.processing ? 'Saving...' : `Save ${mode === 'deposit' ? 'Deposit' : 'Refund'}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
