import Layout from '@/layouts/AdminLayout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    BellRing,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Info,
    Megaphone,
    Paperclip,
    Plus,
    Search,
    Trash2,
    Users,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface Sender {
    id: number;
    name: string;
    email: string;
}

interface Notice {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | string;
    link: string | null;
    attachment_path: string | null;
    audience: 'all' | 'departments' | 'users' | string;
    recipient_count: number;
    push_sent: boolean;
    created_at: string;
    sender: Sender | null;
}

interface PaginationData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface IndexProps {
    notices: PaginationData<Notice>;
    filters: {
        search: string;
        type: string;
        audience: string;
    };
}

const TYPE_META: Record<string, { label: string; className: string; icon: JSX.Element }> = {
    info: {
        label: 'Info',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <Info className="h-3.5 w-3.5" />,
    },
    success: {
        label: 'Success',
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    warning: {
        label: 'Warning',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    error: {
        label: 'Error',
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
};

const AUDIENCE_META: Record<string, { label: string; className: string }> = {
    all: { label: 'All users', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    departments: { label: 'Departments', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    users: { label: 'Specific users', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
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

export default function AdminNoticesIndex({ notices, filters }: IndexProps) {
    const { data, setData, get, processing } = useForm({
        search: filters.search ?? '',
        type: filters.type ?? '',
        audience: filters.audience ?? '',
    });

    const [toDelete, setToDelete] = useState<Notice | null>(null);

    const submitFilters = (e?: React.FormEvent) => {
        e?.preventDefault();
        get(route('admin.notices.index'), { preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        setData({ search: '', type: '', audience: '' });
        router.get(
            route('admin.notices.index'),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const confirmDelete = () => {
        if (!toDelete) return;
        router.delete(route('admin.notices.destroy', toDelete.id), {
            preserveScroll: true,
            onSuccess: () => setToDelete(null),
        });
    };

    return (
        <Layout>
            <Head title="Notices" />

            <PageSurface className="py-6 md:py-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 md:text-3xl">
                            <Megaphone className="h-7 w-7 text-green-600" />
                            Notices
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Log of notices sent to users (in-app, email, optional attachment, and push when configured).
                        </p>
                    </div>
                    <Link href={route('admin.notices.create')}>
                        <Button className="gap-2 bg-green-600 hover:bg-green-700">
                            <Plus className="h-4 w-4" />
                            Send new notice
                        </Button>
                    </Link>
                </div>

                <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gray-50 pb-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <CardTitle>Sent notices</CardTitle>
                            <form onSubmit={submitFilters} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] md:w-auto">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="search"
                                        placeholder="Search title or message…"
                                        value={data.search}
                                        onChange={(e) => setData('search', e.target.value)}
                                        className="pl-8 sm:w-64"
                                    />
                                </div>
                                <Select value={data.type || '__any__'} onValueChange={(v) => setData('type', v === '__any__' ? '' : v)}>
                                    <SelectTrigger className="w-full sm:w-36">
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
                                    value={data.audience || '__any__'}
                                    onValueChange={(v) => setData('audience', v === '__any__' ? '' : v)}
                                >
                                    <SelectTrigger className="w-full sm:w-40">
                                        <SelectValue placeholder="Audience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__any__">All audiences</SelectItem>
                                        <SelectItem value="all">All users</SelectItem>
                                        <SelectItem value="departments">Departments</SelectItem>
                                        <SelectItem value="users">Specific users</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex gap-2">
                                    <Button type="submit" variant="secondary" disabled={processing}>
                                        Apply
                                    </Button>
                                    {(filters.search || filters.type || filters.audience) && (
                                        <Button type="button" variant="ghost" onClick={resetFilters}>
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead>Notice</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Audience</TableHead>
                                        <TableHead className="text-right">Recipients</TableHead>
                                        <TableHead>Push</TableHead>
                                        <TableHead>Sent by</TableHead>
                                        <TableHead>Sent at</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {notices.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-40 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Megaphone className="h-8 w-8 text-gray-400" />
                                                    <h3 className="text-lg font-medium text-gray-900">No notices yet</h3>
                                                    <p className="text-sm text-gray-500">
                                                        {filters.search || filters.type || filters.audience
                                                            ? 'Try adjusting your filters.'
                                                            : 'Send your first notice to see it listed here.'}
                                                    </p>
                                                    <Link href={route('admin.notices.create')}>
                                                        <Button size="sm" className="mt-2 gap-2 bg-green-600 hover:bg-green-700">
                                                            <Plus className="h-4 w-4" />
                                                            Send notice
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        notices.data.map((n) => {
                                            const typeMeta = TYPE_META[n.type] ?? TYPE_META.info;
                                            const audMeta = AUDIENCE_META[n.audience] ?? {
                                                label: n.audience,
                                                className: 'bg-gray-100 text-gray-700 border-gray-200',
                                            };
                                            return (
                                                <TableRow key={n.id} className="hover:bg-gray-50">
                                                    <TableCell className="max-w-xs">
                                                        <Link
                                                            href={route('admin.notices.show', n.id)}
                                                            className="block"
                                                        >
                                                            <div className="line-clamp-1 font-medium text-gray-900">
                                                                {n.title}
                                                                {n.attachment_path ? (
                                                                    <Paperclip
                                                                        className="ml-1 inline h-3.5 w-3.5 text-muted-foreground"
                                                                        aria-label="Has attachment"
                                                                    />
                                                                ) : null}
                                                            </div>
                                                            <div className="line-clamp-1 text-xs text-muted-foreground">
                                                                {n.message}
                                                            </div>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${typeMeta.className}`}
                                                        >
                                                            {typeMeta.icon}
                                                            {typeMeta.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={audMeta.className}>
                                                            {audMeta.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Users className="h-3.5 w-3.5 text-gray-500" />
                                                            {n.recipient_count}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {n.push_sent ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                                                <BellRing className="h-3.5 w-3.5" />
                                                                Sent
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {n.sender ? (
                                                            <div className="flex flex-col">
                                                                <span>{n.sender.name}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {n.sender.email}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">System</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm">{formatDateTime(n.created_at)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Link href={route('admin.notices.show', n.id)}>
                                                                <Button variant="ghost" size="icon" aria-label="View">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label="Delete"
                                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={() => setToDelete(n)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {notices.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
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
                                            href={route('admin.notices.index', {
                                                page: notices.current_page - 1,
                                                search: data.search,
                                                type: data.type,
                                                audience: data.audience,
                                            })}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Link>
                                    )}
                                    {notices.links
                                        .slice(1, -1)
                                        .map((link, i) => (
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
                                            href={route('admin.notices.index', {
                                                page: notices.current_page + 1,
                                                search: data.search,
                                                type: data.type,
                                                audience: data.audience,
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

            <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this notice log entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This only removes the record from the admin notice log. The notifications already delivered
                            to user bells will remain until they are read or deleted by the user.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
