import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Edit, Plus, Settings2, Trash2 } from 'lucide-react';

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

export default function BonusConfigurationIndex({
    configurations,
    bonusTypes,
    filters,
    years,
    months,
}: {
    configurations: { data: ConfigRow[] };
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

    const applyFilters = () => router.get(route('bonus-configurations.index'), localFilters, { preserveState: true });
    const handleDelete = (id: number) => {
        if (confirm('Delete this bonus configuration?')) router.delete(route('bonus-configurations.destroy', id));
    };

    return (
        <Layout>
            <Head title="Bonus configuration" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Settings2}
                    title="Bonus configuration"
                    description="Set period, eligibility, and percentage of basic salary for each bonus."
                >
                    <Link href={route('bonus-configurations.create')}>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add configuration</Button>
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
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Filters" className="mb-4">
                    <div className="flex flex-wrap gap-3">
                        <Select value={localFilters.bonus_type_id || 'all'} onValueChange={(v) => setLocalFilters((f) => ({ ...f, bonus_type_id: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-48"><SelectValue placeholder="Bonus type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {bonusTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={localFilters.year || 'all'} onValueChange={(v) => setLocalFilters((f) => ({ ...f, year: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All years</SelectItem>
                                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={localFilters.month || 'all'} onValueChange={(v) => setLocalFilters((f) => ({ ...f, month: v === 'all' ? '' : v }))}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Month" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All months</SelectItem>
                                {months.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={applyFilters}>Apply</Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Configurations">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>% of basic</TableHead>
                                <TableHead>Scope</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {configurations.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        No configurations. Create one with a bonus type and % of basic salary.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                configurations.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell>{row.bonus_type?.name ?? '—'}</TableCell>
                                        <TableCell>{row.period_label}</TableCell>
                                        <TableCell className="font-medium tabular-nums">{Number(row.basic_percentage).toLocaleString()}%</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {row.payscale?.name ?? 'All payscales'}
                                            {row.salary_grade ? ` · ${row.salary_grade.name}` : ''}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                                {row.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="space-x-2 text-right">
                                            <Link href={route('bonus-configurations.edit', row.id)}>
                                                <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                                            </Link>
                                            <Button variant="outline" size="sm" onClick={() => handleDelete(row.id)}>
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
