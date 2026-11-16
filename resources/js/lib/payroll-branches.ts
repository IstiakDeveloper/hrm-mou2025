import type { ComboSelectItem } from '@/components/ComboSelect';

export type PayrollBranchOption = {
    id: number;
    name: string;
    branch_code?: string | null;
    is_head_office?: boolean;
};

/** Display: Branch Name (CODE) */
export function formatPayrollBranchLabel(branch: { name: string; branch_code?: string | null }): string {
    const name = (branch.name || '').trim() || '—';
    const code = (branch.branch_code ?? '').trim();
    return code ? `${name} (${code})` : name;
}

/** Branch select label — includes code and optional head-office marker. */
export function formatBranchSelectLabel(branch: PayrollBranchOption): string {
    const base = formatPayrollBranchLabel(branch);
    return branch.is_head_office ? `${base} (HO)` : base;
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

export function branchComboSelectItems<T extends PayrollBranchOption>(
    branches: T[],
    options?: { numericValue?: boolean },
): ComboSelectItem<string | number>[] {
    return sortPayrollBranches(branches).map((b) => ({
        value: options?.numericValue ? b.id : String(b.id),
        label: formatBranchSelectLabel(b),
        keywords: [b.branch_code, b.name].filter(Boolean).join(' '),
    }));
}
