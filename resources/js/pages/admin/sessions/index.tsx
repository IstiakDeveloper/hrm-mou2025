import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import {
    ChevronLeft,
    ChevronRight,
    LogOut,
    Monitor,
    Search,
} from 'lucide-react';

type SessionRow = {
    session_id: string;
    user_id: number;
    user_name: string;
    email: string;
    username?: string | null;
    account_type?: string | null;
    branch_name?: string | null;
    ip_address?: string | null;
    device_summary: string;
    last_activity: string;
    last_activity_human: string;
    is_current: boolean;
};

type PaginationLinks = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginationMeta = {
    current_page: number;
    from: number | null;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
};

type SessionsResponse = {
    data: SessionRow[];
    links?: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta?: PaginationMeta;
};

type Props = {
    sessions: SessionsResponse;
    stats: {
        active_sessions: number;
        active_users: number;
    };
    sessionLifetimeDays: number;
    filters: {
        search?: string;
        per_page?: string;
    };
    success?: string;
    error?: string;
};

type RevokeTarget =
    | { type: 'session'; row: SessionRow }
    | { type: 'user'; userId: number; userName: string };

export default function ActiveSessionsIndex({ sessions, stats, sessionLifetimeDays, filters, success, error }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canRevoke = hasAppPermission(auth, 'admin.access');
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '20');
    const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);

    const handleSearch = () => {
        router.get(route('admin.sessions.index'), { search, per_page: perPage }, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('admin.sessions.index'), { search, per_page: value }, { preserveState: true });
    };

    const confirmRevoke = () => {
        if (!revokeTarget) {
            return;
        }

        if (revokeTarget.type === 'session') {
            router.delete(route('admin.sessions.destroy', revokeTarget.row.session_id), {
                preserveScroll: true,
                onFinish: () => setRevokeTarget(null),
            });
            return;
        }

        router.delete(route('admin.sessions.destroy-user', revokeTarget.userId), {
            preserveScroll: true,
            onFinish: () => setRevokeTarget(null),
        });
    };

    const meta = sessions.meta;
    const rows = sessions.data ?? [];

    return (
        <Layout>
            <Head title="Active Sessions" />

            <PageSurface className="max-w-7xl py-5 md:py-6 px-3 sm:px-4">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900">
                            <Monitor className="h-5 w-5 text-violet-600" />
                            Active Sessions
                        </h1>
                        <p className="text-sm text-zinc-500">
                            See who is currently logged in and end sessions when needed.
                        </p>
                    </div>
                </div>

                {success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertDescription className="text-emerald-800">{success}</AlertDescription>
                    </Alert>
                )}
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardDescription>Active users</CardDescription>
                            <CardTitle className="text-2xl tabular-nums">{stats.active_users}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-xs text-zinc-500">
                            Unique accounts with a live session
                        </CardContent>
                    </Card>
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardDescription>Active sessions</CardDescription>
                            <CardTitle className="text-2xl tabular-nums">{stats.active_sessions}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-xs text-zinc-500">
                            Includes multiple devices or browsers per user
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle className="text-base">Logged-in sessions</CardTitle>
                                <CardDescription>
                                    Sessions expire after {sessionLifetimeDays} day{sessionLifetimeDays === 1 ? '' : 's'} of inactivity.
                                </CardDescription>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative min-w-[220px]">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Search name, email, IP…"
                                        className="pl-9"
                                    />
                                </div>
                                <Button onClick={handleSearch} variant="secondary">
                                    Search
                                </Button>
                                <Select value={perPage} onValueChange={handlePerPageChange}>
                                    <SelectTrigger className="w-[110px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 / page</SelectItem>
                                        <SelectItem value="20">20 / page</SelectItem>
                                        <SelectItem value="50">50 / page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Device</TableHead>
                                        <TableHead>IP</TableHead>
                                        <TableHead>Last active</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-sm text-zinc-500">
                                                No active login sessions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rows.map((row) => (
                                            <TableRow key={row.session_id}>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-medium text-zinc-900">{row.user_name}</span>
                                                            {row.is_current && (
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    This device
                                                                </Badge>
                                                            )}
                                                            {row.account_type === 'branch' && (
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    Branch
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-zinc-500">{row.email}</p>
                                                        {row.branch_name && (
                                                            <p className="text-xs text-zinc-500">{row.branch_name}</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-zinc-600">{row.device_summary}</TableCell>
                                                <TableCell className="text-sm tabular-nums text-zinc-600">
                                                    {row.ip_address || '—'}
                                                </TableCell>
                                                <TableCell className="text-sm text-zinc-600">
                                                    <div>{row.last_activity_human}</div>
                                                    <div className="text-xs text-zinc-400">
                                                        {new Date(row.last_activity).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {canRevoke ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() => setRevokeTarget({ type: 'session', row })}
                                                            >
                                                                <LogOut className="mr-1 h-3.5 w-3.5" />
                                                                End
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() =>
                                                                    setRevokeTarget({
                                                                        type: 'user',
                                                                        userId: row.user_id,
                                                                        userName: row.user_name,
                                                                    })
                                                                }
                                                            >
                                                                End all
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-zinc-400">View only</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {meta && meta.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
                                <p className="text-xs text-zinc-500">
                                    Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}
                                </p>
                                <div className="flex items-center gap-1">
                                    {meta.links.map((link, index) => {
                                        if (link.label.includes('Previous')) {
                                            return (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={!link.url}
                                                    onClick={() => link.url && router.get(link.url)}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                            );
                                        }
                                        if (link.label.includes('Next')) {
                                            return (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={!link.url}
                                                    onClick={() => link.url && router.get(link.url)}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </PageSurface>

            <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>End this login session?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {revokeTarget?.type === 'session' ? (
                                <>
                                    <strong>{revokeTarget.row.user_name}</strong> will be signed out on this device
                                    {revokeTarget.row.is_current ? ' (including your current browser if this is you).' : '.'}
                                </>
                            ) : (
                                <>
                                    All active sessions for <strong>{revokeTarget?.userName}</strong> will be ended.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRevoke} className="bg-red-600 hover:bg-red-700">
                            End session
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
