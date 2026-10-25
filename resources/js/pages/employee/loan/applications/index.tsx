import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatTakaWhole } from '@/lib/taka-format';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';
import { MotorcycleDecisionModal, type MotorcycleDecisionRow } from '@/components/employee-loan/MotorcycleDecisionModal';

type Row = {
    id: number;
    application_number: string;
    application_date: string | null;
    policy_name: string | null;
    applied_amount: number;
    installment_amount_monthly: number;
    total_installments: number;
    status: string;
    loan_type?: string | null;
    workflow_stage?: string | null;
    stage_label?: string | null;
    employee_label?: string | null;
    can_act?: boolean;
    mine?: boolean;
    rejection_reason: string | null;
};

const statusLabel: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In recommendation',
    pending: 'With Accounts',
    approved: 'Approved',
    rejected: 'Rejected',
    disbursed: 'Disbursed',
    cancelled: 'Cancelled',
};

function actionLabel(stage?: string | null): string {
    if (stage === 'accounts' || stage === 'ed') return 'অনুমোদন';
    return 'সুপারিশ';
}

export default function EmployeePfLoanApplications({ applications, has_signature = false }: { applications: Row[]; has_signature?: boolean }) {
    const [acting, setActing] = useState<MotorcycleDecisionRow | null>(null);

    return (
        <Layout>
            <Head title="Application" />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-950">Application</h1>
                        <p className="mt-1 text-sm text-zinc-600">নিজের আবেদন, এবং যে মোটরসাইকেল আবেদন আপনার এলাকায় আছে। অনুমোদন এই পাতা থেকেই।</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="h-9 bg-amber-600 text-xs hover:bg-amber-700">
                            <Link href={employeeLoanEmployeePath(route('employee.loan.applications.create'))}>New PF application</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-9 text-xs">
                            <Link href={employeeLoanEmployeePath(route('employee.loan.applications.motorcycle.create'))}>New motorcycle application</Link>
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Application</th>
                                <th className="px-3 py-2 font-semibold">Employee</th>
                                <th className="px-3 py-2 font-semibold">Policy</th>
                                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                <th className="px-3 py-2 text-right font-semibold">Monthly</th>
                                <th className="px-3 py-2 font-semibold">Status</th>
                                <th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500">
                                        কোনো আবেদন নেই।
                                    </td>
                                </tr>
                            )}
                            {applications.map((row) => (
                                <tr key={row.id} className="border-t border-zinc-100">
                                    <td className="px-3 py-2">
                                        <p className="font-mono text-xs font-semibold text-zinc-900">{row.application_number}</p>
                                        <p className="text-[11px] text-zinc-500">{row.application_date}{row.loan_type === 'motorcycle_loan' ? ' · Motorcycle' : ' · PF'}</p>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-zinc-700">{row.employee_label || '—'}</td>
                                    <td className="px-3 py-2 text-xs text-zinc-700">{row.policy_name || '—'}</td>
                                    <td className="px-3 py-2 text-right text-xs tabular-nums">{formatTakaWhole(row.applied_amount)}</td>
                                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                                        {formatTakaWhole(row.installment_amount_monthly)}
                                        <span className="block text-[10px] text-zinc-400">{row.total_installments} inst.</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <Badge variant="outline" className="text-[10px]">{statusLabel[row.status] || row.status}</Badge>
                                        {row.can_act && <p className="mt-1 text-[11px] font-semibold text-amber-800">আপনার কাছে{row.stage_label ? ` · ${row.stage_label}` : ''}</p>}
                                        {row.rejection_reason && <p className="mt-1 max-w-[14rem] text-[11px] text-rose-700">{row.rejection_reason}</p>}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex flex-wrap justify-end gap-1.5">
                                            {row.status === 'draft' ? (
                                                <Link href={employeeLoanEmployeePath(row.loan_type === 'motorcycle_loan' ? route('employee.loan.applications.motorcycle.create') : route('employee.loan.applications.create'))} className="text-xs font-semibold text-amber-800 hover:underline">
                                                    Continue
                                                </Link>
                                            ) : (
                                                <Link href={employeeLoanEmployeePath(route('employee.loan.applications.show', row.id))} className="inline-flex h-7 items-center rounded-md border border-zinc-200 px-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50">
                                                    View form
                                                </Link>
                                            )}
                                            {row.can_act && row.loan_type === 'motorcycle_loan' && (
                                                <Button type="button" size="sm" className="h-7 bg-emerald-600 px-2 text-[11px] hover:bg-emerald-700" onClick={() => setActing(row)}>
                                                    {actionLabel(row.workflow_stage)}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <MotorcycleDecisionModal row={acting} hasSignature={has_signature} onClose={() => setActing(null)} />
            </PageSurface>
        </Layout>
    );
}
