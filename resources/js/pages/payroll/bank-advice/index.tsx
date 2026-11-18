import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Layout from '@/layouts/AdminLayout';
import { formatTakaAmount } from '@/lib/taka-format';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { adviceBase, adviceDate, type BankAdvice } from './types';

type Props = {
    records: { data: BankAdvice[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    filters: { year?: string; month?: string };
    canEdit: boolean;
    canDelete: boolean;
};

export default function BankAdviceIndex({ records, filters, canEdit, canDelete }: Props) {
    const [year, setYear] = useState(String(filters.year ?? ''));
    const [month, setMonth] = useState(String(filters.month ?? ''));
    return (
        <Layout>
            <Head title="Bank Advice" />
            <PayrollPage>
                <PayrollPageHeader title="Bank Advice" description="Saved salary transfer letters and account lists by salary month.">
                    <Button asChild variant="outline">
                        <Link href="/payroll/reports">All reports</Link>
                    </Button>
                    {canEdit && (
                        <Button asChild>
                            <Link href={`${adviceBase}/create`}>Generate bank advice</Link>
                        </Button>
                    )}
                </PayrollPageHeader>
                <PayrollSectionCard
                    title="Saved bank advices"
                    description={`${records.total} saved advice(s). Open a record to view its saved document.`}
                >
                    <form
                        className="mb-4 flex flex-wrap items-end gap-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            router.get(adviceBase, { year, month }, { preserveState: true });
                        }}
                    >
                        <label className="text-xs">
                            Salary year
                            <Input
                                type="number"
                                min={2000}
                                max={2200}
                                placeholder="All years"
                                value={year}
                                onChange={(event) => setYear(event.target.value)}
                                className="mt-1 w-36"
                            />
                        </label>
                        <label className="text-xs">
                            Salary month
                            <select
                                className="mt-1 block h-9 rounded-md border px-3 text-sm"
                                value={month}
                                onChange={(event) => setMonth(event.target.value)}
                            >
                                <option value="">All months</option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i + 1}>
                                        {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <Button variant="outline" type="submit">
                            Filter
                        </Button>
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                                setYear('');
                                setMonth('');
                                router.get(adviceBase);
                            }}
                        >
                            Reset
                        </Button>
                    </form>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-slate-50 text-xs">
                                <tr>
                                    {['Salary month', 'Reference', 'Issue date', 'Total (BDT)', ''].map((label, index) => (
                                        <th key={index} className="p-3">
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {records.data.map((advice) => (
                                    <tr key={advice.id} className="border-b">
                                        <td className="p-3 font-semibold">{advice.salary_month}</td>
                                        <td className="p-3">{advice.reference}</td>
                                        <td className="p-3">{adviceDate(advice.issue_date)}</td>
                                        <td className="p-3 tabular-nums">{formatTakaAmount(Number(advice.total), 2)}</td>
                                        <td className="p-3 text-right">
                                            <Link className="font-semibold text-emerald-700 hover:underline" href={`${adviceBase}/${advice.id}`}>
                                                View advice
                                            </Link>
                                            {canDelete && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    className="ml-3"
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                `Delete bank advice ${advice.reference} for ${advice.salary_month}? This cannot be undone.`,
                                                            )
                                                        )
                                                            router.delete(`${adviceBase}/${advice.id}`);
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {records.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            No saved bank advices for this selection.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {records.links.map((link, index) =>
                            link.url ? (
                                <Link
                                    key={index}
                                    href={link.url}
                                    className={`rounded border px-3 py-1 text-xs ${link.active ? 'bg-emerald-700 text-white' : ''}`}
                                >
                                    {link.label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')}
                                </Link>
                            ) : null,
                        )}
                    </div>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
