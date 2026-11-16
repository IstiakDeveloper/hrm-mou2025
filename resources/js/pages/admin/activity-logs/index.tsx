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
import { ArrowLeft, Eye, Filter, History, Pencil, RotateCcw, Search, Trash2 } from 'lucide-react';

type ChangeRow = {
    label: string;
    from: string | null;
    to: string | null;
    redacted: boolean;
};

type ActivityLogItem = {
    id: number;
    event: 'updated' | 'deleted';
    actor_name: string;
    actor_employee_id: string | null;
    record_type: string;
    record_label: string;
    summary: string;
    changed_fields: string[];
    changed_extra: number;
    changes: ChangeRow[];
    created_at: string | null;
    created_at_human: string | null;
    created_at_formatted: string | null;
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
    causers: Array<{ id: number; name: string }>;
    modules: Array<{ value: string; label: string }>;
    stats: {
        updates: number;
        deletes: number;
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

function initials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
    }
    return (name.charAt(0) || 'S').toUpperCase();
}

export default function ActivityLogsIndex({ activities, causers, modules, stats, filters }: Props) {
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [causerId, setCauserId] = useState(filters.causer_id || 'all');
    const [eventFilter, setEventFilter] = useState(filters.event || 'all');
    const [subjectType, setSubjectType] = useState(filters.subject_type || 'all');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');
    const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);

    const applyFilters = (overrides: Partial<Props['filters']> = {}) => {
        const query: Record<string, string> = {
            section: 'administration',
            from_date: overrides.from_date !== undefined ? overrides.from_date : fromDate,
            to_date: overrides.to_date !== undefined ? overrides.to_date : toDate,
            causer_id: (overrides.causer_id !== undefined ? overrides.causer_id : causerId) === 'all'
                ? ''
                : (overrides.causer_id ?? causerId),
            event: (overrides.event !== undefined ? overrides.event : eventFilter) === 'all'
                ? ''
                : (overrides.event ?? eventFilter),
            subject_type: (overrides.subject_type !== undefined ? overrides.subject_type : subjectType) === 'all'
                ? ''
                : (overrides.subject_type ?? subjectType),
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        };

        Object.keys(query).forEach((key) => {
            if (!query[key]) delete query[key];
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

        if (preset === 'today') {
            start = now;
        } else if (preset === '7days') {
            start.setDate(now.getDate() - 7);
        } else if (preset === '30days') {
            start.setDate(now.getDate() - 30);
        } else {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const formattedStart = formatDate(start);
        const formattedEnd = formatDate(now);
        setFromDate(formattedStart);
        setToDate(formattedEnd);
        applyFilters({ from_date: formattedStart, to_date: formattedEnd });
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

    const actionBadge = (event: ActivityLogItem['event']) => {
        if (event === 'deleted') {
            return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Deleted</Badge>;
        }
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200">Updated</Badge>;
    };

    return (
        <Layout>
            <Head title="Activity Logs" />

            <PageSurface className="max-w-7xl py-5 md:py-6 px-3 sm:px-4">
                <div className="mb-5">
                    <SectionSubNav items={ADMINISTRATION_NAV_ITEMS} />
                </div>

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
                            Activity log
                        </h1>
                        <p className="text-xs text-zinc-500">
                            Each line says who updated or deleted a record, and which fields changed.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetFilters} className="h-8 gap-1 text-xs border-zinc-200">
                        <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
                        Reset
                    </Button>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Card className="border-zinc-200/90 shadow-sm bg-white">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Updated</p>
                                <p className="text-xl font-bold text-zinc-900 mt-0.5">{stats.updates.toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">In the selected range</p>
                            </div>
                            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                                <Pencil className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-zinc-200/90 shadow-sm bg-white">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Deleted</p>
                                <p className="text-xl font-bold text-zinc-900 mt-0.5">{stats.deletes.toLocaleString()}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">In the selected range</p>
                            </div>
                            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                                <Trash2 className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-6 border-zinc-200/90 shadow-sm bg-white">
                    <CardHeader className="border-b border-zinc-100 py-3 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <CardTitle className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                                <Filter className="h-3.5 w-3.5 text-zinc-500" />
                                Filters
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {([
                                    ['today', 'Today'],
                                    ['7days', 'Last 7 days'],
                                    ['30days', 'Last 30 days'],
                                    ['month', 'This month'],
                                ] as const).map(([preset, label]) => (
                                    <Button
                                        key={preset}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDatePreset(preset)}
                                        className="h-6 px-2 text-[10px] font-medium"
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearchSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">From</label>
                                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">To</label>
                                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">Who</label>
                                    <Select value={causerId} onValueChange={setCauserId}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Everyone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Everyone</SelectItem>
                                            {causers.map((person) => (
                                                <SelectItem key={person.id} value={String(person.id)}>
                                                    {person.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">Action</label>
                                    <Select value={eventFilter} onValueChange={setEventFilter}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="All actions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Updates and deletes</SelectItem>
                                            <SelectItem value="updated">Updated</SelectItem>
                                            <SelectItem value="deleted">Deleted</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">Record type</label>
                                    <Select value={subjectType} onValueChange={setSubjectType}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="All records" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All records</SelectItem>
                                            {modules.map((module) => (
                                                <SelectItem key={module.value} value={module.value}>
                                                    {module.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-zinc-600 block mb-1">Search name or record</label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                                        <Input
                                            type="text"
                                            placeholder="Person or record name"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-8 pl-8 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button type="submit" size="sm" className="h-8 flex-1 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                                        <Filter className="mr-1 h-3.5 w-3.5" />
                                        Apply
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="h-8 text-xs">
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-zinc-200/90 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-zinc-100 py-3 px-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold text-zinc-900">Changes</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Showing {activities.from || 0} to {activities.to || 0} of {activities.total}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Per page</span>
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
                                <p className="text-sm font-medium text-zinc-700">No updates or deletes in this range</p>
                                <p className="text-xs text-zinc-400 mt-1">Widen the dates or clear a filter.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full text-xs">
                                    <TableHeader className="bg-zinc-50/80 border-b border-zinc-100">
                                        <TableRow>
                                            <TableHead className="w-40 py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">When</TableHead>
                                            <TableHead className="w-48 py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">Who</TableHead>
                                            <TableHead className="py-2.5 px-3 font-semibold text-[10px] uppercase text-zinc-500">What happened</TableHead>
                                            <TableHead className="w-24 py-2.5 px-3 text-right font-semibold text-[10px] uppercase text-zinc-500">Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activities.data.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-zinc-50/60 border-b border-zinc-50">
                                                <TableCell className="py-2.5 px-3 font-mono text-[11px] text-zinc-600">
                                                    <div className="font-medium text-zinc-800">{log.created_at_human}</div>
                                                    <div className="text-[10px] text-zinc-400">{log.created_at_formatted}</div>
                                                </TableCell>
                                                <TableCell className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 font-semibold grid place-items-center text-[10px]">
                                                            {initials(log.actor_name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-zinc-900 truncate">{log.actor_name}</div>
                                                            {log.actor_employee_id && (
                                                                <div className="text-[10px] text-zinc-400 truncate">{log.actor_employee_id}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 px-3 text-zinc-800">{log.summary}</TableCell>
                                                <TableCell className="py-2.5 px-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedLog(log)}
                                                        className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                                    >
                                                        <Eye className="mr-1 h-3.5 w-3.5" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

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

            <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    {selectedLog && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-base font-bold flex items-center gap-2">
                                    <History className="h-4 w-4 text-violet-600" />
                                    {selectedLog.summary}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-zinc-500">
                                    {selectedLog.actor_name}{selectedLog.actor_employee_id ? ` (${selectedLog.actor_employee_id})` : ''} · {selectedLog.created_at_formatted}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                                    <div>
                                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Who</span>
                                        <span className="font-medium text-zinc-800">{selectedLog.actor_name}</span>
                                        {selectedLog.actor_employee_id && (
                                            <span className="block text-[10px] text-zinc-400">{selectedLog.actor_employee_id}</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Action</span>
                                        {actionBadge(selectedLog.event)}
                                    </div>
                                </div>

                                {selectedLog.event === 'deleted' ? (
                                    <p className="text-sm text-zinc-600">{selectedLog.summary}</p>
                                ) : selectedLog.changes.length === 0 ? (
                                    <p className="text-sm text-zinc-500">No field-level detail was stored for this update.</p>
                                ) : (
                                    <div className="overflow-hidden rounded-lg border border-zinc-200">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase text-zinc-500">
                                                <tr>
                                                    <th className="px-3 py-2 font-medium w-1/3">Field</th>
                                                    <th className="px-3 py-2 font-medium w-1/3">Previous</th>
                                                    <th className="px-3 py-2 font-medium w-1/3">New</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {selectedLog.changes.map((change) => (
                                                    <tr key={change.label}>
                                                        <td className="px-3 py-2 font-semibold text-zinc-800">{change.label}</td>
                                                        <td className="px-3 py-2 text-rose-700 bg-rose-50/40 break-all">
                                                            {change.redacted ? 'Changed' : (change.from ?? '—')}
                                                        </td>
                                                        <td className="px-3 py-2 text-emerald-700 bg-emerald-50/40 break-all">
                                                            {change.redacted ? 'Changed' : (change.to ?? '—')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
