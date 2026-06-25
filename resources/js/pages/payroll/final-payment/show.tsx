import React from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { ArrowLeft, HandCoins, RefreshCw, Save } from 'lucide-react';
import { format } from 'date-fns';
import type { SharedData } from '@/types';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    branch?: { name: string } | null;
};

type LoanRow = {
    id: number;
    loan_number: string | null;
    type_label: string;
    outstanding_balance: number;
};

type Breakdown = {
    pf?: { enrolled?: boolean; balance?: number };
    gratuity?: {
        eligible?: boolean;
        payable?: number;
        already_paid?: boolean;
        label?: string;
        completed_years?: number;
    };
    loans?: LoanRow[];
    components?: {
        pf_refund?: number;
        gratuity_payable?: number;
        loan_recovery?: number;
        net_payable?: number;
    };
};

type FinalPayment = {
    id: number;
    status: 'pending' | 'paid';
    pf_balance: number;
    gratuity_amount: number;
    gratuity_eligible: boolean;
    loan_outstanding: number;
    net_payable: number;
    payment_date: string | null;
    notes: string | null;
    breakdown: Breakdown | null;
    employee: Employee;
    separation: { id: number; separation_date: string; reason: string | null; final_payment_date: string | null };
    payer?: { name: string } | null;
};

type Props = {
    finalPayment: FinalPayment;
    settlementDetails?: {
        applied: boolean;
        applied_at?: string | null;
        items: { type: string; label: string; href: string }[];
    };
    canProcess: boolean;
};

const fmt = (n: number) =>
    Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function FinalPaymentShow({ finalPayment, settlementDetails, canProcess }: Props) {
    const { flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const breakdown = finalPayment.breakdown ?? {};
    const gratuityInfo = breakdown.gratuity ?? {};
    const pfInfo = breakdown.pf ?? {};
    const loans = breakdown.loans ?? [];

    const form = useForm({
        payment_date: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const refresh = () => router.post(route('final-payments.refresh', finalPayment.id));

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('final-payments.mark-paid', finalPayment.id));
    };

    return (
        <Layout>
            <Head title={`Final Payment — ${employeeDisplayName(finalPayment.employee)}`} />
            <PayrollPage>
                <div className="mb-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('final-payments.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Final payments
                        </Link>
                    </Button>
                </div>

                <PayrollPageHeader
                    icon={HandCoins}
                    title="Final payment settlement"
                    description={`${employeeDisplayName(finalPayment.employee)} (${finalPayment.employee.employee_id})`}
                />

                {flash?.success && (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {flash.error}
                    </div>
                )}

                <div className="mb-6 flex flex-wrap items-center gap-2">
                    {finalPayment.status === 'paid' ? (
                        <Badge className="border-0 bg-emerald-600 text-white">Paid</Badge>
                    ) : (
                        <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>
                    )}
                    <span className="text-sm text-slate-500">
                        Separation: {format(new Date(finalPayment.separation.separation_date), 'dd MMM yyyy')}
                    </span>
                    {finalPayment.payment_date && (
                        <span className="text-sm text-slate-500">
                            Paid on {format(new Date(finalPayment.payment_date), 'dd MMM yyyy')}
                        </span>
                    )}
                    {canProcess && finalPayment.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={refresh}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Recalculate
                        </Button>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <PayrollSectionCard title="Settlement breakdown">
                            <div className="space-y-4 text-sm">
                                <div className="rounded-lg border border-slate-200 p-4">
                                    <div className="mb-1 font-medium text-slate-900">Provident Fund (PF)</div>
                                    <p className="text-slate-600">
                                        {pfInfo.enrolled === false
                                            ? 'Employee is not enrolled in PF.'
                                            : `Current PF balance: ৳${fmt(finalPayment.pf_balance)}`}
                                    </p>
                                </div>

                                <div className="rounded-lg border border-slate-200 p-4">
                                    <div className="mb-1 font-medium text-slate-900">Gratuity</div>
                                    {gratuityInfo.already_paid ? (
                                        <p className="text-slate-600">Gratuity already paid separately.</p>
                                    ) : finalPayment.gratuity_eligible ? (
                                        <p className="text-slate-600">
                                            Eligible — ৳{fmt(finalPayment.gratuity_amount)}
                                            {gratuityInfo.label ? ` (${gratuityInfo.label})` : ''}
                                        </p>
                                    ) : (
                                        <p className="text-slate-600">
                                            Not eligible
                                            {gratuityInfo.label ? ` — ${gratuityInfo.label}` : ''}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-slate-200 p-4">
                                    <div className="mb-2 font-medium text-slate-900">Outstanding loans</div>
                                    {loans.length === 0 ? (
                                        <p className="text-slate-600">No active loan balance.</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Loan</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Outstanding</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loans.map((loan) => (
                                                    <TableRow key={loan.id}>
                                                        <TableCell>{loan.loan_number ?? `#${loan.id}`}</TableCell>
                                                        <TableCell>{loan.type_label}</TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            ৳{fmt(loan.outstanding_balance)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                    <p className="mt-2 text-slate-600">
                                        Total loan recovery: ৳{fmt(finalPayment.loan_outstanding)}
                                    </p>
                                </div>
                            </div>
                        </PayrollSectionCard>

                        {finalPayment.notes && (
                            <PayrollSectionCard title="Notes">
                                <p className="text-sm text-slate-700">{finalPayment.notes}</p>
                            </PayrollSectionCard>
                        )}

                        {settlementDetails?.applied && (
                            <PayrollSectionCard
                                title="Settlement records"
                                description="PF, gratuity, and loan entries created from this final payment. These will no longer appear as pending withdrawal/refund."
                            >
                                <ul className="space-y-2 text-sm">
                                    {settlementDetails.items.map((item) => (
                                        <li key={`${item.type}-${item.href}`}>
                                            <Link href={item.href} className="font-medium text-sky-700 hover:text-sky-900">
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                {settlementDetails.applied_at && (
                                    <p className="mt-3 text-xs text-slate-500">
                                        Applied {format(new Date(settlementDetails.applied_at), 'dd MMM yyyy HH:mm')}
                                    </p>
                                )}
                            </PayrollSectionCard>
                        )}
                    </div>

                    <div>
                        <PayrollSectionCard title="Net payable">
                            <div className="mb-4 text-3xl font-bold text-emerald-700">৳{fmt(finalPayment.net_payable)}</div>
                            <dl className="space-y-2 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <dt>PF refund</dt>
                                    <dd className="font-mono">+৳{fmt(breakdown.components?.pf_refund ?? finalPayment.pf_balance)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt>Gratuity</dt>
                                    <dd className="font-mono">+৳{fmt(breakdown.components?.gratuity_payable ?? finalPayment.gratuity_amount)}</dd>
                                </div>
                                <div className="flex justify-between text-rose-700">
                                    <dt>Loan recovery</dt>
                                    <dd className="font-mono">−৳{fmt(breakdown.components?.loan_recovery ?? finalPayment.loan_outstanding)}</dd>
                                </div>
                            </dl>

                            {canProcess && finalPayment.status === 'pending' && (
                                <form onSubmit={submitPayment} className="mt-6 space-y-4 border-t border-slate-200 pt-4">
                                    <PayrollField label="Payment date" required>
                                        <Input
                                            type="date"
                                            value={form.data.payment_date}
                                            onChange={(e) => form.setData('payment_date', e.target.value)}
                                            required
                                        />
                                    </PayrollField>
                                    <PayrollField label="Notes (optional)">
                                        <Textarea
                                            rows={3}
                                            value={form.data.notes}
                                            onChange={(e) => form.setData('notes', e.target.value)}
                                        />
                                    </PayrollField>
                                    <PayrollFormActions>
                                        <Button type="submit" disabled={form.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                            <Save className="mr-2 h-4 w-4" />
                                            Mark as paid
                                        </Button>
                                    </PayrollFormActions>
                                </form>
                            )}

                            {finalPayment.payer && (
                                <p className="mt-4 text-xs text-slate-500">Processed by {finalPayment.payer.name}</p>
                            )}
                        </PayrollSectionCard>

                        <div className="mt-4">
                            <Button variant="outline" size="sm" asChild className="w-full">
                                <Link href={route('separations.show', finalPayment.separation.id)}>View separation record</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </PayrollPage>
        </Layout>
    );
}
