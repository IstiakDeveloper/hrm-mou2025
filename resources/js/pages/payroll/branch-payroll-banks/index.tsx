import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Building2, Edit, Plus, Search, Trash2 } from 'lucide-react';

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
    records: { data: BranchPayrollBankRow[]; meta: { current_page: number; last_page: number; total: number } };
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
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Branch payroll banks</h1>
                        <p className="text-sm text-gray-500">
                            Payroll bank accounts per branch
                            {unassignedBranchCount > 0 && (
                                <span className="ml-2 text-amber-600">({unassignedBranchCount} branches without a record)</span>
                            )}
                        </p>
                    </div>
                    <Link href={route('branch-payroll-banks.create')}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add record
                        </Button>
                    </Link>
                </div>

                <Card className="mb-4">
                    <CardContent className="flex gap-2 pt-4">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Search branch, bank, account..."
                            className="max-w-sm"
                        />
                        <Button variant="outline" onClick={applyFilters}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            All records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Bank branch</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                                            No branch payroll bank records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.data.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">
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
                                            <TableCell className="space-x-2 text-right">
                                                <Link href={route('branch-payroll-banks.edit', r.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="outline" size="sm" onClick={() => handleDelete(r.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
