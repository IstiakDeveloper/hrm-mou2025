import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    Printer,
    FileDown,
    FileSpreadsheet,
    Search,
    RefreshCw,
    Clock,
    AlertCircle,
    CheckCircle2,
    Users,
    Banknote,
    FileCheck2,
} from 'lucide-react';

type OptionItem = {
    id: number;
    name: string;
    code?: string | null;
    branch_code?: string | null;
    zone_id?: number | null;
    regional_office_id?: number | null;
};

type SelectOption = {
    value: string;
    label: string;
};

type RowItem = {
    sl: number;
    employee_id: number;
    pin: string;
    name: string;
    designation: string;
    left_date: string;
    left_date_raw: string | null;
    duration: string;
    left_reason: string;
    left_branch: string;
    clearance_status: string;
    clearance_status_code: string;
    clearance_status_label: string;
    clearance_id: number | null;
    payment_status: string;
    payment_status_code: string;
    payment_status_label: string;
    payment_date: string;
    payment_amount: number | null;
    security_principal?: string | null;
    security_interest?: string | null;
    payment_amount_formatted: string;
};

type Summary = {
    total_staff: number;
    waiting_count: number;
    pending_count: number;
    paid_count: number;
    clearance_approved_count: number;
    clearance_in_progress_count: number;
    clearance_not_submitted_count: number;
    total_amount: number;
    total_amount_formatted: string;
};

type Payload = {
    report_title: string;
    print_date: string;
    as_of_date: string;
    rows: RowItem[];
    summary: Summary;
    filters: Record<string, any>;
};

type Props = {
    companyName: string;
    companyAddress: string;
    report: {
        title: string;
        description: string;
        orientation: string;
    };
    filterOptions: {
        branches: OptionItem[];
        regional_offices: OptionItem[];
        zones: OptionItem[];
        payment_statuses: SelectOption[];
        clearance_statuses: SelectOption[];
    };
    filters: {
        as_of_date: string;
        date_from: string;
        date_to: string;
        payment_status: string;
        clearance_status: string;
        zone_id: number | null;
        regional_office_id: number | null;
        branch_id: number | null;
        search: string;
    };
    payload: Payload;
    exportUrls: {
        print: string;
        pdf: string;
        excel: string;
    };
};

export default function FinalPaymentWaitingListPage({
    companyName = 'MOUSUMI',
    companyAddress = 'Ukilpara, Naogaon',
    report,
    filterOptions,
    filters: initialFilters,
    payload,
    exportUrls,
}: Props) {
    const [filters, setFilters] = useState({
        as_of_date: initialFilters.as_of_date || new Date().toISOString().split('T')[0],
        date_from: initialFilters.date_from || '',
        date_to: initialFilters.date_to || '',
        payment_status: initialFilters.payment_status || 'waiting_pending',
        clearance_status: initialFilters.clearance_status || 'all',
        zone_id: initialFilters.zone_id ? String(initialFilters.zone_id) : '',
        regional_office_id: initialFilters.regional_office_id ? String(initialFilters.regional_office_id) : '',
        branch_id: initialFilters.branch_id ? String(initialFilters.branch_id) : '',
        search: initialFilters.search || '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cascading Regions by Zone
    const filteredRegions = useMemo(() => {
        if (!filters.zone_id) return filterOptions.regional_offices;
        return filterOptions.regional_offices.filter((r) => String(r.zone_id) === String(filters.zone_id));
    }, [filterOptions.regional_offices, filters.zone_id]);

    // Cascading Branches by Region
    const filteredBranches = useMemo(() => {
        if (!filters.regional_office_id) return filterOptions.branches;
        return filterOptions.branches.filter((b) => String(b.regional_office_id) === String(filters.regional_office_id));
    }, [filterOptions.branches, filters.regional_office_id]);

    const handleApplyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.get('/staff-fund/reports/final-payment-waiting-list', filters, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleReset = () => {
        const resetDefaults = {
            as_of_date: new Date().toISOString().split('T')[0],
            date_from: '',
            date_to: '',
            payment_status: 'waiting_pending',
            clearance_status: 'all',
            zone_id: '',
            regional_office_id: '',
            branch_id: '',
            search: '',
        };
        setFilters(resetDefaults);
        router.get('/staff-fund/reports/final-payment-waiting-list', resetDefaults);
    };

    const handlePrint = () => {
        window.open(exportUrls.print, '_blank');
    };

    const rows = payload?.rows || [];
    const summary = payload?.summary || {
        total_staff: 0,
        waiting_count: 0,
        pending_count: 0,
        paid_count: 0,
        clearance_approved_count: 0,
        clearance_in_progress_count: 0,
        clearance_not_submitted_count: 0,
        total_amount: 0,
        total_amount_formatted: '0.00',
    };

    const getClearanceBadgeClass = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'in_progress':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'rejected':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getPaymentBadgeClass = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'pending':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            default:
                return 'bg-rose-100 text-rose-800 border-rose-200';
        }
    };

    return (
        <Layout>
            <Head title="Final Payment Waiting List" />

            <div className="space-y-4 p-4 md:p-6">
                {/* Header & Controls */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/sections/staff-fund"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                                title="Back to Staff Fund"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                {report?.title || 'Final Payment Waiting List'}
                            </h1>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700">
                                Landscape
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 sm:ml-10">
                            {report?.description ||
                                'Comprehensive list of separated staff awaiting final payment settlement with clearance status, duration, and net payable amounts.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="gap-1.5"
                        >
                            <Printer className="h-4 w-4 text-slate-600" />
                            <span>Print</span>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-slate-700 hover:bg-slate-50"
                        >
                            <a href={exportUrls.pdf} download>
                                <FileDown className="h-4 w-4 text-red-600" />
                                <span>PDF</span>
                            </a>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                            <a href={exportUrls.excel} download>
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <span>Excel</span>
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Filter Form */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <form onSubmit={handleApplyFilters} className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">As on Date</label>
                                <Input
                                    type="date"
                                    value={filters.as_of_date}
                                    onChange={(e) => setFilters({ ...filters, as_of_date: e.target.value })}
                                    className="mt-1 h-8 text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Left Date From</label>
                                <Input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                                    className="mt-1 h-8 text-xs"
                                    placeholder="Start date"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Left Date To</label>
                                <Input
                                    type="date"
                                    value={filters.date_to}
                                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                                    className="mt-1 h-8 text-xs"
                                    placeholder="End date"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Payment Status</label>
                                <select
                                    value={filters.payment_status}
                                    onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                >
                                    {filterOptions.payment_statuses.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Clearance Status</label>
                                <select
                                    value={filters.clearance_status}
                                    onChange={(e) => setFilters({ ...filters, clearance_status: e.target.value })}
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                >
                                    {filterOptions.clearance_statuses.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Zone</label>
                                <select
                                    value={filters.zone_id}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            zone_id: e.target.value,
                                            regional_office_id: '',
                                            branch_id: '',
                                        })
                                    }
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                >
                                    <option value="">All Zones</option>
                                    {filterOptions.zones.map((z) => (
                                        <option key={z.id} value={z.id}>
                                            {z.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Regional Office</label>
                                <select
                                    value={filters.regional_office_id}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            regional_office_id: e.target.value,
                                            branch_id: '',
                                        })
                                    }
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                >
                                    <option value="">All Regions</option>
                                    {filteredRegions.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Branch</label>
                                <select
                                    value={filters.branch_id}
                                    onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                                    className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                                >
                                    <option value="">All Branches</option>
                                    {filteredBranches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} {b.branch_code ? `(${b.branch_code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-slate-700">Search (PIN / Name)</label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="PIN, Name..."
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        className="h-8 pl-8 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSubmitting}
                                    className="h-8 flex-1 gap-1.5 bg-slate-900 text-xs text-white hover:bg-slate-800"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                                    <span>Filter</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    className="h-8 text-xs"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-[11px] font-semibold">Total Staff</span>
                            <Users className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{summary.total_staff}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">Separated/Left Records</div>
                    </div>

                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 shadow-sm">
                        <div className="flex items-center justify-between text-rose-700">
                            <span className="text-[11px] font-semibold">Waiting</span>
                            <Clock className="h-4 w-4 text-rose-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-rose-800">{summary.waiting_count}</div>
                        <div className="mt-0.5 text-[10px] text-rose-600/80">Payment Not Initiated</div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-sm">
                        <div className="flex items-center justify-between text-amber-700">
                            <span className="text-[11px] font-semibold">Pending</span>
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-amber-800">{summary.pending_count}</div>
                        <div className="mt-0.5 text-[10px] text-amber-600/80">In Settlement Process</div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
                        <div className="flex items-center justify-between text-emerald-700">
                            <span className="text-[11px] font-semibold">Paid</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-emerald-800">{summary.paid_count}</div>
                        <div className="mt-0.5 text-[10px] text-emerald-600/80">Fully Settled</div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 shadow-sm">
                        <div className="flex items-center justify-between text-blue-700">
                            <span className="text-[11px] font-semibold">Clearance Approved</span>
                            <FileCheck2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="mt-1 text-xl font-bold text-blue-800">{summary.clearance_approved_count}</div>
                        <div className="mt-0.5 text-[10px] text-blue-600/80">Ready for Payout</div>
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 shadow-sm">
                        <div className="flex items-center justify-between text-indigo-700">
                            <span className="text-[11px] font-semibold">Total Payable</span>
                            <Banknote className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="mt-1 text-lg font-bold text-indigo-900 tracking-tight">
                            ৳ {summary.total_amount_formatted}
                        </div>
                        <div className="mt-0.5 text-[10px] text-indigo-600/80">Calculated Net Amount</div>
                    </div>
                </div>

                {/* Report Table Card */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Corner Header Bar with Print Date */}
                    <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50/75 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs">
                        <div className="text-slate-700 font-semibold">
                            <span>As of Date: </span>
                            <span className="font-bold text-slate-900">{payload?.as_of_date || '—'}</span>
                            {payload?.filters?.date_from || payload?.filters?.date_to ? (
                                <span className="ml-3 text-slate-600">
                                    (Left Date: {payload?.filters?.date_from || 'Start'} to{' '}
                                    {payload?.filters?.date_to || 'End'})
                                </span>
                            ) : null}
                        </div>
                        <div className="text-slate-800 font-mono text-[11px]">
                            <span className="text-slate-500 font-sans font-medium">print Date: </span>
                            <span className="font-bold">{payload?.print_date || '—'}</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                                    <th className="px-3 py-2 text-center w-12">SL No</th>
                                    <th className="px-3 py-2 text-center w-20">Pin</th>
                                    <th className="px-3 py-2 min-w-[150px]">Name (English)</th>
                                    <th className="px-3 py-2 min-w-[130px]">Designation</th>
                                    <th className="px-3 py-2 text-center w-24">Left Date</th>
                                    <th className="px-3 py-2 text-center min-w-[110px]">Duration from the left Date</th>
                                    <th className="px-3 py-2 min-w-[140px]">Left Reason</th>
                                    <th className="px-3 py-2 min-w-[120px]">Left Branch</th>
                                    <th className="px-3 py-2 text-center min-w-[120px]">Clearance Status</th>
                                    <th className="px-3 py-2 text-center min-w-[110px]">Payment Status</th>
                                    <th className="px-3 py-2 text-center w-24">Payment Date</th>
                                    <th className="px-3 py-2 text-right min-w-[110px]">Payment Amount</th>
                                    <th className="px-3 py-2 text-right min-w-[110px]">Security Principal</th>
                                    <th className="px-3 py-2 text-right min-w-[110px]">Security Interest</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="px-4 py-12 text-center text-slate-400 italic">
                                            No separated staff found matching the selected filters.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr
                                            key={`${row.employee_id}-${row.sl}`}
                                            className="hover:bg-slate-50/80 transition-colors"
                                        >
                                            <td className="px-3 py-2 text-center text-slate-500 font-mono text-[11px]">
                                                {row.sl}
                                            </td>
                                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-800">
                                                {row.pin}
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-slate-900">
                                                {row.name}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">
                                                {row.designation}
                                            </td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700 font-mono text-[11px]">
                                                {row.left_date}
                                            </td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap font-medium text-slate-800">
                                                <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                                                    {row.duration}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">
                                                {row.left_reason}
                                            </td>
                                            <td className="px-3 py-2 text-slate-700">
                                                {row.left_branch}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span
                                                    className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold leading-tight ${getClearanceBadgeClass(
                                                        row.clearance_status_code
                                                    )}`}
                                                >
                                                    {row.clearance_status_label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span
                                                    className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold leading-tight ${getPaymentBadgeClass(
                                                        row.payment_status_code
                                                    )}`}
                                                >
                                                    {row.payment_status_label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700 font-mono text-[11px]">
                                                {row.payment_date}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                                                {row.payment_amount_formatted !== '—'
                                                    ? `৳ ${row.payment_amount_formatted}`
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">{row.security_principal === null || row.security_principal === undefined ? '—' : Number(row.security_principal).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{row.security_interest === null || row.security_interest === undefined ? '—' : Number(row.security_interest).toFixed(0)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {rows.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900 text-xs">
                                        <td colSpan={4} className="px-3 py-2.5">
                                            Total Records: {summary.total_staff} (Waiting: {summary.waiting_count},
                                            Pending: {summary.pending_count}, Paid: {summary.paid_count})
                                        </td>
                                        <td colSpan={7} className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px]">
                                            Grand Total:
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono text-sm text-slate-900">
                                            ৳ {summary.total_amount_formatted}
                                        </td>
                                        <td colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-normal">Included in payment amount</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
