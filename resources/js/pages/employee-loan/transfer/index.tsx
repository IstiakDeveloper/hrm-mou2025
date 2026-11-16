import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { ArrowRightLeft, Eye, Filter, Plus } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

type TransferRow = {
    id: number;
    transfer_number: string;
    transfer_date: string | null;
    loan_number: string | null;
    from_employee_label: string;
    to_employee_label: string;
    outstanding_at_transfer: number;
    created_by: string | null;
    created_at: string | null;
};

type Props = {
    filters: { search: string };
    transfers: {
        data: TransferRow[];
    };
};

const fmt = fmtLoanAmount;

export default function LoanTransferIndex({ filters: init, transfers }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canTransfer = hasAppPermission(auth, 'payroll.edit');
    const [search, setSearch] = useState(init.search || '');

    const apply = () => router.get(route('loan-transfer.index'), { search }, { preserveState: true });

    return (
        <EmployeeLoanLayout
            title="Loan transfer"
            activeTab="transfer"
            description="Transfer an active loan from one employee to another. Schedule and outstanding move with the loan."
        >
            {canTransfer && (
                <div className="mb-4 flex justify-end">
                    <Link href={employeeLoanPath(route('loan-transfer.create'))}>
                        <Button size="sm" className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            New transfer
                        </Button>
                    </Link>
                </div>
            )}

            <div className="mb-4 flex gap-2 rounded-lg border border-zinc-200 bg-white p-3">
                <Input
                    className="h-8 w-56 text-xs"
                    placeholder="Search transfer / loan / employee"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={apply}>
                    <Filter className="mr-1 h-3.5 w-3.5" /> Filter
                </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            {['Transfer no', 'Date', 'Loan', 'From', 'To', 'Outstanding', ''].map((h) => (
                                <TableHead key={h} className="text-xs">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transfers.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                                    <ArrowRightLeft className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                                    No loan transfers yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transfers.data.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell className="text-xs font-mono font-semibold">{t.transfer_number}</TableCell>
                                    <TableCell className="text-xs">{t.transfer_date}</TableCell>
                                    <TableCell className="text-xs">{t.loan_number}</TableCell>
                                    <TableCell className="text-xs">{t.from_employee_label}</TableCell>
                                    <TableCell className="text-xs">{t.to_employee_label}</TableCell>
                                    <TableCell className="text-xs tabular-nums">{fmt(t.outstanding_at_transfer)}</TableCell>
                                    <TableCell className="text-right">
                                        <Link href={employeeLoanPath(route('loan-transfer.show', t.id))}>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                                                <Eye className="mr-1 h-3.5 w-3.5" /> View
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </EmployeeLoanLayout>
    );
}
