import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Wallet,
    Search,
    Filter,
    X,
    Plus,
    BookOpen,
    Calculator,
    FileSpreadsheet,
    AlertTriangle,
    Calendar,
    Building2,
    Briefcase,
    UserCheck,
    Clock,
    RotateCcw,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import {
    fundEligibilityDate,
    fundInterest,
    fundInterestStart,
    fundMoney,
    fundRequestKey,
    fundToday,
    fundDisplayDate,
    fundDisplayDateReadable,
    type FundSnapshot,
} from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';
import {
    Errors,
    Exports,
    SecurityFundPolicyBanner,
    StatusBadge,
    Summary,
} from './components';

type Row = Partial<FundSnapshot> & {
    id: number;
    pin: string;
    name: string;
    branch: string;
    department?: string;
    opened_on: string;
    review_required?: string;
};

type Option = {
    id: number;
    pin: string;
    name: string;
    branch: string;
    designation: string;
};

type Props = {
    accounts: {
        data: Row[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
    };
    summary: FundSnapshot & { account_count: number; review_count: number };
    asOf: string;
    filters: Record<string, string>;
    canCreate: boolean;
    canEdit: boolean;
    canExport: boolean;
    branches: { id: number; name: string }[];
    departments: { id: number; name: string }[];
};

export default function SecurityFundRegister({
    accounts,
    summary,
    asOf,
    filters: initialFilters,
    canCreate,
    canEdit,
    canExport,
    branches = [],
    departments = [],
}: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [options, setOptions] = useState<Option[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Option | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');

    const filter = useForm({
        search: initialFilters.search ?? '',
        status: initialFilters.status ?? '',
        employee_status: initialFilters.employee_status ?? '',
        branch_id: initialFilters.branch_id ?? '',
        department_id: initialFilters.department_id ?? '',
        as_of: asOf || fundToday(),
    });

    const createForm = useForm({
        employee_id: '',
        amount: '',
        transaction_date: fundToday(),
        reference_no: '',
        notes: '',
        idempotency_key: fundRequestKey(),
    });

    const hasActiveFilters = Boolean(
        filter.data.search ||
        filter.data.status ||
        filter.data.employee_status ||
        filter.data.branch_id ||
        filter.data.department_id ||
        (filter.data.as_of && filter.data.as_of !== fundToday())
    );

    const handleApplyFilters = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        filter.get(staffFundPath('/security-fund'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        filter.setData({
            search: '',
            status: '',
            employee_status: '',
            branch_id: '',
            department_id: '',
            as_of: fundToday(),
        });
        router.get(staffFundPath('/security-fund'), {}, { preserveState: false });
    };

    // Employee lookup inside Create Modal
    useEffect(() => {
        if (!showCreate) return;
        const controller = new AbortController();
        setLookupLoading(true);
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `/security-fund/employees/lookup?search=${encodeURIComponent(employeeSearch)}`,
                    {
                        signal: controller.signal,
                        headers: { Accept: 'application/json' },
                    }
                );
                if (!response.ok) throw new Error('Employee lookup failed. Refresh or try again.');
                const data: Option[] = await response.json();
                setOptions(data);
                setLookupError('');
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLookupError(error instanceof Error ? error.message : 'Lookup failed.');
                }
            } finally {
                setLookupLoading(false);
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [employeeSearch, showCreate]);

    const handleEmployeeSelect = (empId: string) => {
        createForm.setData('employee_id', empId);
        const found = options.find((o) => String(o.id) === empId);
        setSelectedEmployee(found || null);
    };

    const handleCreateSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.post(staffFundPath('/security-fund'), {
            onSuccess: () => {
                setShowCreate(false);
                setSelectedEmployee(null);
                createForm.reset();
                createForm.setData('idempotency_key', fundRequestKey());
            },
        });
    };

    return (
        <StaffFundLayout
            title="Security Fund Register"
            description="Employee security deposits with separate 6% annual simple interest · One-year minimum holding tenure"
            activeTab="security-register"
        >
            <Head title="Security Fund Register" />

            <div className="space-y-3">
                {/* 1. Summary KPI Cards */}
                <Summary values={summary} />

                {/* 2. Review Alert if flagged accounts exist */}
                {summary.review_count > 0 && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-lg border border-amber-250 bg-amber-50/90 p-3 text-xs text-amber-900 shadow-2xs"
                    >
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="font-semibold">
                                {summary.review_count} Account(s) Require Date Verification (তারিখ যাচাই প্রয়োজন)
                            </p>
                            <p className="text-amber-800 text-[11px]">
                                These accounts have missing or invalid historical dates. Their amounts are excluded from fund totals until dates are corrected.
                            </p>
                        </div>
                    </div>
                )}

                {/* 3. Policy Guidelines Accordion Banner */}
                <SecurityFundPolicyBanner />

                {/* 4. Toolbar & Actions Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pt-1">
                    {/* Quick Search */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                            <Input
                                placeholder="Search by PIN or employee name..."
                                value={filter.data.search}
                                onChange={(e) => filter.setData('search', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                className="h-8 text-xs pl-8 border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                            />
                            {filter.data.search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        filter.setData('search', '');
                                        router.get(staffFundPath('/security-fund'), { ...filter.data, search: '' }, { preserveState: true });
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <Button
                            onClick={() => handleApplyFilters()}
                            size="sm"
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-3 rounded shadow-2xs"
                        >
                            Search
                        </Button>
                    </div>

                    {/* Action Links & Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                        {/* Reports Export */}
                        <Exports filters={{ ...initialFilters, as_of: asOf }} canExport={canExport} />

                        {/* Excel Import */}
                        {(canCreate || canEdit) && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded"
                                asChild
                            >
                                <Link href={staffFundPath('/security-fund/import')}>
                                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-zinc-500" />
                                    Excel Import
                                </Link>
                            </Button>
                        )}

                        {/* Interest Preview & Post */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded text-emerald-800 font-medium"
                            asChild
                        >
                            <Link href={staffFundPath('/security-fund/interest')}>
                                <Calculator className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                Interest Calculation
                            </Link>
                        </Button>

                        {/* Create Deposit */}
                        {canCreate && (
                            <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-3 rounded shadow-2xs"
                                onClick={() => setShowCreate(true)}
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                New Deposit
                            </Button>
                        )}
                    </div>
                </div>

                {/* 5. Filter Card */}
                <Card className="overflow-hidden border border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                    <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
                                <span>Filter Register</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-zinc-200/60 font-mono">
                                    {accounts.total} Accounts
                                </Badge>
                            </CardTitle>
                            <span className="text-[11px] text-zinc-400">
                                As of:{' '}
                                <strong className="text-zinc-700 font-mono">
                                    {fundDisplayDate(asOf)}
                                </strong>
                                <span className="ml-1 text-[10px] font-normal text-zinc-400">
                                    ({fundDisplayDateReadable(asOf)})
                                </span>
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                    'h-7 text-[11px] border-zinc-200 bg-white rounded',
                                    showFilters && 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                )}
                                onClick={() => setShowFilters((v) => !v)}
                            >
                                <Filter className="mr-1 h-3 w-3" />
                                Filters
                            </Button>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[11px] text-zinc-500 hover:text-zinc-800"
                                    onClick={handleClearFilters}
                                >
                                    <RotateCcw className="mr-1 h-3 w-3" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    {showFilters && (
                        <CardContent className="p-3 border-b border-zinc-100 bg-zinc-50/20">
                            <form onSubmit={handleApplyFilters} className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-end">
                                {/* Branch Filter */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-zinc-600 block">
                                        Branch (শাখা)
                                    </label>
                                    <select
                                        className="w-full h-8 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                                        value={filter.data.branch_id}
                                        onChange={(e) => filter.setData('branch_id', e.target.value)}
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Department Filter */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-zinc-600 block">
                                        Department (বিভাগ)
                                    </label>
                                    <select
                                        className="w-full h-8 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                                        value={filter.data.department_id}
                                        onChange={(e) => filter.setData('department_id', e.target.value)}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Fund Status */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-zinc-600 block">
                                        Fund Status (তহবিল অবস্থা)
                                    </label>
                                    <select
                                        className="w-full h-8 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                                        value={filter.data.status}
                                        onChange={(e) => filter.setData('status', e.target.value)}
                                    >
                                        <option value="">All (সব)</option>
                                        <option value="open">Open (সক্রিয়)</option>
                                        <option value="closed">Closed (বন্ধ)</option>
                                    </select>
                                </div>

                                {/* Employee Status */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-zinc-600 block">
                                        Staff Status (কর্মী অবস্থা)
                                    </label>
                                    <select
                                        className="w-full h-8 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                                        value={filter.data.employee_status}
                                        onChange={(e) => filter.setData('employee_status', e.target.value)}
                                    >
                                        <option value="">All Staff</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>
                                </div>

                                {/* As Of Date (Bangladeshi context) */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold text-zinc-600 block">
                                            As Of Date (তারিখ অনুযায়ী)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => filter.setData('as_of', fundToday())}
                                            className="text-[10px] text-emerald-700 hover:underline font-medium"
                                        >
                                            Today
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            max={fundToday()}
                                            value={filter.data.as_of}
                                            onChange={(e) => filter.setData('as_of', e.target.value)}
                                            className="w-full h-8 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-400">
                                        Bangladeshi: {fundDisplayDate(filter.data.as_of)}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 h-8">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-8 flex-1 bg-zinc-800 hover:bg-zinc-900 text-xs text-white rounded"
                                    >
                                        Apply
                                    </Button>
                                    {hasActiveFilters && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearFilters}
                                            className="h-8 border-zinc-200 text-xs px-2.5 rounded"
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    )}
                </Card>

                {/* Validation Errors */}
                <Errors errors={filter.errors} />

                {/* 6. Accounts Register Table */}
                <Card className="overflow-hidden border border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                    <div className="overflow-x-auto">
                        <Table className="w-full text-xs">
                            <TableHeader className="bg-zinc-50/80 border-b border-zinc-200">
                                <TableRow>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                        Employee Info (কর্মী ও পদবী)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                        Branch (শাখা)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                        Deposit Date (জমার তারিখ)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 whitespace-nowrap">
                                        Interest Start (সুদ শুরু)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Principal (আসল)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Posted Interest (বণ্টনকৃত সুদ)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Accrued (অর্জিত সুদ)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-emerald-800 text-right whitespace-nowrap">
                                        Total Payable (মোট প্রদেয়)
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-center whitespace-nowrap">
                                        Status
                                    </TableHead>
                                    <TableHead className="py-2.5 px-3 font-bold text-zinc-700 text-right whitespace-nowrap">
                                        Ledger
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.data.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-zinc-50/70 border-b border-zinc-100 transition-colors">
                                        {/* Employee Info */}
                                        <TableCell className="py-2 px-3">
                                            <div className="flex items-start gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 font-mono text-[10px] font-bold text-emerald-700 shrink-0">
                                                    SF
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-zinc-900">{row.name}</span>
                                                        <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[10px] font-mono px-1 py-0 h-4">
                                                            {row.pin}
                                                        </Badge>
                                                    </div>
                                                    {row.department && (
                                                        <p className="text-[10px] text-zinc-400 mt-0.5">{row.department}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Branch */}
                                        <TableCell className="py-2 px-3">
                                            <span className="text-zinc-700">{row.branch || '—'}</span>
                                        </TableCell>

                                        {/* Deposit Date (Bangladeshi Format: DD/MM/YYYY) */}
                                        <TableCell className="py-2 px-3">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-zinc-800 font-medium">
                                                    {fundDisplayDate(row.opened_on)}
                                                </span>
                                                <span className="text-[10px] text-zinc-400">
                                                    {fundDisplayDateReadable(row.opened_on)}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Interest Start & Eligibility Badge */}
                                        <TableCell className="py-2 px-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-mono text-zinc-700">
                                                    {fundDisplayDate(fundInterestStart(row.opened_on))}
                                                </span>
                                                {row.next_eligibility_date ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 w-fit">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        Qualifies {fundDisplayDate(row.next_eligibility_date)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
                                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                                        Eligible (সুদ প্রযোজ্য)
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Financial Columns */}
                                        {row.review_required ? (
                                            <TableCell colSpan={4} className="py-2 px-3 text-amber-700 bg-amber-50/50">
                                                <div className="flex items-center gap-1.5">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="font-medium text-[11px]">{row.review_required}</span>
                                                </div>
                                            </TableCell>
                                        ) : (
                                            <>
                                                {/* Principal */}
                                                <TableCell className="py-2 px-3 text-right font-mono text-zinc-800 font-semibold">
                                                    ৳ {fundMoney(row.principal)}
                                                </TableCell>

                                                {/* Posted Interest (Unpaid) */}
                                                <TableCell className="py-2 px-3 text-right font-mono text-zinc-600">
                                                    ৳ {fundInterest(row.posted_interest)}
                                                </TableCell>

                                                {/* Accrued Interest (Unposted) */}
                                                <TableCell className="py-2 px-3 text-right font-mono text-amber-700 font-medium">
                                                    ৳ {fundInterest(row.unposted_interest)}
                                                </TableCell>

                                                {/* Total Payable */}
                                                <TableCell className="py-2 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                                                    ৳ {fundMoney(row.total)}
                                                </TableCell>
                                            </>
                                        )}

                                        {/* Status */}
                                        <TableCell className="py-2 px-3 text-center">
                                            <StatusBadge status={row.status} />
                                        </TableCell>

                                        {/* Ledger Link */}
                                        <TableCell className="py-2 px-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2 rounded font-medium"
                                                asChild
                                            >
                                                <Link href={staffFundPath(`/security-fund/${row.id}/ledger?as_of=${asOf}`)}>
                                                    <BookOpen className="mr-1 h-3 w-3" />
                                                    Ledger
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!accounts.data.length && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                                                <Wallet className="h-10 w-10 text-zinc-300 stroke-[1.5]" />
                                                <p className="text-sm font-semibold text-zinc-700">No Security Fund accounts found</p>
                                                <p className="text-xs text-zinc-500 max-w-sm">
                                                    Try clearing your filters, or click <strong>"+ New Deposit"</strong> to create a new Security Fund account for an employee.
                                                </p>
                                                {hasActiveFilters && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleClearFilters}
                                                        className="mt-2 text-xs border-zinc-200"
                                                    >
                                                        Clear All Filters
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Links */}
                    {accounts.links.length > 3 && (
                        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 bg-zinc-50/50">
                            <p className="text-[11px] text-zinc-500">
                                Showing {accounts.data.length} of {accounts.total} records
                            </p>
                            <div className="flex items-center gap-1">
                                {accounts.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.get(link.url)}
                                        className={cn(
                                            'h-7 px-2.5 text-xs rounded border-zinc-200',
                                            link.active && 'bg-emerald-600 text-white font-bold border-emerald-600 hover:bg-emerald-700 hover:text-white'
                                        )}
                                    >
                                        {link.label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* 7. Create Security Fund Deposit Modal */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                                <Plus className="h-4 w-4" />
                            </span>
                            Create Security Fund Account
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Record the initial security deposit for an active employee. 6% simple annual interest applies after 1 full year.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-3.5 mt-1">
                        <Errors errors={createForm.errors} />

                        {/* Search Employee */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                1. Search Active Employee (কর্মী খুঁজুন) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                <Input
                                    value={employeeSearch}
                                    onChange={(e) => {
                                        setEmployeeSearch(e.target.value);
                                        createForm.setData('employee_id', '');
                                        setSelectedEmployee(null);
                                    }}
                                    placeholder="Type PIN or employee name..."
                                    className="h-8.5 text-xs pl-8 border-zinc-200 rounded"
                                />
                            </div>
                        </div>

                        {lookupError && (
                            <p role="alert" className="text-xs text-rose-600">
                                {lookupError}
                            </p>
                        )}

                        {/* Employee Select */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                2. Select Employee from List <span className="text-rose-500">*</span>
                            </label>
                            <select
                                className="w-full h-8.5 rounded border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                                required
                                value={createForm.data.employee_id}
                                onChange={(e) => handleEmployeeSelect(e.target.value)}
                            >
                                <option value="">Choose an employee ({options.length} found)</option>
                                {options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.pin} — {option.name} · {option.designation} · {option.branch}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-zinc-400">
                                Active employees without existing Security Fund accounts are listed.
                            </p>
                        </div>

                        {/* Selected Employee Preview Card */}
                        {selectedEmployee && (
                            <div className="rounded border border-emerald-150 bg-emerald-50/50 p-2 text-xs flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-emerald-950">{selectedEmployee.name}</p>
                                    <p className="text-[10px] text-zinc-500">
                                        PIN: {selectedEmployee.pin} · {selectedEmployee.designation} · {selectedEmployee.branch}
                                    </p>
                                </div>
                                <Badge className="bg-emerald-600 text-white text-[10px]">Active Staff</Badge>
                            </div>
                        )}

                        {/* Deposit Amount (৳) */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-zinc-700 block">
                                    3. Deposit Amount (মূল আমানতের পরিমাণ) <span className="text-rose-500">*</span>
                                </label>
                                {createForm.data.amount && Number(createForm.data.amount) > 0 && (
                                    <span className="text-xs font-mono font-bold text-emerald-700">
                                        ৳ {fundMoney(createForm.data.amount)}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">৳</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max="99999999.99"
                                    required
                                    placeholder="e.g. 50000.00"
                                    value={createForm.data.amount}
                                    onChange={(e) => createForm.setData('amount', e.target.value)}
                                    className="h-8.5 text-xs pl-7 font-mono font-semibold border-zinc-200 rounded"
                                />
                            </div>
                        </div>

                        {/* Deposit Date (Bangladeshi context) */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-zinc-700 block">
                                    4. Deposit Date (জমার তারিখ) <span className="text-rose-500">*</span>
                                </label>
                                {createForm.data.transaction_date && (
                                    <span className="text-[11px] font-mono text-zinc-500">
                                        BD Format: <strong>{fundDisplayDate(createForm.data.transaction_date)}</strong>
                                    </span>
                                )}
                            </div>
                            <Input
                                type="date"
                                required
                                max={fundToday()}
                                value={createForm.data.transaction_date}
                                onChange={(e) => createForm.setData('transaction_date', e.target.value)}
                                className="h-8.5 text-xs border-zinc-200 rounded"
                            />
                        </div>

                        {/* Policy Calculation Projection Box */}
                        <div className="rounded-lg border border-emerald-150 bg-emerald-50/70 p-3 text-xs text-emerald-950 space-y-1 shadow-2xs">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                Policy & Interest Projection:
                            </div>
                            <div className="text-[11px] text-zinc-700 space-y-0.5 leading-relaxed">
                                <p>• Annual Rate: <strong className="text-emerald-800">6% Simple Interest</strong> on principal.</p>
                                <p>
                                    • First Earning Month Starts:{' '}
                                    <strong className="text-emerald-800 font-mono">
                                        {createForm.data.transaction_date
                                            ? fundDisplayDate(fundInterestStart(createForm.data.transaction_date))
                                            : '—'}
                                    </strong>
                                </p>
                                <p>
                                    • Eligible for Interest After 1 Year:{' '}
                                    <strong className="text-emerald-800 font-mono">
                                        {createForm.data.transaction_date
                                            ? fundDisplayDate(fundEligibilityDate(createForm.data.transaction_date))
                                            : '—'}
                                    </strong>
                                </p>
                                <p className="text-[10px] text-zinc-500 mt-1">
                                    Complete calendar months are counted retrospectively upon passing 1 year. Whole-taka rounding; never compounds.
                                </p>
                            </div>
                        </div>

                        {/* Reference / Receipt */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                5. Receipt / Voucher Reference No. <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                required
                                maxLength={120}
                                placeholder="e.g. MR-2026-0042 / Bank Deposit Slip"
                                value={createForm.data.reference_no}
                                onChange={(e) => createForm.setData('reference_no', e.target.value)}
                                className="h-8.5 text-xs border-zinc-200 rounded"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-700 block">
                                6. Notes / Deposit Evidence <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={2}
                                maxLength={2000}
                                placeholder="e.g. Security deposit received via Bank transfer or cash voucher."
                                value={createForm.data.notes}
                                onChange={(e) => createForm.setData('notes', e.target.value)}
                                className="w-full rounded border border-zinc-200 bg-white p-2 text-xs text-zinc-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCreate(false)}
                                className="h-8 text-xs border-zinc-200"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={createForm.processing}
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-4"
                            >
                                {createForm.processing ? 'Recording Deposit...' : 'Create Account & Deposit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </StaffFundLayout>
    );
}
