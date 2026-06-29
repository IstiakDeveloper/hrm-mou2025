import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift, Save } from 'lucide-react';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { formatTakaWhole } from '@/lib/taka-format';
import type { SharedData } from '@/types';

type Props = {
    employee: {
        id: number;
        pin: string | null;
        name_en: string | null;
        label: string;
        branch: string | null;
        department: string | null;
        joining_date: string | null;
        employment_status: string | null;
        resignation_date: string | null;
        dropout_date: string | null;
    };
    filters: { as_of: string };
    calculation: {
        completed_years: number;
        basic_salary: number;
        basic_multiplier: number;
        gratuity_amount: number;
        service_start: string | null;
        service_end: string;
        eligible: boolean;
        label: string;
    };
    payments: {
        id: number;
        service_end_date: string;
        completed_years: number;
        basic_multiplier: number;
        gratuity_amount: number;
        status: string;
        payment_date: string | null;
        payment_reference: string | null;
        notes: string | null;
    }[];
    has_paid: boolean;
};

export default function GratuityShow({ employee, filters, calculation, payments, has_paid }: Props) {
    const { flash } = usePage<SharedData & { flash?: { success?: string } }>().props;

    const form = useForm({
        as_of: filters.as_of,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_reference: '',
        notes: '',
    });

    const serviceEndIso = calculation.service_end?.slice(0, 10) || filters.as_of;

    return (
        <Layout>
            <Head title={`Gratuity — ${employee.label}`} />
            <PageSurface>
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                            <Gift className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gratuity payment</h1>
                            <p className="text-sm text-slate-500">
                                {employee.pin && (
                                    <span className="mr-2 font-mono text-violet-800">{employee.pin}</span>
                                )}
                                {employee.name_en || employee.label}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={staffFundPath('/gratuity')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Entitlement list
                        </Link>
                    </Button>
                </div>

                {flash?.success && (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}

                <div className="mb-4 grid gap-4 lg:grid-cols-2">
                    <Card className="rounded-xl border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100 px-6 py-4">
                            <CardTitle className="text-base font-bold">Employment & service end</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 py-4 text-sm">
                            <dl className="space-y-2">
                                <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Status</dt>
                                    <dd className="font-medium capitalize">{employee.employment_status?.replace('_', ' ') || '—'}</dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Joining date</dt>
                                    <dd>{employee.joining_date || '—'}</dd>
                                </div>
                                {employee.resignation_date && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-slate-500">Resignation</dt>
                                        <dd className="text-amber-800">{employee.resignation_date}</dd>
                                    </div>
                                )}
                                {employee.dropout_date && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-slate-500">Dropout</dt>
                                        <dd className="text-amber-800">{employee.dropout_date}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                                    <dt className="font-medium text-slate-700">Service end (for calc.)</dt>
                                    <dd className="font-semibold">{serviceEndIso}</dd>
                                </div>
                            </dl>
                            <p className="mt-3 text-xs text-slate-500">
                                Service end uses dropout or resignation date when set; otherwise the &quot;as of&quot; date below
                                (e.g. last working day).
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border-violet-200 bg-violet-50/30 shadow-sm">
                        <CardHeader className="border-b border-violet-100 px-6 py-4">
                            <CardTitle className="text-base font-bold text-violet-900">Gratuity amount</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 py-4">
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-slate-600">Completed years</dt>
                                    <dd className="font-semibold">{calculation.completed_years}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-600">Basic salary</dt>
                                    <dd className="tabular-nums">{formatTakaWhole(calculation.basic_salary)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-600">Gratuity rate</dt>
                                    <dd>{calculation.basic_multiplier}×</dd>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <dt>Formula</dt>
                                    <dd className="tabular-nums">
                                        {formatTakaWhole(calculation.basic_salary)} × {calculation.completed_years} ×{' '}
                                        {calculation.basic_multiplier}
                                    </dd>
                                </div>
                                <div className="flex justify-between border-t border-violet-200 pt-2">
                                    <dt className="font-bold text-violet-900">Payable</dt>
                                    <dd className="text-xl font-bold tabular-nums text-violet-900">
                                        {calculation.eligible ? formatTakaWhole(calculation.gratuity_amount) : '—'}
                                    </dd>
                                </div>
                            </dl>
                            <p className="mt-2 text-xs text-slate-600">{calculation.label}</p>
                            {has_paid && (
                                <Badge className="mt-3 bg-violet-200 text-violet-900 hover:bg-violet-200">
                                    Already paid for this service period
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {calculation.eligible && !has_paid && (
                    <Card className="mb-6 rounded-xl border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100 px-6 py-4">
                            <CardTitle className="text-base font-bold">Record gratuity payment (final settlement)</CardTitle>
                            <p className="text-xs text-slate-500">
                                Saving confirms money was paid to the employee. They will appear as <strong>Paid</strong> on
                                the entitlement list.
                            </p>
                        </CardHeader>
                        <CardContent className="px-6 py-5">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    form.post(route('gratuity.payments.store', employee.id));
                                }}
                                className="grid gap-4 sm:grid-cols-2"
                            >
                                <PayrollField label="Service end date" required>
                                    <Input
                                        type="date"
                                        value={form.data.as_of}
                                        onChange={(e) => form.setData('as_of', e.target.value)}
                                        required
                                    />
                                    <p className="mt-1 text-xs text-slate-500">Last day of service / job end</p>
                                </PayrollField>
                                <PayrollField label="Payment date" required>
                                    <Input
                                        type="date"
                                        value={form.data.payment_date}
                                        onChange={(e) => form.setData('payment_date', e.target.value)}
                                        required
                                    />
                                    <p className="mt-1 text-xs text-slate-500">Date gratuity was paid</p>
                                </PayrollField>
                                <PayrollField label="Reference / voucher">
                                    <Input
                                        value={form.data.payment_reference}
                                        onChange={(e) => form.setData('payment_reference', e.target.value)}
                                        placeholder="Cheque, bank ref…"
                                    />
                                </PayrollField>
                                <PayrollField label="Reason / notes" required className="sm:col-span-2">
                                    <Textarea
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        rows={2}
                                        placeholder="e.g. Final settlement on resignation…"
                                        required
                                    />
                                </PayrollField>
                                {(form.errors.as_of || form.errors.payment_date || form.errors.notes) && (
                                    <p className="text-sm text-red-600 sm:col-span-2">
                                        {form.errors.as_of || form.errors.payment_date || form.errors.notes}
                                    </p>
                                )}
                                <div className="sm:col-span-2">
                                    <Button type="submit" disabled={form.processing} className="bg-violet-600 hover:bg-violet-700">
                                        <Save className="mr-2 h-4 w-4" /> Confirm payment (mark as Paid)
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-xl border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100 px-6 py-4">
                        <CardTitle className="text-base font-bold">Payment history</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {payments.length === 0 ? (
                            <p className="px-6 py-8 text-sm text-slate-500">No gratuity payments recorded yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Service end</TableHead>
                                            <TableHead>Years</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Paid on</TableHead>
                                            <TableHead>Reference</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="text-sm">{p.service_end_date}</TableCell>
                                                <TableCell className="text-sm">{p.completed_years}</TableCell>
                                                <TableCell className="text-right text-sm tabular-nums font-medium">
                                                    {formatTakaWhole(p.gratuity_amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            p.status === 'paid'
                                                                ? 'bg-violet-100 text-violet-900'
                                                                : 'border-slate-200'
                                                        }
                                                    >
                                                        {p.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{p.payment_date || '—'}</TableCell>
                                                <TableCell className="text-sm text-slate-500">{p.payment_reference || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
