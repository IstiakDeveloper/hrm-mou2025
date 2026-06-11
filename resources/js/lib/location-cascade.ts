import { useCallback, useEffect, useState } from 'react';

export type LocationUnion = {
    name: string;
    type: string;
    villages: string[];
};

type LocationState = {
    upazilas: Record<string, string[]>;
    unions: Record<string, LocationUnion[]>;
};

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
    });
    if (!response.ok) {
        throw new Error(`Location request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
}

export function useLocationCascade(initial?: Partial<LocationState>) {
    const [state, setState] = useState<LocationState>({
        upazilas: initial?.upazilas ?? {},
        unions: initial?.unions ?? {},
    });

    const loadUpazilas = useCallback(async (district: string) => {
        const key = district.trim();
        if (key === '') {
            return [] as string[];
        }
        if (state.upazilas[key]) {
            return state.upazilas[key];
        }
        const params = new URLSearchParams({ district: key });
        const items = await fetchJson<string[]>(`/employees/locations/upazilas?${params}`);
        setState((prev) => ({ ...prev, upazilas: { ...prev.upazilas, [key]: items } }));
        return items;
    }, [state.upazilas]);

    const loadUnions = useCallback(async (upazila: string) => {
        const key = upazila.trim();
        if (key === '') {
            return [] as LocationUnion[];
        }
        if (state.unions[key]) {
            return state.unions[key];
        }
        const params = new URLSearchParams({ upazila: key });
        const items = await fetchJson<LocationUnion[]>(`/employees/locations/unions?${params}`);
        setState((prev) => ({ ...prev, unions: { ...prev.unions, [key]: items } }));
        return items;
    }, [state.unions]);

    return { ...state, loadUpazilas, loadUnions };
}

export function usePrefetchLocationCascade(
    cascade: ReturnType<typeof useLocationCascade>,
    pairs: Array<{ district?: string | null; upazila?: string | null }>,
) {
    const { loadUpazilas, loadUnions } = cascade;

    useEffect(() => {
        const districts = [...new Set(pairs.map((p) => (p.district ?? '').trim()).filter(Boolean))];
        const upazilas = [...new Set(pairs.map((p) => (p.upazila ?? '').trim()).filter(Boolean))];
        districts.forEach((district) => {
            void loadUpazilas(district);
        });
        upazilas.forEach((upazila) => {
            void loadUnions(upazila);
        });
    }, [loadUpazilas, loadUnions, pairs]);
}
