import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollBranchSelect, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, FileBarChart2 } from 'lucide-react';

type Props = {
    filters: Record<string, string>;
    monthly: {
        rows: { transaction_type: string; employee_contribution: number; employer_contribution: number; credits: number; debits: number; count: number }[];
        grand: { employee_contribution: number; employer_contribution: number; credits: number; debits: number };
    };
    balances: {
        employee_id: number;
        employee_label: string;
        branch: string | null;
        department: string | null;
        pf_balance: number;
        pf_enrolled: boolean;
    }[];
    branches: { id: number; name: string }[];
    months: { value: number; label: string }[];
    years: number[];
};

const fmt = (n: number) =>
    Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProvidentFundSummary({ filters: init, monthly, balances, branches, months, years }: Props) {
    const [filters, setFilters] = useState({
        year: init.year || String(new Date().getFullYear()),
        month: init.month || String(new Date().getMonth() + 1),
        branch_id: init.branch_id || '',
        department_id: init.department_id || '',
    });

    const apply = () => router.get(route('provident-fund.summary'), filters, { preserveState: true });

    const totalBalance = balances.reduce((s, r) => s + r.pf_balance, 0);

    return (
        <Layout>
            <Head title="PF Summary Report" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={FileBarChart2}
                    title="PF summary report"
                    description="Monthly payroll contributions and branch-wise balances."
                >
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('provident-fund.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> PF register
                        </Link>
                    </Button>
                </PayrollPageHeader>

                <PayrollSectionCard title="Period" className="mb-6 max-w-2xl">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <PayrollYearSelect value={filters.year} onChange={(v) => setFilters((f) => ({ ...f, year: v }))} years={years} />
                        <PayrollMonthSelect value={filters.month} onChange={(v) => setFilters((f) => ({ ...f, month: v }))} months={months} />
                        <PayrollBranchSelect value={filters.branch_id} onChange={(v) => setFilters((f) => ({ ...f, branch_id: v }))} branches={branches} />
                    </div>
                    <Button className="mt-4" onClick={apply}>
                        Generate
                    </Button>
                </PayrollSectionCard>

                <PayrollSectionCard title="Monthly payroll contributions" className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                        Employee: {fmt(monthly.grand.employee_contribution)} · Employer: {fmt(monthly.grand.employer_contribution)} · Total credit:{' '}
                        {fmt(monthly.grand.credits)}
                    </p>
                    {monthly.rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payroll PF entries for this month.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                    <TableHead className="text-right">Employee</TableHead>
                                    <TableHead className="text-right">Employer</TableHead>
                                    <TableHead className="text-right">Credits</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthly.rows.map((r) => (
                                    <TableRow key={r.transaction_type}>
                                        <TableCell>{r.transaction_type}</TableCell>
                                        <TableCell className="text-right">{r.count}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmt(r.employee_contribution)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmt(r.employer_contribution)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmt(r.credits)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </PayrollSectionCard>

                <PayrollSectionCard title="Balance summary (active employees)">
                    <p className="text-sm font-medium mb-3">Total PF liability: {fmt(totalBalance)} ({balances.length} employees)</p>
                    <div className="overflow-x-auto max-h-[480px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {balances.map((r) => (
                                    <TableRow key={r.employee_id}>
                                        <TableCell className="text-sm">
                                            <Link href={route('provident-fund.ledger', r.employee_id)} className="text-violet-700 hover:underline">
                                                {r.employee_label}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{r.branch || '—'}</TableCell>
                                        <TableCell className="text-right tabular-nums text-sm">{fmt(r.pf_balance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
