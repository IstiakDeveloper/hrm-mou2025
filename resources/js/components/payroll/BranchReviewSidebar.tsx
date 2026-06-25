import React, { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { payrollFilterActive } from '@/components/payroll/PayrollPageShell';
import { cn } from '@/lib/utils';
import { Building2, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const DEFAULT_STORAGE_KEY = 'payroll-review-branch-sidebar';

export type BranchReviewSidebarItem = {
    run: {
        id: number;
        branch: string | null;
        employee_count: number;
        total_net: number;
        status: string;
    };
};

function useSidebarOpen(storageKey: string) {
    const [open, setOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        return localStorage.getItem(storageKey) !== 'false';
    });

    const toggle = useCallback(() => {
        setOpen((prev) => {
            const next = !prev;
            localStorage.setItem(storageKey, String(next));
            return next;
        });
    }, [storageKey]);

    return [open, toggle] as const;
}

export function BranchReviewSidebar({
    branches,
    totalCount,
    activeRunId,
    onSelect,
    branchQuery,
    onBranchQueryChange,
    dirtyRuns,
    hasDirty,
    storageKey = DEFAULT_STORAGE_KEY,
}: {
    branches: BranchReviewSidebarItem[];
    totalCount: number;
    activeRunId: number | null;
    onSelect: (runId: number) => void;
    branchQuery: string;
    onBranchQueryChange: (value: string) => void;
    dirtyRuns: Record<number, boolean>;
    hasDirty: boolean;
    storageKey?: string;
}) {
    const [open, toggle] = useSidebarOpen(storageKey);
    const activeBranch = branches.find((b) => b.run.id === activeRunId);

    return (
        <aside
            className={cn(
                'shrink-0 transition-[width,flex-basis] duration-200 ease-out lg:sticky lg:top-6 lg:self-start',
                open ? 'w-full lg:basis-1/4 lg:w-1/4' : 'w-full lg:w-11',
            )}
        >
            <div className="rounded-xl border border-slate-100/90 bg-white shadow-2xs overflow-hidden">
                <div
                    className={cn(
                        'flex items-center gap-1 border-b border-slate-100/80 bg-slate-50/40',
                        open ? 'px-2 py-2 justify-between' : 'flex-col py-2 px-1',
                    )}
                >
                    {open ? (
                        <>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-[10px] font-bold tracking-wider text-slate-500 uppercase truncate">
                                    Branches ({totalCount})
                                </h2>
                                {hasDirty && (
                                    <Badge className="mt-1 text-[8px] font-bold bg-amber-500 text-white rounded-md border-none uppercase py-0 px-1">
                                        Unsaved
                                    </Badge>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 cursor-pointer text-slate-400 hover:text-slate-700"
                                onClick={toggle}
                                title="Collapse branch list"
                                aria-label="Collapse branch list"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer text-slate-500 hover:text-slate-800"
                                onClick={toggle}
                                title="Expand branch list"
                                aria-label="Expand branch list"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col items-center gap-1 py-1" title={activeBranch?.run.branch ?? 'Branches'}>
                                <Building2 className="h-4 w-4 text-slate-400" />
                                <span className="text-[9px] font-bold text-slate-500 tabular-nums">{totalCount}</span>
                                {hasDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved changes" />}
                            </div>
                        </>
                    )}
                </div>

                {open && (
                    <div className="p-3.5">
                        <div className="relative flex items-center mb-3">
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search branches..."
                                value={branchQuery}
                                onChange={(e) => onBranchQueryChange(e.target.value)}
                                className="pl-8 text-xs h-8.5 bg-slate-50/50 border-slate-200/80 rounded-lg placeholder:text-slate-400"
                            />
                        </div>

                        <ScrollArea className="h-[480px] pr-1">
                            <div className="space-y-1.5">
                                {branches.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-6">No branches matched.</p>
                                ) : (
                                    branches.map((block) => {
                                        const isActive = activeRunId === block.run.id;
                                        const isDirty = dirtyRuns[block.run.id];
                                        return (
                                            <button
                                                key={block.run.id}
                                                type="button"
                                                onClick={() => onSelect(block.run.id)}
                                                className={cn(
                                                    'w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer flex flex-col gap-1',
                                                    isActive
                                                        ? cn(payrollFilterActive, 'shadow-xs')
                                                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 text-slate-700',
                                                )}
                                            >
                                                <div className="flex items-start justify-between w-full gap-2">
                                                    <span className="font-bold truncate pr-1">
                                                        {block.run.branch ?? 'Branch'}
                                                    </span>
                                                    {isDirty && (
                                                        <span
                                                            className={cn(
                                                                'h-2 w-2 rounded-full shrink-0 mt-0.5',
                                                                isActive ? 'bg-amber-400' : 'bg-amber-500',
                                                            )}
                                                            title="Unsaved changes"
                                                        />
                                                    )}
                                                </div>

                                                <div
                                                    className={cn(
                                                        'flex items-center justify-between mt-1 text-[10px] font-medium',
                                                        isActive ? 'text-white/80' : 'text-slate-400',
                                                    )}
                                                >
                                                    <span>{block.run.employee_count} employees</span>
                                                    <span className="font-mono font-bold">৳{block.run.total_net.toLocaleString()}</span>
                                                </div>

                                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/10">
                                                    <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase',
                                                        block.run.status === 'posted'
                                                            ? isActive
                                                                ? 'text-emerald-300 border-emerald-900 bg-emerald-950/20'
                                                                : 'text-emerald-700 border-emerald-100 bg-emerald-50/50'
                                                            : isActive
                                                              ? 'text-amber-300 border-amber-900 bg-amber-950/20'
                                                              : 'text-amber-700 border-amber-100 bg-amber-50/50',
                                                    )}
                                                >
                                                    {block.run.status}
                                                </Badge>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
        </aside>
    );
}
