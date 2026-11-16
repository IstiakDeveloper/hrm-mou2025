import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartKm, formatSmartNumber } from '@/lib/format-smart-number';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';

interface Employee extends EmployeeNameFields {
    id: number;
    pin?: string | null;
    employee_id: string;
    department?: { id: number; name: string } | null;
    designation?: { id: number; name: string } | null;
    branch?: { id: number; name: string; is_head_office?: boolean } | null;
}

interface PaymentBatch {
    id: number;
    voucher_no: string | null;
    status: string;
    period_year: number;
    period_month: number;
    total_amount: string | number;
}

interface LogBook {
    id: number;
    movement_id: number;
    date: string;
    start_time: string;
    start_place: string;
    start_meter_reading: string | number;
    destination: string | null;
    purpose: string;
    work_result: string | null;
    return_time: string;
    end_meter_reading: string | number;
    distance_km: string | number;
    personal_km: string | number | null;
    official_km: string | number;
    payment_status: 'unpaid' | 'paid';
    log_book_payment_id: number | null;
    employee: Employee;
    payment_batch?: PaymentBatch | null;
    movement?: { id: number; movement_type: string } | null;
}

interface Props {
    logBook: LogBook;
    ratePerKm: number;
    canManageLogBook: boolean;
}

function paymentBadge(status: string, hasPendingBatch: boolean) {
    if (status === 'paid') {
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid</Badge>;
    }
    if (hasPendingBatch) {
        return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">In Payment</Badge>;
    }
    return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Unpaid</Badge>;
}

export default function MovementLogBookShow({ logBook, ratePerKm, canManageLogBook }: Props) {
    const payable = Number(logBook.official_km) * ratePerKm;
    const batch = logBook.payment_batch;

    const handleDelete = () => {
        if (!confirm('Delete this log book register entry?')) return;
        router.delete(route('movement-log-books.destroy', logBook.id));
    };

    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div>
            <h3 className="mb-1 text-sm font-medium text-gray-500">{label}</h3>
            <div className="font-medium text-slate-900">{children}</div>
        </div>
    );

    return (
        <Layout>
            <Head title={`Log Book Register #${logBook.id}`} />
            <div className="container mx-auto max-w-4xl py-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <Link href={route('movement-log-books.index')} className="flex items-center text-blue-600 hover:text-blue-800">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Log Book Register
                    </Link>
                    {canManageLogBook && (
                        <div className="flex gap-2">
                            <Button asChild size="sm" variant="outline">
                                <Link href={route('movement-log-books.edit', logBook.id)}>
                                    <Pencil className="mr-1.5 h-4 w-4" />
                                    Edit
                                </Link>
                            </Button>
                            <Button size="sm" variant="destructive" onClick={handleDelete}>
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Log Book Register Entry #{logBook.id}</CardTitle>
                        {paymentBadge(logBook.payment_status, Boolean(logBook.log_book_payment_id && logBook.payment_status === 'unpaid'))}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Employee">{employeeDisplayName(logBook.employee)}</Field>
                            <Field label="Date">{format(new Date(logBook.date), 'dd MMM yyyy')}</Field>
                            <Field label="Branch">{logBook.employee.branch?.name || '—'}</Field>
                            <Field label="Start place">{logBook.start_place}</Field>
                            <Field label="Destination">{logBook.destination || '—'}</Field>
                            <Field label="Purpose">{logBook.purpose}</Field>
                            <Field label="Start time">{format(new Date(logBook.start_time), 'dd MMM yyyy HH:mm')}</Field>
                            <Field label="Return time">{format(new Date(logBook.return_time), 'dd MMM yyyy HH:mm')}</Field>
                            <Field label="Start meter">{formatSmartNumber(logBook.start_meter_reading)}</Field>
                            <Field label="End meter">{formatSmartNumber(logBook.end_meter_reading)}</Field>
                            <Field label="Total distance">{formatSmartKm(logBook.distance_km)}</Field>
                            <Field label="Personal distance">
                                {logBook.personal_km != null && Number(logBook.personal_km) > 0 ? formatSmartKm(logBook.personal_km) : '—'}
                            </Field>
                            <Field label="Official distance">{formatSmartKm(logBook.official_km)}</Field>
                            <Field label={`Payable (৳${ratePerKm}/km)`}>৳{payable.toFixed(2)}</Field>
                        </div>

                        {logBook.work_result && (
                            <Field label="Work result">
                                <p className="whitespace-pre-wrap text-sm">{logBook.work_result}</p>
                            </Field>
                        )}

                        {batch && (
                            <div className="rounded-lg border bg-slate-50 p-4">
                                <p className="mb-2 text-sm font-semibold">Monthly Payment</p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <span>Month: {format(new Date(batch.period_year, batch.period_month - 1, 1), 'MMMM yyyy')}</span>
                                    <span>Status: <span className="capitalize">{batch.status}</span></span>
                                    {batch.voucher_no && <span>Voucher: {batch.voucher_no}</span>}
                                </div>
                                <Button asChild size="sm" variant="outline" className="mt-3">
                                    <Link href={route('movement-log-book-payments.show', batch.id)}>View payment</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
