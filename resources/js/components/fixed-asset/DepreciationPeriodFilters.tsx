import React from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { Search } from 'lucide-react';

export type FyPeriod = { year: number; month: number; label: string; fy_month: number };
export type FinancialYearOpt = { id: number; label: string; is_active: boolean; is_closed?: boolean };

type Props = {
    routeName: string;
    financialYears: FinancialYearOpt[];
    financialYearId: number | null;
    onFinancialYearIdChange: (id: number | null) => void;
    fyPeriods: FyPeriod[];
    year: number;
    month: number;
    onYearChange: (year: number) => void;
    onMonthChange: (month: number) => void;
    branches?: { id: number; name: string; branch_code: string | null; is_head_office: boolean }[];
    branchId?: number | null;
    onBranchIdChange?: (id: number | null) => void;
    branchScoped?: boolean;
    search?: string;
    onSearchChange?: (value: string) => void;
    showSearch?: boolean;
};

export function DepreciationPeriodFilters({
    routeName,
    financialYears,
    financialYearId,
    onFinancialYearIdChange,
    fyPeriods,
    year,
    month,
    onYearChange,
    onMonthChange,
    branches,
    branchId,
    onBranchIdChange,
    branchScoped,
    search,
    onSearchChange,
    showSearch,
}: Props) {
    const periodItems = fyPeriods.length > 0
        ? fyPeriods.map((p) => ({ value: `${p.year}-${p.month}`, label: `M${p.fy_month} — ${p.label}` }))
        : Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const d = new Date(year, m - 1, 1);
            return { value: `${year}-${m}`, label: d.toLocaleString(undefined, { month: 'long', year: 'numeric' }) };
        });

    const periodValue = `${year}-${month}`;

    const apply = () => {
        router.get(route(routeName), {
            financial_year_id: financialYearId ?? undefined,
            year,
            month,
            branch_id: branchId ?? undefined,
            search: search || undefined,
        }, { preserveState: true });
    };

    const onPeriodPick = (value: string | number | null) => {
        if (!value) return;
        const [y, m] = String(value).split('-');
        onYearChange(Number(y));
        onMonthChange(Number(m));
    };

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div>
                <Label>Financial year</Label>
                <ComboSelect
                    value={financialYearId}
                    onChange={onFinancialYearIdChange}
                    items={financialYears.map((y) => ({
                        value: y.id,
                        label: y.is_active ? `${y.label} (active)` : y.label,
                    }))}
                    placeholder="Select FY"
                    className="min-w-[160px]"
                />
            </div>
            <div>
                <Label>Period</Label>
                <ComboSelect
                    value={periodValue}
                    onChange={onPeriodPick}
                    items={periodItems}
                    className="min-w-[200px]"
                />
            </div>
            {!branchScoped && branches && onBranchIdChange && (
                <ComboSelect
                    value={branchId ?? null}
                    onChange={onBranchIdChange}
                    items={branchComboSelectItems(branches, { numericValue: true })}
                    placeholder="All branches"
                    className="min-w-[160px]"
                />
            )}
            {showSearch && onSearchChange && (
                <Input value={search || ''} onChange={(e) => onSearchChange(e.target.value)} placeholder="Asset tag…" className="max-w-xs" />
            )}
            <Button variant="outline" onClick={apply}><Search className="h-4 w-4" /></Button>
        </div>
    );
}
