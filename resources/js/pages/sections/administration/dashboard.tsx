import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Bell,
    History,
    KeyRound,
    Megaphone,
    Monitor,
    Send,
    Settings,
    Shield,
    ShieldAlert,
    ShieldCheck,
    UserPlus,
    Users,
    CheckCircle2,
    Clock,
    Lock,
    UserCheck,
    FileText,
    Sparkles,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { SectionSubNav, ADMINISTRATION_NAV_ITEMS } from '@/components/sections/section-sub-nav';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type RecentUser = {
    id: number;
    name: string;
    email: string;
    role_name?: string;
    employee_pin?: string | null;
    created_at: string | null;
};

type RecentActivity = {
    id: number;
    description: string;
    log_name?: string;
    causer_name: string;
    created_at: string;
};

type RecentNotice = {
    id: number;
    title: string;
    type: string;
    audience: string;
    recipient_count: number;
    created_at: string;
};

type Props = {
    userCount: number;
    roleCount: number;
    activityCount?: number;
    recentUsers: RecentUser[];
    recentActivities?: RecentActivity[];
    recentNotices?: RecentNotice[];
    userRole: string;
    sessionStats: {
        active_sessions: number;
        active_users: number;
    };
};

const section = '?section=administration';

function NavTile({
    href,
    title,
    badge,
    icon: Icon,
    color = 'slate',
}: {
    href: string;
    title: string;
    badge?: number | string | null;
    icon: LucideIcon;
    color?: 'emerald' | 'indigo' | 'slate' | 'amber' | 'violet';
}) {
    const colorStyles = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 group-hover:bg-emerald-100/70',
        indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15 group-hover:bg-indigo-100/70',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15 group-hover:bg-violet-100/70',
        amber: 'bg-amber-50 text-amber-700 ring-amber-600/15 group-hover:bg-amber-100/70',
        slate: 'bg-slate-100 text-slate-700 ring-slate-200/80 group-hover:bg-slate-200/60',
    };

    return (
        <Link
            href={href}
            className="group relative flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 text-xs font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
        >
            <span className={cn('grid h-8.5 w-8.5 shrink-0 place-items-center rounded-lg ring-1 transition-colors', colorStyles[color])}>
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">{title}</span>
            {badge !== undefined && badge !== null && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
                    {badge}
                </span>
            )}
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-600" />
        </Link>
    );
}

export default function AdministrationDashboard({
    userCount,
    roleCount,
    activityCount = 0,
    recentUsers = [],
    recentActivities = [],
    recentNotices = [],
    userRole,
    sessionStats,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);

    return (
        <Layout>
            <Head title="Administration & Governance" />

            <PageSurface className="max-w-7xl bg-slate-50/50 py-5 px-3 sm:px-5 space-y-6">
                {/* Executive Command Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white shadow-2xs">
                                <ShieldCheck className="h-4.5 w-4.5" />
                            </span>
                            <h1 className="text-base font-bold tracking-tight text-slate-900 md:text-lg">
                                Administration & System Governance
                            </h1>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                {userRole || 'User'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Security Monitored
                            </span>
                            <span>· Identity, access control, audit trail & company communications</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {hasPermission('users.create') && (
                            <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer">
                                <Link href={`/admin/users/create${section}`}>
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add User
                                </Link>
                            </Button>
                        )}
                        {hasPermission('admin.access') && (
                            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
                                <Link href={`/admin/notices/create${section}`}>
                                    <Megaphone className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Send Notice
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
                            <Link href="/sections">Sections</Link>
                        </Button>
                    </div>
                </div>

                {/* Sub-Navigation Ribbon */}
                <div>
                    <SectionSubNav items={ADMINISTRATION_NAV_ITEMS} />
                </div>

                {/* IAM & Security Telemetry (4 Executive KPI Cards) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* 1. Total Accounts */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                System Accounts
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Users className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                                {userCount}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">users</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>IAM Directory</span>
                            <Link href={`/admin/users${section}`} className="font-semibold text-indigo-600 hover:underline">
                                Browse Directory →
                            </Link>
                        </div>
                    </div>

                    {/* 2. Active Sessions */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Active Sessions
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <Monitor className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                                {sessionStats?.active_users ?? 0}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">online</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>{sessionStats?.active_sessions ?? 0} active logins</span>
                            <Link href={`/admin/sessions${section}`} className="font-semibold text-emerald-700 hover:underline">
                                Monitor Sessions →
                            </Link>
                        </div>
                    </div>

                    {/* 3. Roles & Permissions */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                RBAC Roles
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
                                <KeyRound className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                                {roleCount}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">roles defined</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Permission Matrices</span>
                            <Link href={`/admin/roles${section}`} className="font-semibold text-violet-700 hover:underline">
                                Configure Roles →
                            </Link>
                        </div>
                    </div>

                    {/* 4. Audit Trail Activity */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Audit Events (30d)
                            </span>
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <Activity className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                                {activityCount}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">events</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Spatie ActivityLog</span>
                            <Link href={`/admin/activity-logs${section}`} className="font-semibold text-blue-700 hover:underline">
                                View Logs →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 5-Stage Governance Lifecycle Pipeline */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                System Governance & Security Pipeline
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Core lifecycle of administrative control, permission enforcement, and auditability
                            </p>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                            Framework: <strong>RBAC + Session Guard</strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 text-xs">
                        {/* Step 1: User Onboarding */}
                        <Link
                            href={`/admin/users${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1</span>
                                <UserPlus className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="mt-2 font-bold text-slate-800 group-hover:text-indigo-700">
                                Account Creation
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">
                                Staff Linking & Credentials
                            </div>
                        </Link>

                        {/* Step 2: Role Assignment */}
                        <Link
                            href={`/admin/roles${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 2</span>
                                <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="mt-2 font-bold text-slate-800 group-hover:text-indigo-700">
                                RBAC Roles
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">
                                Grant Granular Privileges
                            </div>
                        </Link>

                        {/* Step 3: Session Monitoring */}
                        <Link
                            href={`/admin/sessions${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Step 3</span>
                                <Monitor className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <div className="mt-2 font-bold text-emerald-950">
                                Session Guard
                            </div>
                            <div className="mt-1 text-[10px] text-emerald-800">
                                Real-Time Concurrent Logins
                            </div>
                        </Link>

                        {/* Step 4: Audit Trail */}
                        <Link
                            href={`/admin/activity-logs${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-blue-200/90 bg-blue-50/40 p-3 transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Step 4</span>
                                <Activity className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div className="mt-2 font-bold text-blue-950">
                                Audit Trail
                            </div>
                            <div className="mt-1 text-[10px] text-blue-800">
                                Forensic Change Logs
                            </div>
                        </Link>

                        {/* Step 5: Broadcast Notices */}
                        <Link
                            href={`/admin/notices${section}`}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 5</span>
                                <Megaphone className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="mt-2 font-bold text-slate-800 group-hover:text-indigo-700">
                                Notices & Policy
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">
                                Company-Wide Circulars
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Dual Operational Cockpit: Recent Users & Live Audit Activity Stream */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Left: Recent User Directory Queue */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                    Recent User Accounts
                                </h3>
                            </div>
                            {hasPermission('users.view') && (
                                <Link
                                    href={`/admin/users${section}`}
                                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                                >
                                    Browse all users →
                                </Link>
                            )}
                        </div>

                        {recentUsers.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                No user accounts found.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentUsers.map((u) => (
                                    <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-lg px-2 transition-colors">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/admin/users/${u.id}/edit${section}`}
                                                    className="font-semibold text-slate-900 text-xs hover:text-indigo-600 truncate block"
                                                >
                                                    {u.name}
                                                </Link>
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                                    {u.role_name || 'User'}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {u.email} {u.employee_pin ? `· PIN: ${u.employee_pin}` : ''}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-[10px] text-slate-400 block tabular-nums">
                                                {u.created_at}
                                            </span>
                                            <Link
                                                href={`/admin/users/${u.id}/edit${section}`}
                                                className="text-[11px] font-semibold text-indigo-600 hover:underline"
                                            >
                                                Manage
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Real-Time Audit Activity Feed */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-blue-600" />
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                    Real-Time Audit Activity Feed
                                </h3>
                            </div>
                            {hasPermission('admin.access') && (
                                <Link
                                    href={`/admin/activity-logs${section}`}
                                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                                >
                                    Full audit log →
                                </Link>
                            )}
                        </div>

                        {recentActivities.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                No recent activity log entries found.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentActivities.map((act) => (
                                    <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 rounded-lg px-2 transition-colors">
                                        <div className="min-w-0 flex items-start gap-2.5">
                                            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                <Activity className="h-3 w-3" />
                                            </span>
                                            <div>
                                                <span className="text-xs font-medium text-slate-800 block leading-snug">
                                                    {act.description}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    By <strong className="text-slate-600">{act.causer_name}</strong> {act.log_name ? `· ${act.log_name}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">
                                            {act.created_at}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Broadcast Sentinel: Company Notices Radar */}
                {recentNotices.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-4 w-4 text-amber-600" />
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                    Company Broadcasts & Notices
                                </h3>
                            </div>
                            {hasPermission('admin.access') && (
                                <Link
                                    href={`/admin/notices${section}`}
                                    className="text-[11px] font-semibold text-amber-700 hover:underline"
                                >
                                    Manage all notices →
                                </Link>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {recentNotices.map((n) => (
                                <div key={n.id} className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="rounded-md bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200 uppercase">
                                                {n.type}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{n.created_at}</span>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                                            {n.title}
                                        </h4>
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                                        <span>Audience: <strong className="text-slate-700 capitalize">{n.audience}</strong></span>
                                        <span className="font-semibold text-amber-700">{n.recipient_count} recipients</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Categorized Bento Grid Hub */}
                <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                        Administration & Governance Modules
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* 1. Identity & Access Management (IAM) */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                                        <Users className="h-4 w-4" />
                                    </span>
                                    <h3 className="text-xs font-bold text-slate-900">Identity & Access (IAM)</h3>
                                </div>
                                <div className="space-y-2">
                                    {hasPermission('users.view') && (
                                        <NavTile href={`/admin/users${section}`} title="User Directory" badge={userCount} icon={Users} color="indigo" />
                                    )}
                                    {hasPermission('roles.view') && (
                                        <NavTile href={`/admin/roles${section}`} title="Roles & Permissions" badge={roleCount} icon={KeyRound} color="indigo" />
                                    )}
                                    {hasPermission('users.view') && (
                                        <NavTile href={`/admin/sessions${section}`} title="Active Sessions" badge={sessionStats?.active_users} icon={Monitor} color="indigo" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. System Governance & Compliance */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-700">
                                        <Shield className="h-4 w-4" />
                                    </span>
                                    <h3 className="text-xs font-bold text-slate-900">Governance & Audit</h3>
                                </div>
                                <div className="space-y-2">
                                    {hasPermission('admin.access') && (
                                        <NavTile href={`/admin/activity-logs${section}`} title="Activity Logs & Audit" badge={activityCount} icon={History} color="slate" />
                                    )}
                                    {hasPermission('admin.access') && (
                                        <NavTile href="/movement-penalties" title="Movement Penalties" icon={ShieldAlert} color="slate" />
                                    )}
                                    {hasPermission('reports.view') && (
                                        <NavTile href={`/reports/administration${section}`} title="Administration Report" icon={BarChart3} color="slate" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Internal Communications */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                                        <Megaphone className="h-4 w-4" />
                                    </span>
                                    <h3 className="text-xs font-bold text-slate-900">Broadcasts & Notices</h3>
                                </div>
                                <div className="space-y-2">
                                    {hasPermission('admin.access') && (
                                        <NavTile href={`/admin/notices${section}`} title="Company Notices" icon={Megaphone} color="amber" />
                                    )}
                                    {hasPermission('admin.access') && (
                                        <NavTile href={`/admin/notices/create${section}`} title="Broadcast New Notice" icon={Send} color="amber" />
                                    )}
                                    <NavTile href={`/settings/notifications${section}`} title="Notification Settings" icon={Bell} color="amber" />
                                </div>
                            </div>
                        </div>

                        {/* 4. Platform Settings */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                                        <Settings className="h-4 w-4" />
                                    </span>
                                    <h3 className="text-xs font-bold text-slate-900">Platform Settings</h3>
                                </div>
                                <div className="space-y-2">
                                    <NavTile href={`/settings/profile${section}`} title="Administrator Profile" icon={Settings} color="emerald" />
                                    <NavTile href="/sections" title="HRM Sections Switcher" icon={ShieldCheck} color="emerald" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
