import Layout from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CheckCheck,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronRight as ChevronRightIcon,
    Info,
    Mail,
    MailOpen,
    Megaphone,
    Paperclip,
    Search,
    XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { PageSurface } from '@/components/page-surface';
import { cn } from '@/lib/utils';

interface Notice {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | string;
    link: string | null;
    attachment_url: string | null;
    attachment_name: string | null;
    read_at: string | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    notices: Paginated<Notice>;
    filters: {
        search: string;
        type: string;
        status: string;
    };
    stats: {
        unread: number;
        total: number;
    };
}

const TYPE_META: Record<string, { label: string; className: string; icon: JSX.Element; accent: string }> = {
    info: {
        label: 'Info',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <Info className="h-3.5 w-3.5" />,
        accent: 'border-l-blue-500',
    },
    success: {
        label: 'Success',
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        accent: 'border-l-green-500',
    },
    warning: {
        label: 'Warning',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        accent: 'border-l-amber-500',
    },
    error: {
        label: 'Error',
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-3.5 w-3.5" />,
        accent: 'border-l-red-500',
    },
};

function formatDateTime(s: string) {
    try {
        const d = new Date(s);
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return s;
    }
}

function relativeTime(s: string) {
    try {
        const d = new Date(s);
        const diff = Date.now() - d.getTime();
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return 'just now';
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr}h ago`;
        const day = Math.floor(hr / 24);
        if (day < 30) return `${day}d ago`;
        const mon = Math.floor(day / 30);
        if (mon < 12) return `${mon}mo ago`;
        return `${Math.floor(mon / 12)}y ago`;
    } catch {
        return '';
    }
}

export default function MyNoticesIndex({ notices, filters, stats }: Props) {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;

    const { data, setData, get, processing } = useForm({
        search: filters.search ?? '',
        type: filters.type ?? '',
        status: filters.status ?? '',
    });

    const queryParams = useMemo(
        () => ({
            search: data.search || undefined,
            type: data.type || undefined,
            status: data.status || undefined,
        }),
        [data.search, data.type, data.status],
    );

    const submitFilters = (e?: React.FormEvent) => {
        e?.preventDefault();
        get(route('my-notices.index'), { preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        setData({ search: '', type: '', status: '' });
        router.get(route('my-notices.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const markAllRead = () => {
        router.post(
            route('my-notices.mark-all-read'),
            {},
            { preserveScroll: true },
        );
    };

    const hasFilters = Boolean(filters.search || filters.type || filters.status);

    return (
        <Layout>
            <Head title="My Notices" />

            <PageSurface className="py-6 md:py-8">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 md:text-3xl">
                            <Megaphone className="h-7 w-7 text-green-600" />
                            My Notices
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            All notices sent to you by the administrator.
                        </p>
                    </div>
                    {stats.unread > 0 && (
                        <Button onClick={markAllRead} variant="outline" className="gap-2">
                            <CheckCheck className="h-4 w-4" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                {/* Compact 1-Row Stats Bar */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-center shadow-xs">
                        <div className="mb-1 rounded-lg bg-blue-50 p-1.5 text-blue-600">
                            <Bell className="h-4 w-4" />
                        </div>
                        <span className="text-base font-black text-slate-900 leading-none">{stats.total}</span>
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-center shadow-xs">
                        <div className="mb-1 rounded-lg bg-amber-50 p-1.5 text-amber-600">
                            <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-base font-black text-slate-900 leading-none">{stats.unread}</span>
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Unread</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-center shadow-xs">
                        <div className="mb-1 rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                            <MailOpen className="h-4 w-4" />
                        </div>
                        <span className="text-base font-black text-slate-900 leading-none">{Math.max(0, stats.total - stats.unread)}</span>
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Read</span>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                    <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-emerald-600" />
                            All Notices
                        </h2>
                        <form onSubmit={submitFilters} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    type="search"
                                    placeholder="Search notices…"
                                    value={data.search}
                                    onChange={(e) => setData('search', e.target.value)}
                                    className="pl-8 w-full h-8 text-xs rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center">
                                <Select
                                    value={data.type || '__any__'}
                                    onValueChange={(v) => setData('type', v === '__any__' ? '' : v)}
                                >
                                    <SelectTrigger className="w-full sm:w-28 h-8 text-xs rounded-lg">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__any__">All types</SelectItem>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="warning">Warning</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={data.status || '__any__'}
                                    onValueChange={(v) => setData('status', v === '__any__' ? '' : v)}
                                >
                                    <SelectTrigger className="w-full sm:w-28 h-8 text-xs rounded-lg">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__any__">All</SelectItem>
                                        <SelectItem value="unread">Unread</SelectItem>
                                        <SelectItem value="read">Read</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-1.5">
                                <Button type="submit" variant="secondary" className="h-8 text-xs font-bold px-3 rounded-lg flex-1 sm:flex-none" disabled={processing}>
                                    Apply
                                </Button>
                                {hasFilters && (
                                    <Button type="button" variant="ghost" className="h-8 text-xs font-semibold px-2.5 rounded-lg flex-1 sm:flex-none" onClick={resetFilters}>
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Notices Compact List */}
                {notices.data.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                        <Megaphone className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                        <h3 className="text-sm font-bold text-slate-900">No Notices Found</h3>
                        <p className="max-w-xs text-[11px] text-slate-500 mx-auto mt-0.5">
                            {hasFilters
                                ? 'No notice matches your filters. Try resetting filters.'
                                : 'When the administrator sends a notice, it will show up here.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notices.data.map((n) => {
                            const meta = TYPE_META[n.type] ?? TYPE_META.info;
                            const isUnread = !n.read_at;
                            return (
                                <div
                                    key={n.id}
                                    className={cn(
                                        'group relative flex items-center justify-between gap-3 rounded-xl border bg-white p-2.5 sm:p-3 shadow-xs transition-all duration-150 hover:border-emerald-300 hover:shadow-sm',
                                        isUnread ? 'border-blue-200 bg-blue-50/40 ring-1 ring-blue-500/10' : 'border-slate-200/90'
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className={cn('p-2 rounded-lg shrink-0', meta.className)}>
                                            {meta.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <Link href={route('my-notices.show', n.id)} className="min-w-0">
                                                    <span className={cn('truncate text-xs block font-bold', isUnread ? 'text-slate-900' : 'text-slate-700')}>
                                                        {n.title}
                                                    </span>
                                                </Link>
                                                {isUnread && (
                                                    <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                                                        NEW
                                                    </span>
                                                )}
                                                {n.attachment_url && (
                                                    <Paperclip className="h-3 w-3 text-slate-400 shrink-0" title="Has attachment" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                <span className="text-slate-400 font-medium">{relativeTime(n.created_at)}</span>
                                                <span className="mx-1 text-slate-300">•</span>
                                                <span>{n.message}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href={route('my-notices.show', n.id)}
                                        className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                        title="Read Notice"
                                    >
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}

                {notices.last_page > 1 && (
                    <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs text-xs">
                        <p className="text-slate-600">
                            Showing{' '}
                            <span className="font-semibold text-slate-900">
                                {(notices.current_page - 1) * notices.per_page + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-slate-900">
                                {Math.min(notices.current_page * notices.per_page, notices.total)}
                            </span>{' '}
                            of <span className="font-semibold text-slate-900">{notices.total}</span> notices
                        </p>

                        <div className="flex items-center gap-1">
                            {notices.links.map((link, i) => {
                                const isLabelPrev = link.label.includes('Previous');
                                const isLabelNext = link.label.includes('Next');

                                return (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                        className={cn(
                                            'h-8 min-w-[32px] text-xs font-bold rounded-lg',
                                            link.active ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-700'
                                        )}
                                    >
                                        {isLabelPrev ? (
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        ) : isLabelNext ? (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
