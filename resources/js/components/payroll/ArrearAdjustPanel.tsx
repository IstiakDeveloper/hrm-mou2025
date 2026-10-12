import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PayrollComboField } from '@/components/payroll/PayrollFilterGrid';
import { payrollBtnPrimary } from '@/components/payroll/PayrollPageShell';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { cn } from '@/lib/utils';
import { Sparkles, RotateCcw, Save, Search, UserCheck } from 'lucide-react';

export type ArrearRow = {
    payslip_id: number;
    payroll_run_id: number;
    name: string;
    pin: string;
    branch_id: number | null;
    branch: string;
    department: string;
    department_id: number | null;
    project: string;
    project_id: number | null;
    suggested: number;
    amount: number;
    note: string;
    orders: string[];
    line_ids: number[];
    linked: boolean;
    withheld: boolean;
};

type Option = { id: number; name: string };

export function ArrearAdjustPanel({
    rows,
    departments,
    projects,
    branches,
    initialBranchId = '',
}: {
    rows: ArrearRow[];
    departments: Option[];
    projects: Option[];
    branches: Option[];
    initialBranchId?: string;
}) {
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const [branchId, setBranchId] = useState(initialBranchId);
    const [departmentId, setDepartmentId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [query, setQuery] = useState('');
    const [amounts, setAmounts] = useState<Record<number, string>>({});
    const [saving, setSaving] = useState(false);

    const rowsKey = rows.map((row) => `${row.payslip_id}:${row.amount}`).join('|');

    useEffect(() => {
        setAmounts(Object.fromEntries(rows.map((row) => [row.payslip_id, row.amount > 0 ? String(row.amount) : ''])));
    }, [rowsKey, rows]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        return rows.filter((row) => {
            if (branchId && String(row.branch_id ?? '') !== branchId) return false;
            if (departmentId && String(row.department_id ?? '') !== departmentId) return false;
            if (projectId && String(row.project_id ?? '') !== projectId) return false;
            if (!q) return true;

            return (
                row.name.toLowerCase().includes(q)
                || row.pin.toLowerCase().includes(q)
                || row.department.toLowerCase().includes(q)
                || row.project.toLowerCase().includes(q)
            );
        });
    }, [rows, branchId, departmentId, projectId, query]);

    const filled = visible.filter((row) => !row.withheld && Number(amounts[row.payslip_id]) > 0).length;
    const blank = visible.filter((row) => !row.withheld && !(Number(amounts[row.payslip_id]) > 0)).length;
    const suggestedCount = visible.filter((row) => !row.withheld && row.suggested > 0).length;

    const totalAllocated = useMemo(() => {
        return visible.reduce((sum, r) => {
            const val = Number(amounts[r.payslip_id]);
            return sum + (!isNaN(val) && val > 0 ? val : 0);
        }, 0);
    }, [visible, amounts]);

    const fillAllSuggested = () => {
        setAmounts((prev) => {
            const next = { ...prev };
            for (const r of visible) {
                if (!r.withheld && r.suggested > 0) {
                    next[r.payslip_id] = String(r.suggested);
                }
            }
            return next;
        });
    };

    const clearAllVisible = () => {
        if (!window.confirm('Clear arrear amount inputs for visible staff in this filter?')) return;
        setAmounts((prev) => {
            const next = { ...prev };
            for (const r of visible) {
                next[r.payslip_id] = '';
            }
            return next;
        });
    };

    const apply = () => {
        const payload = visible
            .filter((row) => !row.withheld && Number(amounts[row.payslip_id]) > 0)
            .map((row) => {
                const amount = Number(amounts[row.payslip_id]);

                return {
                    payslip_id: row.payslip_id,
                    amount,
                    note: row.note,
                    line_ids: row.line_ids.length > 0 && (row.linked || amount === row.suggested) ? row.line_ids : [],
                };
            });

        const clearIds = visible
            .filter((row) => row.amount > 0 && !(Number(amounts[row.payslip_id]) > 0))
            .map((row) => row.payslip_id);

        if (payload.length === 0 && clearIds.length === 0) {
            window.alert('Enter an amount for the people who should get arrear. Leave the others blank or 0.');
            return;
        }

        setSaving(true);
        router.post(
            route('salary-arrear.apply'),
            { rows: payload, clear_payslip_ids: clearIds },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Filter & Search Staff
                    </span>
                    <span className="text-[11px] text-slate-400">
                        Showing <strong>{visible.length}</strong> of {rows.length} total staff
                    </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <PayrollComboField
                        label="Branch"
                        value={branchId}
                        onChange={setBranchId}
                        items={[{ value: '', label: 'All branches' }, ...branches.map((branch) => ({ value: String(branch.id), label: branch.name }))]}
                    />
                    <PayrollComboField
                        label="Department"
                        value={departmentId}
                        onChange={setDepartmentId}
                        items={[{ value: '', label: 'All departments' }, ...departments.map((item) => ({ value: String(item.id), label: item.name }))]}
                    />
                    <PayrollComboField
                        label="Project"
                        value={projectId}
                        onChange={setProjectId}
                        items={[{ value: '', label: 'All projects' }, ...projects.map((item) => ({ value: String(item.id), label: item.name }))]}
                    />
                    <div className="flex flex-col justify-end">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search Name or PIN..."
                                className="h-8.5 pl-8 bg-white text-xs border-slate-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Helper Actions */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {suggestedCount > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={fillAllSuggested}
                                className="cursor-pointer text-xs h-7.5 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/70"
                            >
                                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                                Auto-fill All Suggested Increments ({suggestedCount})
                            </Button>
                        )}
                        {filled > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={clearAllVisible}
                                className="cursor-pointer text-xs h-7.5 text-slate-500 hover:text-slate-700"
                            >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Clear visible
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">
                            Allocated Arrear Total:
                        </span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {formatTakaWithSymbol(totalAllocated)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Employee Adjustment Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50/80 text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="px-3 py-2.5">Staff Details</th>
                            <th className="px-3 py-2.5">Department</th>
                            <th className="px-3 py-2.5">Project</th>
                            <th className="px-3 py-2.5 text-right">Increment Suggestion</th>
                            <th className="px-3 py-2.5 text-right">Arrear Amount (৳)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visible.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                                    No staff found matching current filters.
                                </td>
                            </tr>
                        ) : (
                            visible.map((row) => (
                                <tr
                                    key={row.payslip_id}
                                    className={cn(
                                        'hover:bg-slate-50/70 transition-colors',
                                        row.withheld && 'opacity-50 bg-slate-50/40',
                                        Number(amounts[row.payslip_id]) > 0 && 'bg-emerald-50/20'
                                    )}
                                >
                                    <td className="px-3 py-2.5">
                                        <div className="font-semibold text-slate-800">{row.name}</div>
                                        <div className="text-[10px] text-slate-400">
                                            PIN: {row.pin || '—'} · {row.branch}
                                            {row.withheld && (
                                                <span className="ml-1 text-red-500 font-semibold">· Withheld / On hold</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">{row.department}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{row.project}</td>
                                    <td className="px-3 py-2.5 text-right">
                                        {row.suggested > 0 ? (
                                            <button
                                                type="button"
                                                className="cursor-pointer text-indigo-700 font-medium hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                                                disabled={row.withheld}
                                                title="Click to apply this suggestion"
                                                onClick={() => setAmounts((current) => ({ ...current, [row.payslip_id]: String(row.suggested) }))}
                                            >
                                                {formatTakaWithSymbol(row.suggested)}
                                            </button>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <Input
                                            value={amounts[row.payslip_id] ?? ''}
                                            disabled={row.withheld}
                                            inputMode="decimal"
                                            placeholder="0"
                                            onChange={(event) => setAmounts((current) => ({ ...current, [row.payslip_id]: event.target.value }))}
                                            className={cn(
                                                'ml-auto h-8 w-32 bg-white text-right text-xs font-mono font-medium border-slate-200',
                                                Number(amounts[row.payslip_id]) > 0 && 'border-emerald-500 ring-1 ring-emerald-500/20 text-emerald-950 font-bold'
                                            )}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bottom Action Footer */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>
                        <strong className="text-emerald-700 font-bold">{filled}</strong> will receive arrear ·{' '}
                        <strong className="text-slate-500">{blank}</strong> remaining blank
                    </span>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        className={cn('cursor-pointer shadow-sm font-semibold h-8.5 px-4 text-xs', payrollBtnPrimary)}
                        disabled={saving || visible.length === 0}
                        onClick={apply}
                    >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {saving ? 'Saving Adjustments…' : 'Save Arrear Adjustments'}
                    </Button>
                </div>
            </div>

            {errors?.rows && <p className="text-xs text-red-600">{errors.rows}</p>}
        </div>
    );
}
