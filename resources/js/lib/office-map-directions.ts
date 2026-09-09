import type { OfficeMapLocation } from '@/lib/office-map-types';

export type UserCoords = {
    latitude: number;
    longitude: number;
};

function toRad(value: number): number {
    return (value * Math.PI) / 180;
}

export function distanceKm(from: UserCoords, to: Pick<OfficeMapLocation, 'latitude' | 'longitude'>): number {
    const earthKm = 6371;
    const dLat = toRad(to.latitude - from.latitude);
    const dLng = toRad(to.longitude - from.longitude);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;

    return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m away`;
    }

    return `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

function prefersAppleMaps(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function officeDirectionsUrl(office: OfficeMapLocation, origin?: UserCoords | null): string {
    const dest = `${office.latitude},${office.longitude}`;

    if (prefersAppleMaps()) {
        const url = new URL('https://maps.apple.com/');
        url.searchParams.set('daddr', dest);
        url.searchParams.set('dirflg', 'd');
        if (origin) {
            url.searchParams.set('saddr', `${origin.latitude},${origin.longitude}`);
        }

        return url.toString();
    }

    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('destination', dest);
    url.searchParams.set('travelmode', 'driving');
    if (origin) {
        url.searchParams.set('origin', `${origin.latitude},${origin.longitude}`);
    }

    return url.toString();
}

export function openOfficeDirections(office: OfficeMapLocation, origin?: UserCoords | null): void {
    window.open(officeDirectionsUrl(office, origin), '_blank', 'noopener,noreferrer');
}

export function requestUserCoords(): Promise<UserCoords | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
        );
    });
}

export async function startOfficeDirections(
    office: OfficeMapLocation,
    knownOrigin?: UserCoords | null,
): Promise<UserCoords | null> {
    const origin = knownOrigin ?? (await requestUserCoords());
    openOfficeDirections(office, origin);

    return origin;
}
