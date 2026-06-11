import React from 'react';
import { Link } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
    id: number;
    employee_label: string;
    policy_name: string | null;
    disbursement_date: string | null;
    disburse_amount: number;
    installment_amount: number;
    passed_months: number;
    outstanding_principal: number;
    outstanding_service_charge: number;
    outstanding_total: number;
    loan_number: string | null;
    employee_loan_id: number | null;
    loan_status: string | null;
};

type Batch = {
    id: number;
    migration_number: string;
    closing_date: string | null;
    committee_name: string | null;
    created_by: string | null;
    created_at: string | null;
    items: Item[];
};

const fmt = fmtLoanAmount;

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        active: 'bg-amber-100 text-amber-800 border-amber-200',
        completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        cancelled: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    };
    return map[status] ?? 'bg-zinc-100 text-zinc-600';
};

export default function LoanMigrationShow({ batch }: { batch: Batch }) {
    return (
        <EmployeeLoanLayout
            title={batch.migration_number}
            activeTab="migration"
            description="Migrated loans at closing date"
        >
            <div className="mb-4">
                <Link
                    href={employeeLoanPath(route('loan-migration.index'))}
                    className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Migration list
                </Link>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Closing date</p>
                        <p className="text-sm font-semibold">{batch.closing_date ?? '—'}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Committee</p>
                        <p className="text-sm font-semibold">{batch.committee_name ?? '—'}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Loans migrated</p>
                        <p className="text-lg font-bold tabular-nums">{batch.items.length}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Saved</p>
                        <p className="text-sm font-medium">{batch.created_at ?? '—'}</p>
                        <p className="text-[10px] text-zinc-500">{batch.created_by ?? '—'}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            <TableHead className="text-xs">Employee</TableHead>
                            <TableHead className="text-xs">Policy</TableHead>
                            <TableHead className="text-xs">Disbursed</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs text-right">Install/mo</TableHead>
                            <TableHead className="text-xs text-center">Passed</TableHead>
                            <TableHead className="text-xs text-right">Out PR</TableHead>
                            <TableHead className="text-xs text-right">Out SC</TableHead>
                            <TableHead className="text-xs text-right">Out total</TableHead>
                            <TableHead className="text-xs">Loan no</TableHead>
                            <TableHead className="text-xs w-24" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batch.items.map((row) => (
                            <TableRow key={row.id} className="hover:bg-amber-50/30">
                                <TableCell className="text-xs font-medium">{row.employee_label}</TableCell>
                                <TableCell className="text-xs">{row.policy_name}</TableCell>
                                <TableCell className="text-xs">{row.disbursement_date}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.disburse_amount)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.installment_amount)}</TableCell>
                                <TableCell className="text-xs text-center tabular-nums">{row.passed_months}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.outstanding_principal)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.outstanding_service_charge)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-800">
                                    {fmt(row.outstanding_total)}
                                </TableCell>
                                <TableCell className="text-xs font-mono">{row.loan_number ?? '—'}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {row.employee_loan_id && (
                                            <Link
                                                href={employeeLoanPath(route('employee-loans.show', row.employee_loan_id))}
                                                className="inline-flex items-center rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                                            >
                                                View
                                            </Link>
                                        )}
                                        {row.loan_status && (
                                            <Badge variant="outline" className={cn('text-[10px] capitalize', statusBadge(row.loan_status))}>
                                                {row.loan_status}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </EmployeeLoanLayout>
    );
}
