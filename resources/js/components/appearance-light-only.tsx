import { Sun } from 'lucide-react';
import { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export default function AppearanceLightOnly({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'flex gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700',
                className,
            )}
            {...props}
        >
            <Sun className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <p>
                This application uses the <strong className="font-medium text-neutral-900">light theme</strong> only.
                Dark mode and system theme are not available.
            </p>
        </div>
    );
}
