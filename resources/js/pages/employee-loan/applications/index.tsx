import React from 'react';
import { Link } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { Plus } from 'lucide-react';
import { formatTakaWhole } from '@/lib/taka-format';

type Row = {
    id: number;
    application_number: string;
    application_date: string | null;
    employee_label: string;
    policy_name: string | null;
    applied_amount: number;
    installment_amount_monthly: number;
    total_installments: number;
    status: string;
    employee_loan_id: number | null;
};

export default function LoanApplicationsIndex({ applications }: { applications: Row[] }) {
    return (
        <EmployeeLoanLayout title="Loan applications" activeTab="applications-list" description="Track all loan requests from draft to disbursement.">
            <div className="mb-3 flex justify-end">
                <Link href={employeeLoanPath(route('loan-applications.create'))}>
                    <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-xs">
                        <Plus className="mr-1 h-3 w-3" /> New application
                    </Button>
                </Link>
            </div>
            <div className="rounded-lg border bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                            {['App No', 'Date', 'Employee', 'Policy', 'Amount', 'Install/mo', 'Tenure', 'Status', ''].map((h) => (
                                <TableHead key={h} className="text-[10px] uppercase text-amber-400 font-bold">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="text-xs font-mono">{row.application_number}</TableCell>
                                <TableCell className="text-xs">{row.application_date}</TableCell>
                                <TableCell className="text-xs">{row.employee_label}</TableCell>
                                <TableCell className="text-xs">{row.policy_name}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{formatTakaWhole(row.applied_amount)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{formatTakaWhole(row.installment_amount_monthly)}</TableCell>
                                <TableCell className="text-xs text-center">{row.total_installments}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[10px] capitalize">{row.status}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Link
                                            href={employeeLoanPath(route('loan-applications.show', row.id))}
                                            className="inline-flex items-center rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                                        >
                                            View
                                        </Link>
                                        {['draft', 'pending'].includes(row.status) && (
                                            <Link
                                                href={employeeLoanPath(route('loan-applications.edit', row.id))}
                                                className="inline-flex items-center rounded border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"
                                            >
                                                Edit
                                            </Link>
                                        )}
                                        {row.status === 'disbursed' && row.employee_loan_id && (
                                            <Link
                                                href={employeeLoanPath(route('employee-loans.show', row.employee_loan_id))}
                                                className="inline-flex items-center rounded border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                                            >
                                                Loan
                                            </Link>
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
