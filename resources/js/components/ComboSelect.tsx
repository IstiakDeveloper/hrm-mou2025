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
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) => {
            const hay = `${i.label} ${i.keywords ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [items, query]);

    return (
        <Combobox value={selectedItem} onChange={(item: ComboSelectItem<TValue> | null) => onChange(item ? item.value : null)} disabled={disabled}>
            <div className={cn('relative', className)}>
                <div
                    className={cn(
                        'border-input focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                        disabled && 'opacity-50'
                    )}
                >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Combobox.Input
                        className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                        displayValue={() => selectedItem?.label ?? ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={placeholder}
                    />
                    <Combobox.Button className="ml-auto">
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Combobox.Button>
                </div>

                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" afterLeave={() => setQuery('')}>
                    <Combobox.Options className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border p-1 text-sm shadow-md focus:outline-none">
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
                                            <span className={cn('block truncate', selected && 'font-medium')}>{item.label}</span>
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

