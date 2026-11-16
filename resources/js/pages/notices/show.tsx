import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    ExternalLink,
    Info,
    Megaphone,
    Paperclip,
    XCircle,
} from 'lucide-react';

interface Notice {
    id: string;
    title: string;
    message: string;
    type: string;
    link: string | null;
    attachment_url: string | null;
    attachment_name: string | null;
    read_at: string | null;
    created_at: string;
}

interface ShowProps {
    notice: Notice;
}

const TYPE_META: Record<string, { label: string; className: string; icon: JSX.Element; header: string }> = {
    info: {
        label: 'Information',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <Info className="h-4 w-4" />,
        header: 'from-blue-500 to-blue-600',
    },
    success: {
        label: 'Success',
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle2 className="h-4 w-4" />,
        header: 'from-green-500 to-green-600',
    },
    warning: {
        label: 'Warning',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <AlertTriangle className="h-4 w-4" />,
        header: 'from-amber-500 to-amber-600',
    },
    error: {
        label: 'Important',
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-4 w-4" />,
        header: 'from-red-500 to-red-600',
    },
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

export default function MyNoticeShow({ notice }: ShowProps) {
    const meta = TYPE_META[notice.type] ?? TYPE_META.info;

    return (
        <Layout>
            <Head title={notice.title} />

            <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
                <div className="flex items-center gap-3">
                    <Link href={route('my-notices.index')}>
                        <Button type="button" variant="outline" size="icon" aria-label="Back to notices">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
                            <Megaphone className="h-6 w-6 text-green-600" />
                            Notice
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Received on {formatDateTime(notice.created_at)}
                        </p>
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${meta.header}`} />

                    <CardHeader className="space-y-3 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${meta.className}`}
                            >
                                {meta.icon}
                                {meta.label}
                            </span>
                            {notice.read_at ? (
                                <span className="text-xs text-muted-foreground">
                                    Read on {formatDateTime(notice.read_at)}
                                </span>
                            ) : (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                                    New
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold leading-tight text-gray-900">{notice.title}</h2>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
                            {notice.message}
                        </div>

                        {notice.link && (
                            <div className="mt-4 rounded-md border border-dashed bg-muted/30 p-3">
                                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                                    Linked resource
                                </p>
                                <a
                                    href={notice.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 break-all text-sm text-blue-600 hover:underline"
                                >
                                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                    {notice.link}
                                </a>
                            </div>
                        )}

                        {notice.attachment_url && (
                            <div className="mt-4 rounded-md border border-dashed bg-green-50/60 p-3">
                                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                                    Attachment
                                </p>
                                <a
                                    href={notice.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={notice.attachment_name ?? undefined}
                                    className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline"
                                >
                                    <Paperclip className="h-4 w-4" />
                                    {notice.attachment_name ?? 'Download file'}
                                    <Download className="h-4 w-4" />
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-between">
                    <Link href={route('my-notices.index')}>
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to list
                        </Button>
                    </Link>
                    {notice.link && (
                        <a href={notice.link} target="_blank" rel="noopener noreferrer">
                            <Button className="gap-2 bg-green-600 hover:bg-green-700">
                                Open link
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </a>
                    )}
                </div>
            </div>
        </Layout>
    );
}
