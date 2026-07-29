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
import { format } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, Eye, PlayCircle, Search, XCircle } from 'lucide-react';

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
    status: 'pending' | 'approved' | 'rejected';
    approval_scope: 'head_office' | 'branch';
    employee: Employee;
}

interface Props {
    payments: { data: Payment[]; meta?: { current_page: number; last_page: number; per_page: number; total: number; links: { url: string | null; label: string; active: boolean }[] }; links?: { prev: string | null; next: string | null } };
    summary: { total: number; pending: number; approved: number; rejected: number; totalAmount: number; pendingAmount: number };
    filters: Record<string, string | undefined>;
    ratePerKm: number;
    canApproveHeadOffice: boolean;
    canApproveBranch: boolean;
    canProcess: boolean;
}

function statusBadge(status: string) {
    if (status === 'approved') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">Approved</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline">Rejected</Badge>;
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200" variant="outline">Pending</Badge>;
}

function canApproveRow(row: Payment, ho: boolean, br: boolean) {
    if (row.status !== 'pending') return false;
    return row.approval_scope === 'head_office' ? ho : br;
}

function monthLabel(year: number, month: number) {
    return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export default function LogBookPaymentIndex({ payments, summary, filters, ratePerKm, canApproveHeadOffice, canApproveBranch, canProcess }: Props) {
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
        return p;
    };

    const handleSearch = () => router.get(route('movement-log-book-payments.index'), buildParams(), { preserveState: true });

    const handleProcess = () => {
        if (!confirm(`Process ${monthLabel(Number(processYear), Number(processMonth))}? All unpaid entries up to this month (including previous unpaid) will be included at ৳${ratePerKm}/km.`)) return;
        router.post(route('movement-log-book-payments.process'), {
            period_year: processYear,
            period_month: processMonth,
        });
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

    const years = useMemo(() => {
        const y = new Date().getFullYear();
        return [y, y - 1, y - 2];
    }, []);

    return (
        <Layout>
            <Head title="Log Book Payment" />
            <PageSurface className="max-w-none px-3 sm:px-4 md:px-6">
                {flash?.success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></Alert>}
                {flash?.error && <Alert variant="destructive" className="mb-4"><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></Alert>}

                <div className="mb-3 flex flex-col gap-2.5 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between md:mb-4 md:pb-4">
                    <div>
                        <h1 className="text-base font-bold text-gray-900 sm:text-xl md:text-2xl">Log Book Payment</h1>
                        <p className="text-xs text-slate-500">Process a month: all unpaid carry-forward × ৳{ratePerKm}/km</p>
                    </div>
                    {canProcess && (
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

                <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                        { label: 'Total', value: summary.total },
                        { label: 'Pending', value: summary.pending },
                        { label: 'Approved', value: summary.approved },
                        { label: 'Rejected', value: summary.rejected },
                        { label: 'Paid Amount', value: `৳${formatSmartNumber(summary.totalAmount)}` },
                        { label: 'Pending Amount', value: `৳${formatSmartNumber(summary.pendingAmount)}` },
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
                                            <div className="shrink-0">
                                                {statusBadge(row.status)}
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
                                            <div>Voucher: <span className="font-mono text-slate-700 font-medium">{row.voucher_no || '—'}</span></div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 bg-blue-50 hover:bg-blue-100" onClick={() => router.get(route('movement-log-book-payments.show', row.id))}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {canApproveRow(row, canApproveHeadOffice, canApproveBranch) && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" onClick={() => handleApprove(row)}>
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100" onClick={() => handleReject(row)}>
                                                            <XCircle className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
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
                                            <TableCell>{statusBadge(row.status)}</TableCell>
                                            <TableCell className="font-mono text-xs">{row.voucher_no || '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 bg-blue-50 hover:bg-blue-100" onClick={() => router.get(route('movement-log-book-payments.show', row.id))}><Eye className="h-3.5 w-3.5" /></Button>
                                                    {canApproveRow(row, canApproveHeadOffice, canApproveBranch) && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" onClick={() => handleApprove(row)}><Check className="h-3.5 w-3.5" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100" onClick={() => handleReject(row)}><XCircle className="h-3.5 w-3.5" /></Button>
                                                        </>
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
