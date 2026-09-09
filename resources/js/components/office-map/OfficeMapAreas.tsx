import type { OfficeMapLocation } from '@/lib/office-map-types';
import L from 'leaflet';
import { Rectangle, Tooltip } from 'react-leaflet';

type AreaBox = {
    id: string;
    label: string;
    bounds: L.LatLngBounds;
    color: string;
    weight: number;
    dashArray?: string;
    fillOpacity: number;
};

const ZONE_COLORS = ['#d97706', '#7c3aed', '#0f766e', '#b45309'];

function paddedBounds(locations: OfficeMapLocation[], pad: number): L.LatLngBounds | null {
    const mapped = locations.filter((office) => office.latitude != null && office.longitude != null);
    if (mapped.length === 0) {
        return null;
    }

    const lats = mapped.map((office) => office.latitude);
    const lngs = mapped.map((office) => office.longitude);
    const extra = mapped.length === 1 ? pad + 0.02 : pad;

    return L.latLngBounds(
        [Math.min(...lats) - extra, Math.min(...lngs) - extra],
        [Math.max(...lats) + extra, Math.max(...lngs) + extra],
    );
}

export function operationalOffices(locations: OfficeMapLocation[]): OfficeMapLocation[] {
    return locations.filter((office) => office.type !== 'head_office' && !office.is_head_office);
}

export function buildOfficeAreaBoxes(locations: OfficeMapLocation[]): AreaBox[] {
    const fieldOffices = operationalOffices(locations);
    const boxes: AreaBox[] = [];

    const overall = paddedBounds(fieldOffices, 0.035);
    if (overall) {
        boxes.push({
            id: 'coverage',
            label: 'Coverage area',
            bounds: overall,
            color: '#0f172a',
            weight: 2.5,
            fillOpacity: 0.03,
        });
    }

    const zoneIds = [...new Set(fieldOffices.map((office) => office.zone_id).filter((id): id is number => id != null))];
    zoneIds.forEach((zoneId, index) => {
        const offices = fieldOffices.filter((office) => office.zone_id === zoneId);
        const bounds = paddedBounds(offices, 0.018);
        if (!bounds) {
            return;
        }

        boxes.push({
            id: `zone-${zoneId}`,
            label: `${offices[0]?.zone_name ?? 'Zone'} Zone`,
            bounds,
            color: ZONE_COLORS[index % ZONE_COLORS.length],
            weight: 2,
            dashArray: '8 5',
            fillOpacity: 0.05,
        });
    });

    const regionIds = [...new Set(fieldOffices.map((office) => office.region_id).filter((id): id is number => id != null))];
    regionIds.forEach((regionId) => {
        const offices = fieldOffices.filter((office) => office.region_id === regionId);
        const bounds = paddedBounds(offices, 0.01);
        if (!bounds) {
            return;
        }

        boxes.push({
            id: `region-${regionId}`,
            label: `${offices[0]?.region_name ?? 'Regional'} Area`,
            bounds,
            color: '#2563eb',
            weight: 1.25,
            dashArray: '3 4',
            fillOpacity: 0.02,
        });
    });

    return boxes;
}

export default function OfficeMapAreas({ locations }: { locations: OfficeMapLocation[] }) {
    const boxes = buildOfficeAreaBoxes(locations);

    return (
        <>
            {boxes.map((box) => (
                <Rectangle
                    key={box.id}
                    bounds={box.bounds}
                    pathOptions={{
                        color: box.color,
                        weight: box.weight,
                        dashArray: box.dashArray,
                        fillColor: box.color,
                        fillOpacity: box.fillOpacity,
                        lineJoin: 'round',
                    }}
                >
                    <Tooltip sticky className="office-map-area-label">
                        {box.label}
                    </Tooltip>
                </Rectangle>
            ))}
        </>
    );
}
