export type PayrollBranchOption = {
    id: number;
    name: string;
    branch_code?: string | null;
};

/** Display: Branch Name (CODE) — sorted by branch_code then name on the caller side. */
export function formatPayrollBranchLabel(branch: { name: string; branch_code?: string | null }): string {
    const name = (branch.name || '').trim() || '—';
    const code = (branch.branch_code ?? '').trim();
    return code ? `${name} (${code})` : name;
}

export function sortPayrollBranches<T extends PayrollBranchOption>(branches: T[]): T[] {
    return [...branches].sort((a, b) => {
        const codeA = (a.branch_code ?? '').trim().toLowerCase();
        const codeB = (b.branch_code ?? '').trim().toLowerCase();
        if (codeA !== codeB) {
            if (!codeA) return 1;
            if (!codeB) return -1;
            return codeA.localeCompare(codeB, undefined, { numeric: true });
        }
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
}
