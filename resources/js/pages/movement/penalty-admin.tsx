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
import { Check, X, Search, ShieldCheck, Clock, AlertTriangle, Filter, Lock, Unlock, CheckCircle2, ListFilter, DollarSign, ChevronLeft, ChevronRight, Calendar, Building2, Phone, Printer, RefreshCw, ShieldOff } from 'lucide-react';

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
        first_name: string;
        last_name: string;
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

export default function PenaltyAdmin({ pendingPenalties, paidPenalties, waivedPenalties, allPenalties, branches, stats, paidStats, waivedStats, tab = 'pending', filters }: Props) {
    const [activeTab, setActiveTab] = useState<string>(filters.tab || (stats.pending_count > 0 ? 'pending' : 'all'));
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [branchFilter, setBranchFilter] = useState(filters.branch_id || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [perPage, setPerPage] = useState(String(filters.per_page || 15));

    const [rejectingPenalty, setRejectingPenalty] = useState<PenaltyRecord | null>(null);
    const [approvingPenalty, setApprovingPenalty] = useState<PenaltyRecord | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncPenalties = () => {
        setIsSyncing(true);
        router.post(route('movement-penalties.sync'), {}, {
            onFinish: () => setIsSyncing(false),
        });
    };

    const { data: rejectData, setData: setRejectData, post: postReject, processing: rejectProcessing, reset: resetReject } = useForm({
        admin_remarks: '',
    });

    const { data: approveData, setData: setApproveData, post: postApprove, processing: approveProcessing, reset: resetApprove } = useForm({
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

    const handleFilter = (tabName = activeTab, perPageValue = perPage) => {
        router.get(
            route('movement-penalties.index'),
            {
                tab: tabName,
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
                return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">Approved & Unlocked</Badge>;
            case 'pending_verification':
                return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-semibold">Pending Verification</Badge>;
            case 'rejected':
                return <Badge className="bg-rose-100 text-rose-800 border border-rose-300 font-semibold">Rejected</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-700 border border-slate-300 font-semibold">Unpaid / Locked</Badge>;
        }
    };

    const renderPagination = (paginated?: PaginatedPenalties) => {
        if (!paginated?.meta || paginated.meta.total <= 0) return null;

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs">
                <div className="flex items-center space-x-4 text-zinc-500">
                    <div className="flex items-center space-x-1.5">
                        <span>Rows per page:</span>
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
                        Showing <span className="font-semibold text-zinc-800">{paginated.meta.from || 0}</span> to{' '}
                        <span className="font-semibold text-zinc-800">{paginated.meta.to || 0}</span> of{' '}
                        <span className="font-semibold text-zinc-800">{paginated.meta.total}</span> entries
                    </span>
                </div>

                {paginated.meta.last_page > 1 && (
                    <div className="flex items-center space-x-1">
                        {paginated.links?.prev && (
                            <Link
                                href={paginated.links.prev}
                                preserveState
                                className="p-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Link>
                        )}

                        {paginated.meta.links?.slice(1, -1).map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                preserveState
                                className={`px-2.5 py-1 rounded text-xs font-semibold ${
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
                                className="p-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const selectedBranchName = branches?.find(b => String(b.id) === branchFilter)?.name || 'All Branches';

    return (
        <Layout>
            <Head title="Movement Penalties Verification" />

            {/* PRINT CSS */}
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
                        margin-top: 0 !important;
                        padding-top: 0 !important;
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
                }
            `}</style>

            {/* SCREEN CONTENT VIEW */}
            <PageSurface className="w-full max-w-none space-y-6 bg-zinc-50/50 p-4 sm:p-6 md:p-8 print:hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center">
                            <ShieldCheck className="w-6 h-6 text-emerald-600 mr-2" />
                            Movement Overdue Penalties Verification
                        </h1>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Review overdue movement fines (20 BDT/day), verify Sender Mobile Numbers, and approve ID unlocks.
                        </p>
                    </div>

                    <Button
                        size="sm"
                        onClick={handleSyncPenalties}
                        disabled={isSyncing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing Penalties...' : 'Sync Overdue Penalties'}
                    </Button>
                </div>

                {/* Top Summary Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white border-zinc-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">Pending Verifications</p>
                                <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.pending_count}</p>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <Clock className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">Paid Penalties</p>
                                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.paid_count ?? stats.approved_count}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">Waived Penalties</p>
                                <p className="text-2xl font-extrabold text-indigo-600 mt-1">{stats.waived_count ?? 0}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <ShieldOff className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-zinc-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium">Total Fine Amount</p>
                                <p className="text-2xl font-extrabold text-zinc-900 mt-1">৳ {Number(stats.total_fine_amount).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* FILTER BAR: SEARCH, BRANCH, DATE RANGE */}
                <Card className="bg-white border-zinc-200 shadow-sm p-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                        {/* Search Input */}
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-zinc-600">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                                <Input
                                    placeholder="Search Sender Mobile, Employee..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                    className="pl-8 bg-white border-zinc-200 text-zinc-900 text-xs h-9"
                                />
                            </div>
                        </div>

                        {/* Branch Filter */}
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-zinc-600">Branch</Label>
                            <Select value={branchFilter} onValueChange={(val) => setBranchFilter(val)}>
                                <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 h-9 text-xs">
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-zinc-200">
                                    <SelectItem value="all">All Branches</SelectItem>
                                    {branches?.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date From */}
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-zinc-600">Date From</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white border-zinc-200 text-zinc-900 text-xs h-9"
                            />
                        </div>

                        {/* Date To */}
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-zinc-600">Date To</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white border-zinc-200 text-zinc-900 text-xs h-9"
                            />
                        </div>

                        {/* Filter Button */}
                        <div className="flex items-center space-x-2">
                            <Button size="sm" onClick={() => handleFilter()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-semibold">
                                <Filter className="w-3.5 h-3.5 mr-1" /> Apply Filters
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* TABS WITHOUT SERIAL NUMBERS */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-zinc-200 shadow-sm">
                        <TabsList className="bg-zinc-100 p-1 rounded-lg">
                            <TabsTrigger value="pending" className="text-xs font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
                                Pending Submissions
                                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold">
                                    {stats.pending_count}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger value="paid" className="text-xs font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                                Paid Penalties
                                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
                                    {stats.paid_count ?? stats.approved_count}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger value="waived" className="text-xs font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <ShieldOff className="w-4 h-4 mr-1.5 text-indigo-600" />
                                Waived Penalties
                                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-bold">
                                    {stats.waived_count ?? 0}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger value="all" className="text-xs font-semibold px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <ListFilter className="w-4 h-4 mr-1.5 text-zinc-600" />
                                All Overdue Penalties
                                <span className="ml-2 px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded-full text-[11px] font-bold">
                                    {stats.total_count}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === 'all' && (
                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); handleFilter('all'); }}>
                                <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 h-9 text-xs w-36">
                                    <SelectValue placeholder="Status" />
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

                    {/* TAB: PENDING VERIFICATION APPROVALS */}
                    <TabsContent value="pending" className="mt-0">
                        <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-bold text-zinc-900 flex items-center">
                                    <Clock className="w-4 h-4 text-amber-600 mr-2" /> Pending Payment Submissions (Awaiting Verification)
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">
                                    Employees who have submitted Sender Mobile Numbers and movement return times. Verify payment and unlock ID.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-zinc-50">
                                        <TableRow className="border-zinc-200">
                                            <TableHead className="text-zinc-600 text-xs">Employee & Branch</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Movement & Return Time</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Overdue & Fine</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Payment Method & Sender Mobile</TableHead>
                                            <TableHead className="text-right text-zinc-600 text-xs">Actions</TableHead>
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
                                                            <p className="font-bold text-zinc-900 text-xs">
                                                                {item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500">
                                                                ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-700 text-xs">
                                                        <p className="font-semibold text-zinc-900">#{item.movement?.id} - {item.movement?.purpose || 'N/A'}</p>
                                                        <p className="text-[11px] text-zinc-500">
                                                            Start: {formatDateTime(item.movement?.from_datetime)}
                                                        </p>
                                                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                                            Return: {formatDateTime(item.movement?.actual_return_datetime)}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-900">
                                                        <p className="text-xs text-amber-700 font-semibold">{item.overdue_days} Day(s) Overdue</p>
                                                        <p className="text-sm font-black text-rose-600 mt-0.5">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-800 text-xs">
                                                        <div className="space-y-0.5">
                                                            <span className={`uppercase px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                                                item.payment_method === 'bkash'
                                                                    ? 'bg-pink-100 text-pink-800 border border-pink-200'
                                                                    : 'bg-orange-100 text-orange-800 border border-orange-200'
                                                            }`}>
                                                                {item.payment_method}
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
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                                                            >
                                                                <Unlock className="w-3.5 h-3.5 mr-1" /> Approve & Unlock
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => setRejectingPenalty(item)}
                                                                className="text-xs h-8 px-3"
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

                                {renderPagination(pendingPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB: PAID PENALTIES */}
                    <TabsContent value="paid" className="mt-0 space-y-4">
                        {/* Paid Summary Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Filtered Paid Fine Count</p>
                                    <p className="text-xl font-extrabold text-emerald-950 mt-0.5">{paidStats?.count || 0} Records</p>
                                </div>
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Paid Fine Collected</p>
                                    <p className="text-xl font-extrabold text-emerald-950 mt-0.5">৳ {Number(paidStats?.total_amount || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Overdue Days Paid</p>
                                    <p className="text-xl font-extrabold text-emerald-950 mt-0.5">{paidStats?.total_overdue_days || 0} Days</p>
                                </div>
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-zinc-100 py-3 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold text-zinc-900 flex items-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" /> Paid Penalty Records
                                    </CardTitle>
                                    <CardDescription className="text-xs text-zinc-500">
                                        History of all verified bKash/Nagad penalty payments and approved account unlocks.
                                    </CardDescription>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handlePrintPaidReport}
                                    className="bg-zinc-800 hover:bg-zinc-900 text-white text-xs h-8 px-3 font-semibold shadow-sm"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Statement
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-zinc-50">
                                        <TableRow className="border-zinc-200">
                                            <TableHead className="text-zinc-600 text-xs">Employee & Branch</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Movement & Return Time</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Fine Amount</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Sender Mobile & Method</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Approved By</TableHead>
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
                                                            <p className="font-bold text-zinc-900 text-xs">
                                                                {item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500">
                                                                ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-700 text-xs">
                                                        <p className="font-semibold text-zinc-900">#{item.movement?.id} - {item.movement?.purpose || 'N/A'}</p>
                                                        <p className="text-[11px] text-zinc-500">
                                                            Start: {formatDateTime(item.movement?.from_datetime)}
                                                        </p>
                                                        {item.movement?.actual_return_datetime && (
                                                            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                                                Return: {formatDateTime(item.movement.actual_return_datetime)}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-zinc-900">
                                                        <p className="text-sm font-black text-emerald-600">৳ {Number(item.total_fine).toFixed(2)}</p>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-800 text-xs">
                                                        <span className="font-mono font-bold text-zinc-900">{item.sender_number || item.transaction_id || 'N/A'}</span>
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

                                {renderPagination(paidPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB: WAIVED PENALTIES */}
                    <TabsContent value="waived" className="mt-0 space-y-4">
                        {/* Waived Summary Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Filtered Waived Fine Count</p>
                                    <p className="text-xl font-extrabold text-indigo-950 mt-0.5">{waivedStats?.count || 0} Records</p>
                                </div>
                                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                                    <ShieldOff className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Total Waived Fine Amount</p>
                                    <p className="text-xl font-extrabold text-indigo-950 mt-0.5">৳ {Number(waivedStats?.total_amount || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Total Overdue Days Waived</p>
                                    <p className="text-xl font-extrabold text-indigo-950 mt-0.5">{waivedStats?.total_overdue_days || 0} Days</p>
                                </div>
                                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-bold text-zinc-900 flex items-center">
                                    <ShieldOff className="w-4 h-4 text-indigo-600 mr-2" /> Waived Fine Records (Unlocked Without Payment)
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">
                                    History of penalties manually waived by Admin without requiring employee payment.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-zinc-50">
                                        <TableRow className="border-zinc-200">
                                            <TableHead className="text-zinc-600 text-xs">Employee & Branch</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Movement & Purpose</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Waived Fine Amount</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Waived By & Remarks</TableHead>
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
                                                            <p className="font-bold text-zinc-900 text-xs">
                                                                {item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500">
                                                                ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-700 text-xs">
                                                        <p className="font-semibold text-zinc-900">#{item.movement?.id} - {item.movement?.purpose || 'N/A'}</p>
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

                                {renderPagination(waivedPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB: ALL PENALTIES LIST */}
                    <TabsContent value="all" className="mt-0">
                        <Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-zinc-100 py-3">
                                <CardTitle className="text-sm font-bold text-zinc-900 flex items-center">
                                    <ListFilter className="w-4 h-4 text-zinc-700 mr-2" /> All Overdue Movement Penalties
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">
                                    Complete log of all unclosed movements, calculated fines, and status history.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-zinc-50">
                                        <TableRow className="border-zinc-200">
                                            <TableHead className="text-zinc-600 text-xs">Employee & Branch</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Movement & Return Time</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Overdue & Fine</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Sender Mobile & Method</TableHead>
                                            <TableHead className="text-zinc-600 text-xs">Status</TableHead>
                                            <TableHead className="text-right text-zinc-600 text-xs">Actions / Remarks</TableHead>
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
                                                            <p className="font-bold text-zinc-900 text-xs">
                                                                {item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown'}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-500">
                                                                ID: {item.employee?.employee_id || 'N/A'} {item.employee?.branch?.name ? `| ${item.employee.branch.name}` : ''}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-700 text-xs">
                                                        <p className="font-semibold text-zinc-900">#{item.movement?.id} - {item.movement?.purpose || 'N/A'}</p>
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
                                                                <span className="font-mono font-bold text-zinc-900">{item.sender_number || item.transaction_id}</span>
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
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5"
                                                                >
                                                                    <Unlock className="w-3 h-3 mr-1" /> Approve & Unlock
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => setRejectingPenalty(item)}
                                                                    className="text-[11px] h-7 px-2.5"
                                                                >
                                                                    <X className="w-3 h-3 mr-1" /> Reject
                                                                </Button>
                                                            </div>
                                                        ) : item.status === 'unpaid' ? (
                                                            <div className="flex items-center justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setApprovingPenalty(item)}
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 px-2.5"
                                                                >
                                                                    <Unlock className="w-3 h-3 mr-1" /> Waive Fine (Unlock)
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-zinc-500">
                                                                {item.approver ? `By ${item.approver.name}` : (item.admin_remarks || '-')}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                {renderPagination(allPenalties)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </PageSurface>

            {/* PRINTABLE PAID REPORT SECTION (OFFICIAL PRINT LAYOUT) */}
            <div id="printable-paid-report" className="hidden print:block p-6 bg-white text-black space-y-4">
                <div className="text-center border-b pb-4 mb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wider">Overdue Movement Penalty Paid Statement</h1>
                    <p className="text-xs text-gray-600 mt-1">HR & Movement Attendance Management System</p>
                    <div className="flex justify-between items-center text-[11px] text-gray-600 mt-3 pt-2 border-t">
                        <span><strong>Branch Filter:</strong> {selectedBranchName}</span>
                        <span><strong>Date Range:</strong> {startDate || 'Start Date'} to {endDate || 'Today'}</span>
                        <span><strong>Print Date:</strong> {new Date().toLocaleString('en-GB')}</span>
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
                        <span className="text-base font-bold text-black">৳ {Number(paidStats?.total_amount || 0).toLocaleString()}</span>
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
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '7%' }} />
                    </colgroup>
                    <thead>
                        <tr className="bg-gray-200 border-b border-gray-400 font-bold text-left">
                            <th className="p-1 border border-gray-400 text-center">#</th>
                            <th className="p-1 border border-gray-400">Employee Name (ID)</th>
                            <th className="p-1 border border-gray-400">Branch</th>
                            <th className="p-1 border border-gray-400">Movement</th>
                            <th className="p-1 border border-gray-400">Overdue</th>
                            <th className="p-1 border border-gray-400">Sender Mobile</th>
                            <th className="p-1 border border-gray-400 text-right">Fine (৳)</th>
                            <th className="p-1 border border-gray-400">Approved</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!paidPenalties?.data || paidPenalties.data.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-3 text-center text-gray-500">No paid penalty records found for this filter.</td>
                            </tr>
                        ) : (
                            paidPenalties.data.map((item, idx) => (
                                <tr key={item.id} className="border-b border-gray-300">
                                    <td className="p-1 border border-gray-300 text-center">{idx + 1}</td>
                                    <td className="p-1 border border-gray-300 font-bold truncate" title={`${item.employee?.first_name} ${item.employee?.last_name} (${item.employee?.employee_id || 'N/A'})`}>
                                        {item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown'} ({item.employee?.employee_id || 'N/A'})
                                    </td>
                                    <td className="p-1 border border-gray-300 truncate" title={item.employee?.branch?.name || 'Main Office'}>
                                        {item.employee?.branch?.name || 'Main Office'}
                                    </td>
                                    <td className="p-1 border border-gray-300 truncate" title={`#${item.movement?.id} - ${item.movement?.purpose || ''}`}>
                                        #{item.movement?.id} - {item.movement?.purpose || 'N/A'}
                                    </td>
                                    <td className="p-1 border border-gray-300 whitespace-nowrap">{item.overdue_days} Day(s)</td>
                                    <td className="p-1 border border-gray-300 font-mono font-bold whitespace-nowrap">
                                        {item.sender_number || item.transaction_id || 'N/A'} ({item.payment_method?.toUpperCase() || '-'})
                                    </td>
                                    <td className="p-1 border border-gray-300 text-right font-bold whitespace-nowrap">৳ {Number(item.total_fine).toFixed(2)}</td>
                                    <td className="p-1 border border-gray-300 truncate" title={item.approver?.name || 'Admin'}>
                                        {item.approver?.name || 'Admin'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 font-extrabold text-[10px]">
                            <td colSpan={6} className="p-1 border border-gray-400 text-right">Total Collection:</td>
                            <td className="p-1 border border-gray-400 text-right text-black">৳ {Number(paidStats?.total_amount || 0).toFixed(2)}</td>
                            <td className="p-1 border border-gray-400"></td>
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

            {/* Approval Modal */}
            <Dialog open={!!approvingPenalty} onOpenChange={(open) => !open && setApprovingPenalty(null)}>
                <DialogContent className="bg-white border-zinc-200 text-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-emerald-700 flex items-center">
                            <Unlock className="w-5 h-5 mr-2" />
                            {approvingPenalty?.status === 'unpaid' 
                                ? 'Waive Fine & Unlock Account (Without Payment)' 
                                : 'Approve Payment & Unlock Account'}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-600 text-xs">
                            {approvingPenalty?.status === 'unpaid' ? (
                                <span>
                                    You are manually waiving the fine for <strong className="text-zinc-900">{approvingPenalty?.employee ? `${approvingPenalty.employee.first_name} ${approvingPenalty.employee.last_name}` : 'this employee'}</strong> without payment. Approving will immediately unlock their ID.
                                </span>
                            ) : (
                                <span>
                                    Confirm that you have verified Sender Mobile Number: <strong className="font-mono text-zinc-900">{approvingPenalty?.sender_number || approvingPenalty?.transaction_id || 'N/A'}</strong>. Approving will mark payment as verified and immediately unlock the employee's ID.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApproveSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-zinc-700">Admin Remarks (Optional)</Label>
                            <Input
                                value={approveData.admin_remarks}
                                onChange={(e) => setApproveData('admin_remarks', e.target.value)}
                                className="bg-white border-zinc-300 text-zinc-900"
                                placeholder={approvingPenalty?.status === 'unpaid' ? 'e.g. Fine waived by HR admin...' : 'e.g. Payment verified via Sender Mobile Number...'}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setApprovingPenalty(null)} className="border-zinc-300 text-zinc-700">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={approveProcessing} className={approvingPenalty?.status === 'unpaid' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}>
                                {approveProcessing 
                                    ? 'Processing...' 
                                    : approvingPenalty?.status === 'unpaid'
                                    ? 'Waive Fine & Unlock'
                                    : 'Approve Payment & Unlock'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Rejection Modal */}
            <Dialog open={!!rejectingPenalty} onOpenChange={(open) => !open && setRejectingPenalty(null)}>
                <DialogContent className="bg-white border-zinc-200 text-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-rose-700 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" /> Reject Payment Submission
                        </DialogTitle>
                        <DialogDescription className="text-zinc-600 text-xs">
                            Provide a reason for rejection so the employee can resubmit correct payment information.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRejectSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-zinc-700">Rejection Reason (Required)</Label>
                            <Textarea
                                placeholder="e.g. Money not received from sender mobile number..."
                                value={rejectData.admin_remarks}
                                onChange={(e) => setRejectData('admin_remarks', e.target.value)}
                                className="bg-white border-zinc-300 text-zinc-900"
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRejectingPenalty(null)} className="border-zinc-300 text-zinc-700">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={rejectProcessing} variant="destructive">
                                {rejectProcessing ? 'Rejecting...' : 'Reject Submission'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
