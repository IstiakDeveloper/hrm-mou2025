/** Serializable employee form fields (no File). Used for localStorage draft + Laravel old() merge. */

export function asInputPatch(oldInput: unknown): Record<string, unknown> {
    if (oldInput && typeof oldInput === 'object' && !Array.isArray(oldInput)) {
        return oldInput as Record<string, unknown>;
    }
    return {};
}

export function hasPatchKeys(patch: Record<string, unknown>): boolean {
    return Object.keys(patch).length > 0;
}

export const EMPLOYEE_CREATE_DRAFT_KEY = 'hrm_employee_create_draft_v1';
export const EMPLOYEE_EDIT_DRAFT_PREFIX = 'hrm_employee_edit_draft_v1:';

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type EmployeeSerializableForm = Record<string, string | boolean | null | undefined>;

export function loadEmployeeDraft(storageKey: string): EmployeeSerializableForm | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { savedAt?: number; data?: EmployeeSerializableForm };
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

export function saveEmployeeDraft(storageKey: string, data: EmployeeSerializableForm): void {
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

export function toSerializableEmployeeForm(data: Record<string, unknown>): EmployeeSerializableForm {
    const out: EmployeeSerializableForm = {};
    for (const [k, v] of Object.entries(data)) {
        if (k === 'photo' || k === '_method') continue;
        if (v === null || v === undefined) {
            out[k] = '';
            continue;
        }
        if (typeof v === 'boolean') {
            out[k] = v;
            continue;
        }
        out[k] = String(v);
    }
    return out;
}

export function mergeSerializableIntoForm<T extends Record<string, unknown>>(
    base: T,
    patch: Record<string, unknown>
): T {
    const next = { ...base } as T;
    for (const key of Object.keys(base) as (keyof T)[]) {
        if (key === ('photo' as keyof T) || key === ('_method' as keyof T)) continue;
        if (!(key in patch) || patch[key as string] === undefined) continue;
        const v = patch[key as string];
        if (key === ('is_dropout' as keyof T)) {
            (next as Record<string, unknown>)[key as string] = Boolean(
                v === true ||
                    v === 1 ||
                    v === '1' ||
                    v === 'true' ||
                    v === 'on' ||
                    v === 'yes'
            );
            continue;
        }
        (next as Record<string, unknown>)[key as string] = v === null ? '' : v;
    }
    return next;
}
