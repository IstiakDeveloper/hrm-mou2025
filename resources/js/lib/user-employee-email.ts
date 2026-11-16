export interface UserFormEmployee {
  id: number;
  employee_id: string;
  pin?: string | null;
  biometric_id?: string | null;
  email?: string | null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Use the employee's email when present; otherwise generate pin@domain (same as backend auto-user).
 */
export function resolveEmployeeEmail(
  employee: UserFormEmployee | undefined,
  autoEmailDomain: string,
): string {
  if (!employee) {
    return '';
  }

  const raw = (employee.email ?? '').trim();
  if (raw !== '' && isValidEmail(raw)) {
    return raw;
  }

  const pin = (employee.pin ?? employee.employee_id ?? '').trim();
  if (pin !== '') {
    return `${pin.toLowerCase()}@${autoEmailDomain}`;
  }

  const bio = (employee.biometric_id != null ? String(employee.biometric_id) : '').trim();
  if (bio !== '') {
    return `${bio.toLowerCase()}@${autoEmailDomain}`;
  }

  return '';
}
