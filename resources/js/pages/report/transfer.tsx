import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Calendar as CalendarIcon, Filter, Printer, RefreshCcw, FileBarChart2, Building2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Transfer {
    id: number;
    employee_id: number;
    effective_date: string;
    reason: string | null;
    transfer_order_no?: string | null;
    from_branch_id: number;
    to_branch_id: number;
    status: string;
    employee: {
        id: number;
        employee_id: string;
        first_name: string;
        last_name: string;
        department?: { id: number; name: string } | null;
        designation?: { id: number; name: string } | null;
    };
    fromBranch: { id: number; name: string } | null;
    toBranch: { id: number; name: string } | null;
    fromDepartment?: { id: number; name: string } | null;
    toDepartment?: { id: number; name: string } | null;
    approver: { id: number; name?: string; first_name?: string; last_name?: string } | null;
}

interface BranchFlowRow {
    id: number;
    name: string;
    outgoing: number;
    incoming: number;
    total: number;
}

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number;
    total: number;
}

interface TransferResponse {
    data: Transfer[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface TransferReportProps {
    transfers: TransferResponse;
    departments: Department[];
    branches: Branch[];
    employees: Employee[];
    branchFlow: BranchFlowRow[];
    filters: {
        start_date?: string;
        end_date?: string;
        status?: string;
        department_id?: string;
        from_branch_id?: string;
        to_branch_id?: string;
        employee_id?: string;
        search?: string;
    };
    startDate: string;
    endDate: string;
    summary: {
        total: number;
        approved: number;
        rejected: number;
        pending: number;
        completed: number;
    };
}

function statusBadge(status: string) {
    switch (status) {
        case 'approved':
            return <Badge className="border-0 bg-emerald-600 text-white">Approved</Badge>;
        case 'rejected':
            return <Badge className="border-0 bg-rose-600 text-white">Rejected</Badge>;
        case 'pending':
            return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'completed':
            return <Badge className="border-0 bg-sky-600 text-white">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

function approverLabel(t: Transfer): string {
    const a = t.approver;
    if (!a) return '—';
    if (a.name) return a.name;
    const fn = a.first_name ?? '';
    const ln = a.last_name ?? '';
    const full = `${fn} ${ln}`.trim();
    return full || '—';
}

export default function TransferReport({
    transfers,
    departments,
    branches,
    employees,
    branchFlow = [],
    filters,
    startDate,
    endDate,
    summary,
}: TransferReportProps) {
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.start_date ? parseISO(filters.start_date) : parseISO(startDate),
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.end_date ? parseISO(filters.end_date) : parseISO(endDate),
    );
    const [status, setStatus] = useState(filters.status || 'all');
    const [department, setDepartment] = useState(filters.department_id || 'all');
    const [fromBranch, setFromBranch] = useState(filters.from_branch_id || 'all');
    const [toBranch, setToBranch] = useState(filters.to_branch_id || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
    const [search, setSearch] = useState(filters.search || '');

    const filterPayload = useMemo(
        () => ({
            start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            status: status !== 'all' ? status : '',
            department_id: department !== 'all' ? department : '',
            from_branch_id: fromBranch !== 'all' ? fromBranch : '',
            to_branch_id: toBranch !== 'all' ? toBranch : '',
            employee_id: employeeId !== 'all' ? employeeId : '',
            search: search.trim(),
        }),
        [fromDate, toDate, status, department, fromBranch, toBranch, employeeId, search],
    );

    const applyFilters = () => {
        router.get(route('reports.transfer'), filterPayload, { preserveState: true });
    };

    const resetFilters = () => {
        setFromDate(parseISO(startDate));
        setToDate(parseISO(endDate));
        setStatus('all');
        setDepartment('all');
        setFromBranch('all');
        setToBranch('all');
        setEmployeeId('all');
        setSearch('');
        router.get(route('reports.transfer'), {}, { preserveState: true });
    };

    const setPresetRange = (from: Date, to: Date) => {
        setFromDate(from);
        setToDate(to);
        router.get(
            route('reports.transfer'),
            {
                start_date: format(from, 'yyyy-MM-dd'),
                end_date: format(to, 'yyyy-MM-dd'),
                status: status !== 'all' ? status : '',
                department_id: department !== 'all' ? department : '',
                from_branch_id: fromBranch !== 'all' ? fromBranch : '',
                to_branch_id: toBranch !== 'all' ? toBranch : '',
                employee_id: employeeId !== 'all' ? employeeId : '',
                search: search.trim(),
            },
            { preserveState: true },
        );
    };

    const handlePrint = () => {
        window.print();
    };

    const maxFlow = useMemo(() => Math.max(1, ...branchFlow.map((b) => b.total)), [branchFlow]);

    return (
        <Layout>
            <Head title="Branch transfer register" />

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .print-break { break-inside: avoid; }
                }
                .print-only { display: none; }
            `}</style>

            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6">
                <div className="print-only mb-4 text-sm text-zinc-700">
                    <p className="font-semibold">Branch transfer register</p>
                    <p>
                        Effective date range: {fromDate ? format(fromDate, 'dd MMM yyyy') : '—'} —{' '}
                        {toDate ? format(toDate, 'dd MMM yyyy') : '—'}
                    </p>
                    <p className="text-xs text-zinc-500">Printed {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                </div>

                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between no-print">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Branch transfer register</h1>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
                            Official postings between branches (and departments where recorded). Filters use{' '}
                            <strong>effective date</strong> — the date the transfer takes effect in payroll / attendance scope.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handlePrint}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Print
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={route('reports.index')}>
                                <FileBarChart2 className="mr-1.5 h-3.5 w-3.5" />
                                All reports
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Quick date presets */}
                <div className="no-print mb-4 flex flex-wrap gap-2">
                    <span className="self-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Quick range</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPresetRange(subDays(new Date(), 6), new Date())}
                    >
                        Last 7 days
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPresetRange(subDays(new Date(), 29), new Date())}
                    >
                        Last 30 days
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPresetRange(startOfMonth(new Date()), endOfMonth(new Date()))}
                    >
                        This month
                    </Button>
                </div>

                {/* KPI */}
                <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 print-break">
                    {(
                        [
                            { label: 'Total', value: summary.total, className: 'border-zinc-200' },
                            { label: 'Pending', value: summary.pending, className: 'border-amber-200 bg-amber-50/80' },
                            { label: 'Approved', value: summary.approved, className: 'border-emerald-200 bg-emerald-50/80' },
                            { label: 'Rejected', value: summary.rejected, className: 'border-rose-200 bg-rose-50/80' },
                            { label: 'Completed', value: summary.completed, className: 'border-sky-200 bg-sky-50/80' },
                        ] as const
                    ).map((k) => (
                        <div
                            key={k.label}
                            className={cn(
                                'rounded-xl border bg-white p-3 shadow-sm',
                                k.className,
                            )}
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{k.label}</p>
                            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">{k.value.toLocaleString()}</p>
                        </div>
                    ))}
                </section>

                {/* Branch activity — real data */}
                {branchFlow.length > 0 && (
                    <Card className="mb-6 border-zinc-200/90 shadow-sm print-break">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Branch activity in this range</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Outgoing = transfers leaving this branch; incoming = transfers joining this branch (same filters as the table).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-3">
                                {branchFlow.map((b) => (
                                    <div key={b.id}>
                                        <div className="mb-1 flex justify-between text-xs">
                                            <span className="font-medium text-zinc-800">{b.name}</span>
                                            <span className="tabular-nums text-zinc-600">
                                                Out {b.outgoing} · In {b.incoming}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                            <div
                                                className="h-full rounded-full bg-violet-500"
                                                style={{ width: `${Math.min(100, (b.total / maxFlow) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Filters */}
                <Card className="no-print mb-6 border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                            <Filter className="h-4 w-4 text-zinc-500" />
                            Filters
                        </CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Narrow by effective dates, branches, department (employee&apos;s current dept), status, or search (name, PIN,
                            order no., reason).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">From (effective)</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-9 w-full justify-start text-left text-xs font-normal">
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                            {fromDate ? format(fromDate, 'MMM d, yyyy') : 'Pick'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">To (effective)</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-9 w-full justify-start text-left text-xs font-normal">
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                            {toDate ? format(toDate, 'MMM d, yyyy') : 'Pick'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={toDate}
                                            onSelect={setToDate}
                                            initialFocus
                                            disabled={(date) => (fromDate ? date < fromDate : false)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Employee</label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All employees</SelectItem>
                                        {employees.map((e) => (
                                            <SelectItem key={e.id} value={e.id.toString()}>
                                                {e.employee_id} — {e.first_name} {e.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Department (employee)</label>
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All departments</SelectItem>
                                        {departments.map((d) => (
                                            <SelectItem key={d.id} value={d.id.toString()}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">From branch</label>
                                <Select value={fromBranch} onValueChange={setFromBranch}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All branches</SelectItem>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">To branch</label>
                                <Select value={toBranch} onValueChange={setToBranch}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All branches</SelectItem>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Search</label>
                                <Input
                                    className="h-9 text-xs"
                                    placeholder="Name, PIN, order no., reason…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="h-8 bg-violet-600 text-xs hover:bg-violet-700" onClick={applyFilters}>
                                Apply filters
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={resetFilters}>
                                <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card id="transfer-report-print" className="border-zinc-200/90 shadow-sm print:border-0 print:shadow-none">
                    <CardHeader className="border-b border-zinc-100 py-3 print:border-zinc-200">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Transfer lines</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Open a row in the transfer module for full history and documents.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                                        <TableHead className="text-xs font-semibold">Employee</TableHead>
                                        <TableHead className="text-xs font-semibold">Order / reason</TableHead>
                                        <TableHead className="text-xs font-semibold">Route</TableHead>
                                        <TableHead className="text-xs font-semibold">Dept change</TableHead>
                                        <TableHead className="text-xs font-semibold">Effective</TableHead>
                                        <TableHead className="text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-xs font-semibold">Approved by</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfers.data.length > 0 ? (
                                        transfers.data.map((t) => (
                                            <TableRow key={t.id} className="text-xs">
                                                <TableCell className="align-top font-medium text-zinc-900">
                                                    <Link
                                                        href={route('transfers.show', t.id)}
                                                        className="hover:text-violet-700 hover:underline"
                                                    >
                                                        {t.employee.first_name} {t.employee.last_name}
                                                    </Link>
                                                    <div className="mt-0.5 font-normal text-[10px] text-zinc-500">{t.employee.employee_id}</div>
                                                </TableCell>
                                                <TableCell className="align-top text-zinc-700">
                                                    <div className="font-mono text-[11px]">{t.transfer_order_no || '—'}</div>
                                                    <div className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{t.reason || '—'}</div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <div className="flex flex-wrap items-center gap-1 text-zinc-800">
                                                        <Building2 className="h-3 w-3 shrink-0 text-zinc-400" />
                                                        <span>{t.fromBranch?.name ?? '—'}</span>
                                                        <ArrowRight className="h-3 w-3 shrink-0 text-zinc-400" />
                                                        <span>{t.toBranch?.name ?? '—'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top text-zinc-600">
                                                    <div>{t.fromDepartment?.name ?? '—'}</div>
                                                    <div className="text-[10px] text-zinc-400">→ {t.toDepartment?.name ?? '—'}</div>
                                                </TableCell>
                                                <TableCell className="align-top whitespace-nowrap tabular-nums text-zinc-700">
                                                    {format(parseISO(t.effective_date), 'dd MMM yyyy')}
                                                </TableCell>
                                                <TableCell className="align-top">{statusBadge(t.status)}</TableCell>
                                                <TableCell className="align-top text-zinc-600">{approverLabel(t)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-28 text-center text-xs text-zinc-500">
                                                No transfers match these filters. Try widening the date range or clearing search.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {transfers.meta && transfers.meta.last_page > 1 && (
                    <div className="no-print mt-6">
                        <Pagination>
                            <PaginationContent>
                                {transfers.meta.current_page > 1 && transfers.links.prev && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={transfers.links.prev}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.prev!, {}, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}

                                {transfers.meta.links
                                    .filter((link) => !link.label.includes('&laquo;') && !link.label.includes('&raquo;'))
                                    .map((link, i) => {
                                        const isPageNumber = !Number.isNaN(Number(link.label));
                                        if (!isPageNumber && link.label === '...') {
                                            return (
                                                <PaginationItem key={`e-${i}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            );
                                        }
                                        return (
                                            <PaginationItem key={i}>
                                                <PaginationLink
                                                    href={link.url || '#'}
                                                    isActive={link.active}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (link.url) router.get(link.url, {}, { preserveState: true });
                                                    }}
                                                >
                                                    {link.label}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}

                                {transfers.meta.current_page < transfers.meta.last_page && transfers.links.next && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={transfers.links.next}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.next!, {}, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
