import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { fundInterest, fundMoney, fundRequestKey, fundToday, type FundSnapshot } from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { actionClass, Errors, Exports, fieldClass, secondaryClass, Summary } from './components';

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

export default function SecurityFundLedger({ account, snapshot, transactions, canEdit, canExport, asOf, selfService }: Props) {
    const [mode, setMode] = useState<'deposit' | 'refund' | null>(null);
    const [reverseId, setReverseId] = useState<number | null>(null);
    const form = useForm({
        amount: '',
        principal: '0',
        interest: '0',
        transaction_date: fundToday(),
        reference_no: '',
        notes: '',
        idempotency_key: fundRequestKey(),
    });
    const reversal = useForm({ reason: '' });
    let principalPaisa = 0;
    let interestPaisa = 0;
    const reversed = new Set(transactions.map((tx) => tx.reversal_of_id).filter(Boolean));
    return (
        <StaffFundLayout
            title="Security Fund Ledger"
            description={account ? `${account.pin} · ${account.name} · ${account.branch ?? ''}` : 'Your Security Fund'}
            activeTab="security-register"
        >
            {!account || !snapshot ? (
                <p className="rounded border bg-white p-8 text-center text-slate-500">No Security Fund account has been created for you.</p>
            ) : (
                <>
                    <Summary values={snapshot} />
                    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                        <div className="flex flex-wrap gap-2">
                            {!selfService && (
                                <Link className={secondaryClass} href={staffFundPath('/security-fund')}>
                                    ← Register
                                </Link>
                            )}
                            <label className="flex items-center gap-2 text-sm">
                                As of
                                <input
                                    className={fieldClass}
                                    type="date"
                                    max={fundToday()}
                                    value={asOf}
                                    onChange={(e) =>
                                        router.get(
                                            selfService
                                                ? staffFundPath('/employee/staff-fund/security-fund')
                                                : staffFundPath(`/security-fund/${account.id}/ledger`),
                                            { as_of: e.target.value },
                                        )
                                    }
                                />
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {!selfService && <Exports canExport={canExport} filters={{ account_id: account.id, as_of: asOf }} />}
                            {canEdit && account.status === 'open' && (
                                <>
                                    <button className={actionClass} onClick={() => setMode('deposit')}>
                                        + Deposit
                                    </button>
                                    <button className={secondaryClass} onClick={() => setMode('refund')}>
                                        Refund
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">
                        6% annual simple interest · Interest cutoff: {snapshot.interest_as_of} · Account: {account.status}. Posted interest remains
                        separate from principal.
                    </p>
                    <p className="text-xs text-slate-500">
                        One-year minimum for each deposit; complete calendar months only; whole-taka interest.{' '}
                        {snapshot.next_eligibility_date && `Next deposit qualifies ${snapshot.next_eligibility_date}.`}
                    </p>
                    {snapshot.eligibility_stopped && Number(snapshot.pending_principal) > 0 && (
                        <p className="text-xs text-amber-700">
                            Some principal was held for less than one year at departure. That portion earns no interest.
                        </p>
                    )}
                    <div className="overflow-x-auto rounded-lg border bg-white">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-left">
                                <tr>
                                    {[
                                        'Date / Type',
                                        'Reference / Notes',
                                        'Principal +',
                                        'Principal −',
                                        'Interest +',
                                        'Interest −',
                                        'Principal balance',
                                        'Interest balance',
                                        '',
                                    ].map((title, index) => (
                                        <th key={index} className="p-3 whitespace-nowrap">
                                            {title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    principalPaisa += Math.round(Number(tx.principal_credit) * 100) - Math.round(Number(tx.principal_debit) * 100);
                                    interestPaisa += Math.round(Number(tx.interest_credit) * 100) - Math.round(Number(tx.interest_debit) * 100);
                                    return (
                                        <tr key={tx.id} className="border-t">
                                            <td className="p-3">
                                                {tx.transaction_date.slice(0, 10)}
                                                <p className="text-slate-500 capitalize">
                                                    {tx.type.replaceAll('_', ' ')}
                                                    {reversed.has(tx.id) ? ' (reversed)' : ''}
                                                </p>
                                            </td>
                                            <td className="max-w-72 p-3">
                                                {tx.reference_no}
                                                <p className="text-slate-500">{tx.notes}</p>
                                                <p className="text-[10px] text-slate-400">Recorded by {tx.creator?.name ?? 'Legacy import'}</p>
                                            </td>
                                            {[
                                                tx.principal_credit,
                                                tx.principal_debit,
                                                tx.interest_credit,
                                                tx.interest_debit,
                                                principalPaisa / 100,
                                                interestPaisa / 100,
                                            ].map((value, index) => (
                                                <td key={index} className="p-3 text-right font-mono whitespace-nowrap">
                                                    {[2, 3, 5].includes(index) ? fundInterest(value) : fundMoney(value)}
                                                </td>
                                            ))}
                                            <td className="p-3">
                                                {canEdit &&
                                                    account.status === 'open' &&
                                                    !reversed.has(tx.id) &&
                                                    !['reversal', 'final_settlement'].includes(tx.type) && (
                                                        <button className="text-rose-700" onClick={() => setReverseId(tx.id)}>
                                                            Reverse
                                                        </button>
                                                    )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!transactions.length && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center">
                                            No transactions on or before this date.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-slate-500">
                        Unposted eligible interest of ৳{fundInterest(snapshot.unposted_interest)} appears in the summary and becomes a ledger credit
                        when posted or settled.
                    </p>
                    <Dialog
                        open={mode !== null}
                        onOpenChange={(open) => {
                            if (!open) setMode(null);
                        }}
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{mode === 'deposit' ? 'Add Security Deposit' : 'Refund Security Fund'}</DialogTitle>
                            </DialogHeader>
                            <form
                                className="space-y-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    form.post(staffFundPath(`/security-fund/${account.id}/${mode === 'deposit' ? 'deposits' : 'refunds'}`), {
                                        onSuccess: () => {
                                            setMode(null);
                                            form.reset();
                                            form.setData('idempotency_key', fundRequestKey());
                                        },
                                    });
                                }}
                            >
                                <Errors errors={form.errors} />
                                {mode === 'deposit' ? (
                                    <label className="block text-sm">
                                        Deposit amount
                                        <input
                                            className={fieldClass}
                                            required
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={form.data.amount}
                                            onChange={(e) => form.setData('amount', e.target.value)}
                                        />
                                    </label>
                                ) : (
                                    <>
                                        <label className="block text-sm">
                                            Principal refund
                                            <input
                                                className={fieldClass}
                                                required
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={form.data.principal}
                                                onChange={(e) => form.setData('principal', e.target.value)}
                                            />
                                        </label>
                                        <label className="block text-sm">
                                            Interest refund
                                            <input
                                                className={fieldClass}
                                                required
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={form.data.interest}
                                                onChange={(e) => form.setData('interest', e.target.value)}
                                            />
                                        </label>
                                        <p className="text-xs text-slate-500">
                                            Returned principal must have been held for one year to earn interest. Only complete months count. Interest
                                            refunds must be whole taka; returned portions do not earn for an incomplete refund month.
                                        </p>
                                    </>
                                )}
                                <label className="block text-sm">
                                    Date
                                    <input
                                        className={fieldClass}
                                        required
                                        type="date"
                                        max={fundToday()}
                                        value={form.data.transaction_date}
                                        onChange={(e) => form.setData('transaction_date', e.target.value)}
                                    />
                                </label>
                                <label className="block text-sm">
                                    Receipt / reference
                                    <input
                                        className={fieldClass}
                                        required
                                        maxLength={120}
                                        value={form.data.reference_no}
                                        onChange={(e) => form.setData('reference_no', e.target.value)}
                                    />
                                </label>
                                <label className="block text-sm">
                                    Notes
                                    <textarea
                                        className={fieldClass}
                                        required
                                        maxLength={2000}
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                    />
                                </label>
                                <button className={actionClass} disabled={form.processing}>
                                    Save {mode}
                                </button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Dialog
                        open={reverseId !== null}
                        onOpenChange={(open) => {
                            if (!open) setReverseId(null);
                        }}
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reverse transaction</DialogTitle>
                            </DialogHeader>
                            <form
                                className="space-y-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    reversal.post(staffFundPath(`/security-fund/${account.id}/transactions/${reverseId}/reverse`), {
                                        onSuccess: () => {
                                            setReverseId(null);
                                            reversal.reset();
                                        },
                                    });
                                }}
                            >
                                <p className="text-sm text-slate-600">
                                    A linked reversal preserves the original entry. Subsequent entries must be reversed first.
                                </p>
                                <Errors errors={reversal.errors} />
                                <label className="block text-sm">
                                    Reason
                                    <textarea
                                        className={fieldClass}
                                        minLength={5}
                                        required
                                        value={reversal.data.reason}
                                        onChange={(e) => reversal.setData('reason', e.target.value)}
                                    />
                                </label>
                                <button className={actionClass} disabled={reversal.processing}>
                                    Record reversal
                                </button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </StaffFundLayout>
    );
}
