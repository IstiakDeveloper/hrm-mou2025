import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { useEffect, useMemo, useRef, useState } from 'react';

export type AppraisalEmployee = {
    id: number;
    pin?: string | null;
    name_en?: string | null;
    name_bn?: string | null;
    designation?: { name?: string | null; title?: string | null } | null;
    branch?: { name?: string | null } | null;
    [key: string]: unknown;
};

type Props = {
    lookupUrl: string;
    value: number | null;
    onSelect: (employee: AppraisalEmployee | null) => void;
    lang?: 'bn' | 'en';
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
};

export function AppraisalEmployeeCombo({
    lookupUrl,
    value,
    onSelect,
    lang = 'bn',
    placeholder,
    invalid = false,
    disabled = false,
}: Props) {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<AppraisalEmployee[]>([]);
    const [selected, setSelected] = useState<AppraisalEmployee | null>(null);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0);

    useEffect(() => {
        const controller = new AbortController();
        const handle = window.setTimeout(() => {
            const current = ++requestId.current;
            setLoading(true);

            const params = new URLSearchParams({ limit: '20' });
            const term = query.trim();
            if (term !== '') {
                params.set('q', term);
            }

            fetch(`${lookupUrl}?${params.toString()}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                signal: controller.signal,
            })
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error(`Lookup failed (${response.status})`);
                    }
                    return (await response.json()) as AppraisalEmployee[];
                })
                .then((rows) => {
                    if (current !== requestId.current) return;
                    setOptions(Array.isArray(rows) ? rows : []);
                })
                .catch((error: unknown) => {
                    if (error instanceof DOMException && error.name === 'AbortError') return;
                    if (current !== requestId.current) return;
                    setOptions([]);
                })
                .finally(() => {
                    if (current === requestId.current) setLoading(false);
                });
        }, query.trim() === '' ? 0 : 250);

        return () => {
            window.clearTimeout(handle);
            controller.abort();
        };
    }, [lookupUrl, query]);

    const pool = useMemo(() => {
        if (!selected) return options;
        if (options.some((row) => row.id === selected.id)) return options;
        return [selected, ...options];
    }, [options, selected]);

    const items = useMemo<ComboSelectItem<number>[]>(() => {
        return pool.map((emp) => {
            const name = lang === 'bn' ? (emp.name_bn || emp.name_en || '') : (emp.name_en || emp.name_bn || '');
            const designation = emp.designation?.name || emp.designation?.title || '';
            const branch = emp.branch?.name || '';
            const pin = emp.pin || '';
            return {
                value: emp.id,
                label: `[${pin}] ${name}${designation ? ` — ${designation}` : ''}${branch ? ` (${branch})` : ''}`,
                keywords: `${pin} ${emp.name_en || ''} ${emp.name_bn || ''} ${designation} ${branch}`,
            };
        });
    }, [lang, pool]);

    const resolvedPlaceholder = placeholder
        ?? (lang === 'bn' ? 'পিন বা নাম লিখে খুঁজুন ও নির্বাচন করুন' : 'Search by PIN or name, then select');

    return (
        <div className="space-y-1">
            <ComboSelect<number>
                value={value}
                onChange={(next) => {
                    if (next == null) {
                        setSelected(null);
                        onSelect(null);
                        return;
                    }
                    const match = pool.find((row) => row.id === next) ?? null;
                    setSelected(match);
                    onSelect(match);
                }}
                onQueryChange={setQuery}
                items={items}
                placeholder={resolvedPlaceholder}
                clearable
                disabled={disabled}
                emptyText={loading
                    ? (lang === 'bn' ? 'খোঁজা হচ্ছে…' : 'Searching…')
                    : (lang === 'bn' ? 'কোনো কর্মী পাওয়া যায়নি' : 'No employees found')}
                triggerClassName={`h-11 bg-white ${invalid ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'}`}
            />
            <p className="text-[11px] text-slate-500">
                {loading
                    ? (lang === 'bn' ? 'কর্মীর তালিকা লোড হচ্ছে…' : 'Loading employees…')
                    : (lang === 'bn' ? 'পিন, ইংরেজি বা বাংলা নাম দিয়ে সার্চ করে সিলেক্ট করুন' : 'Type a PIN or name to search and select')}
            </p>
        </div>
    );
}
