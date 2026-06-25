import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Calendar, Check, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Designation = { id: number; name: string };
type SalaryGrade = { id: number; name: string };
type SalaryStep = { id: number; step_number: number };
type EmployeeType = { id: number; name: string; probation_months: number };
type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    joining_date?: string | null;
};

type Confirmation = {
    id: number;
    confirmation_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    confirmation_order_no: string | null;
    reason: string | null;
    employee: Employee;
    fromDesignation?: Designation | null;
    toDesignation?: Designation | null;
    fromEmployeeType?: EmployeeType | null;
    toEmployeeType?: EmployeeType | null;
    fromSalaryGrade?: SalaryGrade | null;
    toSalaryGrade?: SalaryGrade | null;
    fromSalaryStep?: SalaryStep | null;
    toSalaryStep?: SalaryStep | null;
    from_basic_salary?: string | number | null;
    to_basic_salary?: string | number | null;
    promotion?: { id: number } | null;
};

type Props = { confirmation: Confirmation };

function pickName(x: Designation | EmployeeType | null | undefined): string {
    return x?.name?.trim() ? x.name : '—';
}

function statusBadge(status: Confirmation['status']) {
    switch (status) {
        case 'pending': return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'approved': return <Badge className="border-0 bg-sky-600 text-white">Scheduled</Badge>;
        case 'rejected': return <Badge className="border-0 bg-rose-600 text-white">Rejected</Badge>;
        case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
        case 'completed': return <Badge className="border-0 bg-emerald-600 text-white">Completed</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}

export default function ConfirmationShow({ confirmation }: Props) {
    const anyC: any = confirmation;
    const fromDesignation = anyC.fromDesignation ?? anyC.from_designation;
    const toDesignation = anyC.toDesignation ?? anyC.to_designation;
    const fromType = anyC.fromEmployeeType ?? anyC.from_employee_type;
    const toType = anyC.toEmployeeType ?? anyC.to_employee_type;
    const fromGrade = anyC.fromSalaryGrade ?? anyC.from_salary_grade;
    const toGrade = anyC.toSalaryGrade ?? anyC.to_salary_grade;
    const fromStep = anyC.fromSalaryStep ?? anyC.from_salary_step;
    const toStep = anyC.toSalaryStep ?? anyC.to_salary_step;
    const promotion = anyC.promotion ?? null;
    const date = new Date(confirmation.confirmation_date);

    return (
        <Layout>
            <Head title="Confirmation details" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('confirmations.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Confirmations
                    </Link>
                </div>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Confirmation record</h1>
                        <p className="mt-1 text-xs text-zinc-600">Request #{confirmation.id}</p>
                    </div>
                    {confirmation.status === 'approved' && (
                        <Button size="sm" className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700" onClick={() => confirm('Apply confirmation now?') && router.post(route('confirmations.complete', confirmation.id))}>
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
                                    {statusBadge(confirmation.status)}
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Confirmation on {format(date, 'dd MMM yyyy')}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">From (probation)</p>
                                        <p className="mt-2 text-xs text-zinc-900"><span className="font-medium">Type:</span> {pickName(fromType)}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Designation:</span> {pickName(fromDesignation)}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Grade:</span> {pickName(fromGrade)}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Step:</span> {fromStep?.step_number != null ? `Step ${fromStep.step_number}` : '—'}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Basic:</span> {confirmation.from_basic_salary ?? '—'}</p>
                                    </div>
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">To (confirmed)</p>
                                        <p className="mt-2 text-xs text-zinc-900"><span className="font-medium">Type:</span> {pickName(toType)}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Designation:</span> {pickName(toDesignation)}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Grade:</span> {pickName(toGrade)}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Step:</span> {toStep?.step_number != null ? `Step ${toStep.step_number}` : '—'}</p>
                                        <p className="mt-1 text-xs text-zinc-900"><span className="font-medium">Basic:</span> {confirmation.to_basic_salary ?? '—'}</p>
                                    </div>
                                </div>

                                {promotion?.id && (
                                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
                                        Linked promotion record:{' '}
                                        <Link href={route('promotions.show', promotion.id)} className="font-medium underline">
                                            #{promotion.id}
                                        </Link>
                                    </div>
                                )}

                                <Separator className="my-4" />

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-900">Reason / notes</p>
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-700">{confirmation.reason?.trim() || '—'}</div>
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
                                    <p className="font-medium text-zinc-900">{employeeDisplayName(confirmation.employee)}</p>
                                    <p className="text-[10px] text-zinc-500">{confirmation.employee.employee_id}</p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                    <div className="flex items-center gap-2 text-zinc-700"><Calendar className="h-4 w-4 text-zinc-400" />Confirmation: {format(date, 'dd MMM yyyy')}</div>
                                    <div className="mt-2 flex items-center gap-2 text-zinc-700"><UserCheck className="h-4 w-4 text-zinc-400" />Order: {confirmation.confirmation_order_no ?? '—'}</div>
                                    <div className="mt-2 flex items-center gap-1 text-zinc-700">
                                        <span>{pickName(fromDesignation)}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="font-medium">{pickName(toDesignation)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
