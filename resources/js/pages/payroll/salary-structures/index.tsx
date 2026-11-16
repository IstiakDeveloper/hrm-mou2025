import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, FileText, Plus, Search, Trash2, X } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/components/DataTablePagination';

type PayscaleOption = { id: number; name: string; code: string | null };
type Structure = {
    id: number;
    name: string;
    effective_from: string | null;
    is_active: boolean;
    lines_count: number;
    payscale?: PayscaleOption;
    grade?: { id: number; code: string; name: string | null } | null;
};
type Paginated = { data: Structure[]; meta: PaginationMeta; links: any };

export default function SalaryStructureIndex({
    structures,
    payscales,
    filters,
}: {
    structures: Paginated;
    payscales: PayscaleOption[];
    filters: { search?: string; per_page?: string; payscale_id?: string };
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [payscaleId, setPayscaleId] = useState(filters.payscale_id || '');

    const applyFilters = (overrides: { search?: string; payscale_id?: string } = {}) => {
        router.get(
            route('salary-structures.index'),
            {
                search: overrides.search ?? search,
                payscale_id: overrides.payscale_id ?? payscaleId,
                per_page: filters.per_page,
            },
            { preserveState: true },
        );
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this salary structure?')) router.delete(route('salary-structures.destroy', id));
    };

    return (
        <Layout>
            <Head title="Salary Structures" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Salary Structures</h1>
                        <p className="text-sm text-slate-500 mt-1">Pay components and calculation rules</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => { setSearch(''); applyFilters({ search: '' }); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Select
                            value={payscaleId || 'all'}
                            onValueChange={(v) => {
                                const next = v === 'all' ? '' : v;
                                setPayscaleId(next);
                                applyFilters({ payscale_id: next });
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[220px] h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all">
                                <SelectValue placeholder="All payscales" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All payscales</SelectItem>
                                {payscales.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={() => applyFilters()} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            <Link href={route('salary-structures.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Structure
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
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Payscale</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Grade</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Effective</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Lines</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {structures.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                            No salary structures found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    structures.data.map((s) => (
                                        <TableRow key={s.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                            <TableCell className="pl-6 font-medium text-slate-800">{s.name}</TableCell>
                                            <TableCell>{s.payscale?.name ?? '—'}</TableCell>
                                            <TableCell>
                                                {s.grade?.name || '—'}
                                            </TableCell>
                                            <TableCell>{s.effective_from_display || '—'}</TableCell>
                                            <TableCell>{s.lines_count}</TableCell>
                                            <TableCell>
                                                <Badge variant={s.is_active ? 'default' : 'secondary'}>
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                    <Link href={route('salary-structures.edit', s.id)}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" title="Edit">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" title="Delete" onClick={() => handleDelete(s.id)}>
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
                            meta={structures.meta}
                            links={structures.links}
                            perPage={filters.per_page || '10'} 
                            onPerPageChange={(val) => {
                                router.get(route('salary-structures.index'), { ...filters, per_page: val }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
