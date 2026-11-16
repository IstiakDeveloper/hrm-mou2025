import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatTakaWhole } from '@/lib/taka-format';

function todayInput(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

export function AccountsApproveModal({
    open,
    onOpenChange,
    appliedAmount,
    processing = false,
    error,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appliedAmount: number;
    processing?: boolean;
    error?: string | null;
    onConfirm: (amount: number, date: string) => void;
}) {
    const [amount, setAmount] = useState(String(Math.round(appliedAmount || 0)));
    const [date, setDate] = useState(todayInput());

    useEffect(() => {
        if (!open) return;
        setAmount(String(Math.round(appliedAmount || 0)));
        setDate(todayInput());
    }, [open, appliedAmount]);

    const numeric = Number(amount);
    const ready = Number.isFinite(numeric) && numeric > 0 && date !== '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>হিসাব বিভাগের অনুমোদন</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
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
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
                    <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={!ready || processing}
                        onClick={() => onConfirm(numeric, date)}
                    >
                        অনুমোদন
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
