import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type PayrollPayscaleOption = { id: number; name: string };
export type PayrollGradeOption = { id: number; payscale_id: number; code: string; name: string | null };
export type PayrollStepOption = {
    id: number;
    salary_grade_id: number;
    step_number: number;
    basic_salary: string | number;
};

export type SalaryComponentRow = {
    salary_head_id: number;
    short_name: string;
    name: string;
    amount_type: string;
    amount: string;
};

export type SalaryAssignmentPreview = {
    basic_salary: number;
    step_basic_salary: number;
    addition_rows: SalaryComponentRow[];
    deduction_rows: SalaryComponentRow[];
    totals: { total_addition: number; total_deduction: number; net_payable: number };
};

export function buildSalaryLinesJson(additionRows: SalaryComponentRow[], deductionRows: SalaryComponentRow[]): string {
    return JSON.stringify(
        [...additionRows, ...deductionRows].map((row) => ({
            salary_head_id: row.salary_head_id,
            amount_type: row.amount_type,
            amount: parseFloat(row.amount) || 0,
        })),
    );
}

function gradeLabel(g: PayrollGradeOption): string {
    const code = (g.code || '').toUpperCase();
    return g.name ? `${code} — ${g.name}` : code || '—';
}

import { formatTakaWhole } from '@/lib/taka-format';

function formatAmountDisplay(value: string, amountType: string): string {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return '';
    if (amountType === 'percentage') {
        return String(Number(n.toFixed(2))).replace(/\.?0+$/, '');
    }
    return String(Math.round(n));
}

function sumComponentRows(rows: SalaryComponentRow[], basicSalary: number): number {
    return rows.reduce((sum, row) => {
        const amt = parseFloat(row.amount) || 0;
        if (row.amount_type === 'percentage') return sum + Math.round((basicSalary * amt) / 100);
        return sum + Math.round(amt);
    }, 0);
}

function AmountTypeSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
        >
            <option value="percentage">%</option>
            <option value="fixed">Fixed</option>
        </select>
    );
}

function SalaryComponentsTable({
    title,
    rows,
    basicSalary,
    onChange,
    includeBasicRow = false,
    basicAmount = '',
    onBasicChange,
    stepBasicSalary = 0,
}: {
    title: string;
    rows: SalaryComponentRow[];
    basicSalary: number;
    onChange: (headId: number, patch: Partial<SalaryComponentRow>) => void;
    includeBasicRow?: boolean;
    basicAmount?: string;
    onBasicChange?: (value: string) => void;
    stepBasicSalary?: number;
}) {
    const total = useMemo(() => {
        const components = sumComponentRows(rows, basicSalary);
        return includeBasicRow ? basicSalary + components : components;
    }, [rows, basicSalary, includeBasicRow]);

    return (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/80 px-3 py-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">{title} Components</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-[11px]">
                    <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/40 text-[10px] uppercase tracking-wide text-zinc-400">
                            <th className="px-3 py-2 text-left font-semibold">Head</th>
                            <th className="w-[72px] px-2 py-2 text-left font-semibold">Type</th>
                            <th className="w-[88px] px-2 py-2 text-right font-semibold">Amount</th>
                            <th className="w-[72px] px-3 py-2 text-right font-semibold">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {includeBasicRow && onBasicChange && (
                            <tr className="border-b border-zinc-100 bg-amber-50/30">
                                <td className="px-3 py-2">
                                    <div className="font-semibold text-zinc-800">Basic</div>
                                    {stepBasicSalary > 0 && (
                                        <div className="text-[10px] text-zinc-400">Step: ৳{formatTakaWhole(stepBasicSalary)}</div>
                                    )}
                                </td>
                                <td className="px-2 py-2">
                                    <span className="inline-flex h-7 items-center rounded-md bg-amber-100 px-2 text-[10px] font-semibold text-amber-800">
                                        Fixed
                                    </span>
                                </td>
                                <td className="px-2 py-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        step="1"
                                        value={basicAmount}
                                        onChange={(e) => onBasicChange(e.target.value)}
                                        className="h-7 border-zinc-200 px-2 text-right text-[11px] font-mono"
                                    />
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-semibold text-zinc-700">
                                    ৳{formatTakaWhole(basicAmount || 0)}
                                </td>
                            </tr>
                        )}
                        {rows.map((row) => {
                            const isPercentage = row.amount_type === 'percentage';
                            const evaluated = isPercentage
                                ? Math.round((basicSalary * (parseFloat(row.amount) || 0)) / 100)
                                : Math.round(parseFloat(row.amount) || 0);

                            return (
                                <tr key={row.salary_head_id} className="border-b border-zinc-50 last:border-b-0">
                                    <td className="px-3 py-2">
                                        <div className="font-semibold text-zinc-800">{row.short_name}</div>
                                        <div className="truncate text-[10px] text-zinc-400">{row.name}</div>
                                    </td>
                                    <td className="px-2 py-2">
                                        <AmountTypeSelect
                                            value={row.amount_type}
                                            onChange={(v) => onChange(row.salary_head_id, { amount_type: v })}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            step={isPercentage ? '0.01' : '1'}
                                            value={row.amount}
                                            onChange={(e) => onChange(row.salary_head_id, { amount: e.target.value })}
                                            className="h-7 border-zinc-200 px-2 text-right text-[11px] font-mono"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-[11px] font-semibold text-indigo-600">
                                        ৳{formatTakaWhole(evaluated)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total {title}</span>
                <span className="font-mono text-[12px] font-bold text-zinc-800">৳{formatTakaWhole(total)}</span>
            </div>
        </div>
    );
}

type Props = {
    payscales: PayrollPayscaleOption[];
    grades: PayrollGradeOption[];
    steps: PayrollStepOption[];
    payscaleId: string;
    salaryGradeId: string;
    salaryStepId: string;
    basicSalary: string;
    activePayscaleId?: string | null;
    onPayscaleIdChange: (value: string) => void;
    onSalaryGradeIdChange: (value: string) => void;
    onSalaryStepIdChange: (value: string) => void;
    onBasicSalaryChange: (value: string) => void;
    errors?: Record<string, string | undefined>;
    showSalaryComponents?: boolean;
    additionRows?: SalaryComponentRow[];
    deductionRows?: SalaryComponentRow[];
    onAdditionRowsChange?: (rows: SalaryComponentRow[]) => void;
    onDeductionRowsChange?: (rows: SalaryComponentRow[]) => void;
    previewUrl?: string;
    employeeId?: number;
    stepBasicSalary?: number;
};

export function EmployeeSalaryAssignment({
    payscales,
    grades,
    steps,
    payscaleId,
    salaryGradeId,
    salaryStepId,
    basicSalary,
    activePayscaleId = null,
    onPayscaleIdChange,
    onSalaryGradeIdChange,
    onSalaryStepIdChange,
    onBasicSalaryChange,
    errors = {},
    showSalaryComponents = false,
    additionRows = [],
    deductionRows = [],
    onAdditionRowsChange,
    onDeductionRowsChange,
    previewUrl,
    employeeId,
    stepBasicSalary: stepBasicSalaryProp = 0,
}: Props) {
    const lockedPayscaleId = activePayscaleId ?? (payscales.length === 1 ? String(payscales[0].id) : null);
    const payscaleLocked = Boolean(lockedPayscaleId);
    const effectivePayscaleId = payscaleId || lockedPayscaleId || '';
    const [previewLoading, setPreviewLoading] = useState(false);
    const [stepBasicSalary, setStepBasicSalary] = useState(stepBasicSalaryProp);
    const previewRequestId = useRef(0);
    const lastPreviewKey = useRef<string | null>(null);

    useEffect(() => {
        setStepBasicSalary(stepBasicSalaryProp);
    }, [stepBasicSalaryProp]);

    useEffect(() => {
        if (!lockedPayscaleId) return;
        if (payscaleId === lockedPayscaleId) return;
        onPayscaleIdChange(lockedPayscaleId);
        onSalaryGradeIdChange('');
        onSalaryStepIdChange('');
    }, [lockedPayscaleId, payscaleId, onPayscaleIdChange, onSalaryGradeIdChange, onSalaryStepIdChange]);

    const payscaleItems: ComboSelectItem<string>[] = useMemo(
        () => payscales.map((p) => ({ value: String(p.id), label: p.name })),
        [payscales],
    );

    const filteredGrades = useMemo(() => {
        if (!effectivePayscaleId) return [];
        return grades.filter((g) => g.payscale_id === Number(effectivePayscaleId));
    }, [grades, effectivePayscaleId]);

    const gradeItems: ComboSelectItem<string>[] = useMemo(
        () => filteredGrades.map((g) => ({ value: String(g.id), label: gradeLabel(g) })),
        [filteredGrades],
    );

    const filteredSteps = useMemo(() => {
        if (!salaryGradeId) return [];
        return steps.filter((s) => s.salary_grade_id === Number(salaryGradeId));
    }, [steps, salaryGradeId]);

    const stepItems: ComboSelectItem<string>[] = useMemo(
        () =>
            filteredSteps.map((s) => ({
                value: String(s.id),
                label: `Step ${s.step_number} — ৳${formatTakaWhole(s.basic_salary)}`,
            })),
        [filteredSteps],
    );

    const selectedStep = useMemo(
        () => filteredSteps.find((s) => String(s.id) === salaryStepId) ?? null,
        [filteredSteps, salaryStepId],
    );

    const basicNum = Math.round(parseFloat(basicSalary) || 0);
    const assignmentKey = `${effectivePayscaleId}-${salaryGradeId}-${salaryStepId}`;

    const normalizePreviewRows = (rows: SalaryComponentRow[]) =>
        rows.map((row) => ({
            ...row,
            amount: formatAmountDisplay(row.amount, row.amount_type),
        }));

    const applyPreview = (preview: SalaryAssignmentPreview) => {
        onBasicSalaryChange(String(Math.round(preview.basic_salary) || ''));
        setStepBasicSalary(preview.step_basic_salary);
        onAdditionRowsChange?.(normalizePreviewRows(preview.addition_rows));
        onDeductionRowsChange?.(normalizePreviewRows(preview.deduction_rows));
    };

    useEffect(() => {
        if (!showSalaryComponents || !previewUrl) return;
        if (!effectivePayscaleId || !salaryGradeId || !salaryStepId) {
            onAdditionRowsChange?.([]);
            onDeductionRowsChange?.([]);
            lastPreviewKey.current = null;
            return;
        }

        if (lastPreviewKey.current === assignmentKey) {
            return;
        }

        const hasLoadedRows = additionRows.length > 0 || deductionRows.length > 0;
        if (lastPreviewKey.current === null && employeeId && hasLoadedRows) {
            lastPreviewKey.current = assignmentKey;
            return;
        }

        lastPreviewKey.current = assignmentKey;

        const requestId = ++previewRequestId.current;
        const params = new URLSearchParams({
            payscale_id: effectivePayscaleId,
            salary_grade_id: salaryGradeId,
            salary_step_id: salaryStepId,
        });
        if (employeeId) {
            params.set('employee_id', String(employeeId));
        }

        setPreviewLoading(true);
        fetch(`${previewUrl}?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Preview failed'))))
            .then((preview: SalaryAssignmentPreview) => {
                if (requestId !== previewRequestId.current) return;
                applyPreview(preview);
            })
            .catch(() => {
                if (requestId !== previewRequestId.current) return;
                if (selectedStep) {
                    onBasicSalaryChange(String(selectedStep.basic_salary ?? ''));
                    setStepBasicSalary(Number(selectedStep.basic_salary) || 0);
                }
            })
            .finally(() => {
                if (requestId === previewRequestId.current) {
                    setPreviewLoading(false);
                }
            });
    }, [showSalaryComponents, previewUrl, assignmentKey, employeeId]);

    useEffect(() => {
        if (showSalaryComponents) return;
        if (!salaryStepId || !selectedStep) return;
        onBasicSalaryChange(String(selectedStep.basic_salary ?? ''));
    }, [showSalaryComponents, salaryStepId, selectedStep?.id, selectedStep?.basic_salary]);

    const patchAddition = (id: number, patch: Partial<SalaryComponentRow>) => {
        onAdditionRowsChange?.(
            additionRows.map((r) => (r.salary_head_id === id ? { ...r, ...patch } : r)),
        );
    };

    const patchDeduction = (id: number, patch: Partial<SalaryComponentRow>) => {
        onDeductionRowsChange?.(
            deductionRows.map((r) => (r.salary_head_id === id ? { ...r, ...patch } : r)),
        );
    };

    const liveTotals = useMemo(() => {
        const totalAddition = basicNum + sumComponentRows(additionRows, basicNum);
        const totalDeduction = sumComponentRows(deductionRows, basicNum);
        return {
            total_addition: totalAddition,
            total_deduction: totalDeduction,
            net_payable: totalAddition - totalDeduction,
        };
    }, [additionRows, deductionRows, basicNum]);

    const hasAssignment = Boolean(effectivePayscaleId && salaryGradeId && salaryStepId);

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
                {payscaleLocked
                    ? 'Payscale is set automatically from the active organization scale. Choose grade and step below, or leave all blank if not ready yet.'
                    : 'Link this employee to a payscale, grade, and step for payroll calculation. Leave blank if not ready yet.'}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                    <Label className="text-[11px]">Payscale</Label>
                    <ComboSelect
                        value={(payscaleId || lockedPayscaleId) || null}
                        onChange={(v) => {
                            onPayscaleIdChange(v ?? '');
                            onSalaryGradeIdChange('');
                            onSalaryStepIdChange('');
                            lastPreviewKey.current = null;
                        }}
                        items={payscaleItems}
                        placeholder={payscaleLocked ? 'Active payscale' : 'Select payscale'}
                        disabled={payscaleLocked}
                        clearable={!payscaleLocked}
                    />
                    {errors.payscale_id && <p className="text-[11px] text-red-500">{errors.payscale_id}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[11px]">Salary grade</Label>
                    <ComboSelect
                        value={salaryGradeId || null}
                        onChange={(v) => {
                            onSalaryGradeIdChange(v ?? '');
                            onSalaryStepIdChange('');
                            lastPreviewKey.current = null;
                        }}
                        items={gradeItems}
                        placeholder={effectivePayscaleId ? 'Select grade' : 'Select payscale first'}
                        disabled={!effectivePayscaleId}
                        clearable
                    />
                    {errors.salary_grade_id && <p className="text-[11px] text-red-500">{errors.salary_grade_id}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[11px]">Salary step</Label>
                    <ComboSelect
                        value={salaryStepId || null}
                        onChange={(v) => {
                            onSalaryStepIdChange(v ?? '');
                            lastPreviewKey.current = null;
                        }}
                        items={stepItems}
                        placeholder={salaryGradeId ? 'Select step' : 'Select grade first'}
                        disabled={!salaryGradeId}
                        clearable
                    />
                    {errors.salary_step_id && <p className="text-[11px] text-red-500">{errors.salary_step_id}</p>}
                </div>
            </div>

            {showSalaryComponents && hasAssignment && (
                <div className="space-y-3">
                    {previewLoading && (
                        <p className="text-[11px] text-muted-foreground">Loading salary components…</p>
                    )}
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <SalaryComponentsTable
                            title="Addition"
                            rows={additionRows}
                            basicSalary={basicNum}
                            onChange={patchAddition}
                            includeBasicRow
                            basicAmount={basicSalary}
                            onBasicChange={onBasicSalaryChange}
                            stepBasicSalary={stepBasicSalary}
                        />
                        <SalaryComponentsTable
                            title="Deduction"
                            rows={deductionRows}
                            basicSalary={basicNum}
                            onChange={patchDeduction}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2.5">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Gross</p>
                            <p className="font-mono text-[12px] font-bold text-zinc-800">৳{formatTakaWhole(liveTotals.total_addition)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Deduction</p>
                            <p className="font-mono text-[12px] font-bold text-zinc-800">৳{formatTakaWhole(liveTotals.total_deduction)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Net</p>
                            <p className="font-mono text-[12px] font-bold text-emerald-700">৳{formatTakaWhole(liveTotals.net_payable)}</p>
                        </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Saved amounts are used for payroll, including PF and other deductions. Active loan installments still apply unless you set a custom amount for that loan head.
                    </p>
                    {errors.basic_salary && <p className="text-[11px] text-red-500">{errors.basic_salary}</p>}
                </div>
            )}
        </div>
    );
}
