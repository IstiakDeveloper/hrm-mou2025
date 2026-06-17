import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PageSurface } from '@/components/page-surface';
import { cn } from '@/lib/utils';

export function AssetPage({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <PageSurface className={cn('w-full max-w-7xl bg-transparent py-4 px-4 sm:px-6 lg:px-8 space-y-6', className)}>
            {children}
        </PageSurface>
    );
}

export function AssetPageHeader({
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
        <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                {Icon && (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10 shadow-xs">
                        <Icon className="h-5 w-5" />
                    </span>
                )}
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">{title}</h1>
                    {description && (
                        <p className="mt-1 text-xs text-zinc-500 max-w-2xl font-normal leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {children ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{children}</div> : null}
        </div>
    );
}

export function AssetSectionCard({
    title,
    description,
    children,
    className,
    headerActions,
    noPadding = false,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    headerActions?: React.ReactNode;
    noPadding?: boolean;
}) {
    return (
        <div className={cn('overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs transition-all hover:border-zinc-200', className)}>
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/40 px-5 py-3">
                <div>
                    <h2 className="text-xs font-semibold text-zinc-800 tracking-tight">{title}</h2>
                    {description && <p className="mt-0.5 text-[10px] text-zinc-500 font-normal leading-normal">{description}</p>}
                </div>
                {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
            </div>
            <div className={cn(noPadding ? 'p-0' : 'p-5')}>{children}</div>
        </div>
    );
}

export function AssetFormActions({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-center justify-end gap-2.5 border-t border-zinc-100 pt-4 mt-6', className)}>
            {children}
        </div>
    );
}

export function AssetEmptyState({ message, icon: Icon }: { message: string; icon?: LucideIcon }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/30 px-6 py-12 text-center">
            <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200/50 shadow-2xs">
                {Icon ? (
                    <Icon className="h-5 w-5 stroke-[1.5]" />
                ) : (
                    <svg className="h-5 w-5 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )}
            </div>
            <p className="text-xs font-semibold text-zinc-700">{message}</p>
        </div>
    );
}
