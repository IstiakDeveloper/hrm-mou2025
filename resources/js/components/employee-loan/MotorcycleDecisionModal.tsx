import React, { useEffect, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatTakaWhole } from '@/lib/taka-format';

export type MotorcycleDecisionRow = {
    id: number;
    application_number: string;
    employee_label?: string | null;
    applied_amount: number;
    workflow_stage?: string | null;
    stage_label?: string | null;
};

function todayInput(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

export function MotorcycleDecisionModal({
    row,
    hasSignature,
    onClose,
}: {
    row: MotorcycleDecisionRow | null;
    hasSignature: boolean;
    onClose: () => void;
}) {
    const forward = useForm({});
    const sendBack = useForm({});
    const [comments, setComments] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayInput());

    useEffect(() => {
        if (!row) return;
        setComments('');
        setAmount(String(Math.round(row.applied_amount || 0)));
        setDate(todayInput());
    }, [row]);

    const stage = row?.workflow_stage;
    const isAccounts = stage === 'accounts';
    const isEd = stage === 'ed';
    const numeric = Number(amount);
    const amountReady = !isAccounts || (Number.isFinite(numeric) && numeric > 0 && date !== '');
    const canSend = hasSignature && comments.trim() !== '' && amountReady && !forward.processing;
    const error = forward.errors.comments
        || forward.errors.approved_amount
        || forward.errors.disbursement_date
        || sendBack.errors.comments
        || null;

    const submitForward = () => {
        if (!row) return;
        forward.transform(() => (
            isAccounts
                ? { comments, approved_amount: numeric, disbursement_date: date }
                : { comments }
        ));
        forward.post(route('employee.loan.applications.forward', row.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const submitBack = () => {
        if (!row || !window.confirm('আবেদনকারীর কাছে ফেরত পাঠাবেন?')) return;
        sendBack.transform(() => ({ comments }));
        sendBack.post(route('employee.loan.applications.send-back', row.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <Dialog open={row !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{row?.stage_label || 'সুপারিশ'}</DialogTitle>
                </DialogHeader>
                {row && (
                    <div className="space-y-3">
                        <p className="text-xs text-zinc-500">
                            <span className="font-mono font-semibold text-zinc-800">{row.application_number}</span>
                            {row.employee_label ? ` · ${row.employee_label}` : ''}
                        </p>
                        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
                        {!hasSignature && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                                <p>প্রোফাইলে সিল ও স্বাক্ষর নেই। আপলোড না করা পর্যন্ত সুপারিশ বা অনুমোদন দেওয়া যাবে না।</p>
                                <Link href="/settings/profile" className="font-semibold underline">স্বাক্ষর আপলোড</Link>
                            </div>
                        )}
                        <label className="block text-sm font-medium text-zinc-800">
                            মন্তব্য ও সুপারিশ
                            <textarea
                                className="mt-1 min-h-24 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                                value={comments}
                                onChange={(event) => setComments(event.target.value)}
                                placeholder="সুপারিশ করা হলো / ফেরত পাঠানোর কারণ"
                            />
                        </label>
                        {isAccounts && (
                            <>
                                <label className="block text-sm font-medium text-zinc-800">
                                    অনুমোদনকৃত লোনের পরিমাণ
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={amount}
                                        onChange={(event) => setAmount(event.target.value)}
                                        className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                                    />
                                    <span className="mt-1 block text-xs font-semibold text-zinc-600">
                                        {Number.isFinite(numeric) ? `${formatTakaWhole(numeric)} টাকা` : '—'}
                                    </span>
                                </label>
                                <label className="block text-sm font-medium text-zinc-800">
                                    Disburse date
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(event) => setDate(event.target.value)}
                                        className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                                    />
                                    <span className="mt-1 block text-xs text-zinc-500">চাইলে প্রদানের তারিখ বদলাতে পারবেন।</span>
                                </label>
                            </>
                        )}
                        <p className="text-xs text-zinc-500">সিল ও স্বাক্ষর প্রোফাইল থেকে নিজে থেকে বসবে।</p>
                    </div>
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={comments.trim() === '' || sendBack.processing} onClick={submitBack}>
                        ফেরত পাঠান
                    </Button>
                    <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={!canSend} onClick={submitForward}>
                        {isEd ? 'অনুমোদন ও প্রদান' : isAccounts ? 'অনুমোদন' : 'সুপারিশ করে পাঠান'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
