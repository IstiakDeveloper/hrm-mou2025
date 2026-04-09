/**
 * Client-side permission checks (must stay aligned with App\Models\User::hasPermission where relevant).
 */

export const SUPER_ADMIN_ROLE_NAMES = ['Super Admin'];

export function isSuperAdmin(auth: { user?: { role?: { name?: string }; roles?: { name?: string }[] } } | null | undefined): boolean {
  if (!auth?.user) return false;
  const primary = auth.user.role?.name;
  if (primary && SUPER_ADMIN_ROLE_NAMES.includes(primary)) return true;
  return !!auth.user.roles?.some((r) => r.name && SUPER_ADMIN_ROLE_NAMES.includes(r.name));
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
];

export function hasAppPermission(
  auth: { user?: { role?: { name?: string; permissions?: unknown }; roles?: { name?: string; permissions?: unknown }[] } } | null | undefined,
  permission?: string
): boolean {
  if (!permission) return true;
  if (isSuperAdmin(auth)) return true;

  const granted = collectGrantedPermissions(auth);
  if (granted.has(permission)) return true;

  for (const group of PERMISSION_ALIAS_GROUPS) {
    if (!group.includes(permission)) continue;
    if (group.some((p) => granted.has(p))) return true;
  }

  return false;
}
