import { formatDisplayDate } from '@/lib/display-date';

export type FundSnapshot = {
    principal: string;
    posted_interest: string;
    unposted_interest: string;
    interest: string;
    total: string;
    interest_as_of: string | null;
    as_of_date: string;
    annual_rate: string;
    account_id: number | null;
    status: string | null;
    eligibility_as_of?: string | null;
    eligible_principal?: string;
    pending_principal?: string;
    next_eligibility_date?: string | null;
    eligibility_stopped?: boolean;
    interest_calculation_deferred?: boolean;
    review_required?: string;
};

const moneyFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const interestFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const readableDateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
const todayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });

export const fundMoney = (amount: string | number | null | undefined) => moneyFormatter.format(Number(amount ?? 0));

export const fundInterest = (amount: string | number | null | undefined) => interestFormatter.format(Number(amount ?? 0));

export const fundTaka = (amount: string | number | null | undefined) => `৳ ${fundMoney(amount)}`;

export const fundTakaInterest = (amount: string | number | null | undefined) => `৳ ${fundInterest(amount)}`;

/** Format date in Bangladeshi numeric standard (DD/MM/YYYY) e.g. 01/07/2026 */
export function fundDisplayDate(date: unknown): string {
    if (!date || date === '—') return '—';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        if (parsed.getUTCFullYear() === Number(year) && parsed.getUTCMonth() === Number(month) - 1 && parsed.getUTCDate() === Number(day)) {
            return `${day}/${month}/${year}`;
        }
    }
    try {
        return formatDisplayDate(date);
    } catch {
        return '—';
    }
}

/** Format date in Bangladeshi textual standard e.g. 01 Jul 2026 */
export function fundDisplayDateReadable(date: unknown): string {
    if (date == null || date === '' || date === '—') return '—';
    const s = String(date).trim();
    if (!s || s === '—') return '—';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split('/').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (!isNaN(dateObj.getTime())) {
            return readableDateFormatter.format(dateObj);
        }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (!isNaN(dateObj.getTime())) {
            return readableDateFormatter.format(dateObj);
        }
    }
    try {
        return formatDisplayDate(s);
    } catch {
        return '—';
    }
}

export function fundEligibilityDate(depositDate: unknown): string {
    if (!depositDate || typeof depositDate !== 'string') return '—';
    const parts = depositDate.split('-');
    if (parts.length !== 3) return '—';
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return '—';
    try {
        const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
        if (isNaN(lastDay)) return '—';
        return `${year + 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    } catch {
        return '—';
    }
}

export function fundInterestStart(depositDate: unknown): string {
    if (!depositDate || typeof depositDate !== 'string') return '—';
    const parts = depositDate.split('-');
    if (parts.length < 2) return '—';
    const [year, month] = parts.map(Number);
    if (!year || !month || isNaN(year) || isNaN(month)) return '—';
    try {
        const d = new Date(Date.UTC(year, month, 1));
        if (isNaN(d.getTime())) return '—';
        const nextMonth = d.toISOString().slice(0, 10);
        return nextMonth > '2026-07-01' ? nextMonth : '2026-07-01';
    } catch {
        return '—';
    }
}

export const fundToday = () => todayFormatter.format(new Date());

export function fundRequestKey(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
