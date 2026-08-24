import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Check,
    X,
    Search,
    ShieldCheck,
    Clock,
    AlertTriangle,
    Filter,
    Lock,
    Unlock,
    CheckCircle2,
    ListFilter,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Building2,
    Phone,
    Printer,
    RefreshCw,
    ShieldOff,
    SlidersHorizontal,
    RotateCcw,
    UserCheck,
    ArrowUpRight,
    Navigation,
    User,
} from 'lucide-react';

interface PenaltyRecord {
    id: number;
    overdue_days: number;
    fine_per_day: number;
    total_fine: number;
    payment_method: string | null;
    sender_number: string | null;
    transaction_id: string | null;
    status: 'unpaid' | 'pending_verification' | 'approved' | 'rejected';
    admin_remarks: string | null;
    created_at: string;
    employee?: {
        name_en?: string;
        name_bn?: string;
        first_name?: string;
        last_name?: string;
        employee_id: string;
        branch?: {
            name: string;
        };
    };
    movement?: {
        id: number;
        purpose: string;
        from_datetime: string;
        actual_return_datetime?: string | null;
    };
    approver?: {
        name: string;
    };
}

interface PaginatedPenalties {
    data: PenaltyRecord[];
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
        path: string;
        per_page: number;
        to: number | null;
        total: number;
    };
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
}

interface Props {
    pendingPenalties: PaginatedPenalties;
    paidPenalties: PaginatedPenalties;
    waivedPenalties?: PaginatedPenalties;
    rejectedPenalties?: PaginatedPenalties;
    unpaidPenalties?: PaginatedPenalties;
    allPenalties: PaginatedPenalties;
    branches: Array<{ id: number; name: string }>;
    stats: {
        unpaid_count: number;
        pending_count: number;
        approved_count: number;
        paid_count?: number;
        waived_count?: number;
        rejected_count: number;
        total_count: number;
        total_fine_amount: number;
    };
    paidStats?: {
        count: number;
        total_amount: number;
        total_overdue_days: number;
    };
    waivedStats?: {
        count: number;
        total_amount: number;
        total_overdue_days: number;
    };
    tab: string;
    filters: {
        status?: string;
        search?: string;
        branch_id?: string;
        start_date?: string;
        end_date?: string;
        tab?: string;
        per_page?: number;
    };
}

export default function PenaltyAdmin({
    pendingPenalties,
    paidPenalties,
    waivedPenalties,
    rejectedPenalties,
    unpaidPenalties,
    allPenalties,
    branches,
    stats,
    paidStats,
    waivedStats,
    tab = 'pending',
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState<string>(filters.tab || (stats.pending_count > 0 ? 'pending' : 'all'));
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [branchFilter, setBranchFilter] = useState(filters.branch_id || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [perPage, setPerPage] = useState(String(filters.per_page || 15));
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const [rejectingPenalty, setRejectingPenalty] = useState<PenaltyRecord | null>(null);
    const [approvingPenalty, setApprovingPenalty] = useState<PenaltyRecord | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncPenalties = () => {
        setIsSyncing(true);
        router.post(
            route('movement-penalties.sync'),
            {},
            {
                onFinish: () => setIsSyncing(false),
            }
        );
    };

    const {
        data: rejectData,
        setData: setRejectData,
        post: postReject,
        processing: rejectProcessing,
        reset: resetReject,
    } = useForm({
        admin_remarks: '',
    });

    const {
        data: approveData,
        setData: setApproveData,
        post: postApprove,
        processing: approveProcessing,
        reset: resetApprove,
    } = useForm({
        admin_remarks: 'Payment verified and user account unlocked.',
    });

    const formatDateTime = (dtStr?: string | null) => {
        if (!dtStr) return 'N/A';
        try {
            const d = new Date(dtStr.includes('T') ? dtStr : dtStr.replace(' ', 'T'));
            if (isNaN(d.getTime())) return dtStr;
            return d.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch (e) {
            return dtStr;
        }
    };

    const getEmployeeName = (employee?: PenaltyRecord['employee']) => {
        if (!employee) return 'Unknown';
        if (employee.name_en) return employee.name_en;
        if (employee.name_bn) return employee.name_bn;
        if (employee.first_name || employee.last_name) return `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
        return 'Unknown';
    };

    const handleFilter = (tabName = activeTab, perPageValue = perPage) => {
        const targetTab = statusFilter !== 'all' && tabName !== 'all' ? 'all' : tabName;
        if (targetTab !== activeTab) {
            setActiveTab(targetTab);
        }
        router.get(
            route('movement-penalties.index'),
            {
                tab: targetTab,
                search: search || undefined,
                status: statusFilter === 'all' ? undefined : statusFilter,
                branch_id: branchFilter === 'all' ? undefined : branchFilter,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                per_page: perPageValue,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setBranchFilter('all');
        setStartDate('');
        setEndDate('');
        router.get(
            route('movement-penalties.index'),
            { tab: activeTab },
            { preserveState: true, replace: true }
        );
    };

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        handleFilter(newTab);
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        handleFilter(activeTab, value);
    };

    const handleApproveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!approvingPenalty) return;
        postApprove(route('movement-penalties.approve', approvingPenalty.id), {
            onSuccess: () => {
                setApprovingPenalty(null);
                resetApprove();
            },
        });
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingPenalty) return;
        postReject(route('movement-penalties.reject', rejectingPenalty.id), {
            onSuccess: () => {
                setRejectingPenalty(null);
                resetReject();
            },
        });
    };

    const handlePrintPaidReport = () => {
        window.print();
    };

    const getStatusBadge = (status: PenaltyRecord['status']) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold text-[11px] px-2.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                        Approved & Unlocked
                    </Badge>
                );
            case 'pending_verification':
                return (
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold text-[11px] px-2.5 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" />
                        Pending Verification
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold text-[11px] px-2.5 py-0.5 rounded-md">
                        <X className="w-3 h-3 mr-1 text-rose-600" />
                        Rejected
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] px-2.5 py-0.5 rounded-md">
                        <Lock className="w-3 h-3 mr-1 text-slate-500" />
                        Unpaid / Locked
                    </Badge>
                );
        }
    };

    const renderPagination = (paginated?: PaginatedPenalties) => {
        if (!paginated?.meta || paginated.meta.total <= 0) return null;

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-200/70 bg-zinc-50/80 px-4 py-3 text-xs">
                <div className="flex flex-wrap items-center space-x-3 text-zinc-500">
                    <div className="flex items-center space-x-1.5">
                        <span>Rows:</span>
                        <Select value={perPage} onValueChange={handlePerPageChange}>
                            <SelectTrigger className="h-7 w-[65px] border-zinc-200 bg-white text-xs">
                                <SelectValue placeholder="15" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <span>
                        Showing <span className="font-semibold text-zinc-800">{paginated.meta.from || 0}</span>-
                        <span className="font-semibold text-zinc-800">{paginated.meta.to || 0}</span> of{' '}
                        <span className="font-semibold text-zinc-800">{paginated.meta.total}</span>
                    </span>
                </div>

                {paginated.meta.last_page > 1 && (
                    <div className="flex items-center space-x-1">
                        {paginated.links?.prev && (
                            <Link
                                href={paginated.links.prev}
                                preserveState
                                className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Link>
                        )}

                        {paginated.meta.links?.slice(1, -1).map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                preserveState
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    link.active
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}

                        {paginated.links?.next && (
                            <Link
                                href={paginated.links.next}
                                preserveState
                                className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const selectedBranchName = branches?.find((b) => String(b.id) === branchFilter)?.name || 'All Branches';

    return (
        <Layout>
            <Head title="Movement Penalties Verification" />

            {/* PRINT STYLES */}
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 0 8mm 8mm 8mm;
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-paid-report, #printable-paid-report * {
                        visibility: visible !important;
                    }
                    #printable-paid-report {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        display: block !important;
                        font-size: 10px !important;
                    }
                    #printable-paid-report table {
                        width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                    }
                    #printable-paid-report th, #printable-paid-report td {
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        padding: 4px 5px !important;
                        line-height: 1.2 !important;
                    }
                    #printable-paid-report tfoot tr {
                        background-color: #f3f4f6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #printable-paid-report tfoot td {
                        padding: 6px 6px !important;
                        font-size: 11.5px !important;
                        font-weight: 800 !important;
                        line-height: 1.3 !important;
                        text-overflow: clip !important;
                        white-space: nowrap !important;
                    }
                }
            `}</style>

            {/* MAIN SCREEN APPLICATION CONTAINER */}
            <PageSurface className="w-full max-w-none space-y-4 sm:space-y-6 bg-zinc-50/60 p-3 sm:p-6 md:p-8 print:hidden">
                {/* 1. TOP HEADER BANNER */}
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
                            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                                Overdue Movement Penalties Verification
                            </h1>
                            <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                                Verify Sender Mobile Numbers, process fine waivers, and manage employee account unlocks. Fines accrue at ৳20/day for unclosed movements.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            size="sm"
                            onClick={handleSyncPenalties}
                            disabled={isSyncing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 shadow-sm w-full sm:w-auto rounded-xl transition-all"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing Penalties...' : 'Sync Overdue Penalties'}
                        </Button>
                    </div>
                </div>

                {/* 2. STATS KPI CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <Card className="bg-white border-zinc-200/80 shadow-sm hover:shadow transition-shadow">
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">Unpaid / Locked</p>
                                <p className="text-lg sm:text-2xl font-black text-slate-700 mt-0.5">{stats.unpaid_count}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-slate-100 text-slate-700 rounded-xl">
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200/80 shadow-sm hover:shadow transition-shadow">
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">Pending Verifications</p>
                                <p className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">{stats.pending_count}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200/80 shadow-sm hover:shadow transition-shadow">
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">Paid Penalties</p>
                                <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">{stats.paid_count ?? stats.approved_count}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200/80 shadow-sm hover:shadow transition-shadow">
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">Waived Penalties</p>
                                <p className="text-lg sm:text-2xl font-black text-indigo-600 mt-0.5">{stats.waived_count ?? 0}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <ShieldOff className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200/80 shadow-sm hover:shadow transition-shadow">
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">Rejected Submissions</p>
                                <p className="text-lg sm:text-2xl font-black text-rose-600 mt-0.5">{stats.rejected_count}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-rose-50 text-rose-600 rounded-xl">
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200/80 shadow-sm hover:shadow transition-shadow">
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">Total Fine Amount</p>
                                <p className="text-lg sm:text-2xl font-black text-zinc-900 mt-0.5">৳ {Number(stats.total_fine_amount).toLocaleString()}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. RESPONSIVE FILTER PANEL */}
                <Card className="bg-white border-zinc-200/80 shadow-sm">
                    <div className="p-3.5 sm:p-4">
                        <div className="flex items-center justify-between sm:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="w-full justify-between text-xs h-9 border-zinc-200"
                            >
                                <span className="flex items-center">
                                    <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                    Filter Options
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                    {showMobileFilters ? 'Hide' : 'Show'}
                                </Badge>
                            </Button>
                        </div>

                        <div className={`mt-3 sm:mt-0 ${showMobileFilters ? 'block' : 'hidden sm:block'}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                                {/* Search */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-zinc-600">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                                        <Input
                                            placeholder="Mobile, Name, ID..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                            className="pl-8 bg-white border-zinc-200 text-zinc-900 text-xs h-9 rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Branch */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-zinc-600">Branch</Label>
                                    <Select value={branchFilter} onValueChange={(val) => setBranchFilter(val)}>
                                        <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 h-9 text-xs rounded-lg">
                                            <SelectValue placeholder="All Branches" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-zinc-200">
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {branches?.map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)}>
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-zinc-600">Status</Label>
                                    <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                                        <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 h-9 text-xs rounded-lg">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-zinc-200">
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="unpaid">Unpaid / Locked</SelectItem>
                                            <SelectItem value="pending_verification">Pending Verification</SelectItem>
                                            <SelectItem value="approved">Approved & Unlocked</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Date From */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-zinc-600">Date From</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-white border-zinc-200 text-zinc-900 text-xs h-9 rounded-lg"
                                    />
                                </div>

                                {/* Date To */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-zinc-600">Date To</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-white border-zinc-200 text-zinc-900 text-xs h-9 rounded-lg"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleFilter()}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-semibold rounded-lg shadow-sm"
                                    >
                                        <Filter className="w-3.5 h-3.5 mr-1" /> Apply
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleResetFilters}
                                        className="h-9 px-2.5 text-xs text-zinc-600 border-zinc-200 rounded-lg hover:bg-zinc-100"
                                        title="Reset Filters"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 4. MAIN TABS SECTION */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
                    {/* SLEEK SEGMENTED TAB SWITCHER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-1.5 rounded-2xl border border-zinc-200/80 shadow-sm">
                        <TabsList className="bg-zinc-100/90 p-1 rounded-xl flex overflow-x-auto whitespace-nowrap scrollbar-none w-full sm:w-auto h-auto gap-1">
                            <TabsTrigger
                                value="pending"
                                className="text-xs font-bold px-3.5 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-800 transition-all flex items-center"
                            >
                                <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 flex-shrink-0" />
                                Pending
                                <span className="ml-1.5 px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black">
                                    {stats.pending_count}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="unpaid"
                                className="text-xs font-bold px-3.5 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800 transition-all flex items-center"
                            >
                                <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-600 flex-shrink-0" />
                                Unpaid / Locked
                                <span className="ml-1.5 px-2 py-0.5 bg-slate-200 text-slate-900 rounded-full text-[10px] font-black">
                                    {stats.unpaid_count}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="paid"
                                className="text-xs font-bold px-3.5 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-800 transition-all flex items-center"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 flex-shrink-0" />
                                Paid Penalties
                                <span className="ml-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-black">
                                    {stats.paid_count ?? stats.approved_count}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="waived"
                                className="text-xs font-bold px-3.5 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-800 transition-all flex items-center"
                            >
                                <ShieldOff className="w-3.5 h-3.5 mr-1.5 text-indigo-600 flex-shrink-0" />
                                Waived Fines
                                <span className="ml-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-full text-[10px] font-black">
                                    {stats.waived_count ?? 0}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="rejected"
                                className="text-xs font-bold px-3.5 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-rose-800 transition-all flex items-center"
                            >
                                <X className="w-3.5 h-3.5 mr-1.5 text-rose-600 flex-shrink-0" />
                                Rejected
                                <span className="ml-1.5 px-2 py-0.5 bg-rose-100 text-rose-900 rounded-full text-[10px] font-black">
                                    {stats.rejected_count}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="all"
                                className="text-xs font-bold px-3.5 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-800 transition-all flex items-center"
                            >
                                <ListFilter className="w-3.5 h-3.5 mr-1.5 text-zinc-600 flex-shrink-0" />
                                All Logs
                                <span className="ml-1.5 px-2 py-0.5 bg-zinc-200 text-zinc-900 rounded-full text-[10px] font-black">
                                    {stats.total_count}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === 'all' && (
                            <Select
                                value={statusFilter}
                                onValueChange={(val) => {
                                    setStatusFilter(val);
                                    handleFilter('all');
                                }}
                            >
                                <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 h-8 text-xs w-full sm:w-40 rounded-lg">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-zinc-200">
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="unpaid">Unpaid / Locked</SelectItem>
                                    <SelectItem value="pending_verification">Pending Verification</SelectItem>
                                    <SelectItem value="approved">Approved & Unlocked</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* TAB 1: PENDING VERIFICATION APPROVALS */}
                    <TabsContent value="pending" className="mt-0">
                        <Card className="bg-white border-zinc-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-100 py-3.5 px-4 sm:px-6">
                                <CardTitle className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center">
                                    <Clock className="w-4 h-4 text-amber-600 mr-2 flex-shrink-0" />
                                    Pending Payment Verification (Action Required)
                                </CardTitle>
                                <CardDescription className="text-[11px] sm:text-xs text-zinc-500">
                                    Verify bKash/Nagad Sender Mobile Numbers submitted by employees to approve and unlock account IDs.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* MOBILE CARDS VIEW (block md:hidden) */}
                                <div className="block md:hidden divide-y divide-zinc-100">
                                    {!pendingPenalties?.data || pendingPenalties.data.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                                            No pending payment verifications found.
                                        </div>
                                    ) : (
                                        pendingPenalties.data.map((item) => (
                                            <div key={item.id} className="p-4 space-y-3 bg-white hover:bg-zinc-50/60">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                        <p className="text-[11px] text-zinc-500 mt-0.5">
                                                            ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `• ${item.employee.branch.name}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-md border border-rose-200/60">
                                                        ৳ {Number(item.total_fine).toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="bg-zinc-50 p-2.5 rounded-xl space-y-1 text-[11px] border border-zinc-100">
                                                    <span className="font-semibold text-zinc-900 block">
                                                        Movement #{item.movement?.id}: {item.movement?.purpose || 'N/A'}
                                                    </span>
                                                    <span className="text-zinc-500 block">Start: {formatDateTime(item.movement?.from_datetime)}</span>
                                                    <span className="text-amber-700 font-medium block">
                                                        Return: {item.movement?.actual_return_datetime ? formatDateTime(item.movement.actual_return_datetime) : 'Still Open (Not Closed)'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <div className="flex items-center space-x-1.5">
                                                        <span className="uppercase px-2 py-0.5 bg-pink-50 text-pink-700 font-mono font-bold text-[10px] rounded border border-pink-200/60">
                                                            {item.payment_method || 'Payment'}
                                                        </span>
                                                        <span className="font-mono font-extrabold text-zinc-950 text-xs">
                                                            {item.sender_number || item.transaction_id || 'N/A'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-1.5">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setApprovingPenalty(item)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-3 rounded-lg"
                                                        >
                                                            <Unlock className="w-3 h-3 mr-1" /> Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => setRejectingPenalty(item)}
                                                            className="text-[11px] h-7 px-2.5 rounded-lg"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* DESKTOP TABLE VIEW (hidden md:block) */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <Table className="w-full">
                                        <TableHeader className="bg-zinc-50/80">
                                            <TableRow className="border-zinc-200/80">
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Employee & Branch</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Movement & Return Time</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Overdue & Fine</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Sender Mobile & Method</TableHead>
                                                <TableHead className="text-right text-zinc-600 text-xs font-semibold">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!pendingPenalties?.data || pendingPenalties.data.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-10 text-zinc-500 text-xs">
                                                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                                                        No pending payment verifications found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                pendingPenalties.data.map((item) => (
                                                    <TableRow key={item.id} className="border-zinc-100 hover:bg-zinc-50/60">
                                                        <TableCell className="font-medium text-zinc-900">
                                                            <div>
                                                                <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                    ID: {item.employee?.employee_id || 'N/A'}{' '}
                                                                    {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-700 text-xs">
                                                            <p className="font-semibold text-zinc-900">
                                                                #{item.movement?.id} - {item.movement?.purpose || 'N/A'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                Start: {formatDateTime(item.movement?.from_datetime)}
                                                            </p>
                                                            <p className="text-[11px] text-amber-700 font-medium">
                                                                Return: {item.movement?.actual_return_datetime ? formatDateTime(item.movement.actual_return_datetime) : 'Still Open (Not Closed)'}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-900">
                                                            <p className="text-xs text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</p>
                                                            <p className="text-sm font-black text-rose-600 mt-0.5">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-800 text-xs">
                                                            <div className="space-y-0.5">
                                                                <span className="uppercase px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-pink-50 text-pink-800 border border-pink-200/60">
                                                                    {item.payment_method || 'bKash'}
                                                                </span>
                                                                <p className="font-mono font-extrabold text-zinc-950 text-sm flex items-center mt-1">
                                                                    <Phone className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                                    {item.sender_number || item.transaction_id || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setApprovingPenalty(item)}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-lg"
                                                                >
                                                                    <Unlock className="w-3.5 h-3.5 mr-1" /> Approve & Unlock
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => setRejectingPenalty(item)}
                                                                    className="text-xs h-8 px-3 rounded-lg"
                                                                >
                                                                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {renderPagination(pendingPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB UNPAID: UNPAID / LOCKED PENALTIES */}
                    <TabsContent value="unpaid" className="mt-0">
                        <Card className="bg-white border-zinc-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-100 py-3.5 px-4 sm:px-6">
                                <CardTitle className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center">
                                    <Lock className="w-4 h-4 text-slate-600 mr-2 flex-shrink-0" />
                                    Unpaid & Locked Accounts List
                                </CardTitle>
                                <CardDescription className="text-[11px] sm:text-xs text-zinc-500">
                                    Employees with overdue movement penalties whose account IDs are currently locked until payment or fine waiver.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* MOBILE CARDS VIEW */}
                                <div className="block md:hidden divide-y divide-zinc-100">
                                    {!unpaidPenalties?.data || unpaidPenalties.data.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs">
                                            No unpaid/locked penalties found.
                                        </div>
                                    ) : (
                                        unpaidPenalties.data.map((item) => (
                                            <div key={item.id} className="p-4 space-y-3 bg-white">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                        <p className="text-[11px] text-zinc-500 mt-0.5">
                                                            ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `• ${item.employee.branch.name}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-md border border-rose-200/60">
                                                        ৳ {Number(item.total_fine).toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="bg-zinc-50 p-2.5 rounded-xl space-y-1 text-[11px] border border-zinc-100">
                                                    <p className="font-semibold text-zinc-900">
                                                        Movement #{item.movement?.id}: {item.movement?.purpose || 'N/A'}
                                                    </p>
                                                    <p className="text-zinc-500">Start: {formatDateTime(item.movement?.from_datetime)}</p>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-[11px] text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</span>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setApprovingPenalty(item)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 px-3 rounded-lg"
                                                    >
                                                        <Unlock className="w-3 h-3 mr-1" /> Waive Fine
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <Table className="w-full">
                                        <TableHeader className="bg-zinc-50/80">
                                            <TableRow className="border-zinc-200/80">
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Employee & Branch</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Movement & Return Time</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Overdue & Fine</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Status</TableHead>
                                                <TableHead className="text-right text-zinc-600 text-xs font-semibold">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!unpaidPenalties?.data || unpaidPenalties.data.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500 text-xs">
                                                        No unpaid/locked penalties found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                unpaidPenalties.data.map((item) => (
                                                    <TableRow key={item.id} className="border-zinc-100 hover:bg-zinc-50/60">
                                                        <TableCell className="font-medium text-zinc-900">
                                                            <div>
                                                                <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                    ID: {item.employee?.employee_id || 'N/A'}{' '}
                                                                    {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-700 text-xs">
                                                            <p className="font-semibold text-zinc-900">
                                                                #{item.movement?.id} - {item.movement?.purpose || 'N/A'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                Start: {formatDateTime(item.movement?.from_datetime)}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-900">
                                                            <p className="text-xs text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</p>
                                                            <p className="text-sm font-black text-rose-600 mt-0.5">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setApprovingPenalty(item)}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 rounded-lg"
                                                            >
                                                                <Unlock className="w-3.5 h-3.5 mr-1" /> Waive Fine (Unlock)
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {renderPagination(unpaidPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: PAID PENALTIES */}
                    <TabsContent value="paid" className="mt-0 space-y-4">
                        {/* Paid Stats Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Filtered Paid Fine Count</p>
                                    <p className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">{paidStats?.count || 0} Records</p>
                                </div>
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Paid Fine Collection</p>
                                    <p className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">৳ {Number(paidStats?.total_amount || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Overdue Days Paid</p>
                                    <p className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">{paidStats?.total_overdue_days || 0} Days</p>
                                </div>
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <Card className="bg-white border-zinc-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-100 py-3.5 px-4 sm:px-6 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                                        Verified Paid Penalty Statement
                                    </CardTitle>
                                    <CardDescription className="text-[11px] sm:text-xs text-zinc-500">
                                        History of all verified bKash/Nagad penalty payments and approved account unlocks.
                                    </CardDescription>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handlePrintPaidReport}
                                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-8 px-3.5 font-semibold rounded-xl shadow-sm"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Statement
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* MOBILE CARDS VIEW */}
                                <div className="block md:hidden divide-y divide-zinc-100">
                                    {!paidPenalties?.data || paidPenalties.data.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs">No approved paid penalty records found.</div>
                                    ) : (
                                        paidPenalties.data.map((item) => (
                                            <div key={item.id} className="p-4 space-y-2 bg-white">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                        <p className="text-[11px] text-zinc-500">
                                                            ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `• ${item.employee.branch.name}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="font-black text-emerald-600 text-xs">৳ {Number(item.total_fine).toFixed(2)}</span>
                                                </div>

                                                <div className="bg-zinc-50 p-2 rounded-lg text-[11px] space-y-0.5">
                                                    <p className="font-semibold text-zinc-900">
                                                        Movement #{item.movement?.id}: {item.movement?.purpose || 'N/A'}
                                                    </p>
                                                    <p className="text-zinc-500">Return: {formatDateTime(item.movement?.actual_return_datetime)}</p>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                                                    <span className="font-mono font-bold text-zinc-900">
                                                        Sender: {item.sender_number || item.transaction_id || 'N/A'} ({item.payment_method?.toUpperCase() || '-'})
                                                    </span>
                                                    <span>By {item.approver?.name || 'Admin'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <Table className="w-full">
                                        <TableHeader className="bg-zinc-50/80">
                                            <TableRow className="border-zinc-200/80">
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Employee & Branch</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Movement & Return Time</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Fine Amount</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Sender Mobile & Method</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Approved By</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!paidPenalties?.data || paidPenalties.data.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500 text-xs">
                                                        No approved paid penalty records found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paidPenalties.data.map((item) => (
                                                    <TableRow key={item.id} className="border-zinc-100 hover:bg-zinc-50/60">
                                                        <TableCell className="font-medium text-zinc-900">
                                                            <div>
                                                                <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                                <p className="text-[11px] text-zinc-500">
                                                                    ID: {item.employee?.employee_id || 'N/A'}{' '}
                                                                    {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-700 text-xs">
                                                            <p className="font-semibold text-zinc-900">
                                                                #{item.movement?.id} - {item.movement?.purpose || 'N/A'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500">
                                                                Start: {formatDateTime(item.movement?.from_datetime)}
                                                            </p>
                                                            {item.movement?.actual_return_datetime && (
                                                                <p className="text-[11px] text-emerald-700 font-medium">
                                                                    Return: {formatDateTime(item.movement.actual_return_datetime)}
                                                                </p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-zinc-900">
                                                            <p className="text-sm font-black text-emerald-600">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-800 text-xs">
                                                            <span className="font-mono font-bold text-zinc-900">
                                                                {item.sender_number || item.transaction_id || 'N/A'}
                                                            </span>
                                                            <p className="text-zinc-500 text-[11px] uppercase">{item.payment_method || '-'}</p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-600 text-xs">
                                                            <p className="font-semibold text-zinc-800">{item.approver?.name || 'Admin'}</p>
                                                            <p className="text-[11px] text-zinc-500">{item.admin_remarks || 'Verified'}</p>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {renderPagination(paidPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: WAIVED PENALTIES */}
                    <TabsContent value="waived" className="mt-0 space-y-4">
                        {/* Waived Stats Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-indigo-50/80 border border-indigo-200/70 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Filtered Waived Count</p>
                                    <p className="text-lg sm:text-xl font-black text-indigo-950 mt-0.5">{waivedStats?.count || 0} Records</p>
                                </div>
                                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                                    <ShieldOff className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-indigo-50/80 border border-indigo-200/70 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Total Waived Fine Amount</p>
                                    <p className="text-lg sm:text-xl font-black text-indigo-950 mt-0.5">৳ {Number(waivedStats?.total_amount || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-indigo-50/80 border border-indigo-200/70 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Total Overdue Days Waived</p>
                                    <p className="text-lg sm:text-xl font-black text-indigo-950 mt-0.5">{waivedStats?.total_overdue_days || 0} Days</p>
                                </div>
                                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <Card className="bg-white border-zinc-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-100 py-3.5 px-4 sm:px-6">
                                <CardTitle className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center">
                                    <ShieldOff className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" />
                                    Waived Fine Log (Unlocked Without Payment)
                                </CardTitle>
                                <CardDescription className="text-[11px] sm:text-xs text-zinc-500">
                                    History of penalties manually waived by Admin without requiring employee payment.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* MOBILE CARDS VIEW */}
                                <div className="block md:hidden divide-y divide-zinc-100">
                                    {!waivedPenalties?.data || waivedPenalties.data.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs">No waived penalty records found.</div>
                                    ) : (
                                        waivedPenalties.data.map((item) => (
                                            <div key={item.id} className="p-4 space-y-2 bg-white">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                        <p className="text-[11px] text-zinc-500">
                                                            ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `• ${item.employee.branch.name}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="font-black text-indigo-600 text-xs">৳ {Number(item.total_fine).toFixed(2)}</span>
                                                </div>

                                                <div className="bg-zinc-50 p-2 rounded-lg text-[11px] space-y-0.5">
                                                    <p className="font-semibold text-zinc-900">
                                                        Movement #{item.movement?.id}: {item.movement?.purpose || 'N/A'}
                                                    </p>
                                                    <p className="text-zinc-500">Start: {formatDateTime(item.movement?.from_datetime)}</p>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                                                    <span>{item.overdue_days} Day(s) Waived</span>
                                                    <span>By {item.approver?.name || 'Admin'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <Table className="w-full">
                                        <TableHeader className="bg-zinc-50/80">
                                            <TableRow className="border-zinc-200/80">
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Employee & Branch</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Movement & Purpose</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Waived Fine Amount</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Waived By & Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!waivedPenalties?.data || waivedPenalties.data.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-zinc-500 text-xs">
                                                        No waived penalty records found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                waivedPenalties.data.map((item) => (
                                                    <TableRow key={item.id} className="border-zinc-100 hover:bg-zinc-50/60">
                                                        <TableCell className="font-medium text-zinc-900">
                                                            <div>
                                                                <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                                <p className="text-[11px] text-zinc-500">
                                                                    ID: {item.employee?.employee_id || 'N/A'}{' '}
                                                                    {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-700 text-xs">
                                                            <p className="font-semibold text-zinc-900">
                                                                #{item.movement?.id} - {item.movement?.purpose || 'N/A'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500">
                                                                Start: {formatDateTime(item.movement?.from_datetime)}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-900">
                                                            <p className="text-xs text-indigo-700 font-semibold">{item.overdue_days} Day(s) Waived</p>
                                                            <p className="text-sm font-black text-indigo-600 mt-0.5">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-600 text-xs">
                                                            <p className="font-semibold text-zinc-800">{item.approver?.name || 'Admin'}</p>
                                                            <p className="text-[11px] text-zinc-500">{item.admin_remarks || 'Waived by Admin'}</p>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {renderPagination(waivedPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB REJECTED: REJECTED SUBMISSIONS */}
                    <TabsContent value="rejected" className="mt-0">
                        <Card className="bg-white border-zinc-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-100 py-3.5 px-4 sm:px-6">
                                <CardTitle className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center">
                                    <X className="w-4 h-4 text-rose-600 mr-2 flex-shrink-0" />
                                    Rejected Payment Submissions List
                                </CardTitle>
                                <CardDescription className="text-[11px] sm:text-xs text-zinc-500">
                                    Penalties where payment submission was rejected by Admin. Employees can resubmit payment or Admin can waive the fine.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* MOBILE CARDS VIEW */}
                                <div className="block md:hidden divide-y divide-zinc-100">
                                    {!rejectedPenalties?.data || rejectedPenalties.data.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs">
                                            No rejected payment submissions found.
                                        </div>
                                    ) : (
                                        rejectedPenalties.data.map((item) => (
                                            <div key={item.id} className="p-4 space-y-3 bg-white">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                        <p className="text-[11px] text-zinc-500 mt-0.5">
                                                            ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `• ${item.employee.branch.name}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-md border border-rose-200/60">
                                                        ৳ {Number(item.total_fine).toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="bg-rose-50/50 p-2.5 rounded-xl space-y-1 text-[11px] border border-rose-100">
                                                    <p className="font-semibold text-rose-900">Reason: {item.admin_remarks || 'Payment info rejected'}</p>
                                                    <p className="text-zinc-600 font-mono">
                                                        Sender: {item.sender_number || item.transaction_id || 'N/A'} ({item.payment_method?.toUpperCase() || '-'})
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-[11px] text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</span>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setApprovingPenalty(item)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 px-3 rounded-lg"
                                                    >
                                                        <Unlock className="w-3 h-3 mr-1" /> Waive Fine
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <Table className="w-full">
                                        <TableHeader className="bg-zinc-50/80">
                                            <TableRow className="border-zinc-200/80">
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Employee & Branch</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Movement & Purpose</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Fine Amount</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Submitted Mobile / Trx ID</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Rejection Reason</TableHead>
                                                <TableHead className="text-right text-zinc-600 text-xs font-semibold">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!rejectedPenalties?.data || rejectedPenalties.data.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500 text-xs">
                                                        No rejected payment submissions found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rejectedPenalties.data.map((item) => (
                                                    <TableRow key={item.id} className="border-zinc-100 hover:bg-zinc-50/60">
                                                        <TableCell className="font-medium text-zinc-900">
                                                            <div>
                                                                <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                    ID: {item.employee?.employee_id || 'N/A'}{' '}
                                                                    {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-700 text-xs">
                                                            <p className="font-semibold text-zinc-900">
                                                                #{item.movement?.id} - {item.movement?.purpose || 'N/A'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                Start: {formatDateTime(item.movement?.from_datetime)}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-900">
                                                            <p className="text-xs text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</p>
                                                            <p className="text-sm font-black text-rose-600 mt-0.5">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-800 text-xs">
                                                            <span className="font-mono font-bold text-zinc-900">
                                                                {item.sender_number || item.transaction_id || 'N/A'}
                                                            </span>
                                                            <p className="text-zinc-500 text-[11px] uppercase">{item.payment_method || '-'}</p>
                                                        </TableCell>
                                                        <TableCell className="text-rose-700 text-xs font-medium">
                                                            {item.admin_remarks || 'Payment info rejected'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setApprovingPenalty(item)}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 rounded-lg"
                                                            >
                                                                <Unlock className="w-3.5 h-3.5 mr-1" /> Waive Fine
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {renderPagination(rejectedPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 4: ALL PENALTIES LIST */}
                    <TabsContent value="all" className="mt-0">
                        <Card className="bg-white border-zinc-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-100 py-3.5 px-4 sm:px-6">
                                <CardTitle className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center">
                                    <ListFilter className="w-4 h-4 text-zinc-700 mr-2 flex-shrink-0" />
                                    All Overdue Movement Penalty Logs
                                </CardTitle>
                                <CardDescription className="text-[11px] sm:text-xs text-zinc-500">
                                    Complete log of all unclosed movements, calculated fines, and status history.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* MOBILE CARDS VIEW */}
                                <div className="block md:hidden divide-y divide-zinc-100">
                                    {!allPenalties?.data || allPenalties.data.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs">No movement penalty records found.</div>
                                    ) : (
                                        allPenalties.data.map((item) => (
                                            <div key={item.id} className="p-4 space-y-3 bg-white">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                        <p className="text-[11px] text-zinc-500">
                                                            ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `• ${item.employee.branch.name}` : ''}
                                                        </p>
                                                    </div>
                                                    <div>{getStatusBadge(item.status)}</div>
                                                </div>

                                                <div className="bg-zinc-50 p-2.5 rounded-xl space-y-1 text-[11px] border border-zinc-100">
                                                    <p className="font-semibold text-zinc-900">
                                                        Movement #{item.movement?.id}: {item.movement?.purpose || 'N/A'}
                                                    </p>
                                                    <p className="text-zinc-500">Start: {formatDateTime(item.movement?.from_datetime)}</p>
                                                    {item.movement?.actual_return_datetime && (
                                                        <p className="text-emerald-700 font-medium">Return: {formatDateTime(item.movement?.actual_return_datetime)}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <div>
                                                        <p className="text-[11px] text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</p>
                                                        <p className="text-xs font-black text-rose-600">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                    </div>

                                                    <div>
                                                        {item.status === 'pending_verification' ? (
                                                            <div className="flex items-center space-x-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setApprovingPenalty(item)}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 rounded-lg"
                                                                >
                                                                    <Unlock className="w-3 h-3 mr-1" /> Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => setRejectingPenalty(item)}
                                                                    className="text-[11px] h-7 px-2 rounded-lg"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (item.status === 'unpaid' || item.status === 'rejected') ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setApprovingPenalty(item)}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 px-2.5 rounded-lg"
                                                            >
                                                                <Unlock className="w-3 h-3 mr-1" /> Waive Fine
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[11px] text-zinc-500">{item.approver ? `By ${item.approver.name}` : '-'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden md:block overflow-x-auto w-full">
                                    <Table className="w-full">
                                        <TableHeader className="bg-zinc-50/80">
                                            <TableRow className="border-zinc-200/80">
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Employee & Branch</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Movement & Return Time</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Overdue & Fine</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Sender Mobile & Method</TableHead>
                                                <TableHead className="text-zinc-600 text-xs font-semibold">Status</TableHead>
                                                <TableHead className="text-right text-zinc-600 text-xs font-semibold">Actions / Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!allPenalties?.data || allPenalties.data.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500 text-xs">
                                                        No movement penalty records found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                allPenalties.data.map((item) => (
                                                    <TableRow key={item.id} className="border-zinc-100 hover:bg-zinc-50/60">
                                                        <TableCell className="font-medium text-zinc-900">
                                                            <div>
                                                                <p className="font-bold text-zinc-900 text-xs">{getEmployeeName(item.employee)}</p>
                                                                <p className="text-[11px] text-zinc-500">
                                                                    ID: {item.employee?.employee_id || 'N/A'}{' '}
                                                                    {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-700 text-xs">
                                                            <p className="font-semibold text-zinc-900">
                                                                #{item.movement?.id} - {item.movement?.purpose || 'N/A'}
                                                            </p>
                                                            <p className="text-zinc-500 text-[11px]">Start: {formatDateTime(item.movement?.from_datetime)}</p>
                                                            {item.movement?.actual_return_datetime && (
                                                                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                                                    Return: {formatDateTime(item.movement.actual_return_datetime)}
                                                                </p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-zinc-900">
                                                            <p className="text-xs text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</p>
                                                            <p className="text-sm font-black text-rose-600 mt-0.5">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                        </TableCell>
                                                        <TableCell className="text-zinc-800 text-xs">
                                                            {item.sender_number || item.transaction_id ? (
                                                                <div>
                                                                    <span className="font-mono font-bold text-zinc-900">
                                                                        {item.sender_number || item.transaction_id}
                                                                    </span>
                                                                    <p className="text-zinc-500 text-[11px] uppercase">{item.payment_method || '-'}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-zinc-400 italic">No Payment Info</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {item.status === 'pending_verification' ? (
                                                                <div className="flex items-center justify-end space-x-1.5">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => setApprovingPenalty(item)}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 rounded-lg"
                                                                    >
                                                                        <Unlock className="w-3 h-3 mr-1" /> Approve & Unlock
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => setRejectingPenalty(item)}
                                                                        className="text-[11px] h-7 px-2.5 rounded-lg"
                                                                    >
                                                                        <X className="w-3 h-3 mr-1" /> Reject
                                                                    </Button>
                                                                </div>
                                                            ) : (item.status === 'unpaid' || item.status === 'rejected') ? (
                                                                <div className="flex items-center justify-end">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => setApprovingPenalty(item)}
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 px-2.5 rounded-lg"
                                                                    >
                                                                        <Unlock className="w-3 h-3 mr-1" /> Waive Fine (Unlock)
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-zinc-500">
                                                                    {item.approver ? `By ${item.approver.name}` : item.admin_remarks || '-'}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {renderPagination(allPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </PageSurface>

            {/* PRINTABLE PAID REPORT SECTION (A4 PORTRAIT MODE) */}
            <div id="printable-paid-report" className="hidden print:block p-6 bg-white text-black space-y-4">
                <div className="text-center border-b pb-4 mb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wider">Overdue Movement Penalty Paid Statement</h1>
                    <p className="text-xs text-gray-600 mt-1">HR & Movement Attendance Management System</p>
                    <div className="flex justify-between items-center text-[11px] text-gray-600 mt-3 pt-2 border-t">
                        <span>
                            <strong>Branch Filter:</strong> {selectedBranchName}
                        </span>
                        <span>
                            <strong>Date Range:</strong> {startDate || 'Start Date'} to {endDate || 'Today'}
                        </span>
                        <span>
                            <strong>Print Date:</strong> {new Date().toLocaleString('en-GB')}
                        </span>
                    </div>
                </div>

                {/* Summary Box */}
                <div className="grid grid-cols-3 gap-4 border border-gray-300 p-3 rounded text-center text-xs font-semibold bg-gray-50 mb-4">
                    <div>
                        <span className="text-gray-500 block text-[10px]">TOTAL PAID RECORDS</span>
                        <span className="text-base font-bold text-black">{paidStats?.count || 0}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-[10px]">TOTAL COLLECTION AMOUNT</span>
                        <span className="text-base font-bold text-black">{Math.round(Number(paidStats?.total_amount || 0)).toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-[10px]">TOTAL OVERDUE DAYS</span>
                        <span className="text-base font-bold text-black">{paidStats?.total_overdue_days || 0} Days</span>
                    </div>
                </div>

                {/* Table List (Strict 1 Line Per Row for A4 Portrait) */}
                <table className="w-full text-[10px] border-collapse border border-gray-400 table-fixed">
                    <colgroup>
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '26%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                        <tr className="bg-gray-200 border-b border-gray-400 font-bold text-left">
                            <th className="p-1 border border-gray-400 text-center">#</th>
                            <th className="p-1 border border-gray-400">Employee Name (ID)</th>
                            <th className="p-1 border border-gray-400">Branch</th>
                            <th className="p-1 border border-gray-400 text-center">Movement ID</th>
                            <th className="p-1 border border-gray-400">Overdue</th>
                            <th className="p-1 border border-gray-400">Sender Mobile</th>
                            <th className="p-1 border border-gray-400 text-right">Fine</th>
                            <th className="p-1 border border-gray-400">Approved</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!paidPenalties?.data || paidPenalties.data.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-3 text-center text-gray-500">
                                    No paid penalty records found for this filter.
                                </td>
                            </tr>
                        ) : (
                            paidPenalties.data.map((item, idx) => (
                                <tr key={item.id} className="border-b border-gray-300">
                                    <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                                    <td
                                        className="p-1 border border-gray-300 font-bold truncate"
                                        title={`${getEmployeeName(item.employee)} (${item.employee?.employee_id || 'N/A'})`}
                                    >
                                        {getEmployeeName(item.employee)} ({item.employee?.employee_id || 'N/A'})
                                    </td>
                                    <td className="p-1 border border-gray-300 truncate" title={item.employee?.branch?.name || 'Main Office'}>
                                        {item.employee?.branch?.name || 'Main Office'}
                                    </td>
                                    <td className="p-1 border border-gray-300 text-center font-mono font-medium">
                                        #{item.movement?.id || item.movement_id || 'N/A'}
                                    </td>
                                    <td className="p-1 border border-gray-300 whitespace-nowrap">{item.overdue_days} Day(s)</td>
                                    <td className="p-1 border border-gray-300 font-mono font-bold whitespace-nowrap">
                                        {item.sender_number || item.transaction_id || 'N/A'} ({item.payment_method?.toUpperCase() || '-'})
                                    </td>
                                    <td className="p-1 border border-gray-300 text-right font-bold whitespace-nowrap">
                                        {Math.round(Number(item.total_fine || 0)).toLocaleString()}
                                    </td>
                                    <td className="p-1 border border-gray-300 truncate" title={item.approver?.name || 'Admin'}>
                                        {item.approver?.name || 'Admin'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 font-extrabold text-xs">
                            <td colSpan={6} className="p-2 border border-gray-400 text-right font-bold text-xs uppercase tracking-wider text-black">
                                Total Collection:
                            </td>
                            <td className="p-2 border border-gray-400 text-right font-black text-xs text-black whitespace-nowrap">
                                {Math.round(Number(paidStats?.total_amount || 0)).toLocaleString()}
                            </td>
                            <td className="p-2 border border-gray-400"></td>
                        </tr>
                    </tfoot>
                </table>

                {/* Signatures */}
                <div className="flex justify-between items-end pt-16 text-xs text-gray-800 font-semibold">
                    <div className="text-center border-t border-gray-500 pt-1 w-36">Prepared By</div>
                    <div className="text-center border-t border-gray-500 pt-1 w-36">Accounts / Audit</div>
                    <div className="text-center border-t border-gray-500 pt-1 w-36">Authorized Signature</div>
                </div>
            </div>

            {/* APPROVAL MODAL */}
            <Dialog open={!!approvingPenalty} onOpenChange={(open) => !open && setApprovingPenalty(null)}>
                <DialogContent className="bg-white border-zinc-200 text-zinc-900 max-w-md w-full p-4 sm:p-6 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-emerald-700 flex items-center">
                            <Unlock className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>
                                {approvingPenalty?.status === 'unpaid' || approvingPenalty?.status === 'rejected'
                                    ? 'Waive Fine & Unlock Account (Without Payment)'
                                    : 'Approve Payment & Unlock Account'}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-600 text-xs">
                            {approvingPenalty?.status === 'unpaid' || approvingPenalty?.status === 'rejected' ? (
                                <span>
                                    You are manually waiving the fine for{' '}
                                    <strong className="text-zinc-900">{getEmployeeName(approvingPenalty?.employee)}</strong> without payment. Approving will immediately unlock their ID.
                                </span>
                            ) : (
                                <span>
                                    Confirm that you have verified Sender Mobile Number:{' '}
                                    <strong className="font-mono text-zinc-900">
                                        {approvingPenalty?.sender_number || approvingPenalty?.transaction_id || 'N/A'}
                                    </strong>
                                    . Approving will mark payment as verified and immediately unlock the employee's ID.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApproveSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-zinc-700">Admin Remarks (Optional)</Label>
                            <Input
                                value={approveData.admin_remarks}
                                onChange={(e) => setApproveData('admin_remarks', e.target.value)}
                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                placeholder={
                                    approvingPenalty?.status === 'unpaid' || approvingPenalty?.status === 'rejected'
                                        ? 'e.g. Fine waived by HR admin...'
                                        : 'e.g. Payment verified via Sender Mobile Number...'
                                }
                            />
                        </div>

                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setApprovingPenalty(null)}
                                className="border-zinc-300 text-zinc-700 w-full sm:w-auto rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={approveProcessing}
                                className={
                                    approvingPenalty?.status === 'unpaid' || approvingPenalty?.status === 'rejected'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto rounded-xl'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto rounded-xl'
                                }
                            >
                                {approveProcessing
                                    ? 'Processing...'
                                    : approvingPenalty?.status === 'unpaid' || approvingPenalty?.status === 'rejected'
                                    ? 'Waive Fine & Unlock'
                                    : 'Approve Payment & Unlock'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* REJECTION MODAL */}
            <Dialog open={!!rejectingPenalty} onOpenChange={(open) => !open && setRejectingPenalty(null)}>
                <DialogContent className="bg-white border-zinc-200 text-zinc-900 max-w-md w-full p-4 sm:p-6 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-rose-700 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" /> Rejection Confirmation
                        </DialogTitle>
                        <DialogDescription className="text-zinc-600 text-xs">
                            Provide a reason for rejection so the employee can resubmit correct payment information.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRejectSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-zinc-700">Rejection Reason (Required)</Label>
                            <Textarea
                                placeholder="e.g. Money not received from sender mobile number..."
                                value={rejectData.admin_remarks}
                                onChange={(e) => setRejectData('admin_remarks', e.target.value)}
                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                required
                            />
                        </div>

                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRejectingPenalty(null)}
                                className="border-zinc-300 text-zinc-700 w-full sm:w-auto rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={rejectProcessing} variant="destructive" className="w-full sm:w-auto rounded-xl">
                                {rejectProcessing ? 'Rejecting...' : 'Reject Submission'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
