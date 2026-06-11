import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
} from '@/components/payroll/PayrollFilterGrid';
import { BookOpen, Filter, HandCoins, Plus, Search } from 'lucide-react';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import { cn } from '@/lib/utils';

type LoanRow = {
    id: number;
    loan_number: string;
    loan_type_label: string;
    status: string;
    principal_amount: number;
    outstanding_balance: number;
    installment_count: number;
    paid_installments: number;
    disbursement_date: string | null;
    employee: {
        id: number;
        label: string;
        branch: string | null;
        department: string | null;
    };
};

type Props = {
    filters: Record<string, string>;
    loans: LoanRow[];
    branches: { id: number; name: string; branch_code?: string | null }[];
    departments: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    loanTypes: { value: string; label: string }[];
    statusOptions: { value: string; label: string }[];
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

export default function EmployeeLoanIndex({
    filters: init,
    loans,
    branches,
    departments,
    employees,
    loanTypes,
    statusOptions,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const canCreate = hasAppPermission(auth, 'payroll.create');

    const [filters, setFilters] = useState({
        search: init.search || '',
        branch_id: init.branch_id || '',
        department_id: init.department_id || '',
        employee_id: init.employee_id || '',
        status: init.status || 'all',
        loan_type: init.loan_type || 'all',
    });
    const [showFilters, setShowFilters] = useState(true);

    const applyFilters = () => {
        router.get(route('employee-loans.index'), filters, { preserveState: true });
    };

    return (
        <EmployeeLoanLayout
            title="Loan Register"
            activeTab="register"
            description="Employee loans with installment schedules — auto-deducted on salary post"
        >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowFilters((v) => !v)}
                    >
                        <Filter className="mr-1 h-3 w-3" /> Filters
                    </Button>
                    <span className="text-xs text-zinc-500">{loans.length} loan(s)</span>
                </div>
                {canCreate && (
                    <div className="flex flex-wrap gap-2">
                        <Link href={employeeLoanPath(route('loan-applications.create'))}>
                            <Button size="sm" className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700">
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> New application
                            </Button>
                        </Link>
                        <Link href={employeeLoanPath(route('loan-migration.index'))}>
                            <Button size="sm" variant="outline" className="h-8 text-xs">
                                Loan migration
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {showFilters && (
                <div className="mb-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-2xs">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <PayrollField label="Search">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    className="h-8 pl-7 text-xs"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    placeholder="PIN, name, loan no..."
                                />
                            </div>
                        </PayrollField>
                        <PayrollBranchSelect
                            branches={branches}
                            value={filters.branch_id}
                            onChange={(v) => setFilters({ ...filters, branch_id: v })}
                        />
                        <PayrollComboField
                            label="Department"
                            value={filters.department_id}
                            onChange={(v) => setFilters({ ...filters, department_id: v })}
                            items={[
                                { value: '', label: 'All departments' },
                                ...departments.map((d) => ({ value: String(d.id), label: d.name })),
                            ]}
                            placeholder="All departments"
                        />
                        <PayrollEmployeeSelect
                            employees={employees}
                            value={filters.employee_id}
                            onChange={(v) => setFilters({ ...filters, employee_id: v })}
                        />
                        <PayrollComboField
                            label="Loan type"
                            value={filters.loan_type}
                            onChange={(v) => setFilters({ ...filters, loan_type: v })}
                            items={[{ value: 'all', label: 'All types' }, ...loanTypes.map((t) => ({ value: t.value, label: t.label }))]}
                        />
                        <PayrollComboField
                            label="Status"
                            value={filters.status}
                            onChange={(v) => setFilters({ ...filters, status: v })}
                            items={statusOptions.map((s) => ({ value: s.value, label: s.label }))}
                        />
                    </div>
                    <div className="mt-2 flex justify-end">
                        <Button size="sm" className="h-7 text-xs" onClick={applyFilters}>
                            Apply
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            <TableHead className="text-xs">Loan No</TableHead>
                            <TableHead className="text-xs">Employee</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs text-right">Principal</TableHead>
                            <TableHead className="text-xs text-right">Outstanding</TableHead>
                            <TableHead className="text-xs">Progress</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs w-24" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                                    <HandCoins className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                                    No employee loans found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            loans.map((loan) => (
                                <TableRow key={loan.id} className="hover:bg-amber-50/30">
                                    <TableCell className="text-xs font-mono font-semibold">{loan.loan_number}</TableCell>
                                    <TableCell className="text-xs">
                                        <div className="font-medium">{loan.employee.label}</div>
                                        <div className="text-[10px] text-zinc-400">
                                            {loan.employee.branch || '—'} · {loan.employee.department || '—'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">{loan.loan_type_label}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">{fmt(loan.principal_amount)}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-800">
                                        {fmt(loan.outstanding_balance)}
                                    </TableCell>
                                    <TableCell className="text-xs tabular-nums">
                                        {loan.paid_installments}/{loan.installment_count}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn('text-[10px] capitalize', statusBadge(loan.status))}>
                                            {loan.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Link
                                                href={employeeLoanPath(route('employee-loans.show', loan.id))}
                                                className="inline-flex items-center rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                                            >
                                                View
                                            </Link>
                                            <Link
                                                href={employeeLoanPath(route('employee-loans.ledger', loan.id))}
                                                className="inline-flex items-center rounded border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"
                                            >
                                                <BookOpen className="h-3 w-3" />
                                            </Link>
                                        </div>
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
