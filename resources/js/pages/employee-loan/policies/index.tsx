import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination, PaginationMeta } from '@/Components/DataTablePagination';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { hasAppPermission } from '@/lib/permissions';
import type { SharedData } from '@/types';
import { Check, Pencil, Plus, Search, X } from 'lucide-react';

type Policy = {
    id: number;
    code: string;
    name: string;
    loan_type_label: string;
    tenure_years: number | null;
    total_installments: number | null;
    default_interest_rate: number;
    calculation_method: string;
    collection_method: string;
    is_amortization: boolean;
    install_amount_calculation: number | null;
    install_amount_view: boolean;
    is_active: boolean;
};

type Paginated = { data: Policy[]; meta: PaginationMeta; links: { first: string; last: string; prev: string | null; next: string | null } };

type Props = {
    policies: Paginated;
    filters: { search?: string; per_page?: string };
};

export default function LoanPoliciesIndex({ policies, filters }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canCreate = hasAppPermission(auth, 'payroll.create');
    const canEdit = hasAppPermission(auth, 'payroll.edit');
    const canDelete = hasAppPermission(auth, 'employee-loan.delete');
    const [search, setSearch] = useState(filters.search || '');

    const applySearch = () => {
        router.get(
            employeeLoanPath(route('loan-policies.index')),
            { search, per_page: filters.per_page || '25' },
            { preserveState: true },
        );
    };

    return (
        <EmployeeLoanLayout title="Loan policies" activeTab="policies" description="Configure loan types, tenure, rate, and calculation method.">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        <Input
                            className="h-8 w-52 pl-7 text-xs"
                            placeholder="Search code or name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        />
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={applySearch}>Search</Button>
                    {policies.meta && (
                        <span className="text-xs text-zinc-500">{policies.meta.total} policies</span>
                    )}
                </div>
                {canCreate && (
                    <Link href={employeeLoanPath(route('loan-policies.create'))}>
                        <Button size="sm" className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700"><Plus className="mr-1.5 h-4 w-4" /> New policy</Button>
                    </Link>
                )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-200/90 bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                            {['Policy type', 'Code', 'Policy name', 'Tenure (yr)', 'Installments', 'Rate %', 'Calc', 'Collection', 'Amort.', 'Inst. calc', 'Inst. view', 'Status', ''].map((h) => (
                                <TableHead key={h || 'a'} className="whitespace-nowrap text-xs font-semibold text-zinc-700">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {policies.data.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="text-xs">{p.loan_type_label}</TableCell>
                                <TableCell className="text-xs font-mono">{p.code}</TableCell>
                                <TableCell className="text-xs font-medium">{p.name}</TableCell>
                                <TableCell className="text-xs text-center">{p.tenure_years ?? '—'}</TableCell>
                                <TableCell className="text-xs text-center">{p.total_installments ?? '—'}</TableCell>
                                <TableCell className="text-xs text-center">{p.default_interest_rate}</TableCell>
                                <TableCell className="text-xs capitalize">{p.calculation_method}</TableCell>
                                <TableCell className="text-xs capitalize">{p.collection_method}</TableCell>
                                <TableCell className="text-xs">{p.is_amortization ? <Check className="h-4 w-4 text-emerald-600" /> : '—'}</TableCell>
                                <TableCell className="text-xs tabular-nums">{p.install_amount_calculation ?? '—'}</TableCell>
                                <TableCell className="text-xs tabular-nums">
                                    {p.install_amount_view && p.install_amount_calculation != null ? p.install_amount_calculation : '—'}
                                </TableCell>
                                <TableCell className="text-xs">{p.is_active ? <Check className="h-4 w-4 text-emerald-600" /> : '—'}</TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {canEdit && <Link href={employeeLoanPath(route('loan-policies.edit', p.id))}><Pencil className="h-3.5 w-3.5 text-zinc-500" /></Link>}
                                        {canDelete && <button type="button" onClick={() => confirm('Delete?') && router.delete(route('loan-policies.destroy', p.id))}><X className="h-3.5 w-3.5 text-red-500" /></button>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <DataTablePagination
                    meta={policies.meta}
                    links={policies.links}
                    perPage={filters.per_page || '25'}
                    onPerPageChange={(value) => router.get(employeeLoanPath(route('loan-policies.index')), { search, per_page: value }, { preserveState: true })}
                />
            </div>
        </EmployeeLoanLayout>
    );
}
