import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowRight,
    Briefcase,
    Check,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    Pencil,
    Plus,
    Search,
    User,
    X,
    XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Designation = { id: number; name: string };
type SalaryGrade = { id: number; name: string };

type Demotion = {
    id: number;
    employee_id: number;
    effective_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    demotion_order_no: string | null;
    employee: Employee;
    fromDesignation: Designation | null;
    toDesignation: Designation | null;
    fromSalaryGrade: SalaryGrade | null;
    toSalaryGrade: SalaryGrade | null;
};

function pickName(x: any): string {
    return x && typeof x.name === 'string' && x.name.trim() !== '' ? x.name : '—';
}

type PaginationLinks = { url: string | null; label: string; active: boolean };
type PaginationMeta = {
    current_page: number;
    last_page: number;
    links: PaginationLinks[];
    total: number;
    per_page: number;
};

type DemotionsResponse = {
    data: Demotion[];
    links?: { prev: string | null; next: string | null };
    meta?: PaginationMeta;
};

type Props = {
    demotions: DemotionsResponse;
    employees: Employee[];
    designations: Designation[];
    salaryGrades: SalaryGrade[];
    filters: {
        status?: string;
        employee_id?: string;
        from_date?: string;
        to_date?: string;
        search?: string;
        per_page?: string;
    };
    canApprove: boolean;
    canEditDemotions?: boolean;
    canEditCompleted?: boolean;
};

function statusBadge(status: Demotion['status']) {
    switch (status) {
        case 'pending':
            return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
        case 'approved':
            return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>;
        case 'rejected':
            return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
        case 'cancelled':
            return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
        case 'completed':
            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export default function DemotionIndex({ demotions, employees, filters, canApprove, canEditDemotions = false, canEditCompleted = false }: Props) {
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

    const applyFilters = () => {
        router.get(route('demotions.index'), filterParams(), { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('demotions.index'), { ...filterParams(), per_page: value }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const reset = () => {
        setStatus('all');
        setEmployeeId('all');
        setFromDate('');
        setToDate('');
        setSearch('');
        setPerPage('10');
        router.get(route('demotions.index'), { per_page: '10' }, { preserveState: true });
    };

    const hasPagination = demotions.meta && demotions.links;

    return (
        <Layout>
            <Head title="Demotions" />

            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Demotions</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage designation, grade, and salary downgrades for employees
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-orange-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={reset}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={applyFilters} size="sm" className="h-9 w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
                                Search
                            </Button>
                            <Link href={route('demotions.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-orange-600 hover:bg-orange-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    New Demotion
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <Card className="mb-6 shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-4">
                        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                            <div className="w-full md:w-48">
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full md:w-64">
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {employees.map((e) => (
                                            <SelectItem key={e.id} value={String(e.id)}>
                                                {e.employee_id} — {employeeDisplayName(e)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full md:w-40">
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10" title="From date" />
                            </div>

                            <div className="w-full md:w-40">
                                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10" title="To date" />
                            </div>

                            <div className="flex space-x-2">
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

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Employee</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Change</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Effective Date</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {demotions.data.length > 0 ? (
                                        demotions.data.map((p) => (
                                            <TableRow key={p.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                                            <User className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <Link
                                                                href={route('demotions.show', p.id)}
                                                                className="font-semibold text-[13px] text-slate-800 hover:text-orange-600 transition-colors"
                                                            >
                                                                {employeeDisplayName(p.employee)}
                                                            </Link>
                                                            <div className="text-xs text-slate-500 font-mono">
                                                                ID: {p.employee.employee_id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const anyP: any = p;
                                                        const fromDes = anyP.fromDesignation ?? anyP.from_designation;
                                                        const toDes = anyP.toDesignation ?? anyP.to_designation;
                                                        const fromGrade = anyP.fromSalaryGrade ?? anyP.from_salary_grade;
                                                        const toGrade = anyP.toSalaryGrade ?? anyP.to_salary_grade;
                                                        return (
                                                            <div className="text-[13px] text-slate-700">
                                                                <div className="font-medium flex items-center gap-1 flex-wrap">
                                                                    <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                    {pickName(fromDes)}
                                                                    <ArrowRight className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                                                    {pickName(toDes)}
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-0.5">
                                                                    Grade: {pickName(fromGrade)} → {pickName(toGrade)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-[13px] text-slate-600 font-medium">
                                                        {format(new Date(p.effective_date), 'dd MMM yyyy')}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{statusBadge(p.status)}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {((canEditDemotions && (p.status === 'pending' || p.status === 'approved')) ||
                                                            (canEditCompleted && p.status === 'completed')) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors"
                                                                title="Edit"
                                                                onClick={() => router.visit(route('demotions.edit', p.id))}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                                                            title="View Details"
                                                            onClick={() => router.visit(route('demotions.show', p.id))}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>

                                                        {canApprove && p.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors"
                                                                    title="Approve"
                                                                    onClick={() => {
                                                                        if (confirm('Approve this demotion request?')) {
                                                                            router.post(route('demotions.approve', p.id));
                                                                        }
                                                                    }}
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                                                    title="Reject"
                                                                    onClick={() => {
                                                                        const r = prompt('Rejection reason (optional):') ?? '';
                                                                        if (confirm('Reject this demotion request?')) {
                                                                            router.post(route('demotions.reject', p.id), { reason: r });
                                                                        }
                                                                    }}
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}

                                                        {p.status === 'approved' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors"
                                                                title="Complete"
                                                                onClick={() => {
                                                                    if (confirm('Complete this demotion? This will update employee records.')) {
                                                                        router.post(route('demotions.complete', p.id));
                                                                    }
                                                                }}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No demotion requests found.
                                                {(search || status !== 'all' || employeeId !== 'all') && (
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

                        {hasPagination && demotions.meta && (
                            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                        <span className="hidden sm:inline">Rows per page:</span>
                                        <Select value={perPage} onValueChange={handlePerPageChange}>
                                            <SelectTrigger className="h-8 w-[70px] text-[13px] bg-white border-slate-200">
                                                <SelectValue placeholder="10" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                                <SelectItem value="200">200</SelectItem>
                                                <SelectItem value="500">500</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[13px] text-slate-500">
                                            Showing{' '}
                                            <span className="font-semibold text-slate-700">
                                                {demotions.meta.total > 0 ? (demotions.meta.current_page - 1) * demotions.meta.per_page + 1 : 0}
                                            </span>{' '}
                                            to{' '}
                                            <span className="font-semibold text-slate-700">
                                                {Math.min(demotions.meta.current_page * demotions.meta.per_page, demotions.meta.total)}
                                            </span>{' '}
                                            of <span className="font-semibold text-slate-700">{demotions.meta.total}</span> entries
                                        </p>
                                    </div>
                                </div>

                                {demotions.meta.last_page > 1 && (
                                    <div className="flex items-center justify-end">
                                        <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                            {demotions.meta.current_page > 1 && demotions.links?.prev && (
                                                <Link
                                                    href={demotions.links.prev}
                                                    preserveState
                                                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-orange-600 hover:border-orange-200 shadow-sm"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}

                                            {demotions.meta.links?.slice(1, -1).map((link, i) => {
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
                                                                ? 'z-10 bg-orange-600 text-white shadow-sm border border-orange-600'
                                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-orange-600 hover:border-orange-200 focus:z-20'
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            })}

                                            {demotions.meta.current_page < demotions.meta.last_page && demotions.links?.next && (
                                                <Link
                                                    href={demotions.links.next}
                                                    preserveState
                                                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-orange-600 hover:border-orange-200 shadow-sm"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}
                                        </nav>
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
