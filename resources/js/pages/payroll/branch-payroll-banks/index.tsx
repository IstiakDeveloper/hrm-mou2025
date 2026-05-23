import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Building2, Edit, Plus, Search, Trash2, X } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/Components/DataTablePagination';

type BranchRef = { id: number; name: string; branch_code: string | null };
type BranchPayrollBankRow = {
    id: number;
    branch_id: number;
    bank_name: string;
    bank_branch_name: string | null;
    account_no: string | null;
    account_type: string | null;
    notes: string | null;
    is_active: boolean;
    branch?: BranchRef;
};
export default function BranchPayrollBankIndex({
    records,
    filters,
    unassignedBranchCount,
}: {
    records: { data: BranchPayrollBankRow[]; meta: PaginationMeta; links: any };
    filters: { search?: string; per_page?: string };
    unassignedBranchCount: number;
}) {
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = () => {
        router.get(route('branch-payroll-banks.index'), { search, per_page: filters.per_page }, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('Remove this branch payroll bank record?')) {
            router.delete(route('branch-payroll-banks.destroy', id));
        }
    };

    return (
        <Layout>
            <Head title="Branch Payroll Banks" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Branch Payroll Banks</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Payroll bank accounts per branch
                            {unassignedBranchCount > 0 && (
                                <span className="ml-2 text-amber-600 font-medium">({unassignedBranchCount} branches without a record)</span>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search branch, bank, account..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => { setSearch(''); router.get(route('branch-payroll-banks.index'), { search: '', per_page: filters.per_page }, { preserveState: true }); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={applyFilters} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            <Link href={route('branch-payroll-banks.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Record
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>



                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Branch</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Bank</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Bank branch</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Account</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Type</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {records.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                            No branch payroll bank records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.data.map((r) => (
                                        <TableRow key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                            <TableCell className="pl-6 font-medium text-slate-800">
                                                {r.branch?.name ?? '—'}
                                                {r.branch?.branch_code ? ` (${r.branch.branch_code})` : ''}
                                            </TableCell>
                                            <TableCell>{r.bank_name}</TableCell>
                                            <TableCell>{r.bank_branch_name || '—'}</TableCell>
                                            <TableCell>{r.account_no || '—'}</TableCell>
                                            <TableCell className="capitalize">{r.account_type || '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant={r.is_active ? 'default' : 'secondary'}>
                                                    {r.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                    <Link href={route('branch-payroll-banks.edit', r.id)}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" title="Edit">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" title="Delete" onClick={() => handleDelete(r.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            </Table>
                        </div>
                        <DataTablePagination
                            meta={records.meta}
                            links={records.links}
                            perPage={filters.per_page || '10'} 
                            onPerPageChange={(val) => {
                                router.get(route('branch-payroll-banks.index'), { ...filters, per_page: val }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
