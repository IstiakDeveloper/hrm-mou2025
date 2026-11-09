import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ComboSelect } from '@/components/ComboSelect';
import { ArrowRight, Building2, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, User, X } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Named = { id: number; name: string };

type Redesignation = {
    id: number;
    effective_date: string;
    order_no: string | null;
    employee: Employee;
    fromDepartment?: Named | null;
    toDepartment?: Named | null;
    fromDesignation?: Named | null;
    toDesignation?: Named | null;
    from_department?: Named | null;
    to_department?: Named | null;
    from_designation?: Named | null;
    to_designation?: Named | null;
};

type PaginationLinks = { url: string | null; label: string; active: boolean };
type PaginationMeta = {
    current_page: number;
    last_page: number;
    links: PaginationLinks[];
    total: number;
    per_page: number;
};

type Props = {
    redesignations: {
        data: Redesignation[];
        links?: { prev: string | null; next: string | null };
        meta?: PaginationMeta;
    };
    employees: Employee[];
    filters: {
        employee_id?: string;
        from_date?: string;
        to_date?: string;
        search?: string;
        per_page?: string;
    };
    canCreate: boolean;
    canEdit: boolean;
};

function pickName(value: Named | null | undefined): string {
    return value && typeof value.name === 'string' && value.name.trim() !== '' ? value.name : '—';
}

export default function RedesignationIndex({ redesignations, employees, filters, canCreate, canEdit }: Props) {
    const [employeeId, setEmployeeId] = useState<number | null>(filters.employee_id ? Number(filters.employee_id) : null);
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');

    const filterParams = (nextPerPage = perPage) => ({
        employee_id: employeeId ?? '',
        from_date: fromDate,
        to_date: toDate,
        search: search.trim(),
        per_page: nextPerPage,
    });

    const applyFilters = () => {
        router.get(route('redesignations.index'), filterParams(), { preserveState: true });
    };

    const reset = () => {
        setEmployeeId(null);
        setFromDate('');
        setToDate('');
        setSearch('');
        setPerPage('10');
        router.get(route('redesignations.index'), { per_page: '10' }, { preserveState: true });
    };

    const meta = redesignations.meta;
    const hasPagination = Boolean(meta && redesignations.links);

    return (
        <Layout>
            <Head title="Re Designation" />
            <PageSurface>
                <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Re Designation</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Change an employee&apos;s department and designation. Salary stays the same.
                        </p>
                    </div>

                    <div className="flex w-full flex-col items-center gap-2 sm:flex-row md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name, ID, or order no..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters();
                                }}
                                className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm focus-visible:ring-orange-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button onClick={applyFilters} size="sm" className="h-9 w-full bg-orange-600 hover:bg-orange-700 sm:w-auto">
                            Search
                        </Button>
                        {canCreate && (
                            <Link href={route('redesignations.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full bg-orange-600 hover:bg-orange-700 sm:w-auto">
                                    <Plus className="mr-1 h-4 w-4" />
                                    New Re Designation
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <Card className="mb-6 overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                            <div className="w-full md:w-72">
                                <ComboSelect<number>
                                    value={employeeId}
                                    onChange={(value) => setEmployeeId(value ?? null)}
                                    placeholder="All employees"
                                    items={employees.map((employee) => ({
                                        value: employee.id,
                                        label: `${employee.employee_id} — ${employeeDisplayName(employee)}`.trim(),
                                        keywords: `${employee.employee_id} ${employeeDisplayName(employee)}`,
                                    }))}
                                />
                            </div>
                            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10 md:w-40" title="From date" />
                            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10 md:w-40" title="To date" />
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={reset} className="h-10 rounded-lg">
                                    Reset
                                </Button>
                                <Button onClick={applyFilters} className="h-10 rounded-lg bg-orange-600 hover:bg-orange-700">
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                        <TableHead className="h-11 pl-6 text-[11px] font-semibold uppercase tracking-wider text-slate-700">Employee</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">Department</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">Designation</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">Effective Date</TableHead>
                                        <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-700">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {redesignations.data.length > 0 ? (
                                        redesignations.data.map((row) => {
                                            const fromDepartment = row.fromDepartment ?? row.from_department;
                                            const toDepartment = row.toDepartment ?? row.to_department;
                                            const fromDesignation = row.fromDesignation ?? row.from_designation;
                                            const toDesignation = row.toDesignation ?? row.to_designation;

                                            return (
                                                <TableRow key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <TableCell className="pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                                                <User className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <Link
                                                                    href={route('redesignations.show', row.id)}
                                                                    className="text-[13px] font-semibold text-slate-800 hover:text-orange-600"
                                                                >
                                                                    {employeeDisplayName(row.employee)}
                                                                </Link>
                                                                <div className="font-mono text-xs text-slate-500">ID: {row.employee.employee_id}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap items-center gap-1 text-[13px] text-slate-700">
                                                            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                            {pickName(fromDepartment)}
                                                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                            {pickName(toDepartment)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap items-center gap-1 text-[13px] text-slate-700">
                                                            {pickName(fromDesignation)}
                                                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                            {pickName(toDesignation)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-[13px] font-medium text-slate-600">
                                                            {format(new Date(row.effective_date), 'dd MMM yyyy')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canEdit && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700"
                                                                    title="Edit"
                                                                    onClick={() => router.visit(route('redesignations.edit', row.id))}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                                                                title="View"
                                                                onClick={() => router.visit(route('redesignations.show', row.id))}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No re designations found.
                                                {(search || employeeId || fromDate || toDate) && (
                                                    <Button variant="link" onClick={reset} className="px-2 font-normal">
                                                        Clear filters
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {hasPagination && meta && (
                            <div className="flex items-center justify-between rounded-b-xl border-t border-slate-200 bg-slate-50/50 px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                        <span className="hidden sm:inline">Rows per page:</span>
                                        <Select
                                            value={perPage}
                                            onValueChange={(value) => {
                                                setPerPage(value);
                                                router.get(route('redesignations.index'), filterParams(value), { preserveState: true });
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px] border-slate-200 bg-white text-[13px]">
                                                <SelectValue placeholder="10" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['10', '25', '50', '100', '200', '500'].map((size) => (
                                                    <SelectItem key={size} value={size}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="hidden text-[13px] text-slate-500 sm:block">
                                        Showing{' '}
                                        <span className="font-semibold text-slate-700">
                                            {meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-semibold text-slate-700">
                                            {Math.min(meta.current_page * meta.per_page, meta.total)}
                                        </span>{' '}
                                        of <span className="font-semibold text-slate-700">{meta.total}</span>
                                    </p>
                                </div>
                                {meta.last_page > 1 && (
                                    <div className="flex items-center gap-1.5">
                                        {meta.current_page > 1 && redesignations.links?.prev && (
                                            <Link
                                                href={redesignations.links.prev}
                                                preserveState
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-orange-600"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Link>
                                        )}
                                        {meta.current_page < meta.last_page && redesignations.links?.next && (
                                            <Link
                                                href={redesignations.links.next}
                                                preserveState
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-orange-600"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
