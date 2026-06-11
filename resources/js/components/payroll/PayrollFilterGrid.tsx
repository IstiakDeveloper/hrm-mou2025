import React, { useMemo } from 'react';
import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { useEmployeeLookup } from '@/lib/employee-lookup';
import { Label } from '@/components/ui/label';
import { branchComboSelectItems, type PayrollBranchOption } from '@/lib/payroll-branches';

type Option = { id: number; name: string | null };
type EmpOption = {
    id: number;
    pin?: string | null;
    name_en?: string | null;
    employee_id?: string | null;
    pf_balance?: number;
};

const ALL_VALUE = '';

function optionItems(
    options: Option[],
    opts?: { allowAll?: boolean; allLabel?: string; required?: boolean; emptyLabel?: string },
): ComboSelectItem<string>[] {
    const items: ComboSelectItem<string>[] = [];
    if (opts?.allowAll) {
        items.push({ value: ALL_VALUE, label: opts.allLabel ?? 'All' });
    } else if (opts?.required && opts.emptyLabel) {
        items.push({ value: ALL_VALUE, label: opts.emptyLabel, disabled: true });
    }
    for (const o of options) {
        items.push({
            value: String(o.id),
            label: o.name ?? '—',
            keywords: String(o.id),
        });
    }
    return items;
}

function FilterSelect({
    label,
    value,
    onChange,
    options,
    required,
    disabled,
    placeholder = 'All',
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Option[];
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
}) {
    const items = useMemo(
        () =>
            optionItems(options, {
                allowAll: !required,
                allLabel: placeholder,
                required,
                emptyLabel: placeholder,
            }),
        [options, placeholder, required],
    );

    return (
        <PayrollField label={label} required={required}>
            <ComboSelect
                value={value || (required ? null : ALL_VALUE)}
                onChange={(v) => onChange(v ?? '')}
                items={items}
                placeholder={placeholder}
                disabled={disabled}
                className="h-8.5 bg-white text-xs"
            />
        </PayrollField>
    );
}

export function PayrollBranchSelect({
    label = 'Branch',
    value,
    onChange,
    branches,
    required = false,
    allowAll = true,
    allLabel = 'All branches',
    disabled,
}: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    branches: PayrollBranchOption[];
    required?: boolean;
    allowAll?: boolean;
    allLabel?: string;
    disabled?: boolean;
}) {
    const items = useMemo(() => {
        const list: ComboSelectItem<string>[] = [];
        if (allowAll && !required) {
            list.push({ value: ALL_VALUE, label: allLabel });
        } else if (required) {
            list.push({ value: ALL_VALUE, label: 'Select branch', disabled: true });
        }
        list.push(...branchComboSelectItems(branches));
        return list;
    }, [allLabel, allowAll, branches, required]);

    return (
        <PayrollField label={label} required={required}>
            <ComboSelect
                value={value || (required ? null : ALL_VALUE)}
                onChange={(v) => onChange(v ?? '')}
                items={items}
                placeholder={allowAll && !required ? allLabel : 'Select branch'}
                disabled={disabled}
                className="h-8.5 bg-white text-xs"
            />
        </PayrollField>
    );
}

export function PayrollEmployeeSelect({
    label = 'Employee',
    value,
    onChange,
    employees,
    required = false,
    allowAll = true,
    allLabel = 'All employees',
    disabled,
    showPfBalance = false,
    disableZeroPfBalance = false,
    comboPortal = true,
    branchId,
    payrollReady = false,
}: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    employees: EmpOption[];
    required?: boolean;
    allowAll?: boolean;
    allLabel?: string;
    disabled?: boolean;
    showPfBalance?: boolean;
    disableZeroPfBalance?: boolean;
    comboPortal?: boolean;
    branchId?: string;
    payrollReady?: boolean;
}) {
    const useLookup = employees.length === 0;
    const lookup = useEmployeeLookup({ enabled: useLookup, branchId, limit: 50, payrollReady });
    const employeeSource = useLookup ? lookup.employees : employees;

    const items = useMemo(() => {
        const list: ComboSelectItem<string>[] = [];
        if (allowAll && !required) {
            list.push({ value: ALL_VALUE, label: allLabel });
        } else if (required) {
            list.push({ value: ALL_VALUE, label: 'Select employee', disabled: true });
        }
        for (const e of employeeSource) {
            const pin = e.pin || e.employee_id || '';
            const name = e.name_en || '';
            const base = [pin, name].filter(Boolean).join(' — ') || `Employee #${e.id}`;
            const balance = Number(e.pf_balance ?? 0);
            const balanceSuffix =
                showPfBalance && balance > 0
                    ? ` · Balance ${balance.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
                    : showPfBalance && balance <= 0
                      ? ' · No PF balance'
                      : '';
            list.push({
                value: String(e.id),
                label: base + balanceSuffix,
                keywords: [pin, name, String(e.id), String(balance)].filter(Boolean).join(' '),
                disabled: disableZeroPfBalance && balance <= 0,
            });
        }
        return list;
    }, [allLabel, allowAll, disableZeroPfBalance, employeeSource, required, showPfBalance]);

    return (
        <PayrollField label={label} required={required}>
            <ComboSelect
                value={value || (required ? null : ALL_VALUE)}
                onChange={(v) => onChange(v ?? '')}
                items={items}
                placeholder={required ? 'Search employee…' : allLabel}
                disabled={disabled}
                portal={comboPortal}
                className="h-8.5 bg-white text-xs"
            />
        </PayrollField>
    );
}

export function PayrollYearSelect({
    value,
    onChange,
    years,
    required = false,
    allowAll = false,
    allLabel = 'All years',
    disabled,
    label = 'Year',
}: {
    value: string;
    onChange: (v: string) => void;
    years: number[];
    required?: boolean;
    allowAll?: boolean;
    allLabel?: string;
    disabled?: boolean;
    label?: string;
}) {
    const items = useMemo(() => {
        const list: ComboSelectItem<string>[] = [];
        if (allowAll) {
            list.push({ value: ALL_VALUE, label: allLabel });
        } else if (required) {
            list.push({ value: ALL_VALUE, label: 'Select year', disabled: true });
        }
        for (const y of years) {
            list.push({ value: String(y), label: String(y) });
        }
        return list;
    }, [allLabel, allowAll, required, years]);

    return (
        <PayrollField label={label} required={required}>
            <ComboSelect
                value={value || (required && !allowAll ? null : allowAll ? ALL_VALUE : null)}
                onChange={(v) => onChange(v ?? '')}
                items={items}
                placeholder={allowAll ? allLabel : 'Select year'}
                disabled={disabled}
                className="h-8.5 bg-white text-xs"
            />
        </PayrollField>
    );
}

export function PayrollMonthSelect({
    value,
    onChange,
    months,
    required = false,
    allowAll = false,
    allLabel = 'All months',
    disabled,
    label = 'Month',
}: {
    value: string;
    onChange: (v: string) => void;
    months: { value: number; label: string }[];
    required?: boolean;
    allowAll?: boolean;
    allLabel?: string;
    disabled?: boolean;
    label?: string;
}) {
    const items = useMemo(() => {
        const list: ComboSelectItem<string>[] = [];
        if (allowAll) {
            list.push({ value: ALL_VALUE, label: allLabel });
        } else if (required) {
            list.push({ value: ALL_VALUE, label: 'Select month', disabled: true });
        }
        for (const m of months) {
            list.push({ value: String(m.value), label: m.label });
        }
        return list;
    }, [allLabel, allowAll, months, required]);

    return (
        <PayrollField label={label} required={required}>
            <ComboSelect
                value={value || (required && !allowAll ? null : allowAll ? ALL_VALUE : null)}
                onChange={(v) => onChange(v ?? '')}
                items={items}
                placeholder={allowAll ? allLabel : 'Select month'}
                disabled={disabled}
                className="h-8.5 bg-white text-xs"
            />
        </PayrollField>
    );
}

/** Standalone searchable payscale filter (e.g. list page toolbars). */
export function PayrollPayscaleFilter({
    value,
    onChange,
    payscales,
    className = 'w-full max-w-[220px]',
    allowAll = true,
    allLabel = 'All payscales',
}: {
    value: string;
    onChange: (v: string) => void;
    payscales: { id: number; name: string | null; branch_code?: string | null }[];
    className?: string;
    allowAll?: boolean;
    allLabel?: string;
}) {
    const items = useMemo(() => {
        const sorted = [...payscales].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        const list: ComboSelectItem<string>[] = allowAll ? [{ value: ALL_VALUE, label: allLabel }] : [];
        for (const p of sorted) {
            list.push({ value: String(p.id), label: p.name ?? '—' });
        }
        return list;
    }, [allLabel, allowAll, payscales]);

    return (
        <ComboSelect
            value={value || (allowAll ? ALL_VALUE : null)}
            onChange={(v) => onChange(v ?? '')}
            items={items}
            placeholder={allLabel}
            className={className}
        />
    );
}

/** Searchable payscale picker (setup forms). */
export function PayrollPayscaleSelect({
    value,
    onChange,
    payscales,
    required,
    disabled,
    placeholder = 'Search payscale…',
}: {
    value: string;
    onChange: (v: string) => void;
    payscales: { id: number; name: string | null }[];
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
}) {
    return (
        <PayrollComboField
            label="Payscale"
            required={required}
            value={value}
            onChange={onChange}
            disabled={disabled}
            items={[
                ...(required ? [{ value: '', label: 'Select payscale', disabled: true }] : [{ value: '', label: 'All payscales' }]),
                ...payscales.map((p) => ({ value: String(p.id), label: p.name ?? '—' })),
            ]}
            placeholder={placeholder}
        />
    );
}

export function PayrollComboField({
    label,
    value,
    onChange,
    items,
    required,
    disabled,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    items: ComboSelectItem<string>[];
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
}) {
    return (
        <PayrollField label={label} required={required}>
            <ComboSelect
                value={value || (required ? null : ALL_VALUE)}
                onChange={(v) => onChange(v ?? '')}
                items={items}
                placeholder={placeholder ?? 'Select…'}
                disabled={disabled}
                className="h-8.5 bg-white text-xs"
            />
        </PayrollField>
    );
}

export function PayrollFilterGrid({
    filters,
    setFilter,
    branches,
    departments,
    designations,
    programs,
    projects,
    employees,
    employeeTypes,
    showEmployee = true,
    showEmployeeType = false,
    showProgram = true,
    showProject = true,
    showBranch = true,
    branchRequired = false,
    payrollReadyEmployees = false,
}: {
    filters: Record<string, string>;
    setFilter: (key: string, value: string) => void;
    branches: PayrollBranchOption[];
    departments: Option[];
    designations: Option[];
    programs: Option[];
    projects: Option[];
    employees: EmpOption[];
    employeeTypes?: Option[];
    showEmployee?: boolean;
    showEmployeeType?: boolean;
    showProgram?: boolean;
    showProject?: boolean;
    showBranch?: boolean;
    branchRequired?: boolean;
    payrollReadyEmployees?: boolean;
}) {
    return (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {showBranch && (
                <PayrollBranchSelect
                    value={filters.branch_id}
                    onChange={(v) => setFilter('branch_id', v)}
                    branches={branches}
                    required={branchRequired}
                    allowAll={!branchRequired}
                />
            )}
            {showProgram && (
                <FilterSelect label="Program" value={filters.program_id} onChange={(v) => setFilter('program_id', v)} options={programs} placeholder="All programs" />
            )}
            {showProject && (
                <FilterSelect label="Project" value={filters.project_id} onChange={(v) => setFilter('project_id', v)} options={projects} placeholder="All projects" />
            )}
            <FilterSelect label="Department" value={filters.department_id} onChange={(v) => setFilter('department_id', v)} options={departments} placeholder="All departments" />
            <FilterSelect label="Designation" value={filters.designation_id} onChange={(v) => setFilter('designation_id', v)} options={designations} placeholder="All designations" />
            {showEmployeeType && employeeTypes ? (
                <FilterSelect
                    label="Employee type"
                    value={filters.employee_type_id}
                    onChange={(v) => setFilter('employee_type_id', v)}
                    options={employeeTypes}
                    placeholder="All types"
                />
            ) : null}
            {showEmployee && (
                <PayrollEmployeeSelect
                    value={filters.employee_id}
                    onChange={(v) => setFilter('employee_id', v)}
                    employees={employees}
                    branchId={filters.branch_id || undefined}
                    payrollReady={payrollReadyEmployees}
                />
            )}
        </div>
    );
}

export function PayrollField({
    label,
    required,
    children,
    className,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={className ?? 'min-w-0 space-y-1'}>
            <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </Label>
            {children}
        </div>
    );
}
