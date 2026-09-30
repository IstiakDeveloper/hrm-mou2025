import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { SectionSubNav, ADMINISTRATION_NAV_ITEMS } from '@/components/sections/section-sub-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Activity,
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Filter,
    History,
    Layers,
    RotateCcw,
    Search,
    Shield,
    User as UserIcon,
} from 'lucide-react';

type ActivityLogItem = {
    id: number;
    log_name: string | null;
    description: string;
    subject_type: string | null;
    subject_name: string | null;
    subject_id: number | string | null;
    causer_id: number | null;
    causer: {
        id: number;
        name: string;
        email: string;
        username?: string | null;
    } | null;
    event: string | null;
    properties: {
        attributes?: Record<string, any>;
        old?: Record<string, any>;
        ip?: string;
        user_agent?: string;
        [key: string]: any;
    } | null;
    created_at: string;
    created_at_human: string;
    created_at_formatted: string;
};

type PaginationLinks = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedActivities = {
    data: ActivityLogItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLinks[];
};

type Props = {
    activities: PaginatedActivities;
    causers: Array<{ id: number; name: string; email: string }>;
    modules: Array<{ value: string; label: string }>;
    events: string[];
    stats: {
        total_in_range: number;
        total_all_time: number;
        today_count: number;
    };
    filters: {
        from_date: string;
        to_date: string;
        causer_id: string;
        event: string;
        subject_type: string;
        search: string;
        per_page: string;
    };
};

export default function ActivityLogsIndex({
    activities,
    causers,
    modules,
    events,
    stats,
    filters,
}: Props) {
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [causerId, setCauserId] = useState(filters.causer_id || 'all');
    const [eventFilter, setEventFilter] = useState(filters.event || 'all');
    const [subjectType, setSubjectType] = useState(filters.subject_type || 'all');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');

    // Modal state for viewing details / diff
    const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);

    const applyFilters = (overrides: Partial<{
        from_date: string;
        to_date: string;
        causer_id: string;
        event: string;
        subject_type: string;
        search: string;
        per_page: string;
    }> = {}) => {
        const query: Record<string, string> = {
            section: 'administration',
            from_date: overrides.from_date !== undefined ? overrides.from_date : fromDate,
            to_date: overrides.to_date !== undefined ? overrides.to_date : toDate,
            causer_id: (overrides.causer_id !== undefined ? overrides.causer_id : causerId) === 'all' ? '' : (overrides.causer_id ?? causerId),
            event: (overrides.event !== undefined ? overrides.event : eventFilter) === 'all' ? '' : (overrides.event ?? eventFilter),
            subject_type: (overrides.subject_type !== undefined ? overrides.subject_type : subjectType) === 'all' ? '' : (overrides.subject_type ?? subjectType),
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        };

        // Remove empty keys
        Object.keys(query).forEach((k) => {
            if (!query[k]) delete query[k];
        });

        router.get('/admin/activity-logs', query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const setDatePreset = (preset: 'today' | '7days' | '30days' | 'month') => {
        const now = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        let start = new Date();
        const end = new Date();

        if (preset === 'today') {
            start = now;
        } else if (preset === '7days') {
            start.setDate(now.getDate() - 7);
        } else if (preset === '30days') {
            start.setDate(now.getDate() - 30);
        } else if (preset === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const formattedStart = formatDate(start);
        const formattedEnd = formatDate(end);

        setFromDate(formattedStart);
        setToDate(formattedEnd);

        applyFilters({
            from_date: formattedStart,
            to_date: formattedEnd,
        });
    };

    const resetFilters = () => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const defaultFrom = thirtyDaysAgo.toISOString().split('T')[0];
        const defaultTo = now.toISOString().split('T')[0];

        setFromDate(defaultFrom);
        setToDate(defaultTo);
        setCauserId('all');
        setEventFilter('all');
        setSubjectType('all');
        setSearchTerm('');
        setPerPage('25');

        router.get('/admin/activity-logs', {
            section: 'administration',
            from_date: defaultFrom,
            to_date: defaultTo,
        });
    };

    const getEventBadge = (event: string | null) => {
        switch (event?.toLowerCase()) {
            case 'created':
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Created</Badge>;
            case 'updated':
                return <Badge className="bg-sky-50 text-sky-700 border-sky-200">Updated</Badge>;
            case 'deleted':
                return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Deleted</Badge>;
            case 'login':
                return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Login</Badge>;
            case 'logout':
                return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200">Logout</Badge>;
            default:
                return <Badge variant="outline">{event || 'Action'}</Badge>;
        }
    };

    // Calculate diff keys between old and new properties
    const renderPropertiesDiff = (log: ActivityLogItem) => {
        const props = log.properties || {};
        const oldVals = props.old || {};
        const newVals = props.attributes || {};

        const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

        if (allKeys.length === 0) {
            // Check if there are other properties like IP, user agent, etc.
            const customKeys = Object.keys(props).filter((k) => k !== 'old' && k !== 'attributes');
            if (customKeys.length === 0) {
                return (
                    <div className="py-6 text-center text-xs text-zinc-500 italic">
                        No detailed attribute changes captured for this event.
                    </div>
                );
            }

            return (
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-700">Event Metadata</h4>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs">
                        <pre className="overflow-x-auto font-mono text-[11px] text-zinc-800">
                            {JSON.stringify(props, null, 2)}
                        </pre>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-700">Modified Attributes</h4>
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase text-zinc-500">
                            <tr>
                                <th className="px-3 py-2 font-medium w-1/3">Field</th>
                                <th className="px-3 py-2 font-medium w-1/3">Previous Value</th>
                                <th className="px-3 py-2 font-medium w-1/3">New Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                            {allKeys.map((key) => {
                                const oldVal = oldVals[key];
                                const newVal = newVals[key];
                                const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                                const formatVal = (v: any) => {
                                    if (v === null || v === undefined) return <span className="text-zinc-400 italic">null</span>;
                                    if (typeof v === 'boolean') return v ? 'true' : 'false';
                                    if (typeof v === 'object') return JSON.stringify(v);
                                    return String(v);
                                };

                                return (
                                    <tr key={key} className={isDifferent ? 'bg-amber-50/30' : ''}>
                                        <td className="px-3 py-2 font-semibold text-zinc-800">{key}</td>
                                        <td className="px-3 py-2 text-rose-700 bg-rose-50/40 break-all">
                                            {formatVal(oldVal)}
                                        </td>
                                        <td className="px-3 py-2 text-emerald-700 bg-emerald-50/40 break-all">
                                            {formatVal(newVal)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <Head title="Activity Logs & Audit" />

            <PageSurface className="max-w-7xl py-5 md:py-6 px-3 sm:px-4">
                <div className="mb-5">
                    <SectionSubNav items={ADMINISTRATION_NAV_ITEMS} />
                </div>

                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/sections/administration"
                                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Administration
                            </Link>
                            <span className="text-zinc-300">/</span>
                            <span className="text-xs font-semibold text-zinc-800">Activity Logs</span>
                        </div>
                        <h1 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-zinc-900">
                            Activity Logs & Audit Trail
                        </h1>
                        <p className="text-xs text-zinc-500">
                            Track user activities, login sessions, and data modifications across the system.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="h-8 gap-1 text-xs border-zinc-200"
                        >
                            <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
                            Reset All
                        </Button>
                    </div>
                </div>

                {/* KPI Stats */}
                <div className="mb-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
                    <Card className="border-zinc-200/90 shadow-sm bg-white">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                    Logs in Selected Range
                                </p>
                                <p className="text-xl font-bold text-zinc-900 mt-0.5">
                                    {stats.total_in_range.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">
                                    {fromDate} to {toDate}
                                </p>
                            </div>
                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <Activity className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200/90 shadow-sm bg-white">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                    Today's Activity
                                </p>
                                <p className="text-xl font-bold text-zinc-900 mt-0.5">
                                    {stats.today_count.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">Last 24 hours</p>
                            </div>
                            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200/90 shadow-sm bg-white">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                    Total System Audits
                                </p>
                                <p className="text-xl font-bold text-zinc-900 mt-0.5">
                                    {stats.total_all_time.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">Historical records</p>
                            </div>
                            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                <History className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Section */}
                <Card className="mb-6 border-zinc-200/90 shadow-sm bg-white">
                    <CardHeader className="border-b border-zinc-100 py-3 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <CardTitle className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                                <Filter className="h-3.5 w-3.5 text-zinc-500" />
                                Date-to-Date & Search Filters
                            </CardTitle>

                            {/* Quick Presets */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-zinc-400 mr-1">Presets:</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDatePreset('today')}
                                    className="h-6 px-2 text-[10px] font-medium"
                                >
                                    Today
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDatePreset('7days')}
                                    className="h-6 px-2 text-[10px] font-medium"
                                >
                                    Last 7 Days
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDatePreset('30days')}
                                    className="h-6 px-2 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                >
                                    Last 30 Days
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDatePreset('month')}
                                    className="h-6 px-2 text-[10px] font-medium"
                                >
                                    This Month
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4">
                        <form onSubmit={handleSearchSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Date From */}
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">
                                        From Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </div>

                                {/* Date To */}
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">
                                        To Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </div>

                                {/* User / Causer */}
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">
                                        Performed By (User)
                                    </label>
                                    <Select value={causerId} onValueChange={(val) => setCauserId(val)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="All Users" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            {causers.map((u) => (
                                                <SelectItem key={u.id} value={String(u.id)}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Event / Action */}
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">
                                        Action / Event
                                    </label>
                                    <Select value={eventFilter} onValueChange={(val) => setEventFilter(val)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="All Actions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Actions</SelectItem>
                                            <SelectItem value="created">Created</SelectItem>
                                            <SelectItem value="updated">Updated</SelectItem>
                                            <SelectItem value="deleted">Deleted</SelectItem>
                                            <SelectItem value="login">Login</SelectItem>
                                            <SelectItem value="logout">Logout</SelectItem>
                                            {events
                                                .filter(
                                                    (e) => !['created', 'updated', 'deleted', 'login', 'logout'].includes(e)
                                                )
                                                .map((e) => (
                                                    <SelectItem key={e} value={e}>
                                                        {e}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                {/* Module / Subject */}
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">
                                        Module / Model
                                    </label>
                                    <Select value={subjectType} onValueChange={(val) => setSubjectType(val)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="All Modules" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Modules</SelectItem>
                                            {modules.map((m) => (
                                                <SelectItem key={m.value} value={m.value}>
                                                    {m.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Search Text */}
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">
                                        Search Keyword / IP
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                                        <Input
                                            type="text"
                                            placeholder="Description, IP or user..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-8 pl-8 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Filter Buttons */}
                                <div className="flex items-end gap-2">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-8 flex-1 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                                    >
                                        <Filter className="mr-1 h-3.5 w-3.5" />
                                        Apply Filters
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="h-8 text-xs"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Activity Logs Table */}
                <Card className="border-zinc-200/90 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-zinc-100 py-3 px-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold text-zinc-900">
                                Activity Records
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Showing {activities.from || 0} to {activities.to || 0} of {activities.total} logs
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Per page:</span>
                            <Select
                                value={perPage}
                                onValueChange={(val) => {
                                    setPerPage(val);
                                    applyFilters({ per_page: val });
                                }}
                            >
                                <SelectTrigger className="h-7 w-16 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {activities.data.length === 0 ? (
                            <div className="py-12 text-center">
                                <History className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
                                <p className="text-sm font-medium text-zinc-700">No activity logs found</p>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Try expanding the date range or clearing selected filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full text-xs">
                                    <TableHeader className="bg-zinc-50/80 border-b border-zinc-100">
                                        <TableRow>
                                            <TableHead className="w-40 py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">
                                                Time
                                            </TableHead>
                                            <TableHead className="w-48 py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">
                                                User
                                            </TableHead>
                                            <TableHead className="w-28 py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">
                                                Action
                                            </TableHead>
                                            <TableHead className="w-36 py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">
                                                Module
                                            </TableHead>
                                            <TableHead className="py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">
                                                Description
                                            </TableHead>
                                            <TableHead className="w-24 py-2.5 px-3 text-right font-semibold text-[10px] uppercase text-zinc-500">
                                                Details
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activities.data.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-zinc-50/60 border-b border-zinc-50">
                                                {/* Timestamp */}
                                                <TableCell className="py-2.5 px-3 font-mono text-[11px] text-zinc-600">
                                                    <div className="font-medium text-zinc-800">{log.created_at_human}</div>
                                                    <div className="text-[10px] text-zinc-400">{log.created_at_formatted}</div>
                                                </TableCell>

                                                {/* Performed by (User) */}
                                                <TableCell className="py-2.5 px-3">
                                                    {log.causer ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-700 font-semibold grid place-items-center text-[10px]">
                                                                {log.causer.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-zinc-900 truncate">
                                                                    {log.causer.name}
                                                                </div>
                                                                <div className="text-[10px] text-zinc-400 truncate">
                                                                    {log.causer.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-400 text-xs italic">System / Guest</span>
                                                    )}
                                                </TableCell>

                                                {/* Action / Event */}
                                                <TableCell className="py-2.5 px-3">
                                                    {getEventBadge(log.event)}
                                                </TableCell>

                                                {/* Module / Subject */}
                                                <TableCell className="py-2.5 px-3">
                                                    {log.subject_name ? (
                                                        <div className="inline-flex items-center gap-1 font-medium text-zinc-700">
                                                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-800 border border-zinc-200">
                                                                {log.subject_name} #{log.subject_id}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-400 text-[11px]">—</span>
                                                    )}
                                                </TableCell>

                                                {/* Description */}
                                                <TableCell className="py-2.5 px-3 text-zinc-800 font-medium max-w-xs truncate">
                                                    {log.description}
                                                    {log.properties?.ip && (
                                                        <span className="ml-2 text-[10px] text-zinc-400 font-mono">
                                                            IP: {log.properties.ip}
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Details Button */}
                                                <TableCell className="py-2.5 px-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedLog(log)}
                                                        className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                                    >
                                                        <Eye className="mr-1 h-3.5 w-3.5" />
                                                        Diff
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Pagination Links */}
                        {activities.last_page > 1 && (
                            <div className="p-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                                <span className="text-zinc-500">
                                    Page {activities.current_page} of {activities.last_page}
                                </span>
                                <div className="flex items-center gap-1">
                                    {activities.links.map((link, idx) => {
                                        if (link.url === null) {
                                            return (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 text-zinc-300 select-none text-xs"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        }

                                        return (
                                            <Link
                                                key={idx}
                                                href={link.url}
                                                preserveScroll
                                                preserveState
                                                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                                                    link.active
                                                        ? 'bg-violet-600 text-white font-semibold'
                                                        : 'text-zinc-600 hover:bg-zinc-100'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>

            {/* Details & Diff Modal */}
            <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    {selectedLog && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-base font-bold flex items-center gap-2">
                                    <History className="h-4 w-4 text-violet-600" />
                                    Activity Details #{selectedLog.id}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-zinc-500">
                                    {selectedLog.description} · {selectedLog.created_at_formatted}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-2">
                                {/* Metadata badges */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                                    <div>
                                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                                            Event
                                        </span>
                                        {getEventBadge(selectedLog.event)}
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                                            Module
                                        </span>
                                        <span className="font-semibold text-zinc-800">
                                            {selectedLog.subject_name || 'N/A'} {selectedLog.subject_id ? `#${selectedLog.subject_id}` : ''}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                                            Causer
                                        </span>
                                        <span className="font-medium text-zinc-800">
                                            {selectedLog.causer?.name || 'System'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                                            Client IP
                                        </span>
                                        <span className="font-mono text-zinc-600">
                                            {selectedLog.properties?.ip || '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Properties / Diff Table */}
                                {renderPropertiesDiff(selectedLog)}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
