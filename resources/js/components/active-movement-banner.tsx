import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type SharedActiveMovement = {
    id: number;
    employee_id: number;
    movement_type: 'official' | 'personal' | string;
    from_datetime: string;
    to_datetime: string;
    destination?: string | null;
    status?: string;
};

type ActiveMovementBannerProps = {
    movement: SharedActiveMovement;
    onClose?: () => void;
    closing?: boolean;
    canClose?: boolean;
    className?: string;
};

function StatPill({
    label,
    value,
    tone = 'neutral',
}: {
    label: string;
    value: string;
    tone?: 'neutral' | 'success' | 'danger';
}) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs shadow-2xs',
                tone === 'success' && 'border-emerald-300/80 bg-emerald-50/90 text-emerald-950',
                tone === 'danger' && 'border-rose-300/80 bg-rose-50/90 text-rose-950',
                tone === 'neutral' && 'border-slate-200/80 bg-white text-slate-800',
            )}
        >
            <span className={cn(
                'font-medium text-[11px]',
                tone === 'success' && 'text-emerald-700',
                tone === 'danger' && 'text-rose-700',
                tone === 'neutral' && 'text-slate-500',
            )}>{label}:</span>
            <span className="font-bold tabular-nums text-xs">{value}</span>
        </div>
    );
}

function formatDurationMs(ms: number, includeSeconds = true): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) {
        return includeSeconds
            ? `${days}d ${hours}h ${minutes}m ${seconds}s`
            : `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
        return includeSeconds ? `${hours}h ${minutes}m ${seconds}s` : `${hours}h ${minutes}m`;
    }
    return includeSeconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export default function ActiveMovementBanner({
    movement,
    onClose,
    closing = false,
    canClose = true,
    className,
}: ActiveMovementBannerProps) {
    const [elapsed, setElapsed] = useState('…');
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        const updateTimers = () => {
            const now = new Date();
            const expectedReturn = new Date(movement.to_datetime);
            const overdue = now > expectedReturn;
            setIsOverdue(overdue);

            const startTime = new Date(movement.from_datetime);
            if (startTime > now) {
                setElapsed('Not started yet');
            } else {
                const elapsedMs = now.getTime() - startTime.getTime();
                setElapsed(formatDurationMs(elapsedMs));
            }
        };

        updateTimers();
        const interval = setInterval(updateTimers, 1000);
        return () => clearInterval(interval);
    }, [movement.from_datetime, movement.to_datetime]);

    const typeLabel = movement.movement_type
        ? movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)
        : 'Movement';

    const destination = movement.destination?.trim() || 'Movement in progress';
    const isOfficial = movement.movement_type === 'official';

    return (
        <div
            className={cn(
                'flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2 sm:gap-x-4 sm:px-4',
                isOverdue
                    ? 'border-rose-200/80 bg-gradient-to-r from-rose-50/80 via-white to-rose-50/40'
                    : 'border-amber-200/70 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30',
                className,
            )}
            role="status"
            aria-live="polite"
        >
            <div className="flex shrink-0 items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span
                        className={cn(
                            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
                            isOverdue ? 'bg-rose-400' : 'bg-amber-400',
                        )}
                    />
                    <span
                        className={cn(
                            'relative inline-flex h-2 w-2 rounded-full',
                            isOverdue ? 'bg-rose-500' : 'bg-amber-500',
                        )}
                    />
                </span>
                <span className="text-xs font-semibold tracking-wide text-slate-800 uppercase">On movement</span>
                <Badge
                    variant="outline"
                    className={cn(
                        'h-5 border px-1.5 py-0 text-[10px] font-semibold',
                        isOfficial
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            : 'border-violet-200 bg-violet-50 text-violet-700',
                    )}
                >
                    {typeLabel}
                </Badge>
            </div>

            <span className="hidden h-4 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

            <div className="flex min-w-0 max-w-[12rem] items-center gap-1.5 sm:max-w-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate text-sm font-medium text-slate-900">{destination}</span>
            </div>

            <div className="hidden shrink-0 items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Start: <strong className="font-semibold text-slate-800">{format(new Date(movement.from_datetime), 'h:mm a')}</strong></span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
                <StatPill label="Duration Out" value={elapsed} tone="success" />
                {isOverdue && (
                    <StatPill label="Status" value="Overdue" tone="danger" />
                )}
            </div>

            {canClose && onClose && (
                <Button
                    size="sm"
                    className="h-8 shrink-0 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                    onClick={onClose}
                    disabled={closing}
                >
                    {closing ? (
                        'Processing…'
                    ) : (
                        <>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Close movement
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
