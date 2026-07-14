import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { payrollEmployeePath } from '@/lib/payroll-employee-nav';
import { formatTakaWhole } from '@/lib/taka-format';
import { cn } from '@/lib/utils';

type PayslipRow = {
    id: number;
    period_label: string;
    year: number | null;
    month: number | null;
    salary_type: string;
    branch: string | null;
    basic: number;
    gross: number;
    deduction: number;
    net: number;
    is_withheld: boolean;
    posted_at: string | null;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
};

type Props = {
    employee: {
        id: number;
        pin?: string | null;
        name_en?: string | null;
    };
    payslips: Paginated<PayslipRow>;
    filters: {
        year: string;
        salary_type: string;
    };
    years: number[];
};

const fmt = formatTakaWhole;

export default function EmployeePayslipsIndex({ employee, payslips, filters, years }: Props) {
    const applyFilters = (next: Partial<typeof filters>) => {
        router.get(
            route('employee.payroll.payslips.index'),
            { ...filters, ...next },
            { preserveState: true, replace: true },
        );
    };

    return (
        <Layout>
            <Head title="My Payslips" />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={payrollEmployeePath('/sections/payroll')}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> My Payroll
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900">My Payslips</h1>
                            <p className="text-xs text-zinc-500">
                                {employee.pin && <span className="mr-2 font-mono">{employee.pin}</span>}
                                {employee.name_en || '—'}
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="mb-4 border-zinc-200 shadow-sm">
                    <CardContent className="flex flex-wrap items-center gap-2 p-3">
                        <select
                            value={filters.year}
                            onChange={(e) => applyFilters({ year: e.target.value })}
                            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs"
                        >
                            <option value="">All years</option>
                            {years.map((y) => (
                                <option key={y} value={String(y)}>
                                    {y}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.salary_type}
                            onChange={(e) => applyFilters({ salary_type: e.target.value })}
                            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs"
                        >
                            <option value="all">All types</option>
                            <option value="salary">Salary</option>
                            <option value="bonus">Bonus</option>
                        </select>
                        <span className="ml-auto text-[11px] text-zinc-500">{payslips.total} record(s)</span>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-zinc-200 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
                        <CardTitle className="text-sm font-bold">Posted payslips</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {payslips.data.length === 0 ? (
                            <div className="px-4 py-10 text-center text-xs text-zinc-500">No payslips found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-zinc-50/50">
                                            <TableHead>Period</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Branch</TableHead>
                                            <TableHead className="text-right">Gross</TableHead>
                                            <TableHead className="text-right">Deduction</TableHead>
                                            <TableHead className="text-right">Net</TableHead>
                                            <TableHead>Posted</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payslips.data.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.period_label}</TableCell>
                                                <TableCell className="capitalize">{p.salary_type}</TableCell>
                                                <TableCell>{p.branch || '—'}</TableCell>
                                                <TableCell className="text-right tabular-nums">{fmt(p.gross)}</TableCell>
                                                <TableCell className="text-right tabular-nums text-amber-700">{fmt(p.deduction)}</TableCell>
                                                <TableCell className="text-right tabular-nums font-semibold text-violet-900">{fmt(p.net)}</TableCell>
                                                <TableCell>{p.posted_at || '—'}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {p.is_withheld && (
                                                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                                                                Withheld
                                                            </Badge>
                                                        )}
                                                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                                            <Link href={payrollEmployeePath(`/employee/payroll/payslips/${p.id}`)}>
                                                                View <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {payslips.last_page > 1 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                        {payslips.links.map((link, i) => (
                            <Button
                                key={`${link.label}-${i}`}
                                asChild
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                className={cn('h-7 min-w-7 px-2 text-xs', link.active && 'bg-violet-600 hover:bg-violet-700')}
                                disabled={!link.url}
                            >
                                {link.url ? (
                                    <Link href={link.url} preserveScroll>
                                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                    </Link>
                                ) : (
                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                )}
                            </Button>
                        ))}
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
