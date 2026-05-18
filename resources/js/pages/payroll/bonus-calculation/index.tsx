import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollField,
    PayrollFilterGrid,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { PayrollFormActions, PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { DISPLAY_DATE_FMT, parseFormDateValue } from '@/lib/display-date';
import { Award, ChevronRight } from 'lucide-react';

type ConfigOption = {
    id: number;
    label: string;
    basic_percentage: number;
};

type Props = {
    filters: Record<string, string>;
    configurations: ConfigOption[];
    recentRuns: { id: number; label: string; status: string; employee_count: number; total_net: number; processed_at: string | null }[];
    branches: { id: number; name: string; branch_code?: string | null }[];
    departments: { id: number; name: string }[];
    designations: { id: number; name: string }[];
    programs: { id: number; name: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    months: { value: number; label: string }[];
    years: number[];
    canProcess?: boolean;
};

function flattenErrors(err: Record<string, string | undefined>): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(err)) {
        if (!v) continue;
        out.push(`${k.replace(/_/g, ' ')}: ${v}`);
    }
    return out;
}

export default function BonusCalculationIndex({ filters: init, configurations, recentRuns, canProcess = false, ...options }: Props) {
    const { errors: pageErrors = {}, flash } = usePage<{
        errors?: Record<string, string>;
        flash?: { success?: string; error?: string; info?: string };
    }>().props;

    const [filters, setFilters] = useState({
        bonus_configuration_id: String(init.bonus_configuration_id || ''),
        branch_id: String(init.branch_id || ''),
        department_id: String(init.department_id || ''),
        designation_id: String(init.designation_id || ''),
        program_id: String(init.program_id || ''),
        project_id: String(init.project_id || ''),
        employee_id: String(init.employee_id || ''),
        year: String(init.year || new Date().getFullYear()),
        month: String(init.month || ''),
        process_date: String(init.process_date || format(new Date(), DISPLAY_DATE_FMT)),
    });
    const [processing, setProcessing] = useState(false);
    const [clientErrors, setClientErrors] = useState<string[]>([]);

    const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

    const selectedConfig = useMemo(
        () => configurations.find((c) => String(c.id) === filters.bonus_configuration_id),
        [configurations, filters.bonus_configuration_id],
    );

    const allErrors = useMemo(() => flattenErrors(pageErrors), [pageErrors]);

    const validateClient = (): string[] => {
        const msgs: string[] = [];
        if (!filters.bonus_configuration_id) msgs.push('Select a bonus configuration.');
        if (!filters.month) msgs.push('Select a month (must match configuration period).');
        if (!filters.year) msgs.push('Select a year.');
        if (!filters.process_date?.trim()) msgs.push('Select a calculation date.');
        if (!canProcess) msgs.push('Your account needs Payroll Edit permission to run bonus calculation.');
        return msgs;
    };

    const runProcess = () => {
        const client = validateClient();
        if (client.length) {
            setClientErrors(client);
            return;
        }
        setClientErrors([]);
        setProcessing(true);
        router.post(route('bonus-calculation.process'), filters, {
            preserveScroll: true,
            onError: (errs) => setClientErrors(flattenErrors(errs as Record<string, string>)),
            onSuccess: () => setClientErrors([]),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Layout>
            <Head title="Bonus calculation" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Award}
                    title="Bonus calculation"
                    description="Calculate bonus from an active configuration. Review and post in Salary Post."
                />

                {(flash?.success || flash?.error || flash?.info) && (
                    <Alert className={`mb-4 ${flash.error ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                        {flash.success && <><AlertTitle>Success</AlertTitle><AlertDescription>{flash.success}</AlertDescription></>}
                        {flash.error && <><AlertTitle>Error</AlertTitle><AlertDescription>{flash.error}</AlertDescription></>}
                        {flash.info && <AlertDescription>{flash.info}</AlertDescription>}
                    </Alert>
                )}

                {(clientErrors.length > 0 || allErrors.length > 0) && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Cannot run calculation</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-4">
                                {[...clientErrors, ...allErrors].map((m) => <li key={m}>{m}</li>)}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Bonus setup" className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <PayrollComboField
                                label="Bonus configuration"
                                required
                                value={filters.bonus_configuration_id}
                                onChange={(v) => setFilter('bonus_configuration_id', v)}
                                items={[
                                    { value: '', label: 'Select configuration', disabled: true },
                                    ...configurations.map((c) => ({
                                        value: String(c.id),
                                        label: c.label,
                                    })),
                                ]}
                                placeholder="Search configuration…"
                            />
                            {configurations.length === 0 && (
                                <p className="mt-1 text-xs text-amber-700">
                                    No active configurations. <Link href={route('bonus-configurations.create')} className="underline">Create one</Link> first.
                                </p>
                            )}
                        </div>
                        {selectedConfig && (
                            <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-sm">
                                <p className="font-medium text-violet-900">Selected configuration</p>
                                <p className="mt-1 text-xs text-violet-800">
                                    {Number(selectedConfig.basic_percentage).toLocaleString()}% of basic salary
                                </p>
                            </div>
                        )}
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Period & filters" className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PayrollBranchSelect
                            label="Branch"
                            branches={options.branches}
                            value={filters.branch_id}
                            onChange={(v) => setFilter('branch_id', v)}
                            allowAll
                            allLabel="All branches"
                        />
                        <PayrollYearSelect
                            value={filters.year}
                            onChange={(v) => setFilter('year', v)}
                            years={options.years}
                            required
                        />
                        <PayrollMonthSelect
                            value={filters.month}
                            onChange={(v) => setFilter('month', v)}
                            months={options.months}
                            required
                        />
                        <PayrollField label="Calculation date *" required>
                            <DatePicker
                                value={parseFormDateValue(filters.process_date)}
                                onChange={(d) => setFilter('process_date', d ? format(d, DISPLAY_DATE_FMT) : '')}
                            />
                        </PayrollField>
                    </div>
                    <PayrollFilterGrid
                        filters={filters}
                        setFilter={setFilter}
                        branches={options.branches}
                        departments={options.departments}
                        designations={options.designations}
                        programs={options.programs}
                        projects={options.projects}
                        employees={options.employees}
                        showBranch={false}
                    />
                    <PayrollFormActions className="mt-4">
                        <Button onClick={runProcess} disabled={processing || !canProcess}>
                            {processing ? 'Calculating…' : 'Calculate bonus'}
                        </Button>
                    </PayrollFormActions>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Only active employees with payscale, grade, and step are included. Configuration payscale/grade scope is applied automatically.
                    </p>
                </PayrollSectionCard>

                {recentRuns.length > 0 && (
                    <PayrollSectionCard title="Recent bonus runs">
                        <ul className="divide-y divide-slate-100">
                            {recentRuns.map((r) => (
                                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                                    <div>
                                        <p className="text-sm font-medium">{r.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {r.employee_count} employees · Net ৳{r.total_net.toLocaleString()}
                                            {r.processed_at ? ` · ${r.processed_at}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={r.status === 'posted' ? 'default' : 'secondary'}>{r.status}</Badge>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={route('bonus-post.show', r.id)}>
                                                Review <ChevronRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </PayrollSectionCard>
                )}
            </PayrollPage>
        </Layout>
    );
}
