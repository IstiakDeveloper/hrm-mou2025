export type FundSnapshot = {
    principal: string;
    posted_interest: string;
    unposted_interest: string;
    interest: string;
    total: string;
    interest_as_of: string;
    as_of_date: string;
    annual_rate: string;
    account_id: number | null;
    status: string | null;
    eligibility_as_of?: string;
    eligible_principal?: string;
    pending_principal?: string;
    next_eligibility_date?: string | null;
    eligibility_stopped?: boolean;
};

export const fundMoney = (amount: string | number | null | undefined) =>
    Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fundInterest = (amount: string | number | null | undefined) => Number(amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function fundEligibilityDate(depositDate: string): string {
    const [year, month, day] = depositDate.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
    return `${year + 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function fundInterestStart(depositDate: string): string {
    const start = depositDate > '2026-07-01' ? depositDate : '2026-07-01';
    const [year, month, day] = start.split('-').map(Number);
    if (day === 1) return start;
    return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export const fundToday = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function fundRequestKey(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
