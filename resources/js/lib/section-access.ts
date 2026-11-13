import type { AdminSectionId } from '@/lib/admin-sections';

/**
 * A module opens when the role has any of these keys.
 * The same keys gate the sidebar items inside that module.
 * Office map stays available to every signed-in user.
 * Payroll, staff fund, and employee loan also open for an employee's own pages.
 */
export const SECTION_MENU_PERMISSIONS: Partial<Record<AdminSectionId, string[]>> = {
    'human-resources': [
        'employees.view',
        'employees.create',
        'employees.edit',
        'employees.admin',
        'branches.view',
        'zones.view',
        'regional-offices.view',
        'departments.view',
        'designations.view',
        'redesignations.view',
        'confirmations.view',
        'separations.view',
        'holidays.view',
        'transfers.view',
        'promotions.view',
        'demotions.view',
        'salary-increments.view',
        'promotion-evaluations.view',
        'confirmation-evaluations.view',
        'probation-increment-evaluations.view',
        'trainee-evaluations.view',
        'final-clearances.view',
    ],
    'attendance-movement': ['attendance.view', 'attendance.admin', 'movements.view', 'movements.approve'],
    leave: ['leave-applications.view', 'leave-types.view', 'leave-balances.view', 'leave-balances.admin', 'reports.view'],
    'employee-loan': ['employee-loan.view'],
    'staff-fund': ['staff-fund.view'],
    payroll: ['payroll.view'],
    'fixed-asset': ['fixed-assets.view', 'fixed-assets.create', 'fixed-assets.edit', 'fixed-assets.delete'],
    inventory: ['inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete'],
    documents: ['documents.view', 'documents.manage', 'documents.delete'],
    administration: ['admin.access', 'users.view', 'roles.view', 'sessions.view', 'reports.view'],
};

const SELF_SERVICE_SECTIONS = new Set<AdminSectionId>(['payroll', 'staff-fund', 'employee-loan']);

export function canOpenSection(
    sectionId: AdminSectionId,
    hasPermission: (permission: string) => boolean,
    options: { superAdmin?: boolean; employeeId?: number | null } = {},
): boolean {
    if (options.superAdmin) {
        return true;
    }
    if (sectionId === 'office-map') {
        return true;
    }
    if (SELF_SERVICE_SECTIONS.has(sectionId) && options.employeeId) {
        return true;
    }
    const keys = SECTION_MENU_PERMISSIONS[sectionId] ?? [];
    return keys.some((key) => hasPermission(key));
}
