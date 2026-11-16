import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Edit, Plus, Search, Trash2, X } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/components/DataTablePagination';

type BonusTypeRow = {
    id: number;
    code: string;
    name: string;
    name_bn: string | null;
    sort_order: number;
    is_active: boolean;
    configurations_count: number;
};

type Paginated = { data: BonusTypeRow[]; meta: PaginationMeta; links: any };

export default function BonusTypeIndex({
    bonusTypes,
    filters,
}: {
    bonusTypes: Paginated;
    filters: { search?: string; per_page?: string };
}) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = () => router.get(route('bonus-types.index'), { search, per_page: filters.per_page }, { preserveState: true });
    
    const handleDelete = (id: number) => {
        if (confirm('Delete this bonus type?')) router.delete(route('bonus-types.destroy', id));
    };

    return (
        <Layout>
            <Head title="Bonus types" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bonus Types</h1>
                        <p className="text-sm text-slate-500 mt-1">Festival, performance, and other bonus categories used in configuration.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Name or code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => { setSearch(''); router.get(route('bonus-types.index'), { search: '', per_page: filters.per_page }, { preserveState: true }); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={handleSearch} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            <Link href={route('bonus-types.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Bonus Type
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

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

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Code</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Bangla</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Configs</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bonusTypes.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                No bonus types yet. Add one to start configuring bonuses.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        bonusTypes.data.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                                <TableCell className="pl-6 font-mono text-xs">{row.code}</TableCell>
                                                <TableCell className="font-medium text-slate-800">{row.name}</TableCell>
                                                <TableCell>{row.name_bn || '—'}</TableCell>
                                                <TableCell>{row.configurations_count}</TableCell>
                                                <TableCell>
                                                    <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                                        {row.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                        <Link href={route('bonus-types.edit', row.id)}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" title="Edit">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" title="Delete" onClick={() => handleDelete(row.id)}>
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
                            meta={bonusTypes.meta}
                            links={bonusTypes.links}
                            perPage={filters.per_page || '10'} 
                            onPerPageChange={(val) => {
                                router.get(route('bonus-types.index'), { ...filters, per_page: val }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
