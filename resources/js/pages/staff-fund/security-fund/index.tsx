import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { fundEligibilityDate, fundInterest, fundInterestStart, fundMoney, fundRequestKey, fundToday, type FundSnapshot } from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { actionClass, Errors, Exports, fieldClass, secondaryClass, Summary } from './components';

type Row = Partial<FundSnapshot> & { id: number; pin: string; name: string; branch: string; opened_on: string; review_required?: string };
type Option = { id: number; pin: string; name: string; branch: string; designation: string };
type Props = {
    accounts: { data: Row[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    summary: FundSnapshot & { account_count: number; review_count: number };
    asOf: string;
    filters: Record<string, string>;
    canCreate: boolean;
    canEdit: boolean;
    canExport: boolean;
    branches: { id: number; name: string }[];
    departments: { id: number; name: string }[];
};

export default function SecurityFundRegister({ accounts, summary, asOf, filters, canCreate, canExport, branches = [], departments = [] }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [options, setOptions] = useState<Option[]>([]);
    const [lookupError, setLookupError] = useState('');
    const filter = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
        employee_status: filters.employee_status ?? '',
        branch_id: filters.branch_id ?? '',
        department_id: filters.department_id ?? '',
        as_of: asOf,
    });
    const form = useForm({
        employee_id: '',
        amount: '',
        transaction_date: fundToday(),
        reference_no: '',
        notes: '',
        idempotency_key: fundRequestKey(),
    });
    useEffect(() => {
        if (!showCreate) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(`/security-fund/employees/lookup?search=${encodeURIComponent(employeeSearch)}`, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error('Employee lookup failed. Refresh or try again.');
                setOptions(await response.json());
                setLookupError('');
            } catch (error) {
                if (!controller.signal.aborted) setLookupError(error instanceof Error ? error.message : 'Lookup failed.');
            }
        }, 250);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [employeeSearch, showCreate]);

    return (
        <StaffFundLayout
            title="Security Fund"
            description="6% yearly on principal from 01 July 2026. One-year minimum; complete calendar months; whole-taka interest."
            activeTab="security-register"
        >
            <Summary values={summary} />
            {summary.review_count > 0 && (
                <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                    {summary.review_count} account(s) need review. Their amounts are excluded from totals until the dates are corrected.
                </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                    {accounts.total} accounts · As of {asOf}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Exports filters={{ ...filters, as_of: asOf }} canExport={canExport} />
                    <Link className={secondaryClass} href={staffFundPath('/security-fund/interest')}>
                        Interest preview
                    </Link>
                    {canCreate && (
                        <button className={actionClass} onClick={() => setShowCreate(true)}>
                            + Create
                        </button>
                    )}
                </div>
            </div>
            <form
                className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    filter.get(staffFundPath('/security-fund'));
                }}
            >
                <label className="min-w-48 flex-1 text-xs">
                    PIN / employee name
                    <input
                        className={fieldClass}
                        value={filter.data.search}
                        onChange={(e) => filter.setData('search', e.target.value)}
                        placeholder="Search employees"
                    />
                </label>
                <label className="text-xs">
                    Fund status
                    <select className={fieldClass} value={filter.data.status} onChange={(e) => filter.setData('status', e.target.value)}>
                        <option value="">All</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </select>
                </label>
                <label className="text-xs">
                    Employee status
                    <select
                        className={fieldClass}
                        value={filter.data.employee_status}
                        onChange={(e) => filter.setData('employee_status', e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </label>
                <label className="text-xs">
                    As of
                    <input
                        className={fieldClass}
                        type="date"
                        max={fundToday()}
                        value={filter.data.as_of}
                        onChange={(e) => filter.setData('as_of', e.target.value)}
                    />
                </label>
                <button className={secondaryClass}>Apply filters</button>
            </form>
            <div className="flex flex-wrap gap-3 rounded-lg border bg-white p-3">
                <label className="text-xs">
                    Branch
                    <select className={fieldClass} value={filter.data.branch_id} onChange={(e) => filter.setData('branch_id', e.target.value)}>
                        <option value="">All branches</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-xs">
                    Department
                    <select
                        className={fieldClass}
                        value={filter.data.department_id}
                        onChange={(e) => filter.setData('department_id', e.target.value)}
                    >
                        <option value="">All departments</option>
                        {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                                {department.name}
                            </option>
                        ))}
                    </select>
                </label>
                <button className={secondaryClass} onClick={() => filter.get(staffFundPath('/security-fund'))}>
                    Apply branch / department
                </button>
            </div>
            <Errors errors={filter.errors} />
            <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-600">
                        <tr>
                            {[
                                'PIN / Employee',
                                'Branch',
                                'Deposit date',
                                'Interest start',
                                'Principal',
                                'Interest payable',
                                'Total payable',
                                'Status',
                                '',
                            ].map((title, index) => (
                                <th key={index} className="p-3 whitespace-nowrap">
                                    {title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.data.map((row) => (
                            <tr key={row.id} className="border-t">
                                <td className="p-3">
                                    <span className="font-semibold">{row.name}</span>
                                    <p className="text-xs text-slate-500">{row.pin}</p>
                                </td>
                                <td className="p-3">{row.branch ?? '—'}</td>
                                <td className="p-3">{row.opened_on}</td>
                                <td className="p-3">
                                    {fundInterestStart(row.opened_on)}
                                    {row.next_eligibility_date && (
                                        <p className="text-xs text-amber-700">Next deposit qualifies {row.next_eligibility_date}</p>
                                    )}
                                </td>
                                {row.review_required ? (
                                    <td colSpan={3} className="p-3 text-amber-800">
                                        {row.review_required}
                                    </td>
                                ) : (
                                    <>
                                        <td className="p-3 font-mono">{fundMoney(row.principal)}</td>
                                        <td className="p-3 font-mono">{fundInterest(row.interest)}</td>
                                        <td className="p-3 font-mono font-semibold text-emerald-800">{fundMoney(row.total)}</td>
                                    </>
                                )}
                                <td className="p-3 capitalize">{row.status}</td>
                                <td className="p-3">
                                    <Link
                                        className="font-semibold text-emerald-700"
                                        href={staffFundPath(`/security-fund/${row.id}/ledger?as_of=${asOf}`)}
                                    >
                                        Ledger
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {!accounts.data.length && (
                            <tr>
                                <td colSpan={9} className="p-10 text-center text-slate-500">
                                    No Security Fund accounts found. Use Create to select an employee and record a deposit.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap gap-2">
                {accounts.links.map((link, index) => (
                    <button
                        key={index}
                        disabled={!link.url || link.active}
                        onClick={() => link.url && router.get(link.url)}
                        className={`${secondaryClass} disabled:opacity-40`}
                    >
                        {link.label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')}
                    </button>
                ))}
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Security Fund</DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(staffFundPath('/security-fund'), {
                                onSuccess: () => {
                                    setShowCreate(false);
                                    form.reset();
                                    form.setData('idempotency_key', fundRequestKey());
                                },
                            });
                        }}
                    >
                        <Errors errors={form.errors} />
                        <label className="block text-sm">
                            Find employee
                            <input
                                className={fieldClass}
                                value={employeeSearch}
                                onChange={(e) => {
                                    setEmployeeSearch(e.target.value);
                                    form.setData('employee_id', '');
                                }}
                                placeholder="Search by PIN or name"
                            />
                        </label>
                        {lookupError && (
                            <p role="alert" className="text-sm text-rose-700">
                                {lookupError}
                            </p>
                        )}
                        <label className="block text-sm">
                            Select employee
                            <select
                                className={fieldClass}
                                required
                                value={form.data.employee_id}
                                onChange={(e) => form.setData('employee_id', e.target.value)}
                            >
                                <option value="">Choose an employee</option>
                                {options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.pin} — {option.name} · {option.designation} · {option.branch}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <p className="text-xs text-slate-500">
                            Active employees without a Security Fund account are listed. Historical inactive deposits use the reviewed import.
                        </p>
                        <label className="block text-sm">
                            Deposit amount (৳)
                            <input
                                className={fieldClass}
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="99999999.99"
                                required
                                value={form.data.amount}
                                onChange={(e) => form.setData('amount', e.target.value)}
                            />
                        </label>
                        <label className="block text-sm">
                            Deposit date
                            <input
                                className={fieldClass}
                                type="date"
                                required
                                max={fundToday()}
                                value={form.data.transaction_date}
                                onChange={(e) => form.setData('transaction_date', e.target.value)}
                            />
                        </label>
                        <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">
                            Annual rate: <strong>6%</strong> · First full earning month starts{' '}
                            {form.data.transaction_date ? fundInterestStart(form.data.transaction_date) : '—'}. Eligible after one year:{' '}
                            {form.data.transaction_date ? fundEligibilityDate(form.data.transaction_date) : '—'}. On qualification, complete months
                            are counted retrospectively. Interest is rounded to whole taka and never compounds.
                        </p>
                        <label className="block text-sm">
                            Receipt / reference
                            <input
                                className={fieldClass}
                                required
                                maxLength={120}
                                value={form.data.reference_no}
                                onChange={(e) => form.setData('reference_no', e.target.value)}
                            />
                        </label>
                        <label className="block text-sm">
                            Notes / deposit evidence
                            <textarea
                                className={fieldClass}
                                required
                                maxLength={2000}
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                            />
                        </label>
                        <button className={actionClass} disabled={form.processing}>
                            Create account
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </StaffFundLayout>
    );
}
