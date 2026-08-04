import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowUpRight,
    BarChart3,
    Bell,
    KeyRound,
    Megaphone,
    Monitor,
    Send,
    Settings,
    Shield,
    ShieldAlert,
    UserPlus,
    Users,
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import { type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type RecentUser = {
    id: number;
    name: string;
    email: string;
    created_at: string | null;
};

type Props = {
    userCount: number;
    roleCount: number;
    recentUsers: RecentUser[];
    userRole: string;
    sessionStats: {
        active_sessions: number;
        active_users: number;
    };
};

const kpiGrid = 'grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
const shortcutGrid = 'grid grid-cols-1 min-[320px]:grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

function KpiCard({
    label,
    value,
    sub,
    href,
    icon: Icon,
    accent = 'violet',
}: {
    label: string;
    value: number;
    sub?: string;
    href?: string;
    icon: LucideIcon;
    accent?: 'emerald' | 'sky' | 'violet' | 'zinc';
}) {
    const accentBar = {
        emerald: 'from-emerald-500 to-teal-500',
        sky: 'from-sky-500 to-blue-600',
        violet: 'from-violet-500 to-indigo-600',
        zinc: 'from-zinc-400 to-zinc-600',
    }[accent];

    const iconBg = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
        sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
        violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
        zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-500/10',
    }[accent];

    const inner = (
        <div
            className={cn(
                'group relative flex min-h-[5.25rem] flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm',
                'transition-all duration-200 hover:border-zinc-300 hover:shadow-md',
                href && 'cursor-pointer',
            )}
        >
            <div className={cn('absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b', accentBar)} />
            <div className="flex items-start justify-between gap-2 pl-1">
                <div className={cn('rounded-lg p-1.5 ring-1 ring-inset', iconBg)}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                {href ? (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-violet-600" />
                ) : null}
            </div>
            <p className="mt-2 pl-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="pl-1 text-xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-2xl">
                {Number(value || 0).toLocaleString()}
            </p>
            {sub ? <p className="mt-auto pl-1 pt-1 text-[10px] leading-tight text-zinc-500">{sub}</p> : null}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
                {inner}
            </Link>
        );
    }
    return inner;
}

function ShortcutTile({ href, title, icon: Icon }: { href: string; title: string; icon: LucideIcon }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50/50 hover:text-violet-950"
        >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80">
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">{title}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </Link>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{children}</h2>;
}

export default function AdministrationDashboard({ userCount, roleCount, recentUsers, userRole, sessionStats }: Props) {
    const { auth } = usePage<SharedData>().props;
    const hasPermission = (permission?: string): boolean => hasAppPermission(auth, permission);

    return (
        <Layout>
            <Head title="Administration" />

            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6 px-3 sm:px-4">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Administration</h1>
                        <p className="text-xs text-zinc-500">
                            {userRole || 'User'} · {auth?.user?.name}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs border-zinc-200 bg-white">
                            <Link href="/sections">Sections</Link>
                        </Button>
                        {hasPermission('users.create') && (
                            <Button asChild size="sm" className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-violet-600 text-white hover:bg-violet-700">
                                <Link href="/admin/users/create?section=administration">
                                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                                    Add user
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <section className="mb-6">
                    <SectionLabel>Directory</SectionLabel>
                    <div className={kpiGrid}>
                        {hasPermission('users.view') && (
                            <KpiCard
                                label="Users"
                                value={userCount}
                                href="/admin/users?section=administration"
                                icon={Users}
                                accent="violet"
                            />
                        )}
                        {hasPermission('roles.view') && (
                            <KpiCard
                                label="Roles"
                                value={roleCount}
                                href="/admin/roles?section=administration"
                                icon={KeyRound}
                                accent="zinc"
                            />
                        )}
                        {hasPermission('users.view') && (
                            <KpiCard
                                label="Active sessions"
                                value={sessionStats?.active_users ?? 0}
                                sub={`${sessionStats?.active_sessions ?? 0} login(s)`}
                                href="/admin/sessions?section=administration"
                                icon={Monitor}
                                accent="sky"
                            />
                        )}
                    </div>
                </section>

                <section className="mb-6">
                    <SectionLabel>Quick actions</SectionLabel>
                    <div className={shortcutGrid}>
                        {hasPermission('users.view') && (
                            <ShortcutTile href="/admin/users?section=administration" title="Manage users" icon={Users} />
                        )}
                        {hasPermission('users.view') && (
                            <ShortcutTile href="/admin/sessions?section=administration" title="Active sessions" icon={Monitor} />
                        )}
                        {hasPermission('roles.view') && (
                            <ShortcutTile href="/admin/roles?section=administration" title="Roles & permissions" icon={Shield} />
                        )}
                        {hasPermission('admin.access') && (
                            <>
                                <ShortcutTile href="/admin/notices?section=administration" title="Notices" icon={Megaphone} />
                                <ShortcutTile href="/admin/notices/create?section=administration" title="Send notice" icon={Send} />
                                <ShortcutTile href="/movement-penalties" title="Movement Penalties" icon={ShieldAlert} />
                            </>
                        )}
                        {hasPermission('reports.view') && (
                            <ShortcutTile href="/reports/administration?section=administration" title="Administration report" icon={BarChart3} />
                        )}
                        <ShortcutTile href="/settings/profile?section=administration" title="Profile" icon={Settings} />
                        <ShortcutTile href="/settings/notifications?section=administration" title="Notifications" icon={Bell} />
                    </div>
                </section>

                <section>
                    <SectionLabel>Recent accounts</SectionLabel>
                    <Card className="border-zinc-200/90 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Recently created users</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Operational reports (attendance, leave, movement, transfers) live in those sections.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!hasPermission('users.view') ? (
                                <p className="px-4 py-8 text-center text-xs text-zinc-500">
                                    You do not have permission to browse the user directory.
                                </p>
                            ) : recentUsers?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[550px] text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] uppercase tracking-wide text-zinc-500">
                                                <th className="px-3 py-2 font-medium">Name</th>
                                                <th className="hidden px-2 py-2 font-medium sm:table-cell">Email</th>
                                                <th className="px-2 py-2 font-medium">Created</th>
                                                <th className="w-8 px-2 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentUsers.map((u) => (
                                                <tr key={u.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                                                    <td className="px-3 py-2">
                                                        <Link
                                                            href={`/admin/users/${u.id}/edit?section=administration`}
                                                            className="font-medium text-zinc-900 hover:text-violet-700"
                                                        >
                                                            {u.name}
                                                        </Link>
                                                        <p className="truncate text-[10px] text-zinc-500 sm:hidden">{u.email}</p>
                                                    </td>
                                                    <td className="hidden max-w-[200px] truncate px-2 py-2 text-zinc-600 sm:table-cell">
                                                        {u.email}
                                                    </td>
                                                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-zinc-600">
                                                        {u.created_at
                                                            ? new Date(u.created_at).toLocaleString(undefined, {
                                                                  month: 'short',
                                                                  day: 'numeric',
                                                                  year: 'numeric',
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              })
                                                            : '—'}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Link href={`/admin/users/${u.id}/edit?section=administration`}>
                                                            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 hover:text-violet-600" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="px-4 py-8 text-center text-xs text-zinc-500">No user records to show.</p>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </PageSurface>
        </Layout>
    );
}
