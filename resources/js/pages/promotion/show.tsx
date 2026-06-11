import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, Check, XCircle, Calendar, BriefcaseBusiness } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Designation = { id: number; name: string };
type SalaryGrade = { id: number; name: string };
type User = { id: number; name: string };

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Promotion = {
    id: number;
    employee_id: number;
    effective_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    promotion_order_no: string | null;
    reason: string | null;
    fromDesignation: Designation | null;
    toDesignation: Designation | null;
    fromSalaryGrade: SalaryGrade | null;
    toSalaryGrade: SalaryGrade | null;
    from_basic_salary: string | number | null;
    to_basic_salary: string | number | null;
    employee: Employee;
    approver: User | null;
};

type Props = {
    promotion: Promotion;
    canApprove: boolean;
};

function statusBadge(status: Promotion['status']) {
    switch (status) {
        case 'pending':
            return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'approved':
            return <Badge className="border-0 bg-sky-600 text-white">Approved</Badge>;
        case 'rejected':
            return <Badge className="border-0 bg-rose-600 text-white">Rejected</Badge>;
        case 'cancelled':
            return <Badge variant="outline">Cancelled</Badge>;
        case 'completed':
            return <Badge className="border-0 bg-emerald-600 text-white">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export default function PromotionShow({ promotion, canApprove }: Props) {
    const [rejectReason, setRejectReason] = useState('');
    const effective = new Date(promotion.effective_date);
    const anyPromotion: any = promotion as any;
    const fromDesignation = anyPromotion.fromDesignation ?? anyPromotion.from_designation;
    const toDesignation = anyPromotion.toDesignation ?? anyPromotion.to_designation;
    const fromGrade = anyPromotion.fromSalaryGrade ?? anyPromotion.from_salary_grade;
    const toGrade = anyPromotion.toSalaryGrade ?? anyPromotion.to_salary_grade;

    return (
        <Layout>
            <Head title="Promotion details" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('promotions.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Promotions
                    </Link>
                </div>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Promotion request</h1>
                        <p className="mt-1 text-xs text-zinc-600">Request #{promotion.id}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {promotion.status === 'pending' && canApprove && (
                            <>
                                <Button
                                    size="sm"
                                    className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
                                    onClick={() => {
                                        if (confirm('Approve this promotion request?')) router.post(route('promotions.approve', promotion.id));
                                    }}
                                >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs"
                                    onClick={() => {
                                        if (confirm('Reject this promotion request?')) {
                                            router.post(route('promotions.reject', promotion.id), { reason: rejectReason });
                                        }
                                    }}
                                    disabled={!rejectReason.trim()}
                                >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Reject
                                </Button>
                            </>
                        )}

                        {promotion.status === 'approved' && (
                            <Button
                                size="sm"
                                className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
                                onClick={() => {
                                    if (confirm('Complete this promotion? This will update employee records.')) {
                                        router.post(route('promotions.complete', promotion.id));
                                    }
                                }}
                            >
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Complete
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
                                    {statusBadge(promotion.status)}
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">
                                    Effective on {format(effective, 'dd MMM yyyy')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">From</p>
                                        <p className="mt-2 text-xs text-zinc-900">
                                            <span className="font-medium">Designation:</span> {fromDesignation?.name ?? '—'}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-900">
                                            <span className="font-medium">Grade:</span> {fromGrade?.name ?? '—'}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-900">
                                            <span className="font-medium">Basic:</span> {promotion.from_basic_salary ?? '—'}
                                        </p>
                                    </div>

                                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">To</p>
                                        <p className="mt-2 text-xs text-zinc-900">
                                            <span className="font-medium">Designation:</span> {toDesignation?.name ?? '—'}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-900">
                                            <span className="font-medium">Grade:</span> {toGrade?.name ?? '—'}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-900">
                                            <span className="font-medium">Basic:</span> {promotion.to_basic_salary ?? '—'}
                                        </p>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-900">Reason / notes</p>
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-700">
                                        {promotion.reason?.trim() ? promotion.reason : '—'}
                                    </div>
                                </div>

                                {promotion.status === 'pending' && canApprove && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-xs font-medium text-zinc-900">Rejection reason (required to reject)</p>
                                        <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="text-xs" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="border-zinc-200/90 shadow-sm">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-semibold text-zinc-900">Employee</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 text-xs">
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                        <p className="font-medium text-zinc-900">
                                            {employeeDisplayName(promotion.employee)}
                                        </p>
                                        <p className="text-[10px] text-zinc-500">{promotion.employee.employee_id}</p>
                                    </div>
                                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                        <div className="flex items-center gap-2 text-zinc-700">
                                            <Calendar className="h-4 w-4 text-zinc-400" />
                                            Effective: {format(effective, 'dd MMM yyyy')}
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-zinc-700">
                                            <BriefcaseBusiness className="h-4 w-4 text-zinc-400" />
                                            Order: {promotion.promotion_order_no ?? '—'}
                                        </div>
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

