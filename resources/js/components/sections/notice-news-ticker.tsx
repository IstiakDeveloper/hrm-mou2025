import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import axios from 'axios';
import {
    Megaphone,
    ArrowRight,
    Radio,
    Clock,
    Pause,
    Play,
    Sparkles,
} from 'lucide-react';
import NoticeQuickViewDialog, { NoticeItem } from './notice-quick-view-dialog';

interface NoticeNewsTickerProps {
    notices: NoticeItem[];
}

const TYPE_TAGS: Record<string, { label: string; bg: string; text: string; border: string }> = {
    info: {
        label: 'INFO',
        bg: 'bg-blue-500/10',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-500/25',
    },
    success: {
        label: 'NEWS',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/25',
    },
    warning: {
        label: 'NOTICE',
        bg: 'bg-amber-500/10',
        text: 'text-amber-800 dark:text-amber-400',
        border: 'border-amber-500/25',
    },
    error: {
        label: 'URGENT',
        bg: 'bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/25',
    },
};

function formatRelativeTime(dateString?: string | null) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
            return `${diffMinutes}m ago`;
        }
        if (diffHours < 24) {
            return `${diffHours}h ago`;
        }
        if (diffDays === 1) {
            return 'Yesterday';
        }
        return `${diffDays}d ago`;
    } catch {
        return '';
    }
}

export default function NoticeNewsTicker({ notices = [] }: NoticeNewsTickerProps) {
    if (!notices || notices.length === 0) {
        return null;
    }

    const [items, setItems] = useState<NoticeItem[]>(notices);
    const [isPaused, setIsPaused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [activeModalNotice, setActiveModalNotice] = useState<NoticeItem | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        setItems(notices);
    }, [notices]);

    const handleOpenNotice = async (notice: NoticeItem) => {
        setActiveModalNotice(notice);
        setModalOpen(true);

        // Mark as read in background if unread and is a user notification
        if (!notice.read_at && notice.id && !notice.id.startsWith('admin-notice-')) {
            try {
                await axios.post(`/notifications/${notice.id}/mark-as-read`);
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === notice.id
                            ? { ...item, read_at: new Date().toISOString() }
                            : item
                    )
                );
            } catch (err) {
                console.error('Failed to mark notice as read:', err);
            }
        }
    };

    // Calculate dynamic animation duration based on total text length so crawl speed feels natural
    const totalChars = items.reduce((acc, it) => acc + (it.title?.length || 20), 0);
    const durationSeconds = Math.max(25, Math.min(60, totalChars * 0.4));

    // Duplicate list items to create a seamless infinite loop
    const duplicatedItems = items.length === 1 
        ? [...items, ...items, ...items, ...items] 
        : [...items, ...items];

    const animationRunning = !isPaused && !isHovered;

    return (
        <>
            {/* Inline CSS Keyframes for Smooth Right-to-Left News Marquee */}
            <style>{`
                @keyframes marqueeScroll {
                    0% {
                        transform: translate3d(0, 0, 0);
                    }
                    100% {
                        transform: translate3d(-50%, 0, 0);
                    }
                }
                .news-marquee-track {
                    display: inline-flex;
                    white-space: nowrap;
                    will-change: transform;
                    animation: marqueeScroll ${durationSeconds}s linear infinite;
                }
                .news-marquee-paused {
                    animation-play-state: paused !important;
                }
            `}</style>

            <div className="w-full mb-4 group relative">
                {/* News Marquee Outer Frame with SaaS Glassmorphism */}
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-slate-300 hover:shadow-sm overflow-hidden">
                    
                    {/* Fixed Left Live Badge (TV Breaking News Style) */}
                    <div className="shrink-0 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-xs shadow-red-500/25 select-none">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                        </span>
                        <Radio className="h-3 w-3" />
                        <span className="hidden min-[420px]:inline">News Flash</span>
                        <span className="min-[420px]:hidden">News</span>
                    </div>

                    {/* Scrolling Marquee Viewport with Left/Right Soft Gradient Fade */}
                    <div
                        className="relative flex-1 overflow-hidden select-none py-0.5 min-w-0"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Soft Fade Masks on Edges */}
                        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white/90 to-transparent z-10" />
                        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/90 to-transparent z-10" />

                        {/* Continuous Moving Track */}
                        <div
                            className={`news-marquee-track ${!animationRunning ? 'news-marquee-paused' : ''}`}
                        >
                            {duplicatedItems.map((notice, index) => {
                                const typeMeta = TYPE_TAGS[notice.type] || TYPE_TAGS.info;
                                const isUnread = !notice.read_at;
                                const timeDisplay = formatRelativeTime(notice.created_at);

                                return (
                                    <div
                                        key={`${notice.id}-${index}`}
                                        className="inline-flex items-center gap-2.5 mx-3 sm:mx-4"
                                    >
                                        {/* Clickable News Headline */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenNotice(notice)}
                                            className="inline-flex items-center gap-2 text-left cursor-pointer group/item focus:outline-hidden py-1 px-1.5 rounded-lg hover:bg-slate-100/80 transition-colors"
                                            title="Click to view notice details"
                                        >
                                            {/* Category Tag */}
                                            <span
                                                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border tracking-wider leading-none ${typeMeta.bg} ${typeMeta.text} ${typeMeta.border}`}
                                            >
                                                {typeMeta.label}
                                            </span>

                                            {/* Headline Text */}
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover/item:text-rose-600 transition-colors">
                                                {notice.title}
                                            </span>

                                            {/* NEW Badge if unread */}
                                            {isUnread && (
                                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[8px] font-extrabold bg-rose-500 text-white tracking-wider shadow-xs shadow-rose-500/40 animate-pulse">
                                                    NEW
                                                </span>
                                            )}

                                            {/* Relative Time */}
                                            {timeDisplay && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {timeDisplay}
                                                </span>
                                            )}
                                        </button>

                                        {/* Divider Sparkle between notices */}
                                        <span className="text-rose-400 text-xs font-bold opacity-60 select-none">
                                            ✦
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Fixed Right Controls: Pause/Play + All Notices Link */}
                    <div className="shrink-0 z-20 flex items-center gap-1.5 sm:gap-2 pl-1 bg-white/70 backdrop-blur-xs">
                        {/* Pause / Play Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setIsPaused((prev) => !prev)}
                            className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isPaused ? 'Resume scrolling' : 'Pause scrolling'}
                        >
                            {isPaused ? (
                                <Play className="h-3 w-3 fill-slate-500" />
                            ) : (
                                <Pause className="h-3 w-3 fill-slate-500" />
                            )}
                        </button>

                        <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />

                        {/* All Notices Link */}
                        <Link
                            href="/my-notices"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors shrink-0 px-1 py-0.5"
                            title="Go to Notices Center"
                        >
                            <span className="hidden min-[480px]:inline">All Notices</span>
                            <span className="min-[480px]:hidden">All</span>
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick View Dialog */}
            <NoticeQuickViewDialog
                notice={activeModalNotice}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </>
    );
}
