import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Option = { id: number; name: string | null };
type EmpOption = { id: number; pin?: string | null; name_en?: string | null; employee_id?: string | null };

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
    return (
        <div className="min-w-0 space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </Label>
            <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)} disabled={disabled}>
                <SelectTrigger className="h-10 w-full bg-white">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {!required && <SelectItem value="all">{placeholder}</SelectItem>}
                    {options.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                            {o.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
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
    showEmployee = true,
    showProgram = true,
    showProject = true,
}: {
    filters: Record<string, string>;
    setFilter: (key: string, value: string) => void;
    branches: Option[];
    departments: Option[];
    designations: Option[];
    programs: Option[];
    projects: Option[];
    employees: EmpOption[];
    showEmployee?: boolean;
    showProgram?: boolean;
    showProject?: boolean;
}) {
    return (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect label="Branch" value={filters.branch_id} onChange={(v) => setFilter('branch_id', v)} options={branches} placeholder="All branches" />
            {showProgram && (
                <FilterSelect label="Program" value={filters.program_id} onChange={(v) => setFilter('program_id', v)} options={programs} placeholder="All programs" />
            )}
            {showProject && (
                <FilterSelect label="Project" value={filters.project_id} onChange={(v) => setFilter('project_id', v)} options={projects} placeholder="All projects" />
            )}
            <FilterSelect label="Department" value={filters.department_id} onChange={(v) => setFilter('department_id', v)} options={departments} placeholder="All departments" />
            <FilterSelect label="Designation" value={filters.designation_id} onChange={(v) => setFilter('designation_id', v)} options={designations} placeholder="All designations" />
            {showEmployee && (
                <div className="min-w-0 space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Employee</Label>
                    <Select value={filters.employee_id || 'all'} onValueChange={(v) => setFilter('employee_id', v === 'all' ? '' : v)}>
                        <SelectTrigger className="h-10 w-full bg-white">
                            <SelectValue placeholder="All employees" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All employees</SelectItem>
                            {employees.map((e) => (
                                <SelectItem key={e.id} value={String(e.id)}>
                                    {[e.pin || e.employee_id, e.name_en].filter(Boolean).join(' — ')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
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
        <div className={className ?? 'min-w-0 space-y-1.5'}>
            <Label className="text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </Label>
            {children}
        </div>
    );
}
