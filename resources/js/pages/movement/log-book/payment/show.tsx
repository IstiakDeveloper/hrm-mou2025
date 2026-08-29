import React, { useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartKm, formatSmartNumber } from '@/lib/format-smart-number';
import { format } from 'date-fns';
import { ArrowLeft, Check, Eye, Printer, ThumbsUp, Trash2, XCircle } from 'lucide-react';

interface Employee extends EmployeeNameFields {
    id: number;
    pin?: string | null;
    employee_id: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    branch?: { name: string } | null;
}

interface LogBookEntry {
    id: number;
    date: string;
    start_time: string;
    start_place: string;
    start_meter_reading: string | number;
    destination: string | null;
    purpose: string;
    work_result?: string | null;
    return_time: string;
    end_meter_reading: string | number;
    distance_km: string | number;
    personal_km: string | number | null;
    official_km: string | number;
    payment_status: string;
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
    status: string;
    approval_scope?: string;
    submitter_tier?: string | null;
    needs_recommendation?: boolean;
    employee: Employee;
    log_books: LogBookEntry[];
    processor?: { name: string } | null;
    recommender?: { name: string } | null;
    approver?: { name: string } | null;
    processed_at?: string | null;
    recommended_at?: string | null;
    recommendation_remarks?: string | null;
    approved_at?: string | null;
    approval_remarks?: string | null;
}

type Props = {
    payment: Payment;
    canRecommend?: boolean;
    canApprove: boolean;
    canReject?: boolean;
    canDelete?: boolean;
    nextActionLabel?: string | null;
    companyName?: string;
    companyAddress?: string;
};

function statusBadge(status: string) {
    if (status === 'approved') {
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Approved</Badge>;
    }
    if (status === 'recommended') {
        return <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">Recommended</Badge>;
    }
    if (status === 'rejected') {
        return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Rejected</Badge>;
    }
    return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>;
}

function paymentBadge(status: string) {
    if (status === 'paid') {
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid</Badge>;
    }
    return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Unpaid</Badge>;
}

export default function LogBookPaymentShow({ payment, canRecommend = false, canApprove, canReject = false, canDelete = false, nextActionLabel }: Props) {
    const monthLabel = format(new Date(payment.period_year, payment.period_month - 1, 1), 'MMMM yyyy');
    const entries = payment.log_books ?? [];

    const kmTotals = useMemo(() => {
        const totalKm = entries.reduce((sum, lb) => sum + Number(lb.distance_km || 0), 0);
        const personalKm = entries.reduce((sum, lb) => sum + Number(lb.personal_km || 0), 0);
        const officialKm = entries.reduce((sum, lb) => sum + Number(lb.official_km || 0), 0);
        return {
            totalKm: Math.round(totalKm * 100) / 100,
            personalKm: Math.round(personalKm * 100) / 100,
            officialKm: Math.round(officialKm * 100) / 100,
        };
    }, [entries]);

    const handleRecommend = () => {
        if (!confirm('Recommend this log book payment?')) return;
        router.post(route('movement-log-book-payments.recommend', payment.id));
    };

    const handleApprove = () => {
        if (!confirm('Approve this monthly log book payment?')) return;
        router.post(route('movement-log-book-payments.approve', payment.id));
    };

    const handleReject = () => {
        const reason = prompt('Rejection reason (required):');
        if (!reason?.trim()) return;
        router.post(route('movement-log-book-payments.reject', payment.id), { approval_remarks: reason.trim() });
    };

    const handleDelete = () => {
        if (!confirm(`Are you sure you want to delete this log book payment for ${monthLabel}?\n\nAll associated entries will be restored to unpaid and the month can be processed again.`)) return;
        router.delete(route('movement-log-book-payments.destroy', payment.id));
    };

    return (
        <Layout>
            <Head title={`Log Book Payment - ${monthLabel}`} />
            <PageSurface className="max-w-7xl px-4 py-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('movement-log-book-payments.index')}>
                            <ArrowLeft className="mr-1.5 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        {(payment.status === 'pending' || payment.status === 'recommended' || payment.status === 'approved') && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(route('movement-log-book-payments.voucher', payment.id), '_blank')}
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                {payment.status === 'approved' ? 'Print Voucher' : payment.status === 'recommended' ? 'Print Recommended Voucher' : 'Print Pending Voucher'}
                            </Button>
                        )}
                        {canRecommend && (
                            <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={handleRecommend}>
                                <ThumbsUp className="mr-1.5 h-4 w-4" />
                                Recommend
                            </Button>
                        )}
                        {canApprove && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
                                <Check className="mr-1.5 h-4 w-4" />
                                Approve
                            </Button>
                        )}
                        {canReject && (
                            <Button size="sm" variant="destructive" onClick={handleReject}>
                                <XCircle className="mr-1.5 h-4 w-4" />
                                Reject
                            </Button>
                        )}
                        {canDelete && (
                            <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>Monthly Log Book Payment — {monthLabel}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-xs text-slate-500">Employee</p>
                                <p className="font-semibold">{employeeDisplayName(payment.employee)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">PIN</p>
                                <p className="font-mono font-semibold">{payment.employee.pin || payment.employee.employee_id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Branch</p>
                                <p className="font-semibold">{payment.employee.branch?.name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Department</p>
                                <p className="font-semibold">{payment.employee.department?.name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Designation</p>
                                <p className="font-semibold">{payment.employee.designation?.name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Status</p>
                                {statusBadge(payment.status)}
                                {nextActionLabel && (payment.status === 'pending' || payment.status === 'recommended') && (
                                    <p className="mt-1 text-xs text-slate-500">{nextActionLabel}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Voucher</p>
                                {(payment.status === 'pending' || payment.status === 'recommended' || payment.status === 'approved') ? (
                                    <button
                                        type="button"
                                        className="font-mono text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline"
                                        onClick={() => window.open(route('movement-log-book-payments.voucher', payment.id), '_blank')}
                                    >
                                        {payment.voucher_no || 'Pending'}
                                    </button>
                                ) : (
                                    <p className="font-mono text-sm">{payment.voucher_no || '—'}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Entries</p>
                                <p className="font-semibold">{payment.entry_count}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Processed by</p>
                                <p>{payment.processor?.name || '—'}</p>
                                {payment.processed_at && (
                                    <p className="text-xs text-slate-500">{format(new Date(payment.processed_at), 'dd MMM yyyy, hh:mm a')}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Recommended by</p>
                                <p>{payment.recommender?.name || '—'}</p>
                                {payment.recommended_at && (
                                    <p className="text-xs text-slate-500">{format(new Date(payment.recommended_at), 'dd MMM yyyy, hh:mm a')}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Approved by</p>
                                <p>{payment.approver?.name || '—'}</p>
                                {payment.approved_at && (
                                    <p className="text-xs text-slate-500">{format(new Date(payment.approved_at), 'dd MMM yyyy, hh:mm a')}</p>
                                )}
                            </div>
                            {payment.recommendation_remarks && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-slate-500">Recommendation remarks</p>
                                    <p className="text-sm">{payment.recommendation_remarks}</p>
                                </div>
                            )}
                            {payment.approval_remarks && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-slate-500">Remarks</p>
                                    <p className="text-sm">{payment.approval_remarks}</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                <p className="text-[10px] text-slate-500 uppercase font-medium">Total KM</p>
                                <p className="font-semibold text-xs sm:text-sm">{formatSmartKm(kmTotals.totalKm)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                <p className="text-[10px] text-slate-500 uppercase font-medium">Personal KM</p>
                                <p className="font-semibold text-xs sm:text-sm">{formatSmartKm(kmTotals.personalKm)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                <p className="text-[10px] text-slate-500 uppercase font-medium">Official Recorded</p>
                                <p className="font-semibold text-xs sm:text-sm text-slate-800">{formatSmartKm(payment.total_official_km || kmTotals.officialKm)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                <p className="text-[10px] text-slate-500 uppercase font-medium">Monthly Limit</p>
                                <p className="font-semibold text-xs sm:text-sm text-slate-800">
                                    {payment.km_limit != null ? `${formatSmartKm(payment.km_limit)}` : 'Unlimited'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                                <p className="text-[10px] text-emerald-700 uppercase font-semibold">Billed / Payable KM</p>
                                <p className="font-bold text-xs sm:text-sm text-emerald-800">{formatSmartKm(payment.billed_official_km ?? payment.total_official_km ?? kmTotals.officialKm)}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 col-span-2 sm:col-span-1">
                                <p className="text-[10px] text-emerald-700 uppercase font-semibold">Total Amount</p>
                                <p className="font-bold text-xs sm:text-sm text-emerald-800">৳{formatSmartNumber(payment.total_amount)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border-slate-200 shadow-xs">
                    <CardHeader className="p-3 border-b border-slate-100">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">Register Entries ({entries.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Mobile Card List View (sm:hidden) */}
                        <div className="p-2 space-y-2 sm:hidden">
                            {entries.length > 0 ? (
                                entries.map((lb) => (
                                    <div key={lb.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-900">{format(new Date(lb.date), 'dd MMM yyyy')}</span>
                                            {paymentBadge(lb.payment_status)}
                                        </div>
                                        <div className="text-xs text-slate-700 font-medium truncate">
                                            {lb.start_place} → {lb.destination || '—'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate">
                                            Purpose: {lb.purpose}
                                        </div>
                                        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded text-center text-[10px]">
                                            <div>
                                                <span className="text-slate-400 block uppercase">Total KM</span>
                                                <span className="font-semibold text-slate-800">{formatSmartKm(lb.distance_km)}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block uppercase">Personal</span>
                                                <span className="font-semibold text-slate-800">{lb.personal_km != null && Number(lb.personal_km) > 0 ? formatSmartKm(lb.personal_km) : '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-emerald-600 font-bold block uppercase">Official</span>
                                                <span className="font-bold text-emerald-700">{formatSmartKm(lb.official_km)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                                            <div>Meter: {formatSmartNumber(lb.start_meter_reading)} - {formatSmartNumber(lb.end_meter_reading)}</div>
                                            <Button asChild variant="ghost" size="icon" className="h-6 w-6 text-blue-600">
                                                <Link href={route('movement-log-books.show', lb.id)}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-xs text-slate-500">
                                    No log book entries found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View (hidden sm:block) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 text-[10px] uppercase">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Start Place</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Purpose</TableHead>
                                        <TableHead>Start</TableHead>
                                        <TableHead>Return</TableHead>
                                        <TableHead className="text-right">Start Meter</TableHead>
                                        <TableHead className="text-right">End Meter</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Personal</TableHead>
                                        <TableHead className="text-right">Official</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.length > 0 ? (
                                        entries.map((lb) => (
                                            <TableRow key={lb.id}>
                                                <TableCell className="whitespace-nowrap text-xs">{format(new Date(lb.date), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="max-w-[120px] truncate text-xs" title={lb.start_place}>{lb.start_place}</TableCell>
                                                <TableCell className="max-w-[120px] truncate text-xs" title={lb.destination || ''}>{lb.destination || '—'}</TableCell>
                                                <TableCell className="max-w-[140px] truncate text-xs" title={lb.purpose}>{lb.purpose}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">{format(new Date(lb.start_time), 'HH:mm')}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">{format(new Date(lb.return_time), 'HH:mm')}</TableCell>
                                                <TableCell className="text-right font-mono text-xs">{formatSmartNumber(lb.start_meter_reading)}</TableCell>
                                                <TableCell className="text-right font-mono text-xs">{formatSmartNumber(lb.end_meter_reading)}</TableCell>
                                                <TableCell className="text-right text-xs">{formatSmartKm(lb.distance_km)}</TableCell>
                                                <TableCell className="text-right text-xs">
                                                    {lb.personal_km != null && Number(lb.personal_km) > 0 ? formatSmartKm(lb.personal_km) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-xs text-emerald-700">{formatSmartKm(lb.official_km)}</TableCell>
                                                <TableCell>{paymentBadge(lb.payment_status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="View entry">
                                                        <Link href={route('movement-log-books.show', lb.id)}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={13} className="py-6 text-center text-xs text-slate-400">
                                                No log book entries found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
