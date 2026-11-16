import { CheckCircle2, Columns2, Rows3, Sparkles } from 'lucide-react';
import React from 'react';
import { useNavLayout, type NavLayout } from '@/lib/nav-layout';
import { cn } from '@/lib/utils';

export default function NavLayoutSettings() {
    const { navLayout, setNavLayout } = useNavLayout();

    const options: Array<{
        id: NavLayout;
        title: string;
        description: string;
        badge?: string;
        renderPreview: (selected: boolean) => React.ReactNode;
    }> = [
        {
            id: 'sidebar',
            title: 'Left Sidebar Navigation',
            description: 'Vertical collapsible sidebar on the left side of the screen.',
            badge: 'Default',
            renderPreview: (selected: boolean) => (
                <div
                    className={cn(
                        'relative flex h-24 w-full overflow-hidden rounded-lg border bg-slate-50 transition-all',
                        selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200',
                    )}
                >
                    {/* Mock Sidebar */}
                    <div className="flex h-full w-12 flex-col border-r border-slate-200 bg-white p-1">
                        <div className="h-2.5 w-6 rounded bg-emerald-500/80 mb-2" />
                        <div className="space-y-1">
                            <div className="h-2 w-full rounded bg-emerald-100" />
                            <div className="h-2 w-full rounded bg-slate-100" />
                            <div className="h-2 w-full rounded bg-slate-100" />
                        </div>
                    </div>
                    {/* Mock Content */}
                    <div className="flex-1 p-2">
                        <div className="mb-2 h-2.5 w-16 rounded bg-slate-200" />
                        <div className="h-10 w-full rounded border border-dashed border-slate-200 bg-white" />
                    </div>
                </div>
            ),
        },
        {
            id: 'top',
            title: 'Top Bar Horizontal Navigation',
            description: 'Horizontal navbar at the top with dropdown menus for maximum content width.',
            badge: 'Horizontal',
            renderPreview: (selected: boolean) => (
                <div
                    className={cn(
                        'relative flex h-24 w-full flex-col overflow-hidden rounded-lg border bg-slate-50 transition-all',
                        selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200',
                    )}
                >
                    {/* Mock Topbar */}
                    <div className="flex h-5 w-full items-center justify-between border-b border-slate-200 bg-white px-2">
                        <div className="h-2 w-8 rounded bg-emerald-500/80" />
                        <div className="flex gap-1">
                            <div className="h-1.5 w-4 rounded bg-slate-200" />
                            <div className="h-1.5 w-4 rounded bg-slate-200" />
                        </div>
                    </div>
                    {/* Mock Horizontal Subnav */}
                    <div className="flex h-4 w-full items-center gap-1 border-b border-slate-100 bg-white/80 px-2">
                        <div className="h-2 w-6 rounded bg-emerald-100" />
                        <div className="h-2 w-6 rounded bg-slate-100" />
                        <div className="h-2 w-6 rounded bg-slate-100" />
                    </div>
                    {/* Mock Content */}
                    <div className="flex-1 p-2">
                        <div className="h-8 w-full rounded border border-dashed border-slate-200 bg-white" />
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-semibold text-slate-800">Desktop Navigation Layout</h4>
                <p className="text-xs text-slate-500">
                    Choose how the main menu is arranged in desktop view. Your preference is saved in your browser storage.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {options.map((opt) => {
                    const isSelected = navLayout === opt.id;
                    return (
                        <button
                            type="button"
                            key={opt.id}
                            onClick={() => setNavLayout(opt.id)}
                            className={cn(
                                'group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md focus:outline-none',
                                isSelected
                                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm ring-2 ring-emerald-500/20'
                                    : 'border-slate-200 bg-white hover:border-slate-300',
                            )}
                        >
                            <div className="mb-3 w-full">
                                {opt.renderPreview(isSelected)}
                            </div>

                            <div className="flex w-full items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {opt.id === 'sidebar' ? (
                                        <Columns2 className={cn('h-4 w-4', isSelected ? 'text-emerald-600' : 'text-slate-500')} />
                                    ) : (
                                        <Rows3 className={cn('h-4 w-4', isSelected ? 'text-emerald-600' : 'text-slate-500')} />
                                    )}
                                    <span className={cn('text-sm font-semibold', isSelected ? 'text-emerald-950' : 'text-slate-800')}>
                                        {opt.title}
                                    </span>
                                </div>
                                {isSelected ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : (
                                    <div className="h-4 w-4 rounded-full border border-slate-300 group-hover:border-slate-400" />
                                )}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">{opt.description}</p>

                            {opt.badge && (
                                <span
                                    className={cn(
                                        'mt-2.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                                        isSelected
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-slate-100 text-slate-600',
                                    )}
                                >
                                    {opt.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
