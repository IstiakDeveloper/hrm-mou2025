import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ComboSelect } from '@/components/ComboSelect';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
} from '@/components/payroll/PayrollFilterGrid';
import {
    PayrollPage,
    PayrollPageHeader,
    PayrollSectionCard,
    PayrollEmptyState,
} from '@/components/payroll/PayrollPageShell';
import { DISPLAY_DATE_FMT, parseFormDateValue } from '@/lib/display-date';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { format } from 'date-fns';
import {
    ArrowLeft,
    Save,
    Search,
    Sparkles,
    TrendingUp,
    TrendingDown,
    User,
    AlertCircle,
    RotateCcw,
    CheckCircle2,
    DollarSign,
    ShieldAlert,
} from 'lucide-react';

type HeadItem = {
    salary_head_id: number;
    name: string;
    short_name: string;
    type: 'earning' | 'deduction';
    is_basic_head: boolean;
    standard_amount_type: string;
    standard_amount: number;
    standard_computed: number;
    is_modified: boolean;
    amount_type: string;
    amount: string;
    computed: number;
    reason: string;
};

type EmployeeData = {
    id: number;
    pin: string;
    name: string;
    branch: string;
    department: string;
    designation: string;
    payscale: string;
    grade: string;
    step: string;
    step_basic: number;
    current_basic: number;
};

type SummaryData = {
    total_allowances: number;
    total_deductions: number;
    net_salary: number;
    standard_total_allowances: number;
    standard_total_deductions: number;
    standard_net_salary: number;
};

type Props = {
    filters: {
        branch_id?: string;
        employee_id?: string;
        effective_from?: string;
        reason?: string;
    };
    employee: EmployeeData | null;
    allowances: HeadItem[];
    deductions: HeadItem[];
    summary: SummaryData | null;
    warning?: string | null;
    branches: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
};

export default function SalaryHeadModificationCreate({
    filters: initialFilters,
    employee,
    allowances: initialAllowances,
    deductions: initialDeductions,
    summary: initialSummary,
    warning,
    branches,
    employees,
}: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{
        errors?: Record<string, string>;
        flash?: { success?: string; error?: string };
    }>().props;

    const [filters, setFilters] = useState({
        branch_id: initialFilters.branch_id || '',
        employee_id: initialFilters.employee_id || '',
        effective_from: initialFilters.effective_from || '',
        reason: initialFilters.reason || '',
    });

    const [allowanceItems, setAllowanceItems] = useState<HeadItem[]>(initialAllowances);
    const [deductionItems, setDeductionItems] = useState<HeadItem[]>(initialDeductions);
    const [saving, setSaving] = useState(false);
    const [clientErrors, setClientErrors] = useState<string[]>([]);

    useEffect(() => {
        setAllowanceItems(initialAllowances);
    }, [initialAllowances]);

    useEffect(() => {
        setDeductionItems(initialDeductions);
    }, [initialDeductions]);

    const setFilter = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleLoadEmployee = () => {
        const msgs: string[] = [];
        if (!filters.employee_id) msgs.push('Please select an employee.');
        if (!filters.effective_from) msgs.push('Please select an effective from date.');

        if (msgs.length > 0) {
            setClientErrors(msgs);
            return;
        }

        setClientErrors([]);
        router.get(route('salary-head-modifications.create'), filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Recompute all dependent components when any item changes
    const recalculateAll = (
        newAllowances: HeadItem[],
        newDeductions: HeadItem[]
    ): { allowances: HeadItem[]; deductions: HeadItem[] } => {
        const basicItem = newAllowances.find((a) => a.is_basic_head);
        const effectiveBasic = basicItem
            ? basicItem.is_modified
                ? parseFloat(basicItem.amount) || 0
                : basicItem.standard_computed
            : 0;

        const updatedAllowances = newAllowances.map((item) => {
            if (item.is_basic_head) {
                const amt = parseFloat(item.amount) || 0;
                return {
                    ...item,
                    computed: item.is_modified ? amt : item.standard_computed,
                };
            }
            if (item.amount_type === 'percentage') {
                const pct = parseFloat(item.amount) || 0;
                return {
                    ...item,
                    computed: Math.round((effectiveBasic * pct) / 100),
                };
            }
            const amt = parseFloat(item.amount) || 0;
            return {
                ...item,
                computed: Math.round(amt),
            };
        });

        const updatedDeductions = newDeductions.map((item) => {
            if (item.amount_type === 'percentage') {
                const pct = parseFloat(item.amount) || 0;
                return {
                    ...item,
                    computed: Math.round((effectiveBasic * pct) / 100),
                };
            }
            const amt = parseFloat(item.amount) || 0;
            return {
                ...item,
                computed: Math.round(amt),
            };
        });

        return { allowances: updatedAllowances, deductions: updatedDeductions };
    };

    const handleAllowanceChange = (headId: number, patch: Partial<HeadItem>) => {
        const next = allowanceItems.map((item) => {
            if (item.salary_head_id === headId) {
                return { ...item, ...patch };
            }
            return item;
        });

        const res = recalculateAll(next, deductionItems);
        setAllowanceItems(res.allowances);
        setDeductionItems(res.deductions);
    };

    const handleDeductionChange = (headId: number, patch: Partial<HeadItem>) => {
        const next = deductionItems.map((item) => {
            if (item.salary_head_id === headId) {
                return { ...item, ...patch };
            }
            return item;
        });

        const res = recalculateAll(allowanceItems, next);
        setAllowanceItems(res.allowances);
        setDeductionItems(res.deductions);
    };

    // Live Totals
    const liveTotalAllowances = useMemo(
        () => allowanceItems.reduce((acc, i) => acc + (i.computed || 0), 0),
        [allowanceItems]
    );

    const liveTotalDeductions = useMemo(
        () => deductionItems.reduce((acc, i) => acc + (i.computed || 0), 0),
        [deductionItems]
    );

    const liveNetSalary = liveTotalAllowances - liveTotalDeductions;

    const standardNetSalary = initialSummary?.standard_net_salary ?? 0;
    const netDifference = liveNetSalary - standardNetSalary;

    const modifiedCount = useMemo(
        () =>
            [...allowanceItems, ...deductionItems].filter((i) => i.is_modified).length,
        [allowanceItems, deductionItems]
    );

    const handleSave = () => {
        if (!employee) return;
        if (!filters.effective_from) {
            setClientErrors(['Please provide an effective from date.']);
            return;
        }

        setSaving(true);
        const allItems = [...allowanceItems, ...deductionItems].map((item) => ({
            salary_head_id: item.salary_head_id,
            amount_type: item.amount_type,
            amount: parseFloat(item.amount) || 0,
            is_modified: item.is_modified,
        }));

        router.post(
            route('salary-head-modifications.store'),
            {
                employee_id: employee.id,
                effective_from: filters.effective_from,
                reason: filters.reason,
                items: allItems,
            },
            {
                onError: (errs) => {
                    setClientErrors(Object.values(errs as Record<string, string>).filter(Boolean));
                    setSaving(false);
                },
                onFinish: () => setSaving(false),
            }
        );
    };

    const basicItem = allowanceItems.find((a) => a.is_basic_head);
    const nonBasicAllowances = allowanceItems.filter((a) => !a.is_basic_head);

    return (
        <Layout>
            <Head title="Modify Salary Components" />
            <PayrollPage>
                {/* Header with Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div>
                        <Link
                            href={route('salary-head-modifications.index')}
                            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-1.5"
                        >
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to modifications list
                        </Link>
                        <PayrollPageHeader
                            icon={Sparkles}
                            title="Modify Salary Components"
                            description="Configure customized allowances and deductions for an employee side-by-side. Values automatically take effect in monthly payroll calculations."
                        />
                    </div>

                    {employee && (
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSave}
                                disabled={saving}
                                className="cursor-pointer gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 h-9 shadow-sm"
                            >
                                <Save className="h-4 w-4" />
                                Save Modifications {modifiedCount > 0 ? `(${modifiedCount})` : ''}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Alerts */}
                {warning && (
                    <Alert className="mb-5 border-amber-200 bg-amber-50/70 text-amber-900 rounded-xl shadow-xs">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-800">Notice</AlertTitle>
                        <AlertDescription className="text-xs text-amber-700/90 mt-1">{warning}</AlertDescription>
                    </Alert>
                )}

                {(clientErrors.length > 0 || Object.keys(pageErrors).length > 0) && (
                    <Alert variant="destructive" className="mb-5 rounded-xl border-red-200 bg-red-50/60">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-red-800">Action Required</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-red-700">
                                {[...clientErrors, ...Object.values(pageErrors).filter(Boolean)].map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Top Selector Card: Branch, Single Employee, Effective Date, Reason */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs mb-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <Search className="h-3.5 w-3.5 text-indigo-600" />
                        Select Employee & Effective Date
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        <PayrollBranchSelect
                            value={filters.branch_id}
                            onChange={(v) => {
                                setFilter('branch_id', v);
                                setFilter('employee_id', '');
                            }}
                            branches={branches}
                            allowAll
                        />

                        <PayrollEmployeeSelect
                            label="Employee (Single)"
                            value={filters.employee_id}
                            onChange={(v) => setFilter('employee_id', v)}
                            employees={employees}
                            branchId={filters.branch_id || undefined}
                            allowAll={false}
                            required
                            payrollReady
                        />

                        <PayrollField label="Effective From Date" required>
                            <DatePicker
                                selected={parseFormDateValue(filters.effective_from)}
                                onSelect={(d) => setFilter('effective_from', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                        </PayrollField>

                        <PayrollField label="Reason / Note (Optional)">
                            <Input
                                value={filters.reason}
                                onChange={(e) => setFilter('reason', e.target.value)}
                                placeholder="e.g. Annual increment, special adjustment"
                                className="h-8.5 text-xs bg-white"
                            />
                        </PayrollField>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500">
                            Select one employee and effective date to load their full salary profile.
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleLoadEmployee}
                            className="cursor-pointer h-8 text-xs bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-4"
                        >
                            <Search className="mr-1.5 h-3.5 w-3.5" /> Load Salary Details
                        </Button>
                    </div>
                </div>

                {/* If employee is loaded */}
                {employee ? (
                    <div className="space-y-6">
                        {/* Employee Profile Card */}
                        <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 p-4 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                        {employee.pin}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-bold text-slate-900">{employee.name}</h2>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold uppercase text-indigo-700 border-indigo-200 bg-indigo-50">
                                                Active Staff
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                                            {employee.designation} &bull; {employee.department} &bull; {employee.branch}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs bg-white px-3.5 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Payscale</span>
                                        <span className="font-semibold text-slate-700">{employee.payscale}</span>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200" />
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Grade & Step</span>
                                        <span className="font-semibold text-slate-700">{employee.grade} ({employee.step})</span>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200" />
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Grade Standard Basic</span>
                                        <span className="font-mono font-bold text-slate-900">{formatTakaWithSymbol(employee.step_basic)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2-Column Split: Allowances & Basic on Left | Deductions on Right */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* LEFT COLUMN: Allowance & Earnings Part */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                                            <TrendingUp className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Allowances & Earnings</h3>
                                            <p className="text-[11px] text-slate-500">Basic salary and monthly allowances</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono text-xs font-bold">
                                        Total: {formatTakaWithSymbol(liveTotalAllowances)}
                                    </Badge>
                                </div>

                                {/* Prominent Basic Salary Card */}
                                {basicItem && (
                                    <div className={`rounded-xl border-2 p-4 transition-all ${
                                        basicItem.is_modified
                                            ? 'border-purple-300 bg-purple-50/40 shadow-xs'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}>
                                        <div className="flex items-center justify-between mb-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-900">Basic Salary</span>
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider text-purple-700 border-purple-200 bg-purple-50">
                                                    Foundation
                                                </Badge>
                                                {basicItem.is_modified && (
                                                    <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 font-bold uppercase">
                                                        Modified
                                                    </Badge>
                                                )}
                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                                                <Checkbox
                                                    checked={basicItem.is_modified}
                                                    onCheckedChange={(checked) =>
                                                        handleAllowanceChange(basicItem.salary_head_id, {
                                                            is_modified: Boolean(checked),
                                                            amount: Boolean(checked) ? basicItem.amount : String(basicItem.standard_amount),
                                                        })
                                                    }
                                                />
                                                <span>Override Basic</span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Grade Basic</span>
                                                <span className="text-xs font-mono text-slate-500 font-medium">
                                                    {formatTakaWithSymbol(basicItem.standard_amount)}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                                    {basicItem.is_modified ? 'Modified Amount (৳)' : 'Current Basic (৳)'}
                                                </span>
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-2 text-xs font-medium text-slate-400">৳</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        disabled={!basicItem.is_modified}
                                                        value={basicItem.amount}
                                                        onChange={(e) =>
                                                            handleAllowanceChange(basicItem.salary_head_id, {
                                                                amount: e.target.value,
                                                            })
                                                        }
                                                        className={`h-8.5 pl-6 font-mono text-xs font-semibold ${
                                                            basicItem.is_modified ? 'bg-white border-purple-300' : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Calculated</span>
                                                <span className="text-sm font-mono font-bold text-purple-700">
                                                    {formatTakaWithSymbol(basicItem.computed)}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="mt-2 text-[10.5px] text-slate-500 italic">
                                            Tip: Adjusting basic salary automatically re-computes percentage-based allowances (HR, MA) and PF on the right.
                                        </p>
                                    </div>
                                )}

                                {/* Other Allowance Heads */}
                                <div className="space-y-2.5">
                                    {nonBasicAllowances.map((head) => (
                                        <div
                                            key={head.salary_head_id}
                                            className={`rounded-xl border p-3.5 transition-all ${
                                                head.is_modified
                                                    ? 'border-emerald-300 bg-emerald-50/30 shadow-xs'
                                                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-800">{head.name}</span>
                                                    {head.short_name && head.short_name !== head.name && (
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-slate-500 border-slate-200">
                                                            {head.short_name}
                                                        </Badge>
                                                    )}
                                                    {head.is_modified && (
                                                        <Badge className="bg-emerald-600 text-white text-[8px] px-1 py-0 font-bold uppercase">
                                                            Overridden
                                                        </Badge>
                                                    )}
                                                </div>

                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
                                                    <Checkbox
                                                        checked={head.is_modified}
                                                        onCheckedChange={(checked) =>
                                                            handleAllowanceChange(head.salary_head_id, {
                                                                is_modified: Boolean(checked),
                                                                amount: Boolean(checked) ? head.amount : String(head.standard_amount),
                                                                amount_type: Boolean(checked) ? head.amount_type : head.standard_amount_type,
                                                            })
                                                        }
                                                    />
                                                    <span>Override</span>
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                                {/* Calculation Type */}
                                                <div className="sm:col-span-5">
                                                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mode</span>
                                                    <ComboSelect
                                                        disabled={!head.is_modified}
                                                        value={head.amount_type}
                                                        onChange={(v) =>
                                                            handleAllowanceChange(head.salary_head_id, {
                                                                amount_type: v ?? 'fixed',
                                                            })
                                                        }
                                                        items={[
                                                            { value: 'percentage', label: '% of Basic' },
                                                            { value: 'fixed', label: 'Fixed Amount (৳)' },
                                                        ]}
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                </div>

                                                {/* Input Value */}
                                                <div className="sm:col-span-4">
                                                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                                        {head.amount_type === 'percentage' ? 'Rate (%)' : 'Amount (৳)'}
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        disabled={!head.is_modified}
                                                        value={head.amount}
                                                        onChange={(e) =>
                                                            handleAllowanceChange(head.salary_head_id, {
                                                                amount: e.target.value,
                                                            })
                                                        }
                                                        className={`h-8 font-mono text-xs ${
                                                            head.is_modified ? 'bg-white border-emerald-300' : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                    />
                                                </div>

                                                {/* Computed Taka */}
                                                <div className="sm:col-span-3 text-right">
                                                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Calculated</span>
                                                    <span className="text-xs font-mono font-bold text-slate-900">
                                                        {formatTakaWithSymbol(head.computed)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-slate-400">
                                                <span>
                                                    Standard: {head.standard_amount_type === 'percentage' ? `${head.standard_amount}%` : `৳${head.standard_amount}`} ({formatTakaWithSymbol(head.standard_computed)})
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Allowances Subtotal Card */}
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Gross Allowances Total</span>
                                    </div>
                                    <span className="text-base font-mono font-bold text-emerald-800">
                                        {formatTakaWithSymbol(liveTotalAllowances)}
                                    </span>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Deductions Part */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                                            <TrendingDown className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Deductions & Statutory</h3>
                                            <p className="text-[11px] text-slate-500">Provident fund, income tax, loans, and welfare</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-rose-50 text-rose-800 border-rose-200 font-mono text-xs font-bold">
                                        Total: {formatTakaWithSymbol(liveTotalDeductions)}
                                    </Badge>
                                </div>

                                {/* Deduction Heads List */}
                                <div className="space-y-2.5">
                                    {deductionItems.map((head) => (
                                        <div
                                            key={head.salary_head_id}
                                            className={`rounded-xl border p-3.5 transition-all ${
                                                head.is_modified
                                                    ? 'border-rose-300 bg-rose-50/30 shadow-xs'
                                                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-800">{head.name}</span>
                                                    {head.short_name && head.short_name !== head.name && (
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-slate-500 border-slate-200">
                                                            {head.short_name}
                                                        </Badge>
                                                    )}
                                                    {head.is_modified && (
                                                        <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 font-bold uppercase">
                                                            Overridden
                                                        </Badge>
                                                    )}
                                                </div>

                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
                                                    <Checkbox
                                                        checked={head.is_modified}
                                                        onCheckedChange={(checked) =>
                                                            handleDeductionChange(head.salary_head_id, {
                                                                is_modified: Boolean(checked),
                                                                amount: Boolean(checked) ? head.amount : String(head.standard_amount),
                                                                amount_type: Boolean(checked) ? head.amount_type : head.standard_amount_type,
                                                            })
                                                        }
                                                    />
                                                    <span>Override</span>
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                                {/* Calculation Type */}
                                                <div className="sm:col-span-5">
                                                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mode</span>
                                                    <ComboSelect
                                                        disabled={!head.is_modified}
                                                        value={head.amount_type}
                                                        onChange={(v) =>
                                                            handleDeductionChange(head.salary_head_id, {
                                                                amount_type: v ?? 'fixed',
                                                            })
                                                        }
                                                        items={[
                                                            { value: 'percentage', label: '% of Basic' },
                                                            { value: 'fixed', label: 'Fixed Amount (৳)' },
                                                        ]}
                                                        className="h-8 text-xs bg-white"
                                                    />
                                                </div>

                                                {/* Input Value */}
                                                <div className="sm:col-span-4">
                                                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                                        {head.amount_type === 'percentage' ? 'Rate (%)' : 'Amount (৳)'}
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        disabled={!head.is_modified}
                                                        value={head.amount}
                                                        onChange={(e) =>
                                                            handleDeductionChange(head.salary_head_id, {
                                                                amount: e.target.value,
                                                            })
                                                        }
                                                        className={`h-8 font-mono text-xs ${
                                                            head.is_modified ? 'bg-white border-rose-300' : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                    />
                                                </div>

                                                {/* Computed Taka */}
                                                <div className="sm:col-span-3 text-right">
                                                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Calculated</span>
                                                    <span className="text-xs font-mono font-bold text-rose-700">
                                                        {formatTakaWithSymbol(head.computed)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-slate-400">
                                                <span>
                                                    Standard: {head.standard_amount_type === 'percentage' ? `${head.standard_amount}%` : `৳${head.standard_amount}`} ({formatTakaWithSymbol(head.standard_computed)})
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Deductions Subtotal Card */}
                                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center gap-1.5">
                                        <TrendingDown className="h-4 w-4 text-rose-600" />
                                        <span className="text-xs font-bold text-rose-950 uppercase tracking-wider">Total Deductions</span>
                                    </div>
                                    <span className="text-base font-mono font-bold text-rose-800">
                                        {formatTakaWithSymbol(liveTotalDeductions)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Bottom Summary & Save Bar */}
                        <div className="rounded-2xl border border-slate-300/80 bg-white p-4.5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <div>
                                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Allowances</span>
                                    <span className="text-base font-mono font-bold text-emerald-700">
                                        {formatTakaWithSymbol(liveTotalAllowances)}
                                    </span>
                                </div>

                                <span className="text-slate-300 text-lg font-light hidden sm:inline">&minus;</span>

                                <div>
                                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Deductions</span>
                                    <span className="text-base font-mono font-bold text-rose-700">
                                        {formatTakaWithSymbol(liveTotalDeductions)}
                                    </span>
                                </div>

                                <span className="text-slate-300 text-lg font-light hidden sm:inline">&equals;</span>

                                <div>
                                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Salary Payable</span>
                                    <span className="text-lg font-mono font-black text-indigo-900">
                                        {formatTakaWithSymbol(liveNetSalary)}
                                    </span>
                                </div>

                                {netDifference !== 0 && (
                                    <div className="hidden lg:block pl-2 border-l border-slate-200">
                                        <span className="block text-[10px] uppercase font-bold text-slate-400">Impact vs Standard</span>
                                        <span className={`text-xs font-mono font-bold ${netDifference > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {netDifference > 0 ? `+${formatTakaWithSymbol(netDifference)}` : formatTakaWithSymbol(netDifference)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2.5 justify-end">
                                <Link href={route('salary-head-modifications.index')}>
                                    <Button type="button" variant="outline" size="sm" className="cursor-pointer h-9 px-4 text-xs font-semibold">
                                        Cancel
                                    </Button>
                                </Link>

                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="cursor-pointer gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 h-9 shadow-xs"
                                >
                                    <Save className="h-4 w-4" />
                                    {saving ? 'Saving...' : 'Save Modifications'}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <PayrollEmptyState
                        message="Please select an employee and effective date above, then click 'Load Salary Details' to modify allowances and deductions."
                    />
                )}
            </PayrollPage>
        </Layout>
    );
}
