import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { FormErrorBanner } from '@/components/employee-loan/FormErrorBanner';
import { AccountsApproveModal } from '@/components/employee-loan/AccountsApproveModal';

export type MotorcycleReviewState = {
    can_act: boolean;
    has_signature: boolean;
    stage?: string | null;
    stage_label?: string | null;
};

export function MotorcycleLoanReviewBar({ applicationId, review, appliedAmount = 0 }: { applicationId: number; review?: MotorcycleReviewState | null; appliedAmount?: number }) {
    const forward = useForm({ comments: '' });
    const sendBack = useForm({ comments: '' });
    const [comments, setComments] = useState('');
    const [accountsOpen, setAccountsOpen] = useState(false);

    if (!review?.can_act) {
        return null;
    }

    const submitForward = () => {
        if (review?.stage === 'accounts') {
            setAccountsOpen(true);
            return;
        }
        forward.transform(() => ({ comments }));
        forward.post(route('employee.loan.applications.forward', applicationId));
    };
    const confirmAccounts = (amount: number, date: string) => {
        forward.transform(() => ({ comments, approved_amount: amount, disbursement_date: date }));
        forward.post(route('employee.loan.applications.forward', applicationId), {
            onSuccess: () => setAccountsOpen(false),
        });
    };
    const submitBack = () => {
        if (!window.confirm('আবেদনকারীর কাছে ফেরত পাঠাবেন?')) return;
        sendBack.transform(() => ({ comments }));
        sendBack.post(route('employee.loan.applications.send-back', applicationId));
    };

    return (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 print:hidden">
            <h2 className="text-sm font-semibold text-zinc-950">{review.stage_label || 'সুপারিশ'} — এখন আপনার কাছে</h2>
            <p className="mt-1 text-xs text-zinc-500">সিল ও স্বাক্ষর প্রোফাইল থেকে নিজে থেকে বসবে। না থাকলে সুপারিশ বা অনুমোদন হবে না।</p>
            <FormErrorBanner errors={{ ...forward.errors, ...sendBack.errors }} />
            {!review.has_signature && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    <p>প্রোফাইলে সিল ও স্বাক্ষর নেই। আপলোড না করা পর্যন্ত সুপারিশ বা অনুমোদন দেওয়া যাবে না।</p>
                    <Link href="/settings/profile" className="font-semibold underline">স্বাক্ষর আপলোড</Link>
                </div>
            )}
            <label className="mt-3 block text-xs font-medium text-zinc-600">
                মন্তব্য ও সুপারিশ
                <textarea
                    className="mt-1 min-h-24 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                    placeholder="সুপারিশ করা হলো / ফেরত পাঠানোর কারণ"
                />
            </label>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" size="sm" disabled={comments.trim() === '' || sendBack.processing} onClick={submitBack}>
                    ফেরত পাঠান
                </Button>
                <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!review.has_signature || comments.trim() === '' || forward.processing}
                    onClick={submitForward}
                >
                    {review.stage === 'ed' ? 'অনুমোদন ও প্রদান' : review.stage === 'accounts' ? 'অনুমোদন' : 'সুপারিশ করে পাঠান'}
                </Button>
            </div>
            {review.stage === 'accounts' && (
                <AccountsApproveModal
                    open={accountsOpen}
                    onOpenChange={setAccountsOpen}
                    appliedAmount={appliedAmount}
                    processing={forward.processing}
                    error={forward.errors.approved_amount || forward.errors.disbursement_date || forward.errors.comments}
                    onConfirm={confirmAccounts}
                />
            )}
        </div>
    );
}
