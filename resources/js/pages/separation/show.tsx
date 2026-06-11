import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Check, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & { id: number; employee_id: string; joining_date?: string | null };
type Separation = {
    id: number;
    separation_date: string;
    final_payment_date: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    reason: string | null;
    employee: Employee;
};

type Props = { separation: Separation };

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

export default function SeparationShow({ separation }: Props) {
    const sepDate = new Date(separation.separation_date);

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
                    {separation.status === 'approved' && (
                        <Button size="sm" className="h-8 bg-rose-600 text-xs hover:bg-rose-700" onClick={() => confirm('Apply separation now? Employee will become inactive.') && router.post(route('separations.complete', separation.id))}>
                            <Check className="mr-1.5 h-3.5 w-3.5" />Apply now
                        </Button>
                    )}
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
                                    <p><span className="font-medium">Final payment:</span> {separation.final_payment_date ? format(new Date(separation.final_payment_date), 'dd MMM yyyy') : '—'}</p>
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
