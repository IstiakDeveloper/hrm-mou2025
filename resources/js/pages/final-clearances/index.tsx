import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Layout from '@/layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, HandCoins, Plus, Printer, RotateCcw, Search, Trash2, Users, XCircle } from 'lucide-react';
import ClearanceDeleteDialog from './components/ClearanceDeleteDialog';
import { Card, CardContent } from '@/components/ui/card';
import React, { useState } from 'react';

type Row = {
    id: number;
    staff_id?: string | null;
    employee_name?: string | null;
    designation_name?: string | null;
    workplace?: string | null;
    status: string;
    status_label: string;
    net_payable?: string | number | null;
    initiator_name?: string | null;
    created_at?: string | null;
    can_act: boolean;
    sent_back_reason?: string | null;
};

type Paginator = {
    data: Row[];
    current_page: number;
    last_page: number;
    per_page?: number;
    total?: number;
    from?: number | null;
    to?: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};

const STATUSES = [
    { value: 'draft', label: 'Pending with Field' },
    { value: 'submitted_to_hr', label: 'Pending with HR' },
    { value: 'submitted_to_accounts', label: 'Pending with Accounts' },
    { value: 'submitted_to_director_fa', label: 'Pending with Director (F&A)' },
    { value: 'submitted_to_ed', label: 'Pending with Executive Director' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

function statusBadge(status: string, label: string) {
    const styles: Record<string, string> = {
        draft: 'bg-slate-100 text-slate-700 border-slate-200',
        submitted_to_hr: 'bg-purple-50 text-purple-800 border-purple-200',
        submitted_to_accounts: 'bg-amber-50 text-amber-800 border-amber-200',
        submitted_to_director_fa: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        submitted_to_ed: 'bg-sky-50 text-sky-800 border-sky-200',
        approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        rejected: 'bg-rose-50 text-rose-800 border-rose-200',
    };
    const dots: Record<string, string> = {
        draft: 'bg-slate-400',
        submitted_to_hr: 'bg-purple-500',
        submitted_to_accounts: 'bg-amber-500',
        submitted_to_director_fa: 'bg-indigo-500',
        submitted_to_ed: 'bg-sky-500',
        approved: 'bg-emerald-500',
        rejected: 'bg-rose-500',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${styles[status] ?? styles.draft}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[status] ?? dots.draft}`} />
            {label}
        </span>
    );
}

function money(value: unknown) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return '0.00';
    return amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SIGNATURE_REQUIRED = 'চূড়ান্ত ছাড়পত্রের কোনো কাজ করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।';

function blockWithoutSignature(userHasSignature: boolean) {
    if (userHasSignature) return false;
    alert(SIGNATURE_REQUIRED);
    window.location.href = '/settings/profile';
    return true;
}

export default function FinalClearanceIndex({
    clearances,
    filters,
    metrics = { total: 0, pending: 0, approved: 0, rejected: 0 },
    canCreate,
    userHasSignature = false,
    isSuperAdmin = false,
}: {
    clearances: Paginator;
    filters: { status?: string; search?: string; per_page?: string };
    metrics?: { total: number; pending: number; approved: number; rejected: number };
    canCreate: boolean;
    userHasSignature?: boolean;
    isSuperAdmin?: boolean;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [perPage, setPerPage] = useState(filters.per_page || '15');
    const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

    const apply = (next?: { search?: string; status?: string; per_page?: string }) => {
        const query: Record<string, string> = {};
        const nextSearch = next?.search !== undefined ? next.search : search;
        const nextStatus = next?.status !== undefined ? next.status : status;
        const nextPerPage = next?.per_page !== undefined ? next.per_page : perPage;
        if (nextSearch.trim()) query.search = nextSearch.trim();
        if (nextStatus && nextStatus !== 'all') query.status = nextStatus;
        if (nextPerPage && nextPerPage !== '15') query.per_page = nextPerPage;
        router.get('/final-clearances', query, { preserveState: true, replace: true });
    };

    const reset = () => {
        setSearch('');
        setStatus('all');
        setPerPage('15');
        router.get('/final-clearances', {}, { replace: true });
    };

    const total = clearances.total ?? clearances.data.length;
    const from = clearances.from ?? (clearances.data.length ? 1 : 0);
    const to = clearances.to ?? clearances.data.length;

    return (
        <Layout>
            <Head title="Final Payment & Clearance" />
            <div className="w-full space-y-3.5">
                <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-2xs sm:flex-row sm:items-center">
                    <div>
                        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <span>HR</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                            <span className="font-semibold text-emerald-700">Final Payment & Clearance</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                                <HandCoins className="h-4 w-4" />
                            </div>
                            <div>
                                <h1 className="text-base leading-tight font-bold tracking-tight text-slate-900">Final Payment & Clearance</h1>
                                <p className="text-[11px] text-slate-500">Dropped or inactive staff whose final payment is not paid yet.</p>
                            </div>
                        </div>
                    </div>
                    {canCreate ? (
                        <Link
                            href="/final-clearances/create"
                            className="shrink-0"
                            onClick={(event) => {
                                if (blockWithoutSignature(userHasSignature)) event.preventDefault();
                            }}
                        >
                            <Button className="h-8.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700">
                                <Plus className="h-3.5 w-3.5" />
                                New clearance
                            </Button>
                        </Link>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                    {[
                        { label: 'Total', value: metrics.total, icon: Users, tone: 'text-slate-500', iconBg: 'bg-blue-50 text-blue-600', valueTone: 'text-slate-900' },
                        { label: 'Pending', value: metrics.pending, icon: Clock, tone: 'text-amber-700', iconBg: 'bg-amber-50 text-amber-600', valueTone: 'text-amber-800' },
                        { label: 'Approved', value: metrics.approved, icon: CheckCircle2, tone: 'text-emerald-700', iconBg: 'bg-emerald-50 text-emerald-600', valueTone: 'text-emerald-800' },
                        { label: 'Rejected', value: metrics.rejected, icon: XCircle, tone: 'text-rose-700', iconBg: 'bg-rose-50 text-rose-600', valueTone: 'text-rose-800' },
                    ].map((card) => (
                        <Card key={card.label} className="border-slate-200 bg-white shadow-2xs">
                            <CardContent className="flex items-center justify-between p-3">
                                <div>
                                    <p className={`text-[11px] font-semibold tracking-wide uppercase ${card.tone}`}>{card.label}</p>
                                    <h3 className={`mt-0.5 text-xl leading-none font-bold ${card.valueTone}`}>{card.value}</h3>
                                </div>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                                    <card.icon className="h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs sm:flex-row">
                    <div className="relative w-full sm:flex-1">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search by name or staff ID"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && apply()}
                            className="h-8 rounded-md border-slate-200 bg-slate-50/50 pl-8 text-xs placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                        <Select
                            value={status}
                            onValueChange={(value) => {
                                setStatus(value);
                                apply({ status: value });
                            }}
                        >
                            <SelectTrigger className="h-8 w-full border-slate-200 bg-slate-50/50 text-[11px] sm:w-56">
                                <SelectValue placeholder="All stages" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All stages</SelectItem>
                                {STATUSES.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => apply()} className="h-8 border-slate-200 bg-white px-2.5 text-slate-700 hover:bg-slate-50">
                            <Search className="h-3.5 w-3.5" />
                        </Button>
                        {(search || status !== 'all') && (
                            <Button variant="ghost" size="sm" onClick={reset} className="h-8 px-2 text-slate-500 hover:text-slate-800" title="Reset filters">
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
                    <Table>
                        <TableHeader className="border-b border-slate-200 bg-slate-50/80">
                            <TableRow className="text-[11px] font-semibold text-slate-600 hover:bg-transparent">
                                <TableHead className="px-3 py-2">Date</TableHead>
                                <TableHead className="px-3 py-2">Staff</TableHead>
                                <TableHead className="px-3 py-2">Designation & workplace</TableHead>
                                <TableHead className="px-3 py-2">Stage</TableHead>
                                <TableHead className="px-3 py-2 text-right">Net</TableHead>
                                <TableHead className="px-3 py-2 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clearances.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">No clearance cases.</TableCell>
                                </TableRow>
                            ) : clearances.data.map((row) => (
                                <TableRow key={row.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
                                    <TableCell className="px-3 py-2 text-[11px] font-medium whitespace-nowrap text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                                            <span>{row.created_at || '—'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-3 py-2">
                                        <Link href={`/final-clearances/${row.id}`} className="text-xs leading-tight font-bold text-slate-900 hover:text-emerald-700">
                                            {row.employee_name || '—'}
                                        </Link>
                                        <div className="mt-0.5">
                                            <span className="rounded border border-emerald-200 bg-emerald-50 px-1 py-0.5 font-mono text-[10px] font-semibold text-emerald-800">
                                                {row.staff_id || '—'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-3 py-2">
                                        <div className="text-xs leading-tight font-semibold text-slate-800">{row.designation_name || '—'}</div>
                                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                                            <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                                            <span>{row.workplace || '—'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-3 py-2">
                                        <div className="flex flex-col items-start gap-0.5">
                                            {statusBadge(row.status, row.status_label)}
                                            {row.status === 'draft' && row.sent_back_reason && (
                                                <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1 py-0.5 text-[9px] font-bold whitespace-nowrap text-rose-700" title={row.sent_back_reason}>
                                                    <RotateCcw className="h-2.5 w-2.5 shrink-0" />
                                                    Needs revision
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-3 py-2 text-right font-mono text-xs text-slate-800">{money(row.net_payable)}</TableCell>
                                    <TableCell className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {row.can_act && (row.status === 'submitted_to_director_fa' || row.status === 'submitted_to_ed') && (
                                                <Button size="sm" className="h-7 rounded bg-emerald-600 px-2 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700" onClick={() => router.visit(`/final-clearances/${row.id}`)}>
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Approve
                                                </Button>
                                            )}
                                            {row.can_act && row.status !== 'submitted_to_director_fa' && row.status !== 'submitted_to_ed' && (
                                                <Button size="sm" className="h-7 rounded bg-emerald-600 px-2 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700" onClick={() => router.visit(`/final-clearances/${row.id}`)}>
                                                    Open
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" className="h-7 w-7 border-slate-200 p-0 text-slate-700 hover:bg-slate-50" title="View" onClick={() => router.visit(`/final-clearances/${row.id}`)}>
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 w-7 border-slate-200 p-0 text-slate-700 hover:bg-slate-50" title="Print" onClick={() => window.open(`/final-clearances/${row.id}/print`, '_blank')}>
                                                <Printer className="h-3.5 w-3.5" />
                                            </Button>
                                            {isSuperAdmin && (
                                                <Button variant="outline" size="sm" className="h-7 w-7 border-rose-200 p-0 text-rose-700 hover:bg-rose-50" title="Delete" onClick={() => setDeleteTarget(row)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>Rows per page:</span>
                            <Select value={perPage} onValueChange={(value) => { setPerPage(value); apply({ per_page: value }); }}>
                                <SelectTrigger className="h-7 w-[68px] border-slate-200 bg-white text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['10', '15', '25', '50', '100'].map((size) => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <span className="text-slate-300">|</span>
                            <span>
                                Showing <span className="font-bold text-slate-700">{from}</span> to <span className="font-bold text-slate-700">{to}</span> of <span className="font-bold text-slate-700">{total}</span> entries
                            </span>
                        </div>
                        {clearances.last_page > 1 && (
                            <nav className="inline-flex items-center gap-1" aria-label="Pagination">
                                {clearances.links.map((link, index) => {
                                    const isDots = link.label.includes('...');
                                    if (isDots) {
                                        return <span key={index} className="inline-flex h-7 w-7 items-center justify-center text-xs font-semibold text-slate-400">...</span>;
                                    }
                                    const label = link.label.replace(/&laquo;|&raquo;|&lsaquo;|&rsaquo;/g, '').trim();
                                    const isArrow = link.label.includes('laquo') || link.label.includes('raquo') || link.label.includes('lsaquo') || link.label.includes('rsaquo');
                                    if (!link.url) {
                                        return (
                                            <span key={index} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold ${link.active ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300'}`}>
                                                {isArrow ? (index === 0 ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : label}
                                            </span>
                                        );
                                    }
                                    return (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            preserveState
                                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold transition-all ${
                                                link.active
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-emerald-300 hover:text-emerald-600'
                                            }`}
                                        >
                                            {isArrow ? (index === 0 ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        )}
                    </div>
                </div>
            </div>
            <ClearanceDeleteDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                clearanceId={deleteTarget?.id ?? null}
                employeeName={deleteTarget?.employee_name}
            />
        </Layout>
    );
}
