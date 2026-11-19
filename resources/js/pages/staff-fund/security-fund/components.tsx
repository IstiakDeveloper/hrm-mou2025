import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Wallet,
    Coins,
    TrendingUp,
    PiggyBank,
    AlertTriangle,
    Printer,
    FileSpreadsheet,
    FileDown,
    Info,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
} from 'lucide-react';
import { fundInterest, fundMoney, fundDisplayDate, fundDisplayDateReadable, type FundSnapshot } from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { cn } from '@/lib/utils';

export const fieldClass =
    'w-full h-8.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs transition-colors';
export const actionClass =
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-emerald-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50';
export const secondaryClass =
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50';

export function Errors({ errors }: { errors: Record<string, string> }) {
    if (!errors || !Object.keys(errors).length) return null;
    return (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 shadow-2xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
                {Object.entries(errors).map(([key, value]) => (
                    <p key={key} className="font-medium">
                        {value}
                    </p>
                ))}
            </div>
        </div>
    );
}

export function Summary({
    values,
}: {
    values: Partial<Record<'principal' | 'posted_interest' | 'unposted_interest' | 'total', string | number>> & {
        account_count?: number;
        review_count?: number;
    };
}) {
    const cards = [
        {
            key: 'principal',
            title: 'Principal Outstanding',
            bnTitle: 'মোট আসল আমানত',
            amount: `৳ ${fundMoney(values.principal)}`,
            icon: Wallet,
            iconBg: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10',
            subtitle: values.account_count !== undefined ? `${values.account_count} accounts recorded` : 'Employee security deposits',
        },
        {
            key: 'posted_interest',
            title: 'Posted Interest (Unpaid)',
            bnTitle: 'বণ্টনকৃত বকেয়া সুদ',
            amount: `৳ ${fundInterest(values.posted_interest)}`,
            icon: Coins,
            iconBg: 'bg-blue-50 text-blue-600 ring-1 ring-blue-600/10',
            subtitle: 'Credited to employee ledgers',
        },
        {
            key: 'unposted_interest',
            title: 'Accrued Interest (Unposted)',
            bnTitle: 'অর্জিত অপরিশোধিত সুদ',
            amount: `৳ ${fundInterest(values.unposted_interest)}`,
            icon: TrendingUp,
            iconBg: 'bg-amber-50 text-amber-600 ring-1 ring-amber-600/10',
            subtitle: 'Ready to distribute in next run',
        },
        {
            key: 'total',
            title: 'Total Fund Payable',
            bnTitle: 'সর্বমোট প্রদেয় তহবিল',
            amount: `৳ ${fundMoney(values.total)}`,
            icon: PiggyBank,
            iconBg: 'bg-emerald-500 text-white shadow-xs',
            highlight: true,
            subtitle: 'Principal + Total interest payable',
        },
    ] as const;

    return (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card
                        key={card.key}
                        className={cn(
                            'overflow-hidden border border-zinc-200/80 bg-white shadow-2xs rounded-lg transition-all hover:border-zinc-300',
                            'highlight' in card && card.highlight && 'border-emerald-200 bg-gradient-to-br from-emerald-50/30 via-white to-white'
                        )}
                    >
                        <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                    <p className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                                        {card.title}
                                    </p>
                                    <p className="text-[10px] text-zinc-400">{card.bnTitle}</p>
                                </div>
                                <span className={cn('flex h-7 w-7 items-center justify-center rounded-md shrink-0', card.iconBg)}>
                                    <Icon className="h-4 w-4" />
                                </span>
                            </div>
                            <div className="mt-2.5">
                                <div className="text-lg font-bold font-mono tracking-tight text-zinc-900">
                                    {card.amount}
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{card.subtitle}</p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

export function SecurityFundPolicyBanner({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5 text-xs text-zinc-700 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-semibold text-emerald-950 text-xs">
                        Security Fund Policy Guidelines (তহবিল ও সুদের নিয়মাবলী)
                    </span>
                    <Badge variant="outline" className="border-emerald-250 bg-emerald-100/60 text-emerald-800 text-[10px] px-1.5 py-0 h-4.5">
                        6% Simple Interest
                    </Badge>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] text-emerald-800 hover:bg-emerald-100/50 hover:text-emerald-950"
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    {expanded ? (
                        <>
                            <span>Hide Details</span>
                            <ChevronUp className="h-3.5 w-3.5 ml-1" />
                        </>
                    ) : (
                        <>
                            <span>View Rules</span>
                            <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        </>
                    )}
                </Button>
            </div>

            {expanded && (
                <div className="mt-2.5 pt-2.5 border-t border-emerald-100/80 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px]">
                    <div className="rounded bg-white/80 p-2 border border-emerald-100">
                        <strong className="text-emerald-900 block font-semibold">১. বার্ষিক ৬% সরল সুদ</strong>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                            মূল আসলের উপর ৬% সরল সুদে হিসাব হয়। সুদ কখনো চক্রবৃদ্ধি (compound) হয় না।
                        </p>
                    </div>
                    <div className="rounded bg-white/80 p-2 border border-emerald-100">
                        <strong className="text-emerald-900 block font-semibold">২. ১ বছর ন্যূনতম মেয়াদ</strong>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                            আমানতের তারিখ থেকে ন্যূনতম ১ বছর অতিবাহিত হলে তবেই সেই আমানতে সুদ প্রযোজ্য হয়।
                        </p>
                    </div>
                    <div className="rounded bg-white/80 p-2 border border-emerald-100">
                        <strong className="text-emerald-900 block font-semibold">৩. পূর্ণ মাস গণনা</strong>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                            শুধুমাত্র সম্পূর্ণ ক্যালেন্ডার মাস গণনা করা হয় (মাসের মাঝে জমা দিলে পরবর্তী মাসের ১ তারিখ থেকে শুরু)।
                        </p>
                    </div>
                    <div className="rounded bg-white/80 p-2 border border-emerald-100">
                        <strong className="text-emerald-900 block font-semibold">৪. পূর্ণ টাকায় হিসাব (৳)</strong>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                            সুদের মোট টাকা ভগ্নাংশ বাদ দিয়ে পূর্ণ টাকায় রাউন্ড করা হয়। লেজারে আসল ও সুদ আলাদা রাখা হয়।
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export function Exports({ filters, canExport }: { filters: Record<string, string | number | undefined>; canExport: boolean }) {
    const query = new URLSearchParams(
        Object.entries(filters)
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)]),
    );

    return (
        <div className="flex items-center gap-1.5 print:hidden">
            <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded"
                asChild
            >
                <a href={staffFundPath(`/security-fund/reports/print?${query}`)} target="_blank" rel="noreferrer">
                    <Printer className="mr-1.5 h-3.5 w-3.5 text-zinc-500" />
                    Print
                </a>
            </Button>
            {canExport && (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded"
                        asChild
                    >
                        <a href={staffFundPath(`/security-fund/reports/pdf?${query}`)} target="_blank" rel="noreferrer">
                            <FileDown className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
                            PDF
                        </a>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded"
                        asChild
                    >
                        <a href={staffFundPath(`/security-fund/reports/excel?${query}`)} target="_blank" rel="noreferrer">
                            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                            Excel
                        </a>
                    </Button>
                </>
            )}
        </div>
    );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'open' || s === 'active') {
        return (
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-semibold uppercase px-1.5 py-0 h-5">
                {s === 'open' ? 'Open' : 'Active'}
            </Badge>
        );
    }
    if (s === 'closed' || s === 'inactive' || s === 'resigned' || s === 'terminated') {
        return (
            <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-600 text-[10px] font-semibold uppercase px-1.5 py-0 h-5">
                {status}
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="border-zinc-200 text-zinc-700 text-[10px] capitalize px-1.5 py-0 h-5">
            {status}
        </Badge>
    );
}

export function DateBadge({ date, highlight = false }: { date: string | null | undefined; highlight?: boolean }) {
    if (!date) return <span className="text-zinc-400">—</span>;
    const formatted = fundDisplayDate(date);
    const readable = fundDisplayDateReadable(date);

    return (
        <span className={cn('inline-flex flex-col', highlight ? 'text-emerald-700 font-semibold' : 'text-zinc-800')}>
            <span className="font-mono text-xs">{formatted}</span>
            {readable !== formatted && (
                <span className="text-[10px] text-zinc-400 font-normal">{readable}</span>
            )}
        </span>
    );
}
