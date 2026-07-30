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
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 font-bold text-xs shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                title="Return to Mousumi Apps Launcher"
            >
                <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-sky-500 dark:bg-white/20 text-white p-0.5 shadow-sm group-hover:rotate-12 transition-transform duration-300">
                    <LayoutGrid className="w-3.5 h-3.5" />
                </div>
                <span className="tracking-wide">Mousumi Apps</span>
            </a>
        </header>
    );
}
