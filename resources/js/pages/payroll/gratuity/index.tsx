import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
} from '@/components/payroll/PayrollFilterGrid';
import { ChevronRight, Filter, Gift, Search, X } from 'lucide-react';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';

type Row = {
    id: number;
    pin: string | null;
    name_en: string | null;
    label: string;
    branch: string | null;
    department: string | null;
    designation: string | null;
    joining_date: string | null;
    completed_years: number;
    basic_salary: number;
    basic_multiplier: number;
    gratuity_amount: number;
    eligible: boolean;
    tier_label: string;
    service_end_date: string;
    service_end_hint: string | null;
    payment_state: 'paid' | 'pending' | 'unpaid';
    paid_on: string | null;
    paid_service_end: string | null;
};

type Props = {
    filters: Record<string, string>;
    rows: Row[];
    tiers: { min_years: number; basic_multiplier: number }[];
    branches: { id: number; name: string }[];
    departments: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
};

const fmt = (n: number) =>
    Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function EmployeeCell({ pin, nameEn, designation, branch, department }: {
    pin: string | null;
    nameEn: string | null;
    designation: string | null;
    branch: string | null;
    department: string | null;
}) {
    const meta = [designation, branch, department].filter(Boolean).join(' · ');

    return (
        <div className="flex items-center gap-2">
            <div className="flex h-6 min-w-[2.75rem] shrink-0 items-center justify-center rounded border border-emerald-100 bg-emerald-50 px-1.5">
                <span className="font-mono text-[9px] font-bold tracking-wide text-emerald-800">
                    {pin || '—'}
                </span>
            </div>
            <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-800">{nameEn || '—'}</p>
                {meta ? <p className="truncate text-[10px] text-zinc-400 leading-tight mt-0.5">{meta}</p> : null}
            </div>
        </div>
    );
}

export default function GratuityIndex({ filters: init, rows, tiers, branches, departments, employees }: Props) {
    const [filters, setFilters] = useState({
        search: String(init.search || ''),
        branch_id: String(init.branch_id || ''),
        department_id: String(init.department_id || ''),
        employee_id: String(init.employee_id || ''),
        eligibility: String(init.eligibility || 'all'),
        payment_status: String(init.payment_status || 'all'),
        as_of: init.as_of || new Date().toISOString().slice(0, 10),
    });
    const [showFilters, setShowFilters] = useState(true);

    const applyFilters = (next: Partial<typeof filters> = {}) => {
        const merged = { ...filters, ...next };
        setFilters(merged);
        router.get(route('gratuity.index'), merged, { preserveState: true, replace: true });
    };

    const summary = useMemo(
        () =>
            rows.reduce(
                (acc, r) => ({
                    count: acc.count + 1,
                    eligible: acc.eligible + (r.eligible ? 1 : 0),
                    gratuity: acc.gratuity + (r.eligible ? r.gratuity_amount : 0),
                }),
                { count: 0, eligible: 0, gratuity: 0 },
            ),
        [rows],
    );

    const hasActiveFilters = Boolean(
        filters.search ||
            filters.branch_id ||
            filters.department_id ||
            filters.employee_id ||
            (filters.eligibility && filters.eligibility !== 'all') ||
            (filters.payment_status && filters.payment_status !== 'all'),
    );

    const sortedTiers = useMemo(
        () => [...tiers].sort((a, b) => a.min_years - b.min_years),
        [tiers],
    );

    return (
        <StaffFundLayout title="Gratuity Entitlements" activeTab="gratuity-entitlements" description="Gratuity entitlements calculator based on completed service years and basic salaries.">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    {sortedTiers.map((t) => (
                        <span key={t.min_years} className="inline-flex rounded border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
                            {t.min_years}+ Yrs: {t.basic_multiplier}x Basic
                        </span>
                    ))}
                    <span className="inline-flex rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                        &lt; 5 Yrs: Not Eligible
                    </span>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        <Input
                            placeholder="Search PIN, name..."
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters({})}
                            className="h-8 text-xs pl-8 border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                        />
                        {filters.search && (
                            <button
                                type="button"
                                onClick={() => applyFilters({ search: '' })}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <Button onClick={() => applyFilters({})} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-3 rounded">
                        Search
                    </Button>
                </div>
            </div>

            {/* KPI grid cards - compact */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-2xs">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-450">Staff Monitored</p>
                    <p className="text-base font-extrabold text-zinc-800 tabular-nums mt-0.5">{summary.count}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/15 p-2.5 shadow-2xs">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Eligible Employees</p>
                    <p className="text-base font-extrabold text-emerald-800 tabular-nums mt-0.5">{summary.eligible}</p>
                </div>
                <div className="rounded-lg border border-emerald-250 bg-emerald-50/50 p-2.5 shadow-2xs">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">Total Gratuity Pool (৳)</p>
                    <p className="text-base font-extrabold text-emerald-900 tabular-nums mt-0.5">{fmt(summary.gratuity)}</p>
                </div>
            </div>

            {/* Filters panel and Grid */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                        Entitlements Ledger
                        <span className="ml-1 text-[10px] font-normal text-zinc-400">({rows.length})</span>
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn("h-7 text-[11px] border-zinc-200 bg-white rounded", showFilters && "bg-emerald-50 text-emerald-700 border-emerald-100")}
                            onClick={() => setShowFilters((v) => !v)}
                        >
                            <Filter className="mr-1 h-3.5 w-3.5" />
                            Filters
                        </Button>
                        {hasActiveFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] text-zinc-500 hover:text-zinc-800"
                                onClick={() =>
                                    applyFilters({
                                        search: '',
                                        branch_id: '',
                                        department_id: '',
                                        employee_id: '',
                                        eligibility: 'all',
                                        payment_status: 'all',
                                    })
                                }
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardHeader>
                {showFilters && (
                    <div className="px-3 py-2.5 border-b border-zinc-100 bg-zinc-50/20 grid gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
                        <div className="space-y-0.5">
                            <PayrollBranchSelect
                                value={filters.branch_id}
                                onChange={(v) => applyFilters({ branch_id: v })}
                                branches={branches}
                            />
                        </div>
                        <div className="space-y-0.5">
                            <PayrollComboField
                                label="Department"
                                value={filters.department_id}
                                onChange={(v) => applyFilters({ department_id: v })}
                                items={[
                                    { value: '', label: 'All departments' },
                                    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
                                ]}
                                placeholder="All departments"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <PayrollEmployeeSelect
                                value={filters.employee_id}
                                onChange={(v) => applyFilters({ employee_id: v })}
                                employees={employees}
                            />
                        </div>
                        <div className="space-y-0.5">
                            <PayrollComboField
                                label="Eligibility"
                                value={filters.eligibility}
                                onChange={(v) => applyFilters({ eligibility: v || 'all' })}
                                items={[
                                    { value: 'all', label: 'All employees' },
                                    { value: 'eligible', label: 'Eligible only' },
                                    { value: 'not_eligible', label: 'Not eligible only' },
                                ]}
                                placeholder="All employees"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <PayrollComboField
                                label="Payment Status"
                                value={filters.payment_status}
                                onChange={(v) => applyFilters({ payment_status: v || 'all' })}
                                items={[
                                    { value: 'all', label: 'All payment states' },
                                    { value: 'unpaid', label: 'Not paid yet' },
                                    { value: 'pending', label: 'Pending (draft/approved)' },
                                    { value: 'paid', label: 'Paid' },
                                ]}
                                placeholder="All payment states"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Calculated As of Date</label>
                            <Input
                                type="date"
                                value={filters.as_of}
                                onChange={(e) => applyFilters({ as_of: e.target.value })}
                                className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                            />
                        </div>
                    </div>
                )}

                {/* Table - High Density layout */}
                <CardContent className="p-0">
                    {rows.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-zinc-500">No employees match your filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50 border-b border-zinc-200/60">
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pl-3">Employee</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Service End</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Joining Date</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Service Tenure</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Basic Salary</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-center">Multiplier</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Gratuity Amount</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Eligibility</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Payment State</TableHead>
                                        <TableHead className="w-10 pr-3 h-8 py-1" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.id} className="hover:bg-emerald-50/10 border-b border-zinc-100/80 transition-colors group">
                                            <TableCell className="pl-3 py-1.5">
                                                <EmployeeCell
                                                    pin={r.pin}
                                                    nameEn={r.name_en}
                                                    designation={r.designation}
                                                    branch={r.branch}
                                                    department={r.department}
                                                />
                                            </TableCell>
                                            <TableCell className="py-1.5 text-zinc-800 font-semibold whitespace-nowrap">
                                                {r.service_end_date}
                                                {r.service_end_hint ? (
                                                    <span className="block text-[9px] text-amber-700 font-medium">{r.service_end_hint}</span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-zinc-500 whitespace-nowrap">{r.joining_date || '—'}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums">
                                                <span className="font-bold text-zinc-800">{r.completed_years}</span>
                                                <span className="text-[10px] text-zinc-400"> yrs</span>
                                            </TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmt(r.basic_salary)}</TableCell>
                                            <TableCell className="text-center py-1.5">
                                                {r.basic_multiplier > 0 ? (
                                                    <span className="inline-flex items-center rounded bg-emerald-50 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-800 border border-emerald-100">
                                                        {r.basic_multiplier}x
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums">
                                                <span className={cn("font-extrabold", r.eligible ? "text-emerald-700" : "text-zinc-400")}>
                                                    {r.eligible ? fmt(r.gratuity_amount) : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                                {r.eligible ? (
                                                    <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-100 uppercase tracking-wide">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-100 uppercase tracking-wide" title={r.tier_label}>
                                                        No
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5">
                                                {r.payment_state === 'paid' ? (
                                                    <div>
                                                        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-900 border border-emerald-200 uppercase tracking-wide">
                                                            Paid
                                                        </span>
                                                        {r.paid_on && (
                                                            <span className="block text-[8px] text-zinc-400 mt-0.5">{r.paid_on}</span>
                                                        )}
                                                    </div>
                                                ) : r.payment_state === 'pending' ? (
                                                    <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-900 border border-amber-200 uppercase tracking-wide">
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.2 text-[9px] font-bold text-zinc-650 border border-zinc-200 uppercase tracking-wide">
                                                        Unpaid
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5 pr-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                                    asChild
                                                    title="View details"
                                                >
                                                    <Link href={staffFundPath(`/gratuity/${r.id}?as_of=${filters.as_of}`)}>
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-zinc-50/80 font-bold border-t border-zinc-200">
                                        <TableCell colSpan={6} className="pl-3 py-2 text-zinc-700 uppercase text-[9px] tracking-wider">Total (eligible only)</TableCell>
                                        <TableCell className="text-right py-2 tabular-nums text-emerald-700">{fmt(summary.gratuity)}</TableCell>
                                        <TableCell colSpan={3} />
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </StaffFundLayout>
    );
}
