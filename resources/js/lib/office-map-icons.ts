import type { OfficeMapLocation, OfficeMapLocationType } from '@/lib/office-map-types';
import L from 'leaflet';

const PIN = {
    head_office: { color: '#047857', size: 44 },
    zone: { color: '#d97706', size: 38 },
    region: { color: '#b91c1c', size: 34 },
    branch: { color: '#2563eb', size: 28 },
} as const;

export const OFFICE_MAP_TYPE_META: Record<OfficeMapLocationType, { label: string; shortLabel: string; color: string }> = {
    head_office: { label: 'Head Office', shortLabel: 'HO', color: PIN.head_office.color },
    zone: { label: 'Zone Office', shortLabel: 'Zone', color: PIN.zone.color },
    region: { label: 'Regional Office', shortLabel: 'Regional', color: PIN.region.color },
    branch: { label: 'Branch', shortLabel: 'Branch', color: PIN.branch.color },
};

const LEGEND_ORDER: OfficeMapLocationType[] = ['head_office', 'zone', 'region', 'branch'];

export function officeMapLegendTypes(): OfficeMapLocationType[] {
    return LEGEND_ORDER;
}

export function officeTypeLabel(location: OfficeMapLocation): string {
    if (location.type === 'head_office' || location.is_head_office) {
        return 'Head Office';
    }

    if (location.type === 'zone') {
        return 'Zone Office · Branch';
    }

    if (location.type === 'region') {
        return 'Regional Office · Branch';
    }

    return 'Branch';
}

export function isOfficeMapType(value: string): value is OfficeMapLocationType {
    return value === 'head_office' || value === 'zone' || value === 'region' || value === 'branch';
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function getOfficeMapIcon(
    type: OfficeMapLocationType,
    orgLogo: string,
    name: string,
    selected = false,
): L.DivIcon {
    const cfg = PIN[type] ?? PIN.branch;
    const meta = OFFICE_MAP_TYPE_META[type];
    const showRole = type !== 'branch';
    const width = 168;
    const height = cfg.size + 10;

    return L.divIcon({
        className: `office-map-pin${selected ? ' office-map-pin-is-selected' : ''}`,
        iconSize: [width, height],
        iconAnchor: [cfg.size / 2, height],
        popupAnchor: [0, -(cfg.size + 4)],
        html: `
            <span class="office-map-marker" style="--pin-color:${meta.color};--pin-size:${cfg.size}px">
                <span class="office-map-pin-body">
                    <span class="office-map-pin-logo-wrap"><img src="${escapeHtml(orgLogo)}" alt="" /></span>
                </span>
                <span class="office-map-pin-caption">
                    <strong>${escapeHtml(name)}</strong>
                    ${showRole ? `<em>${escapeHtml(meta.shortLabel)}</em>` : ''}
                </span>
            </span>
        `.trim(),
    });
}
