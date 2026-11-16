import Layout from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BellRing,
    CheckCircle2,
    Download,
    ExternalLink,
    Info,
    Megaphone,
    Paperclip,
    Users,
    XCircle,
} from 'lucide-react';

interface Sender {
    id: number;
    name: string;
    email: string;
}

interface Department {
    id: number;
    name: string;
}

interface UserRow {
    id: number;
    name: string;
    email: string;
}

interface Notice {
    id: number;
    title: string;
    message: string;
    type: string;
    link: string | null;
    attachment_path: string | null;
    attachment_original_name: string | null;
    attachment_url: string | null;
    audience: string;
    department_ids: number[] | null;
    user_ids: number[] | null;
    recipient_count: number;
    push_sent: boolean;
    created_at: string;
    sender: Sender | null;
}

interface ShowProps {
    notice: Notice;
    departments: Department[];
    users: UserRow[];
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

const AUDIENCE_LABEL: Record<string, string> = {
    all: 'All active users',
    departments: 'Users in selected departments',
    users: 'Selected users only',
};

function formatDateTime(s: string) {
    try {
        const d = new Date(s);
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return s;
    }
}

export default function AdminNoticeShow({ notice, departments, users }: ShowProps) {
    const typeMeta = TYPE_META[notice.type] ?? TYPE_META.info;

    return (
        <Layout>
            <Head title={`Notice · ${notice.title}`} />

            <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={route('admin.notices.index')}>
                            <Button type="button" variant="outline" size="icon" aria-label="Back">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                                <Megaphone className="h-7 w-7 text-green-600" />
                                Notice details
                            </h1>
                            <p className="text-sm text-gray-600">Sent on {formatDateTime(notice.created_at)}</p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${typeMeta.className}`}
                                >
                                    {typeMeta.icon}
                                    {typeMeta.label}
                                </span>
                                {notice.push_sent && (
                                    <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                        <BellRing className="h-3.5 w-3.5" />
                                        Push sent
                                    </span>
                                )}
                            </div>
                            <CardTitle className="text-xl">{notice.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{notice.message}</p>
                        {notice.link && (
                            <a
                                href={notice.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                                <ExternalLink className="h-4 w-4" />
                                {notice.link}
                            </a>
                        )}
                        {notice.attachment_url && (
                            <a
                                href={notice.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={notice.attachment_original_name ?? undefined}
                                className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm font-medium text-green-700 hover:bg-muted/50"
                            >
                                <Paperclip className="h-4 w-4" />
                                {notice.attachment_original_name ?? 'Download attachment'}
                                <Download className="h-4 w-4" />
                            </a>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-5 w-5 text-green-600" />
                                Delivery summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Audience</span>
                                <span className="font-medium">{AUDIENCE_LABEL[notice.audience] ?? notice.audience}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Recipients</span>
                                <span className="font-medium">{notice.recipient_count}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Push delivery</span>
                                <span className={`font-medium ${notice.push_sent ? 'text-green-700' : 'text-gray-500'}`}>
                                    {notice.push_sent ? 'Dispatched' : 'Not sent (VAPID not configured)'}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Sent by</span>
                                <span className="font-medium">
                                    {notice.sender ? (
                                        <span className="flex flex-col text-right">
                                            <span>{notice.sender.name}</span>
                                            <span className="text-xs text-muted-foreground">{notice.sender.email}</span>
                                        </span>
                                    ) : (
                                        'System'
                                    )}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Targeted groups</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {notice.audience === 'all' && (
                                <p className="text-sm text-muted-foreground">
                                    This notice was sent to every active user.
                                </p>
                            )}

                            {notice.audience === 'departments' && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Departments targeted ({departments.length}):
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {departments.length === 0 ? (
                                            <span className="text-sm text-muted-foreground">—</span>
                                        ) : (
                                            departments.map((d) => (
                                                <Badge key={d.id} variant="secondary">
                                                    {d.name}
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {notice.audience === 'users' && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Users targeted ({users.length}):
                                    </p>
                                    <div className="max-h-60 space-y-1 overflow-y-auto rounded border p-2">
                                        {users.length === 0 ? (
                                            <span className="text-sm text-muted-foreground">—</span>
                                        ) : (
                                            users.map((u) => (
                                                <div
                                                    key={u.id}
                                                    className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50"
                                                >
                                                    <span className="font-medium text-gray-900">{u.name}</span>
                                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
