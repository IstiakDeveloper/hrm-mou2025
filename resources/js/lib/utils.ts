import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function calculateServiceLengthFromDate(dateStr: string, isBn: boolean = true): string | null {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Convert potential Bengali digits to English
    const bnToEnMap: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    const normalized = dateStr.replace(/[০-৯]/g, d => bnToEnMap[d] ?? d).trim();

    let d: number, m: number, y: number;
    if (normalized.includes('/')) {
        const parts = normalized.split('/');
        if (parts.length !== 3) return null;
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parseInt(parts[2], 10);
    } else if (normalized.includes('-')) {
        const parts = normalized.split('-');
        if (parts.length !== 3) return null;
        if (parts[0].length === 4) {
            // YYYY-MM-DD
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            d = parseInt(parts[2], 10);
        } else {
            // DD-MM-YYYY
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            y = parseInt(parts[2], 10);
        }
    } else {
        return null;
    }

    if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1970 || y > 2100 || m < 0 || m > 11 || d < 1 || d > 31) {
        return null;
    }

    const startDate = new Date(y, m, d);
    if (isNaN(startDate.getTime())) return null;

    const now = new Date();
    let years = now.getFullYear() - startDate.getFullYear();
    let months = now.getMonth() - startDate.getMonth();
    if (now.getDate() < startDate.getDate()) {
        months--;
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    if (years < 0) return null;

    const toBnDigits = (n: number) => {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return n.toString().split('').map(c => bnDigits[parseInt(c, 10)] ?? c).join('');
    };

    if (isBn) {
        if (years > 0 && months > 0) return `${toBnDigits(years)} বছর ${toBnDigits(months)} মাস`;
        if (years > 0) return `${toBnDigits(years)} বছর`;
        if (months > 0) return `${toBnDigits(months)} মাস`;
        return '১ মাস';
    } else {
        if (years > 0 && months > 0) return `${years} ${years > 1 ? 'Years' : 'Year'} ${months} ${months > 1 ? 'Months' : 'Month'}`;
        if (years > 0) return `${years} ${years > 1 ? 'Years' : 'Year'}`;
        if (months > 0) return `${months} ${months > 1 ? 'Months' : 'Month'}`;
        return '1 Month';
    }
}

