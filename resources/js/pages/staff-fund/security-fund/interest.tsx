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
    Calculator,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Coins,
    PiggyBank,
    TrendingUp,
    Search,
    BookOpen,
    Send,
    ShieldCheck,
    RotateCcw,
    Calendar,
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
import { Errors, SecurityFundPolicyBanner, Summary } from './components';

type Props = {
    cutoffDate: string;
    rows: (Partial<FundSnapshot> & {
        id: number;
        pin: string;
        name: string;
        branch?: string;
        review_required?: string;
    })[];
    summary: FundSnapshot & { review_count: number; account_count?: number };
    fingerprint: string;
    canEdit: boolean;
};

export default function SecurityFundInterest({ cutoffDate, rows, summary, fingerprint, canEdit }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'eligible' | 'ineligible'>('all');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const form = useForm({
        cutoff_date: cutoffDate,
        fingerprint,
        idempotency_key: fundRequestKey(),
    });

    useEffect(() => {
        form.setData({
            cutoff_date: cutoffDate,
            fingerprint,
            idempotency_key: fundRequestKey(),
        });
    }, [cutoffDate, fingerprint]);

    // Calculate quick stats from rows
    const stats = useMemo(() => {
        let eligibleCount = 0;
        let ineligibleCount = 0;
        let reviewCount = 0;

        for (const r of rows) {
            if (r.review_required) {
                reviewCount++;
            } else if (Number(r.unposted_interest || 0) > 0) {
                eligibleCount++;
            } else {
                ineligibleCount++;
            }
        }

        return { eligibleCount, ineligibleCount, reviewCount, total: rows.length };
    }, [rows]);

    // Filter rows by search and tab
    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            const matchesSearch =
                !searchQuery.trim() ||
                r.pin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.branch && r.branch.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (filterTab === 'eligible') {
                return !r.review_required && Number(r.unposted_interest || 0) > 0;
            }
            if (filterTab === 'ineligible') {
                return !r.review_required && Number(r.unposted_interest || 0) <= 0;
            }

            return true;
        });
    }, [rows, searchQuery, filterTab]);

    const handlePreviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            staffFundPath('/security-fund/interest'),
            { cutoff_date: form.data.cutoff_date },
            { preserveState: true }
        );
    };

    const handlePostSubmit = () => {
        form.post(staffFundPath('/security-fund/interest'), {
            onSuccess: () => {
                setShowConfirmModal(false);
            },
        });
    };

    // Quick cutoff date helpers
    const setCutoffToday = () => {
        form.setData('cutoff_date', fundToday());
    };

    const setCutoffEndOfLastMonth = () => {
        const today = new Date();
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayLastMonth = new Date(firstDayThisMonth.getTime() - 24 * 60 * 60 * 1000);
        const y = lastDayLastMonth.getFullYear();
        const m = String(lastDayLastMonth.getMonth() + 1).padStart(2, '0');
        const d = String(lastDayLastMonth.getDate()).padStart(2, '0');
        form.setData('cutoff_date', `${y}-${m}-${d}`);
    };

    const isCutoffChanged = form.data.cutoff_date !== cutoffDate;
    const canPost =
        canEdit &&
        !isCutoffChanged &&
        Number(summary.unposted_interest) > 0 &&
        summary.review_count === 0 &&
        !form.processing;

    return (
        <StaffFundLayout
            title="Security Fund Interest Calculation"
            description="Preview and post 6% yearly simple interest on deposits held for at least one year. Only complete calendar months count."
            activeTab="security-interest"
        >
            <Head title="Security Fund Interest" />

            <div className="space-y-3">
                {/* 1. Header Navigation & Quick Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>Cutoff Date (হিসাব সীমা):</span>
                        <Badge variant="outline" className="border-emerald-250 bg-emerald-50 text-emerald-800 font-mono font-bold text-xs px-2 py-0.5">
                            {fundDisplayDate(cutoffDate)}
                        </Badge>
                        <span className="text-[10px] text-zinc-400">({fundDisplayDateReadable(cutoffDate)})</span>
                    </div>
                </div>

                {/* 2. Top Summary KPI Cards */}
                <Summary values={summary} />

                {/* 3. Review Alert Banner if applicable */}
                {summary.review_count > 0 && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 shadow-2xs"
                    >
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="font-semibold">
                                {summary.review_count} Account(s) Require Date Correction Before Posting Interest
                            </p>
                            <p className="text-rose-700 text-[11px]">
                                Accounts flagged with conflicting or unverified dates must be reviewed and resolved before interest can be posted to the ledger.
                            </p>
                        </div>
                    </div>
                )}

                {/* 4. Policy Banner */}
                <SecurityFundPolicyBanner />

                {/* 5. Cutoff Date Selector & Preview Bar */}
                <Card className="overflow-hidden border border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                    <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
                            <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Select Cutoff Date (সুদ গণনার শেষ তারিখ)</span>
                        </CardTitle>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <span>Ready to post:</span>
                            <span className="font-mono font-bold text-emerald-700 text-xs">
                                ৳ {fundInterest(summary.unposted_interest)}
                            </span>
                            <span>({stats.eligibleCount} employees)</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3">
                        <form onSubmit={handlePreviewSubmit} className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-zinc-700 block">
                                    Interest Cutoff Date (গণনার শেষ তারিখ) <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        required
                                        max={fundToday()}
                                        value={form.data.cutoff_date}
                                        onChange={(e) => form.setData('cutoff_date', e.target.value)}
                                        className="h-8.5 w-44 text-xs border-zinc-200 rounded"
                                    />
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={setCutoffEndOfLastMonth}
                                            className="h-8.5 px-2 text-[11px] border-zinc-200 bg-white hover:bg-zinc-50"
                                        >
                                            End of Last Month
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={setCutoffToday}
                                            className="h-8.5 px-2 text-[11px] border-zinc-200 bg-white hover:bg-zinc-50"
                                        >
                                            Today
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-zinc-400">
                                    Bangladeshi format: <strong>{fundDisplayDate(form.data.cutoff_date)}</strong> ({fundDisplayDateReadable(form.data.cutoff_date)})
                                </p>
                            </div>

                            <Button
                                type="submit"
                                size="sm"
                                className="h-8.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-4 rounded shadow-2xs"
                            >
                                <Calculator className="mr-1.5 h-3.5 w-3.5" />
                                Preview Interest Calculation
                            </Button>

                            {isCutoffChanged && (
                                <p className="text-[11px] text-amber-700 font-medium">
                                    ⚠️ Cutoff date modified. Click "Preview" to recalculate before posting.
                                </p>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* Validation Errors */}
                <Errors errors={form.errors} />

                {/* 6. Ready-to-Post Information Callout */}
                <div className="rounded-lg border border-emerald-150 bg-gradient-to-r from-emerald-50/80 via-emerald-50/50 to-white p-3.5 text-xs text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                                ৳
                            </span>
                            <span className="font-bold text-sm text-emerald-900">
                                Total New Interest Calculated:{' '}
                                <span className="font-mono text-base font-extrabold text-emerald-800">
                                    ৳ {fundInterest(summary.unposted_interest)}
                                </span>
                            </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 leading-relaxed">
                            Calculated up to <strong>{fundDisplayDate(cutoffDate)}</strong> ({fundDisplayDateReadable(cutoffDate)}).
                            Qualifying employees: <strong>{stats.eligibleCount}</strong> · Under 1-year tenure: <strong>{stats.ineligibleCount}</strong>.
                            Incomplete final month is excluded (e.g. 30 December counts through November).
                        </p>
                    </div>

                    {canEdit && (
                        <Button
                            size="sm"
                            disabled={!canPost}
                            onClick={() => setShowConfirmModal(true)}
                            className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded shadow-xs whitespace-nowrap"
                        >
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                            Post Previewed Interest
                        </Button>
                    )}
                </div>

                {/* 7. Preview Table Card */}
                <Card className="overflow-hidden border border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                    <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        {/* Table Tabs / Filters */}
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFilterTab('all')}
                                className={cn(
                                    'h-7 text-[11px] border-zinc-200 bg-white rounded',
                                    filterTab === 'all' && 'bg-zinc-800 text-white border-zinc-800 hover:bg-zinc-900 hover:text-white'
                                )}
                            >
                                All Accounts ({rows.length})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFilterTab('eligible')}
                                className={cn(
                                    'h-7 text-[11px] border-zinc-200 bg-white rounded',
                                    filterTab === 'eligible' && 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white'
                                )}
                            >
                                Eligible &gt; 0 ({stats.eligibleCount})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFilterTab('ineligible')}
                                className={cn(
                                    'h-7 text-[11px] border-zinc-200 bg-white rounded',
                                    filterTab === 'ineligible' && 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 hover:text-white'
                                )}
                            >
                                Under 1 Year ({stats.ineligibleCount})
                            </Button>
                        </div>

                        {/* Search in preview table */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                            <Input
                                placeholder="Search preview list..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-7 text-xs pl-8 border-zinc-200 rounded"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </CardHeader>

                    <div className="overflow-x-auto">
                        <Table className="w-full text-xs">
                            <TableHeader className="bg-zinc-50/80 border-b border-zinc-200">
                                <TableRow>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                        Employee Info (কর্মী)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                        Holding Status & Cutoff (ধারণকাল ও সীমা)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Principal (মূল জমা)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Posted Unpaid (পূর্বের জমা সুদ)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-emerald-800 text-right whitespace-nowrap">
                                        New Interest to Post (নতুন প্রদেয় সুদ)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Projected Total (মোট প্রদেয়)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Ledger
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.map((row) => {
                                    const hasNewInterest = Number(row.unposted_interest || 0) > 0;
                                    const projectedTotal =
                                        Number(row.principal || 0) +
                                        Number(row.posted_interest || 0) +
                                        Number(row.unposted_interest || 0);

                                    return (
                                        <TableRow
                                            key={row.id}
                                            className={cn(
                                                'hover:bg-zinc-50/70 border-b border-zinc-100 transition-colors',
                                                hasNewInterest && 'bg-emerald-50/20'
                                            )}
                                        >
                                            {/* Employee */}
                                            <TableCell className="py-2 px-3">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-zinc-900">{row.name}</span>
                                                        <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[10px] font-mono px-1 py-0 h-4">
                                                            {row.pin}
                                                        </Badge>
                                                    </div>
                                                    {row.branch && (
                                                        <p className="text-[10px] text-zinc-400 mt-0.5">{row.branch}</p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Holding Status & Cutoff Date (Bangladeshi Format: DD/MM/YYYY) */}
                                            <TableCell className="py-2 px-3">
                                                {row.review_required ? (
                                                    <span className="text-rose-700 text-[11px] font-medium">
                                                        {row.review_required}
                                                    </span>
                                                ) : row.next_eligibility_date ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 w-fit">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            Under 1 Year · Qualifies {fundDisplayDate(row.next_eligibility_date)}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400">
                                                            Deposit date: {fundDisplayDate(row.opened_on || row.interest_as_of)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                                                            <CheckCircle2 className="h-2.5 w-2.5" />
                                                            Full Eligibility Reached (&gt;1 Year)
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400 font-mono">
                                                            Cutoff: {fundDisplayDate(row.interest_as_of || cutoffDate)}
                                                        </span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Principal */}
                                            <TableCell className="py-2 px-3 text-right font-mono text-zinc-800 font-semibold">
                                                ৳ {fundMoney(row.principal)}
                                            </TableCell>

                                            {/* Posted Unpaid Interest */}
                                            <TableCell className="py-2 px-3 text-right font-mono text-zinc-600">
                                                ৳ {fundInterest(row.posted_interest)}
                                            </TableCell>

                                            {/* New Interest to Post */}
                                            <TableCell className="py-2 px-3 text-right font-mono font-bold">
                                                {hasNewInterest ? (
                                                    <span className="text-emerald-700 bg-emerald-100/70 border border-emerald-250 px-2 py-0.5 rounded">
                                                        + ৳ {fundInterest(row.unposted_interest)}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">৳ 0</span>
                                                )}
                                            </TableCell>

                                            {/* Projected Total */}
                                            <TableCell className="py-2 px-3 text-right font-mono font-semibold text-zinc-800">
                                                ৳ {fundMoney(projectedTotal)}
                                            </TableCell>

                                            {/* Ledger Link */}
                                            <TableCell className="py-2 px-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2 rounded font-medium"
                                                    asChild
                                                >
                                                    <Link href={staffFundPath(`/security-fund/${row.id}/ledger`)}>
                                                        <BookOpen className="mr-1 h-3 w-3" />
                                                        Ledger
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {!filteredRows.length && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-zinc-500">
                                            No matching accounts found for the current preview filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* 8. Confirmation Dialog Before Posting Interest */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                                <Send className="h-4 w-4" />
                            </span>
                            Confirm Security Fund Interest Posting
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Please review the calculation summary before permanently posting interest to employee ledgers.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 my-2 text-xs">
                        <div className="rounded-lg border border-emerald-150 bg-emerald-50/70 p-3 space-y-2 text-emerald-950">
                            <div className="flex justify-between items-center border-b border-emerald-200/50 pb-1.5">
                                <span className="text-zinc-600">Interest Cutoff Date (গণনার সীমা):</span>
                                <span className="font-mono font-bold text-emerald-900 text-xs">
                                    {fundDisplayDate(cutoffDate)} ({fundDisplayDateReadable(cutoffDate)})
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-emerald-200/50 pb-1.5">
                                <span className="text-zinc-600">Qualifying Employees (যোগ্য কর্মী):</span>
                                <span className="font-bold text-emerald-900">{stats.eligibleCount} Employees</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-emerald-200/50 pb-1.5">
                                <span className="text-zinc-600">Total Interest to Credit (মোট অর্জিত সুদ):</span>
                                <span className="font-mono font-extrabold text-emerald-800 text-sm">
                                    ৳ {fundInterest(summary.unposted_interest)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-0.5">
                                <span className="text-zinc-600">Total Fund Balance After Posting:</span>
                                <span className="font-mono font-bold text-zinc-900 text-xs">
                                    ৳ {fundMoney(summary.total)}
                                </span>
                            </div>
                        </div>

                        <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 space-y-1">
                            <p className="font-semibold flex items-center gap-1 text-amber-950">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                                Important Notice:
                            </p>
                            <p>
                                • This action creates an individual <strong>Interest Credit</strong> transaction in each eligible employee's Security Fund ledger.
                            </p>
                            <p>
                                • Previously posted interest is excluded to prevent duplicate distribution.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfirmModal(false)}
                            className="h-8 text-xs border-zinc-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={form.processing}
                            onClick={handlePostSubmit}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-4"
                        >
                            {form.processing ? 'Posting Interest...' : 'Yes, Post Interest Now'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </StaffFundLayout>
    );
}
