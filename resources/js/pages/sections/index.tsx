import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { ADMIN_SECTIONS, type AdminSectionId, storeSection } from '@/lib/admin-sections';
import { CheckCircle2, Lock, XCircle, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NotificationDropdown from '@/components/notification-dropdown';
import { hasAppPermission } from '@/lib/permissions';

// Curated themes for each module to create a vibrant, professional layout
const SECTION_THEMES: Record<string, {
    color: string;
    bg: string;
    border: string;
    text: string;
    hoverBorder: string;
    iconBg: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
}> = {
    'human-resources': {
        color: 'indigo',
        bg: 'bg-indigo-50/20',
        border: 'border-indigo-100',
        text: 'text-indigo-900',
        hoverBorder: 'hover:border-indigo-300',
        iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/20',
        badgeBg: 'bg-indigo-50 border border-indigo-200/50',
        badgeText: 'text-indigo-700',
        glow: 'hover:shadow-indigo-500/10',
    },
    'attendance-movement': {
        color: 'emerald',
        bg: 'bg-emerald-50/20',
        border: 'border-emerald-100',
        text: 'text-emerald-900',
        hoverBorder: 'hover:border-emerald-300',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20',
        badgeBg: 'bg-emerald-50 border border-emerald-200/50',
        badgeText: 'text-emerald-700',
        glow: 'hover:shadow-emerald-500/10',
    },
    'leave': {
        color: 'rose',
        bg: 'bg-rose-50/20',
        border: 'border-rose-100',
        text: 'text-rose-900',
        hoverBorder: 'hover:border-rose-300',
        iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/20',
        badgeBg: 'bg-rose-50 border border-rose-200/50',
        badgeText: 'text-rose-700',
        glow: 'hover:shadow-rose-500/10',
    },
    'employee-loan': {
        color: 'amber',
        bg: 'bg-amber-50/20',
        border: 'border-amber-100',
        text: 'text-amber-900',
        hoverBorder: 'hover:border-amber-300',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20',
        badgeBg: 'bg-amber-50 border border-amber-200/50',
        badgeText: 'text-amber-700',
        glow: 'hover:shadow-amber-500/10',
    },
    'staff-fund': {
        color: 'cyan',
        bg: 'bg-cyan-50/20',
        border: 'border-cyan-100',
        text: 'text-cyan-900',
        hoverBorder: 'hover:border-cyan-300',
        iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20',
        badgeBg: 'bg-cyan-50 border border-cyan-200/50',
        badgeText: 'text-cyan-700',
        glow: 'hover:shadow-cyan-500/10',
    },
    'payroll': {
        color: 'violet',
        bg: 'bg-violet-50/20',
        border: 'border-violet-100',
        text: 'text-violet-900',
        hoverBorder: 'hover:border-violet-300',
        iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20',
        badgeBg: 'bg-violet-50 border border-violet-200/50',
        badgeText: 'text-violet-700',
        glow: 'hover:shadow-violet-500/10',
    },
    'fixed-asset': {
        color: 'fuchsia',
        bg: 'bg-fuchsia-50/20',
        border: 'border-fuchsia-100',
        text: 'text-fuchsia-900',
        hoverBorder: 'hover:border-fuchsia-300',
        iconBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-fuchsia-500/20',
        badgeBg: 'bg-fuchsia-50 border border-fuchsia-200/50',
        badgeText: 'text-fuchsia-700',
        glow: 'hover:shadow-fuchsia-500/10',
    },
    'inventory': {
        color: 'sky',
        bg: 'bg-sky-50/20',
        border: 'border-sky-100',
        text: 'text-sky-900',
        hoverBorder: 'hover:border-sky-300',
        iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/20',
        badgeBg: 'bg-sky-50 border border-sky-200/50',
        badgeText: 'text-sky-700',
        glow: 'hover:shadow-sky-500/10',
    },
    'store': {
        color: 'blue',
        bg: 'bg-blue-50/20',
        border: 'border-blue-100',
        text: 'text-blue-900',
        hoverBorder: 'hover:border-blue-300',
        iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20',
        badgeBg: 'bg-blue-50 border border-blue-200/50',
        badgeText: 'text-blue-700',
        glow: 'hover:shadow-blue-500/10',
    },
    'recruitment': {
        color: 'teal',
        bg: 'bg-teal-50/20',
        border: 'border-teal-100',
        text: 'text-teal-900',
        hoverBorder: 'hover:border-teal-300',
        iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20',
        badgeBg: 'bg-teal-50 border border-teal-200/50',
        badgeText: 'text-teal-700',
        glow: 'hover:shadow-teal-500/10',
    },
    'training': {
        color: 'orange',
        bg: 'bg-orange-50/20',
        border: 'border-orange-100',
        text: 'text-orange-900',
        hoverBorder: 'hover:border-orange-300',
        iconBg: 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/20',
        badgeBg: 'bg-orange-50 border border-orange-200/50',
        badgeText: 'text-orange-700',
        glow: 'hover:shadow-orange-500/10',
    },
    'administration': {
        color: 'slate',
        bg: 'bg-slate-50/20',
        border: 'border-slate-100',
        text: 'text-slate-900',
        hoverBorder: 'hover:border-slate-400',
        iconBg: 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-600/20',
        badgeBg: 'bg-slate-50 border border-slate-200/50',
        badgeText: 'text-slate-700',
        glow: 'hover:shadow-slate-500/10',
    },
};

const getTheme = (id: string) => {
    return SECTION_THEMES[id] || {
        color: 'emerald',
        bg: 'bg-emerald-50/20',
        border: 'border-emerald-100',
        text: 'text-emerald-900',
        hoverBorder: 'hover:border-emerald-300',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20',
        badgeBg: 'bg-emerald-50 border border-emerald-200/50',
        badgeText: 'text-emerald-700',
        glow: 'hover:shadow-emerald-500/10',
    };
};

export default function SectionsIndex() {
    const { auth } = usePage().props as any;

    const handleSelect = (sectionId: AdminSectionId) => {
        storeSection(sectionId);
    };

    const employee = auth?.employee;
    const photoUrl = employee?.photo ? `/storage/${employee.photo}` : null;
    const name = auth?.user?.name || 'User';
    const email = auth?.user?.email || '';
    const getInitials = (fullName: string) =>
        String(fullName || '')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase();

    return (
        <div className="relative min-h-screen bg-slate-50/50 flex flex-col justify-between overflow-hidden">
            <Head title="ERP Modules" />

            {/* Glowing Accent Blobs for high-end SaaS feel */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/15 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/15 blur-[120px] pointer-events-none" />
            {/* Subtle dot matrix grid background overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            {/* Top Bar Header with Glassmorphism */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/80 shadow-xs shrink-0">
                <div className="w-full px-4 sm:px-6">
                    <div className="h-12 sm:h-14 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <img src="/logo.png" alt="Logo" className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl shrink-0 shadow-sm border border-slate-100" />
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-tight">Mousumi ERP</p>
                                <p className="hidden min-[360px]:block text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Control Center</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <NotificationDropdown />
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-emerald-200 shadow-inner hover:scale-105 transition-transform duration-200 cursor-pointer">
                                            <AvatarImage src={photoUrl || ''} alt={name} />
                                            <AvatarFallback className="bg-emerald-600 text-white text-[10px] sm:text-xs font-semibold">
                                                {getInitials(name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-slate-900 text-white p-2 rounded-lg shadow-xl border border-slate-800">
                                        <p className="text-xs font-semibold">{name}</p>
                                        {email && <p className="text-[10px] text-slate-400 mt-0.5">{email}</p>}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:translate-y-[1px] transition-all"
                            >
                                Logout
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Sections Grid */}
            <main className="flex-1 flex flex-col items-center justify-center px-3 py-4 sm:px-6 sm:py-8 max-w-5xl mx-auto w-full relative z-10">
                
                {/* Hero Header */}
                <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/50 rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-800 mb-2 shadow-xs">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>Interactive Dashboard Selector</span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        Select an ERP Module
                    </h2>
                </div>

                {/* Main Card Grid - Multi-column compact grid fitting on 1 screen */}
                <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 place-items-center">
                    {ADMIN_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const moduleActive = Boolean(section.href);
                        const hasAccess = (() => {
                            switch (section.id) {
                                case 'human-resources':
                                    return (
                                        hasAppPermission(auth, 'employees.view') ||
                                        hasAppPermission(auth, 'transfers.view') ||
                                        hasAppPermission(auth, 'holidays.view') ||
                                        hasAppPermission(auth, 'branches.view') ||
                                        hasAppPermission(auth, 'departments.view') ||
                                        hasAppPermission(auth, 'designations.view') ||
                                        hasAppPermission(auth, 'attendance.admin') ||
                                        hasAppPermission(auth, 'employees.admin') ||
                                        hasAppPermission(auth, 'admin.access')
                                    );
                                case 'attendance-movement':
                                    return hasAppPermission(auth, 'attendance.view') || hasAppPermission(auth, 'movements.view');
                                case 'leave':
                                    return hasAppPermission(auth, 'leave-applications.view') || hasAppPermission(auth, 'leaves.view');
                                case 'administration':
                                    return (
                                        hasAppPermission(auth, 'admin.access') ||
                                        hasAppPermission(auth, 'users.view') ||
                                        hasAppPermission(auth, 'roles.view') ||
                                        hasAppPermission(auth, 'reports.view')
                                    );
                                case 'payroll':
                                    return (
                                        hasAppPermission(auth, 'payroll.view') ||
                                        hasAppPermission(auth, 'admin.access')
                                    );
                                case 'fixed-asset':
                                    return (
                                        hasAppPermission(auth, 'fixed-assets.view') ||
                                        hasAppPermission(auth, 'fixed-assets.create') ||
                                        hasAppPermission(auth, 'fixed-assets.edit') ||
                                        hasAppPermission(auth, 'admin.access')
                                    );
                                case 'staff-fund':
                                    return (
                                        hasAppPermission(auth, 'payroll.view') ||
                                        hasAppPermission(auth, 'admin.access')
                                    );
                                default:
                                    return false;
                            }
                        })();

                        const enabled = moduleActive && hasAccess;
                        const theme = getTheme(section.id);
                        const commonCardClasses = "group relative select-none rounded-xl sm:rounded-2xl border p-2 sm:p-3 flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 transition-all duration-300 ease-out will-change-transform w-full bg-white/90 hover:bg-white border-slate-200/80 shadow-xs hover:-translate-y-1 hover:shadow-md max-w-[110px] sm:max-w-none aspect-square sm:aspect-auto sm:min-h-[120px] md:min-h-[140px]";

                        return enabled ? (
                            <Link
                                key={section.id}
                                href={`${section.href}?section=${section.id}`}
                                onClick={() => handleSelect(section.id)}
                                className={`${commonCardClasses} ${theme.bg} ${theme.border} ${theme.hoverBorder} ${theme.glow}`}
                            >
                                {/* Top-right Indicator */}
                                <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10">
                                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 bg-white rounded-full" />
                                </div>

                                {/* Highlighted Bold Icon Container */}
                                <div className={`h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-xl sm:rounded-2xl ${theme.iconBg} text-white flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105 shrink-0`}>
                                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" strokeWidth={2.5} />
                                </div>

                                {/* Title */}
                                <p className="text-[8px] min-[360px]:text-[9px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider leading-tight line-clamp-2 mt-1">
                                    {section.title}
                                </p>
                            </Link>
                        ) : moduleActive && !hasAccess ? (
                            <TooltipProvider key={section.id} delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={`${commonCardClasses} ${theme.bg} ${theme.border} opacity-50 cursor-not-allowed`}>
                                            <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10">
                                                <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 bg-white rounded-full shadow-sm" />
                                            </div>
                                            <div className={`h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-xl sm:rounded-2xl ${theme.iconBg} text-white flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105 shrink-0`}>
                                                <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" strokeWidth={2.5} />
                                            </div>
                                            <p className="text-[8px] min-[360px]:text-[9px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider leading-tight line-clamp-2 mt-1">
                                                {section.title}
                                            </p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-slate-900 text-white p-2 rounded-lg shadow-xl border border-slate-800">
                                        <p className="text-xs font-semibold">Permission required</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Ask your system administrator for access.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <div
                                key={section.id}
                                className={`${commonCardClasses} border-slate-200/60 bg-slate-100/30 opacity-60 cursor-not-allowed`}
                            >
                                <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10">
                                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 bg-white rounded-full" />
                                </div>
                                <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-xl sm:rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" strokeWidth={2.0} />
                                </div>
                                <p className="text-[8px] min-[360px]:text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight line-clamp-2 mt-1">
                                    {section.title}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Footer with small imprint info */}
            <footer className="py-2 text-center text-[9px] sm:text-[10px] text-slate-400 shrink-0 border-t border-slate-100 bg-white/40">
                &copy; 2026 Mousumi ERP. All rights reserved.
            </footer>
        </div>
    );
}



