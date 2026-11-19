import StaffFundLayout from '@/layouts/StaffFundLayout';
import { jsonCsrfHeaders } from '@/lib/csrf';
import { fundDisplayDate, fundMoney } from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { actionClass, Errors, fieldClass, secondaryClass } from './components';

type ImportRow = {
    row: number;
    pin: string;
    name: string;
    deposit_date: string;
    amount: string;
    employee_name: string | null;
    account_id: number | null;
    status: 'imported' | 'failed' | 'skipped';
    message: string;
};
type Props = {
    result: { id: string; filename: string; created_at: string; total: number; imported: number; failed: number; skipped: number } | null;
    rows: { data: ImportRow[]; total: number; links: { url: string | null; label: string; active: boolean }[] };
    status: string;
    canCreate: boolean;
    canEdit: boolean;
};

type Receipt = NonNullable<Props['result']> & { rows: ImportRow[] };

export default function SecurityFundExcelImport({ result: savedResult, rows: savedRows, status: savedStatus, canCreate, canEdit }: Props) {
    const fileInput = useRef<HTMLInputElement>(null);
    const feedbackRef = useRef<HTMLDivElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);
    const form = useForm<{ file: File | null }>({ file: null });
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [attempted, setAttempted] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [localStatus, setLocalStatus] = useState('all');
    const [localPage, setLocalPage] = useState(1);
    const result = receipt ?? (attempted ? null : savedResult);
    const status = receipt ? localStatus : savedStatus;
    const filtered = receipt?.rows.filter((row) => localStatus === 'all' || row.status === localStatus) ?? [];
    const rows = receipt ? { data: filtered.slice((localPage - 1) * 50, localPage * 50), total: filtered.length, links: [] } : savedRows;
    const resultPath = result ? `/security-fund/import/${result.id}` : '/security-fund/import';

    useEffect(() => {
        if (feedback || form.errors.file) feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [feedback, form.errors.file]);
    useEffect(() => {
        if (receipt) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [receipt]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setAttempted(true);
        setReceipt(null);
        setFeedback('');
        form.clearErrors();
        const file = form.data.file;
        if (!file) {
            form.setError('file', 'Select an Excel (.xlsx) file before importing.');
            return;
        }
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            form.setError('file', 'Only .xlsx files are supported. Save your file as Excel (.xlsx).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            form.setError('file', 'The Excel file must be no larger than 10 MB.');
            return;
        }
        setUploading(true);
        setProgress(0);
        const body = new FormData();
        body.append('file', file);
        try {
            const response = await axios.post(staffFundPath('/security-fund/import'), body, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...jsonCsrfHeaders() },
                timeout: 120000,
                onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0),
            });
            const received = response.data?.result as Receipt | undefined;
            if (
                !received ||
                typeof received.id !== 'string' ||
                !Array.isArray(received.rows) ||
                !Number.isInteger(received.total) ||
                received.total < 1 ||
                received.imported + received.failed + received.skipped !== received.total ||
                received.rows.length !== received.total
            ) {
                const redirected = String(response.request?.responseURL ?? '');
                throw new Error(
                    redirected.includes('/login')
                        ? 'Your session expired. Sign in again and retry.'
                        : redirected.includes('/error/403')
                          ? 'You do not have permission to import deposits. Contact your administrator.'
                          : 'The server did not return a complete import result. Check the last saved result before retrying.',
                );
            }
            setReceipt(received);
            setLocalStatus(received.failed > 0 ? 'failed' : 'all');
            setLocalPage(1);
            form.reset();
            if (fileInput.current) fileInput.current.value = '';
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const code = error.response?.status;
                if (code === 422) {
                    const values = Object.values(error.response?.data?.errors ?? {})
                        .flat()
                        .filter((value) => typeof value === 'string');
                    form.setError('file', values.join(' ') || 'The file could not be validated. Check the columns and file contents.');
                } else {
                    setFeedback(
                        code === 401 || code === 419
                            ? 'Your session expired. Refresh the page and sign in before retrying.'
                            : code === 403
                              ? 'You do not have permission to import Security Fund deposits. Contact your administrator.'
                              : code === 413
                                ? 'The server rejected this file because it is too large. Upload a smaller workbook.'
                                : code && code >= 500
                                  ? 'The server could not finish the import. Check the last saved result before retrying, or contact your administrator.'
                                  : 'The import connection failed or timed out. Some rows may have been recorded. Check the last saved result before retrying.',
                    );
                }
            } else setFeedback(error instanceof Error ? error.message : 'Import failed. Check the last saved result before retrying.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <StaffFundLayout
            title="Security Fund Excel Import"
            description="Match deposits to employees by PIN and review each row's result."
            activeTab="security-register"
        >
            <div className="flex flex-wrap gap-2">
                <Link className={secondaryClass} href={staffFundPath('/security-fund')}>
                    ← Register
                </Link>
                <a className={secondaryClass} href={staffFundPath('/security-fund/import/template')}>
                    Download Excel Template
                </a>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <p className="font-semibold">Required columns: PIN, Name, Deposit Date, Amount</p>
                <p className="mt-1">
                    Use the first worksheet. Keep PIN as Excel Text to preserve leading zeros. Dates can be YYYY-MM-DD, DD/MM/YYYY or native Excel
                    dates. Maximum 2,000 rows / 10 MB.
                </p>
                <p className="mt-1">
                    PIN determines the employee; Name is for reference. Matched rows import separately, so failed rows do not stop valid deposits.
                    Identical employee/date/amount deposits are skipped.
                </p>
                <p className="mt-1 text-xs">
                    {canCreate ? 'You can create new fund accounts.' : 'You cannot create new fund accounts.'}{' '}
                    {canEdit ? 'You can add deposits to existing accounts.' : 'Adding deposits to existing accounts requires edit permission.'} The
                    current one-year, full-month and 6% interest rules apply.
                </p>
            </div>
            <form noValidate className="space-y-3 rounded-lg border bg-white p-4" onSubmit={submit}>
                <div ref={feedbackRef}>
                    {(feedback || form.errors.file) && <h2 className="mb-2 font-semibold text-rose-800">Import failed — review the problem below</h2>}
                    <Errors errors={form.errors} />
                    {feedback && (
                        <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                            {feedback}
                        </p>
                    )}
                    {(feedback || form.errors.file) && (
                        <Link
                            className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline"
                            href={staffFundPath('/security-fund/import')}
                        >
                            Check last saved import result
                        </Link>
                    )}
                </div>
                <label className="block text-sm font-semibold">
                    Excel file (.xlsx)
                    <input
                        ref={fileInput}
                        className={`${fieldClass} mt-1 max-w-xl`}
                        type="file"
                        accept=".xlsx"
                        required
                        disabled={uploading}
                        onChange={(event) => form.setData('file', event.target.files?.[0] ?? null)}
                    />
                </label>
                <p className="text-xs text-slate-500">
                    Uploading records the valid deposits immediately. Existing employee names and previously paid funds are not overwritten.
                </p>
                <button className={actionClass} disabled={uploading}>
                    {uploading ? 'Importing deposits…' : 'Upload & Import'}
                </button>
                {uploading && (
                    <p role="status" className="text-sm text-slate-600">
                        {progress < 100 ? `Uploading ${progress}%` : 'Matching PINs and recording valid deposits. Please wait for the result.'}
                    </p>
                )}
            </form>
            {result && (
                <>
                    <div ref={resultRef} className="scroll-mt-6 rounded-lg border bg-white p-4">
                        <h2 className="font-semibold text-slate-900">Import result</h2>
                        <p
                            role={result.failed > 0 ? 'alert' : 'status'}
                            className={`mt-2 rounded border p-3 text-sm font-semibold ${result.imported === 0 && result.failed > 0 ? 'border-rose-200 bg-rose-50 text-rose-800' : result.failed > 0 || result.imported === 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
                        >
                            {result.imported === 0
                                ? `No deposits were imported. ${result.failed} failed; ${result.skipped} were already recorded (skipped).`
                                : `Imported ${result.imported} of ${result.total} deposits. ${result.failed} failed; ${result.skipped} skipped.`}
                            {result.failed > 0 ? ' Review the failed row reasons below.' : result.imported === 0 ? ' No new money was added.' : ''}
                        </p>
                        {receipt && (
                            <Link className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline" href={staffFundPath(resultPath)}>
                                Open saved result
                            </Link>
                        )}
                        <p className="mt-1 text-xs break-all text-slate-500">
                            {result.filename} · {new Date(result.created_at).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {(
                                [
                                    ['Total rows', result.total, 'text-slate-800'],
                                    ['Imported', result.imported, 'text-emerald-700'],
                                    ['Failed', result.failed, 'text-rose-700'],
                                    ['Skipped duplicates', result.skipped, 'text-amber-700'],
                                ] as const
                            ).map(([title, count, color]) => (
                                <div key={title} className="rounded border bg-slate-50 p-3">
                                    <p className="text-xs text-slate-500">{title}</p>
                                    <p className={`text-xl font-bold ${color}`}>{count}</p>
                                </div>
                            ))}
                        </div>
                        {result.failed > 0 && (
                            <a className={`${secondaryClass} mt-3`} href={staffFundPath(`${resultPath}/failures`)}>
                                Download Failed Rows (.xlsx)
                            </a>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm">
                            Show results
                            <select
                                className={fieldClass}
                                value={status}
                                onChange={(event) =>
                                    receipt
                                        ? (setLocalStatus(event.target.value), setLocalPage(1))
                                        : router.get(staffFundPath(resultPath), { status: event.target.value }, { preserveScroll: true })
                                }
                            >
                                <option value="all">All rows</option>
                                <option value="failed">Failed only</option>
                                <option value="imported">Imported only</option>
                                <option value="skipped">Skipped duplicates</option>
                            </select>
                        </label>
                        <p className="text-xs text-slate-500">{rows.total} matching rows</p>
                    </div>
                    <div className="overflow-x-auto rounded-lg border bg-white">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs text-slate-600">
                                <tr>
                                    {[
                                        'Excel row',
                                        'PIN',
                                        'Name in file',
                                        'Matched employee',
                                        'Deposit Date',
                                        'Amount',
                                        'Result',
                                        'Reason / Ledger',
                                    ].map((title) => (
                                        <th key={title} className="p-3 whitespace-nowrap">
                                            {title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.data.map((row) => (
                                    <tr key={row.row} className="border-t">
                                        <td className="p-3">{row.row}</td>
                                        <td className="p-3 font-mono whitespace-nowrap">{row.pin || '—'}</td>
                                        <td className="p-3">{row.name || '—'}</td>
                                        <td className="p-3">{row.employee_name ?? '—'}</td>
                                        <td className="p-3 whitespace-nowrap font-mono">{row.deposit_date ? fundDisplayDate(row.deposit_date) : '—'}</td>
                                        <td className="p-3 font-mono whitespace-nowrap">
                                            {row.status === 'failed' ? row.amount || '—' : fundMoney(row.amount)}
                                        </td>
                                        <td
                                            className={`p-3 font-semibold capitalize ${row.status === 'failed' ? 'text-rose-700' : row.status === 'imported' ? 'text-emerald-700' : 'text-amber-700'}`}
                                        >
                                            {row.status}
                                        </td>
                                        <td className="min-w-64 p-3 text-xs">
                                            <p>{row.message}</p>
                                            {row.account_id && (
                                                <Link
                                                    className="mt-1 inline-block font-semibold text-emerald-700"
                                                    href={staffFundPath(`/security-fund/${row.account_id}/ledger`)}
                                                >
                                                    Open ledger →
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {!rows.data.length && (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-500">
                                            No rows match this result filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {receipt && (
                            <>
                                <button className={secondaryClass} disabled={localPage === 1} onClick={() => setLocalPage((page) => page - 1)}>
                                    Previous
                                </button>
                                <span className="p-2 text-sm">
                                    Page {localPage} / {Math.max(1, Math.ceil(filtered.length / 50))}
                                </span>
                                <button
                                    className={secondaryClass}
                                    disabled={localPage * 50 >= filtered.length}
                                    onClick={() => setLocalPage((page) => page + 1)}
                                >
                                    Next
                                </button>
                            </>
                        )}
                        {rows.links.map((link, index) => (
                            <button
                                key={index}
                                disabled={!link.url || link.active}
                                onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                className={`${secondaryClass} disabled:opacity-40`}
                            >
                                {link.label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </StaffFundLayout>
    );
}
