import React, { Fragment, useMemo, useState } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
};

export function ComboSelect<TValue extends string | number = string>({
    value,
    onChange,
    items,
    placeholder = 'Select…',
    disabled,
    className,
}: Props<TValue>) {
    const [query, setQuery] = useState('');

    const selectedItem = useMemo(() => {
        return items.find((i) => i.value === value) ?? null;
    }, [items, value]);

    const filtered = useMemo(() => {
        const raw = query.trim().toLowerCase();
        if (!raw) return items;
        const tokens = raw.split(/\s+/).filter(Boolean);
        return items.filter((i) => {
            const hay = `${i.label} ${i.keywords ?? ''}`.toLowerCase();
            return tokens.every((t) => hay.includes(t));
        });
    }, [items, query]);

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
            <div className={cn('relative w-full min-w-[9.5rem]', className)}>
                <div
                    className={cn(
                        'border-input focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full min-w-0 items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                        disabled && 'opacity-50'
                    )}
                >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Combobox.Input
                        className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                        displayValue={(item) => (item as ComboSelectItem<TValue> | null)?.label ?? ''}
                        autoComplete="off"
                        onChange={(event) => setQuery(event.target.value)}
                        onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
                        placeholder={placeholder}
                    />
                    <Combobox.Button className="ml-auto">
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Combobox.Button>
                </div>

                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Combobox.Options
                        portal
                        anchor="bottom start"
                        modal={false}
                        className="bg-popover text-popover-foreground z-[100] max-h-72 max-w-[min(24rem,calc(100vw-1.5rem))] overflow-x-hidden overflow-y-auto rounded-md border p-1 text-sm shadow-md focus:outline-none [width:max(10rem,var(--input-width,10rem))] [min-width:max(10rem,var(--input-width,10rem))]"
                    >
                        {filtered.length === 0 ? (
                            <div className="px-2 py-2 text-xs text-muted-foreground">No results.</div>
                        ) : (
                            filtered.map((item) => (
                                <Combobox.Option
                                    key={String(item.value)}
                                    value={item}
                                    disabled={item.disabled}
                                    className={({ active, disabled }) =>
                                        cn(
                                            'relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 outline-none',
                                            active && 'bg-accent text-accent-foreground',
                                            disabled && 'opacity-50'
                                        )
                                    }
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={cn('block min-w-0 break-words pr-1', selected && 'font-medium')}>{item.label}</span>
                                            {selected ? (
                                                <span className="absolute right-2 flex items-center">
                                                    <Check className="h-4 w-4" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );
}

