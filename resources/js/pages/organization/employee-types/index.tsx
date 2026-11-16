import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Search, Trash2, X, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';

interface EmployeeTypeRow {
    id: number;
    name: string;
    probation_months: number;
    is_active: boolean;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from: number | null;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
}

interface Paginated {
    data: EmployeeTypeRow[];
    links?: { first: string; last: string; prev: string | null; next: string | null };
    meta?: PaginationMeta;
}

interface Props {
    employeeTypes: Paginated;
    filters: { search?: string };
}

export default function EmployeeTypesIndex({ employeeTypes, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page?.toString() || '15');
    const meta = employeeTypes.meta;
    const links = employeeTypes.links;

    const handleSearch = () => {
        router.get(route('employee-types.index'), { search, per_page: perPage }, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('employee-types.index'), { search, per_page: value }, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this employee type?')) {
            router.delete(route('employee-types.destroy', id));
        }
    };

    return (
        <Layout>
            <Head title="Employee Types" />
            <PageSurface>
                <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employee Types</h1>
                        <p className="mt-1 text-sm text-slate-500">Probation rules and labels used on employee records</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search types..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => { setSearch(''); router.get(route('employee-types.index')); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={handleSearch} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">Search</Button>
                            <Link href={route('employee-types.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Type
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
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Probation (months)</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employeeTypes.data.length ? (
                                        employeeTypes.data.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3 text-emerald-600">
                                                            <Briefcase className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-semibold text-[13px] text-slate-800">
                                                            {row.name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[13px] text-slate-600 font-medium">{row.probation_months}</TableCell>
                                                <TableCell>
                                                    {row.is_active ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Active</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-0 font-medium">Inactive</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                                                            title="Edit Type"
                                                            onClick={() => router.get(route('employee-types.edit', row.id))}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                            title="Delete Type"
                                                            onClick={() => handleDelete(row.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No employee types yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {meta && meta.last_page > 1 && links && (
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                <span className="hidden sm:inline">Rows per page:</span>
                                <Select
                                    value={perPage}
                                    onValueChange={handlePerPageChange}
                                >
                                    <SelectTrigger className="h-8 w-[70px] text-[13px] bg-white border-slate-200">
                                        <SelectValue placeholder="15" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="15">15</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[13px] text-slate-500">
                                    Showing <span className="font-semibold text-slate-700">{meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0}</span> to{' '}
                                    <span className="font-semibold text-slate-700">
                                        {Math.min(meta.current_page * meta.per_page, meta.total)}
                                    </span>{' '}
                                    of <span className="font-semibold text-slate-700">{meta.total}</span> entries
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                {meta.current_page > 1 && links.prev && (
                                    <Link
                                        href={links.prev}
                                        preserveState
                                        className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                )}

                                {meta.links && meta.links.slice(1, -1).map((link, i) => {
                                    const isActive = link.active;
                                    const isDots = link.label === '...';

                                    if (isDots) {
                                        return (
                                            <span key={i} className="relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-medium text-slate-400">
                                                ...
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={i}
                                            href={link.url || '#'}
                                            preserveState
                                            className={`relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 shadow-sm ${
                                                isActive
                                                    ? 'z-10 bg-emerald-600 text-white shadow-sm border border-emerald-600'
                                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 focus:z-20'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                })}

                                {meta.current_page < meta.last_page && links.next && (
                                    <Link
                                        href={links.next}
                                        preserveState
                                        className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                )}
                            </nav>
                        </div>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
