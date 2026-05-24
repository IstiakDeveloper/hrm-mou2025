/** Fields commonly present on employee API payloads for display names. */
export type EmployeeNameFields = {
    name_en?: string | null;
    full_name_en?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
};

/**
 * Display name for an employee (English). Prefers name_en; never appends last_name.
 */
export function employeeDisplayName(
    employee: EmployeeNameFields | null | undefined,
    fallback = 'Employee',
): string {
    if (!employee) {
        return fallback;
    }

    const fromEn = (employee.full_name_en ?? employee.name_en ?? '').trim();
    if (fromEn) {
        return fromEn;
    }

    const fromFull = (employee.full_name ?? '').trim();
    if (fromFull) {
        return fromFull;
    }

    const first = (employee.first_name ?? '').trim();
    if (first) {
        return first;
    }

    return fallback;
}

/** Initials from display name (first + last word when multi-part). */
export function employeeInitials(
    employee: EmployeeNameFields | null | undefined,
    fallback = 'E',
): string {
    const name = employeeDisplayName(employee, '');
    if (!name) {
        return fallback;
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
    }

    return name.charAt(0).toUpperCase() || fallback;
}
