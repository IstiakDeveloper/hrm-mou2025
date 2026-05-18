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
import { Edit, Layers, Plus, Search, Trash2 } from 'lucide-react';

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
type Paginated = { data: Grade[]; meta: { current_page: number; last_page: number; total: number } };

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
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Salary grades</h1>
                        <p className="text-sm text-gray-500">Grade bands within each payscale</p>
                    </div>
                    <Link href={route('salary-grades.create')}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add grade
                        </Button>
                    </Link>
                </div>

                <Card className="mb-4">
                    <CardContent className="flex flex-wrap gap-2 pt-4">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Search grade name..."
                            className="max-w-sm"
                        />
                        <PayrollPayscaleFilter
                            value={payscaleId}
                            onChange={(next) => {
                                setPayscaleId(next);
                                applyFilters({ payscale_id: next });
                            }}
                            payscales={payscales}
                        />
                        <Button variant="outline" onClick={() => applyFilters()}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            All grades
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Payscale</TableHead>
                                    <TableHead>Sort</TableHead>
                                    <TableHead>Steps</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {grades.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No salary grades found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    grades.data.map((g) => (
                                        <TableRow key={g.id}>
                                            <TableCell className="font-medium">{g.name || '—'}</TableCell>
                                            <TableCell>{g.payscale?.name ?? '—'}</TableCell>
                                            <TableCell>{g.sort_order}</TableCell>
                                            <TableCell>{g.steps_count}</TableCell>
                                            <TableCell>
                                                <Badge variant={g.is_active ? 'default' : 'secondary'}>
                                                    {g.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="space-x-2 text-right">
                                                <Link href={route('salary-grades.edit', g.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="outline" size="sm" onClick={() => handleDelete(g.id)}>
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
