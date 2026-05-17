import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

type Head = {
    id: number;
    name: string;
    name_bn: string | null;
    type: string;
    default_amount_type: string;
    default_amount: string;
    is_active: boolean;
};

type Paginated = { data: Head[]; meta: { current_page: number; last_page: number; total: number } };

function formatDefault(type: string, amount: string | number): string {
    const n = Number(amount);
    if (type === 'percentage') return `${n}% of basic`;
    return `৳ ${n.toLocaleString()}`;
}

export default function SalaryHeadIndex({ heads, filters }: { heads: Paginated; filters: { search?: string } }) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = () => router.get(route('salary-heads.index'), { search }, { preserveState: true });
    const handleDelete = (id: number, name: string) => {
        if (confirm(`Remove "${name}"? This cannot be undone if unused in structures.`)) {
            router.delete(route('salary-heads.destroy', id));
        }
    };

    const additions = heads.data.filter((h) => h.type === 'earning');
    const deductions = heads.data.filter((h) => h.type === 'deduction');

    return (
        <Layout>
            <Head title="Salary components" />
            <PageSurface>
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-xl">
                        <h1 className="text-2xl font-bold text-gray-900">Salary components</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Building blocks of pay — Basic, allowances, PF, tax, etc. Add them here first, then set amounts per
                            grade/step in{' '}
                            <Link href={route('salary-structures.manual')} className="font-medium text-violet-700 underline">
                                Salary structure
                            </Link>
                            .
                        </p>
                    </div>
                    <Link href={route('salary-heads.create')}>
                        <Button className="shrink-0">
                            <Plus className="mr-2 h-4 w-4" />
                            Add component
                        </Button>
                    </Link>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">{heads.meta?.total ?? heads.data.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-emerald-100">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-emerald-700">Additions</p>
                            <p className="text-2xl font-bold text-emerald-800">{additions.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-rose-100">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-rose-700">Deductions</p>
                            <p className="text-2xl font-bold text-rose-800">{deductions.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-4">
                    <CardContent className="flex gap-2 pt-4">
                        <Input
                            className="max-w-md"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search by name…"
                        />
                        <Button variant="outline" onClick={handleSearch}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Wallet className="h-5 w-5 text-violet-600" />
                            All components
                        </CardTitle>
                        <CardDescription>Click edit to change name, type, or default value.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {heads.data.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No components yet.{' '}
                                <Link href={route('salary-heads.create')} className="text-violet-700 font-medium underline">
                                    Add your first one
                                </Link>
                                .
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10">#</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Bangla</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Default</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right w-24"> </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {heads.data.map((h, i) => (
                                        <TableRow key={h.id} className={cn(!h.is_active && 'opacity-50')}>
                                            <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{h.name}</div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {h.name_bn || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={h.type === 'earning' ? 'default' : 'destructive'}
                                                    className={cn(
                                                        'font-normal',
                                                        h.type === 'earning' && 'bg-emerald-600 hover:bg-emerald-600',
                                                    )}
                                                >
                                                    {h.type === 'earning' ? 'Addition' : 'Deduction'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDefault(h.default_amount_type, h.default_amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={h.is_active ? 'secondary' : 'outline'}>
                                                    {h.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link href={route('salary-heads.edit', h.id)}>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                        onClick={() => handleDelete(h.id, h.name)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
