import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { LayoutGrid } from 'lucide-react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:3000';

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="bg-background relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            {/* Top-Right Return to Mousumi Apps Button */}
            <div className="absolute top-4 right-4 z-20">
                <a
                    href="https://app.mousumibd.org"
                    target="_self"
                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 p-2 text-xs font-bold text-white shadow-lg transition-colors hover:bg-sky-600 sm:px-3.5 sm:py-2 dark:bg-sky-600 dark:hover:bg-sky-500"
                    title="Return to Mousumi Apps Launcher"
                >
                    <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-500 p-0.5 text-white shadow-sm transition-transform duration-300 group-hover:rotate-12 dark:bg-white/20">
                        <LayoutGrid className="h-3.5 w-3.5" />
                    </div>
                    <span className="hidden tracking-wide sm:inline">Mousumi Apps</span>
                </a>
            </div>

            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md">
                                <AppLogoIcon className="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-muted-foreground text-center text-sm">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
