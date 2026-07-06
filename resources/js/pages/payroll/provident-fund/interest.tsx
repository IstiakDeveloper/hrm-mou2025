import React, { useMemo } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PayrollFiscalYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { ArrowLeft, Calculator, RotateCcw, Save } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { formatFiscalYear } from '@/lib/fiscal-year';
import { formatPfAmount, roundPfAmount } from '@/lib/pf-format';
import { staffFundPath } from '@/lib/staff-fund-nav';
import type { SharedData } from '@/types';
import { cn } from '@/lib/utils';

type PreviewRow = {
    employee_id: number;
    label: string;
    pf_balance: number;
    interest_percent: number;
    interest_total: number;
    own_amount: number;
    org_amount: number;
};

type PastRun = {
    id: number;
    interest_year: number;
    interest_year_label: string;
    total_interest: number;
    total_pf_balance: number;
    employee_count: number;
    transaction_date: string;
    notes: string | null;
    created_by: string | null;
    created_at: string | null;
};

type Preview = {
    year: number;
    year_label?: string;
    total_interest: number;
    distributed_interest?: number;
    total_pf_balance: number;
    fund_total_before?: number;
    expected_fund_total_after?: number;
    interest_percent: number;
    employee_count: number;
    already_posted: boolean;
    transaction_date?: string;
    notes?: string;
    rows: PreviewRow[];
};

type Props = {
    pastRuns: PastRun[];
    fiscalYears: { value: string; label: string }[];
    defaultYear: string;
    formDefaults: {
        year: string;
        total_interest: string;
        transaction_date: string;
        notes: string;
    };
    preview: Preview | null;
};

const fmt = formatPfAmount;

function fmtInterestPercent(n: number | string | null | undefined): string {
    const value = Number(n ?? 0);
    if (!Number.isFinite(value)) {
        return '0.00%';
    }

    return `${value.toFixed(2)}%`;
}

export default function ProvidentFundInterest({ pastRuns, fiscalYears, formDefaults, preview }: Props) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string } }>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');

    const form = useForm({
        year: preview ? String(preview.year) : formDefaults.year,
        total_interest: preview ? String(preview.total_interest) : formDefaults.total_interest,
        transaction_date: preview?.transaction_date || formDefaults.transaction_date,
        notes: preview?.notes ?? formDefaults.notes,
    });

    const previewTotals = useMemo(() => {
        if (!preview?.rows?.length) return null;
        return preview.rows.reduce(
            (acc, r) => ({
                interest: acc.interest + r.interest_total,
                own: acc.own + r.own_amount,
                org: acc.org + r.org_amount,
            }),
            { interest: 0, own: 0, org: 0 },
        );
    }, [preview]);

    const submitPreview = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('provident-fund.interest.preview'));
    };

    const submitPost = () => {
        form.post(route('provident-fund.interest.store'));
    };

    const rollbackRun = (run: PastRun) => {
        if (!confirm(`Rollback PF interest for ${run.interest_year_label}?`)) {
            return;
        }

        router.post(route('provident-fund.interest.rollback', run.id));
    };

    return (
        <StaffFundLayout title="PF Interest" activeTab="pf-interest" description="Post and distribute yearly interest proportionally to every employee with a PF balance.">
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
                <div className="rounded-md border border-emerald-250 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    {flash.success}
                </div>
            )}

            {canEdit && (
                <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                    <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50">
                        <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Distribute Interest</CardTitle>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                            Every employee with PF balance &gt; 0 receives interest (active or inactive). Limit one posting per year.
                        </p>
                    </CardHeader>
                    <CardContent className="p-3">
                        <form onSubmit={submitPreview} className="space-y-3">
                            <div className="grid gap-2.5 sm:grid-cols-3">
                                <PayrollFiscalYearSelect
                                    label="Interest Year"
                                    value={form.data.year}
                                    onChange={(v) => form.setData('year', v)}
                                    options={fiscalYears}
                                    required
                                />
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Total Interest Amount (৳)</label>
                                    <Input
                                        type="number"
                                        step="1"
                                        min="1"
                                        value={form.data.total_interest}
                                        onChange={(e) => form.setData('total_interest', e.target.value)}
                                        className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Posting Date</label>
                                    <Input
                                        type="date"
                                        value={form.data.transaction_date}
                                        onChange={(e) => form.setData('transaction_date', e.target.value)}
                                        className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Notes & Remarks</label>
                                <Textarea
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    rows={2}
                                    placeholder="Provide description..."
                                    className="text-xs border-zinc-200 focus-visible:ring-emerald-500 resize-none p-2 min-h-[50px]"
                                />
                            </div>
                            {(form.errors.total_interest || form.errors.year) && (
                                <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 font-medium">
                                    {form.errors.total_interest || form.errors.year}
                                </p>
                            )}
                            <div className="flex items-center gap-1.5 pt-1">
                                <Button type="submit" variant="outline" size="sm" className="h-8 text-xs px-3 rounded border-zinc-200" disabled={form.processing}>
                                    <Calculator className="mr-1.5 h-3.5 w-3.5 text-zinc-500" /> Preview Distribution
                                </Button>
                                {preview && !preview.already_posted && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
                                        disabled={form.processing}
                                        onClick={submitPost}
                                    >
                                        <Save className="mr-1.5 h-3.5 w-3.5" /> Post Interest for {preview.year_label ?? formatFiscalYear(preview.year)}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {preview && (
                <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                    <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                                Distribution Preview — {preview.year_label ?? formatFiscalYear(preview.year)}
                            </CardTitle>
                            {preview.already_posted ? (
                                <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-800 border border-amber-100">
                                    Already posted
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-800 border border-emerald-100">
                                    Ready to post
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-zinc-400">
                            Pool: <strong className="text-zinc-700">{fmt(preview.total_interest)}</strong> · Distributed: <strong className="text-zinc-700">{fmt(preview.distributed_interest ?? preview.total_interest)}</strong>
                            {preview.fund_total_before != null && preview.expected_fund_total_after != null ? (
                                <>
                                    {' '}· Fund now: <strong className="text-zinc-700">{fmt(preview.fund_total_before)}</strong> → after post: <strong className="text-emerald-700">{fmt(preview.expected_fund_total_after)}</strong>
                                </>
                            ) : (
                                <> · PF fund total: <strong className="text-zinc-700">{fmt(preview.total_pf_balance)}</strong></>
                            )}
                            {' '}· Rate: <strong className="text-zinc-700">{fmtInterestPercent(preview.interest_percent)}</strong> on balance · <strong className="text-zinc-700">{preview.employee_count}</strong> employees
                        </p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50 border-b border-zinc-200/60">
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pl-3">Employee</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">PF Balance</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Interest %</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Interest Amount</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Own (50%)</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right pr-3">Org (50%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.rows.map((r) => (
                                        <TableRow key={r.employee_id} className="hover:bg-emerald-50/10 border-b border-zinc-100/80 transition-colors">
                                            <TableCell className="pl-3 py-1.5 font-medium text-zinc-800">{r.label}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmt(r.pf_balance)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmtInterestPercent(r.interest_percent)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums font-bold text-emerald-600">{fmt(r.interest_total)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-650">{fmt(r.own_amount)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-650 pr-3">{fmt(r.org_amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {previewTotals && (
                                        <TableRow className="bg-zinc-50/80 font-bold border-t border-zinc-200">
                                            <TableCell colSpan={2} className="pl-3 py-2 text-zinc-700 uppercase text-[9px] tracking-wider">Total Sum</TableCell>
                                            <TableCell className="text-right py-2 tabular-nums text-zinc-700">{fmtInterestPercent(preview.interest_percent)}</TableCell>
                                            <TableCell className="text-right py-2 tabular-nums text-emerald-700">{fmt(previewTotals.interest)}</TableCell>
                                            <TableCell className="text-right py-2 tabular-nums text-zinc-800">{fmt(previewTotals.own)}</TableCell>
                                            <TableCell className="text-right py-2 tabular-nums text-zinc-800 pr-3">{fmt(previewTotals.org)}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Past Runs Table */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50">
                    <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Past Interest Postings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {pastRuns.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-zinc-500">No interest posted yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50 border-b border-zinc-200/60">
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pl-3">Year</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Total Interest</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Fund Balance (at post)</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Employees</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Date</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Posted By</TableHead>
                                        {canEdit && (
                                            <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right pr-3">Action</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pastRuns.map((r) => (
                                        <TableRow key={r.id} className="hover:bg-emerald-50/10 border-b border-zinc-100/80 transition-colors">
                                            <TableCell className="pl-3 py-1.5 font-bold text-zinc-700">{r.interest_year_label}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-800">{fmt(r.total_interest)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmt(r.total_pf_balance)}</TableCell>
                                            <TableCell className="text-right py-1.5 text-zinc-600">{r.employee_count}</TableCell>
                                            <TableCell className="py-1.5 text-zinc-500 whitespace-nowrap">{r.transaction_date}</TableCell>
                                            <TableCell className="py-1.5 text-zinc-500">
                                                {r.created_by || '—'}
                                                {r.created_at ? ` · ${r.created_at}` : ''}
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell className="py-1.5 text-right pr-3">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[10px] px-2 border-red-200 text-red-700 hover:bg-red-50"
                                                        onClick={() => rollbackRun(r)}
                                                    >
                                                        <RotateCcw className="mr-1 h-3 w-3" /> Rollback
                                                    </Button>
                                                </TableCell>
                                            )}
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
