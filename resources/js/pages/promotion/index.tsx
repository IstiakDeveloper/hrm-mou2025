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
    Plus,
    Search,
    User,
    X,
    XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

type Employee = {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string | null;
};

type Designation = { id: number; name: string };
type SalaryGrade = { id: number; name: string };

type Promotion = {
    id: number;
    employee_id: number;
    effective_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    promotion_order_no: string | null;
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

type PromotionsResponse = {
    data: Promotion[];
    links?: { prev: string | null; next: string | null };
    meta?: PaginationMeta;
};

type Props = {
    promotions: PromotionsResponse;
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
};

function statusBadge(status: Promotion['status']) {
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

export default function PromotionIndex({ promotions, employees, filters, canApprove }: Props) {
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

    const applyFilters = () => {
        router.get(route('promotions.index'), filterParams(), { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('promotions.index'), { ...filterParams(), per_page: value }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const reset = () => {
        setStatus('all');
        setEmployeeId('all');
        setSearch('');
        setPerPage('10');
        router.get(route('promotions.index'), { per_page: '10' }, { preserveState: true });
    };

    const hasPagination = promotions.meta && promotions.links;

    return (
        <Layout>
            <Head title="Promotions" />

            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Promotions</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage designation, grade, and salary changes for employees
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
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
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
                            <Button onClick={applyFilters} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            <Link href={route('promotions.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    New Promotion
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
                                                {e.employee_id} — {e.first_name} {e.last_name ?? ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex space-x-2">
                                <Button variant="outline" onClick={reset} className="h-10 rounded-lg">
                                    Reset
                                </Button>
                                <Button onClick={applyFilters} className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700">
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
                                    {promotions.data.length > 0 ? (
                                        promotions.data.map((p) => (
                                            <TableRow key={p.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                            <User className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <Link
                                                                href={route('promotions.show', p.id)}
                                                                className="font-semibold text-[13px] text-slate-800 hover:text-emerald-600 transition-colors"
                                                            >
                                                                {p.employee.first_name} {p.employee.last_name}
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
                                                                    <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
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
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                                                            title="View Details"
                                                            onClick={() => router.visit(route('promotions.show', p.id))}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>

                                                        {canApprove && p.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                                                                    title="Approve"
                                                                    onClick={() => {
                                                                        if (confirm('Approve this promotion request?')) {
                                                                            router.post(route('promotions.approve', p.id));
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
                                                                        if (confirm('Reject this promotion request?')) {
                                                                            router.post(route('promotions.reject', p.id), { reason: r });
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
                                                                className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                                                                title="Complete"
                                                                onClick={() => {
                                                                    if (confirm('Complete this promotion? This will update employee records.')) {
                                                                        router.post(route('promotions.complete', p.id));
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
                                                No promotion requests found.
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

                        {hasPagination && promotions.meta && (
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
                                                {promotions.meta.total > 0 ? (promotions.meta.current_page - 1) * promotions.meta.per_page + 1 : 0}
                                            </span>{' '}
                                            to{' '}
                                            <span className="font-semibold text-slate-700">
                                                {Math.min(promotions.meta.current_page * promotions.meta.per_page, promotions.meta.total)}
                                            </span>{' '}
                                            of <span className="font-semibold text-slate-700">{promotions.meta.total}</span> entries
                                        </p>
                                    </div>
                                </div>

                                {promotions.meta.last_page > 1 && (
                                    <div className="flex items-center justify-end">
                                        <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                            {promotions.meta.current_page > 1 && promotions.links?.prev && (
                                                <Link
                                                    href={promotions.links.prev}
                                                    preserveState
                                                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}

                                            {promotions.meta.links?.slice(1, -1).map((link, i) => {
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

                                            {promotions.meta.current_page < promotions.meta.last_page && promotions.links?.next && (
                                                <Link
                                                    href={promotions.links.next}
                                                    preserveState
                                                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
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
