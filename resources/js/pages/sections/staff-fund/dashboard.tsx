import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowUpRight,
    Coins,
    FileBarChart2,
    Gift,
    Landmark,
    Users,
    Wallet,
    ChevronRight,
    BookOpen,
    Percent,
    ShieldAlert
} from 'lucide-react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { hasAppPermission } from '@/lib/permissions';
import {
    STAFF_FUND_DASHBOARD_SHORTCUTS,
    STAFF_FUND_NAV_GROUPS,
    staffFundPath,
} from '@/lib/staff-fund-nav';
import { type SharedData } from '@/types';
import { formatPfAmount } from '@/lib/pf-format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
    stats: {
        pfEnrolledEmployees: number;
        totalPfBalance: number;
        pfPayrollCreditsThisMonth: number;
        gratuityEligibleEmployees: number;
        gratuityPaymentRecords: number;
        gratuityPendingApproval: number;
    };
    userRole: string;
};

const fmt = formatPfAmount;

function KpiCard({
    label,
    value,
    href,
    icon: Icon,
    format = 'number',
    colorTheme = 'emerald',
}: {
    label: string;
    value: number;
    href?: string;
    icon: LucideIcon;
    format?: 'number' | 'currency';
    colorTheme?: 'emerald' | 'amber' | 'teal' | 'indigo';
}) {
    const display =
        format === 'currency'
            ? fmt(value)
            : Number(value || 0).toLocaleString();

    const isGreen = colorTheme === 'emerald';
    const isTeal = colorTheme === 'teal';
    const isIndigo = colorTheme === 'indigo';
    const isAmber = colorTheme === 'amber';

    const inner = (
        <div className="group relative flex flex-col rounded-lg border border-zinc-200/90 bg-white p-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-xs">
            <div className="flex items-center justify-between gap-1">
                <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-md ring-1",
                    isGreen && "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
                    isTeal && "bg-teal-50 text-teal-700 ring-teal-600/10",
                    isIndigo && "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
                    isAmber && "bg-amber-50 text-amber-700 ring-amber-600/10"
                )}>
                    <Icon className="h-3.5 w-3.5" />
                </span>
                {href ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        <ArrowUpRight className="h-3 w-3" />
                    </span>
                ) : null}
            </div>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
            <p className="text-lg font-extrabold tabular-nums text-zinc-800 tracking-tight mt-0.5">{display}</p>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                {inner}
            </Link>
        );
    }
    return inner;
}

function ShortcutTile({ href, title, icon: Icon, description }: { href: string; title: string; icon: LucideIcon; description?: string }) {
    return (
        <Link
            href={href}
            className="group flex flex-col justify-between rounded-lg border border-zinc-200/90 bg-white p-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/20"
        >
            <div className="flex items-start justify-between">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200/50 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:ring-emerald-600/10 transition-colors">
                    <Icon className="h-3.5 w-3.5" />
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:translate-x-0.5 group-hover:text-emerald-600 transition-all" />
            </div>
            <div className="mt-3">
                <h3 className="text-xs font-bold text-zinc-700 group-hover:text-emerald-700 transition-colors leading-snug">{title}</h3>
                {description && <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal line-clamp-1">{description}</p>}
            </div>
        </Link>
    );
}

export default function StaffFundDashboard({ stats, userRole }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: string) => hasAppPermission(auth, p);

    return (
        <Layout>
            <Head title="Staff Fund Dashboard" />

            <PageSurface className="max-w-full bg-[#f9fafb] px-3 py-3 md:px-4 md:py-4">
                {/* Dashboard Subheader */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-emerald-100 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
                            <Coins className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                        </span>
                        <div>
                            <h1 className="text-sm sm:text-base font-bold text-zinc-800 tracking-tight leading-tight">Staff Fund Module</h1>
                            <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
                                {userRole} · Central hub for Employee Provident Fund (PF) & Gratuity ledger management.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs border-zinc-200 bg-white text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50">
                            <Link href="/sections">Sections</Link>
                        </Button>
                    </div>
                </div>

                {/* Stat Summaries Grid - Highly compact, organized */}
                <section className="mb-5">
                    <div className="flex items-center gap-1 mb-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Module Overview</h2>
                    </div>
                    <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        <KpiCard
                            label="PF Enrolled"
                            value={stats.pfEnrolledEmployees}
                            href={staffFundPath('/provident-fund')}
                            icon={Users}
                            colorTheme="emerald"
                        />
                        <KpiCard
                            label="Total PF Balance"
                            value={stats.totalPfBalance}
                            href={staffFundPath('/provident-fund')}
                            icon={Landmark}
                            format="currency"
                            colorTheme="emerald"
                        />
                        <KpiCard
                            label="PF Credits (Month)"
                            value={stats.pfPayrollCreditsThisMonth}
                            href={staffFundPath('/provident-fund')}
                            icon={Wallet}
                            format="currency"
                            colorTheme="teal"
                        />
                        <KpiCard
                            label="Gratuity Eligible"
                            value={stats.gratuityEligibleEmployees}
                            href={staffFundPath('/gratuity')}
                            icon={Gift}
                            colorTheme="indigo"
                        />
                        <KpiCard
                            label="Gratuity Payments"
                            value={stats.gratuityPaymentRecords}
                            href={staffFundPath('/gratuity/payments')}
                            icon={FileBarChart2}
                            colorTheme="indigo"
                        />
                        <KpiCard
                            label="Pending Approvals"
                            value={stats.gratuityPendingApproval}
                            href={staffFundPath('/gratuity/payments')}
                            icon={ShieldAlert}
                            colorTheme="amber"
                        />
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Provident Fund Segment */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Provident Fund (PF) Controls</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {STAFF_FUND_DASHBOARD_SHORTCUTS.pf.map((item) => (
                                <ShortcutTile
                                    key={item.href}
                                    href={staffFundPath(item.href)}
                                    title={item.title}
                                    icon={item.icon}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Gratuity Segment */}
                    <section className="space-y-2">
                        <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Gratuity Management</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {STAFF_FUND_DASHBOARD_SHORTCUTS.gratuity.map((item) => (
                                <ShortcutTile
                                    key={item.href}
                                    href={staffFundPath(item.href)}
                                    title={item.title}
                                    icon={item.icon}
                                />
                            ))}
                        </div>
                    </section>
                </div>

                {/* Quick Map and Info Guide */}
                <Card className="border-zinc-200/80 bg-white mt-4 shadow-2xs rounded-lg overflow-hidden">
                    <CardHeader className="pb-2 pt-3 px-4 border-b border-zinc-100 bg-zinc-50/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-zinc-700">Quick Navigation Guide</CardTitle>
                        <CardDescription className="text-[10px] text-zinc-400 mt-0.5">
                            Expand PF or Gratuity in the sidebar; all reports are under Reports.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 text-[11px] text-zinc-500 p-4">
                        {STAFF_FUND_NAV_GROUPS.map((group) => {
                            const GroupIcon = group.icon;
                            return (
                                <div key={group.id} className="rounded-md border border-zinc-100 bg-zinc-50/30 p-2.5">
                                    <div className="flex items-center gap-1.5 font-bold text-zinc-700 mb-1.5 text-xs">
                                        <GroupIcon className="h-3.5 w-3.5 text-emerald-600" />
                                        {group.title} System
                                    </div>
                                    <ul className="space-y-1 pl-1">
                                        {group.items.map((item) => (
                                            <li key={`${group.id}-${item.title}`} className="flex items-start gap-1">
                                                <ChevronRight className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <Link href={staffFundPath(item.path)} className="text-emerald-700 hover:underline font-semibold">
                                                        {item.title}
                                                    </Link>
                                                    {item.description && (
                                                        <span className="text-zinc-400 block text-[10px]">{item.description}</span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
