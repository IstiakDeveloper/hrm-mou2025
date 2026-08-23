import React from 'react';
import { Link } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import { cn } from '@/lib/utils';

type Application = {
    id: number;
    application_number: string;
    application_date: string | null;
    status: string;
    loan_cycle: number;
    loan_cycle_label?: string;
    applied_amount: number;
    rate_yearly: number;
    installment_amount_monthly: number;
    installment_amount_monthly_exact: number;
    service_charge_amount_exact: number;
    total_installments: number;
    grace_months: number;
    interval_months: number;
    principal_amount: number;
    service_charge_amount: number;
    total_payable: number;
    max_loan_limit_amount: number | null;
    max_loan_limit_percentage: number | null;
    notes: string | null;
    rejection_reason: string | null;
    approved_at: string | null;
    approver_name: string | null;
    disbursed_at: string | null;
    employee_loan_id: number | null;
    loan_number: string | null;
    employee: {
        label: string;
        branch: string | null;
        department: string | null;
        designation: string | null;
    };
    policy: { code: string; name: string } | null;
    committee_name: string | null;
};

const fmt = fmtLoanAmount;

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        pending: 'bg-amber-100 text-amber-800 border-amber-200',
        approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        rejected: 'bg-red-100 text-red-800 border-red-200',
        disbursed: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return map[status] ?? 'bg-zinc-100 text-zinc-600';
};

export default function LoanApplicationShow({ application }: { application: Application }) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');
    const editable = ['draft', 'pending'].includes(application.status);

    return (
        <EmployeeLoanLayout
            title={application.application_number}
            activeTab="applications-list"
            description="Loan application details"
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Link
                    href={employeeLoanPath(route('loan-applications.index'))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-amber-700"
                >
                    <ArrowLeft className="h-3 w-3" /> Application list
                </Link>
                <div className="flex gap-2">
                    {canEdit && editable && (
                        <Link href={employeeLoanPath(route('loan-applications.edit', application.id))}>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                                <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                        </Link>
                    )}
                    {application.employee_loan_id && (
                        <Link href={employeeLoanPath(route('employee-loans.show', application.employee_loan_id))}>
                            <Button size="sm" className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700">
                                View loan {application.loan_number ? `(${application.loan_number})` : ''}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px] capitalize', statusBadge(application.status))}>
                    {application.status}
                </Badge>
                {application.policy && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {application.policy.name} ({application.policy.code})
                    </span>
                )}
                {application.committee_name && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        Committee: {application.committee_name}
                    </span>
                )}
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Employee</p>
                        <p className="text-sm font-semibold">{application.employee.label}</p>
                        <p className="text-[10px] text-zinc-400">
                            {[application.employee.branch, application.employee.department, application.employee.designation]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Applied amount</p>
                        <p className="text-lg font-bold tabular-nums">{fmt(application.applied_amount)}</p>
                        <p className="text-[10px] text-zinc-400">Date: {application.application_date ?? '—'}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs border-amber-200 bg-amber-50/20">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-amber-800">Monthly installment</p>
                        <p className="text-lg font-bold tabular-nums text-amber-900">
                            {fmt(application.installment_amount_monthly)}
                        </p>
                        <p className="text-[10px] text-amber-700">
                            {application.total_installments} months · {application.rate_yearly}% p.a.
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Total payable</p>
                        <p className="text-lg font-bold tabular-nums">{fmt(application.total_payable)}</p>
                        <p className="text-[10px] text-zinc-400">Principal {fmt(application.principal_amount)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <Card className="shadow-2xs">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Calculation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-4 pb-4 text-xs">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Loan cycle</span>
                            <span className="font-medium">{application.loan_cycle_label ?? application.loan_cycle}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Grace months</span>
                            <span className="font-medium">{application.grace_months}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Interval months</span>
                            <span className="font-medium">{application.interval_months}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Service charge</span>
                            <span className="font-medium tabular-nums">{fmt(application.service_charge_amount)}</span>
                        </div>
                        {application.max_loan_limit_amount != null && (
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Max limit (amount)</span>
                                <span className="font-medium tabular-nums">{fmt(application.max_loan_limit_amount)}</span>
                            </div>
                        )}
                        {application.max_loan_limit_percentage != null && (
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Max limit (%)</span>
                                <span className="font-medium">{application.max_loan_limit_percentage}%</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-2xs">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Workflow</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-4 pb-4 text-xs">
                        {application.approved_at && (
                            <div>
                                <span className="text-zinc-500">Approved</span>
                                <p className="font-medium">
                                    {application.approved_at}
                                    {application.approver_name ? ` · ${application.approver_name}` : ''}
                                </p>
                            </div>
                        )}
                        {application.disbursed_at && (
                            <div>
                                <span className="text-zinc-500">Disbursed</span>
                                <p className="font-medium">{application.disbursed_at}</p>
                            </div>
                        )}
                        {application.rejection_reason && (
                            <div>
                                <span className="text-zinc-500">Rejection reason</span>
                                <p className="font-medium text-red-700">{application.rejection_reason}</p>
                            </div>
                        )}
                        {application.notes && (
                            <div>
                                <span className="text-zinc-500">Notes</span>
                                <p className="font-medium whitespace-pre-wrap">{application.notes}</p>
                            </div>
                        )}
                        {!application.approved_at && !application.disbursed_at && !application.rejection_reason && !application.notes && (
                            <p className="text-zinc-400">No workflow notes yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </EmployeeLoanLayout>
    );
}
