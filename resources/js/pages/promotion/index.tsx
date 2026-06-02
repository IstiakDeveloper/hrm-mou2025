import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComboSelect } from '@/components/ComboSelect';
import { MoreHorizontal, Plus, RefreshCcw, Search, CheckCircle, XCircle, Check } from 'lucide-react';
import { format } from 'date-fns';

type Employee = {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string | null;
};

type Designation = { id: number; name: string };
type SalaryGrade = { id: number; name: string };

type User = { id: number; name: string };

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
    approver: User | null;
};

function pickName(x: any): string {
    return (x && typeof x.name === 'string' && x.name.trim() !== '') ? x.name : '—';
}

type PaginationLinks = { url: string | null; label: string; active: boolean };
type PaginationMeta = { current_page: number; last_page: number; links: PaginationLinks[] };

type PromotionsResponse = {
    data: Promotion[];
    links: { prev: string | null; next: string | null };
    meta: PaginationMeta;
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
    };
    canApprove: boolean;
};

function statusBadge(status: Promotion['status']) {
    switch (status) {
        case 'pending':
            return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'approved':
            return <Badge className="border-0 bg-sky-600 text-white">Approved</Badge>;
        case 'rejected':
            return <Badge className="border-0 bg-rose-600 text-white">Rejected</Badge>;
        case 'cancelled':
            return <Badge variant="outline">Cancelled</Badge>;
        case 'completed':
            return <Badge className="border-0 bg-emerald-600 text-white">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export default function PromotionIndex({ promotions, employees, filters, canApprove }: Props) {
    const [status, setStatus] = useState(filters.status || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id ? Number(filters.employee_id) : null);
    const [search, setSearch] = useState(filters.search || '');

    const filterPayload = useMemo(
        () => ({
            status: status !== 'all' ? status : '',
            employee_id: employeeId ? String(employeeId) : '',
            search: search.trim(),
        }),
        [status, employeeId, search],
    );

    const applyFilters = () => {
        router.get(route('promotions.index'), filterPayload, { preserveState: true });
    };

    const reset = () => {
        setStatus('all');
        setEmployeeId(null);
        setSearch('');
        router.get(route('promotions.index'), {}, { preserveState: true });
    };

    return (
        <Layout>
            <Head title="Promotions" />
            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Promotion</h1>
                        <p className="mt-1 text-xs text-zinc-600">
                            Designation / grade / salary changes. Transfer (branch/department) stays separate.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="h-8 bg-violet-600 text-xs hover:bg-violet-700">
                            <Link href={route('promotions.create')}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                New promotion
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card className="mb-6 border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Filters</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Search by employee or status.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    className="h-9 pl-9 text-xs"
                                    placeholder="Name / PIN / employee id…"
                                />
                            </div>

                            <ComboSelect<string>
                                value={status}
                                onChange={(v) => setStatus(v ?? 'all')}
                                placeholder="Status"
                                items={[
                                    { value: 'all', label: 'All statuses' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'rejected', label: 'Rejected' },
                                    { value: 'cancelled', label: 'Cancelled' },
                                    { value: 'completed', label: 'Completed' },
                                ]}
                            />

                            <ComboSelect<number>
                                value={employeeId}
                                onChange={(v) => setEmployeeId(v ?? null)}
                                placeholder="Employee"
                                items={[
                                    { value: 0, label: 'All employees' },
                                    ...employees.map((e) => ({
                                        value: e.id,
                                        label: `${e.employee_id} — ${e.first_name} ${e.last_name ?? ''}`.trim(),
                                        keywords: `${e.employee_id} ${e.first_name} ${e.last_name ?? ''}`,
                                    })),
                                ].map((i) =>
                                    i.value === 0
                                        ? { ...i, disabled: true }
                                        : i,
                                )}
                                clearable
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="h-8 bg-violet-600 text-xs hover:bg-violet-700" onClick={applyFilters}>
                                Apply
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={reset}>
                                <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Promotion requests</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Approved requests must be completed to update the employee’s current designation/grade/salary.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                                        <TableHead className="text-xs font-semibold">Employee</TableHead>
                                        <TableHead className="text-xs font-semibold">Change</TableHead>
                                        <TableHead className="text-xs font-semibold">Effective</TableHead>
                                        <TableHead className="text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {promotions.data.length > 0 ? (
                                        promotions.data.map((p) => (
                                            <TableRow key={p.id} className="text-xs">
                                                <TableCell className="align-top font-medium text-zinc-900">
                                                    <Link
                                                        href={route('promotions.show', p.id)}
                                                        className="hover:text-violet-700 hover:underline"
                                                    >
                                                        {p.employee.first_name} {p.employee.last_name}
                                                    </Link>
                                                    <div className="mt-0.5 font-normal text-[10px] text-zinc-500">
                                                        {p.employee.employee_id}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top text-zinc-700">
                                                    {/*
                                                      Backend may return relations as snake_case (from_designation) depending on serializer.
                                                      Support both shapes so the UI never shows blank.
                                                    */}
                                                    {(() => {
                                                        const anyP: any = p as any;
                                                        const fromDes = anyP.fromDesignation ?? anyP.from_designation;
                                                        const toDes = anyP.toDesignation ?? anyP.to_designation;
                                                        const fromGrade = anyP.fromSalaryGrade ?? anyP.from_salary_grade;
                                                        const toGrade = anyP.toSalaryGrade ?? anyP.to_salary_grade;
                                                        return (
                                                            <>
                                                                <div className="font-medium">
                                                                    {pickName(fromDes)} → {pickName(toDes)}
                                                                </div>
                                                                <div className="mt-0.5 text-[10px] text-zinc-500">
                                                                    Grade: {pickName(fromGrade)} → {pickName(toGrade)}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="align-top whitespace-nowrap tabular-nums text-zinc-700">
                                                    {format(new Date(p.effective_date), 'dd MMM yyyy')}
                                                </TableCell>
                                                <TableCell className="align-top">{statusBadge(p.status)}</TableCell>
                                                <TableCell className="align-top text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => router.get(route('promotions.show', p.id))}
                                                                className="cursor-pointer"
                                                            >
                                                                View
                                                            </DropdownMenuItem>

                                                            {canApprove && p.status === 'pending' && (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer text-emerald-700"
                                                                        onClick={() => {
                                                                            if (confirm('Approve this promotion request?')) {
                                                                                router.post(route('promotions.approve', p.id));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                                        Approve
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer text-rose-700"
                                                                        onClick={() => {
                                                                            const r = prompt('Rejection reason (optional):') ?? '';
                                                                            if (confirm('Reject this promotion request?')) {
                                                                                router.post(route('promotions.reject', p.id), { reason: r });
                                                                            }
                                                                        }}
                                                                    >
                                                                        <XCircle className="mr-2 h-4 w-4" />
                                                                        Reject
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}

                                                            {p.status === 'approved' && (
                                                                <DropdownMenuItem
                                                                    className="cursor-pointer text-emerald-700"
                                                                    onClick={() => {
                                                                        if (confirm('Complete this promotion? This will update employee records.')) {
                                                                            router.post(route('promotions.complete', p.id));
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    Complete
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-28 text-center text-xs text-zinc-500">
                                                No promotion requests found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}

