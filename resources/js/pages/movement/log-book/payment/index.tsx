import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartKm, formatSmartNumber } from '@/lib/format-smart-number';
import { cn } from '@/lib/utils';
import { LogBookScopeTabs } from '@/components/log-book-scope-tabs';
import { format } from 'date-fns';
import {
    Banknote,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Filter,
    Hourglass,
    PlayCircle,
    Printer,
    RefreshCcw,
    Search,
    ThumbsUp,
    Trash2,
    Wallet,
    X,
    XCircle,
} from 'lucide-react';

interface Employee extends EmployeeNameFields {
    id: number;
    pin?: string | null;
    employee_id: string;
    branch?: { id: number; name: string } | null;
}

interface Payment {
    id: number;
    voucher_no: string | null;
    period_year: number;
    period_month: number;
    total_official_km: string | number;
    km_limit?: string | number | null;
    billed_official_km?: string | number | null;
    rate_per_km: string | number;
    total_amount: string | number;
    entry_count: number;
    status: 'pending' | 'recommended' | 'approved' | 'rejected';
    approval_scope: 'head_office' | 'branch';
    employee: Employee;
    can_recommend?: boolean;
    can_approve?: boolean;
    can_reject?: boolean;
    can_delete?: boolean;
    next_action_label?: string | null;
    processed_at?: string | null;
    recommended_at?: string | null;
    approved_at?: string | null;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from: number | null;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
}

interface Props {
    payments: {
        data: Payment[];
        meta?: PaginationMeta;
        links?: { first: string; last: string; prev: string | null; next: string | null };
    };
    summary: { total: number; pending: number; recommended?: number; approved: number; rejected: number; totalAmount: number; pendingAmount: number };
    filters: Record<string, string | undefined>;
    ratePerKm: number;
    canProcess: boolean;
    userLimitInfo?: { eligible: boolean; km_limit: number | null; role_label: string; ineligible_reason: string | null } | null;
    canDelete?: boolean;
    scopeView?: 'mine' | 'team';
    showScopeTabs?: boolean;
    viewerEmployeeId?: number;
}

function statusBadge(status: string) {
    if (status === 'approved') return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">Paid</Badge>;
    if (status === 'recommended') return <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">Recommended</Badge>;
    if (status === 'rejected') return <Badge className="border-red-200 bg-red-50 text-red-700" variant="outline">Rejected</Badge>;
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">Pending</Badge>;
}

function canPrintVoucher(row: Payment) {
    return row.status === 'pending' || row.status === 'recommended' || row.status === 'approved';
}

function openVoucher(id: number) {
    window.open(route('movement-log-book-payments.voucher', id), '_blank');
}

function monthLabel(year: number, month: number) {
    return format(new Date(year, month - 1, 1), 'MMM yyyy');
}

function shortDate(value?: string | null) {
    if (!value) return '—';
    return format(new Date(value), 'dd/MM/yy');
}

function CompactDate({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="leading-tight">
            <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
            <span className="text-[11px] tabular-nums text-slate-700">{shortDate(value)}</span>
        </div>
    );
}

function PaymentActions({ row, compact = false }: { row: Payment; compact?: boolean }) {
    const handleRecommend = () => {
        if (!confirm(`Recommend log book payment for ${employeeDisplayName(row.employee)}?`)) return;
        router.post(route('movement-log-book-payments.recommend', row.id), {}, { preserveScroll: true, preserveState: true });
    };
    const handleApprove = () => {
        if (!confirm(`Approve payment for ${employeeDisplayName(row.employee)}?`)) return;
        router.post(route('movement-log-book-payments.approve', row.id), {}, { preserveScroll: true, preserveState: true });
    };
    const handleReject = () => {
        const reason = prompt('Rejection reason (required):');
        if (!reason?.trim()) return;
        router.post(route('movement-log-book-payments.reject', row.id), { approval_remarks: reason.trim() }, { preserveScroll: true, preserveState: true });
    };
    const handleDelete = () => {
        if (!confirm(`Delete log book payment for ${employeeDisplayName(row.employee)} (${monthLabel(row.period_year, row.period_month)})?\n\nUnpaid entries will be restored.`)) return;
        router.delete(route('movement-log-book-payments.destroy', row.id), { preserveScroll: true, preserveState: true });
    };

    const btn = compact ? 'h-7 w-7' : 'h-8 w-8';

    return (
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className={`${btn} rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700`} title="View" onClick={() => router.get(route('movement-log-book-payments.show', row.id))}>
                <Eye className="h-4 w-4" />
            </Button>
            {canPrintVoucher(row) && (
                <Button variant="ghost" size="icon" className={`${btn} rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200`} title="Print voucher" onClick={() => openVoucher(row.id)}>
                    <Printer className="h-4 w-4" />
                </Button>
            )}
            {row.can_recommend && (
                <Button size="sm" className="h-7 bg-sky-600 px-2 text-[10px] hover:bg-sky-700" onClick={handleRecommend}>
                    <ThumbsUp className="mr-1 h-3 w-3" /> Recommend
                </Button>
            )}
            {row.can_approve && (
                <Button size="sm" className="h-7 bg-emerald-600 px-2 text-[10px] hover:bg-emerald-700" onClick={handleApprove}>
                    <Check className="mr-1 h-3 w-3" /> Approve
                </Button>
            )}
            {row.can_reject && (
                <Button variant="ghost" size="icon" className={`${btn} rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700`} title="Reject" onClick={handleReject}>
                    <XCircle className="h-4 w-4" />
                </Button>
            )}
            {row.can_delete && (
                <Button variant="ghost" size="icon" className={`${btn} rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700`} title="Delete payment" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

export default function LogBookPaymentIndex({ payments, summary, filters, ratePerKm, canProcess, userLimitInfo, scopeView = 'team', showScopeTabs = false }: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [periodYear, setPeriodYear] = useState(filters.period_year || '');
    const [periodMonth, setPeriodMonth] = useState(filters.period_month || '');
    const [processYear, setProcessYear] = useState(String(new Date().getFullYear()));
    const [processMonth, setProcessMonth] = useState(String(new Date().getMonth() + 1));
    const [perPage, setPerPage] = useState(filters.per_page || '10');
    const [showFilters, setShowFilters] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    const years = useMemo(() => {
        const y = new Date().getFullYear();
        return [y, y - 1, y - 2, y - 3, y - 4];
    }, []);

    const buildParams = (overrides: Record<string, string> = {}) => {
        const p: Record<string, string> = { ...overrides };
        const nextSearch = 'search' in overrides ? overrides.search : search;
        const nextStatus = 'status' in overrides ? overrides.status : status;
        const nextYear = 'period_year' in overrides ? overrides.period_year : periodYear;
        const nextMonth = 'period_month' in overrides ? overrides.period_month : periodMonth;
        const nextPerPage = 'per_page' in overrides ? overrides.per_page : perPage;

        if (nextSearch) p.search = nextSearch;
        else delete p.search;
        if (nextStatus && nextStatus !== 'all') p.status = nextStatus;
        else delete p.status;
        if (nextYear && nextYear !== 'all') p.period_year = nextYear;
        else delete p.period_year;
        if (nextMonth && nextMonth !== 'all') p.period_month = nextMonth;
        else delete p.period_month;
        if (nextPerPage && nextPerPage !== '10') p.per_page = nextPerPage;
        else delete p.per_page;
        if (showScopeTabs) p.view = scopeView;
        delete p.page;
        return p;
    };

    const applyFilters = (overrides: Record<string, string> = {}) => {
        router.get(route('movement-log-book-payments.index'), buildParams(overrides), { preserveState: true });
    };

    const handleSearch = () => applyFilters();

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        applyFilters({ per_page: value });
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('');
        setPeriodYear('');
        setPeriodMonth('');
        setShowFilters(false);
        setFilterSheetOpen(false);
        router.get(route('movement-log-book-payments.index'), {
            ...(perPage && perPage !== '10' ? { per_page: perPage } : {}),
            ...(showScopeTabs ? { view: scopeView } : {}),
        }, { preserveState: true });
    };

    const applyStatus = (next: string) => {
        const value = status === next ? '' : next;
        setStatus(value);
        applyFilters({ status: value });
    };

    const activeFilterCount = useMemo(
        () => [search, status && status !== 'all', periodYear && periodYear !== 'all', periodMonth && periodMonth !== 'all'].filter(Boolean).length,
        [search, status, periodYear, periodMonth],
    );
    const hasActiveFilters = activeFilterCount > 0;
    const hasPagination = Boolean(payments.meta && payments.links);
    const showProcess = canProcess && (!showScopeTabs || scopeView === 'mine');

    const handleProcess = () => {
        if (!confirm(`Process your log book payment for ${monthLabel(Number(processYear), Number(processMonth))}? All unpaid entries up to this month (including previous unpaid) will be included at ৳${ratePerKm}/km.`)) return;
        router.post(route('movement-log-book-payments.process'), {
            period_year: processYear,
            period_month: processMonth,
        });
    };

    const periodSummary = periodYear && periodMonth && periodYear !== 'all' && periodMonth !== 'all'
        ? monthLabel(Number(periodYear), Number(periodMonth))
        : periodYear && periodYear !== 'all'
            ? periodYear
            : periodMonth && periodMonth !== 'all'
                ? format(new Date(2024, Number(periodMonth) - 1, 1), 'MMMM')
                : 'All periods';

    const filterFields = (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={status || 'all'} onValueChange={setStatus}>
                <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="in_process">In process</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>
            <Select value={periodMonth || 'all'} onValueChange={setPeriodMonth}>
                <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>{format(new Date(2024, m - 1, 1), 'MMMM')}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={periodYear || 'all'} onValueChange={setPeriodYear}>
                <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <Layout>
            <Head title="Log Book Payment" />
            <PageSurface className="max-w-none px-3 sm:px-4 md:px-6">
                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <div className="mb-3 flex flex-col gap-2.5 border-b border-slate-200 pb-3 md:mb-4 md:pb-4">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 md:text-2xl">Log Book Payment</h1>
                            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                                {showScopeTabs && scopeView === 'mine'
                                    ? `Process your month: unpaid carry-forward × ৳${ratePerKm}/km${userLimitInfo?.km_limit ? ` (Limit: ${userLimitInfo.km_limit} KM)` : userLimitInfo?.eligible ? ' (No limit)' : ''}`
                                    : showScopeTabs
                                        ? 'Team payments — recommend pending, then approve recommended'
                                        : `Monthly log book payment × ৳${ratePerKm}/km`}
                            </p>
                            {userLimitInfo && !userLimitInfo.eligible && (
                                <p className="mt-1 inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                    {userLimitInfo.ineligible_reason || 'Officers and lower staff are not eligible for log book payment.'}
                                </p>
                            )}
                        </div>
                        {showProcess && (
                            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
                                <Select value={processMonth} onValueChange={setProcessMonth}>
                                    <SelectTrigger className="h-9 border-slate-200 text-xs sm:w-[110px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <SelectItem key={m} value={String(m)}>{format(new Date(2024, m - 1, 1), 'MMM')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={processYear} onValueChange={setProcessYear}>
                                    <SelectTrigger className="h-9 border-slate-200 text-xs sm:w-[90px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button className="h-9 bg-emerald-600 px-3 text-xs hover:bg-emerald-700" onClick={handleProcess}>
                                    <PlayCircle className="mr-1 h-4 w-4 shrink-0" /> Process
                                </Button>
                            </div>
                        )}
                    </div>
                    <LogBookScopeTabs
                        view={scopeView}
                        showTabs={showScopeTabs}
                        indexRoute={route('movement-log-book-payments.index')}
                        filterParams={buildParams()}
                        mineLabel="My Payment"
                        teamLabel="Team"
                    />
                </div>

                <div className="mb-2 flex items-baseline gap-2">
                    <h2 className="text-sm font-semibold text-slate-700">{periodSummary}</h2>
                    <span className="text-xs text-slate-400">Summary</span>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800">
                            <X className="mr-1 h-3.5 w-3.5" /> Reset
                        </Button>
                    )}
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 md:mb-4">
                    {[
                        { key: '', label: 'Total', value: summary.total, icon: Wallet, color: 'text-slate-700', bg: 'bg-slate-50' },
                        { key: 'pending', label: 'Pending', value: summary.pending, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
                        { key: 'recommended', label: 'Recommended', value: summary.recommended ?? 0, icon: Hourglass, color: 'text-sky-700', bg: 'bg-sky-50' },
                        { key: 'paid', label: 'Paid', value: summary.approved, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                        { key: 'paid-amount', label: 'Paid Amount', value: `৳${formatSmartNumber(summary.totalAmount)}`, icon: Banknote, color: 'text-emerald-700', bg: 'bg-emerald-50', raw: true },
                        { key: 'in_process', label: 'In Process', value: `৳${formatSmartNumber(summary.pendingAmount)}`, icon: Hourglass, color: 'text-amber-700', bg: 'bg-amber-50', raw: true },
                    ].map((card) => {
                        const clickable = card.key !== 'paid-amount';
                        const active = clickable && ((card.key === '' && !status) || status === card.key);
                        return (
                            <button
                                key={card.label}
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && applyStatus(card.key)}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                                    card.bg,
                                    clickable ? 'hover:border-emerald-300' : 'cursor-default',
                                    active ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200',
                                )}
                            >
                                <card.icon className={cn('h-4 w-4 shrink-0', card.color)} />
                                <div className="min-w-0">
                                    <p className="truncate text-[11px] font-medium text-slate-500">{card.label}</p>
                                    <p className={cn('truncate text-sm font-bold', card.color)}>
                                        {'raw' in card ? card.value : card.value.toLocaleString()}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 md:px-4 md:py-2.5">
                        <form
                            className="relative min-w-0 flex-1"
                            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                        >
                            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search employee, PIN, voucher..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 rounded-lg border-slate-200 bg-slate-50/80 pr-8 pl-8 text-sm focus-visible:ring-emerald-500 md:h-9"
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => { setSearch(''); applyFilters({ search: '' }); }}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </form>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                                'relative h-8 w-8 shrink-0 rounded-lg border-slate-200 md:hidden',
                                (filterSheetOpen || activeFilterCount > 0) && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setFilterSheetOpen(true)}
                            title="Filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{activeFilterCount}</span>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                                'relative hidden h-9 w-9 shrink-0 rounded-lg border-slate-200 md:inline-flex',
                                showFilters && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setShowFilters((v) => !v)}
                            title="Toggle filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && !showFilters && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{activeFilterCount}</span>
                            )}
                        </Button>

                        <Button type="button" size="sm" className="hidden h-9 shrink-0 bg-emerald-600 px-3 hover:bg-emerald-700 sm:inline-flex" onClick={handleSearch}>
                            <Search className="mr-1 h-4 w-4" /> Search
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="hidden border-b border-slate-100 bg-slate-50/40 px-4 py-3 md:block">
                            {filterFields}
                            <div className="mt-3 flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8" onClick={resetFilters}>
                                    <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Reset
                                </Button>
                                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSearch}>
                                    <Search className="mr-1 h-3.5 w-3.5" /> Apply
                                </Button>
                            </div>
                        </div>
                    )}

                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl px-4 pb-6">
                            <SheetHeader className="text-left">
                                <SheetTitle>Filter payments</SheetTitle>
                                <SheetDescription>Filter by status, month, and year.</SheetDescription>
                            </SheetHeader>
                            <div className="mt-4 py-1">{filterFields}</div>
                            <SheetFooter className="mt-4 flex flex-row gap-2 sm:justify-stretch">
                                <Button variant="outline" className="flex-1" onClick={resetFilters}>Reset</Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleSearch(); setFilterSheetOpen(false); }}>
                                    Apply filters
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    <div className="space-y-3 p-3 md:hidden">
                        {payments.data.length > 0 ? (
                            payments.data.map((row) => (
                                <div key={row.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900">{employeeDisplayName(row.employee)}</div>
                                            <div className="text-xs text-slate-500">{row.employee.branch?.name || '—'} · {row.entry_count} entries</div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {statusBadge(row.status)}
                                            {row.next_action_label && (row.status === 'pending' || row.status === 'recommended') && (
                                                <p className="mt-1 max-w-[140px] text-[10px] leading-tight text-slate-500">{row.next_action_label}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-50 p-2 text-center">
                                        <CompactDate label="Process" value={row.processed_at} />
                                        <CompactDate label="Recommend" value={row.recommended_at} />
                                        <CompactDate label="Paid" value={row.approved_at} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-50 p-2 text-center">
                                        <div>
                                            <span className="block text-[9px] font-bold uppercase text-slate-400">Period</span>
                                            <span className="text-[11px] font-semibold text-slate-800">{monthLabel(row.period_year, row.period_month)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] font-bold uppercase text-slate-400">Official KM</span>
                                            <span className="block text-[11px] font-semibold text-slate-800">{formatSmartKm(row.total_official_km)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] font-bold uppercase text-slate-400">Amount</span>
                                            <span className="text-xs font-bold text-emerald-700">৳{formatSmartNumber(row.total_amount)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                                        <div className="text-[10px] text-slate-500">
                                            Voucher: <span className="font-mono font-medium text-slate-700">{row.voucher_no || (row.status === 'approved' ? '—' : 'Draft')}</span>
                                        </div>
                                        <PaymentActions row={row} compact />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
                                No payment records found.
                                {hasActiveFilters && (
                                    <Button variant="link" onClick={resetFilters} className="px-2 font-normal">Clear filters</Button>
                                )}
                            </div>
                        )}
                    </div>

                    <CardContent className="hidden p-0 md:block">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                        <TableHead className="h-11 pl-6 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Month</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Employee</TableHead>
                                        <TableHead className="h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Official KM</TableHead>
                                        <TableHead className="h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Rate</TableHead>
                                        <TableHead className="h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Amount</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Status</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Process</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Recommend</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Paid</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Voucher</TableHead>
                                        <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.data.length > 0 ? (
                                        payments.data.map((row) => (
                                            <TableRow key={row.id} className="group border-b border-slate-100 transition-colors hover:bg-slate-50">
                                                <TableCell className="whitespace-nowrap pl-6 text-[13px] text-slate-600">{monthLabel(row.period_year, row.period_month)}</TableCell>
                                                <TableCell>
                                                    <Link href={route('movement-log-book-payments.show', row.id)} className="block text-[13px] font-semibold text-slate-800 hover:text-emerald-600">
                                                        {employeeDisplayName(row.employee)}
                                                    </Link>
                                                    <div className="text-xs text-slate-500">{row.employee.branch?.name || '—'} · {row.entry_count} entries</div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right text-[13px] text-slate-700">
                                                    <div>{formatSmartKm(row.total_official_km)}</div>
                                                    {row.billed_official_km != null && Number(row.billed_official_km) < Number(row.total_official_km) && (
                                                        <div className="text-[11px] font-semibold text-amber-600">Billed: {formatSmartKm(row.billed_official_km)}</div>
                                                    )}
                                                    {row.km_limit != null && (
                                                        <div className="text-[10px] text-slate-400">Limit: {formatSmartKm(row.km_limit)}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right text-[13px] text-slate-600">৳{formatSmartNumber(row.rate_per_km)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-right text-[13px] font-semibold text-emerald-700">৳{formatSmartNumber(row.total_amount)}</TableCell>
                                                <TableCell>
                                                    <div>{statusBadge(row.status)}</div>
                                                    {row.next_action_label && (row.status === 'pending' || row.status === 'recommended') && (
                                                        <p className="mt-0.5 max-w-[180px] text-[10px] leading-tight text-slate-500">{row.next_action_label}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-[11px] tabular-nums text-slate-600">{shortDate(row.processed_at)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-[11px] tabular-nums text-slate-600">{shortDate(row.recommended_at)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-[11px] tabular-nums text-slate-600">{shortDate(row.approved_at)}</TableCell>
                                                <TableCell className="font-mono text-[13px]">
                                                    {canPrintVoucher(row) ? (
                                                        <button type="button" className="text-emerald-700 underline-offset-2 hover:underline" onClick={() => openVoucher(row.id)}>
                                                            {row.voucher_no || 'Pending'}
                                                        </button>
                                                    ) : (
                                                        row.voucher_no || '—'
                                                    )}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <PaymentActions row={row} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={11} className="h-24 text-center text-sm text-slate-500">
                                                No payment records found.
                                                {hasActiveFilters && (
                                                    <Button variant="link" onClick={resetFilters} className="px-2 font-normal">Clear filters</Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    {hasPagination && payments.meta && (
                        <div className="flex flex-col gap-4 rounded-b-xl border-t border-slate-200 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                    <span className="hidden sm:inline">Rows per page:</span>
                                    <Select value={perPage} onValueChange={handlePerPageChange}>
                                        <SelectTrigger className="h-8 w-[70px] border-slate-200 bg-white text-[13px]">
                                            <SelectValue placeholder="10" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-[13px] text-slate-500">
                                    Showing{' '}
                                    <span className="font-semibold text-slate-700">{payments.meta.total > 0 ? (payments.meta.current_page - 1) * payments.meta.per_page + 1 : 0}</span>
                                    {' '}to{' '}
                                    <span className="font-semibold text-slate-700">{Math.min(payments.meta.current_page * payments.meta.per_page, payments.meta.total)}</span>
                                    {' '}of <span className="font-semibold text-slate-700">{payments.meta.total}</span> entries
                                </p>
                            </div>

                            {payments.meta.last_page > 1 && (
                                <div className="flex items-center justify-center sm:justify-end">
                                    <nav className="isolate inline-flex gap-1.5" aria-label="Pagination">
                                        {payments.meta.current_page > 1 && payments.links?.prev && (
                                            <Link href={payments.links.prev} preserveState className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600">
                                                <span className="sr-only">Previous</span>
                                                <ChevronLeft className="h-4 w-4" />
                                            </Link>
                                        )}
                                        {payments.meta.links.slice(1, -1).map((link, i) => {
                                            if (link.label === '...') {
                                                return <span key={i} className="relative inline-flex h-8 w-8 items-center justify-center text-[13px] font-medium text-slate-400">...</span>;
                                            }
                                            return (
                                                <Link
                                                    key={i}
                                                    href={link.url || '#'}
                                                    preserveState
                                                    className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm ${
                                                        link.active
                                                            ? 'z-10 border border-emerald-600 bg-emerald-600 text-white'
                                                            : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        })}
                                        {payments.meta.current_page < payments.meta.last_page && payments.links?.next && (
                                            <Link href={payments.links.next} preserveState className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600">
                                                <span className="sr-only">Next</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        )}
                                    </nav>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </PageSurface>
        </Layout>
    );
}
