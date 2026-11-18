import { PayrollComboField } from '@/components/payroll/PayrollFilterGrid';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Layout from '@/layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { adviceBase, type BankAdvice, type Signatory } from './types';

type FormValues = {
    year: string;
    month: string;
    branch_id: string;
    project_id: string;
    reference_prefix: string;
    reference_year: string;
    reference_number: string;
    issue_date: string;
    bank_name: string;
    bank_branch: string;
    bank_address: string;
    account_no: string;
    account_type: string;
    account_name: string;
    signatories: Signatory[];
    save_defaults: boolean;
    include_account_list: boolean;
};
type Props = {
    advice: BankAdvice | null;
    initial: Omit<FormValues, 'save_defaults'>;
    periods: { year: number; month: number }[];
    branches: { id: number; name: string; branch_code: string }[];
    projects: { id: number; name: string }[];
    employees: { id: number; name: string; pin: string; designation: string }[];
};

export default function BankAdviceForm({ advice, initial, periods, branches, projects, employees }: Props) {
    const emptySigner = (): Signatory => ({ employee_id: '', name: '', designation: '', organization: initial.account_name || 'MOUSUMI' });
    const form = useForm<FormValues>({
        ...initial,
        year: String(initial.year),
        month: String(initial.month),
        branch_id: String(initial.branch_id ?? ''),
        project_id: String(initial.project_id ?? ''),
        signatories: Array.from({ length: 3 }, (_, index) => ({
            ...emptySigner(),
            ...initial.signatories[index],
            employee_id: String(initial.signatories[index]?.employee_id ?? ''),
        })),
        save_defaults: false,
        include_account_list: Boolean(initial.include_account_list),
    });
    const errors = form.errors as Record<string, string | undefined>;
    const setSigner = (index: number, updates: Partial<Signatory>) =>
        form.setData(
            'signatories',
            form.data.signatories.map((signer, i) => (i === index ? { ...signer, ...updates } : signer)),
        );
    const field = (key: Exclude<keyof FormValues, 'signatories' | 'save_defaults' | 'include_account_list'>, label: string, type = 'text') => (
        <label className="block text-xs font-medium">
            {label}
            <Input type={type} value={form.data[key] ?? ''} onChange={(event) => form.setData(key, event.target.value)} className="mt-1" />
            {errors[key] && <span className="mt-1 block text-red-600">{errors[key]}</span>}
        </label>
    );
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (advice) form.put(`${adviceBase}/${advice.id}`);
        else form.post(adviceBase);
    };

    return (
        <Layout>
            <Head title={advice ? 'Edit Bank Advice' : 'Generate Bank Advice'} />
            <PayrollPage>
                <PayrollPageHeader
                    title={advice ? 'Edit Bank Advice' : 'Generate Bank Advice'}
                    description="Select a posted salary month, check the bank information and set up to three signatories."
                >
                    <Button asChild variant="outline">
                        <Link href={advice ? `${adviceBase}/${advice.id}` : adviceBase}>Back</Link>
                    </Button>
                </PayrollPageHeader>
                <form onSubmit={submit} className="space-y-4">
                    <PayrollSectionCard
                        title="Salary month"
                        description={
                            advice
                                ? 'The saved salary accounts and amounts are retained. Generate a new advice to use revised payroll.'
                                : 'Accounts and amounts come from posted payroll. Employees with missing bank accounts must be updated before generation.'
                        }
                    >
                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="text-xs font-medium">
                                Salary month
                                <select
                                    disabled={Boolean(advice)}
                                    className="mt-1 block h-9 w-full rounded-md border bg-white px-3 text-sm disabled:bg-slate-50"
                                    value={`${form.data.year}-${form.data.month}`}
                                    onChange={(event) => {
                                        const [year, month] = event.target.value.split('-');
                                        form.setData((data) => ({ ...data, year, month }));
                                    }}
                                >
                                    {advice && <option value={`${advice.year}-${advice.month}`}>{advice.salary_month}</option>}
                                    {!advice && periods.length === 0 && (
                                        <option value={`${form.data.year}-${form.data.month}`}>No posted salary months</option>
                                    )}
                                    {!advice &&
                                        periods.map((period) => (
                                            <option key={`${period.year}-${period.month}`} value={`${period.year}-${period.month}`}>
                                                {new Date(period.year, period.month - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' })}
                                            </option>
                                        ))}
                                </select>
                                {errors.month && <span className="mt-1 block text-red-600">{errors.month}</span>}
                                {errors.year && <span className="mt-1 block text-red-600">{errors.year}</span>}
                            </label>
                            <PayrollComboField
                                label="Branch"
                                disabled={Boolean(advice)}
                                value={form.data.branch_id}
                                onChange={(value) => form.setData('branch_id', value)}
                                items={[
                                    { value: '', label: 'All branches' },
                                    ...branches.map((branch) => ({ value: String(branch.id), label: `${branch.name} (${branch.branch_code})` })),
                                ]}
                            />
                            <PayrollComboField
                                label="Project"
                                disabled={Boolean(advice)}
                                value={form.data.project_id}
                                onChange={(value) => form.setData('project_id', value)}
                                items={[
                                    { value: '', label: 'All projects' },
                                    ...projects.map((project) => ({ value: String(project.id), label: project.name })),
                                ]}
                            />
                        </div>
                        {errors.branch_id && <p className="text-xs text-red-600">{errors.branch_id}</p>}
                        {errors.project_id && <p className="text-xs text-red-600">{errors.project_id}</p>}
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Reference and issue date">
                        <div className="grid gap-4 md:grid-cols-4">
                            {field('reference_prefix', 'Reference prefix')}
                            {field('reference_year', 'Reference year')}
                            {field('reference_number', 'Reference number')}
                            {field('issue_date', 'Issue date', 'date')}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            Ref: {form.data.reference_prefix}/{form.data.reference_year}/{form.data.reference_number}
                        </p>
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Bank letter details">
                        <div className="grid gap-4 md:grid-cols-3">
                            {field('bank_name', 'Bank name')}
                            {field('bank_branch', 'Bank branch')}
                            {field('bank_address', 'Bank address')}
                            {field('account_no', 'Debit account number')}
                            {field('account_type', 'Account type (CD / Current / Savings)')}
                            {field('account_name', 'Account holder / organization')}
                        </div>
                    </PayrollSectionCard>
                    <PayrollSectionCard
                        title="Signatories"
                        description="Select an employee to fill their name and designation automatically. You can edit the text, or leave an optional signatory blank."
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            {form.data.signatories.map((signer, index) => (
                                <div key={index} className="space-y-3 rounded-lg border p-4">
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span>Signatory {index + 1}</span>
                                        <button type="button" className="text-xs text-slate-500" onClick={() => setSigner(index, emptySigner())}>
                                            Clear
                                        </button>
                                    </div>
                                    <PayrollComboField
                                        label="Employee"
                                        value={signer.employee_id}
                                        onChange={(value) => {
                                            const employee = employees.find((item) => String(item.id) === value);
                                            setSigner(
                                                index,
                                                employee
                                                    ? { employee_id: value, name: employee.name, designation: employee.designation }
                                                    : { employee_id: '' },
                                            );
                                        }}
                                        items={[
                                            { value: '', label: 'Enter manually / optional' },
                                            ...employees.map((employee) => ({
                                                value: String(employee.id),
                                                label: `${employee.name} (${employee.pin}) - ${employee.designation}`,
                                            })),
                                        ]}
                                    />
                                    {(['name', 'designation', 'organization'] as const).map((key) => (
                                        <label key={key} className="block text-xs capitalize">
                                            {key}
                                            <Input
                                                className="mt-1"
                                                value={signer[key] ?? ''}
                                                onChange={(event) => setSigner(index, { [key]: event.target.value })}
                                            />
                                            {errors[`signatories.${index}.${key}`] && (
                                                <span className="text-red-600">{errors[`signatories.${index}.${key}`]}</span>
                                            )}
                                        </label>
                                    ))}
                                    {errors[`signatories.${index}.employee_id`] && (
                                        <p className="text-xs text-red-600">{errors[`signatories.${index}.employee_id`]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                        {errors.signatories && <p className="mt-3 text-xs text-red-600">{errors.signatories}</p>}
                    </PayrollSectionCard>
                    <PayrollSectionCard title="Document options">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.include_account_list}
                                onChange={(event) => form.setData('include_account_list', event.target.checked)}
                            />
                            Include Salary Transfer Account List
                        </label>
                        <p className="mt-2 text-xs text-slate-500">
                            Check this to save the advice with the full account list in its preview, print and PDF.
                        </p>
                        {errors.include_account_list && <p className="mt-1 text-xs text-red-600">{errors.include_account_list}</p>}
                    </PayrollSectionCard>
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.save_defaults}
                                onChange={(event) => form.setData('save_defaults', event.target.checked)}
                            />
                            Use these bank details and signatories by default
                        </label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.processing}
                                onClick={() => form.post(`${adviceBase}/defaults`, { preserveScroll: true })}
                            >
                                Save defaults only
                            </Button>
                            <Button type="submit" disabled={form.processing || (!advice && periods.length === 0)}>
                                {form.processing ? 'Saving...' : advice ? 'Save changes' : 'Generate and save advice'}
                            </Button>
                        </div>
                    </div>
                </form>
            </PayrollPage>
        </Layout>
    );
}
