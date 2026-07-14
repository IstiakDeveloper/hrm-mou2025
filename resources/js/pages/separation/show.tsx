import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Check, HandCoins, Pencil, Trash2, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatTakaWithSymbol } from '@/lib/taka-format';

type Employee = EmployeeNameFields & { id: number; employee_id: string; joining_date?: string | null };
type Separation = {
    id: number;
    separation_date: string;
    final_payment_date: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    reason: string | null;
    employee: Employee;
    final_payment?: {
        id: number;
        status: 'pending' | 'paid';
        net_payable: number;
        payment_date: string | null;
    } | null;
};

type Props = { separation: Separation; canEdit?: boolean; canDelete?: boolean };

function statusBadge(status: Separation['status']) {
    switch (status) {
        case 'pending': return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'approved': return <Badge className="border-0 bg-sky-600 text-white">Scheduled</Badge>;
        case 'rejected': return <Badge className="border-0 bg-rose-600 text-white">Rejected</Badge>;
        case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
        case 'completed': return <Badge className="border-0 bg-emerald-600 text-white">Completed</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}

export default function SeparationShow({ separation, canEdit = false, canDelete = false }: Props) {
    const sepDate = new Date(separation.separation_date);

    const confirmDelete = () => {
        const message = separation.status === 'completed'
            ? 'Delete this completed separation?\n\nThis will restore the employee to active, clear dropout details, reverse final-payment settlements (PF / gratuity / loans when applied), and remove the separation record.'
            : 'Delete this separation record?';
        if (!confirm(message)) {
            return;
        }
        router.delete(route('separations.destroy', separation.id));
    };

    return (
        <Layout>
            <Head title="Separation details" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('separations.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Separations
                    </Link>
                </div>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Separation record</h1>
                        <p className="mt-1 text-xs text-zinc-600">Request #{separation.id} — Obbahoti</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canEdit && (
                            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                                <Link href={route('separations.edit', separation.id)}>
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                    Edit
                                </Link>
                            </Button>
                        )}
                        {separation.status === 'approved' && (
                        <Button size="sm" className="h-8 bg-rose-600 text-xs hover:bg-rose-700" onClick={() => confirm('Apply separation now? Employee will become inactive.') && router.post(route('separations.complete', separation.id))}>
                            <Check className="mr-1.5 h-3.5 w-3.5" />Apply now
                        </Button>
                    )}
                        {canDelete && (
                            <Button size="sm" variant="outline" className="h-8 border-rose-200 text-xs text-rose-700 hover:bg-rose-50" onClick={confirmDelete}>
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="flex items-center justify-between text-sm font-semibold text-zinc-900">
                                    <span>Details</span>
                                    {statusBadge(separation.status)}
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Separation on {format(sepDate, 'dd MMM yyyy')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4 text-xs">
                                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                    <p><span className="font-medium">Final payment:</span>{' '}
                                        {separation.final_payment_date
                                            ? format(new Date(separation.final_payment_date), 'dd MMM yyyy')
                                            : separation.final_payment?.status === 'pending'
                                              ? 'Pending settlement'
                                              : '—'}
                                    </p>
                                    {separation.final_payment && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${separation.final_payment.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {separation.final_payment.status === 'paid' ? 'Paid' : 'Pending'}
                                            </span>
                                            <Link
                                                href={route('final-payments.show', separation.final_payment.id)}
                                                className="inline-flex items-center text-[11px] font-medium text-sky-700 hover:text-sky-900"
                                            >
                                                <HandCoins className="mr-1 h-3 w-3" />
                                                View settlement ({formatTakaWithSymbol(separation.final_payment.net_payable || 0)})
                                            </Link>
                                        </div>
                                    )}
                                    <p className="mt-2 rounded-md border border-rose-100 bg-rose-50 p-2 text-rose-800">On apply, employee status becomes inactive and dropout date is recorded.</p>
                                </div>
                                <div>
                                    <p className="mb-2 font-medium text-zinc-900">Reason / notes</p>
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-zinc-700">{separation.reason?.trim() || '—'}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Employee</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-4 text-xs">
                                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                    <p className="font-medium text-zinc-900">{employeeDisplayName(separation.employee)}</p>
                                    <p className="text-[10px] text-zinc-500">{separation.employee.employee_id}</p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                    <div className="flex items-center gap-2 text-zinc-700"><Calendar className="h-4 w-4 text-zinc-400" />Separation: {format(sepDate, 'dd MMM yyyy')}</div>
                                    <div className="mt-2 flex items-center gap-2 text-zinc-700"><UserX className="h-4 w-4 text-zinc-400" />Joining: {separation.employee.joining_date ?? '—'}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
