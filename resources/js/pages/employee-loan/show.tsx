import React from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, XCircle } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import { cn } from '@/lib/utils';

type Installment = {
    id: number;
    installment_no: number;
    due_date: string | null;
    total_amount: number;
    status: string;
    paid_at: string | null;
    paid_amount: number | null;
};

type Props = {
    loan: {
        id: number;
        loan_number: string;
        loan_type_label: string;
        status: string;
        principal_amount: number;
        total_payable: number;
        installment_count: number;
        installment_amount: number;
        outstanding_balance: number;
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

const installmentStatus = (status: string) => {
    const map: Record<string, string> = {
        pending: 'bg-zinc-100 text-zinc-600',
        scheduled: 'bg-blue-100 text-blue-800',
        paid: 'bg-emerald-100 text-emerald-800',
        waived: 'bg-zinc-100 text-zinc-400',
    };
    return map[status] ?? 'bg-zinc-100 text-zinc-600';
};

export default function EmployeeLoanShow({ loan, schedule }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');

    const cancelLoan = () => {
        if (!confirm('Cancel this loan? No payments must have been made.')) return;
        router.post(route('employee-loans.cancel', loan.id));
    };

    return (
        <EmployeeLoanLayout title={loan.loan_number} activeTab="register" description={loan.loan_type_label}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Link
                    href={employeeLoanPath(route('employee-loans.index'))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-amber-700"
                >
                    <ArrowLeft className="h-3 w-3" /> Register
                </Link>
                <div className="flex gap-2">
                    <Link href={employeeLoanPath(route('employee-loans.ledger', loan.id))}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                            <BookOpen className="mr-1 h-3 w-3" /> Ledger
                        </Button>
                    </Link>
                    {canEdit && loan.status === 'active' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={cancelLoan}>
                            <XCircle className="mr-1 h-3 w-3" /> Cancel loan
                        </Button>
                    )}
                </div>
            </div>

            {(loan.is_legacy_import || loan.policy) && (
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                    {loan.policy && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                            Policy: {loan.policy.name}
                        </span>
                    )}
                    {loan.is_legacy_import && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                            Imported loan
                            {loan.legacy_paid_through ? ` — paid through ${loan.legacy_paid_through}` : ''}
                            {loan.legacy_paid_installments ? ` — ${loan.legacy_paid_installments} installment(s) paid` : ''}
                        </span>
                    )}
                </div>
            )}

            <div className="grid gap-3 lg:grid-cols-4 mb-3">
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] uppercase font-bold text-zinc-500">Employee</p>
                        <p className="text-sm font-semibold">{loan.employee.label}</p>
                        <p className="text-[10px] text-zinc-400">
                            {loan.employee.branch} · {loan.employee.department}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] uppercase font-bold text-zinc-500">Principal</p>
                        <p className="text-lg font-bold tabular-nums">{fmt(loan.principal_amount)}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs border-amber-200 bg-amber-50/20">
                    <CardContent className="p-3">
                        <p className="text-[10px] uppercase font-bold text-amber-800">Outstanding</p>
                        <p className="text-lg font-bold tabular-nums text-amber-900">{fmt(loan.outstanding_balance)}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] uppercase font-bold text-zinc-500">Progress</p>
                        <p className="text-lg font-bold tabular-nums">
                            {loan.paid_installments}/{loan.installment_count}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                            {loan.status}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-2xs">
                <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Installment schedule</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-50/80">
                                <TableHead className="text-xs">#</TableHead>
                                <TableHead className="text-xs">Due date</TableHead>
                                <TableHead className="text-xs text-right">Installment amount</TableHead>
                                <TableHead className="text-xs text-right">Paid amount</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Paid date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schedule.map((row) => {
                                const hasPaid = row.paid_amount !== null && row.paid_amount > 0;
                                const amountDiffers =
                                    hasPaid &&
                                    Math.round(row.paid_amount ?? 0) !== Math.round(row.total_amount);

                                return (
                                <TableRow key={row.id}>
                                    <TableCell className="text-xs font-mono">{row.installment_no}</TableCell>
                                    <TableCell className="text-xs">{row.due_date}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums text-zinc-700">
                                        {fmt(row.total_amount)}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'text-xs text-right tabular-nums font-medium',
                                            hasPaid ? 'text-emerald-800' : 'text-zinc-400',
                                            amountDiffers && 'text-amber-800',
                                        )}
                                    >
                                        {hasPaid ? fmt(row.paid_amount) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn('text-[10px] capitalize', installmentStatus(row.status))}>
                                            {row.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-zinc-500">
                                        {row.paid_at ?? '—'}
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </EmployeeLoanLayout>
    );
}
