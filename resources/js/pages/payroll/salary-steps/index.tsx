import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Layers, Plus, Trash2 } from 'lucide-react';

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
type Paginated = { data: Step[]; meta: { current_page: number; last_page: number; total: number } };

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

    const formatSalary = (value: string) => {
        const n = Number(value);
        return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
    };

    return (
        <Layout>
            <Head title="Salary Steps" />
            <PageSurface>
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Salary steps</h1>
                        <p className="text-sm text-gray-500">Basic salary amounts per grade step</p>
                    </div>
                    <Link href={route('salary-steps.create', { salary_grade_id: gradeId || undefined, payscale_id: payscaleId || undefined })}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add step
                        </Button>
                    </Link>
                </div>

                <Card className="mb-4">
                    <CardContent className="flex flex-wrap gap-2 pt-4">
                        <Select
                            value={payscaleId || 'all'}
                            onValueChange={(v) => {
                                const next = v === 'all' ? '' : v;
                                setPayscaleId(next);
                                setGradeId('');
                                applyFilters({ payscale_id: next, salary_grade_id: '' });
                            }}
                        >
                            <SelectTrigger className="w-[220px]">
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
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="All grades" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All grades</SelectItem>
                                {grades.map((g) => (
                                    <SelectItem key={g.id} value={String(g.id)}>
                                        {g.name || '—'}
                                        {g.name ? ` — ${g.name}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            All steps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Step</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Payscale</TableHead>
                                    <TableHead>Basic salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {steps.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No salary steps found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    steps.data.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.step_number}</TableCell>
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
                                            <TableCell className="space-x-2 text-right">
                                                <Link href={route('salary-steps.edit', s.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="outline" size="sm" onClick={() => handleDelete(s.id)}>
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
