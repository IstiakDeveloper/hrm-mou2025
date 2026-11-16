import { useCallback, useEffect, useRef, useState } from 'react';

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
        redirect: 'manual',
    });
    if (!response.ok) {
        throw new Error(`Location request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
}

function mergeUnionLists(existing: LocationUnion[], incoming: LocationUnion[]): LocationUnion[] {
    const merged = [...existing];
    for (const item of incoming) {
        if (!merged.some((u) => u.name === item.name)) {
            merged.push(item);
        }
    }
    return merged;
}

export function useLocationCascade(initial?: Partial<LocationState>) {
    const [state, setState] = useState<LocationState>({
        upazilas: initial?.upazilas ?? {},
        unions: initial?.unions ?? {},
    });
    const stateRef = useRef(state);
    stateRef.current = state;

    const loadUpazilas = useCallback(async (district: string) => {
        const key = district.trim();
        if (key === '') {
            return [] as string[];
        }
        if (stateRef.current.upazilas[key]) {
            return stateRef.current.upazilas[key];
        }
        const params = new URLSearchParams({ district: key });
        const items = await fetchJson<string[]>(`/employees/locations/upazilas?${params}`);
        setState((prev) => ({ ...prev, upazilas: { ...prev.upazilas, [key]: items } }));
        return items;
    }, []);

    const loadUnions = useCallback(async (upazila: string) => {
        const key = upazila.trim();
        if (key === '') {
            return [] as LocationUnion[];
        }
        if (stateRef.current.unions[key]) {
            return stateRef.current.unions[key];
        }
        const params = new URLSearchParams({ upazila: key });
        const items = await fetchJson<LocationUnion[]>(`/employees/locations/unions?${params}`);
        setState((prev) => ({
            ...prev,
            unions: {
                ...prev.unions,
                [key]: mergeUnionLists(prev.unions[key] ?? [], items),
            },
        }));
        return items;
    }, []);

    const addUnion = useCallback((upazila: string, union: LocationUnion) => {
        const key = upazila.trim();
        if (key === '' || !union.name.trim()) return;
        setState((prev) => {
            const existing = prev.unions[key] ?? [];
            if (existing.some((u) => u.name === union.name)) return prev;
            return { ...prev, unions: { ...prev.unions, [key]: [...existing, union] } };
        });
    }, []);

    const addVillageToUnion = useCallback((upazila: string, unionName: string, villageName: string) => {
        const upKey = upazila.trim();
        const unionKey = unionName.trim();
        const village = villageName.trim();
        if (upKey === '' || unionKey === '' || village === '') return;
        setState((prev) => {
            const unions = prev.unions[upKey] ?? [];
            const idx = unions.findIndex((u) => u.name === unionKey);
            if (idx === -1) return prev;
            const nextUnions = [...unions];
            const target = nextUnions[idx];
            if (target.villages.includes(village)) return prev;
            nextUnions[idx] = { ...target, villages: [...target.villages, village] };
            return { ...prev, unions: { ...prev.unions, [upKey]: nextUnions } };
        });
    }, []);

    return { ...state, loadUpazilas, loadUnions, addUnion, addVillageToUnion };
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
