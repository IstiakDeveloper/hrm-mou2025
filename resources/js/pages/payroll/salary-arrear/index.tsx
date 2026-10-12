import { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PayrollBranchSelect, PayrollMonthSelect, PayrollYearSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollEmptyState, payrollBtnPrimary } from '@/components/payroll/PayrollPageShell';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { cn } from '@/lib/utils';
import {
    Coins,
    Users,
    Building2,
    Lock,
    Unlock,
    Search,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Info,
    Edit3,
    Eye,
    ShieldAlert,
    Clock,
} from 'lucide-react';

type Row = {
    id: number;
    branch_id: number | null;
    branch: string;
    status: string;
    open: boolean;
    employee_count: number;
    arrear_total: number;
    processed_at: string | null;
    posted_at: string | null;
};

type Props = {
    filters: { year: string; month: string; branch_id: string };
    period_label: string;
    rows: Row[];
    branches: { id: number; name: string; branch_code?: string | null }[];
    months: { value: number; label: string }[];
    years: number[];
    canEdit: boolean;
};

export default function SalaryArrearIndex({
    filters: initial,
    period_label,
    rows,
    branches,
    months,
    years,
    canEdit,
}: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [filters, setFilters] = useState(initial);
    const [activeTab, setActiveTab] = useState<'all' | 'open' | 'locked'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const openRows = useMemo(() => rows.filter((row) => row.open), [rows]);
    const lockedRows = useMemo(() => rows.filter((row) => !row.open), [rows]);

    const totalEmployees = useMemo(
        () => rows.reduce((sum, r) => sum + (r.employee_count || 0), 0),
        [rows]
    );

    const totalArrearAllocated = useMemo(
        () => rows.reduce((sum, r) => sum + (r.arrear_total || 0), 0),
        [rows]
    );

    const filteredRows = useMemo(() => {
        let list = rows;
        if (activeTab === 'open') list = openRows;
        if (activeTab === 'locked') list = lockedRows;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((r) => r.branch.toLowerCase().includes(q));
        }

        return list;
    }, [rows, openRows, lockedRows, activeTab, searchQuery]);

    const applyFilters = () => {
        router.get(route('salary-arrear.index'), filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <Layout>
            <Head title="Salary Arrear" />
            <PayrollPage className="space-y-5">
                {/* Header */}
                <PayrollPageHeader
                    title="Salary Arrear Management"
                    description={`Manage and allocate salary adjustments for ${period_label}. Arrears can be modified before salary posting.`}
                    icon={Coins}
                >
                    {openRows.length > 0 && canEdit && (
                        <Button
                            asChild
                            className={cn(
                                'cursor-pointer shadow-sm font-medium transition-all hover:shadow-md',
                                payrollBtnPrimary
                            )}
                        >
                            <Link href={route('salary-arrear.period', { year: filters.year, month: filters.month })}>
                                <Edit3 className="mr-1.5 h-4 w-4" />
                                Adjust All Arrears ({period_label})
                            </Link>
                        </Button>
                    )}
                </PayrollPageHeader>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-emerald-900 shadow-2xs">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        <span className="text-xs font-medium">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200/80 bg-red-50/70 px-4 py-3 text-red-900 shadow-2xs">
                        <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
                        <span className="text-xs font-medium">{flash.error}</span>
                    </div>
                )}

                {/* Compact Lifecycle Workflow & Hint */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-2xs">
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Info className="h-3.5 w-3.5" />
                        </span>
                        <span>
                            Arrears can be modified while branches are <strong className="font-semibold text-slate-800">Unposted</strong>. Once <strong className="font-semibold text-slate-800">Posted</strong>, records are locked permanently.
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            1. Processed
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-300" />
                        <span className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50/70 px-2 py-0.5 text-indigo-700 font-bold shadow-2xs">
                            <Coins className="h-3 w-3 text-indigo-600" />
                            2. Arrear Adjustment
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-300" />
                        <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-400">
                            <Lock className="h-3 w-3 text-slate-400" />
                            3. Post & Lock
                        </span>
                    </div>
                </div>

                {/* KPI Metrics Dashboard */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Open Runs (Editable)
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <Unlock className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900">{openRows.length}</span>
                            <span className="text-xs text-slate-400 font-medium">branches</span>
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            ● Ready for arrear allocation
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Locked Runs (Posted)
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
                                <Lock className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900">{lockedRows.length}</span>
                            <span className="text-xs text-slate-400 font-medium">branches</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 font-medium">
                            Already finalized & read-only
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Total Employees
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <Users className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900">{totalEmployees}</span>
                            <span className="text-xs text-slate-400 font-medium">staff members</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 font-medium">
                            Across all {rows.length} payroll batches
                        </div>
                    </div>

                    <div className="rounded-xl border border-emerald-100/90 bg-linear-to-br from-emerald-50/50 to-teal-50/20 p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                                Total Arrear Amount
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
                                <Coins className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5">
                            <span className="text-xl md:text-2xl font-bold tracking-tight text-emerald-950 font-mono">
                                {formatTakaWithSymbol(totalArrearAllocated)}
                            </span>
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                            Allocated in {period_label}
                        </div>
                    </div>
                </div>

                {/* Filter and Period Selection Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-emerald-600" />
                            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Select Payroll Period & Branch
                            </h2>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                            Current Period: <strong className="text-slate-700">{period_label}</strong>
                        </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 items-end">
                        <div className="lg:col-span-3">
                            <PayrollYearSelect
                                value={filters.year}
                                onChange={(year) => setFilters((current) => ({ ...current, year }))}
                                years={years}
                            />
                        </div>
                        <div className="lg:col-span-3">
                            <PayrollMonthSelect
                                value={filters.month}
                                onChange={(month) => setFilters((current) => ({ ...current, month }))}
                                months={months}
                            />
                        </div>
                        <div className="lg:col-span-4">
                            <PayrollBranchSelect
                                value={filters.branch_id}
                                onChange={(branch_id) => setFilters((current) => ({ ...current, branch_id }))}
                                branches={branches}
                            />
                        </div>
                        <div className="lg:col-span-2 flex items-end">
                            <Button
                                type="button"
                                className="w-full cursor-pointer bg-slate-900 text-white hover:bg-slate-800 font-medium text-xs h-9"
                                onClick={applyFilters}
                            >
                                <Search className="mr-1.5 h-3.5 w-3.5" />
                                Load Period
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area: Tabbed Unified Table */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                    {/* Controls Bar: Tabs + Search */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between bg-slate-50/40">
                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1.5 rounded-xl bg-slate-200/60 p-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('all')}
                                className={cn(
                                    'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                    activeTab === 'all'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                All Runs ({rows.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('open')}
                                className={cn(
                                    'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5',
                                    activeTab === 'open'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-emerald-700 hover:text-emerald-900'
                                )}
                            >
                                <span>Open for Arrear</span>
                                <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-bold', activeTab === 'open' ? 'bg-emerald-800/60 text-white' : 'bg-emerald-100 text-emerald-800')}>
                                    {openRows.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('locked')}
                                className={cn(
                                    'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5',
                                    activeTab === 'locked'
                                        ? 'bg-slate-800 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <span>Posted / Locked</span>
                                <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-bold', activeTab === 'locked' ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-700')}>
                                    {lockedRows.length}
                                </span>
                            </button>
                        </div>

                        {/* Search in Current List */}
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search branch name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8.5 pl-8 text-xs bg-white rounded-lg border-slate-200 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Permission Notice if cannot edit */}
                    {!canEdit && (
                        <div className="bg-amber-50/70 border-b border-amber-100 px-4 py-2.5 text-xs text-amber-900 flex items-center gap-2">
                            <Info className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>You are viewing in read-only mode. Adding or modifying arrear requires payroll edit permissions.</span>
                        </div>
                    )}

                    {/* Table or Empty State */}
                    {filteredRows.length === 0 ? (
                        <div className="p-8">
                            <PayrollEmptyState
                                message={
                                    searchQuery
                                        ? `No branches found matching "${searchQuery}".`
                                        : activeTab === 'open'
                                        ? `No unposted salary runs available for ${period_label}. Please run Salary Process first.`
                                        : activeTab === 'locked'
                                        ? `No posted salary runs found for ${period_label}.`
                                        : `No processed salary runs found for ${period_label}. Please run Salary Process first.`
                                }
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-3">Branch Details</th>
                                        <th className="px-4 py-3">Payroll Status</th>
                                        <th className="px-4 py-3 text-right">Employees</th>
                                        <th className="px-4 py-3 text-right">Total Arrear</th>
                                        <th className="px-4 py-3 text-center">Timing Info</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="transition-colors hover:bg-slate-50/80 group"
                                        >
                                            {/* Branch */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                                                        <Building2 className="h-4 w-4" />
                                                    </span>
                                                    <div>
                                                        <span className="font-semibold text-slate-900 text-xs block">
                                                            {row.branch}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            Run ID: #{row.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-4 py-3.5">
                                                {row.open ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Open for Arrear
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/80">
                                                        <Lock className="h-3 w-3 text-slate-400" />
                                                        Posted (Locked)
                                                    </span>
                                                )}
                                            </td>

                                            {/* Employee count */}
                                            <td className="px-4 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                                                <div className="inline-flex items-center gap-1">
                                                    <Users className="h-3 w-3 text-slate-400" />
                                                    <span>{row.employee_count}</span>
                                                </div>
                                            </td>

                                            {/* Arrear Total */}
                                            <td className="px-4 py-3.5 text-right tabular-nums">
                                                {row.arrear_total > 0 ? (
                                                    <div className="inline-flex flex-col items-end">
                                                        <span className="font-mono font-bold text-slate-900 text-xs bg-emerald-50/70 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-100">
                                                            {formatTakaWithSymbol(row.arrear_total)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-mono text-[11px]">
                                                        ৳ 0.00
                                                    </span>
                                                )}
                                            </td>

                                            {/* Timing */}
                                            <td className="px-4 py-3.5 text-center text-[10px] text-slate-400">
                                                {row.open ? (
                                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                                        <Clock className="h-3 w-3 text-slate-400" />
                                                        Processed: {row.processed_at ?? '—'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        Posted: {row.posted_at ?? '—'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right">
                                                {row.open ? (
                                                    canEdit ? (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            className={cn(
                                                                'cursor-pointer shadow-xs text-xs font-semibold h-7.5 px-3 rounded-lg',
                                                                payrollBtnPrimary
                                                            )}
                                                        >
                                                            <Link
                                                                href={route('salary-arrear.period', {
                                                                    year: filters.year,
                                                                    month: filters.month,
                                                                    branch_id: row.branch_id ?? '',
                                                                })}
                                                            >
                                                                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                                                Adjust Arrear
                                                            </Link>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                            className="cursor-pointer text-xs font-medium h-7.5 px-3 rounded-lg border-slate-200"
                                                        >
                                                            <Link href={route('salary-arrear.show', row.id)}>
                                                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                                View
                                                            </Link>
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                        className="cursor-pointer text-xs font-medium h-7.5 px-3 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                                    >
                                                        <Link href={route('salary-arrear.show', row.id)}>
                                                            <Eye className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                                                            View Record
                                                        </Link>
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </PayrollPage>
        </Layout>
    );
}
