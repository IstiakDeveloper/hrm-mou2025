import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
import {
    Activity,
    AlertCircle,
    CalendarRange,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Edit,
    Eye,
    Filter,
    Plus,
    Printer,
    RefreshCcw,
    Search,
    Trash,
    X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Employee extends EmployeeNameFields {
    id: number;
    pin?: string | null;
    employee_id: string;
    department: {
        id: number;
        name: string;
    };
    designation: {
        id: number;
        name: string;
    };
    branch?: {
        id: number;
        name: string;
        branch_code?: string | null;
    } | null;
}

interface Department {
    id: number;
    name: string;
}

interface ZoneOption {
    id: number;
    name: string;
    code?: string | null;
}

interface RegionalOfficeOption {
    id: number;
    name: string;
    code?: string | null;
    zone_id: number;
}

interface BranchOption {
    id: number;
    name: string;
    branch_code?: string | null;
    regional_office_id: number | null;
}

interface Movement {
    id: number;
    employee_id: number;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    to_datetime: string;
    purpose: string;
    destination: string;
    remarks: string | null;
    status: 'active' | 'completed' | 'pending' | 'approved' | 'rejected' | 'cancelled';
    is_returned: boolean;
    actual_return_datetime: string | null;
    employee: Employee;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number;
    total: number;
}

interface MovementsResponse {
    data: Movement[];
    links?: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta?: PaginationMeta;
}

interface MovementSummary {
    total: number;
    active: number;
    completed: number;
    pending: number;
    approved: number;
}

interface MovementIndexProps {
    movements: MovementsResponse;
    summary: MovementSummary;
    departments: Department[];
    employees: Employee[];
    zones: ZoneOption[];
    regionalOffices: RegionalOfficeOption[];
    branches: BranchOption[];
    filters: {
        status?: string;
        department_id?: string;
        employee_id?: string;
        movement_type?: string;
        zone_id?: string;
        regional_office_id?: string;
        branch_id?: string;
        from_date?: string;
        to_date?: string;
        cross_day_only?: string | boolean;
        search?: string;
        per_page?: string;
    };
    canApprove: boolean;
    userPermissions: {
        canView: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canApprove: boolean;
        isBranchManager: boolean;
        isBranchHead: boolean;
        isDepartmentHead: boolean;
        userBranchId: number | null;
        userDepartmentId: number | null;
        isEmployee: boolean;
        employeeId: number | null;
    };
}

function parseFilterDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export default function MovementIndex({
    movements,
    summary,
    departments,
    employees,
    zones = [],
    regionalOffices = [],
    branches = [],
    filters,
    userPermissions,
}: MovementIndexProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string; warning?: string } }>().props;

    const [status, setStatus] = useState(filters.status || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || '');
    const [movementType, setMovementType] = useState(filters.movement_type || '');
    const [zoneId, setZoneId] = useState(filters.zone_id || '');
    const [regionalOfficeId, setRegionalOfficeId] = useState(filters.regional_office_id || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [fromDate, setFromDate] = useState<Date | undefined>(parseFilterDate(filters.from_date));
    const [toDate, setToDate] = useState<Date | undefined>(parseFilterDate(filters.to_date));
    const [crossDayOnly, setCrossDayOnly] = useState(
        filters.cross_day_only === true || filters.cross_day_only === '1' || filters.cross_day_only === 'true',
    );
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const filteredRegionalOffices = useMemo(() => {
        if (!zoneId || zoneId === 'all') return regionalOffices;
        return regionalOffices.filter((ro) => String(ro.zone_id) === String(zoneId));
    }, [regionalOffices, zoneId]);

    const filteredBranches = useMemo(() => {
        let list = branches;
        if (regionalOfficeId && regionalOfficeId !== 'all') {
            list = list.filter((branch) => String(branch.regional_office_id) === String(regionalOfficeId));
        } else if (zoneId && zoneId !== 'all') {
            const regionalIds = new Set(filteredRegionalOffices.map((ro) => String(ro.id)));
            list = list.filter(
                (branch) =>
                    branch.regional_office_id != null && regionalIds.has(String(branch.regional_office_id)),
            );
        }
        return list;
    }, [branches, regionalOfficeId, zoneId, filteredRegionalOffices]);

    const handleZoneChange = (value: string) => {
        const next = value === 'all' ? '' : value;
        setZoneId(next);
        setRegionalOfficeId('');
        setBranchId('');
    };

    const handleRegionalOfficeChange = (value: string) => {
        const next = value === 'all' ? '' : value;
        setRegionalOfficeId(next);
        setBranchId('');
        if (next) {
            const selected = regionalOffices.find((ro) => String(ro.id) === String(next));
            if (selected) {
                setZoneId(String(selected.zone_id));
            }
        }
    };

    const handleBranchChange = (value: string) => {
        const next = value === 'all' ? '' : value;
        setBranchId(next);
        if (next) {
            const selected = branches.find((branch) => String(branch.id) === String(next));
            if (selected?.regional_office_id) {
                setRegionalOfficeId(String(selected.regional_office_id));
                const regional = regionalOffices.find(
                    (ro) => String(ro.id) === String(selected.regional_office_id),
                );
                if (regional) {
                    setZoneId(String(regional.zone_id));
                }
            }
        }
    };

    const buildFilterParams = () => ({
        status: status && status !== 'all' ? status : '',
        department_id: departmentId && departmentId !== 'all' ? departmentId : '',
        employee_id: employeeId && employeeId !== 'all' ? employeeId : '',
        movement_type: movementType && movementType !== 'all' ? movementType : '',
        zone_id: zoneId && zoneId !== 'all' ? zoneId : '',
        regional_office_id: regionalOfficeId && regionalOfficeId !== 'all' ? regionalOfficeId : '',
        branch_id: branchId && branchId !== 'all' ? branchId : '',
        from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
        to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
        cross_day_only: crossDayOnly ? '1' : '',
        search,
        per_page: perPage,
        page:
            movements.meta?.current_page && movements.meta.current_page > 1
                ? String(movements.meta.current_page)
                : '',
    });

    const handleSearch = () => {
        router.get(route('movements.index'), buildFilterParams(), { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('movements.index'), { ...buildFilterParams(), per_page: value }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const resetFilters = () => {
        setStatus('');
        setDepartmentId('');
        setEmployeeId('');
        setMovementType('');
        setZoneId('');
        setRegionalOfficeId('');
        setBranchId('');
        setFromDate(undefined);
        setToDate(undefined);
        setCrossDayOnly(false);
        setSearch('');
        setPerPage('10');
        setShowFilters(false);
        setFilterSheetOpen(false);
        router.get(route('movements.index'), { per_page: '10' }, { preserveState: true });
    };

    const hasActiveFilters = Boolean(
        search ||
            status ||
            departmentId ||
            employeeId ||
            movementType ||
            zoneId ||
            regionalOfficeId ||
            branchId ||
            fromDate ||
            toDate ||
            crossDayOnly,
    );

    const activeFilterCount = [
        search,
        status && status !== 'all',
        departmentId && departmentId !== 'all',
        employeeId && employeeId !== 'all',
        movementType && movementType !== 'all',
        zoneId && zoneId !== 'all',
        regionalOfficeId && regionalOfficeId !== 'all',
        branchId && branchId !== 'all',
        fromDate,
        toDate,
        crossDayOnly,
    ].filter(Boolean).length;

    const applyFiltersAndClose = () => {
        handleSearch();
        setFilterSheetOpen(false);
    };

    const buildQueryString = () =>
        new URLSearchParams(
            Object.entries(buildFilterParams()).filter(([, value]) => value !== ''),
        ).toString();

    const handlePrint = () => {
        const query = buildQueryString();
        const url = `${route('movements.print')}${query ? `?${query}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadXlsx = () => {
        const query = buildQueryString();
        const url = `${route('movements.export.xlsx')}${query ? `?${query}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const deletableIdsOnPage = movements.data.map((movement) => movement.id);
    const allOnPageSelected =
        deletableIdsOnPage.length > 0 && deletableIdsOnPage.every((id) => selectedIds.includes(id));
    const someOnPageSelected = deletableIdsOnPage.some((id) => selectedIds.includes(id));

    const toggleSelectAllOnPage = (checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...deletableIdsOnPage])));
            return;
        }
        setSelectedIds((prev) => prev.filter((id) => !deletableIdsOnPage.includes(id)));
    };

    const toggleSelectMovement = (movementId: number, checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => (prev.includes(movementId) ? prev : [...prev, movementId]));
            return;
        }
        setSelectedIds((prev) => prev.filter((id) => id !== movementId));
    };

    const handleDeleteMovement = (movementId: number) => {
        if (!confirm('Delete this movement? Attendance links to this movement will be cleared.')) {
            return;
        }

        router.delete(route('movements.destroy', movementId), {
            data: buildFilterParams(),
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setSelectedIds((prev) => prev.filter((id) => id !== movementId)),
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) {
            return;
        }

        const label = selectedIds.length === 1 ? 'this movement' : `${selectedIds.length} movements`;
        if (!confirm(`Delete ${label}? Attendance links to these movements will be cleared.`)) {
            return;
        }

        router.post(
            route('movements.bulk-destroy'),
            { ids: selectedIds, ...buildFilterParams() },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSelectedIds([]),
            },
        );
    };

    const filterFields = (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select value={zoneId || 'all'} onValueChange={handleZoneChange}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Zone Office" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Zone Offices</SelectItem>
                        {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id.toString()}>
                                {zone.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={regionalOfficeId || 'all'} onValueChange={handleRegionalOfficeChange}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Regional Office" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regional Offices</SelectItem>
                        {filteredRegionalOffices.map((office) => (
                            <SelectItem key={office.id} value={office.id.toString()}>
                                {office.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={branchId || 'all'} onValueChange={handleBranchChange}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {filteredBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.branch_code ? `${branch.name} (${branch.branch_code})` : branch.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={status || 'all'} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={departmentId || 'all'} onValueChange={setDepartmentId}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id.toString()}>
                                {department.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={employeeId || 'all'} onValueChange={setEmployeeId}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                                {employeeDisplayName(employee)} ({employee.employee_id})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={movementType || 'all'} onValueChange={setMovementType}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Movement Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="official">Official</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'h-9 w-full justify-start border-slate-200 text-left text-sm font-normal',
                                !fromDate && 'text-muted-foreground',
                            )}
                        >
                            <CalendarRange className="mr-2 h-4 w-4 shrink-0" />
                            {fromDate ? format(fromDate, 'MMM dd, yyyy') : 'From Date'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={fromDate}
                            onSelect={(date) => {
                                setFromDate(date);
                                setFromDateOpen(false);
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'h-9 w-full justify-start border-slate-200 text-left text-sm font-normal',
                                !toDate && 'text-muted-foreground',
                            )}
                        >
                            <CalendarRange className="mr-2 h-4 w-4 shrink-0" />
                            {toDate ? format(toDate, 'MMM dd, yyyy') : 'To Date'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={toDate}
                            onSelect={(date) => {
                                setToDate(date);
                                setToDateOpen(false);
                            }}
                            initialFocus
                            disabled={(date) => (fromDate ? date < fromDate : false)}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <Checkbox
                    checked={crossDayOnly}
                    onCheckedChange={(checked) => setCrossDayOnly(checked === true)}
                    className="mt-0.5"
                />
                <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">Not closed same day</span>
                    <span className="block text-xs text-slate-500">
                        Show movements started on one day but closed on another, or still open from a previous day.
                    </span>
                </span>
            </label>
        </div>
    );

    const getStatusBadge = (movementStatus: string) => {
        switch (movementStatus) {
            case 'active':
                return (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        Active
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Completed
                    </Badge>
                );
            default:
                return <Badge variant="outline">{movementStatus}</Badge>;
        }
    };

    const getMovementTypeBadge = (type: string) => {
        switch (type) {
            case 'official':
                return (
                    <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                        Official
                    </Badge>
                );
            case 'personal':
                return (
                    <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                        Personal
                    </Badge>
                );
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    const calculateDuration = (movement: Movement) => {
        if (movement.status === 'completed' && movement.actual_return_datetime) {
            const fromTime = new Date(movement.from_datetime);
            const returnTime = new Date(movement.actual_return_datetime);
            const hours = differenceInHours(returnTime, fromTime);
            const minutes = differenceInMinutes(returnTime, fromTime) % 60;
            return `${hours}h ${minutes}m`;
        }
        return null;
    };

    const canCloseMovement = (movement: Movement) =>
        movement.status === 'active' && movement.employee_id === userPermissions.employeeId;

    const canEditMovement = (movement: Movement) =>
        (userPermissions.canEdit &&
            ['active', 'completed', 'pending', 'approved'].includes(movement.status)) ||
        (movement.status === 'pending' && movement.employee_id === userPermissions.employeeId);

    const hasPagination = movements.meta && movements.links;
    const activeMovementsOnPage = movements.data.filter(
        (m) => m.status === 'active' && m.employee_id === userPermissions.employeeId,
    );

    return (
        <Layout>
            <Head title="Movement Requests" />

            <PageSurface className="max-w-none px-3 sm:px-4 md:px-6">
                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}
                {flash?.warning && (
                    <Alert className="mb-4 border-amber-200 bg-amber-50">
                        <AlertTitle>Notice</AlertTitle>
                        <AlertDescription>{flash.warning}</AlertDescription>
                    </Alert>
                )}

                <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3 md:mb-4 md:pb-4">
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 md:text-2xl">
                            Movement Requests
                        </h1>
                        <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                            Track employee movements in and out of the office
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        {userPermissions.canView && (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-slate-200 sm:h-9 sm:w-9"
                                title="Print Movement Register"
                                onClick={handlePrint}
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        )}
                        {userPermissions.canView && (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-slate-200 sm:h-9 sm:w-9"
                                title="Download XLSX"
                                onClick={handleDownloadXlsx}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        )}
                        {userPermissions.canView && (
                            <Link href={route('movements.report')}>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 border-slate-200 sm:h-9 sm:w-9"
                                    title="Movement Report"
                                >
                                    <CalendarRange className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                        {userPermissions.canCreate && (
                            <Link href={route('movements.create')}>
                                <Button
                                    size="icon"
                                    className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 sm:h-9 sm:w-9"
                                    title="New Movement"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Summary cards */}
                <div className="mb-2 flex items-baseline gap-2">
                    <h2 className="text-sm font-semibold text-slate-700">
                        {fromDate && toDate && format(fromDate, 'yyyy-MM') === format(toDate, 'yyyy-MM')
                            ? format(fromDate, 'MMMM yyyy')
                            : fromDate || toDate
                                ? `${fromDate ? format(fromDate, 'dd MMM yyyy') : '...'} — ${toDate ? format(toDate, 'dd MMM yyyy') : '...'}`
                                : 'All time'}
                    </h2>
                    <span className="text-xs text-slate-400">Summary</span>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 md:mb-4">
                    {[
                        { label: 'Total', value: summary.total, icon: Activity, color: 'text-slate-700', bg: 'bg-slate-50' },
                        { label: 'Active', value: summary.active, icon: Activity, color: 'text-blue-700', bg: 'bg-blue-50' },
                        { label: 'Pending', value: summary.pending, icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50' },
                        { label: 'Approved', value: summary.approved, icon: Check, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                        { label: 'Completed', value: summary.completed, icon: Check, color: 'text-teal-700', bg: 'bg-teal-50' },
                    ].map((card) => (
                        <div key={card.label} className={cn('flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5', card.bg)}>
                            <card.icon className={cn('h-4 w-4 shrink-0', card.color)} />
                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium text-slate-500">{card.label}</p>
                                <p className={cn('text-sm font-bold', card.color)}>{card.value.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 md:px-4 md:py-2.5">
                        <form
                            className="relative min-w-0 flex-1"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearch();
                            }}
                        >
                            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search employee..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-8 rounded-lg border-slate-200 bg-slate-50/80 pr-8 pl-8 text-sm focus-visible:ring-emerald-500 md:h-9"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </form>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                                'relative h-8 w-8 shrink-0 rounded-lg border-slate-200 md:hidden',
                                (filterSheetOpen || activeFilterCount > 0) &&
                                    'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setFilterSheetOpen(true)}
                            title="Filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                                'relative hidden h-9 w-9 shrink-0 rounded-lg border-slate-200 md:inline-flex',
                                showFilters && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setShowFilters((v) => !v)}
                            title="Toggle filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && !showFilters && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            className="hidden h-9 shrink-0 bg-emerald-600 px-3 hover:bg-emerald-700 sm:inline-flex"
                            onClick={handleSearch}
                        >
                            <Search className="mr-1 h-4 w-4" />
                            Search
                        </Button>

                        {userPermissions.canDelete && selectedIds.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-8 shrink-0 px-3 sm:h-9"
                                onClick={handleBulkDelete}
                            >
                                <Trash className="mr-1 h-4 w-4" />
                                Delete ({selectedIds.length})
                            </Button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="hidden border-b border-slate-100 bg-slate-50/40 px-4 py-3 md:block">
                            {filterFields}
                            <div className="mt-3 flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8" onClick={resetFilters}>
                                    <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                                    Reset
                                </Button>
                                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSearch}>
                                    <Search className="mr-1 h-3.5 w-3.5" />
                                    Apply
                                </Button>
                            </div>
                        </div>
                    )}

                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl px-4 pb-6">
                            <SheetHeader className="text-left">
                                <SheetTitle>Filter movements</SheetTitle>
                                <SheetDescription>
                                    Filter by zone, regional office, branch, date range, and cross-day movements.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-4 max-h-[58vh] overflow-y-auto py-1">{filterFields}</div>
                            <SheetFooter className="mt-4 flex flex-row gap-2 sm:justify-stretch">
                                <Button variant="outline" className="flex-1" onClick={resetFilters}>
                                    Reset
                                </Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={applyFiltersAndClose}>
                                    Apply filters
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    <CardContent className="p-0">
                        {/* Mobile Card List View (sm:hidden) */}
                        <div className="p-2 space-y-2 sm:hidden">
                            {movements.data.length > 0 ? (
                                movements.data.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-1.5">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                                    <Activity className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={route('movements.show', movement.id)}
                                                        className="font-bold text-xs text-slate-800 hover:text-emerald-600 block truncate"
                                                    >
                                                        {employeeDisplayName(movement.employee)}
                                                    </Link>
                                                    <div className="text-[10px] text-slate-500 truncate">
                                                        {movement.employee.department?.name} • ID: {movement.employee.pin || movement.employee.employee_id}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center gap-1">
                                                {getMovementTypeBadge(movement.movement_type)}
                                                {getStatusBadge(movement.status)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg text-xs">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">From</span>
                                                <span className="text-slate-700 font-semibold text-[11px]">
                                                    {format(new Date(movement.from_datetime), 'MMM dd, HH:mm')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Return</span>
                                                {movement.status === 'completed' && movement.actual_return_datetime ? (
                                                    <span className="text-emerald-700 font-semibold text-[11px]">
                                                        {format(new Date(movement.actual_return_datetime), 'MMM dd, HH:mm')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[10px]">In progress</span>
                                                )}
                                            </div>
                                        </div>

                                        {movement.destination && (
                                            <div className="text-[11px] text-slate-600 truncate">
                                                <span className="font-semibold text-slate-500">Destination:</span> {movement.destination}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                                            <div className="text-slate-500">
                                                {movement.employee.branch?.name ? (
                                                    <span className="truncate">{movement.employee.branch.name}</span>
                                                ) : null}
                                                {calculateDuration(movement) && (
                                                    <span className="ml-1 text-emerald-700 font-bold">({calculateDuration(movement)})</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                    title="View"
                                                    onClick={() => router.get(route('movements.show', movement.id))}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {canEditMovement(movement) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                        title="Edit"
                                                        onClick={() =>
                                                            router.get(
                                                                route('movements.edit', movement.id),
                                                                buildFilterParams(),
                                                            )
                                                        }
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {canCloseMovement(movement) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                                                        title="Close"
                                                        onClick={() => router.get(route('movements.show', movement.id))}
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-xs text-slate-500">
                                    No movement requests found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View (hidden sm:block) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                        {userPermissions.canDelete && (
                                            <TableHead className="h-11 w-12 pl-6">
                                                <Checkbox
                                                    checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                                                    onCheckedChange={(checked) => toggleSelectAllOnPage(checked === true)}
                                                    aria-label="Select all movements on this page"
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead
                                            className={cn(
                                                'h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase',
                                                !userPermissions.canDelete && 'pl-6',
                                            )}
                                        >
                                            PIN
                                        </TableHead>
                                        <TableHead
                                            className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase"
                                        >
                                            Employee
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Branch
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Type
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            From
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Return
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Destination
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Status
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Duration
                                        </TableHead>
                                        <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.data.length > 0 ? (
                                        movements.data.map((movement) => (
                                            <TableRow
                                                key={movement.id}
                                                className="group border-b border-slate-100 transition-colors hover:bg-slate-50"
                                            >
                                                {userPermissions.canDelete && (
                                                    <TableCell className="pl-6">
                                                        <Checkbox
                                                            checked={selectedIds.includes(movement.id)}
                                                            onCheckedChange={(checked) =>
                                                                toggleSelectMovement(movement.id, checked === true)
                                                            }
                                                            aria-label={`Select movement for ${employeeDisplayName(movement.employee)}`}
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell
                                                    className={cn(
                                                        'whitespace-nowrap font-mono text-[13px] text-slate-700',
                                                        !userPermissions.canDelete && 'pl-6',
                                                    )}
                                                >
                                                    {movement.employee.pin || movement.employee.employee_id}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex min-w-[180px] items-center">
                                                        <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                                            <Activity className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={route('movements.show', movement.id)}
                                                                className="block truncate text-[13px] font-semibold text-slate-800 transition-colors hover:text-emerald-600"
                                                            >
                                                                {employeeDisplayName(movement.employee)}
                                                            </Link>
                                                            <div className="truncate text-xs text-slate-500">
                                                                {movement.employee.department?.name || 'No Department'} •{' '}
                                                                {movement.employee.designation?.name || 'No Designation'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-[13px] text-slate-600">
                                                    {movement.employee.branch?.name || '—'}
                                                </TableCell>
                                                <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-[13px] text-slate-600">
                                                    {format(new Date(movement.from_datetime), 'MMM dd, yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-[13px] text-slate-600">
                                                    {movement.status === 'completed' && movement.actual_return_datetime ? (
                                                        <span className="font-medium text-emerald-600">
                                                            {format(
                                                                new Date(movement.actual_return_datetime),
                                                                'MMM dd, yyyy HH:mm',
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Not returned</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="block max-w-[150px] truncate text-[13px] text-slate-600">
                                                        {movement.destination}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(movement.status)}</TableCell>
                                                <TableCell>
                                                    {movement.status === 'completed' && movement.actual_return_datetime ? (
                                                        <span className="text-[13px] font-medium text-emerald-600">
                                                            {calculateDuration(movement)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">In progress</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                                                            title="View Details"
                                                            onClick={() => router.get(route('movements.show', movement.id))}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {canEditMovement(movement) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                                                                title="Edit Movement"
                                                                onClick={() =>
                                                                    router.get(
                                                                        route('movements.edit', movement.id),
                                                                        buildFilterParams(),
                                                                    )
                                                                }
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {canCloseMovement(movement) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100 hover:text-green-700"
                                                                title="Close Movement"
                                                                onClick={() => router.get(route('movements.show', movement.id))}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {userPermissions.canDelete && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                                                title="Delete Movement"
                                                                onClick={() => handleDeleteMovement(movement.id)}
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={userPermissions.canDelete ? 11 : 10} className="h-24 text-center">
                                                No movement requests found.
                                                {hasActiveFilters && (
                                                    <Button variant="link" onClick={resetFilters} className="px-2 font-normal">
                                                        Clear filters
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {hasPagination && movements.meta && (
                            <div className="flex flex-col gap-4 rounded-b-xl border-t border-slate-200 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                    <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                        <span className="hidden sm:inline">Rows per page:</span>
                                        <Select value={perPage} onValueChange={handlePerPageChange}>
                                            <SelectTrigger className="h-8 w-[70px] border-slate-200 bg-white text-[13px]">
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
                                    <p className="text-[13px] text-slate-500">
                                        Showing{' '}
                                        <span className="font-semibold text-slate-700">
                                            {movements.meta.total > 0
                                                ? (movements.meta.current_page - 1) * movements.meta.per_page + 1
                                                : 0}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-semibold text-slate-700">
                                            {Math.min(movements.meta.current_page * movements.meta.per_page, movements.meta.total)}
                                        </span>{' '}
                                        of <span className="font-semibold text-slate-700">{movements.meta.total}</span> entries
                                    </p>
                                </div>

                                {movements.meta.last_page > 1 && (
                                    <div className="flex items-center justify-center sm:justify-end">
                                        <nav className="isolate inline-flex gap-1.5" aria-label="Pagination">
                                            {movements.meta.current_page > 1 && movements.links?.prev && (
                                                <Link
                                                    href={movements.links.prev}
                                                    preserveState
                                                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}

                                            {movements.meta.links.slice(1, -1).map((link, i) => {
                                                if (link.label === '...') {
                                                    return (
                                                        <span
                                                            key={i}
                                                            className="relative inline-flex h-8 w-8 items-center justify-center text-[13px] font-medium text-slate-400"
                                                        >
                                                            ...
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <Link
                                                        key={i}
                                                        href={link.url || '#'}
                                                        preserveState
                                                        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm transition-all duration-200 ${
                                                            link.active
                                                                ? 'z-10 border border-emerald-600 bg-emerald-600 text-white'
                                                                : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20'
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            })}

                                            {movements.meta.current_page < movements.meta.last_page && movements.links?.next && (
                                                <Link
                                                    href={movements.links.next}
                                                    preserveState
                                                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}
                                        </nav>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {userPermissions.isEmployee && (
                    <Card className="mt-6 overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-base">Your Active Movements</CardTitle>
                            <CardDescription>Movements that need to be closed upon return</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {activeMovementsOnPage.length > 0 ? (
                                <div className="space-y-3">
                                    {activeMovementsOnPage.map((movement) => (
                                        <div
                                            key={`active-${movement.id}`}
                                            className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate font-medium text-slate-900">{movement.destination}</div>
                                                <div className="text-sm text-slate-600">
                                                    {format(new Date(movement.from_datetime), 'MMM dd, yyyy HH:mm')} –{' '}
                                                    {format(new Date(movement.to_datetime), 'MMM dd, yyyy HH:mm')}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => router.get(route('movements.show', movement.id))}
                                                className="h-9 w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
                                            >
                                                <Check className="mr-1 h-4 w-4" />
                                                Close
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-4 text-slate-500">
                                    <AlertCircle className="mr-2 h-5 w-5" />
                                    <span>No active movements on this page.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </PageSurface>
        </Layout>
    );
}
