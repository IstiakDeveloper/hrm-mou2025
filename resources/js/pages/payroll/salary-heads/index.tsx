import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Search, Trash2, Wallet, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { DataTablePagination, PaginationMeta } from '@/Components/DataTablePagination';

type Head = {
    id: number;
    name: string;
    name_bn: string | null;
    type: string;
    default_amount_type: string;
    default_amount: string;
    is_active: boolean;
};

type Paginated = { data: Head[]; meta: PaginationMeta; links: any };

function formatDefault(type: string, amount: string | number): string {
    const n = Number(amount);
    if (type === 'percentage') return `${n}% of basic`;
    return formatTakaWithSymbol(n);
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div className="max-w-xl">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Salary Components</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Building blocks of pay — Basic, allowances, PF, tax, etc.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => { setSearch(''); router.get(route('salary-heads.index'), { search: '' }, { preserveState: true }); }}
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
                            <Link href={route('salary-heads.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Component
                                </Button>
                            </Link>
                        </div>
                    </div>
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

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-white border-b border-slate-200">
                        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                            <Wallet className="h-5 w-5 text-emerald-600" />
                            All components
                        </CardTitle>
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
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6 w-16">#</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Name</TableHead>
                                        <TableHead className="hidden md:table-cell font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Bangla</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Type</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Default</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6 w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {heads.data.map((h, i) => (
                                        <TableRow key={h.id} className={cn(!h.is_active && 'opacity-50', 'hover:bg-slate-50 transition-colors border-b border-slate-100 group')}>
                                            <TableCell className="pl-6 text-slate-500 text-[13px]">{i + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-[13px] text-slate-800">{h.name}</div>
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
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-2 transition-opacity duration-200">
                                                    <Link href={route('salary-heads.edit', h.id)}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" title="Edit">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                                        title="Delete"
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
                        <DataTablePagination
                            meta={heads.meta}
                            links={heads.links}
                            perPage={filters.search ? '10' : '10'} // In future implement per_page to the table if needed
                            onPerPageChange={(val) => {
                                router.get(route('salary-heads.index'), { search: filters.search }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
