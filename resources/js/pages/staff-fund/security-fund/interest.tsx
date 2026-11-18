import StaffFundLayout from '@/layouts/StaffFundLayout';
import { fundInterest, fundMoney, fundRequestKey, fundToday, type FundSnapshot } from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { Link, router, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { actionClass, Errors, fieldClass, secondaryClass, Summary } from './components';

type Props = {
    cutoffDate: string;
    rows: (Partial<FundSnapshot> & { id: number; pin: string; name: string; review_required?: string })[];
    summary: FundSnapshot & { review_count: number };
    fingerprint: string;
    canEdit: boolean;
};

export default function SecurityFundInterest({ cutoffDate, rows, summary, fingerprint, canEdit }: Props) {
    const form = useForm({ cutoff_date: cutoffDate, fingerprint, idempotency_key: fundRequestKey() });
    useEffect(() => {
        form.setData({ cutoff_date: cutoffDate, fingerprint, idempotency_key: fundRequestKey() });
    }, [cutoffDate, fingerprint]);
    return (
        <StaffFundLayout
            title="Security Fund Interest"
            description="6% yearly on deposits held at least one year. Only complete calendar months count; interest rounds to whole taka."
            activeTab="security-interest"
        >
            <Summary values={summary} />
            <div className="flex flex-wrap items-end gap-3">
                <Link className={secondaryClass} href={staffFundPath('/security-fund')}>
                    ← Register
                </Link>
                <form
                    className="flex items-end gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(staffFundPath('/security-fund/interest'), { cutoff_date: form.data.cutoff_date });
                    }}
                >
                    <label className="text-sm">
                        Interest through
                        <input
                            className={fieldClass}
                            type="date"
                            required
                            max={fundToday()}
                            value={form.data.cutoff_date}
                            onChange={(e) => form.setData('cutoff_date', e.target.value)}
                        />
                    </label>
                    <button className={secondaryClass}>Preview</button>
                </form>
            </div>
            <Errors errors={form.errors} />
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                Ready to post: <strong>৳{fundInterest(summary.unposted_interest)}</strong> as of {cutoffDate}. An incomplete final month is excluded
                (30 December counts through November). Deposits held under one year earn no interest.
            </div>
            <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                        <tr>
                            {['Employee', 'Principal', 'Posted unpaid', 'New interest to post', 'Interest cutoff'].map((title) => (
                                <th key={title} className="p-3">
                                    {title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-t">
                                <td className="p-3">
                                    <Link className="font-semibold text-emerald-800" href={staffFundPath(`/security-fund/${row.id}/ledger`)}>
                                        {row.pin} · {row.name}
                                    </Link>
                                </td>
                                {row.review_required ? (
                                    <td colSpan={4} className="p-3 text-rose-700">
                                        {row.review_required}
                                    </td>
                                ) : (
                                    <>
                                        <td className="p-3 font-mono">{fundMoney(row.principal)}</td>
                                        <td className="p-3 font-mono">{fundInterest(row.posted_interest)}</td>
                                        <td className="p-3 font-mono font-semibold">{fundInterest(row.unposted_interest)}</td>
                                        <td className="p-3">
                                            {row.interest_as_of}
                                            {row.next_eligibility_date && (
                                                <p className="text-xs text-amber-700">Next deposit qualifies {row.next_eligibility_date}</p>
                                            )}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {!rows.length && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    No open Security Fund accounts.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {canEdit && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(staffFundPath('/security-fund/interest'));
                    }}
                >
                    <button
                        className={actionClass}
                        disabled={
                            form.processing ||
                            Number(summary.unposted_interest) <= 0 ||
                            summary.review_count > 0 ||
                            form.data.cutoff_date !== cutoffDate
                        }
                    >
                        Post previewed interest
                    </button>
                </form>
            )}
        </StaffFundLayout>
    );
}
