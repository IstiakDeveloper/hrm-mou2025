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
    onPayscaleIdChange,
    onSalaryGradeIdChange,
    onSalaryStepIdChange,
    onBasicSalaryChange,
    errors = {},
}: Props) {
    const payscaleItems: ComboSelectItem<string>[] = useMemo(
        () => payscales.map((p) => ({ value: String(p.id), label: p.name })),
        [payscales],
    );

    const filteredGrades = useMemo(() => {
        if (!payscaleId) return [];
        return grades.filter((g) => g.payscale_id === Number(payscaleId));
    }, [grades, payscaleId]);

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
                Link this employee to a payscale, grade, and step for payroll calculation. Leave blank if not ready yet.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-xs">Payscale</Label>
                    <ComboSelect
                        value={payscaleId || null}
                        onChange={(v) => {
                            onPayscaleIdChange(v ?? '');
                            onSalaryGradeIdChange('');
                            onSalaryStepIdChange('');
                        }}
                        items={payscaleItems}
                        placeholder="Select payscale"
                        clearable
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
                        placeholder={payscaleId ? 'Select grade' : 'Select payscale first'}
                        disabled={!payscaleId}
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
