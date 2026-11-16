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
import { FolderOpen, Search, Save, SlidersHorizontal, Scale, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTakaWhole } from '@/lib/taka-format';

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
    'h-8.5 w-full min-w-0 text-right text-xs font-mono border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20';

function sumComponentRows(rows: Row[], basicSalary: number): number {
    return rows.reduce((sum, row) => {
        const amt = parseFloat(row.amount) || 0;
        if (row.amount_type === 'percentage') return sum + Math.round((basicSalary * amt) / 100);
        return sum + Math.round(amt);
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
                'grid w-full grid-cols-1 gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0',
                'sm:grid-cols-12 sm:items-center sm:gap-x-4 sm:px-5',
                highlight && 'bg-amber-50/40 border-l-2 border-l-amber-500',
            )}
        >
            <div className="min-w-0 sm:col-span-5">
                <div className="text-xs font-bold text-slate-800 leading-snug">{headLabel}</div>
                {headSub && <div className="mt-0.5 text-[10px] text-slate-400 font-medium leading-none">{headSub}</div>}
            </div>
            <div className="min-w-0 sm:col-span-3">
                {amountType}
            </div>
            <div className="min-w-0 sm:col-span-4">
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
        <Card className="flex w-full min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title} Components</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0">
                <div className="hidden border-b border-slate-100 bg-slate-50/20 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:grid sm:grid-cols-12 sm:gap-x-4">
                    <div className="sm:col-span-5">Salary Head</div>
                    <div className="sm:col-span-3">Amount Type</div>
                    <div className="sm:col-span-4 text-right">Amount</div>
                </div>

                <div className="w-full min-w-0 flex-1 divide-y divide-slate-100">
                    {includeBasicRow && onBasicChange && (
                        <StructureRowGrid
                            highlight
                            headLabel="Basic Salary"
                            headSub={
                                stepBasicSalary > 0 ? (
                                    <>Step default: ৳{formatTakaWhole(stepBasicSalary)}</>
                                ) : undefined
                            }
                            amountType={
                                <span className="inline-flex h-8.5 items-center px-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-250/50 rounded-md">
                                    Fixed
                                </span>
                            }
                            amountNode={
                                <div className="relative flex items-center">
                                    <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                                    <Input
                                        className={cn(amountInputClass, "pl-6 text-right")}
                                        type="number"
                                        min={0}
                                        step="1"
                                        value={basicAmount}
                                        onChange={(e) => onBasicChange(e.target.value)}
                                    />
                                </div>
                            }
                        />
                    )}
                    {rows.map((row) => {
                        const isPercentage = row.amount_type === 'percentage';
                        const evaluated = isPercentage 
                            ? Math.round((basicSalary * (parseFloat(row.amount) || 0)) / 100) 
                            : Math.round(parseFloat(row.amount) || 0);

                        return (
                            <StructureRowGrid
                                key={row.salary_head_id}
                                headLabel={row.short_name}
                                headSub={row.name}
                                amountType={
                                    <ComboSelect
                                        value={row.amount_type}
                                        onChange={(v) => onChange(row.salary_head_id, { amount_type: v ?? 'fixed' })}
                                        items={[
                                            { value: 'percentage', label: '%' },
                                            { value: 'fixed', label: '৳ FIXED' },
                                        ]}
                                        className="h-8.5 text-xs border-slate-205"
                                    />
                                }
                                amountNode={
                                    <div className="space-y-1">
                                        <div className="relative flex items-center">
                                            {row.amount_type === 'fixed' && (
                                                <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                                            )}
                                            <Input
                                                className={cn(
                                                    amountInputClass,
                                                    row.amount_type === 'fixed' ? 'pl-6' : 'pr-3'
                                                )}
                                                type="number"
                                                min={0}
                                                step="1"
                                                value={row.amount}
                                                onChange={(e) => onChange(row.salary_head_id, { amount: e.target.value })}
                                            />
                                            {row.amount_type === 'percentage' && (
                                                <span className="absolute right-2.5 text-xs text-slate-400 font-medium">%</span>
                                            )}
                                        </div>
                                        {isPercentage && (
                                            <div className="text-[10px] text-right font-bold text-indigo-500 font-mono mt-0.5">
                                                ≈ ৳{formatTakaWhole(evaluated)}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </div>

                <div className="mt-auto flex flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700">
                    <span className="uppercase tracking-wider">Total {title}</span>
                    <span className="font-mono text-sm">
                        ৳{formatTakaWhole(Math.round(total))}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

function formatInitialAmount(amount: string, type: string): string {
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) return '';
    if (type === 'percentage') {
        return String(Number(parsed.toFixed(2))); 
    }
    return String(Math.round(parsed));
}

const cleanRows = (rows: Row[]) => rows.map(r => ({
    ...r,
    amount: formatInitialAmount(r.amount, r.amount_type)
}));

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
    const [additionRows, setAdditionRows] = useState(() => cleanRows(initialAddition));
    const [deductionRows, setDeductionRows] = useState(() => cleanRows(initialDeduction));
    const [basicAmount, setBasicAmount] = useState(String(Math.round(initialBasicSalary) || ''));

    React.useEffect(() => {
        setAdditionRows(cleanRows(initialAddition));
        setDeductionRows(cleanRows(initialDeduction));
        setBasicAmount(String(Math.round(initialBasicSalary) || ''));
    }, [initialAddition, initialDeduction, initialBasicSalary]);

    const basicNum = Math.round(parseFloat(basicAmount) || 0);

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
        const roundedBasic = Math.round(basicNum);
        const totalAddition = roundedBasic + sumComponentRows(additionRows, roundedBasic);
        const totalDeduction = sumComponentRows(deductionRows, roundedBasic);
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
            amount: r.amount_type === 'percentage' 
                ? parseFloat(r.amount) || 0 
                : Math.round(parseFloat(r.amount) || 0),
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
                {/* Header */}
                <div className="mb-5 flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <Scale className="h-4 w-4" />
                            </div>
                            <h1 className="text-base font-bold text-slate-800 sm:text-lg">Salary Structure (Manual)</h1>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                            Configure base formulas and additions/deductions for scale grades and steps.
                        </p>
                    </div>
                </div>

                {/* Saved Structures */}
                {savedStructures.length > 0 && (
                    <Card className="mb-5 w-full rounded-2xl border border-sky-100 bg-sky-50/20 shadow-2xs overflow-hidden transition-all duration-350">
                        <CardHeader className="pb-2 border-b border-sky-100/40 bg-sky-50/10 px-5 py-3">
                            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800">
                                <FolderOpen className="h-4 w-4 text-sky-600" />
                                Saved Structures ({savedStructures.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-sky-100/40 bg-sky-50/5 hover:bg-sky-50/5">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-sky-700 py-3 pl-6">Name</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-sky-700 py-3 text-right">Basic (৳)</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-sky-700 py-3 text-right">Net Payable (৳)</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-sky-700 py-3 text-center">Lines</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-sky-700 py-3">Updated</TableHead>
                                        <TableHead className="w-24 py-3 pr-6" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {savedStructures.map((s) => (
                                        <TableRow key={s.id} className="border-b border-sky-100/30 hover:bg-sky-50/30 transition-colors">
                                            <TableCell className="text-xs font-semibold text-slate-800 py-2.5 pl-6">{s.name}</TableCell>
                                            <TableCell className="text-right font-mono text-xs font-bold text-slate-700 py-2.5">
                                                ৳{formatTakaWhole(s.basic_salary)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-bold text-emerald-800 py-2.5">
                                                ৳{formatTakaWhole(s.net_payable)}
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-slate-500 font-medium py-2.5">{s.lines_count}</TableCell>
                                            <TableCell className="text-[10px] text-slate-400 py-2.5">{s.updated_at ?? '—'}</TableCell>
                                            <TableCell className="py-2.5 pr-6 text-right">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 cursor-pointer shadow-3xs transition-all"
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

                {/* Filter Deck */}
                <Card className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-md p-4 mb-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100/80">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">Select Grade & Step</span>
                    </div>
                    <CardContent className="p-0">
                        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 items-end">
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
                            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                                <Button
                                    type="button"
                                    onClick={search}
                                    disabled={!canSearch}
                                    className="h-8.5 w-full cursor-pointer text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-2xs rounded-lg transition-all duration-200"
                                >
                                    <Search className="mr-1.5 h-3.5 w-3.5" /> Search
                                </Button>
                            </div>
                            {searched && stepBasicSalary > 0 && (
                                <div className="text-center sm:text-left sm:col-span-2 lg:col-span-1 pb-1">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                        Step Basic: <strong className="font-mono text-slate-700">৳{formatTakaWhole(stepBasicSalary)}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Status Badges */}
                {searched && hasStructure && (
                    <div className="mb-4">
                        <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold uppercase tracking-wider text-[9px] px-3 py-1 rounded-full flex items-center gap-1.5 w-fit shadow-3xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Saved structure loaded · edit and save to update
                        </Badge>
                    </div>
                )}

                {searched ? (
                    <>
                        <div className="mb-5 grid w-full grid-cols-1 gap-5 xl:grid-cols-2">
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
                        
                        {/* Summary Totals & Save Panel */}
                        <Card className="w-full rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-300">
                            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="grid w-full grid-cols-1 gap-3 text-xs sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-8">
                                    <div className="flex justify-between items-center gap-3 sm:block">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Addition</div>
                                        <div className="font-mono text-sm font-extrabold text-slate-800 mt-0.5">
                                            ৳{formatTakaWhole(liveTotals.total_addition)}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center gap-3 sm:block">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deduction</div>
                                        <div className="font-mono text-sm font-extrabold text-slate-800 mt-0.5">
                                            ৳{formatTakaWhole(liveTotals.total_deduction)}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center gap-3 sm:block">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Payable</div>
                                        <div className="font-mono text-base font-extrabold text-emerald-700 mt-0.5 flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            ৳{formatTakaWhole(liveTotals.net_payable)}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={save}
                                    disabled={saving}
                                    className="h-9 w-full shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-sm rounded-lg transition-all duration-200 sm:w-auto sm:min-w-[120px]"
                                >
                                    {saving ? (
                                        <span className="flex items-center gap-1.5 justify-center">
                                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Saving...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 justify-center">
                                            <Save className="h-3.5 w-3.5" /> Save Formula
                                        </span>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-250 p-12 text-center">
                        <Calculator className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Step Loaded</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-normal">
                            Select a payscale, grade, and step above, then click search to configure the salary structure formula.
                        </p>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
