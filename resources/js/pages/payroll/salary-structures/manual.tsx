import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollComboField } from '@/components/payroll/PayrollFilterGrid';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderOpen, Search, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

type SavedStructure = {
    id: number;
    name: string;
    payscale_id: number;
    salary_grade_id: number;
    salary_step_id: number;
    basic_salary: number;
    net_payable: number;
    lines_count: number;
    updated_at: string | null;
};

type Row = {
    salary_head_id: number;
    short_name: string;
    name: string;
    amount_type: string;
    amount: string;
};

type Props = {
    filters: { payscale_id: string; salary_grade_id: string; salary_step_id: string };
    payscales: { id: number; name: string }[];
    grades: { id: number; payscale_id: number; name: string | null }[];
    steps: { id: number; salary_grade_id: number; step_number: number; basic_salary: string }[];
    additionRows: Row[];
    deductionRows: Row[];
    basicSalary: number;
    stepBasicSalary: number;
    totals: { total_addition: number; total_deduction: number; net_payable: number };
    hasStructure: boolean;
    savedStructures: SavedStructure[];
};

const amountInputClass =
    'h-10 w-full min-w-0 text-right text-sm tabular-nums sm:h-11 sm:text-base';
const typeSelectClass = 'h-10 w-full min-w-0 sm:h-11';

function sumComponentRows(rows: Row[], basicSalary: number): number {
    return rows.reduce((sum, row) => {
        const amt = parseFloat(row.amount) || 0;
        if (row.amount_type === 'percentage') return sum + (basicSalary * amt) / 100;
        return sum + amt;
    }, 0);
}

function StructureRowGrid({
    headLabel,
    headSub,
    amountType,
    amountNode,
    highlight = false,
}: {
    headLabel: React.ReactNode;
    headSub?: React.ReactNode;
    amountType: React.ReactNode;
    amountNode: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <div
            className={cn(
                'grid w-full grid-cols-1 gap-3 border-b px-3 py-3 last:border-b-0',
                'sm:grid-cols-12 sm:items-center sm:gap-x-4 sm:px-4',
                highlight && 'bg-amber-50/60',
            )}
        >
            <div className="min-w-0 sm:col-span-5">
                <div className="text-sm font-medium leading-snug">{headLabel}</div>
                {headSub && <div className="mt-0.5 text-xs text-muted-foreground">{headSub}</div>}
            </div>
            <div className="min-w-0 sm:col-span-3">
                <Label className="mb-1.5 block text-xs text-muted-foreground sm:sr-only">Amount type</Label>
                {amountType}
            </div>
            <div className="min-w-0 sm:col-span-4">
                <Label className="mb-1.5 block text-xs text-muted-foreground sm:sr-only">Amount</Label>
                {amountNode}
            </div>
        </div>
    );
}

function StructureTable({
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
    rows: Row[];
    basicSalary: number;
    onChange: (headId: number, patch: Partial<Row>) => void;
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
        <Card className="flex w-full min-w-0 flex-1 flex-col">
            <CardHeader className="border-b bg-slate-100 py-3">
                <CardTitle className="text-center text-sm font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0">
                <div className="hidden border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold text-muted-foreground sm:grid sm:grid-cols-12 sm:gap-x-4">
                    <div className="sm:col-span-5">Salary Head</div>
                    <div className="sm:col-span-3">Amount Type</div>
                    <div className="sm:col-span-4 text-right">Amount</div>
                </div>

                <div className="w-full min-w-0 flex-1">
                    {includeBasicRow && onBasicChange && (
                        <StructureRowGrid
                            highlight
                            headLabel="Basic"
                            headSub={
                                stepBasicSalary > 0 ? (
                                    <>Step default: {stepBasicSalary.toLocaleString()}</>
                                ) : undefined
                            }
                            amountType={<span className="inline-flex h-10 items-center text-xs text-muted-foreground sm:h-11">FIXED</span>}
                            amountNode={
                                <Input
                                    className={amountInputClass}
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={basicAmount}
                                    onChange={(e) => onBasicChange(e.target.value)}
                                />
                            }
                        />
                    )}
                    {rows.map((row) => (
                        <StructureRowGrid
                            key={row.salary_head_id}
                            headLabel={row.short_name}
                            headSub={row.name}
                            amountType={
                                <ComboSelect
                                    value={row.amount_type}
                                    onChange={(v) => onChange(row.salary_head_id, { amount_type: v ?? 'fixed' })}
                                    items={[
                                        { value: 'percentage', label: 'PERCENTAGE' },
                                        { value: 'fixed', label: 'FIXED' },
                                    ]}
                                    className={typeSelectClass}
                                />
                            }
                            amountNode={
                                <Input
                                    className={amountInputClass}
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={row.amount}
                                    onChange={(e) => onChange(row.salary_head_id, { amount: e.target.value })}
                                />
                            }
                        />
                    ))}
                </div>

                <div className="mt-auto flex flex-col gap-1 bg-slate-700 px-4 py-3 text-sm font-semibold text-white sm:flex-row sm:items-center sm:justify-between">
                    <span>Total {title}</span>
                    <span className="tabular-nums text-base sm:text-lg">
                        {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function SalaryStructureManual({
    filters,
    payscales,
    grades,
    steps,
    additionRows: initialAddition,
    deductionRows: initialDeduction,
    basicSalary: initialBasicSalary,
    stepBasicSalary,
    hasStructure,
    savedStructures,
}: Props) {
    const [additionRows, setAdditionRows] = useState(initialAddition);
    const [deductionRows, setDeductionRows] = useState(initialDeduction);
    const [basicAmount, setBasicAmount] = useState(String(initialBasicSalary || ''));

    React.useEffect(() => {
        setAdditionRows(initialAddition);
        setDeductionRows(initialDeduction);
        setBasicAmount(String(initialBasicSalary || ''));
    }, [initialAddition, initialDeduction, initialBasicSalary]);

    const basicNum = parseFloat(basicAmount) || 0;

    const [payscaleId, setPayscaleId] = useState(filters.payscale_id || '');
    const [gradeId, setGradeId] = useState(filters.salary_grade_id || '');
    const [stepId, setStepId] = useState(filters.salary_step_id || '');
    const [saving, setSaving] = useState(false);

    const canSearch = Boolean(payscaleId && gradeId && stepId);
    const searched =
        canSearch &&
        filters.payscale_id === payscaleId &&
        filters.salary_grade_id === gradeId &&
        filters.salary_step_id === stepId;

    const search = () => {
        router.get(route('salary-structures.manual'), {
            payscale_id: payscaleId,
            salary_grade_id: gradeId,
            salary_step_id: stepId,
        });
    };

    const loadSaved = (s: SavedStructure) => {
        router.get(route('salary-structures.manual'), {
            payscale_id: s.payscale_id,
            salary_grade_id: s.salary_grade_id,
            salary_step_id: s.salary_step_id,
        });
    };

    const patchAddition = (id: number, patch: Partial<Row>) => {
        setAdditionRows((rows) => rows.map((r) => (r.salary_head_id === id ? { ...r, ...patch } : r)));
    };
    const patchDeduction = (id: number, patch: Partial<Row>) => {
        setDeductionRows((rows) => rows.map((r) => (r.salary_head_id === id ? { ...r, ...patch } : r)));
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

    const save = () => {
        if (!canSearch) return;
        const lines = [...additionRows, ...deductionRows].map((r) => ({
            salary_head_id: r.salary_head_id,
            amount_type: r.amount_type,
            amount: parseFloat(r.amount) || 0,
        }));
        setSaving(true);
        router.post(
            route('salary-structures.manual.save'),
            {
                payscale_id: payscaleId,
                salary_grade_id: gradeId,
                salary_step_id: stepId,
                basic_salary: basicNum,
                lines,
            },
            { onFinish: () => setSaving(false) },
        );
    };

    return (
        <Layout>
            <Head title="Salary Structure (Manual)" />
            <PageSurface className="w-full max-w-full">
                <div className="mb-4 w-full">
                    <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Salary Structure (Manual)</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Select Scale + Grade + Step, then <strong>SEARCH</strong> to load or edit. SAVE stores data in
                        the database — it does not show until you search that same combination (or use Load below).
                    </p>
                </div>

                {savedStructures.length > 0 && (
                    <Card className="mb-4 w-full border-sky-200 bg-sky-50/40">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FolderOpen className="h-4 w-4 text-sky-700" />
                                Saved structures ({savedStructures.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-0 pb-2 sm:px-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="text-right">Basic</TableHead>
                                        <TableHead className="text-right">Net</TableHead>
                                        <TableHead className="text-center">Lines</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="w-24" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {savedStructures.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="text-sm font-medium">{s.name}</TableCell>
                                            <TableCell className="text-right tabular-nums text-sm">
                                                {s.basic_salary.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-sm">
                                                {s.net_payable.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center text-sm">{s.lines_count}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{s.updated_at ?? '—'}</TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8"
                                                    onClick={() => loadSaved(s)}
                                                >
                                                    Load
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                <Card className="mb-4 w-full bg-slate-50">
                    <CardContent className="pt-4">
                        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                            <PayrollComboField
                                label="Salary Scale"
                                value={payscaleId}
                                onChange={(v) => {
                                    setPayscaleId(v);
                                    setGradeId('');
                                    setStepId('');
                                }}
                                items={[
                                    { value: '', label: 'Select payscale', disabled: true },
                                    ...payscales.map((p) => ({ value: String(p.id), label: p.name })),
                                ]}
                                required
                                placeholder="Search payscale…"
                            />
                            <PayrollComboField
                                label="Grade"
                                value={gradeId}
                                onChange={(v) => {
                                    setGradeId(v);
                                    setStepId('');
                                }}
                                disabled={!payscaleId}
                                items={[
                                    { value: '', label: 'Select grade', disabled: true },
                                    ...grades
                                        .filter((g) => !payscaleId || g.payscale_id === Number(payscaleId))
                                        .map((g) => ({ value: String(g.id), label: g.name || '—' })),
                                ]}
                                required
                                placeholder="Search grade…"
                            />
                            <PayrollComboField
                                label="Step"
                                value={stepId}
                                onChange={(v) => setStepId(v)}
                                disabled={!gradeId}
                                items={[
                                    { value: '', label: 'Select step', disabled: true },
                                    ...steps
                                        .filter((s) => !gradeId || s.salary_grade_id === Number(gradeId))
                                        .map((s) => ({
                                            value: String(s.id),
                                            label: `Step ${s.step_number}`,
                                            keywords: String(s.step_number),
                                        })),
                                ]}
                                required
                                placeholder="Search step…"
                            />
                            <div className="flex min-w-0 flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
                                <Button
                                    type="button"
                                    onClick={search}
                                    disabled={!canSearch}
                                    className="h-10 w-full bg-sky-600 hover:bg-sky-700 sm:w-auto lg:w-full"
                                >
                                    <Search className="mr-1 h-4 w-4" /> SEARCH
                                </Button>
                                {searched && stepBasicSalary > 0 && (
                                    <p className="text-center text-xs text-muted-foreground lg:text-left">
                                        Step basic: <strong>{stepBasicSalary.toLocaleString()}</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {searched && hasStructure && (
                    <div className="mb-3">
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                            Saved structure loaded — edit and SAVE to update
                        </Badge>
                    </div>
                )}

                {searched ? (
                    <>
                        <div className="mb-4 grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
                            <StructureTable
                                title="Addition"
                                rows={additionRows}
                                basicSalary={basicNum}
                                onChange={patchAddition}
                                includeBasicRow
                                basicAmount={basicAmount}
                                onBasicChange={setBasicAmount}
                                stepBasicSalary={stepBasicSalary}
                            />
                            <StructureTable
                                title="Deduction"
                                rows={deductionRows}
                                basicSalary={basicNum}
                                onChange={patchDeduction}
                            />
                        </div>
                        <Card className="w-full">
                            <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="grid w-full grid-cols-1 gap-2 text-sm sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-6">
                                    <span className="flex justify-between gap-2 sm:block">
                                        Total Addition:{' '}
                                        <strong className="tabular-nums">
                                            {liveTotals.total_addition.toLocaleString()}
                                        </strong>
                                    </span>
                                    <span className="flex justify-between gap-2 sm:block">
                                        Total Deduction:{' '}
                                        <strong className="tabular-nums">
                                            {liveTotals.total_deduction.toLocaleString()}
                                        </strong>
                                    </span>
                                    <span className="flex justify-between gap-2 sm:block">
                                        Net Payable:{' '}
                                        <strong className="tabular-nums text-green-700">
                                            {liveTotals.net_payable.toLocaleString()}
                                        </strong>
                                    </span>
                                </div>
                                <Button
                                    onClick={save}
                                    disabled={saving}
                                    className="h-11 w-full shrink-0 bg-emerald-600 hover:bg-emerald-700 sm:w-auto sm:min-w-[140px]"
                                >
                                    <Save className="mr-2 h-4 w-4" /> SAVE
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        Select payscale, grade and step, then click SEARCH.
                    </p>
                )}
            </PageSurface>
        </Layout>
    );
}
