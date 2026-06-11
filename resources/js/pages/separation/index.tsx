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
import { Check, ChevronLeft, ChevronRight, Eye, Plus, Search, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & { id: number; employee_id: string };

type Separation = {
    id: number;
    employee_id: number;
    separation_date: string;
    final_payment_date: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    reason: string | null;
    employee: Employee;
};

type PaginationMeta = { current_page: number; last_page: number; total: number; per_page: number };
type SeparationsResponse = { data: Separation[]; links?: { prev: string | null; next: string | null }; meta?: PaginationMeta };

type Props = {
    separations: SeparationsResponse;
    employees: Employee[];
    filters: { status?: string; employee_id?: string; search?: string; per_page?: string };
};

function statusBadge(status: Separation['status']) {
    switch (status) {
        case 'pending': return <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">Pending</Badge>;
        case 'approved': return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Scheduled</Badge>;
        case 'rejected': return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Rejected</Badge>;
        case 'cancelled': return <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">Cancelled</Badge>;
        case 'completed': return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Completed</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}

export default function SeparationIndex({ separations, employees, filters }: Props) {
    const [status, setStatus] = useState(filters.status || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');

    const filterParams = () => ({
        status: status !== 'all' ? status : '',
        employee_id: employeeId !== 'all' ? employeeId : '',
        search: search.trim(),
        per_page: perPage,
    });

    const applyFilters = () => router.get(route('separations.index'), filterParams(), { preserveState: true });
    const reset = () => {
        setStatus('all'); setEmployeeId('all'); setSearch(''); setPerPage('10');
        router.get(route('separations.index'), { per_page: '10' }, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Separations" />
            <PageSurface>
                <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Separations</h1>
                        <p className="mt-1 text-sm text-slate-500">Obbahoti / employee separation and termination records</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:flex-row md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm" />
                        </div>
                        <Button onClick={applyFilters} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700">Search</Button>
                        <Link href={route('separations.create')}>
                            <Button size="sm" className="h-9 bg-rose-600 hover:bg-rose-700">
                                <Plus className="mr-1 h-4 w-4" />
                                New Separation
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card className="mb-6 rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="flex flex-col gap-4 p-4 md:flex-row">
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {['pending', 'approved', 'rejected', 'cancelled', 'completed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={employeeId} onValueChange={setEmployeeId}>
                            <SelectTrigger className="md:w-64"><SelectValue placeholder="Employee" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.employee_id} — {employeeDisplayName(e)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={applyFilters} className="bg-emerald-600 hover:bg-emerald-700">Apply</Button>
                        <Button variant="outline" onClick={reset}>Reset</Button>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                    <TableHead className="h-11 pl-6 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Employee</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Separation Date</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Reason</TableHead>
                                    <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Status</TableHead>
                                    <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {separations.data.length ? separations.data.map((s) => (
                                    <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><UserX className="h-4 w-4" /></div>
                                                <div>
                                                    <Link href={route('separations.show', s.id)} className="text-[13px] font-semibold text-slate-800 hover:text-rose-600">{employeeDisplayName(s.employee)}</Link>
                                                    <div className="font-mono text-xs text-slate-500">ID: {s.employee.employee_id}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[13px] font-medium text-slate-600">{format(new Date(s.separation_date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-[13px] text-slate-600">{s.reason ?? '—'}</TableCell>
                                        <TableCell>{statusBadge(s.status)}</TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600" onClick={() => router.visit(route('separations.show', s.id))}><Eye className="h-4 w-4" /></Button>
                                                {s.status === 'approved' && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600" title="Apply separation now" onClick={() => confirm('Apply separation now? Employee will become inactive.') && router.post(route('separations.complete', s.id))}><Check className="h-4 w-4" /></Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No separation requests found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {separations.meta && separations.meta.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4">
                                <Select value={perPage} onValueChange={(v) => { setPerPage(v); router.get(route('separations.index'), { ...filterParams(), per_page: v }, { preserveState: true }); }}>
                                    <SelectTrigger className="h-8 w-[70px] bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>{['10','25','50','100'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                                <nav className="flex gap-1.5">
                                    {separations.meta.current_page > 1 && separations.links?.prev && <Link href={separations.links.prev} preserveState className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white"><ChevronLeft className="h-4 w-4" /></Link>}
                                    {separations.meta.current_page < separations.meta.last_page && separations.links?.next && <Link href={separations.links.next} preserveState className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white"><ChevronRight className="h-4 w-4" /></Link>}
                                </nav>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
