import { format, isValid, parse, parseISO } from 'date-fns';

export const DISPLAY_DATE_FMT = 'dd/MM/yyyy';
export const SERVER_DATE_FMT = 'yyyy-MM-dd';
/** Matches config/app.php — used when parsing Laravel ISO date strings. */
export const APP_TIMEZONE = 'Asia/Dhaka';

const DISPLAY_SLASH_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const DISPLAY_DASH_RE = /^\d{2}-\d{2}-\d{4}$/;

/** Laravel date cast ISO → calendar Y-m-d in app timezone (not browser / UTC date part). */
function isoToAppYmd(iso: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(iso);
}

/** API / DB → form display (DD/MM/YYYY). */
export function toFormDisplayDate(value: unknown): string {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (!s) return '';
    if (DISPLAY_SLASH_RE.test(s)) return s;
    if (DISPLAY_DASH_RE.test(s)) {
        const d = parse(s, 'dd-MM-yyyy', new Date());
        return isValid(d) ? format(d, DISPLAY_DATE_FMT) : '';
    }
    // Laravel date casts serialize as ISO UTC — use app calendar date, not UTC date part.
    if (s.includes('T')) {
        const iso = parseISO(s);
        if (isValid(iso)) {
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: APP_TIMEZONE,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }).format(iso);
        }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = parse(s, SERVER_DATE_FMT, new Date());
        return isValid(d) ? format(d, DISPLAY_DATE_FMT) : '';
    }
    const iso = parseISO(s);
    if (isValid(iso)) {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: APP_TIMEZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(iso);
    }
    const slash = parse(s, 'dd/MM/yyyy', new Date());
    if (isValid(slash)) return format(slash, DISPLAY_DATE_FMT);
    return '';
}

/** API / DB ISO or Y-m-d → HTML date input value (YYYY-MM-DD, local calendar). */
export function toServerYmdDate(value: unknown): string {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Laravel date casts serialize as ISO UTC — use app calendar date, not UTC date part.
    if (s.includes('T')) {
        const iso = parseISO(s);
        if (isValid(iso)) return isoToAppYmd(iso);
    }
    if (DISPLAY_DASH_RE.test(s)) {
        const d = parse(s, 'dd-MM-yyyy', new Date());
        return isValid(d) ? format(d, SERVER_DATE_FMT) : '';
    }
    if (DISPLAY_SLASH_RE.test(s)) {
        const d = parse(s, DISPLAY_DATE_FMT, new Date());
        return isValid(d) ? format(d, SERVER_DATE_FMT) : '';
    }
    const iso = parseISO(s);
    if (isValid(iso)) return isoToAppYmd(iso);
    return '';
}

/** Form display → submit to server (YYYY-MM-DD). */
export function displayDateToServer(value: unknown): string {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (DISPLAY_SLASH_RE.test(s)) {
        const d = parse(s, DISPLAY_DATE_FMT, new Date());
        return isValid(d) ? format(d, SERVER_DATE_FMT) : '';
    }
    if (DISPLAY_DASH_RE.test(s)) {
        const d = parse(s, 'dd-MM-yyyy', new Date());
        return isValid(d) ? format(d, SERVER_DATE_FMT) : '';
    }
    return '';
}

export function parseFormDateValue(raw: unknown): Date | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (DISPLAY_SLASH_RE.test(s)) {
        const d = parse(s, DISPLAY_DATE_FMT, new Date());
        return isValid(d) ? d : null;
    }
    if (DISPLAY_DASH_RE.test(s)) {
        const d = parse(s, 'dd-MM-yyyy', new Date());
        return isValid(d) ? d : null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = parse(s, SERVER_DATE_FMT, new Date());
        return isValid(d) ? d : null;
    }
    const iso = parseISO(s.includes('T') ? s : `${s}T00:00:00`);
    if (!isValid(iso)) return null;
    const ymd = isoToAppYmd(iso);
    const d = parse(ymd, SERVER_DATE_FMT, new Date());
    return isValid(d) ? d : null;
}

export function formatDisplayDate(value: unknown): string {
    return toFormDisplayDate(value) || '—';
}

export function todayDisplayDate(): string {
    return format(new Date(), DISPLAY_DATE_FMT);
}
