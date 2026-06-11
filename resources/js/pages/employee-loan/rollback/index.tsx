import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    PayrollBranchSelect,
    PayrollEmployeeSelect,
    PayrollField,
} from '@/components/payroll/PayrollFilterGrid';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

type LoanRow = {
    id: number;
    loan_number: string;
    employee_label: string;
    branch: string | null;
    policy_name: string | null;
    principal_amount: number;
    outstanding_balance: number;
    disbursement_date: string | null;
    is_legacy_import: boolean;
    migration_number: string | null;
    application_number: string | null;
    source: string;
};

type MigrationRow = {
    id: number;
    migration_number: string;
    closing_date: string | null;
    committee_name: string | null;
    item_count: number;
    created_at: string | null;
};

type Props = {
    filters: Record<string, string>;
    loans: LoanRow[];
    migrations: MigrationRow[];
    branches: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
};

const fmt = fmtLoanAmount;

export default function LoanRollbackIndex({ filters: init, loans, migrations, branches, employees }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canRollback = hasAppPermission(auth, 'payroll.edit');

    const [filters, setFilters] = useState({
        search: init.search || '',
        branch_id: init.branch_id || '',
        employee_id: init.employee_id || '',
    });
    const [showFilters, setShowFilters] = useState(true);
    const [selected, setSelected] = useState<number[]>([]);
    const [rolling, setRolling] = useState(false);
    const [rollingMigration, setRollingMigration] = useState<number | null>(null);

    const applyFilters = () => {
        router.get(route('loan-rollback.index'), filters, { preserveState: true });
    };

    const toggle = (id: number) => {
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    };

    const toggleAll = () => {
        setSelected(selected.length === loans.length ? [] : loans.map((l) => l.id));
    };

    const rollbackLoans = () => {
        if (!selected.length) return;
        if (!confirm(`Rollback ${selected.length} selected loan(s)? This cannot be undone.`)) return;
        setRolling(true);
        router.post(
            route('loan-rollback.loans'),
            { loan_ids: selected },
            {
                onFinish: () => {
                    setRolling(false);
                    setSelected([]);
                },
            },
        );
    };

    const rollbackMigration = (migration: MigrationRow) => {
        if (!confirm(`Rollback entire migration ${migration.migration_number} (${migration.item_count} loans)?`)) return;
        setRollingMigration(migration.id);
        router.post(route('loan-rollback.migrations', migration.id), {}, {
            onFinish: () => setRollingMigration(null),
        });
    };

    return (
        <EmployeeLoanLayout
            title="Loan rollback"
            activeTab="rollback"
            description="Undo disbursement or migration before any payroll deduction. For posted salary, use Payroll → Salary Rollback."
        >
            {migrations.length > 0 && (
                <Card className="mb-4 border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Migration batches</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Roll back an entire migration batch at once.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-zinc-50/80">
                                    <TableHead className="text-xs">Migration no</TableHead>
                                    <TableHead className="text-xs">Closing</TableHead>
                                    <TableHead className="text-xs">Committee</TableHead>
                                    <TableHead className="text-xs text-center">Loans</TableHead>
                                    <TableHead className="text-xs">Saved at</TableHead>
                                    <TableHead className="text-xs w-28" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {migrations.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="text-xs font-mono font-semibold">{m.migration_number}</TableCell>
                                        <TableCell className="text-xs">{m.closing_date}</TableCell>
                                        <TableCell className="text-xs">{m.committee_name ?? '—'}</TableCell>
                                        <TableCell className="text-xs text-center">{m.item_count}</TableCell>
                                        <TableCell className="text-xs text-zinc-500">{m.created_at}</TableCell>
                                        <TableCell>
                                            {canRollback && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-7 text-[10px]"
                                                    disabled={rollingMigration === m.id}
                                                    onClick={() => rollbackMigration(m)}
                                                >
                                                    <RotateCcw className="mr-1 h-3 w-3" />
                                                    Rollback
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

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
                    <span className="text-xs text-zinc-500">{loans.length} rollback-eligible loan(s)</span>
                </div>
                {canRollback && (
                    <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs"
                        disabled={rolling || selected.length === 0}
                        onClick={rollbackLoans}
                    >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        {rolling ? 'Rolling back…' : `Rollback selected (${selected.length})`}
                    </Button>
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
                        <PayrollEmployeeSelect
                            employees={employees}
                            value={filters.employee_id}
                            onChange={(v) => setFilters({ ...filters, employee_id: v })}
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
                            {canRollback && (
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={loans.length > 0 && selected.length === loans.length}
                                        onCheckedChange={toggleAll}
                                    />
                                </TableHead>
                            )}
                            <TableHead className="text-xs">Loan no</TableHead>
                            <TableHead className="text-xs">Employee</TableHead>
                            <TableHead className="text-xs">Source</TableHead>
                            <TableHead className="text-xs text-right">Principal</TableHead>
                            <TableHead className="text-xs text-right">Outstanding</TableHead>
                            <TableHead className="text-xs">Disbursed</TableHead>
                            <TableHead className="text-xs w-16" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canRollback ? 8 : 7} className="py-10 text-center text-sm text-zinc-500">
                                    No loans eligible for rollback.
                                </TableCell>
                            </TableRow>
                        ) : (
                            loans.map((loan) => (
                                <TableRow key={loan.id} className="hover:bg-amber-50/30">
                                    {canRollback && (
                                        <TableCell>
                                            <Checkbox
                                                checked={selected.includes(loan.id)}
                                                onCheckedChange={() => toggle(loan.id)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell className="text-xs font-mono font-semibold">{loan.loan_number}</TableCell>
                                    <TableCell className="text-xs">
                                        <div className="font-medium">{loan.employee_label}</div>
                                        <div className="text-[10px] text-zinc-400">{loan.branch ?? '—'}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {loan.source}
                                        {loan.migration_number && (
                                            <div className="text-[10px] text-zinc-400">{loan.migration_number}</div>
                                        )}
                                        {loan.application_number && (
                                            <div className="text-[10px] text-zinc-400">{loan.application_number}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">{fmt(loan.principal_amount)}</TableCell>
                                    <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-800">
                                        {fmt(loan.outstanding_balance)}
                                    </TableCell>
                                    <TableCell className="text-xs">{loan.disbursement_date}</TableCell>
                                    <TableCell>
                                        <Link
                                            href={employeeLoanPath(route('employee-loans.show', loan.id))}
                                            className="text-[10px] font-semibold text-zinc-600 hover:text-emerald-700"
                                        >
                                            View
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
