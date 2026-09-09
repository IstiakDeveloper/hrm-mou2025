import { Input } from '@/components/ui/input';
import { distanceKm, formatDistance, type UserCoords } from '@/lib/office-map-directions';
import { OFFICE_MAP_TYPE_META, officeMapLegendTypes, officeTypeLabel } from '@/lib/office-map-icons';
import type { OfficeMapCounts, OfficeMapLocation, OfficeMapLocationType } from '@/lib/office-map-types';
import { Navigation, Search, X } from 'lucide-react';

type OfficeMapDirectoryProps = {
    locations: OfficeMapLocation[];
    counts: OfficeMapCounts;
    query: string;
    typeFilter: OfficeMapLocationType | 'all';
    selectedId: string | null;
    userCoords: UserCoords | null;
    onQueryChange: (value: string) => void;
    onTypeFilterChange: (value: OfficeMapLocationType | 'all') => void;
    onSelect: (office: OfficeMapLocation) => void;
    onDirections: (office: OfficeMapLocation) => void;
};

function matchesQuery(office: OfficeMapLocation, query: string): boolean {
    if (query === '') {
        return true;
    }

    const haystack = `${office.name} ${office.code ?? ''} ${officeTypeLabel(office)}`.toLowerCase();

    return haystack.includes(query);
}

export function filterOfficeMapLocations(
    locations: OfficeMapLocation[],
    query: string,
    typeFilter: OfficeMapLocationType | 'all',
): OfficeMapLocation[] {
    const normalized = query.trim().toLowerCase();

    return locations.filter((office) => {
        if (typeFilter !== 'all' && office.type !== typeFilter) {
            return false;
        }

        return matchesQuery(office, normalized);
    });
}

export default function OfficeMapDirectory({
    locations,
    counts,
    query,
    typeFilter,
    selectedId,
    userCoords,
    onQueryChange,
    onTypeFilterChange,
    onSelect,
    onDirections,
}: OfficeMapDirectoryProps) {
    const filtered = filterOfficeMapLocations(locations, query, typeFilter);
    const grouped = officeMapLegendTypes()
        .map((type) => ({
            type,
            items: filtered.filter((office) => office.type === type),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="space-y-3 border-b border-slate-200 p-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Search branch, zone, or code"
                        className="h-10 pr-9 pl-9"
                        autoComplete="off"
                    />
                    {query !== '' && (
                        <button
                            type="button"
                            onClick={() => onQueryChange('')}
                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={typeFilter === 'all'} onClick={() => onTypeFilterChange('all')} label={`All (${locations.length})`} />
                    {officeMapLegendTypes().map((type) => (
                        <FilterChip
                            key={type}
                            active={typeFilter === type}
                            onClick={() => onTypeFilterChange(type)}
                            label={`${OFFICE_MAP_TYPE_META[type].shortLabel} (${counts[type]})`}
                            color={OFFICE_MAP_TYPE_META[type].color}
                        />
                    ))}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {grouped.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">No office matches that search.</p>
                ) : (
                    grouped.map((group) => (
                        <div key={group.type} className="border-b border-slate-100 last:border-b-0">
                            <p className="sticky top-0 z-10 bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                {OFFICE_MAP_TYPE_META[group.type].label}
                                <span className="ml-1 font-medium text-slate-400">({group.items.length})</span>
                            </p>
                            <ul>
                                {group.items.map((office) => {
                                    const selected = office.id === selectedId;

                                    const distance = userCoords ? formatDistance(distanceKm(userCoords, office)) : null;

                                    return (
                                        <li key={office.id} className={`flex items-stretch ${selected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                                            <button
                                                type="button"
                                                onClick={() => onSelect(office)}
                                                className="flex min-w-0 flex-1 items-start gap-3 px-4 py-2.5 text-left"
                                            >
                                                <span
                                                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: OFFICE_MAP_TYPE_META[office.type].color }}
                                                />
                                                <span className="min-w-0">
                                                    <span className={`block truncate text-sm font-semibold ${selected ? 'text-emerald-900' : 'text-slate-800'}`}>
                                                        {office.name}
                                                    </span>
                                                    <span className="block truncate text-[11px] text-slate-500">
                                                        {officeTypeLabel(office)}
                                                        {office.code ? ` · ${office.code}` : ''}
                                                        {distance ? ` · ${distance}` : ''}
                                                    </span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDirections(office)}
                                                className="mr-2 self-center rounded-md p-2 text-emerald-700 hover:bg-emerald-100"
                                                title={`Directions to ${office.name}`}
                                                aria-label={`Directions to ${office.name}`}
                                            >
                                                <Navigation className="h-4 w-4" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function FilterChip({
    active,
    onClick,
    label,
    color,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    color?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                active
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            {color && !active && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
            {label}
        </button>
    );
}
