import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Coins, Landmark, Gift, ChevronRight } from 'lucide-react';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';

interface StaffFundLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
    activeTab?: string;
}

export default function StaffFundLayout({ children, title, description, activeTab }: StaffFundLayoutProps) {
    const navItems = [
        {
            group: 'PF',
            icon: Landmark,
            items: [
                { id: 'pf-register', label: 'Register', href: '/provident-fund' },
                { id: 'pf-interest', label: 'Interest', href: '/provident-fund/interest' },
                { id: 'pf-withdrawal', label: 'Withdrawal', href: '/provident-fund/withdrawals' },
            ],
        },
        {
            group: 'Gratuity',
            icon: Gift,
            items: [
                { id: 'gratuity-entitlements', label: 'Entitlements', href: '/gratuity' },
                { id: 'gratuity-payments', label: 'Payments', href: '/gratuity/payments' },
                { id: 'gratuity-rules', label: 'Rules', href: '/gratuity/rules' },
            ],
        },
    ];

    return (
        <Layout>
            <Head title={title} />
            <div className="mx-auto w-full max-w-full px-3 py-2 bg-[#f9fafb]">
                <div className="mb-2.5 flex flex-col justify-between gap-2 border-b border-emerald-100 pb-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10">
                            <Coins className="h-4 w-4" />
                        </span>
                        <div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Staff Fund
                                </span>
                                <ChevronRight className="h-3 w-3 text-zinc-400" />
                                <h1 className="text-sm font-bold text-zinc-800">{title}</h1>
                            </div>
                            {description && <p className="text-[10px] text-zinc-400 mt-0.5">{description}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Link
                            href={staffFundPath('/sections/staff-fund')}
                            className="rounded bg-white border border-zinc-200 hover:border-emerald-200 hover:bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 hover:text-emerald-700 transition-colors shadow-2xs"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>

                <div className="mb-3 flex flex-col gap-2 rounded-lg border border-zinc-200/60 bg-white p-1 shadow-2xs md:flex-row md:items-center">
                    <div className="flex flex-wrap items-center gap-4 px-1 py-0.5">
                        {navItems.map((group, groupIdx) => {
                            const GroupIcon = group.icon;
                            return (
                                <div key={groupIdx} className="flex items-center gap-1.5 border-r border-zinc-100 pr-4 last:border-r-0 last:pr-0">
                                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 mr-1">
                                        <GroupIcon className="h-3 w-3" />
                                        {group.group}
                                    </span>
                                    <div className="flex items-center gap-1 bg-zinc-50 p-0.5 rounded">
                                        {group.items.map((item) => {
                                            const isActive = activeTab === item.id;
                                            return (
                                                <Link
                                                    key={item.id}
                                                    href={staffFundPath(item.href)}
                                                    className={cn(
                                                        'rounded px-2 py-0.5 text-[11px] font-medium transition-all',
                                                        isActive
                                                            ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                                                            : 'text-zinc-600 hover:text-emerald-700 hover:bg-zinc-100',
                                                    )}
                                                >
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">{children}</div>
            </div>
        </Layout>
    );
}
