import OfficeMapAreas, { operationalOffices } from '@/components/office-map/OfficeMapAreas';
import OfficeMapDirectory, { filterOfficeMapLocations } from '@/components/office-map/OfficeMapDirectory';
import { distanceKm, formatDistance, startOfficeDirections, type UserCoords } from '@/lib/office-map-directions';
import { getOfficeMapIcon, isOfficeMapType, officeTypeLabel } from '@/lib/office-map-icons';
import type { OfficeMapLocation, OfficeMapLocationType, OfficeMapPageProps } from '@/lib/office-map-types';
import { Link, usePage } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { List, Maximize2, Navigation, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

const BANGLADESH_CENTER: L.LatLngExpression = [23.685, 90.3563];

function FitLocations({ locations }: { locations: OfficeMapLocation[] }) {
    const map = useMap();
    const fitted = useRef(false);

    useEffect(() => {
        map.invalidateSize();

        if (fitted.current || locations.length === 0) {
            if (locations.length === 0) {
                map.setView(BANGLADESH_CENTER, 7);
            }
            return;
        }

        const fieldOffices = operationalOffices(locations);
        const fitTargets = fieldOffices.length > 0 ? fieldOffices : locations;

        if (fitTargets.length === 1) {
            map.setView([fitTargets[0].latitude, fitTargets[0].longitude], 14);
        } else {
            const bounds = L.latLngBounds(fitTargets.map((office) => [office.latitude, office.longitude] as L.LatLngTuple));
            map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
        }

        fitted.current = true;
    }, [map, locations]);

    return null;
}

function FlyToOffice({ office }: { office: OfficeMapLocation | null }) {
    const map = useMap();

    useEffect(() => {
        if (!office) {
            return;
        }

        map.flyTo([office.latitude, office.longitude], 16, { duration: 0.75 });
    }, [map, office]);

    return null;
}

function OfficeMarker({
    office,
    orgLogo,
    selected,
    userCoords,
    onDirections,
}: {
    office: OfficeMapLocation;
    orgLogo: string;
    selected: boolean;
    userCoords: UserCoords | null;
    onDirections: (office: OfficeMapLocation) => void;
}) {
    const markerRef = useRef<L.Marker | null>(null);
    const type = isOfficeMapType(office.type) ? office.type : 'branch';
    const distance = userCoords ? formatDistance(distanceKm(userCoords, office)) : null;

    useEffect(() => {
        if (!selected) {
            return;
        }

        const timer = window.setTimeout(() => {
            markerRef.current?.openPopup();
        }, 780);

        return () => window.clearTimeout(timer);
    }, [selected]);

    return (
        <Marker
            ref={markerRef}
            position={[office.latitude, office.longitude]}
            icon={getOfficeMapIcon(type, orgLogo, office.name, selected)}
            zIndexOffset={selected ? 800 : type === 'head_office' ? 400 : type === 'zone' ? 300 : type === 'region' ? 200 : 0}
        >
            <Popup>
                <div className="min-w-[14rem] text-sm">
                    <p className="font-semibold text-slate-900">{office.name}</p>
                    <p className="text-xs text-slate-500">{officeTypeLabel(office)}</p>
                    {office.code && <p className="mt-1 text-xs text-slate-600">Code: {office.code}</p>}
                    {office.address && <p className="mt-1 text-xs text-slate-600">{office.address}</p>}
                    {office.phone && (
                        <p className="text-xs text-slate-600">
                            <a href={`tel:${office.phone}`} className="text-emerald-700 hover:underline">
                                {office.phone}
                            </a>
                        </p>
                    )}
                    {distance && <p className="mt-1 text-xs font-medium text-emerald-700">{distance}</p>}
                    <button
                        type="button"
                        onClick={() => onDirections(office)}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                        <Navigation className="h-3.5 w-3.5" />
                        Get directions
                    </button>
                </div>
            </Popup>
        </Marker>
    );
}

function ShowAllControl({ locations }: { locations: OfficeMapLocation[] }) {
    const map = useMap();

    if (locations.length === 0) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => {
                const fieldOffices = operationalOffices(locations);
                const fitTargets = fieldOffices.length > 0 ? fieldOffices : locations;

                if (fitTargets.length === 1) {
                    map.setView([fitTargets[0].latitude, fitTargets[0].longitude], 14);
                    return;
                }

                const bounds = L.latLngBounds(fitTargets.map((office) => [office.latitude, office.longitude] as L.LatLngTuple));
                map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
            }}
            className="absolute right-4 bottom-6 z-[1100] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
        >
            <Maximize2 className="h-3.5 w-3.5" />
            Show all
        </button>
    );
}

export default function OfficeMapCanvas({ locations, counts, orgLogo }: OfficeMapPageProps) {
    const { auth, name } = usePage().props as { auth?: { user?: { id: number } | null }; name?: string };
    const isAuthenticated = Boolean(auth?.user);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<OfficeMapLocationType | 'all'>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userCoords, setUserCoords] = useState<UserCoords | null>(null);

    const visibleLocations = useMemo(
        () => filterOfficeMapLocations(locations, query, typeFilter),
        [locations, query, typeFilter],
    );

    const selectedOffice = locations.find((office) => office.id === selectedId) ?? null;
    const orgTitle = name?.trim() || 'Mousumi';

    const selectOffice = (office: OfficeMapLocation) => {
        setSelectedId(office.id);
        setMobileOpen(false);
    };

    const openDirections = async (office: OfficeMapLocation) => {
        const origin = await startOfficeDirections(office, userCoords);
        if (origin && !userCoords) {
            setUserCoords(origin);
        }
    };

    const submitSearch = () => {
        if (visibleLocations.length === 0) {
            return;
        }

        selectOffice(visibleLocations[0]);
    };

    const directory = (
        <OfficeMapDirectory
            locations={locations}
            counts={counts}
            query={query}
            typeFilter={typeFilter}
            selectedId={selectedId}
            userCoords={userCoords}
            onQueryChange={setQuery}
            onTypeFilterChange={setTypeFilter}
            onSelect={selectOffice}
            onDirections={openDirections}
        />
    );

    return (
        <div className="office-map-root flex h-screen w-full flex-col overflow-hidden bg-slate-100">
            <header className="z-[1200] flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                <img src={orgLogo} alt="" className="h-9 w-9 rounded-lg border border-slate-200 object-contain p-0.5" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{orgTitle} Office Locator</p>
                    <p className="truncate text-[11px] text-slate-500">Search or select a branch to open it on the map</p>
                </div>
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 lg:hidden"
                >
                    <List className="h-3.5 w-3.5" />
                    Offices
                </button>
                {isAuthenticated ? (
                    <Link
                        href="/sections"
                        className="hidden rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 sm:inline-flex"
                    >
                        Back to ERP
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        className="hidden rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 sm:inline-flex"
                    >
                        Staff login
                    </Link>
                )}
            </header>

            <div className="flex min-h-0 flex-1">
                <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
                    <form
                        className="flex min-h-0 flex-1 flex-col"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSearch();
                        }}
                    >
                        {directory}
                    </form>
                </aside>

                <div className="relative min-w-0 flex-1">
                    {visibleLocations.length === 0 && (
                        <div className="pointer-events-none absolute inset-x-0 top-6 z-[1100] flex justify-center px-4">
                            <p className="rounded-lg bg-white/95 px-4 py-2 text-sm text-slate-600 shadow">
                                No office matches that search.
                            </p>
                        </div>
                    )}

                    <MapContainer center={BANGLADESH_CENTER} zoom={7} scrollWheelZoom className="h-full w-full">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <FitLocations locations={locations} />
                        <FlyToOffice office={selectedOffice} />
                        <ShowAllControl locations={visibleLocations.length > 0 ? visibleLocations : locations} />
                        <OfficeMapAreas locations={visibleLocations.length > 0 ? visibleLocations : locations} />

                        {visibleLocations.map((office) => (
                            <OfficeMarker
                                key={office.id}
                                office={office}
                                orgLogo={orgLogo}
                                selected={office.id === selectedId}
                                userCoords={userCoords}
                                onDirections={openDirections}
                            />
                        ))}
                    </MapContainer>
                </div>
            </div>

            {mobileOpen && (
                <div className="fixed inset-0 z-[1300] lg:hidden">
                    <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close offices" onClick={() => setMobileOpen(false)} />
                    <div className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <p className="text-sm font-semibold text-slate-800">Offices</p>
                            <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            className="min-h-0 flex-1"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submitSearch();
                            }}
                        >
                            {directory}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
