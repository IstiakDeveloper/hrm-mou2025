import InputError from '@/components/input-error';
import { MultiSelectFilter } from '@/components/MultiSelectFilter';
import { PageSurface } from '@/components/page-surface';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Layout from '@/layouts/AdminLayout';
import { employeeDisplayName, employeeInitials, type EmployeeNameFields } from '@/lib/employee-name';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { format, isValid, parseISO } from 'date-fns';
import {
    ArrowUpDown,
    CalendarClock,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Download,
    Edit,
    Eye,
    Filter,
    Layers,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Trash,
    Upload,
    UserCheck,
    UserPlus,
    Users,
    UserX,
    X,
} from 'lucide-react';
import React, { useState } from 'react';

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

interface Project {
    id: number;
    name: string;
    code?: string | null;
}

interface Branch {
    id: number;
    name: string;
}

interface EmployeeTypeOption {
    id: number;
    name: string;
}

interface EmployeeExportColumn {
    key: string;
    label: string;
    group: string;
    group_label: string;
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

interface EmployeeStats {
    total: number;
    active: number;
    on_leave: number;
    inactive: number;
    core?: number;
    project?: number;
    active_core?: number;
    active_project?: number;
}

interface EmployeeIndexProps {
    employees: {
        data: Employee[];
    } & PaginationData;
    stats?: EmployeeStats;
    departments: Department[];
    branches: Branch[];
    employee_types: EmployeeTypeOption[];
    designations: Designation[];
    projects?: Project[];
    export_columns: EmployeeExportColumn[];
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
        project_id?: string;
        project_ids?: number[] | string[];
        gender?: string;
        genders?: string[];
        per_page?: string;
        sort_by?: string;
        sort_dir?: string;
    };
    success?: string;
}

function normalizeIdFilter(plural: number[] | string[] | undefined, singular?: string | number | null): string[] {
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

const GENDER_FILTER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: '__null', label: 'Not Assigned' },
];

const NOT_ASSIGNED_ITEM = { value: '__null', label: '— Not Assigned —' };

/**
 * Compact circular radial progress ring component
 */
function CircularProgressRing({
    percentage,
    size = 42,
    strokeWidth = 3.5,
    strokeColor = 'stroke-emerald-500',
    trackColor = 'stroke-slate-200 dark:stroke-slate-700',
    textColor = 'text-slate-800 dark:text-slate-100',
}: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    strokeColor?: string;
    trackColor?: string;
    textColor?: string;
}) {
    const clamped = Math.min(100, Math.max(0, isNaN(percentage) ? 0 : percentage));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clamped / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center shrink-0 select-none" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className={`${trackColor}`}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`${strokeColor} transition-all duration-700 ease-out`}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[10px] font-black tracking-tight ${textColor}`}>
                    {clamped >= 100 ? '100%' : clamped <= 0 ? '0%' : `${clamped.toFixed(clamped < 10 && clamped > 0 ? 1 : 0)}%`}
                </span>
            </div>
        </div>
    );
}

export default function EmployeeIndex({
    employees,
    stats,
    departments,
    branches,
    employee_types,
    designations,
    projects = [],
    export_columns,
    filters,
    success,
}: EmployeeIndexProps) {
    const { data, setData, processing } = useForm({
        search: filters.search || '',
        department_ids: normalizeIdFilter(filters.department_ids, filters.department_id),
        branch_ids: normalizeIdFilter(filters.branch_ids, filters.branch_id),
        statuses: normalizeStringFilter(filters.statuses, filters.status),
        employee_type_ids: normalizeIdFilter(filters.employee_type_ids, filters.employee_type_id),
        designation_ids: normalizeIdFilter(filters.designation_ids, filters.designation_id),
        project_ids: normalizeIdFilter(filters.project_ids, filters.project_id),
        genders: normalizeStringFilter(filters.genders, filters.gender),
        per_page: filters.per_page || '100',
        sort_by: filters.sort_by || 'organogram',
        sort_dir: filters.sort_dir || 'asc',
    });

    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(() => export_columns.map((column) => column.key));
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

    const activeFilterCount =
        data.department_ids.length +
        data.branch_ids.length +
        data.statuses.length +
        data.employee_type_ids.length +
        data.designation_ids.length +
        data.project_ids.length +
        data.genders.length;

    const hasActiveFilters = activeFilterCount > 0;

    const [showFilters, setShowFilters] = useState(hasActiveFilters);

    // Calculate overall stats for KPI cards
    const totalCount = stats?.total ?? employees.total;
    const activeCount = stats?.active ?? employees.data.filter((e) => e.status === 'active').length;
    const onLeaveCount = stats?.on_leave ?? employees.data.filter((e) => e.status === 'on_leave').length;
    const inactiveCount = stats?.inactive ?? employees.data.filter((e) => e.status !== 'active' && e.status !== 'on_leave').length;
    const coreCount = stats?.core ?? totalCount;
    const projectCount = stats?.project ?? 0;
    const activeCoreCount = stats?.active_core ?? activeCount;
    const activeProjectCount = stats?.active_project ?? 0;

    const activePercent = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
    const onLeavePercent = totalCount > 0 ? (onLeaveCount / totalCount) * 100 : 0;
    const inactivePercent = totalCount > 0 ? (inactiveCount / totalCount) * 100 : 0;
    const corePercent = totalCount > 0 ? (coreCount / totalCount) * 100 : 0;
    const projectPercent = totalCount > 0 ? (projectCount / totalCount) * 100 : 0;

    const buildFilterParams = (merged: typeof data): Record<string, string | string[]> => {
        const params: Record<string, string | string[]> = {};
        if (merged.search) params.search = merged.search;
        if (merged.department_ids.length > 0) params.department_ids = merged.department_ids;
        if (merged.branch_ids.length > 0) params.branch_ids = merged.branch_ids;
        if (merged.statuses.length > 0) params.statuses = merged.statuses;
        if (merged.employee_type_ids.length > 0) params.employee_type_ids = merged.employee_type_ids;
        if (merged.designation_ids.length > 0) params.designation_ids = merged.designation_ids;
        if (merged.project_ids.length > 0) params.project_ids = merged.project_ids;
        if (merged.genders.length > 0) params.genders = merged.genders;
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
        selectedExportColumns.forEach((column) => params.append('columns[]', column));
        const qs = params.toString();
        window.location.href = route('employees.export') + (qs ? `?${qs}` : '');
        setExportOpen(false);
    };

    const allExportColumnsSelected = export_columns.length > 0 && selectedExportColumns.length === export_columns.length;
    const exportColumnGroups = export_columns.reduce<Record<string, EmployeeExportColumn[]>>((groups, column) => {
        (groups[column.group] ??= []).push(column);
        return groups;
    }, {});

    const toggleExportColumn = (key: string, checked: boolean) => {
        setSelectedExportColumns((current) => (checked ? Array.from(new Set([...current, key])) : current.filter((column) => column !== key)));
    };

    const toggleExportGroup = (columns: EmployeeExportColumn[], checked: boolean) => {
        const groupKeys = new Set(columns.map((column) => column.key));
        setSelectedExportColumns((current) =>
            checked ? Array.from(new Set([...current, ...groupKeys])) : current.filter((column) => !groupKeys.has(column)),
        );
    };

    const toggleSort = (sortBy: 'id' | 'pin' | 'name' | 'status') => {
        const currentBy = (data as any).sort_by as string;
        const currentDir = (data as any).sort_dir as string;

        const nextDir = currentBy === sortBy ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc';

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
            },
            onError: (errors) => {
                console.error('Delete error:', errors);
                setEmployeeToDelete(null);
            },
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
            project_ids: [],
            genders: [],
        });
    };

    const handleStatusChange = (employee: Employee, active: boolean) => {
        router.patch(
            route('employees.update-status', employee.id),
            { active },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                    </span>
                );
            case 'inactive':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Inactive
                    </span>
                );
            case 'on_leave':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        On Leave
                    </span>
                );
            case 'terminated':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Terminated
                    </span>
                );
            default:
                return <Badge className="border-slate-300 bg-slate-100 text-slate-900 font-bold">{status}</Badge>;
        }
    };

    return (
        <Layout>
            <Head title="Employee Directory" />

            <PageSurface className="max-w-[96rem] px-3 py-3 sm:px-5 sm:py-4 space-y-3">
                {/* Compact & Ultra-Professional Top Header Bar */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-slate-200/90 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Employee Directory
                            </h1>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {totalCount.toLocaleString()} Total
                            </span>
                        </div>
                        <span className="hidden lg:inline-block text-xs font-medium text-slate-500 dark:text-slate-400">
                            • Manage workforce, organogram & branches
                        </span>
                    </div>

                    {/* Top Action Toolbar */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        {/* Download XLSX Button & Dialog */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold px-2.5 sm:px-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs gap-1.5"
                            onClick={() => setExportOpen(true)}
                        >
                            <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                            <span className="hidden sm:inline">Export</span> XLSX
                        </Button>

                        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Export Employees to XLSX</DialogTitle>
                                    <DialogDescription>
                                        Select the columns you want in the export file. Current active search and filters will also be applied.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2 shrink-0">
                                    <label className="flex cursor-pointer items-center gap-2 text-xs sm:text-sm font-medium">
                                        <Checkbox
                                            checked={allExportColumnsSelected}
                                            onCheckedChange={(checked) =>
                                                setSelectedExportColumns(checked ? export_columns.map((column) => column.key) : [])
                                            }
                                        />
                                        Select All Fields
                                    </label>
                                    <span className="text-muted-foreground text-xs font-semibold">
                                        {selectedExportColumns.length} of {export_columns.length} selected
                                    </span>
                                </div>

                                <div className="space-y-4 overflow-y-auto pr-1 py-1 flex-1 max-h-[50vh]">
                                    {Object.entries(exportColumnGroups).map(([group, columns]) => (
                                        <section key={group} className="space-y-2">
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <Checkbox
                                                    checked={
                                                        columns.every((column) => selectedExportColumns.includes(column.key))
                                                            ? true
                                                            : columns.some((column) => selectedExportColumns.includes(column.key))
                                                              ? 'indeterminate'
                                                              : false
                                                    }
                                                    onCheckedChange={(checked) => toggleExportGroup(columns, checked === true)}
                                                />
                                                <h3 className="text-foreground text-xs sm:text-sm font-bold">{columns[0]?.group_label}</h3>
                                                <span className="text-muted-foreground text-[11px]">
                                                    ({columns.filter((column) => selectedExportColumns.includes(column.key)).length}/{columns.length})
                                                </span>
                                            </label>
                                            <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                {columns.map((column) => (
                                                    <label
                                                        key={column.key}
                                                        className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs transition-colors"
                                                    >
                                                        <Checkbox
                                                            checked={selectedExportColumns.includes(column.key)}
                                                            onCheckedChange={(checked) => toggleExportColumn(column.key, checked === true)}
                                                        />
                                                        <span className="truncate">{column.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>

                                <DialogFooter className="border-t pt-3 gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setExportOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        disabled={selectedExportColumns.length === 0}
                                        onClick={handleExportXlsx}
                                    >
                                        <Download className="mr-1.5 h-3.5 w-3.5" />
                                        Download XLSX ({selectedExportColumns.length})
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Import Employees Button & Dialog */}
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold px-2.5 sm:px-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs gap-1.5"
                                >
                                    <Upload className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                                    <span>Import</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Import Employees</DialogTitle>
                                    <DialogDescription>
                                        Upload Excel or CSV file to import employees with validation.
                                    </DialogDescription>
                                </DialogHeader>

                                <form
                                    className="space-y-3.5"
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
                                        });
                                    }}
                                >
                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
                                        <div className="text-xs text-emerald-900 dark:text-emerald-300 font-medium">
                                            Need template format?
                                        </div>
                                        <a
                                            href={route('employees.import.example')}
                                            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                            <Download className="h-3 w-3" /> Template
                                        </a>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="importFile" className="text-xs font-semibold">Choose File (.xlsx or .csv)</Label>
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
                                            className="text-xs"
                                        />
                                        <InputError message={importForm.errors.file as any} />
                                    </div>

                                    {importStatus && (
                                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
                                            {importStatus}
                                        </div>
                                    )}

                                    {importForm.processing && (
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                                            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
                                        </div>
                                    )}

                                    <DialogFooter className="gap-2 pt-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(false)} disabled={importForm.processing}>
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            disabled={importForm.processing || !importForm.data.file}
                                        >
                                            {importForm.processing ? 'Working…' : 'Upload & Review'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Add Employee Button */}
                        <Link href={route('employees.create')}>
                            <Button size="sm" className="h-8 text-xs font-bold px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5">
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Add Employee</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* KPI Overview Cards with Radial Ring Progress Charts & Micro Breakdown */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Total Employees with Core vs Project Breakdown */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                        <Users className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                        Total Staff
                                    </span>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                                    {totalCount.toLocaleString()}
                                </div>
                            </div>
                            <CircularProgressRing
                                percentage={100}
                                size={44}
                                strokeWidth={4}
                                strokeColor="stroke-indigo-600 dark:stroke-indigo-400"
                                trackColor="stroke-indigo-100 dark:stroke-indigo-950/80"
                                textColor="text-indigo-700 dark:text-indigo-300"
                            />
                        </div>

                        {/* Core vs Project Sub-Breakdown */}
                        <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold">
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                Core: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{coreCount.toLocaleString()}</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700 font-normal">|</span>
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                                Project: <span className="text-violet-600 dark:text-violet-400 font-extrabold">{projectCount.toLocaleString()}</span>
                            </span>
                        </div>
                    </div>

                    {/* Active Employees */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                        <UserCheck className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
                                        Active
                                    </span>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                    {activeCount.toLocaleString()}
                                </div>
                            </div>
                            <CircularProgressRing
                                percentage={activePercent}
                                size={44}
                                strokeWidth={4}
                                strokeColor="stroke-emerald-500 dark:stroke-emerald-400"
                                trackColor="stroke-emerald-100 dark:stroke-emerald-950/80"
                                textColor="text-emerald-700 dark:text-emerald-300"
                            />
                        </div>

                        {/* Core vs Project Sub-Breakdown for Active */}
                        <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold">
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Core: <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{activeCoreCount.toLocaleString()}</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700 font-normal">|</span>
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                                Project: <span className="text-teal-700 dark:text-teal-400 font-extrabold">{activeProjectCount.toLocaleString()}</span>
                            </span>
                        </div>
                    </div>

                    {/* On Leave */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">
                                        On Leave
                                    </span>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                    {onLeaveCount.toLocaleString()}
                                </div>
                            </div>
                            <CircularProgressRing
                                percentage={onLeavePercent}
                                size={44}
                                strokeWidth={4}
                                strokeColor="stroke-amber-500 dark:stroke-amber-400"
                                trackColor="stroke-amber-100 dark:stroke-amber-950/80"
                                textColor="text-amber-700 dark:text-amber-300"
                            />
                        </div>

                        <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>{onLeavePercent.toFixed(1)}% currently on leave</span>
                        </div>
                    </div>

                    {/* Inactive / Terminated */}
                    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                        <UserX className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider truncate">
                                        Inactive
                                    </span>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                                    {inactiveCount.toLocaleString()}
                                </div>
                            </div>
                            <CircularProgressRing
                                percentage={inactivePercent}
                                size={44}
                                strokeWidth={4}
                                strokeColor="stroke-rose-500 dark:stroke-rose-400"
                                trackColor="stroke-rose-100 dark:stroke-rose-950/80"
                                textColor="text-rose-700 dark:text-rose-300"
                            />
                        </div>

                        <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span>{inactivePercent.toFixed(1)}% inactive / terminated</span>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flashSuccess && (
                    <Alert className="border-green-200 bg-green-50/90 dark:bg-green-950/40 dark:border-green-800 py-2.5">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription className="text-green-800 dark:text-green-300 text-xs font-semibold">{flashSuccess}</AlertDescription>
                    </Alert>
                )}

                {flashError && (
                    <Alert className="border-red-200 bg-red-50/90 dark:bg-red-950/40 dark:border-red-800 py-2.5">
                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-300 text-xs font-semibold">{flashError}</AlertDescription>
                    </Alert>
                )}

                {importSummary && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 py-2.5">
                        <AlertDescription className="text-blue-900 dark:text-blue-300 text-xs">
                            <div className="font-bold">
                                Import summary: Created {importSummary.created}, skipped {importSummary.skipped}.
                            </div>
                            {importSummary.branches && importSummary.branches.length > 0 && (
                                <div className="mt-1.5 text-xs">
                                    <div className="font-semibold">Branch-wise created:</div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {importSummary.branches.slice(0, 10).map((b) => (
                                            <span key={b.branch_id} className="bg-blue-100/70 dark:bg-blue-900/60 px-2 py-0.5 rounded text-[11px] font-medium">
                                                {b.branch_name}: {b.created}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {importRowErrors.length > 0 && (
                                <div className="mt-2 text-xs">
                                    <div className="font-bold text-red-700 dark:text-red-400">Row errors:</div>
                                    <ul className="mt-1 list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
                                        {importRowErrors.slice(0, 10).map((re) => (
                                            <li key={re.row}>
                                                Row {re.row}: {re.errors.join(', ')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Directory Card with Toolbar and Filter Bar */}
                <Card className="rounded-xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                    {/* Toolbar Header */}
                    <div className="p-3 sm:p-3.5 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
                            {/* Left: Search Bar */}
                            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-lg">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        type="search"
                                        name="search"
                                        placeholder="Search by name, PIN, mobile, email..."
                                        value={data.search}
                                        onChange={(e) => setData('search', e.target.value)}
                                        className="h-8.5 text-xs pl-8 pr-7 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-emerald-500 shadow-2xs"
                                    />
                                    {data.search && (
                                        <button
                                            type="button"
                                            onClick={() => applyFilters({ search: '' })}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    size="sm"
                                    className="h-8.5 text-xs font-semibold px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                    disabled={processing}
                                >
                                    Search
                                </Button>
                            </form>

                            {/* Right: Controls & Toggles */}
                            <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
                                {/* Organogram sort toggle */}
                                <Button
                                    type="button"
                                    variant={isOrganogramSort ? 'default' : 'outline'}
                                    size="sm"
                                    className={`h-8.5 text-xs font-semibold px-2.5 gap-1.5 transition-all ${
                                        isOrganogramSort
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                                    }`}
                                    onClick={useOrganogramSort}
                                    title="Sort in hierarchical Organogram order"
                                >
                                    <Layers className="h-3.5 w-3.5" />
                                    <span>Organogram</span>
                                </Button>

                                {/* Filters Toggle Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`h-8.5 text-xs font-semibold px-2.5 gap-1.5 border transition-all ${
                                        hasActiveFilters
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                                            : showFilters
                                              ? 'border-slate-300 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <Filter className="h-3.5 w-3.5" />
                                    <span>Filters</span>
                                    {activeFilterCount > 0 && (
                                        <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-black rounded-full bg-emerald-600 text-white">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                    {showFilters ? <ChevronUp className="h-3 w-3 opacity-60" /> : <ChevronDown className="h-3 w-3 opacity-60" />}
                                </Button>

                                {/* Quick Clear Button if filters active */}
                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearFilters}
                                        disabled={processing}
                                        className="h-8.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 font-medium gap-1"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Reset</span>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Collapsible Filter Bar with clean, compact responsive grid */}
                        {showFilters && (
                            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                                            Department
                                        </label>
                                        <MultiSelectFilter
                                            values={data.department_ids}
                                            onChange={(values) => applyFilters({ department_ids: values })}
                                            items={[
                                                NOT_ASSIGNED_ITEM,
                                                ...departments.map((d) => ({
                                                    value: String(d.id),
                                                    label: d.name,
                                                })),
                                            ]}
                                            placeholder="Department"
                                            allLabel="All Departments"
                                            disabled={processing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                                            Branch
                                        </label>
                                        <MultiSelectFilter
                                            values={data.branch_ids}
                                            onChange={(values) => applyFilters({ branch_ids: values })}
                                            items={[
                                                NOT_ASSIGNED_ITEM,
                                                ...sortPayrollBranches(branches).map((branch) => ({
                                                    value: String(branch.id),
                                                    label: formatBranchSelectLabel(branch),
                                                })),
                                            ]}
                                            placeholder="Branch"
                                            allLabel="All Branches"
                                            disabled={processing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                                            Designation
                                        </label>
                                        <MultiSelectFilter
                                            values={data.designation_ids}
                                            onChange={(values) => applyFilters({ designation_ids: values })}
                                            items={[
                                                NOT_ASSIGNED_ITEM,
                                                ...designations.map((d) => ({
                                                    value: String(d.id),
                                                    label: d.name,
                                                })),
                                            ]}
                                            placeholder="Designation"
                                            allLabel="All Designations"
                                            disabled={processing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                                            Project
                                        </label>
                                        <MultiSelectFilter
                                            values={data.project_ids}
                                            onChange={(values) => applyFilters({ project_ids: values })}
                                            items={[
                                                NOT_ASSIGNED_ITEM,
                                                ...(projects ?? []).map((project) => ({
                                                    value: String(project.id),
                                                    label: project.code ? `${project.code} — ${project.name}` : project.name,
                                                })),
                                            ]}
                                            placeholder="Project"
                                            allLabel="All Projects"
                                            disabled={processing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                                            Type
                                        </label>
                                        <MultiSelectFilter
                                            values={data.employee_type_ids}
                                            onChange={(values) => applyFilters({ employee_type_ids: values })}
                                            items={[
                                                NOT_ASSIGNED_ITEM,
                                                ...employee_types.map((type) => ({
                                                    value: String(type.id),
                                                    label: type.name,
                                                })),
                                            ]}
                                            placeholder="Employee Type"
                                            allLabel="All Types"
                                            disabled={processing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                                            Status
                                        </label>
                                        <MultiSelectFilter
                                            values={data.statuses}
                                            onChange={(values) => applyFilters({ statuses: values })}
                                            items={STATUS_FILTER_OPTIONS}
                                            placeholder="Status"
                                            allLabel="All Statuses"
                                            disabled={processing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                                            Gender
                                        </label>
                                        <MultiSelectFilter
                                            values={data.genders}
                                            onChange={(values) => applyFilters({ genders: values })}
                                            items={GENDER_FILTER_OPTIONS}
                                            placeholder="Gender"
                                            allLabel="All Genders"
                                            disabled={processing}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <CardContent className="p-0">
                        {/* Mobile Card List View (sm:hidden) */}
                        <div className="p-2.5 space-y-2 sm:hidden">
                            {employees.data.length === 0 ? (
                                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                                    <Users className="h-8 w-8 text-slate-400 mx-auto" />
                                    <p className="font-bold text-slate-800 text-sm">No Employees Found</p>
                                    <p className="text-[11px] text-slate-400">Try adjusting your search criteria or clear active filters.</p>
                                    {hasActiveFilters && (
                                        <Button size="sm" variant="outline" onClick={handleClearFilters} className="mt-2 text-xs">
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                employees.data.map((employee) => (
                                    <div
                                        key={employee.id}
                                        className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2.5 transition-all hover:border-slate-300"
                                    >
                                        {/* Top Row: Avatar + Name + PIN */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center space-x-2.5 min-w-0">
                                                <Avatar className="h-9 w-9 shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                                                    {employee.photo ? (
                                                        <AvatarImage src={`/storage/${employee.photo}`} alt={employeeDisplayName(employee)} />
                                                    ) : (
                                                        <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-xs dark:bg-emerald-950 dark:text-emerald-300">
                                                            {employeeInitials(employee)}
                                                        </AvatarFallback>
                                                    )}
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={route('employees.show', employee.id)}
                                                        className="font-bold text-xs text-slate-900 dark:text-white hover:text-emerald-600 block truncate"
                                                    >
                                                        {employeeDisplayName(employee)}
                                                    </Link>
                                                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                                                        {employee.designation?.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                    {employee.pin || employee.employee_id}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Middle Info Grid */}
                                        <div className="grid grid-cols-2 gap-1.5 bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-lg text-xs border border-slate-100 dark:border-slate-800">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Department</span>
                                                <span className="text-slate-800 dark:text-slate-200 font-semibold text-[11px] truncate block">
                                                    {employee.department?.name || '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Branch</span>
                                                <span className="text-slate-800 dark:text-slate-200 font-semibold text-[11px] truncate block">
                                                    {employee.branch?.name || '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Type</span>
                                                <span className="text-slate-800 dark:text-slate-200 font-semibold text-[11px] truncate block">
                                                    {employee.employee_type?.name || employee.employeeType?.name || '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Confirmation</span>
                                                <span className="text-slate-800 dark:text-slate-200 font-semibold text-[11px] truncate block">
                                                    {formatDisplayDate(employee.confirmation_date)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom Action & Status Row */}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={employee.status === 'active'}
                                                    onCheckedChange={(checked) => handleStatusChange(employee, checked)}
                                                    aria-label="Toggle active status"
                                                    className="scale-85"
                                                />
                                                {getStatusBadge(employee.status)}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Link href={route('employees.show', employee.id)}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Link href={route('employees.edit', employee.id)}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400"
                                                        title="Edit Employee"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400"
                                                    title="Delete Employee"
                                                    onClick={() => setEmployeeToDelete(employee)}
                                                >
                                                    <Trash className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table View (hidden sm:block) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
                                        <TableHead className="h-9.5 pl-4 text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                                            <button
                                                type="button"
                                                onClick={() => toggleSort('name')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                Employee <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="h-9.5 text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                                            <button
                                                type="button"
                                                onClick={() => toggleSort('pin')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                PIN <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="h-9.5 text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                                            Department
                                        </TableHead>
                                        <TableHead className="h-9.5 text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                                            Branch
                                        </TableHead>
                                        <TableHead className="h-9.5 text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                                            Type
                                        </TableHead>
                                        <TableHead className="h-9.5 text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-700 dark:text-slate-300 uppercase">
                                            Confirmation
                                        </TableHead>
                                        <TableHead className="h-9.5 text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                                            <button
                                                type="button"
                                                onClick={() => toggleSort('status')}
                                                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                Status <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="h-9.5 pr-4 text-right text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-40 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-1.5">
                                                    <Users className="h-8 w-8 text-slate-400" />
                                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Employees Found</h3>
                                                    <p className="text-xs text-slate-500">
                                                        {data.search || hasActiveFilters
                                                            ? 'Try adjusting your search criteria or clearing filters'
                                                            : 'Get started by creating a new employee'}
                                                    </p>
                                                    {hasActiveFilters && (
                                                        <Button size="sm" variant="outline" onClick={handleClearFilters} className="mt-2 text-xs">
                                                            Clear All Filters
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        employees.data.map((employee) => (
                                            <TableRow
                                                key={employee.id}
                                                className="group border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                                            >
                                                <TableCell className="pl-4 py-2.5">
                                                    <div className="flex items-center space-x-3">
                                                        <Avatar className="h-8.5 w-8.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                                                            {employee.photo ? (
                                                                <AvatarImage src={`/storage/${employee.photo}`} alt={employeeDisplayName(employee)} />
                                                            ) : (
                                                                <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-xs dark:bg-emerald-950 dark:text-emerald-300">
                                                                    {employeeInitials(employee)}
                                                                </AvatarFallback>
                                                            )}
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={route('employees.show', employee.id)}
                                                                className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 block truncate"
                                                            >
                                                                {employeeDisplayName(employee)}
                                                            </Link>
                                                            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400/90 truncate max-w-[220px]">
                                                                {employee.designation?.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                        {employee.pin || employee.employee_id}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                    {employee.department?.name || '—'}
                                                </TableCell>
                                                <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                    {employee.branch?.name || '—'}
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                                        {employee.employee_type?.name || employee.employeeType?.name || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">
                                                    {formatDisplayDate(employee.confirmation_date)}
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={employee.status === 'active'}
                                                            onCheckedChange={(checked) => handleStatusChange(employee, checked)}
                                                            aria-label="Toggle active status"
                                                            className="scale-85"
                                                        />
                                                        {getStatusBadge(employee.status)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-4 py-2.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link href={route('employees.show', employee.id)}>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7.5 w-7.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400"
                                                                title="View Details"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                        <Link href={route('employees.edit', employee.id)}>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7.5 w-7.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400"
                                                                title="Edit Employee"
                                                            >
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7.5 w-7.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400"
                                                            title="Delete Employee"
                                                            onClick={() => setEmployeeToDelete(employee)}
                                                        >
                                                            <Trash className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3">
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-500 dark:text-slate-400">Rows:</span>
                                    <Select value={data.per_page} onValueChange={(value) => applyFilters({ per_page: value })}>
                                        <SelectTrigger className="h-7.5 w-[65px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold">
                                            <SelectValue placeholder="100" />
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
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <div>
                                    Showing{' '}
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                        {employees.total > 0 ? (employees.current_page - 1) * employees.per_page + 1 : 0}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                        {Math.min(employees.current_page * employees.per_page, employees.total)}
                                    </span>{' '}
                                    of <span className="font-bold text-slate-700 dark:text-slate-200">{employees.total}</span> entries
                                </div>
                            </div>

                            {employees.last_page > 1 && (
                                <nav className="inline-flex items-center gap-1" aria-label="Pagination">
                                    {employees.current_page > 1 && employees.links[0]?.url ? (
                                        <Link
                                            href={employees.links[0].url}
                                            preserveState
                                            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 text-xs shadow-2xs"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Link>
                                    ) : null}

                                    {employees.links.slice(1, -1).map((link, i) => {
                                        const isActive = link.active;
                                        const isDots = link.label === '...';

                                        if (isDots) {
                                            return (
                                                <span key={i} className="inline-flex h-7.5 w-7.5 items-center justify-center text-xs font-semibold text-slate-400">
                                                    ...
                                                </span>
                                            );
                                        }

                                        if (isActive && !link.url) {
                                            return (
                                                <span
                                                    key={i}
                                                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        }

                                        return (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                preserveState
                                                className={`inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                    isActive
                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                        : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-600 shadow-2xs'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}

                                    {employees.current_page < employees.last_page && employees.links[employees.links.length - 1]?.url ? (
                                        <Link
                                            href={employees.links[employees.links.length - 1].url!}
                                            preserveState
                                            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 text-xs shadow-2xs"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Link>
                                    ) : null}
                                </nav>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </PageSurface>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Employee Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete the employee record for{' '}
                            <span className="font-bold text-slate-900 dark:text-white">{employeeDisplayName(employeeToDelete ?? undefined)}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive hover:bg-destructive/90 text-white font-bold">
                            Delete Record
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
