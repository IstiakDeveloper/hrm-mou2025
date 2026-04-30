/** Serializable employee V2 form fields (no File). Used for localStorage draft + Laravel old() merge. */

export function asInputPatch(oldInput: unknown): Record<string, unknown> {
    if (oldInput && typeof oldInput === 'object' && !Array.isArray(oldInput)) {
        return oldInput as Record<string, unknown>;
    }
    return {};
}

export function hasPatchKeys(patch: Record<string, unknown>): boolean {
    return Object.keys(patch).length > 0;
}

export const EMPLOYEE_V2_CREATE_DRAFT_KEY = 'hrm_employee_v2_create_draft_v1';
export const EMPLOYEE_V2_EDIT_DRAFT_PREFIX = 'hrm_employee_v2_edit_draft_v1:';

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type EmployeeV2SerializableForm = Record<string, unknown>;

export function loadEmployeeDraft(storageKey: string): EmployeeV2SerializableForm | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { savedAt?: number; data?: EmployeeV2SerializableForm };
        if (!parsed?.data || typeof parsed.savedAt !== 'number') return null;
        if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
            window.localStorage.removeItem(storageKey);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

export function saveEmployeeDraft(storageKey: string, data: EmployeeV2SerializableForm): void {
    if (typeof window === 'undefined') return;
    try {
        const payload = JSON.stringify({ savedAt: Date.now(), data });
        window.localStorage.setItem(storageKey, payload);
    } catch {
        // quota / private mode
    }
}

export function clearEmployeeDraft(storageKey: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(storageKey);
    } catch {
        // ignore
    }
}

export function toSerializableEmployeeForm(data: Record<string, unknown>): EmployeeV2SerializableForm {
    const out: EmployeeV2SerializableForm = {};
    for (const [k, v] of Object.entries(data)) {
        if (k === 'photo' || k === 'signature' || k === '_method') continue;
        out[k] = v;
    }
    return out;
}

export function mergeSerializableIntoForm<T extends Record<string, any>>(base: T, patch: Record<string, unknown>): T {
    const next = { ...base } as T;
    for (const key of Object.keys(patch)) {
        if (key === 'photo' || key === 'signature' || key === '_method') continue;
        (next as any)[key] = (patch as any)[key];
    }
    return next;
}

