import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { LayoutGrid } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <a
                href="https://app.mousumibd.org"
                target="_self"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 p-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-sky-600 sm:px-3 sm:py-1.5 dark:bg-sky-600 dark:hover:bg-sky-500"
                title="Return to Mousumi Apps Launcher"
            >
                <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-500 p-0.5 text-white shadow-sm transition-transform duration-300 group-hover:rotate-12 dark:bg-white/20">
                    <LayoutGrid className="h-3.5 w-3.5" />
                </div>
                <span className="hidden tracking-wide sm:inline">Mousumi Apps</span>
            </a>
        </header>
    );
}
