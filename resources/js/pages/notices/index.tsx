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

                {/* Stats */}
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="rounded-full bg-blue-100 p-3">
                                <Bell className="h-5 w-5 text-blue-700" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Total notices</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="rounded-full bg-amber-100 p-3">
                                <Mail className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Unread</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="rounded-full bg-green-100 p-3">
                                <MailOpen className="h-5 w-5 text-green-700" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Read</p>
                                <p className="text-2xl font-bold text-gray-900">{Math.max(0, stats.total - stats.unread)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* List card */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gray-50 pb-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle>All notices</CardTitle>
                            <form onSubmit={submitFilters} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="search"
                                        placeholder="Search title or message…"
                                        value={data.search}
                                        onChange={(e) => setData('search', e.target.value)}
                                        className="pl-8 sm:w-60"
                                    />
                                </div>
                                <Select
                                    value={data.type || '__any__'}
                                    onValueChange={(v) => setData('type', v === '__any__' ? '' : v)}
                                >
                                    <SelectTrigger className="w-full sm:w-32">
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
                                    <SelectTrigger className="w-full sm:w-36">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__any__">All</SelectItem>
                                        <SelectItem value="unread">Unread</SelectItem>
                                        <SelectItem value="read">Read</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex gap-2">
                                    <Button type="submit" variant="secondary" disabled={processing}>
                                        Apply
                                    </Button>
                                    {hasFilters && (
                                        <Button type="button" variant="ghost" onClick={resetFilters}>
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {notices.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                                <Megaphone className="h-10 w-10 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-900">No notices</h3>
                                <p className="max-w-sm text-sm text-gray-500">
                                    {hasFilters
                                        ? 'No notice matches your filters. Try adjusting them.'
                                        : 'When the administrator sends a notice, it will show up here.'}
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {notices.data.map((n) => {
                                    const meta = TYPE_META[n.type] ?? TYPE_META.info;
                                    const isUnread = !n.read_at;
                                    return (
                                        <li key={n.id}>
                                            <Link
                                                href={route('my-notices.show', n.id)}
                                                className={`block border-l-4 px-4 py-4 transition hover:bg-gray-50 md:px-6 ${
                                                    meta.accent
                                                } ${isUnread ? 'bg-blue-50/50' : ''}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 flex-shrink-0">
                                                        {isUnread ? (
                                                            <div className="relative">
                                                                <Mail className="h-5 w-5 text-blue-600" />
                                                                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                                                            </div>
                                                        ) : (
                                                            <MailOpen className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${meta.className}`}
                                                            >
                                                                {meta.icon}
                                                                {meta.label}
                                                            </span>
                                                            {isUnread && (
                                                                <Badge className="bg-red-500 text-white hover:bg-red-500">
                                                                    New
                                                                </Badge>
                                                            )}
                                                            {n.attachment_url && (
                                                                <span
                                                                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
                                                                    title="Has attachment"
                                                                >
                                                                    <Paperclip className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {relativeTime(n.created_at)} · {formatDateTime(n.created_at)}
                                                            </span>
                                                        </div>
                                                        <h3
                                                            className={`mt-1 truncate text-base ${
                                                                isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
                                                            }`}
                                                        >
                                                            {n.title}
                                                        </h3>
                                                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                                                            {n.message}
                                                        </p>
                                                    </div>
                                                    <ChevronRightIcon className="mt-2 h-5 w-5 flex-shrink-0 text-gray-400" />
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {notices.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3 md:px-6">
                                <p className="text-sm text-gray-700">
                                    Showing{' '}
                                    <span className="font-medium">
                                        {(notices.current_page - 1) * notices.per_page + 1}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium">
                                        {Math.min(notices.current_page * notices.per_page, notices.total)}
                                    </span>{' '}
                                    of <span className="font-medium">{notices.total}</span>
                                </p>
                                <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    {notices.current_page > 1 && (
                                        <Link
                                            href={route('my-notices.index', {
                                                ...queryParams,
                                                page: notices.current_page - 1,
                                            })}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Link>
                                    )}
                                    {notices.links.slice(1, -1).map((link, i) => (
                                        <Link
                                            key={i}
                                            href={link.url ?? '#'}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                                                link.active
                                                    ? 'z-10 bg-green-600 text-white'
                                                    : 'text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                    {notices.current_page < notices.last_page && (
                                        <Link
                                            href={route('my-notices.index', {
                                                ...queryParams,
                                                page: notices.current_page + 1,
                                            })}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </Link>
                                    )}
                                </nav>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
