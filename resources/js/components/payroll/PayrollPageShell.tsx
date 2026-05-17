import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PageSurface } from '@/components/page-surface';
import { cn } from '@/lib/utils';

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
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
                {Icon && (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-600/10">
                        <Icon className="h-5 w-5" />
                    </span>
                )}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
                    {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
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
        <div className={cn('rounded-xl border border-slate-200/90 bg-white shadow-sm', className)}>
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
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
        <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-4', className)}>
            {children}
        </div>
    );
}

export function PayrollPage({ children, className }: { children: React.ReactNode; className?: string }) {
    return <PageSurface className={cn('w-full max-w-full', className)}>{children}</PageSurface>;
}

export function PayrollEmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-muted-foreground">
            {message}
        </div>
    );
}
