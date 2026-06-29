import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Layers, Plus, Trash2, Search, X } from 'lucide-react';
import { DataTablePagination, PaginationMeta } from '@/Components/DataTablePagination';
import { formatTakaWhole } from '@/lib/taka-format';

type PayscaleOption = { id: number; name: string; code: string | null };
type GradeOption = { id: number; payscale_id: number; code: string; name: string | null; payscale?: { id: number; name: string } };
type Step = {
    id: number;
    salary_grade_id: number;
    step_number: number;
    basic_salary: string;
    is_active: boolean;
    grade?: GradeOption & { payscale?: { id: number; name: string } };
};
type Paginated = { data: Step[]; meta: PaginationMeta; links: any };

export default function SalaryStepIndex({
    steps,
    payscales,
    grades,
    filters,
}: {
    steps: Paginated;
    payscales: PayscaleOption[];
    grades: GradeOption[];
    filters: { search?: string; per_page?: string; payscale_id?: string; salary_grade_id?: string };
}) {
    const [payscaleId, setPayscaleId] = useState(filters.payscale_id || '');
    const [gradeId, setGradeId] = useState(filters.salary_grade_id || '');

    const applyFilters = (overrides: { payscale_id?: string; salary_grade_id?: string } = {}) => {
        router.get(
            route('salary-steps.index'),
            {
                payscale_id: overrides.payscale_id ?? payscaleId,
                salary_grade_id: overrides.salary_grade_id ?? gradeId,
                per_page: filters.per_page,
            },
            { preserveState: true },
        );
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this salary step?')) router.delete(route('salary-steps.destroy', id));
    };

    const formatSalary = (value: string) => formatTakaWhole(value);

    return (
        <Layout>
            <Head title="Salary Steps" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Salary Steps</h1>
                        <p className="text-sm text-slate-500 mt-1">Basic salary amounts per grade step</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <Select
                            value={payscaleId || 'all'}
                            onValueChange={(v) => {
                                const next = v === 'all' ? '' : v;
                                setPayscaleId(next);
                                setGradeId('');
                                applyFilters({ payscale_id: next, salary_grade_id: '' });
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
                        <Select
                            value={gradeId || 'all'}
                            onValueChange={(v) => {
                                const next = v === 'all' ? '' : v;
                                setGradeId(next);
                                applyFilters({ salary_grade_id: next });
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[240px] h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all">
                                <SelectValue placeholder="All grades" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All grades</SelectItem>
                                {grades.filter((g) => !payscaleId || g.payscale_id === Number(payscaleId)).map((g) => (
                                    <SelectItem key={g.id} value={String(g.id)}>
                                        {g.name || '—'}
                                        {g.name ? ` — ${g.name}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Link href={route('salary-steps.create', { salary_grade_id: gradeId || undefined, payscale_id: payscaleId || undefined })} className="w-full sm:w-auto">
                            <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-1 h-4 w-4" />
                                Add Step
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Step</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Grade</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Payscale</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Basic salary</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {steps.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            No salary steps found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    steps.data.map((s) => (
                                        <TableRow key={s.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                            <TableCell className="pl-6 font-medium text-slate-800">{s.step_number}</TableCell>
                                            <TableCell>
                                                {s.grade?.name}
                                                {s.grade?.name ? ` — ${s.grade.name}` : ''}
                                            </TableCell>
                                            <TableCell>{s.grade?.payscale?.name ?? '—'}</TableCell>
                                            <TableCell>{formatSalary(s.basic_salary)}</TableCell>
                                            <TableCell>
                                                <Badge variant={s.is_active ? 'default' : 'secondary'}>
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                                                        title="Edit"
                                                        onClick={() => router.get(route('salary-steps.edit', s.id))}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                        title="Delete"
                                                        onClick={() => handleDelete(s.id)}
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
                            meta={steps.meta}
                            links={steps.links}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={(val) => {
                                router.get(route('salary-steps.index'), { ...filters, per_page: val }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
