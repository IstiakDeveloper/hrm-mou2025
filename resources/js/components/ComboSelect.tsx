import { cn } from '@/lib/utils';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export type ComboSelectItem<TValue extends string | number = string> = {
    value: TValue;
    label: string;
    keywords?: string;
    disabled?: boolean;
};

type Props<TValue extends string | number = string> = {
    value: TValue | null | undefined;
    onChange: (value: TValue | null) => void;
    items: ComboSelectItem<TValue>[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** Set false inside modals so the list stays clickable (Radix focus trap). */
    portal?: boolean;
    /** Whether the selection can be cleared. Defaults to true. */
    clearable?: boolean;
    /** Show "Add …" when search text has no exact match. */
    creatable?: boolean;
    onCreate?: (label: string) => void;
    createLabel?: (query: string) => string;
};

export function ComboSelect<TValue extends string | number = string>({
    value,
    onChange,
    items,
    placeholder = 'Select…',
    disabled,
    className,
    portal = true,
    clearable = true,
    creatable = false,
    onCreate,
    createLabel = (q) => `Add "${q}"`,
}: Props<TValue>) {
    const [query, setQuery] = useState('');

    const selectedItem = useMemo(() => {
        return items.find((i) => i.value === value) ?? null;
    }, [items, value]);

    const filtered = useMemo(() => {
        const raw = query.trim().toLowerCase();
        let list = items;
        if (raw) {
            const tokens = raw.split(/\s+/).filter(Boolean);
            list = items.filter((i) => {
                const hay = `${i.label} ${i.keywords ?? ''}`.toLowerCase();
                return tokens.every((t) => hay.includes(t));
            });
        }
        if (selectedItem && list.some((i) => i.value === selectedItem.value)) {
            return [selectedItem, ...list.filter((i) => i.value !== selectedItem.value)];
        }
        return list;
    }, [items, query, selectedItem]);

    const trimmedQuery = query.trim();
    const canCreate = creatable
        && trimmedQuery.length > 0
        && !items.some((i) => i.label.toLowerCase() === trimmedQuery.toLowerCase());

    return (
        <Combobox
            immediate
            by={(a, z) => {
                if (a == null && z == null) return true;
                if (a == null || z == null) return false;
                return (a as ComboSelectItem<TValue>).value === (z as ComboSelectItem<TValue>).value;
            }}
            value={selectedItem}
            onChange={(item: ComboSelectItem<TValue> | null) => onChange(item ? item.value : null)}
            disabled={disabled}
            onClose={() => setQuery('')}
        >
            {({ open }) => (
                <div className={cn('relative w-full min-w-[9.5rem]', className)}>
                    <div
                        className={cn(
                            'bg-card border-input flex h-9 w-full min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                            open
                                ? 'border-emerald-600 ring-[3px] ring-emerald-600/15 dark:border-emerald-500 dark:ring-emerald-500/20'
                                : 'focus-within:border-emerald-600 focus-within:ring-[3px] focus-within:ring-emerald-600/15 dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/20',
                            disabled && 'bg-muted/20 pointer-events-none opacity-50',
                        )}
                    >
                        <Search className="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
                        <ComboboxInput
                            className="placeholder:text-muted-foreground/50 w-full min-w-0 bg-transparent py-0.5 text-xs outline-none md:text-sm"
                            displayValue={(item) => (item as ComboSelectItem<TValue> | null)?.label ?? ''}
                            autoComplete="off"
                            onChange={(event) => setQuery(event.target.value)}
                            onFocus={(event) => event.target.select()}
                            placeholder={placeholder}
                        />
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                            {clearable && value !== null && value !== undefined && value !== '' && !disabled && (
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onChange(null);
                                        setQuery('');
                                    }}
                                    className="text-muted-foreground/50 hover:bg-muted hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none"
                                    title="Clear selection"
                                >
                                    <X className="h-3 w-3 stroke-[2.5]" />
                                </button>
                            )}
                            <ComboboxButton className="hover:bg-muted/50 flex cursor-pointer items-center justify-center rounded-sm p-0.5 transition-colors">
                                <ChevronDown
                                    className={cn(
                                        'text-muted-foreground/60 h-3.5 w-3.5 transition-transform duration-200',
                                        open && 'rotate-180 text-emerald-600 dark:text-emerald-500',
                                    )}
                                />
                            </ComboboxButton>
                        </div>
                    </div>

                    <ComboboxOptions
                        portal={portal}
                        anchor={portal ? { to: 'bottom start', gap: 4 } : undefined}
                        transition
                        className={cn(
                            'bg-popover text-popover-foreground scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent max-h-60 overflow-y-auto rounded-md border p-1 text-sm shadow-md focus:outline-none',
                            portal ? 'z-[200] w-[var(--anchor-width)] min-w-[10rem]' : 'absolute left-0 z-50 mt-1 w-full',
                            'transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
                        )}
                    >
                        {filtered.length === 0 && !canCreate ? (
                            <div className="text-muted-foreground px-2 py-3 text-center text-xs italic">No results found.</div>
                        ) : (
                            <>
                                {canCreate && onCreate && (
                                    <button
                                        type="button"
                                        className="flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-2 pl-2.5 text-xs font-medium text-sky-700 hover:bg-sky-50 md:text-sm"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            onCreate(trimmedQuery);
                                            setQuery('');
                                        }}
                                    >
                                        + {createLabel(trimmedQuery)}
                                    </button>
                                )}
                                {filtered.map((item) => (
                                <ComboboxOption
                                    key={String(item.value)}
                                    value={item}
                                    disabled={item.disabled}
                                    className={cn(
                                        'group relative flex cursor-default items-center rounded-sm py-1.5 pr-8 pl-2.5 text-xs transition-colors duration-100 outline-none select-none md:text-sm',
                                        'data-[focus]:bg-emerald-50 data-[focus]:text-emerald-900 dark:data-[focus]:bg-emerald-950/40 dark:data-[focus]:text-emerald-50',
                                        'data-[selected]:bg-emerald-500/10 data-[selected]:text-emerald-800 dark:data-[selected]:bg-emerald-500/20 dark:data-[selected]:text-emerald-200',
                                        'data-[focus]:data-[selected]:bg-emerald-500/20 data-[focus]:data-[selected]:text-emerald-900 dark:data-[focus]:data-[selected]:bg-emerald-500/30 dark:data-[focus]:data-[selected]:text-emerald-100',
                                        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                                    )}
                                >
                                    <span className="block min-w-0 truncate pr-1 font-normal group-data-[selected]:font-semibold">{item.label}</span>
                                    <span className="absolute right-2.5 hidden items-center text-emerald-600 group-data-[selected]:flex dark:text-emerald-400">
                                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                    </span>
                                </ComboboxOption>
                                ))}
                            </>
                        )}
                    </ComboboxOptions>
                </div>
            )}
        </Combobox>
    );
}
