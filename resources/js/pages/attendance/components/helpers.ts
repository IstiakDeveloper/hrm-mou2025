import { Status, EmployeeRow, BranchSummary } from './types';

export function statusLabel(s: Status) {
    switch (s) {
        case 'present': return 'Present';
        case 'late': return 'Late';
        case 'half_day': return 'Half Day';
        case 'absent': return 'Absent';
        case 'leave': return 'Leave';
        case 'on_duty': return 'On Duty';
        case 'holiday': return 'Holiday';
        case 'weekend': return 'Weekend';
        default: return s;
    }
}

export function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function pct(part: number, total: number) {
    if (!total || total <= 0) return 0;
    return (part / total) * 100;
}

export function formatPct(n: number) {
    if (Number.isNaN(n) || !Number.isFinite(n)) return '0%';
    return `${Math.round(n)}%`;
}

export function scoreColor(score: number) {
    if (score < 0.75) return 'bg-rose-500';
    if (score < 0.9) return 'bg-amber-500';
    return 'bg-emerald-500';
}

export function scoreRingClass(score: number) {
    if (score < 0.75) return 'ring-rose-200';
    if (score < 0.9) return 'ring-amber-200';
    return 'ring-emerald-200';
}

export function scoreTextClass(score: number) {
    if (score < 0.75) return 'text-rose-600';
    if (score < 0.9) return 'text-amber-600';
    return 'text-emerald-600';
}

export function scoreBgClass(score: number) {
    if (score < 0.75) return 'bg-rose-50 border-rose-200 text-rose-700';
    if (score < 0.9) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
}

export function filterStaffList(list: EmployeeRow[], query: string) {
    if (!query.trim()) return list;
    const q = query.toLowerCase().trim();
    return list.filter(
        (r) =>
            r.name.toLowerCase().includes(q) ||
            r.employee_id.toLowerCase().includes(q) ||
            (r.department && r.department.toLowerCase().includes(q)) ||
            (r.designation && r.designation.toLowerCase().includes(q)),
    );
}

export function portalPresentEmployees(branch: BranchSummary): EmployeeRow[] {
    const movementIds = new Set((branch.employeesWithMovement ?? []).map((e) => e.id));
    const keys: Status[] = ['present', 'late', 'half_day'];
    const rows: EmployeeRow[] = [];
    const seen = new Set<number>();

    // Checked-in staff stay in Present even when they also have official movement.
    for (const key of keys) {
        for (const row of branch.employeesByStatus?.[key] ?? []) {
            if (seen.has(row.id)) {
                continue;
            }
            seen.add(row.id);
            rows.push(row);
        }
    }

    // On-duty without movement and without a check-in punch.
    for (const row of branch.employeesByStatus?.on_duty ?? []) {
        if (movementIds.has(row.id) || seen.has(row.id)) {
            continue;
        }
        seen.add(row.id);
        rows.push(row);
    }

    return rows;
}

/** All staff with official movement today (may also appear in Present). */
export function portalMovementEmployees(branch: BranchSummary): EmployeeRow[] {
    return branch.employeesWithMovement ?? [];
}

export function portalPresentCount(branch: BranchSummary): number {
    return portalPresentEmployees(branch).length;
}

export function portalMovementCount(branch: BranchSummary): number {
    return branch.movementCount ?? portalMovementEmployees(branch).length;
}

export function checkedInStatusCount(counts: Record<Status, number>): number {
    return (counts.present ?? 0) + (counts.late ?? 0) + (counts.half_day ?? 0);
}

export function portalColumnEmployees(branch: BranchSummary, key: 'present' | 'movement' | 'absent' | 'leave'): EmployeeRow[] {
    switch (key) {
        case 'present':
            return portalPresentEmployees(branch);
        case 'movement':
            return portalMovementEmployees(branch);
        case 'absent':
            return branch.employeesByStatus?.absent ?? [];
        case 'leave':
            return branch.employeesByStatus?.leave ?? [];
        default:
            return [];
    }
}

export function portalEmployeeStatusTag(status: Status): string | null {
    if (status === 'late') return 'Late';
    if (status === 'half_day') return 'Half day';
    if (status === 'on_duty') return 'On duty';
    return null;
}

export const PORTAL_GRID_COLUMNS: Array<{
    key: 'present' | 'movement' | 'absent' | 'leave';
    label: string;
    headerClass: string;
    badgeClass: string;
}> = [
    { key: 'present', label: 'Present', headerClass: 'border-emerald-200 bg-emerald-50', badgeClass: 'bg-emerald-600' },
    { key: 'movement', label: 'Movement', headerClass: 'border-indigo-200 bg-indigo-50', badgeClass: 'bg-indigo-650' },
    { key: 'absent', label: 'Absent', headerClass: 'border-rose-200 bg-rose-50', badgeClass: 'bg-rose-600' },
    { key: 'leave', label: 'Leave', headerClass: 'border-blue-200 bg-blue-50', badgeClass: 'bg-blue-600' },
];
