import { useCallback, useEffect, useState } from 'react';

export type EmployeeLookupOption = {
    id: number;
    pin?: string | null;
    name_en?: string | null;
    employee_id?: string | null;
    pf_balance?: number | string | null;
};

type UseEmployeeLookupOptions = {
    enabled?: boolean;
    branchId?: string | number | null;
    limit?: number;
    payrollReady?: boolean;
};

export function useEmployeeLookup({ enabled = true, branchId, limit = 50, payrollReady = false }: UseEmployeeLookupOptions = {}) {
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
                if (payrollReady) {
                    params.set('payroll_ready', '1');
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
        [branchId, enabled, limit, payrollReady],
    );

    useEffect(() => {
        void load();
    }, [load]);

    return { employees, loading, reload: load };
}
