import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    FileText,
    Info,
    Megaphone,
    XCircle,
} from 'lucide-react';
import { Link } from '@inertiajs/react';

export interface NoticeItem {
    id: string;
    admin_notice_id?: number | null;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | string;
    link?: string | null;
    attachment_url?: string | null;
    attachment_name?: string | null;
    read_at?: string | null;
    created_at?: string | null;
}

interface NoticeQuickViewDialogProps {
    notice: NoticeItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TYPE_CONFIG: Record<
    string,
    { label: string; badgeClass: string; icon: React.ReactNode; headerBg: string; textAccent: string }
> = {
    info: {
        label: 'Information',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <Info className="h-4 w-4 text-blue-600" />,
        headerBg: 'from-blue-600 via-indigo-600 to-blue-700',
        textAccent: 'text-blue-600',
    },
    success: {
        label: 'Announcement',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        headerBg: 'from-emerald-600 via-teal-600 to-emerald-700',
        textAccent: 'text-emerald-600',
    },
    warning: {
        label: 'Notice & Advisory',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        headerBg: 'from-amber-600 via-orange-600 to-amber-700',
        textAccent: 'text-amber-600',
    },
    error: {
        label: 'Urgent Circular',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: <XCircle className="h-4 w-4 text-rose-600" />,
        headerBg: 'from-rose-600 via-red-600 to-rose-700',
        textAccent: 'text-rose-600',
    },
};

function formatNoticeDate(isoString?: string | null) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return isoString;
    }
}

export default function NoticeQuickViewDialog({
    notice,
    open,
    onOpenChange,
}: NoticeQuickViewDialogProps) {
    if (!notice) return null;

    const config = TYPE_CONFIG[notice.type] || TYPE_CONFIG.info;
    const formattedDate = formatNoticeDate(notice.created_at);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-slate-200 shadow-2xl rounded-2xl">
                {/* Header Banner */}
                <div className={`bg-gradient-to-r ${config.headerBg} p-5 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md text-white shadow-xs">
                            <Megaphone className="h-3 w-3" />
                            {config.label}
                        </span>
                        {formattedDate && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-white/80 font-medium">
                                <Clock className="h-3 w-3" />
                                {formattedDate}
                            </span>
                        )}
                    </div>

                    <DialogHeader className="text-left space-y-1">
                        <DialogTitle className="text-lg sm:text-xl font-bold leading-snug text-white tracking-tight">
                            {notice.title}
                        </DialogTitle>
                        <DialogDescription className="text-white/80 text-xs">
                            Broadcasted circular / administrative notification
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Body Content */}
                <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
                    {/* Notice Text */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap select-text">
                        {notice.message || '(No detailed message provided)'}
                    </div>

                    {/* Attachment preview / download if present */}
                    {notice.attachment_url && (
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                        {notice.attachment_name || 'Official Attachment'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">Click download to inspect file</p>
                                </div>
                            </div>
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="shrink-0 h-8 gap-1.5 text-xs text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                            >
                                <a
                                    href={notice.attachment_url}
                                    download={notice.attachment_name || true}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Download</span>
                                </a>
                            </Button>
                        </div>
                    )}

                    {/* Action link if present */}
                    {notice.link && (
                        <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-sky-200/80 bg-sky-50/50">
                            <p className="text-xs text-sky-900 font-medium truncate">
                                Related Resource Link Available
                            </p>
                            <Button
                                asChild
                                size="sm"
                                className="h-8 gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                            >
                                <a href={notice.link} target="_blank" rel="noopener noreferrer">
                                    <span>Visit Link</span>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    >
                        Close
                    </Button>

                    <div className="flex items-center gap-2">
                        {notice.id && !notice.id.startsWith('admin-notice-') && (
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 text-slate-700 hover:border-slate-300"
                            >
                                <Link href={`/my-notices/${notice.id}`}>
                                    <span>Full View</span>
                                </Link>
                            </Button>
                        )}
                        <Button
                            asChild
                            size="sm"
                            className="text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white"
                        >
                            <Link href="/my-notices">
                                <span>All Notices</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
