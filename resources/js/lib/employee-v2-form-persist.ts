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

export type EmployeeDocumentFormRowSerializable = {
    clientKey: string;
    id?: number | null;
    document_type?: string;
    title?: string;
    description?: string;
    expiry_date?: string;
    existing_file_path?: string | null;
};

export type EmployeeDocumentFormRow = EmployeeDocumentFormRowSerializable & { file: File | null };

/** Normalize document rows from server old() / draft (no File). */
export function normalizeEmployeeDocumentsRowsForForm(docs: unknown): EmployeeDocumentFormRowSerializable[] {
    if (!Array.isArray(docs)) return [];
    return docs.map((row: Record<string, unknown>) => ({
        clientKey:
            typeof row.clientKey === 'string' && row.clientKey
                ? row.clientKey
                : typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID
                  ? globalThis.crypto.randomUUID()
                  : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        id: row.id != null && row.id !== '' ? Number(row.id) : null,
        document_type: String(row.document_type ?? ''),
        title: String(row.title ?? ''),
        description: String(row.description ?? ''),
        expiry_date: String(row.expiry_date ?? '').slice(0, 10),
        existing_file_path: row.existing_file_path != null ? String(row.existing_file_path) : null,
    }));
}

export function hydrateEmployeeDocumentRowsForForm(docs: unknown): EmployeeDocumentFormRow[] {
    return normalizeEmployeeDocumentsRowsForForm(docs).map((r) => ({ ...r, file: null }));
}

export function formatEmployeeDocumentTypeLabel(type: string): string {
    return type
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export function newEmployeeDocumentFormRow(): EmployeeDocumentFormRow {
    return {
        clientKey:
            typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID
                ? globalThis.crypto.randomUUID()
                : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        id: null,
        document_type: '',
        title: '',
        description: '',
        expiry_date: '',
        file: null,
        existing_file_path: null,
    };
}

export function toSerializableEmployeeForm(data: Record<string, unknown>): EmployeeV2SerializableForm {
    const out: EmployeeV2SerializableForm = {};
    for (const [k, v] of Object.entries(data)) {
        if (k === 'photo' || k === 'signature' || k === '_method') continue;
        if (k === 'documents' && Array.isArray(v)) {
            out[k] = (v as Record<string, unknown>[]).map((row) => {
                const { file: _f, ...rest } = row;
                return rest;
            });
            continue;
        }
        out[k] = v;
    }
    return out;
}

/** Single-field NID or Smart Card: prefer nid, else legacy smart_card_number for drafts/old(). */
export function combinedNidOrSmartCardDisplay(nid: unknown, smartCard: unknown): string {
    const n = String(nid ?? '').trim();
    const s = String(smartCard ?? '').trim();
    return n || s;
}

const NID_OR_SMART_ALLOWED_LENGTHS = new Set([10, 13, 17]);

/** Client-side: empty is OK; otherwise length must be 10, 13, or 17 digits. */
export function getNidOrSmartCardClientError(nid: unknown): string | null {
    const digits = String(nid ?? '').replace(/\D/g, '');
    if (digits.length === 0) return null;
    if (NID_OR_SMART_ALLOWED_LENGTHS.has(digits.length)) return null;
    return 'National ID or Smart Card must be 10, 13, or 17 digits.';
}

/** Keep one input in `nid` (digits only, max 17); clear `smart_card_number` so the server maps 10/13 vs 17. */
export function applyUnifiedNidSmartFields<T extends Record<string, unknown>>(form: T): T {
    const combined = combinedNidOrSmartCardDisplay(form.nid, form.smart_card_number);
    const digits = combined.replace(/\D/g, '').slice(0, 17);
    return { ...form, nid: digits, smart_card_number: '' } as T;
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Keys whose values are nested objects in the employee form; shallow patch merge would drop sibling fields (e.g. old('collateral') without certificate_levels). */
const MERGE_DEEP_OBJECT_KEYS = new Set(['collateral', 'bank']);

export function mergeSerializableIntoForm<T extends Record<string, any>>(base: T, patch: Record<string, unknown>): T {
    const next = { ...base } as T;
    for (const key of Object.keys(patch)) {
        if (key === 'photo' || key === 'signature' || key === '_method') continue;
        const pv = (patch as Record<string, unknown>)[key];
        if (MERGE_DEEP_OBJECT_KEYS.has(key) && isPlainRecord(pv)) {
            const baseNested = (base as Record<string, unknown>)[key];
            (next as Record<string, unknown>)[key] = isPlainRecord(baseNested) ? { ...baseNested, ...pv } : { ...pv };
            continue;
        }
        (next as Record<string, unknown>)[key] = pv;
    }
    return next;
}

