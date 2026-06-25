import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PageSurface } from '@/components/page-surface';
import { cn } from '@/lib/utils';

/** Green primary action — matches payroll module theme */
export const payrollBtnPrimary = 'bg-emerald-600 text-white hover:bg-emerald-700';

/** Active filter / sidebar selection */
export const payrollFilterActive = 'bg-emerald-600 border-emerald-600 text-white';

export const payrollBadgePrimary = 'bg-emerald-600 text-white border-none font-bold';

export function PayrollPageHeader({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children?: React.ReactNode;
}) {
    return (
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
                {Icon && (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200/60 shadow-2xs">
                        <Icon className="h-4 w-4" />
                    </span>
                )}
                <div>
                    <h1 className="text-base font-bold tracking-tight text-slate-900">{title}</h1>
                    {description && <p className="mt-0.5 text-[11px] text-slate-400 max-w-2xl font-normal leading-normal">{description}</p>}
                </div>
            </div>
            {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
        </div>
    );
}

export function PayrollSectionCard({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('rounded-xl border border-slate-100/90 bg-white shadow-xs', className)}>
            <div className="border-b border-slate-100/80 px-4 py-2.5 bg-slate-50/[0.15]">
                <h2 className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{title}</h2>
                {description && <p className="mt-0.5 text-[10px] text-slate-400 font-normal leading-normal">{description}</p>}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

export function PayrollFormActions({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-slate-100/80 pt-3 mt-4', className)}>
            {children}
        </div>
    );
}

export function PayrollPage({ children, className }: { children: React.ReactNode; className?: string }) {
    return <PageSurface className={cn('w-full max-w-full bg-transparent py-0 md:py-0', className)}>{children}</PageSurface>;
}

export function PayrollEmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-10 text-center shadow-xs">
            <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200/50">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <p className="text-xs font-medium text-slate-700">{message}</p>
        </div>
    );
}

