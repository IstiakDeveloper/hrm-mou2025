import { useCallback, useEffect, useState } from 'react';

export type EmployeeLookupOption = {
    id: number;
    pin?: string | null;
    name_en?: string | null;
    name_bn?: string | null;
    employee_id?: string | null;
    pf_balance?: number | string | null;
};

type UseEmployeeLookupOptions = {
    enabled?: boolean;
    branchId?: string | number | null;
    selectedEmployeeId?: string | number | null;
    limit?: number;
    payrollReady?: boolean;
    forGratuity?: boolean;
};

export function useEmployeeLookup({
    enabled = true,
    branchId,
    selectedEmployeeId,
    limit = 50,
    payrollReady = false,
    forGratuity = false,
}: UseEmployeeLookupOptions = {}) {
    const [employees, setEmployees] = useState<EmployeeLookupOption[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(
        async (query = '') => {
            if (!enabled) {
                return;
            }
            setLoading(true);
            try {
                const params = new URLSearchParams({ limit: String(limit) });
                const q = query.trim();
                if (q !== '') {
                    params.set('q', q);
                }
                if (branchId) {
                    params.set('branch_id', String(branchId));
                }
                if (selectedEmployeeId) {
                    params.set('employee_id', String(selectedEmployeeId));
                }
                if (payrollReady) {
                    params.set('payroll_ready', '1');
                }
                if (forGratuity) {
                    params.set('for_gratuity', '1');
                }
                const response = await fetch(`/employees/lookup?${params}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                if (!response.ok) {
                    throw new Error(`Lookup failed (${response.status})`);
                }
                const data = (await response.json()) as EmployeeLookupOption[];
                setEmployees(data);
            } finally {
                setLoading(false);
            }
        },
        [branchId, enabled, forGratuity, limit, payrollReady, selectedEmployeeId],
    );

    useEffect(() => {
        void load();
    }, [load]);

    return { employees, loading, reload: load };
}
