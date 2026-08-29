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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartKm, formatSmartNumber } from '@/lib/format-smart-number';
import { LogBookScopeTabs } from '@/components/log-book-scope-tabs';
import { format } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, Eye, PlayCircle, Printer, Search, ThumbsUp, Trash2, XCircle } from 'lucide-react';

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
}

interface Props {
    payments: { data: Payment[]; meta?: { current_page: number; last_page: number; per_page: number; total: number; links: { url: string | null; label: string; active: boolean }[] }; links?: { prev: string | null; next: string | null } };
    summary: { total: number; pending: number; recommended?: number; approved: number; rejected: number; totalAmount: number; pendingAmount: number };
    filters: Record<string, string | undefined>;
    ratePerKm: number;
    canProcess: boolean;
    canDelete?: boolean;
    scopeView?: 'mine' | 'team';
    showScopeTabs?: boolean;
    viewerEmployeeId?: number;
}

function statusBadge(status: string) {
    if (status === 'approved') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">Approved</Badge>;
    if (status === 'recommended') return <Badge className="bg-sky-50 text-sky-700 border-sky-200" variant="outline">Recommended</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline">Rejected</Badge>;
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200" variant="outline">Pending</Badge>;
}

function canPrintVoucher(row: Payment) {
    return row.status === 'pending' || row.status === 'recommended' || row.status === 'approved';
}

function openVoucher(id: number) {
    window.open(route('movement-log-book-payments.voucher', id), '_blank');
}

function monthLabel(year: number, month: number) {
    return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export default function LogBookPaymentIndex({ payments, summary, filters, ratePerKm, canProcess, scopeView = 'team', showScopeTabs = false }: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [periodYear, setPeriodYear] = useState(filters.period_year || String(new Date().getFullYear()));
    const [periodMonth, setPeriodMonth] = useState(filters.period_month || String(new Date().getMonth() + 1));
    const [processYear, setProcessYear] = useState(String(new Date().getFullYear()));
    const [processMonth, setProcessMonth] = useState(String(new Date().getMonth() + 1));

    const buildParams = () => {
        const p: Record<string, string> = {};
        if (search) p.search = search;
        if (status && status !== 'all') p.status = status;
        if (periodYear && periodYear !== 'all') p.period_year = periodYear;
        if (periodMonth && periodMonth !== 'all') p.period_month = periodMonth;
        if (showScopeTabs) p.view = scopeView;
        return p;
    };

    const handleSearch = () => router.get(route('movement-log-book-payments.index'), buildParams(), { preserveState: true });

    const handleProcess = () => {
        if (!confirm(`Process your log book payment for ${monthLabel(Number(processYear), Number(processMonth))}? All unpaid entries up to this month (including previous unpaid) will be included at ৳${ratePerKm}/km.`)) return;
        router.post(route('movement-log-book-payments.process'), {
            period_year: processYear,
            period_month: processMonth,
        });
    };

    const handleRecommend = (row: Payment) => {
        if (!confirm(`Recommend log book payment for ${employeeDisplayName(row.employee)}?`)) return;
        router.post(route('movement-log-book-payments.recommend', row.id), {}, { preserveScroll: true });
    };

    const handleApprove = (row: Payment) => {
        if (!confirm(`Approve payment for ${employeeDisplayName(row.employee)}?`)) return;
        router.post(route('movement-log-book-payments.approve', row.id), {}, { preserveScroll: true });
    };

    const handleReject = (row: Payment) => {
        const reason = prompt('Rejection reason (required):');
        if (!reason?.trim()) return;
        router.post(route('movement-log-book-payments.reject', row.id), { approval_remarks: reason.trim() }, { preserveScroll: true });
    };

    const handleDelete = (row: Payment) => {
        if (!confirm(`Are you sure you want to delete the log book payment for ${employeeDisplayName(row.employee)} (${monthLabel(row.period_year, row.period_month)})?\n\nThis will restore all associated entries to unpaid and allow re-processing this month.`)) return;
        router.delete(route('movement-log-book-payments.destroy', row.id), { preserveScroll: true });
    };

    const years = useMemo(() => {
        const y = new Date().getFullYear();
        return [y, y - 1, y - 2];
    }, []);

    const showProcess = canProcess && (!showScopeTabs || scopeView === 'mine');

    return (
        <Layout>
            <Head title="Log Book Payment" />
            <PageSurface className="max-w-none px-3 sm:px-4 md:px-6">
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}

                <div className="mb-3 flex flex-col gap-2.5 border-b border-slate-200 pb-3 md:mb-4 md:pb-4">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-base font-bold text-gray-900 sm:text-xl md:text-2xl">Log Book Payment</h1>
                            <p className="text-xs text-slate-500">
                                {showScopeTabs && scopeView === 'mine'
                                    ? `Process your month: unpaid carry-forward × ৳${ratePerKm}/km`
                                    : showScopeTabs
                                        ? 'Team: Recommend pending payments, then Approve recommended ones'
                                        : `Process a month: all unpaid carry-forward × ৳${ratePerKm}/km`}
                            </p>
                        </div>
                        {showProcess && (
                            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
                                <Select value={processMonth} onValueChange={setProcessMonth}>
                                    <SelectTrigger className="h-8 text-xs sm:w-[100px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <SelectItem key={m} value={String(m)}>{format(new Date(2024, m - 1, 1), 'MMM')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={processYear} onValueChange={setProcessYear}>
                                    <SelectTrigger className="h-8 text-xs sm:w-[85px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs px-2.5 col-span-1" onClick={handleProcess}>
                                    <PlayCircle className="mr-1 h-3.5 w-3.5 shrink-0" /> Process
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

                <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                        { label: 'Total', value: summary.total },
                        { label: 'Pending', value: summary.pending },
                        { label: 'Recommended', value: summary.recommended ?? 0 },
                        { label: 'Approved', value: summary.approved },
                        { label: 'Paid Amount', value: `৳${formatSmartNumber(summary.totalAmount)}` },
                        { label: 'In Process', value: `৳${formatSmartNumber(summary.pendingAmount)}` },
                    ].map((c) => (
                        <div key={c.label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-xs">
                            <p className="text-[10px] text-slate-500 uppercase font-medium">{c.label}</p>
                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{typeof c.value === 'number' ? c.value.toLocaleString() : c.value}</p>
                        </div>
                    ))}
                </div>

                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-xs">
                    <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-2.5 sm:flex sm:items-center">
                        <Input placeholder="Search employee, voucher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs col-span-2 sm:max-w-xs" />
                        <Select value={status || 'all'} onValueChange={setStatus}>
                            <SelectTrigger className="h-8 text-xs w-full sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="recommended">Recommended</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleSearch} className="h-8 text-xs bg-slate-800 hover:bg-slate-900"><Search className="mr-1 h-3.5 w-3.5" />Search</Button>
                    </div>

                    <CardContent className="p-0">
                        {/* Mobile Card List View (sm:hidden) */}
                        <div className="p-2 space-y-2 sm:hidden">
                            {payments.data.length > 0 ? (
                                payments.data.map((row) => (
                                    <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs space-y-2">
                                        <div className="flex items-start justify-between gap-1.5">
                                            <div>
                                                <div className="font-bold text-xs text-slate-900">
                                                    {employeeDisplayName(row.employee)}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    {row.employee.branch?.name || '—'} · {row.entry_count} entries
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                {statusBadge(row.status)}
                                                {row.next_action_label && (row.status === 'pending' || row.status === 'recommended') && (
                                                    <p className="mt-1 max-w-[140px] text-[9px] leading-tight text-slate-500">{row.next_action_label}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-lg text-center">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Period</span>
                                                <span className="text-slate-800 font-semibold text-[11px]">{monthLabel(row.period_year, row.period_month)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Official KM</span>
                                                <span className="text-slate-800 font-semibold text-[11px]">{formatSmartKm(row.total_official_km)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Amount</span>
                                                <span className="text-emerald-700 font-bold text-xs">৳{formatSmartNumber(row.total_amount)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                                            <div>Voucher: <span className="font-mono text-slate-700 font-medium">{row.voucher_no || (row.status === 'approved' ? '—' : 'Draft')}</span></div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 bg-blue-50 hover:bg-blue-100" title="View" onClick={() => router.get(route('movement-log-book-payments.show', row.id))}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {canPrintVoucher(row) && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-700 bg-slate-100 hover:bg-slate-200" title="Print voucher" onClick={() => openVoucher(row.id)}>
                                                        <Printer className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {row.can_recommend && (
                                                    <Button size="sm" className="h-7 bg-sky-600 px-2 text-[10px] hover:bg-sky-700" onClick={() => handleRecommend(row)}>
                                                        <ThumbsUp className="mr-1 h-3 w-3" /> Recommend
                                                    </Button>
                                                )}
                                                {row.can_approve && (
                                                    <Button size="sm" className="h-7 bg-emerald-600 px-2 text-[10px] hover:bg-emerald-700" onClick={() => handleApprove(row)}>
                                                        <Check className="mr-1 h-3 w-3" /> Approve
                                                    </Button>
                                                )}
                                                {row.can_reject && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100" title="Reject" onClick={() => handleReject(row)}>
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {row.can_delete && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100" title="Delete payment" onClick={() => handleDelete(row)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-xs text-slate-500">
                                    No payment records found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View (hidden sm:block) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 text-[10px] uppercase">
                                        <TableHead>Month</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-right">Official KM</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Voucher</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="text-xs">{monthLabel(row.period_year, row.period_month)}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-xs text-slate-800">{employeeDisplayName(row.employee)}</div>
                                                <div className="text-[11px] text-slate-500">{row.employee.branch?.name || '—'} · {row.entry_count} entries</div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs">{formatSmartKm(row.total_official_km)}</TableCell>
                                            <TableCell className="text-right text-xs">৳{formatSmartNumber(row.rate_per_km)}</TableCell>
                                            <TableCell className="text-right font-bold text-xs text-emerald-700">৳{formatSmartNumber(row.total_amount)}</TableCell>
                                            <TableCell>
                                                <div>{statusBadge(row.status)}</div>
                                                {row.next_action_label && (row.status === 'pending' || row.status === 'recommended') && (
                                                    <p className="mt-0.5 max-w-[180px] text-[10px] leading-tight text-slate-500">{row.next_action_label}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {canPrintVoucher(row) ? (
                                                    <button type="button" className="text-emerald-700 underline-offset-2 hover:underline" onClick={() => openVoucher(row.id)}>
                                                        {row.voucher_no || 'Pending'}
                                                    </button>
                                                ) : (
                                                    row.voucher_no || '—'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 bg-blue-50 hover:bg-blue-100" title="View" onClick={() => router.get(route('movement-log-book-payments.show', row.id))}><Eye className="h-3.5 w-3.5" /></Button>
                                                    {canPrintVoucher(row) && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-700 bg-slate-100 hover:bg-slate-200" title="Print voucher" onClick={() => openVoucher(row.id)}>
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {row.can_recommend && (
                                                        <Button size="sm" className="h-7 bg-sky-600 px-2 text-[10px] hover:bg-sky-700" onClick={() => handleRecommend(row)}>
                                                            <ThumbsUp className="mr-1 h-3 w-3" /> Recommend
                                                        </Button>
                                                    )}
                                                    {row.can_approve && (
                                                        <Button size="sm" className="h-7 bg-emerald-600 px-2 text-[10px] hover:bg-emerald-700" onClick={() => handleApprove(row)}>
                                                            <Check className="mr-1 h-3 w-3" /> Approve
                                                        </Button>
                                                    )}
                                                    {row.can_reject && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100" title="Reject" onClick={() => handleReject(row)}><XCircle className="h-3.5 w-3.5" /></Button>
                                                    )}
                                                    {row.can_delete && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100" title="Delete payment" onClick={() => handleDelete(row)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {payments.data.length === 0 && (
                                        <TableRow><TableCell colSpan={8} className="h-20 text-center text-xs text-slate-500">No payment records found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {payments.meta && payments.meta.last_page > 1 && payments.links && (
                        <div className="flex justify-end gap-1 border-t p-2.5">
                            {payments.links.prev && <Link href={payments.links.prev} preserveState><Button variant="outline" size="icon" className="h-7 w-7"><ChevronLeft className="h-3.5 w-3.5" /></Button></Link>}
                            {payments.links.next && <Link href={payments.links.next} preserveState><Button variant="outline" size="icon" className="h-7 w-7"><ChevronRight className="h-3.5 w-3.5" /></Button></Link>}
                        </div>
                    )}
                </Card>
            </PageSurface>
        </Layout>
    );
}
