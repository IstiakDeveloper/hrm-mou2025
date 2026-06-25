import React, { useEffect, useMemo } from 'react';
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

function gradeLabel(g: PayrollGradeOption): string {
    const code = (g.code || '').toUpperCase();
    return g.name ? `${code} — ${g.name}` : code || '—';
}

function formatMoney(value: string | number): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
}: Props) {
    const lockedPayscaleId = activePayscaleId ?? (payscales.length === 1 ? String(payscales[0].id) : null);
    const payscaleLocked = Boolean(lockedPayscaleId);
    const effectivePayscaleId = payscaleId || lockedPayscaleId || '';

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
                label: `Step ${s.step_number} — ৳${formatMoney(s.basic_salary)}`,
            })),
        [filteredSteps],
    );

    const selectedStep = useMemo(
        () => filteredSteps.find((s) => String(s.id) === salaryStepId) ?? null,
        [filteredSteps, salaryStepId],
    );

    useEffect(() => {
        if (!salaryStepId || !selectedStep) return;
        onBasicSalaryChange(String(selectedStep.basic_salary ?? ''));
    }, [salaryStepId, selectedStep?.id, selectedStep?.basic_salary]);

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                {payscaleLocked
                    ? 'Payscale is set automatically from the active organization scale. Choose grade and step below, or leave all blank if not ready yet.'
                    : 'Link this employee to a payscale, grade, and step for payroll calculation. Leave blank if not ready yet.'}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-xs">Payscale</Label>
                    <ComboSelect
                        value={(payscaleId || lockedPayscaleId) || null}
                        onChange={(v) => {
                            onPayscaleIdChange(v ?? '');
                            onSalaryGradeIdChange('');
                            onSalaryStepIdChange('');
                        }}
                        items={payscaleItems}
                        placeholder={payscaleLocked ? 'Active payscale' : 'Select payscale'}
                        disabled={payscaleLocked}
                        clearable={!payscaleLocked}
                    />
                    {errors.payscale_id && <p className="text-xs text-red-500">{errors.payscale_id}</p>}
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Salary grade</Label>
                    <ComboSelect
                        value={salaryGradeId || null}
                        onChange={(v) => {
                            onSalaryGradeIdChange(v ?? '');
                            onSalaryStepIdChange('');
                        }}
                        items={gradeItems}
                        placeholder={effectivePayscaleId ? 'Select grade' : 'Select payscale first'}
                        disabled={!effectivePayscaleId}
                        clearable
                    />
                    {errors.salary_grade_id && <p className="text-xs text-red-500">{errors.salary_grade_id}</p>}
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Salary step</Label>
                    <ComboSelect
                        value={salaryStepId || null}
                        onChange={(v) => onSalaryStepIdChange(v ?? '')}
                        items={stepItems}
                        placeholder={salaryGradeId ? 'Select step' : 'Select grade first'}
                        disabled={!salaryGradeId}
                        clearable
                    />
                    {errors.salary_step_id && <p className="text-xs text-red-500">{errors.salary_step_id}</p>}
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Basic salary</Label>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={basicSalary}
                        onChange={(e) => onBasicSalaryChange(e.target.value)}
                        placeholder={selectedStep ? formatMoney(selectedStep.basic_salary) : 'From step or enter manually'}
                    />
                    {selectedStep && (
                        <p className="text-xs text-muted-foreground">
                            Step basic: ৳{formatMoney(selectedStep.basic_salary)}
                        </p>
                    )}
                    {errors.basic_salary && <p className="text-xs text-red-500">{errors.basic_salary}</p>}
                </div>
            </div>
        </div>
    );
}
