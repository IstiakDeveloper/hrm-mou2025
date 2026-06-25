import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayrollBranchSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard, PayrollEmptyState } from '@/components/payroll/PayrollPageShell';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { Eye, HandCoins, Search } from 'lucide-react';
import { format } from 'date-fns';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    branch?: { name: string } | null;
};

type FinalPaymentRow = {
    id: number;
    status: 'pending' | 'paid';
    pf_balance: number;
    gratuity_amount: number;
    loan_outstanding: number;
    net_payable: number;
    payment_date: string | null;
    employee: Employee;
    separation: { id: number; separation_date: string; reason: string | null };
};

type PaginationMeta = { current_page: number; last_page: number; total: number; per_page: number };
type Paginated<T> = { data: T[]; links?: { prev: string | null; next: string | null }; meta?: PaginationMeta };

type Props = {
    records: Paginated<FinalPaymentRow>;
    pendingCount: number;
    filters: Record<string, string>;
    branches: { id: number; name: string; branch_code?: string | null }[];
};

const fmt = (n: number) =>
    Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function statusBadge(status: FinalPaymentRow['status']) {
    if (status === 'paid') {
        return <Badge className="border-0 bg-emerald-600 text-white">Paid</Badge>;
    }

    return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
}

export default function FinalPaymentIndex({ records, pendingCount, filters: init, branches }: Props) {
    const [status, setStatus] = useState(init.status || 'all');
    const [branchId, setBranchId] = useState(init.branch_id || '');
    const [search, setSearch] = useState(init.search || '');

    const apply = () =>
        router.get(
            route('final-payments.index'),
            {
                status,
                branch_id: branchId,
                search: search.trim(),
            },
            { preserveState: true },
        );

    return (
        <Layout>
            <Head title="Final Payment" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={HandCoins}
                    title="Final Payment"
                    description="Separation settlement — PF refund, gratuity eligibility, outstanding loans, and net payable."
                />

                {pendingCount > 0 && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {pendingCount} separation{pendingCount === 1 ? '' : 's'} awaiting final payment.
                    </div>
                )}

                <PayrollSectionCard title="Filters" className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Status</label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <PayrollBranchSelect value={branchId} onChange={setBranchId} branches={branches} allowAll />
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Search</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Name, PIN, or employee ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && apply()}
                                    />
                                </div>
                                <Button onClick={apply} className="bg-emerald-600 hover:bg-emerald-700">
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Settlement queue" description="Created automatically when a separation is completed.">
                    {records.data.length === 0 ? (
                        <PayrollEmptyState message="No final payment records found." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Separation</TableHead>
                                    <TableHead className="text-right">PF</TableHead>
                                    <TableHead className="text-right">Gratuity</TableHead>
                                    <TableHead className="text-right">Loan (−)</TableHead>
                                    <TableHead className="text-right">Net payable</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{employeeDisplayName(row.employee)}</div>
                                            <div className="text-xs text-slate-500">{row.employee.employee_id}</div>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {format(new Date(row.separation.separation_date), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">৳{fmt(row.pf_balance)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">৳{fmt(row.gratuity_amount)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm text-rose-700">৳{fmt(row.loan_outstanding)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm font-semibold">৳{fmt(row.net_payable)}</TableCell>
                                        <TableCell>{statusBadge(row.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={route('final-payments.show', row.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
