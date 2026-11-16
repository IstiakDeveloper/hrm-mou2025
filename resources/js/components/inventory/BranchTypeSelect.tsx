import { useMemo } from 'react';
import { ComboSelect } from '@/components/ComboSelect';

export type BranchOption = { id: number; name: string; branch_code?: string | null };

type Props = {
    value: string | null;
    onChange: (value: string | null) => void;
    branches: { headOffice: BranchOption[]; branches: BranchOption[] };
    placeholder?: string;
    disabled?: boolean;
    portal?: boolean;
    clearable?: boolean;
};

function label(b: BranchOption, prefix: string) {
    const base = b.branch_code ? `${b.name} (${b.branch_code})` : b.name;
    return `${prefix} ${base}`;
}

export function BranchTypeSelect({
    value,
    onChange,
    branches,
    placeholder = 'Select branch',
    disabled,
    portal = true,
    clearable = true,
}: Props) {
    const items = useMemo(() => {
        const list: { value: string; label: string; keywords: string }[] = [];
        branches.headOffice.forEach((b) => {
            list.push({
                value: String(b.id),
                label: label(b, '[Head Office]'),
                keywords: `head office ${b.name} ${b.branch_code ?? ''}`,
            });
        });
        branches.branches.forEach((b) => {
            list.push({
                value: String(b.id),
                label: label(b, '[Branch]'),
                keywords: `branch ${b.name} ${b.branch_code ?? ''}`,
            });
        });
        return list;
    }, [branches]);

    return (
        <ComboSelect
            value={value || null}
            onChange={onChange}
            items={items}
            placeholder={placeholder}
            disabled={disabled}
            portal={portal}
            clearable={clearable}
        />
    );
}
