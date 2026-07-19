import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type MultiSelectFilterItem = {
    value: string;
    label: string;
};

type Props = {
    values: string[];
    onChange: (values: string[]) => void;
    items: MultiSelectFilterItem[];
    placeholder?: string;
    allLabel?: string;
    className?: string;
    disabled?: boolean;
};

export function MultiSelectFilter({
    values,
    onChange,
    items,
    placeholder = 'Select…',
    allLabel = 'All',
    className,
    disabled,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selectedSet = useMemo(() => new Set(values), [values]);

    const filtered = useMemo(() => {
        const raw = query.trim().toLowerCase();
        if (!raw) return items;
        const tokens = raw.split(/\s+/).filter(Boolean);
        return items.filter((item) => {
            const hay = item.label.toLowerCase();
            return tokens.every((t) => hay.includes(t));
        });
    }, [items, query]);

    const triggerLabel = useMemo(() => {
        if (values.length === 0) return placeholder;
        if (values.length === 1) {
            return items.find((i) => i.value === values[0])?.label ?? `${values.length} selected`;
        }
        return `${values.length} selected`;
    }, [items, placeholder, values]);

    const toggle = (value: string) => {
        if (selectedSet.has(value)) {
            onChange(values.filter((v) => v !== value));
            return;
        }
        onChange([...values, value]);
    };

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setQuery('');
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'h-9 w-full justify-between font-normal',
                        values.length === 0 && 'text-muted-foreground',
                        className
                    )}
                >
                    <span className="truncate">{triggerLabel}</span>
                    <span className="ml-2 flex shrink-0 items-center gap-1">
                        {values.length > 0 && (
                            <span
                                role="button"
                                tabIndex={0}
                                className="rounded-sm p-0.5 hover:bg-muted"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onChange([]);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onChange([]);
                                    }
                                }}
                            >
                                <X className="h-3.5 w-3.5 opacity-60" />
                            </span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="border-b p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search…"
                            className="h-8 pl-8"
                        />
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                    <button
                        type="button"
                        className={cn(
                            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                            values.length === 0 && 'bg-accent/60'
                        )}
                        onClick={() => onChange([])}
                    >
                        <Check className={cn('h-3.5 w-3.5', values.length === 0 ? 'opacity-100' : 'opacity-0')} />
                        {allLabel}
                    </button>
                    {filtered.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">No matches</div>
                    ) : (
                        filtered.map((item) => {
                            const checked = selectedSet.has(item.value);
                            return (
                                <label
                                    key={item.value}
                                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggle(item.value)}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </label>
                            );
                        })
                    )}
                </div>
                {values.length > 0 && (
                    <div className="flex items-center justify-between border-t px-2 py-1.5 text-xs text-muted-foreground">
                        <span>{values.length} selected</span>
                        <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={() => onChange([])}
                        >
                            Clear
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
