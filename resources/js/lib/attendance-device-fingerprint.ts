const STORAGE_KEY = 'hrm_attendance_device_fingerprint';

function createFingerprint(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stable per-browser device id for self attendance (stored in localStorage).
 */
export function getAttendanceDeviceFingerprint(): string {
    if (typeof window === 'undefined' || !window.localStorage) {
        return createFingerprint();
    }

    try {
        const existing = window.localStorage.getItem(STORAGE_KEY);
        if (existing && existing.trim().length >= 16) {
            return existing.trim();
        }

        const next = createFingerprint();
        window.localStorage.setItem(STORAGE_KEY, next);

        return next;
    } catch {
        return createFingerprint();
    }
}
