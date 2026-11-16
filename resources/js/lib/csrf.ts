import axios from 'axios';

/** Laravel XSRF-TOKEN cookie (updated every web response; preferred over stale meta tag). */
function readXsrfCookie(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match?.[1] ? decodeURIComponent(match[1]) : '';
}

function readMetaCsrf(): string {
    if (typeof document === 'undefined') return '';
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content?.trim() ?? '';
}

/** Keep the blade meta tag aligned after Inertia navigations (meta is only set on full page load). */
export function syncCsrfMetaToken(token: string): void {
    if (!token || typeof document === 'undefined') return;
    const el = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    if (el) el.content = token;
}

export function getCsrfToken(): string {
    return readMetaCsrf();
}

export function jsonCsrfHeaders(): Record<string, string> {
    const xsrf = readXsrfCookie();
    if (xsrf) {
        return { 'X-XSRF-TOKEN': xsrf };
    }
    const token = readMetaCsrf();
    return token ? { 'X-CSRF-TOKEN': token } : {};
}

function csrfAxiosHeaders(): Record<string, string> {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...jsonCsrfHeaders(),
    };
}

/** JSON POST via axios — never triggers Inertia navigation or full page reload. */
export async function csrfJsonPost<T>(url: string, data: Record<string, unknown>): Promise<T> {
    const body: Record<string, unknown> = { ...data };
    if (!jsonCsrfHeaders()['X-XSRF-TOKEN']) {
        const token = readMetaCsrf();
        if (token) body._token = token;
    }
    const response = await axios.post<T>(url, body, { headers: csrfAxiosHeaders() });
    return response.data;
}

export function csrfJsonPostErrorMessage(error: unknown, fallback = 'Error occurred.'): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        if (typeof data?.message === 'string' && data.message !== '') return data.message;
        if (error.response?.status === 419) return 'Session expired. Please refresh the page and try again.';
    }
    return fallback;
}

export function jsonPostInit(data: Record<string, unknown>): RequestInit {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...jsonCsrfHeaders(),
    };
    const body: Record<string, unknown> = { ...data };
    if (!headers['X-XSRF-TOKEN']) {
        const token = readMetaCsrf();
        if (token) body._token = token;
    }
    return {
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'manual',
        headers,
        body: JSON.stringify(body),
    };
}
