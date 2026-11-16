import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

export type PermissionGroup = {
    id: string;
    label: string;
    hint?: string | null;
    permissions: Record<string, string>;
};

export type PermissionSection = {
    label: string;
    description: string;
    color: string;
    groups: PermissionGroup[];
};

export type PermissionSectionTree = Record<string, PermissionSection>;

function keysOf(section: PermissionSection): string[] {
    return section.groups.flatMap((group) => Object.keys(group.permissions));
}

function toggleKeys(selected: string[], keys: string[], checked: boolean): string[] {
    if (checked) {
        const next = [...selected];
        keys.forEach((key) => {
            if (!next.includes(key)) next.push(key);
        });
        return next;
    }
    return selected.filter((key) => !keys.includes(key));
}

function matches(query: string, label: string, key: string): boolean {
    if (!query) return true;
    const haystack = `${label} ${key}`.toLowerCase();
    return haystack.includes(query);
}

export function PermissionPicker({
    sections,
    selected,
    original = [],
    onChange,
}: {
    sections: PermissionSectionTree;
    selected: string[];
    original?: string[];
    onChange: (next: string[]) => void;
}) {
    const entries = Object.entries(sections);
    const [active, setActive] = useState(entries[0]?.[0] ?? '');
    const [query, setQuery] = useState('');
    const needle = query.trim().toLowerCase();
    const current = sections[active] ?? entries[0]?.[1];
    const currentId = sections[active] ? active : (entries[0]?.[0] ?? '');

    const visibleGroups = useMemo(() => {
        if (!current) return [];
        return current.groups
            .map((group) => ({
                ...group,
                permissions: Object.fromEntries(
                    Object.entries(group.permissions).filter(([key, label]) => matches(needle, label, key)),
                ),
            }))
            .filter((group) => Object.keys(group.permissions).length > 0);
    }, [current, needle]);

    if (!current) {
        return <p className="p-6 text-sm text-slate-500">No permissions are available.</p>;
    }

    const sectionKeys = keysOf(current);
    const sectionChosen = sectionKeys.filter((key) => selected.includes(key)).length;

    return (
        <div className="grid min-h-[32rem] lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="border-b bg-slate-50/80 lg:border-r lg:border-b-0">
                <div className="px-4 py-3">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Modules</p>
                    <p className="mt-1 text-xs text-slate-500">Same modules as the ERP home screen.</p>
                </div>
                <div className="max-h-[28rem] space-y-1 overflow-y-auto px-2 pb-3">
                    {entries.map(([sectionId, section]) => {
                        const keys = keysOf(section);
                        const chosen = keys.filter((key) => selected.includes(key)).length;
                        const on = sectionId === currentId;
                        return (
                            <button
                                key={sectionId}
                                type="button"
                                onClick={() => setActive(sectionId)}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                                    on ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70'
                                }`}
                            >
                                <span className="text-sm font-medium">{section.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chosen > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/70 text-slate-500'}`}>
                                    {chosen}/{keys.length}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            <section className="min-w-0">
                <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">{current.label}</h3>
                            <Badge variant="outline">{sectionChosen}/{sectionKeys.length}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{current.description}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-700">
                        <Checkbox
                            checked={sectionKeys.length > 0 && sectionChosen === sectionKeys.length}
                            onCheckedChange={(checked) => onChange(toggleKeys(selected, sectionKeys, checked === true))}
                        />
                        Select module
                    </label>
                </div>

                <div className="border-b px-4 py-3">
                    <div className="relative">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={`Search inside ${current.label}`}
                            className="pl-9"
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        Each group is a menu in this module. A checked item is a page that role can open.
                    </p>
                </div>

                <div className="space-y-4 p-4">
                    {visibleGroups.length === 0 ? (
                        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-slate-500">
                            Nothing in {current.label} matches “{query.trim()}”.
                        </p>
                    ) : (
                        visibleGroups.map((group) => {
                            const groupKeys = Object.keys(group.permissions);
                            const groupChosen = groupKeys.filter((key) => selected.includes(key)).length;
                            return (
                                <div key={group.id} className="overflow-hidden rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                                        <label className="flex min-w-0 items-start gap-3">
                                            <Checkbox
                                                className="mt-0.5"
                                                checked={groupKeys.length > 0 && groupChosen === groupKeys.length}
                                                onCheckedChange={(checked) => onChange(toggleKeys(selected, groupKeys, checked === true))}
                                            />
                                            <span>
                                                <span className="block text-sm font-semibold text-slate-900">{group.label}</span>
                                                <span className="block text-xs text-slate-500">
                                                    {group.hint ?? `${groupChosen} of ${groupKeys.length} selected`}
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                    <div className="divide-y">
                                        {Object.entries(group.permissions).map(([key, label]) => {
                                            const isSelected = selected.includes(key);
                                            const changed = original.length > 0 && isSelected !== original.includes(key);
                                            return (
                                                <label
                                                    key={key}
                                                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 ${
                                                        isSelected ? 'bg-emerald-50/60' : ''
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => onChange(toggleKeys(selected, [key], checked === true))}
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-center gap-2">
                                                            <Label className="cursor-pointer text-sm font-medium text-slate-800">{label}</Label>
                                                            {changed && (
                                                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[11px] text-amber-800">
                                                                    {isSelected ? 'Added' : 'Removed'}
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-slate-400">{key}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
}
