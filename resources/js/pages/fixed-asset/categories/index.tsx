import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Boxes, Edit, Plus, Search, Trash2 } from 'lucide-react';

type CategoryRow = {
    id: number;
    code: string;
    name: string;
    name_bn: string | null;
    sort_order: number;
    is_active: boolean;
    fixed_assets_count: number;
};

export default function AssetCategoryIndex({
    categories,
    filters,
}: {
    categories: { data: CategoryRow[] };
    filters: { search?: string };
}) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = () => router.get(route('asset-categories.index'), { search }, { preserveState: true });
    const handleDelete = (id: number) => {
        if (confirm('Delete this category?')) router.delete(route('asset-categories.destroy', id));
    };

    return (
        <Layout>
            <Head title="Asset categories" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Boxes}
                    title="Asset categories"
                    description="Group fixed assets (IT, furniture, vehicles, etc.) for reporting and depreciation."
                >
                    <Link href={route('asset-categories.create')}>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add category</Button>
                    </Link>
                </PayrollPageHeader>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex gap-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Name or code…"
                            className="max-w-sm"
                        />
                        <Button variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="All categories">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Bangla</TableHead>
                                <TableHead>Assets</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        No categories yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono text-xs">{row.code}</TableCell>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{row.name_bn || '—'}</TableCell>
                                        <TableCell>{row.fixed_assets_count}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                                {row.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={route('asset-categories.edit', row.id)}>
                                                <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                                            </Link>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
