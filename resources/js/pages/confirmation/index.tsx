import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Briefcase, Check, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, User, X } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { parseFormDateValue } from '@/lib/display-date';

function formatConfirmationDate(value: unknown): string {
    const d = parseFormDateValue(value);
    return d ? format(d, 'dd MMM yyyy') : '—';
}

type Employee = EmployeeNameFields & { id: number; employee_id: string };
type Designation = { id: number; name: string };
type EmployeeType = { id: number; name: string; probation_months: number };

type Confirmation = {
    id: number;
    employee_id: number;
    confirmation_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    confirmation_order_no: string | null;
    employee: Employee & { employee_type?: EmployeeType; employeeType?: EmployeeType };
    fromDesignation?: Designation | null;
    toDesignation?: Designation | null;
    fromEmployeeType?: EmployeeType | null;
    toEmployeeType?: EmployeeType | null;
};

function pickName(x: Designation | EmployeeType | null | undefined): string {
    return x?.name?.trim() ? x.name : '—';
}

type PaginationLinks = { url: string | null; label: string; active: boolean };
type PaginationMeta = { current_page: number; last_page: number; links: PaginationLinks[]; total: number; per_page: number };
type ConfirmationsResponse = { data: Confirmation[]; links?: { prev: string | null; next: string | null }; meta?: PaginationMeta };

type Props = {
    confirmations: ConfirmationsResponse;
    employees: Employee[];
    filters: { status?: string; employee_id?: string; from_date?: string; to_date?: string; search?: string; per_page?: string };
    canEditConfirmations?: boolean;
    canEditCompleted?: boolean;
};

function statusBadge(status: Confirmation['status']) {
    switch (status) {
        case 'pending':
            return <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">Pending</Badge>;
        case 'approved':
            return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Scheduled</Badge>;
        case 'rejected':
            return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Rejected</Badge>;
        case 'cancelled':
            return <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">Cancelled</Badge>;
        case 'completed':
            return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export default function ConfirmationIndex({
    confirmations,
    employees,
    filters,
    canEditConfirmations = false,
    canEditCompleted = false,
}: Props) {
    const [status, setStatus] = useState(filters.status || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');

    const filterParams = () => ({
        status: status !== 'all' ? status : '',
        employee_id: employeeId !== 'all' ? employeeId : '',
        from_date: fromDate,
        to_date: toDate,
        search: search.trim(),
        per_page: perPage,
    });

    const applyFilters = () => router.get(route('confirmations.index'), filterParams(), { preserveState: true });
    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('confirmations.index'), { ...filterParams(), per_page: value }, { preserveState: true });
    };
    const reset = () => {
        setStatus('all');
        setEmployeeId('all');
        setFromDate('');
        setToDate('');
        setSearch('');
        setPerPage('10');
        router.get(route('confirmations.index'), { per_page: '10' }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Confirmations" />
            <PageSurface>
                <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Confirmations</h1>
                        <p className="mt-1 text-sm text-slate-500">Confirm probation employees after successful review</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:flex-row md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm"
                            />
                            {search && (
                                <button onClick={reset} className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button onClick={applyFilters} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700">Search</Button>
                        <Link href={route('confirmations.create')}>
                            <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-1 h-4 w-4" />
                                New Confirmation
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card className="mb-6 rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:gap-4">
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={employeeId} onValueChange={setEmployeeId}>
                                <SelectTrigger className="md:w-64"><SelectValue placeholder="Employee" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
                                    {employees.map((e) => (
                                        <SelectItem key={e.id} value={String(e.id)}>
                                            {e.employee_id} — {employeeDisplayName(e)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="space-y-1">
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 md:w-40" title="From date" />
                            </div>
                            <div className="space-y-1">
                                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 md:w-40" title="To date" />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={applyFilters} className="bg-emerald-600 hover:bg-emerald-700">Apply</Button>
                                <Button variant="outline" onClick={reset}>Reset</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                    <TableHead className="h-11 pl-6 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Employee</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Change</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Confirmation Date</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Order No.</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Status</TableHead>
                                    <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {confirmations.data.length ? (
                                    confirmations.data.map((c) => (
                                        <TableRow key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <Link href={route('confirmations.show', c.id)} className="text-[13px] font-semibold text-slate-800 hover:text-emerald-600">
                                                            {employeeDisplayName(c.employee)}
                                                        </Link>
                                                        <div className="font-mono text-xs text-slate-500">ID: {c.employee.employee_id}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const anyC: any = c;
                                                    const fromDes = anyC.fromDesignation ?? anyC.from_designation;
                                                    const toDes = anyC.toDesignation ?? anyC.to_designation;
                                                    const fromType = anyC.fromEmployeeType ?? anyC.from_employee_type;
                                                    const toType = anyC.toEmployeeType ?? anyC.to_employee_type;
                                                    return (
                                                        <div className="text-[13px] text-slate-700">
                                                            <div className="flex items-center gap-1 font-medium flex-wrap">
                                                                <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                {pickName(fromDes)}
                                                                <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                                {pickName(toDes)}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                Type: {pickName(fromType)} → {pickName(toType)}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-[13px] font-medium text-slate-600">{formatConfirmationDate(c.confirmation_date)}</TableCell>
                                            <TableCell className="text-[13px] text-slate-600">{c.confirmation_order_no ?? '—'}</TableCell>
                                            <TableCell>{statusBadge(c.status)}</TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {((canEditConfirmations && (c.status === 'pending' || c.status === 'approved')) ||
                                                        (canEditCompleted && c.status === 'completed')) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100"
                                                            title="Edit"
                                                            onClick={() => router.visit(route('confirmations.edit', c.id))}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => router.visit(route('confirmations.show', c.id))}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {c.status === 'approved' && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Apply confirmation now" onClick={() => confirm('Apply confirmation now?') && router.post(route('confirmations.complete', c.id))}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">No confirmation requests found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {confirmations.meta && confirmations.meta.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4">
                                <Select value={perPage} onValueChange={handlePerPageChange}>
                                    <SelectTrigger className="h-8 w-[70px] bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['10', '25', '50', '100'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <nav className="flex gap-1.5">
                                    {confirmations.meta.current_page > 1 && confirmations.links?.prev && (
                                        <Link href={confirmations.links.prev} preserveState className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white"><ChevronLeft className="h-4 w-4" /></Link>
                                    )}
                                    {confirmations.meta.current_page < confirmations.meta.last_page && confirmations.links?.next && (
                                        <Link href={confirmations.links.next} preserveState className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white"><ChevronRight className="h-4 w-4" /></Link>
                                    )}
                                </nav>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
