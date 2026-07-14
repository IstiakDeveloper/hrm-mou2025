import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';

type Installment = {
    id: number;
    installment_no: number;
    due_date: string | null;
    principal_amount: number;
    service_charge_amount: number;
    total_amount: number;
    paid_principal_amount: number | null;
    paid_service_charge_amount: number | null;
    status: string;
    paid_at: string | null;
    paid_amount: number | null;
};

type Props = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
    };
    loan: {
        id: number;
        loan_number: string;
        loan_type_label: string;
        status: string;
        principal_amount: number;
        service_charge_amount: number;
        total_payable: number;
        installment_count: number;
        installment_amount: number;
        outstanding_balance: number;
        outstanding_principal: number;
        outstanding_service_charge: number;
        recovered_principal: number;
        recovered_service_charge: number;
        paid_installments: number;
        disbursement_date: string | null;
        first_installment_date: string | null;
        reference_no: string | null;
        notes: string | null;
        policy: { name: string; code: string } | null;
        is_legacy_import: boolean;
        legacy_paid_through: string | null;
        legacy_paid_installments: number | null;
        employee: {
            id: number;
            label: string;
            branch: string | null;
            department: string | null;
            designation: string | null;
        };
    };
    schedule: Installment[];
};

const fmt = fmtLoanAmount;

export default function EmployeeLoanShow({ loan, schedule }: Props) {
    return (
        <Layout>
            <Head title={loan.loan_number} />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-zinc-950">{loan.loan_type_label}</h1>
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{loan.loan_number}</Badge>
                            <Badge variant="outline" className="capitalize">{loan.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-zinc-600">{loan.employee.label}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                            <Link href={employeeLoanEmployeePath('/employee/loan')}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                My loans
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                            <Link href={employeeLoanEmployeePath(`/employee/loan/${loan.id}/ledger`)}>
                                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                Ledger
                            </Link>
                        </Button>
                    </div>
                </div>

                {(loan.is_legacy_import || loan.policy) && (
                    <div className="mb-4 flex flex-wrap gap-2 text-xs">
                        {loan.policy && <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">Policy: {loan.policy.name}</span>}
                        {loan.is_legacy_import && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
                                Imported loan
                                {loan.legacy_paid_through ? ` · Paid through ${loan.legacy_paid_through}` : ''}
                                {loan.legacy_paid_installments ? ` · ${loan.legacy_paid_installments} installment(s) paid` : ''}
                            </span>
                        )}
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-4">
                    <SummaryCard label="Principal" value={fmt(loan.principal_amount)} />
                    <SummaryCard label="Service charge" value={fmt(loan.service_charge_amount)} />
                    <SummaryCard label="Outstanding" value={fmt(loan.outstanding_balance)} accent="amber" />
                    <SummaryCard label="Installment" value={fmt(loan.installment_amount)} />
                    <SummaryCard label="Progress" value={`${loan.paid_installments}/${loan.installment_count}`} />
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Loan details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4 text-sm">
                            <DetailRow label="Employee" value={loan.employee.label} />
                            <DetailRow label="Designation" value={loan.employee.designation || '—'} />
                            <DetailRow label="Branch" value={loan.employee.branch || '—'} />
                            <DetailRow label="Department" value={loan.employee.department || '—'} />
                            <DetailRow label="Reference no" value={loan.reference_no || '—'} />
                            <DetailRow label="Disbursement date" value={loan.disbursement_date || '—'} />
                            <DetailRow label="First installment" value={loan.first_installment_date || '—'} />
                            <DetailRow label="Outstanding principal" value={fmt(loan.outstanding_principal)} />
                            <DetailRow label="Outstanding service charge" value={fmt(loan.outstanding_service_charge)} />
                            <DetailRow label="Recovered principal" value={fmt(loan.recovered_principal)} />
                            <DetailRow label="Recovered service charge" value={fmt(loan.recovered_service_charge)} />
                            <DetailRow label="Total payable" value={fmt(loan.total_payable)} />
                            <DetailRow label="Installments" value={String(loan.installment_count)} />
                            {loan.notes && <DetailRow label="Notes" value={loan.notes} multiline />}
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Installment schedule</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Due date</th>
                                            <th className="px-4 py-3 text-right">Principal</th>
                                            <th className="px-4 py-3 text-right">Service charge</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-right">Paid PR</th>
                                            <th className="px-4 py-3 text-right">Paid SC</th>
                                            <th className="px-4 py-3 text-right">Paid</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Paid date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedule.map((row) => (
                                            <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                                                <td className="px-4 py-3 text-sm font-mono text-zinc-700">{row.installment_no}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-700">{row.due_date || '—'}</td>
                                                <td className="px-4 py-3 text-right font-mono text-sm text-zinc-700">{fmt(row.principal_amount)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-sm text-violet-700">{fmt(row.service_charge_amount)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-sm text-zinc-700">{fmt(row.total_amount)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-sm text-emerald-700">{row.paid_principal_amount != null ? fmt(row.paid_principal_amount) : '—'}</td>
                                                <td className="px-4 py-3 text-right font-mono text-sm text-emerald-700">{row.paid_service_charge_amount != null ? fmt(row.paid_service_charge_amount) : '—'}</td>
                                                <td className="px-4 py-3 text-right font-mono text-sm text-emerald-700">{row.paid_amount ? fmt(row.paid_amount) : '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="capitalize">{row.status}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-500">{row.paid_at || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </PageSurface>
        </Layout>
    );
}

function SummaryCard({ label, value, accent = 'zinc' }: { label: string; value: string; accent?: 'zinc' | 'amber' }) {
    return (
        <Card className={accent === 'amber' ? 'border-amber-200 bg-amber-50/40 shadow-sm' : 'border-zinc-200/90 shadow-sm'}>
            <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                <p className={`mt-2 text-xl font-bold tabular-nums ${accent === 'amber' ? 'text-amber-900' : 'text-zinc-950'}`}>{value}</p>
            </CardContent>
        </Card>
    );
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
    return (
        <div className={`flex gap-4 ${multiline ? 'items-start' : 'items-center'} justify-between border-b border-zinc-100 pb-2 last:border-0 last:pb-0`}>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
            <span className={`text-right text-zinc-900 ${multiline ? 'max-w-[70%]' : ''}`}>{value}</span>
        </div>
    );
}
