/**
 * Client-side permission checks (must stay aligned with App\Models\User::hasPermission where relevant).
 */

export const SUPER_ADMIN_ROLE_NAMES = ['Super Admin'];
export const ACCOUNTANT_ROLE_NAMES = ['Accountant'];
export const ACCOUNTANT_SECTION_IDS = ['employee-loan', 'staff-fund', 'fixed-asset', 'inventory'] as const;

const PAYROLL_MODULE_PERMISSIONS = new Set([
  'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
  'employee-loan.view', 'employee-loan.create', 'employee-loan.edit', 'employee-loan.delete',
  'staff-fund.view', 'staff-fund.create', 'staff-fund.edit', 'staff-fund.delete',
]);

export function isBranchAccount(
  auth: { user?: { account_type?: string } } | null | undefined,
): boolean {
  return auth?.user?.account_type === 'branch';
}

export function isSuperAdmin(auth: { user?: { role?: { name?: string }; roles?: { name?: string }[] } } | null | undefined): boolean {
  if (!auth?.user) return false;
  const primary = auth.user.role?.name;
  if (primary && SUPER_ADMIN_ROLE_NAMES.includes(primary)) return true;
  return !!auth.user.roles?.some((r) => r.name && SUPER_ADMIN_ROLE_NAMES.includes(r.name));
}

export function isAccountant(
  auth: { user?: { role?: { name?: string }; roles?: { name?: string }[] } } | null | undefined,
): boolean {
  if (!auth?.user) return false;
  const primary = auth.user.role?.name;
  if (primary && ACCOUNTANT_ROLE_NAMES.includes(primary)) return true;
  return !!auth.user.roles?.some((r) => r.name && ACCOUNTANT_ROLE_NAMES.includes(r.name));
}

export function isDepartmentHead(
  auth: { user?: { is_department_head?: boolean } } | null | undefined,
): boolean {
  return auth?.user?.is_department_head === true;
}

/** Mirrors OrganogramAccessService::hasOrganogramLineRole (permission markers only). */
export function hasOrganogramLineRole(
  auth: { user?: { role?: { permissions?: unknown }; roles?: { name?: string; permissions?: unknown }[] } } | null | undefined,
): boolean {
  if (!auth?.user || isSuperAdmin(auth)) return false;
  const granted = collectGrantedPermissions(auth);
  if (granted.has('employees.admin')) return false;
  const markers = [
    'branch_manager',
    'department_head',
    'organogram.zonal_manager',
    'organogram.regional_manager',
    'organogram.microfinance_director',
    'organogram.microfinance_assistant_director',
    'organogram.executive_director',
  ];
  if (markers.some((p) => granted.has(p))) return true;
  const organogramRoles = [
    'Executive Director',
    'Director (Microfinance)',
    'Assistant Director (Microfinance)',
    'Zonal Manager',
    'Regional Manager',
    'Branch Manager',
    'Department Head',
    'Team Leader',
  ];
  const names = new Set<string>();
  if (auth.user.role?.name) names.add(auth.user.role.name);
  auth.user.roles?.forEach((r) => r.name && names.add(r.name));
  return organogramRoles.some((n) => names.has(n));
}

function addPermissionsFromRaw(set: Set<string>, raw: unknown): void {
  let perms = raw;
  if (typeof perms === 'string') {
    try {
      perms = JSON.parse(perms);
    } catch {
      return;
    }
  }
  if (!Array.isArray(perms)) return;
  perms.forEach((p) => {
    if (typeof p === 'string' && p !== '') set.add(p);
  });
}

/** Merge primary role + pivot roles (same as backend should). */
export function collectGrantedPermissions(auth: { user?: { role?: { permissions?: unknown }; roles?: { permissions?: unknown }[] } } | null | undefined): Set<string> {
  const set = new Set<string>();
  if (!auth?.user) return set;
  if (auth.user.role?.permissions != null) {
    addPermissionsFromRaw(set, auth.user.role.permissions);
  }
  if (auth.user.roles) {
    for (const role of auth.user.roles) {
      if (role.permissions != null) addPermissionsFromRaw(set, role.permissions);
    }
  }
  return set;
}

const PERMISSION_ALIAS_GROUPS: string[][] = [
  ['leave-applications.view', 'leaves.view'],
  ['leave-applications.create', 'leaves.create'],
  ['leave-applications.edit', 'leaves.edit'],
  ['leave-applications.delete', 'leaves.delete'],
  ['leave-applications.approve', 'leaves.approve'],
  ['leave-applications.cancel', 'leaves.create', 'leaves.edit'],
  ['leave-types.view', 'leaves_type.view'],
  ['leave-types.create', 'leaves_type.create'],
  ['leave-types.edit', 'leaves_type.edit'],
  ['leave-types.delete', 'leaves_type.delete'],
  ['employee-loan.view', 'payroll.view'],
  ['employee-loan.create', 'payroll.create'],
  ['employee-loan.edit', 'payroll.edit'],
  ['employee-loan.delete', 'payroll.delete'],
  ['staff-fund.view', 'payroll.view'],
  ['staff-fund.create', 'payroll.create'],
  ['staff-fund.edit', 'payroll.edit'],
  ['staff-fund.delete', 'payroll.delete'],
  ['employees.view', 'employee-loan.view', 'staff-fund.view', 'payroll.view'],
];

export function hasAppPermission(
  auth: { user?: { role?: { name?: string; permissions?: unknown }; roles?: { name?: string; permissions?: unknown }[] } } | null | undefined,
  permission?: string
): boolean {
  if (!permission) return true;
  if (isSuperAdmin(auth)) return true;

  const granted = collectGrantedPermissions(auth);
  if (granted.has(permission)) return true;

  if (isDepartmentHead(auth) && PAYROLL_MODULE_PERMISSIONS.has(permission)) {
    return false;
  }

  if (hasOrganogramLineRole(auth) && PAYROLL_MODULE_PERMISSIONS.has(permission)) {
    return false;
  }

  for (const group of PERMISSION_ALIAS_GROUPS) {
    if (!group.includes(permission)) continue;
    if (group.some((p) => granted.has(p))) return true;
  }

  return false;
}
