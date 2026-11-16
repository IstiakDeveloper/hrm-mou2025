import React from 'react';
import { Link } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Props = {
    transfer: {
        id: number;
        transfer_number: string;
        transfer_date: string | null;
        reference_no: string | null;
        notes: string | null;
        outstanding_at_transfer: number;
        pending_installments_at_transfer: number;
        created_by: string | null;
        created_at: string | null;
        loan: {
            id: number;
            loan_number: string;
            loan_type_label: string;
            policy_name: string | null;
            outstanding_balance: number;
        };
        from_employee: { id: number; label: string; branch: string | null } | null;
        to_employee: { id: number; label: string; branch: string | null } | null;
    };
};

const fmt = fmtLoanAmount;

export default function LoanTransferShow({ transfer }: Props) {
    return (
        <EmployeeLoanLayout title={transfer.transfer_number} activeTab="transfer">
            <div className="mb-4">
                <Link href={employeeLoanPath(route('loan-transfer.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Transfer list
                </Link>
            </div>

            <Card className="mb-4 border-zinc-200/90 shadow-sm">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Transfer summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-xs sm:grid-cols-2 md:grid-cols-4">
                    <div>
                        <p className="text-zinc-500">Date</p>
                        <p className="font-medium">{transfer.transfer_date}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500">Outstanding at transfer</p>
                        <p className="font-semibold tabular-nums">৳{fmt(transfer.outstanding_at_transfer)}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500">Pending installments</p>
                        <p className="font-medium">{transfer.pending_installments_at_transfer}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500">Recorded by</p>
                        <p>{transfer.created_by ?? '—'}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="mb-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="py-2">
                        <CardTitle className="text-xs font-semibold text-zinc-500">From</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <p className="font-semibold">{transfer.from_employee?.label}</p>
                        <p className="text-xs text-zinc-500">{transfer.from_employee?.branch ?? '—'}</p>
                    </CardContent>
                </Card>
                <ArrowRight className="mx-auto hidden h-6 w-6 text-zinc-400 md:block" />
                <Card className="border-emerald-200/80 shadow-sm">
                    <CardHeader className="py-2">
                        <CardTitle className="text-xs font-semibold text-emerald-800">To (current holder)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <p className="font-semibold">{transfer.to_employee?.label}</p>
                        <p className="text-xs text-zinc-500">{transfer.to_employee?.branch ?? '—'}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-zinc-200/90 shadow-sm">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Loan</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                        <p className="text-zinc-500">Loan number</p>
                        <Link href={employeeLoanPath(route('employee-loans.show', transfer.loan.id))} className="font-mono font-semibold text-emerald-700 hover:underline">
                            {transfer.loan.loan_number}
                        </Link>
                    </div>
                    <div>
                        <p className="text-zinc-500">Type / Policy</p>
                        <p>{transfer.loan.loan_type_label} · {transfer.loan.policy_name ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500">Current outstanding</p>
                        <p className="font-semibold tabular-nums">৳{fmt(transfer.loan.outstanding_balance)}</p>
                    </div>
                    {transfer.reference_no && (
                        <div>
                            <p className="text-zinc-500">Reference</p>
                            <p>{transfer.reference_no}</p>
                        </div>
                    )}
                    {transfer.notes && (
                        <div className="sm:col-span-2">
                            <p className="text-zinc-500">Notes</p>
                            <p>{transfer.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </EmployeeLoanLayout>
    );
}
