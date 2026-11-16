/**
 * Resolve a short place name for movement log book start place.
 * Prefers reverse-geocoded current location; falls back to branch name.
 */
export async function resolveMovementStartPlace(branchName?: string | null): Promise<string> {
  const fallback = (branchName || '').trim() || 'Unknown';

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return fallback;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });

    const { latitude, longitude } = position.coords;
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const address = data?.address ?? {};
    const short =
      address.suburb ||
      address.neighbourhood ||
      address.village ||
      address.town ||
      address.city_district ||
      address.city ||
      address.municipality ||
      address.county ||
      data?.name ||
      null;

    if (typeof short === 'string' && short.trim()) {
      return short.trim().slice(0, 255);
    }
  } catch {
    // ignore — use branch fallback
  }

  return fallback;
}
