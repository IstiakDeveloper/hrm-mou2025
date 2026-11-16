import React from 'react';
import { cn } from '@/lib/utils';

export function PageSurface({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('mx-auto w-full max-w-7xl px-0 py-6 md:py-8', className)}>
            {children}
        </div>
    );
}

