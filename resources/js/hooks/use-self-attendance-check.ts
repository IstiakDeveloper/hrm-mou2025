import { useCallback, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { getAttendanceDeviceFingerprint } from "@/lib/attendance-device-fingerprint";

export type GeoSample = {
    lat: number;
    lng: number;
    accuracy: number | null;
    at: string;
};

export type LocationPreview = {
    bestAccuracy: number | null;
    sampleCount: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const getCurrentPositionOnce = (opts?: Partial<PositionOptions>) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 5000,
            ...opts,
        });
    });

function inertiaFirstString(errors: Record<string, unknown>): string | null {
    for (const key of ["attendance", "lat", "lng"] as const) {
        const v = errors[key];
        if (typeof v === "string" && v.trim()) return v;
        if (Array.isArray(v) && v.length && typeof v[0] === "string") return v[0];
    }
    return null;
}

function geoFailureMessage(e: unknown): string {
    if (e && typeof e === "object" && "code" in e) {
        const code = (e as { code?: number }).code;
        if (code === 1) return "Location permission denied. Please allow location access.";
        if (code === 2) return "Location unavailable. Please turn on GPS and try again.";
        if (code === 3) return "Location request timed out. Please try again in an open area.";
    }
    if (e instanceof Error && e.message) return e.message;
    return "Unable to get location.";
}

/**
 * GPS-based self check-in / check-out (same routes as legacy employee dashboard).
 */
export function useSelfAttendanceCheck() {
    const { errors = {} } = usePage().props as any;
    const [actionType, setActionType] = useState<"check-in" | "check-out" | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState<string | null>(null);
    const [locationProgress, setLocationProgress] = useState(0);
    const [locationPreview, setLocationPreview] = useState<LocationPreview>({
        bestAccuracy: null,
        sampleCount: 0,
    });

    const attendanceError = localError || (errors.attendance as string) || (errors.lat as string) || (errors.lng as string) || null;

    const handleDismissError = useCallback(() => {
        setLocalError(null);
        setActionType(null);
        router.clearErrors();
    }, []);

    const getBestLocation = useCallback(async (sampleCount = 3) => {
        const samples: GeoSample[] = [];
        let lastError: unknown = null;
        setLocationProgress(5);
        setLocationPreview({
            bestAccuracy: null,
            sampleCount: 0,
        });

        for (let i = 0; i < sampleCount; i++) {
            setLocationStatus(`Locking GPS signal... (${i + 1}/${sampleCount})`);
            setLocationProgress(10 + Math.round((i / sampleCount) * 60));

            try {
                const pos = await getCurrentPositionOnce({
                    enableHighAccuracy: true,
                    timeout: 30000,
                    maximumAge: 0,
                });

                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const accuracy = typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;

                samples.push({
                    lat,
                    lng,
                    accuracy,
                    at: new Date(pos.timestamp).toISOString(),
                });
                setLocationPreview((prev) => {
                    const currentBest =
                        prev.bestAccuracy === null ? Number.POSITIVE_INFINITY : prev.bestAccuracy;
                    const nextBest = accuracy === null ? Number.POSITIVE_INFINITY : accuracy;
                    const isBetter = nextBest < currentBest;

                    return {
                        bestAccuracy: isBetter ? accuracy : prev.bestAccuracy,
                        sampleCount: prev.sampleCount + 1,
                    };
                });
            } catch (e: unknown) {
                lastError = e;
                const code = e && typeof e === "object" && "code" in e ? (e as { code?: number }).code : undefined;
                if (code === 3) {
                    try {
                        const pos = await getCurrentPositionOnce({
                            enableHighAccuracy: false,
                            timeout: 15000,
                            maximumAge: 15000,
                        });

                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        const acc = typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;

                        samples.push({
                            lat,
                            lng,
                            accuracy: acc,
                            at: new Date(pos.timestamp).toISOString(),
                        });
                        setLocationPreview((prev) => {
                            const currentBest =
                                prev.bestAccuracy === null ? Number.POSITIVE_INFINITY : prev.bestAccuracy;
                            const nextBest = acc === null ? Number.POSITIVE_INFINITY : acc;
                            const isBetter = nextBest < currentBest;

                            return {
                                bestAccuracy: isBetter ? acc : prev.bestAccuracy,
                                sampleCount: prev.sampleCount + 1,
                            };
                        });
                    } catch (e2: unknown) {
                        lastError = e2;
                    }
                }
            }

            if (i < sampleCount - 1) {
                await sleep(800);
            }
        }

        if (samples.length === 0) {
            throw new Error(geoFailureMessage(lastError));
        }

        setLocationProgress(75);
        const best = samples
            .slice()
            .sort((a, b) => (a.accuracy ?? Number.POSITIVE_INFINITY) - (b.accuracy ?? Number.POSITIVE_INFINITY))[0];

        return { best, samples };
    }, []);

    const handleCheckIn = useCallback(async () => {
        setActionType("check-in");
        setLocalError(null);
        setIsSubmitting(true);
        setLocationProgress(0);

        try {
            const { best, samples } = await getBestLocation(3);
            setLocationStatus("Syncing with branch database...");
            setLocationProgress(90);

            router.post(
                route("employee.attendance.check-in"),
                {
                    lat: best.lat,
                    lng: best.lng,
                    accuracy: best.accuracy,
                    samples,
                    device_fingerprint: getAttendanceDeviceFingerprint(),
                },
                {
                    preserveScroll: true,
                    onError: (errors) => {
                        const msg =
                            inertiaFirstString(errors as Record<string, unknown>) ?? "Check-in failed.";
                        setLocalError(msg);
                        toast({
                            title: "Check-in Failed",
                            description: msg,
                            variant: "destructive",
                        });
                    },
                    onFinish: () => {
                        setIsSubmitting(false);
                        setLocationStatus(null);
                        setLocationProgress(100);
                        window.setTimeout(() => {
                            setLocationProgress(0);
                            setActionType(null);
                        }, 1200);
                    },
                },
            );
        } catch (e: unknown) {
            setIsSubmitting(false);
            setLocationStatus(null);
            setLocationProgress(0);
            const msg = geoFailureMessage(e);
            setLocalError(msg);
            toast({
                title: "Check-in Failed",
                description: msg,
                variant: "destructive",
            });
        }
    }, [getBestLocation]);

    const handleCheckOut = useCallback(async () => {
        setActionType("check-out");
        setLocalError(null);
        setIsSubmitting(true);
        setLocationProgress(0);

        try {
            const { best, samples } = await getBestLocation(3);
            setLocationStatus("Syncing with branch database...");
            setLocationProgress(90);

            router.post(
                route("employee.attendance.check-out"),
                {
                    lat: best.lat,
                    lng: best.lng,
                    accuracy: best.accuracy,
                    samples,
                    device_fingerprint: getAttendanceDeviceFingerprint(),
                },
                {
                    preserveScroll: true,
                    onError: (errors) => {
                        const msg =
                            inertiaFirstString(errors as Record<string, unknown>) ?? "Check-out failed.";
                        setLocalError(msg);
                        toast({
                            title: "Check-out Failed",
                            description: msg,
                            variant: "destructive",
                        });
                    },
                    onFinish: () => {
                        setIsSubmitting(false);
                        setLocationStatus(null);
                        setLocationProgress(100);
                        window.setTimeout(() => {
                            setLocationProgress(0);
                            setActionType(null);
                        }, 1200);
                    },
                },
            );
        } catch (e: unknown) {
            setIsSubmitting(false);
            setLocationStatus(null);
            setLocationProgress(0);
            const msg = geoFailureMessage(e);
            setLocalError(msg);
            toast({
                title: "Check-out Failed",
                description: msg,
                variant: "destructive",
            });
        }
    }, [getBestLocation]);

    return {
        actionType,
        isSubmitting,
        attendanceError,
        locationStatus,
        locationProgress,
        locationPreview,
        handleCheckIn,
        handleCheckOut,
        handleDismissError,
    };
}
