import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { PayrollPayscaleFilter } from '@/components/payroll/PayrollFilterGrid';
import { Edit, Layers, Plus, Search, Trash2, X } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/components/DataTablePagination';

type PayscaleOption = { id: number; name: string };
type Grade = {
    id: number;
    payscale_id: number;
    name: string | null;
    sort_order: number;
    is_active: boolean;
    steps_count: number;
    payscale?: PayscaleOption;
};
type Paginated = { data: Grade[]; meta: PaginationMeta; links: any };

export default function SalaryGradeIndex({
    grades,
    payscales,
    filters,
}: {
    grades: Paginated;
    payscales: PayscaleOption[];
    filters: { search?: string; per_page?: string; payscale_id?: string };
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [payscaleId, setPayscaleId] = useState(filters.payscale_id || '');

    const applyFilters = (overrides: { search?: string; payscale_id?: string } = {}) => {
        router.get(
            route('salary-grades.index'),
            {
                search: overrides.search ?? search,
                payscale_id: overrides.payscale_id ?? payscaleId,
                per_page: filters.per_page,
            },
            { preserveState: true },
        );
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this salary grade?')) router.delete(route('salary-grades.destroy', id));
    };

    return (
        <Layout>
            <Head title="Salary Grades" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Salary Grades</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage grade bands within each payscale</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search grade name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        applyFilters({ search: '' });
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <PayrollPayscaleFilter
                                value={payscaleId}
                                onChange={(next) => {
                                    setPayscaleId(next);
                                    applyFilters({ payscale_id: next });
                                }}
                                payscales={payscales}
                            />
                            <Button onClick={() => applyFilters()} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            <Link href={route('salary-grades.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Grade
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
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Grade</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Payscale</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Sort</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Steps</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {grades.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            No salary grades found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    grades.data.map((g) => (
                                        <TableRow key={g.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                            <TableCell className="pl-6 font-medium text-slate-800">{g.name || '—'}</TableCell>
                                            <TableCell>{g.payscale?.name ?? '—'}</TableCell>
                                            <TableCell>{g.sort_order}</TableCell>
                                            <TableCell>{g.steps_count}</TableCell>
                                            <TableCell>
                                                <Badge variant={g.is_active ? 'default' : 'secondary'}>
                                                    {g.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                                                        title="Edit"
                                                        onClick={() => router.get(route('salary-grades.edit', g.id))}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                        title="Delete"
                                                        onClick={() => handleDelete(g.id)}
                                                    >
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
                            meta={grades.meta}
                            links={grades.links}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={(val) => {
                                router.get(route('salary-grades.index'), { ...filters, per_page: val }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
