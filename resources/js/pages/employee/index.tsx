import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Search,
    UserPlus,
    Upload,
    Download,
    MoreHorizontal,
    Edit,
    Trash,
    Check,
    X,
    Users,
    Eye,
    Filter
} from 'lucide-react';
import { MultiSelectFilter } from '@/components/MultiSelectFilter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { PageSurface } from '@/components/page-surface';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { employeeDisplayName, employeeInitials, type EmployeeNameFields } from '@/lib/employee-name';
import { format, parseISO, isValid } from 'date-fns';

interface Employee extends EmployeeNameFields {
    id: number;
    pin?: string;
    employee_id: string;
    status: 'active' | 'inactive' | 'on_leave' | 'terminated';
    confirmation_date?: string | null;
    employee_type?: { id: number; name: string } | null;
    employeeType?: { id: number; name: string } | null;
    photo: string | null;
    department: {
        id: number;
        name: string;
    };
    designation: {
        id: number;
        name: string;
    };
    branch: {
        id: number;
        name: string;
        branch_code?: string | null;
        is_head_office?: boolean;
        regional_office?: {
            id: number;
            name: string;
            code?: string | null;
            zone?: { id: number; name: string; code?: string | null } | null;
        } | null;
        regionalOffice?: {
            id: number;
            name: string;
            code?: string | null;
            zone?: { id: number; name: string; code?: string | null } | null;
        } | null;
    };
}

interface Department {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface EmployeeTypeOption {
    id: number;
    name: string;
}

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface EmployeeIndexProps {
    employees: {
        data: Employee[];
    } & PaginationData;
    departments: Department[];
    branches: Branch[];
    employee_types: EmployeeTypeOption[];
    designations: Designation[];
    filters: {
        search?: string;
        department_id?: string;
        department_ids?: number[] | string[];
        branch_id?: string;
        branch_ids?: number[] | string[];
        status?: string;
        statuses?: string[];
        employee_type_id?: string;
        employee_type_ids?: number[] | string[];
        designation_id?: string;
        designation_ids?: number[] | string[];
        per_page?: string;
        sort_by?: string;
        sort_dir?: string;
    };
    success?: string;
}

function normalizeIdFilter(
    plural: number[] | string[] | undefined,
    singular?: string | number | null
): string[] {
    if (Array.isArray(plural) && plural.length > 0) {
        return plural.map(String).filter(Boolean);
    }
    if (singular !== undefined && singular !== null && String(singular) !== '') {
        return [String(singular)];
    }
    return [];
}

function normalizeStringFilter(plural: string[] | undefined, singular?: string | null): string[] {
    if (Array.isArray(plural) && plural.length > 0) {
        return plural.map(String).filter(Boolean);
    }
    if (singular) {
        return [String(singular)];
    }
    return [];
}

function formatDisplayDate(value?: string | null): string {
    if (!value) return '—';
    const raw = String(value).trim();
    if (!raw) return '—';
    const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
    try {
        const date = parseISO(ymd);
        if (!isValid(date)) return '—';
        return format(date, 'dd MMM yyyy');
    } catch {
        return '—';
    }
}

const STATUS_FILTER_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'terminated', label: 'Terminated' },
];

export default function EmployeeIndex({
    employees,
    departments,
    branches,
    employee_types,
    designations,
    filters,
    success
}: EmployeeIndexProps) {
    const { data, setData, get, processing } = useForm({
        search: filters.search || '',
        department_ids: normalizeIdFilter(filters.department_ids, filters.department_id),
        branch_ids: normalizeIdFilter(filters.branch_ids, filters.branch_id),
        statuses: normalizeStringFilter(filters.statuses, filters.status),
        employee_type_ids: normalizeIdFilter(filters.employee_type_ids, filters.employee_type_id),
        designation_ids: normalizeIdFilter(filters.designation_ids, filters.designation_id),
        per_page: filters.per_page || '100',
        sort_by: filters.sort_by || 'organogram',
        sort_dir: filters.sort_dir || 'asc',
    });

    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [importStatus, setImportStatus] = useState('');

    const importForm = useForm<{
        file: File | null;
    }>({
        file: null,
    });

    const page = usePage() as any;
    const flashError = page?.props?.flash?.error as string | undefined;
    const flashSuccess = (page?.props?.flash?.success as string | undefined) || success;
    const importSummary = page?.props?.flash?.import_summary as
        | { created: number; skipped: number; branches?: { branch_id: number; branch_name: string; created: number }[] }
        | undefined;
    const importRowErrors = (page?.props?.flash?.import_row_errors as { row: number; errors: string[] }[] | undefined) ?? [];

    const hasActiveFilters = !!(
        data.department_ids.length > 0 ||
        data.branch_ids.length > 0 ||
        data.statuses.length > 0 ||
        data.employee_type_ids.length > 0 ||
        data.designation_ids.length > 0
    );

    const [showFilters, setShowFilters] = useState(
        !!(
            normalizeIdFilter(filters.department_ids, filters.department_id).length > 0 ||
            normalizeIdFilter(filters.branch_ids, filters.branch_id).length > 0 ||
            normalizeStringFilter(filters.statuses, filters.status).length > 0 ||
            normalizeIdFilter(filters.employee_type_ids, filters.employee_type_id).length > 0 ||
            normalizeIdFilter(filters.designation_ids, filters.designation_id).length > 0
        )
    );

    const buildFilterParams = (merged: typeof data): Record<string, string | string[]> => {
        const params: Record<string, string | string[]> = {};
        if (merged.search) params.search = merged.search;
        if (merged.department_ids.length > 0) params.department_ids = merged.department_ids;
        if (merged.branch_ids.length > 0) params.branch_ids = merged.branch_ids;
        if (merged.statuses.length > 0) params.statuses = merged.statuses;
        if (merged.employee_type_ids.length > 0) params.employee_type_ids = merged.employee_type_ids;
        if (merged.designation_ids.length > 0) params.designation_ids = merged.designation_ids;
        if (merged.per_page && merged.per_page !== '100') params.per_page = merged.per_page;
        if (merged.sort_by && merged.sort_by !== 'organogram') params.sort_by = merged.sort_by;
        if (merged.sort_dir && merged.sort_dir !== 'asc') params.sort_dir = merged.sort_dir;
        return params;
    };

    const applyFilters = (next: Partial<typeof data>) => {
        const merged = {
            ...data,
            ...next,
        };

        setData(merged);

        router.get(route('employees.index'), buildFilterParams(merged), { preserveState: true, replace: true });
    };

    const handleExportXlsx = () => {
        const params = new URLSearchParams();
        const filterParams = buildFilterParams(data);
        Object.entries(filterParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((v) => params.append(`${key}[]`, v));
            } else if (value) {
                params.set(key, value);
            }
        });
        const qs = params.toString();
        window.location.href = route('employees.export') + (qs ? `?${qs}` : '');
    };

    const toggleSort = (sortBy: 'id' | 'pin' | 'name' | 'status') => {
        const currentBy = (data as any).sort_by as string;
        const currentDir = (data as any).sort_dir as string;

        const nextDir =
            currentBy === sortBy ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc';

        applyFilters({ sort_by: sortBy, sort_dir: nextDir } as any);
    };

    const useOrganogramSort = () => {
        applyFilters({ sort_by: 'organogram', sort_dir: 'asc' } as any);
    };

    const isOrganogramSort = (data.sort_by || 'organogram') === 'organogram';

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({});
    };

    const handleDeleteEmployee = () => {
        if (!employeeToDelete) return;

        router.delete(route('employees.destroy', employeeToDelete.id), {
            onSuccess: () => {
                setEmployeeToDelete(null);
                // success টোস্ট বা মেসেজ দেখাতে চাইলে এখানে যোগ করুন
            },
            onError: (errors) => {
                console.error('Delete error:', errors);
                setEmployeeToDelete(null);
                // error টোস্ট বা মেসেজ দেখাতে চাইলে এখানে যোগ করুন
            }
        });
    };

    const handleClearFilters = () => {
        applyFilters({
            search: '',
            department_ids: [],
            branch_ids: [],
            statuses: [],
            employee_type_ids: [],
            designation_ids: [],
        });
    };

    const handleStatusChange = (employee: Employee, active: boolean) => {
        router.patch(
            route('employees.update-status', employee.id),
            { active },
            {
                preserveScroll: true,
                preserveState: true,
            }
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-800">Active</Badge>;
            case 'inactive':
                return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
            case 'on_leave':
                return <Badge className="bg-blue-100 text-blue-800">On Leave</Badge>;
            case 'terminated':
                return <Badge className="bg-red-100 text-red-800">Terminated</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
        }
    };

    return (
        <Layout>
            <Head title="Employee Management" />

            <PageSurface className="max-w-[96rem]">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
                        <p className="mt-1 text-gray-500">
                            Manage all employees across branches and departments
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={handleExportXlsx}
                        >
                            <Download className="h-4 w-4" />
                            <span>Download XLSX</span>
                        </Button>
                        <Dialog
                            open={importOpen}
                            onOpenChange={(open) => {
                                if (importForm.processing) return;
                                setImportOpen(open);
                                if (!open) {
                                    setImportStatus('');
                                    importForm.clearErrors();
                                    importForm.setData('file', null);
                                }
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    <span>Import Employees</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Import Employees</DialogTitle>
                                    <DialogDescription>
                                        Download the Excel template, fill employee data, then upload. You will review each row and fix branch, department, and designation before saving.
                                    </DialogDescription>
                                </DialogHeader>

                                <form
                                    className="space-y-4"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (!importForm.data.file) {
                                            importForm.setError('file', 'Please choose an Excel or CSV file.');
                                            return;
                                        }

                                        setImportStatus('Uploading file…');
                                        importForm.post(route('employees.import.preview'), {
                                            forceFormData: true,
                                            onStart: () => setImportStatus('Uploading file…'),
                                            onProgress: (event) => {
                                                if (!event?.percentage) return;
                                                if (event.percentage < 100) {
                                                    setImportStatus(`Uploading… ${Math.round(event.percentage)}%`);
                                                } else {
                                                    setImportStatus('Parsing Excel on server… please wait');
                                                }
                                            },
                                            onSuccess: () => {
                                                setImportStatus('Opening review page…');
                                            },
                                            onError: () => {
                                                setImportStatus('');
                                            },
                                            onFinish: () => {
                                                // If redirect did not navigate away, keep dialog open with status cleared by onError/success
                                            },
                                        });
                                    }}
                                >
                                    <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                                        <div className="text-sm text-muted-foreground">
                                            Professional Excel template with grouped headers, Bengali labels, and reference data.
                                        </div>
                                        <a
                                            href={route('employees.import.example')}
                                            className="text-sm font-medium text-primary hover:underline"
                                        >
                                            Download Excel template
                                        </a>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="importFile">Excel or CSV file</Label>
                                        <Input
                                            id="importFile"
                                            type="file"
                                            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            disabled={importForm.processing}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0] ?? null;
                                                importForm.setData('file', f);
                                                setImportStatus('');
                                                importForm.clearErrors('file');
                                            }}
                                        />
                                        <InputError message={importForm.errors.file as any} />
                                    </div>

                                    {importStatus && (
                                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                                            {importStatus}
                                        </div>
                                    )}

                                    {importForm.processing && (
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                                            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
                                        </div>
                                    )}

                                    <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                                        Required: PIN, name, employment type, mobile, joining date, department, designation, branch.
                                        Use the Excel template (row 3 = field keys). Email is optional. Next step: review and confirm.
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setImportOpen(false)}
                                            disabled={importForm.processing}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={importForm.processing || !importForm.data.file}>
                                            {importForm.processing ? 'Working…' : 'Upload & Review'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Link href={route('employees.create')}>
                            <Button className="flex items-center gap-1">
                                <UserPlus className="h-4 w-4" />
                                <span>Add Employee</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {flashSuccess && (
                    <Alert className="mb-6 bg-green-50 border-green-200">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">{flashSuccess}</AlertDescription>
                    </Alert>
                )}

                {flashError && (
                    <Alert className="mb-6 border-red-200 bg-red-50">
                        <X className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">{flashError}</AlertDescription>
                    </Alert>
                )}

                {importSummary && (
                    <Alert className="mb-6 bg-blue-50 border-blue-200">
                        <AlertDescription className="text-blue-800">
                            <div className="font-medium">
                                Import summary: Created {importSummary.created}, skipped {importSummary.skipped}.
                            </div>
                            {importSummary.branches && importSummary.branches.length > 0 && (
                                <div className="mt-2 text-sm">
                                    <div className="font-medium">Branch-wise created</div>
                                    <ul className="mt-1 list-disc pl-5">
                                        {importSummary.branches.slice(0, 10).map((b) => (
                                            <li key={b.branch_id}>
                                                {b.branch_name}: {b.created}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {importRowErrors.length > 0 && (
                                <div className="mt-2 text-sm">
                                    <div className="font-medium">Row errors</div>
                                    <ul className="mt-1 list-disc pl-5">
                                        {importRowErrors.slice(0, 10).map((re) => (
                                            <li key={re.row}>
                                                Row {re.row}: {re.errors.join(', ')}
                                            </li>
                                        ))}
                                    </ul>
                                    {importRowErrors.length > 10 && (
                                        <div className="mt-1 text-xs text-blue-700">
                                            Showing 10 of {importRowErrors.length} errors.
                                        </div>
                                    )}
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-white border-b border-slate-100 pb-5 pt-6 px-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <CardTitle className="text-lg font-bold text-slate-800 tracking-wide">
                                Employees Directory
                                {isOrganogramSort && (
                                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                        · Organogram order
                                    </span>
                                )}
                            </CardTitle>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant={isOrganogramSort ? 'default' : 'outline'}
                                    size="sm"
                                    className={`h-9 text-xs ${isOrganogramSort ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                    onClick={useOrganogramSort}
                                >
                                    Organogram
                                </Button>
                                <form onSubmit={handleSearch} className="flex items-center">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="search"
                                            name="search"
                                            placeholder="Search employees..."
                                            value={data.search}
                                            onChange={e => setData('search', e.target.value)}
                                            className="pl-9 h-9 w-[220px] md:w-[300px] text-sm bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        className="ml-2 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                                        disabled={processing}
                                    >
                                        Search
                                    </Button>
                                </form>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`h-9 w-9 rounded-lg border-slate-200 transition-colors ${showFilters ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {showFilters && (
                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                <div>
                                    <MultiSelectFilter
                                        values={data.department_ids}
                                        onChange={(values) => applyFilters({ department_ids: values })}
                                        items={departments.map((d) => ({
                                            value: String(d.id),
                                            label: d.name,
                                        }))}
                                        placeholder="Filter by Department"
                                        allLabel="All Departments"
                                        disabled={processing}
                                    />
                                </div>

                                <div>
                                    <MultiSelectFilter
                                        values={data.branch_ids}
                                        onChange={(values) => applyFilters({ branch_ids: values })}
                                        items={sortPayrollBranches(branches).map((branch) => ({
                                            value: String(branch.id),
                                            label: formatBranchSelectLabel(branch),
                                        }))}
                                        placeholder="Filter by Branch"
                                        allLabel="All Branches"
                                        disabled={processing}
                                    />
                                </div>

                                <div>
                                    <MultiSelectFilter
                                        values={data.statuses}
                                        onChange={(values) => applyFilters({ statuses: values })}
                                        items={STATUS_FILTER_OPTIONS}
                                        placeholder="Filter by Status"
                                        allLabel="All Statuses"
                                        disabled={processing}
                                    />
                                </div>

                                <div>
                                    <MultiSelectFilter
                                        values={data.designation_ids}
                                        onChange={(values) => applyFilters({ designation_ids: values })}
                                        items={designations.map((d) => ({
                                            value: String(d.id),
                                            label: d.name,
                                        }))}
                                        placeholder="Filter by Designation"
                                        allLabel="All Designations"
                                        disabled={processing}
                                    />
                                </div>

                                <div>
                                    <MultiSelectFilter
                                        values={data.employee_type_ids}
                                        onChange={(values) => applyFilters({ employee_type_ids: values })}
                                        items={employee_types.map((type) => ({
                                            value: String(type.id),
                                            label: type.name,
                                        }))}
                                        placeholder="Filter by Employee Type"
                                        allLabel="All Employee Types"
                                        disabled={processing}
                                    />
                                </div>

                                <div className="flex items-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearFilters}
                                        disabled={processing}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">
                                            <button
                                                type="button"
                                                onClick={() => toggleSort('name')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900"
                                            >
                                                Employee <ArrowUpDown className="h-3.5 w-3.5" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">
                                            <button
                                                type="button"
                                                onClick={() => toggleSort('pin')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900"
                                            >
                                                PIN <ArrowUpDown className="h-3.5 w-3.5" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Department</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Branch</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Employee Type</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider whitespace-nowrap">Confirmation</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">
                                            <button
                                                type="button"
                                                onClick={() => toggleSort('status')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900"
                                            >
                                                Status <ArrowUpDown className="h-3.5 w-3.5" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Users className="h-8 w-8 text-gray-400" />
                                                    <h3 className="mt-2 text-lg font-medium text-gray-900">No Employees Found</h3>
                                                    <p className="mt-1 text-gray-500">
                                                        {data.search || hasActiveFilters
                                                            ? 'Try different search filters'
                                                            : 'Get started by adding a new employee'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        employees.data.map((employee) => (
                                            <TableRow
                                                key={employee.id}
                                                className="hover:bg-slate-50 transition-colors border-b border-slate-100 group"
                                            >
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center space-x-3">
                                                        <Avatar className="h-9 w-9">
                                                            {employee.photo ? (
                                                                <AvatarImage src={`/storage/${employee.photo}`} alt={employeeDisplayName(employee)} />
                                                            ) : (
                                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                                    {employeeInitials(employee)}
                                                                </AvatarFallback>
                                                            )}
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-semibold text-[13px] text-slate-800">
                                                                {employeeDisplayName(employee)}
                                                            </div>
                                                            <div className="text-[12px] font-medium text-emerald-600/90 mt-0.5">
                                                                {employee.designation.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[13px] text-slate-600 font-medium">{employee.pin || employee.employee_id}</TableCell>
                                                <TableCell className="text-[13px] text-slate-600">{employee.department.name}</TableCell>
                                                <TableCell className="text-[13px] text-slate-600">{employee.branch.name}</TableCell>
                                                <TableCell className="text-[13px] text-slate-600">
                                                    {employee.employee_type?.name || employee.employeeType?.name || '—'}
                                                </TableCell>
                                                <TableCell className="text-[13px] text-slate-600 whitespace-nowrap">
                                                    {formatDisplayDate(employee.confirmation_date)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={employee.status === 'active'}
                                                            onCheckedChange={(checked) =>
                                                                handleStatusChange(employee, checked)
                                                            }
                                                            aria-label="Toggle employee active status"
                                                        />
                                                        <span
                                                            className={
                                                                employee.status === 'active'
                                                                    ? 'text-[13px] font-medium text-emerald-600'
                                                                    : 'text-[13px] text-slate-500'
                                                            }
                                                        >
                                                            {employee.status === 'active' ? 'Active' : 'Inactive'}
                                                        </span>
                                                        {employee.status !== 'active' &&
                                                            employee.status !== 'inactive' && (
                                                                <span className="ml-1">
                                                                    {getStatusBadge(employee.status)}
                                                                </span>
                                                            )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                        <Link href={route('employees.show', employee.id)}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" title="View Details">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Link href={route('employees.edit', employee.id)}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" title="Edit Employee">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                            title="Delete Employee"
                                                            onClick={() => setEmployeeToDelete(employee)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination — use Laravel `link.url` (correct page + query string); never `i + 1` (wrong for ellipses). */}
                        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                    <span className="hidden sm:inline">Rows per page:</span>
                                    <Select
                                        value={data.per_page}
                                        onValueChange={(value) => applyFilters({ per_page: value })}
                                    >
                                        <SelectTrigger className="h-8 w-[70px] text-[13px] bg-white border-slate-200">
                                            <SelectValue placeholder="10" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                            <SelectItem value="200">200</SelectItem>
                                            <SelectItem value="500">500</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-[13px] text-slate-500">
                                        Showing <span className="font-semibold text-slate-700">{employees.total > 0 ? (employees.current_page - 1) * employees.per_page + 1 : 0}</span> to{' '}
                                        <span className="font-semibold text-slate-700">
                                            {Math.min(employees.current_page * employees.per_page, employees.total)}
                                        </span>{' '}
                                        of <span className="font-semibold text-slate-700">{employees.total}</span> entries
                                    </p>
                                </div>
                            </div>

                            {employees.last_page > 1 && (
                                <div className="flex items-center justify-end">
                                    <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                        {employees.current_page > 1 && employees.links[0]?.url ? (
                                            <Link
                                                href={employees.links[0].url}
                                                preserveState
                                                className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
                                            >
                                                <span className="sr-only">Previous</span>
                                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                            </Link>
                                        ) : null}

                                        {employees.links.slice(1, -1).map((link, i) => {
                                            const isActive = link.active;
                                            const isDots = link.label === '...';

                                            if (isDots) {
                                                return (
                                                    <span
                                                        key={i}
                                                        className="relative inline-flex h-8 w-8 items-center justify-center text-[13px] font-medium text-slate-400"
                                                    >
                                                        ...
                                                    </span>
                                                );
                                            }

                                            if (isActive && !link.url) {
                                                return (
                                                    <span
                                                        key={i}
                                                        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600 bg-emerald-600 text-[13px] font-semibold text-white shadow-sm"
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            }

                                            return (
                                                <Link
                                                    key={i}
                                                    href={link.url || '#'}
                                                    preserveState
                                                    className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm transition-all duration-200 ${
                                                        isActive
                                                            ? 'z-10 border border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                                            : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        })}

                                        {employees.current_page < employees.last_page &&
                                        employees.links[employees.links.length - 1]?.url ? (
                                            <Link
                                                href={employees.links[employees.links.length - 1].url!}
                                                preserveState
                                                className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
                                            >
                                                <span className="sr-only">Next</span>
                                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                            </Link>
                                        ) : null}
                                    </nav>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </PageSurface>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the employee record for{' '}
                            <span className="font-medium text-gray-900">
                                {employeeDisplayName(employeeToDelete ?? undefined)}
                            </span>
                            . This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteEmployee}
                            className="bg-destructive text-gray-50 hover:bg-destructive/50"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
