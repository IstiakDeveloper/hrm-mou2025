import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Plus, Settings2, Trash2 } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/Components/DataTablePagination';

type ConfigRow = {
    id: number;
    name: string;
    year: number;
    month: number;
    basic_percentage: number;
    period_label: string;
    is_active: boolean;
    bonus_type?: { id: number; name: string; code: string };
    payscale?: { id: number; name: string } | null;
    salary_grade?: { id: number; name: string } | null;
};

type Paginated = { data: ConfigRow[]; meta: PaginationMeta; links: any };

export default function BonusConfigurationIndex({
    configurations,
    bonusTypes,
    filters,
    years,
    months,
}: {
    configurations: Paginated;
    bonusTypes: { id: number; name: string; code: string }[];
    filters: Record<string, string>;
    years: number[];
    months: { value: number; label: string }[];
}) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [localFilters, setLocalFilters] = useState({
        bonus_type_id: filters.bonus_type_id || '',
        year: filters.year || '',
        month: filters.month || '',
    });

    const applyFilters = () => router.get(route('bonus-configurations.index'), { ...localFilters, per_page: filters.per_page }, { preserveState: true });
    
    const handleDelete = (id: number) => {
        if (confirm('Delete this bonus configuration?')) router.delete(route('bonus-configurations.destroy', id));
    };

    return (
        <Layout>
            <Head title="Bonus configuration" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bonus Configuration</h1>
                        <p className="text-sm text-slate-500 mt-1">Set period, eligibility, and percentage of basic salary for each bonus.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <Select value={localFilters.bonus_type_id || 'all'} onValueChange={(v) => setLocalFilters((f) => ({ ...f, bonus_type_id: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-full sm:w-48 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all">
                                <SelectValue placeholder="Bonus type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {bonusTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={localFilters.year || 'all'} onValueChange={(v) => setLocalFilters((f) => ({ ...f, year: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-full sm:w-32 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All years</SelectItem>
                                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={localFilters.month || 'all'} onValueChange={(v) => setLocalFilters((f) => ({ ...f, month: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All months</SelectItem>
                                {months.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={applyFilters} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                            Apply
                        </Button>
                        <Link href={route('bonus-configurations.create')} className="w-full sm:w-auto">
                            <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-1 h-4 w-4" />
                                Add Config
                            </Button>
                        </Link>
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
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Type</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Period</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">% of basic</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Scope</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {configurations.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                No configurations. Create one with a bonus type and % of basic salary.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        configurations.data.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                                <TableCell className="pl-6 font-medium text-slate-800">{row.name}</TableCell>
                                                <TableCell>{row.bonus_type?.name ?? '—'}</TableCell>
                                                <TableCell>{row.period_label}</TableCell>
                                                <TableCell className="font-medium tabular-nums text-slate-700">{Number(row.basic_percentage).toLocaleString()}%</TableCell>
                                                <TableCell className="text-[13px] text-slate-500">
                                                    {row.payscale?.name ?? 'All payscales'}
                                                    {row.salary_grade ? ` · ${row.salary_grade.name}` : ''}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                                        {row.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                        <Link href={route('bonus-configurations.edit', row.id)}>
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
                            meta={configurations.meta}
                            links={configurations.links}
                            perPage={filters.per_page || '10'} 
                            onPerPageChange={(val) => {
                                router.get(route('bonus-configurations.index'), { ...localFilters, per_page: val }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
