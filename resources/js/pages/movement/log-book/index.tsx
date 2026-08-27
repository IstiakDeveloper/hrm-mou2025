import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartKm, formatSmartNumber } from '@/lib/format-smart-number';
import { cn } from '@/lib/utils';
import { LogBookScopeTabs } from '@/components/log-book-scope-tabs';
import { format } from 'date-fns';
import {
    BookOpen,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Eye,
    Filter,
    Gauge,
    MapPin,
    Pencil,
    Printer,
    RefreshCcw,
    Route,
    Search,
    Trash2,
    X,
} from 'lucide-react';

interface Employee extends EmployeeNameFields {
    id: number;
    pin?: string | null;
    employee_id: string;
    department?: { id: number; name: string } | null;
    designation?: { id: number; name: string } | null;
    branch?: { id: number; name: string; branch_code?: string | null } | null;
}

interface LogBook {
    id: number;
    date: string;
    start_time: string;
    start_place: string;
    start_meter_reading: string | number;
    destination: string | null;
    purpose: string;
    return_time: string;
    end_meter_reading: string | number;
    distance_km: string | number;
    personal_km: string | number | null;
    official_km: string | number;
    payment_status: 'unpaid' | 'paid';
    log_book_payment_id?: number | null;
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

interface LogBooksResponse {
    data: LogBook[];
    links?: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta?: PaginationMeta;
}

interface IdName {
    id: number;
    name: string;
    code?: string;
    branch_code?: string;
    zone_id?: number;
    regional_office_id?: number;
}

interface Summary {
    total: number;
    unpaid: number;
    paid: number;
    totalKm: number;
    officialKm: number;
    personalKm: number;
}

interface SingleEmployeeSummary extends EmployeeNameFields {
    id: number;
    pin?: string | null;
    employee_id?: string | null;
    department?: { id: number; name: string } | null;
    designation?: { id: number; name: string } | null;
    branch?: { id: number; name: string; branch_code?: string | null } | null;
}

interface Props {
    logBooks: LogBooksResponse;
    summary: Summary;
    filters: Record<string, string | undefined>;
    departments: IdName[];
    employees: { id: number; name_en?: string; employee_id?: string; pin?: string }[];
    singleEmployee?: SingleEmployeeSummary | null;
    zones: IdName[];
    regionalOffices: IdName[];
    branches: IdName[];
    ratePerKm: number;
    canManageLogBook: boolean;
    scopeView?: 'mine' | 'team';
    showScopeTabs?: boolean;
}

function getPaymentBadge(row: LogBook) {
    if (row.payment_status === 'paid') {
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid</Badge>;
    }
    if (row.log_book_payment_id) {
        return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">In Payment</Badge>;
    }
    return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Unpaid</Badge>;
}

function canManageRow(row: LogBook, canManageLogBook: boolean) {
    return canManageLogBook && row.payment_status === 'unpaid';
}

function LogBookActionButtons({ row, canManageLogBook }: { row: LogBook; canManageLogBook: boolean }) {
    const manageable = canManageRow(row, canManageLogBook);

    const handleDelete = () => {
        if (!confirm('Delete this log book register entry?')) return;
        router.delete(route('movement-log-books.destroy', row.id));
    };

    return (
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700" title="View details" onClick={() => router.get(route('movement-log-books.show', row.id))}>
                <Eye className="h-4 w-4" />
            </Button>
            {manageable && (
                <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700" title="Edit" onClick={() => router.get(route('movement-log-books.edit', row.id))}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700" title="Delete" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </>
            )}
        </div>
    );
}

function LogBookMobileCard({ row, canManageLogBook }: { row: LogBook; canManageLogBook: boolean }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{format(new Date(row.date), 'dd MMM yyyy')}</p>
                    <Link href={route('movement-log-books.show', row.id)} className="mt-0.5 block truncate text-[15px] font-semibold text-slate-900 hover:text-emerald-600">
                        {employeeDisplayName(row.employee)}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                        {row.employee.branch?.name || '—'}
                        {row.employee.pin || row.employee.employee_id ? ` · ${row.employee.pin || row.employee.employee_id}` : ''}
                    </p>
                </div>
                {getPaymentBadge(row)}
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                        <span className="text-slate-500">From:</span> {row.start_place}
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="text-slate-500">To:</span> {row.destination || '—'}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <Gauge className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>Meter {formatSmartNumber(row.start_meter_reading)} → {formatSmartNumber(row.end_meter_reading)}</span>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-xs">
                <div><p className="text-slate-500">Total</p><p className="font-semibold text-slate-800">{formatSmartKm(row.distance_km)}</p></div>
                <div><p className="text-slate-500">Personal</p><p className="font-semibold text-slate-800">{row.personal_km != null && Number(row.personal_km) > 0 ? formatSmartKm(row.personal_km) : '—'}</p></div>
                <div><p className="text-slate-500">Official</p><p className="font-semibold text-emerald-700">{formatSmartKm(row.official_km)}</p></div>
            </div>

            <div className="mt-3 flex gap-2">
                <Button asChild size="sm" variant="outline" className="h-9 flex-1">
                    <Link href={route('movement-log-books.show', row.id)}>
                        <Eye className="mr-1.5 h-4 w-4" /> View
                    </Link>
                </Button>
                {canManageRow(row, canManageLogBook) && (
                    <Button asChild size="sm" variant="outline" className="h-9 flex-1">
                        <Link href={route('movement-log-books.edit', row.id)}>
                            <Pencil className="mr-1.5 h-4 w-4" /> Edit
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function MovementLogBookIndex({
    logBooks,
    summary,
    filters,
    departments,
    employees: _employees,
    singleEmployee,
    zones,
    regionalOffices,
    branches,
    ratePerKm,
    canManageLogBook,
    scopeView = 'team',
    showScopeTabs = false,
}: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const showEmployeeColumn = _employees.length > 1 && !singleEmployee;

    const [search, setSearch] = useState(filters.search || '');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status || '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [zoneId, setZoneId] = useState(filters.zone_id || '');
    const [regionalOfficeId, setRegionalOfficeId] = useState(filters.regional_office_id || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');
    const [showFilters, setShowFilters] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    const filteredRegionalOffices = useMemo(() => {
        if (!zoneId || zoneId === 'all') return regionalOffices;
        return regionalOffices.filter((ro) => String(ro.zone_id) === zoneId);
    }, [zoneId, regionalOffices]);

    const filteredBranches = useMemo(() => {
        if (regionalOfficeId && regionalOfficeId !== 'all') {
            return branches.filter((b) => String(b.regional_office_id) === regionalOfficeId);
        }
        if (zoneId && zoneId !== 'all') {
            const roIds = filteredRegionalOffices.map((ro) => String(ro.id));
            return branches.filter((b) => roIds.includes(String(b.regional_office_id)));
        }
        return branches;
    }, [zoneId, regionalOfficeId, branches, filteredRegionalOffices]);

    const buildFilterParams = () => {
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (paymentStatus && paymentStatus !== 'all') params.payment_status = paymentStatus;
        if (employeeId && employeeId !== 'all') params.employee_id = employeeId;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        if (zoneId && zoneId !== 'all') params.zone_id = zoneId;
        if (regionalOfficeId && regionalOfficeId !== 'all') params.regional_office_id = regionalOfficeId;
        if (branchId && branchId !== 'all') params.branch_id = branchId;
        if (departmentId && departmentId !== 'all') params.department_id = departmentId;
        if (perPage && perPage !== '10') params.per_page = perPage;
        if (showScopeTabs) params.view = scopeView;
        return params;
    };

    const handleSearch = () => {
        router.get(route('movement-log-books.index'), buildFilterParams(), { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('movement-log-books.index'), { ...buildFilterParams(), per_page: value }, { preserveState: true });
    };

    const resetFilters = () => {
        setSearch(''); setPaymentStatus(''); setEmployeeId(''); setFromDate(''); setToDate('');
        setZoneId(''); setRegionalOfficeId(''); setBranchId(''); setDepartmentId('');
        setPerPage('10'); setShowFilters(false); setFilterSheetOpen(false);
        router.get(route('movement-log-books.index'), showScopeTabs ? { view: scopeView } : {}, { preserveState: true });
    };

    const handlePrint = () => {
        const url = route('movement-log-books.print', buildFilterParams());
        window.open(url, '_blank');
    };

    const handleDownloadXlsx = () => {
        window.location.href = route('movement-log-books.export.xlsx', buildFilterParams());
    };

    const activeFilterCount = useMemo(
        () =>
            [
                search,
                paymentStatus && paymentStatus !== 'all',
                employeeId && employeeId !== 'all',
                fromDate,
                toDate,
                zoneId && zoneId !== 'all',
                regionalOfficeId && regionalOfficeId !== 'all',
                branchId && branchId !== 'all',
                departmentId && departmentId !== 'all',
            ].filter(Boolean).length,
        [search, paymentStatus, employeeId, fromDate, toDate, zoneId, regionalOfficeId, branchId, departmentId],
    );

    const hasActiveFilters = activeFilterCount > 0;
    const hasPagination = logBooks.meta && logBooks.links;

    const filterFields = (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Employee Filter */}
            {_employees.length > 0 && (
                <Select value={employeeId || 'all'} onValueChange={setEmployeeId}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Employee" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                        <SelectItem value="all">All employees</SelectItem>
                        {_employees.map((emp) => (
                            <SelectItem key={emp.id} value={String(emp.id)}>
                                {emp.name_en || `Employee #${emp.id}`} {emp.pin ? `(${emp.pin})` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Status */}
            <Select value={paymentStatus || 'all'} onValueChange={setPaymentStatus}>
                <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
            </Select>

            {/* Department */}
            {departments.length > 0 && (
                <Select value={departmentId || 'all'} onValueChange={setDepartmentId}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        {departments.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Zone */}
            {zones.length > 0 && (
                <Select
                    value={zoneId || 'all'}
                    onValueChange={(v) => {
                        setZoneId(v);
                        setRegionalOfficeId('');
                        setBranchId('');
                    }}
                >
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All zones</SelectItem>
                        {zones.map((z) => (
                            <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Regional Office */}
            {filteredRegionalOffices.length > 0 && (
                <Select
                    value={regionalOfficeId || 'all'}
                    onValueChange={(v) => {
                        setRegionalOfficeId(v);
                        setBranchId('');
                    }}
                >
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Regional Office" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All regional offices</SelectItem>
                        {filteredRegionalOffices.map((ro) => (
                            <SelectItem key={ro.id} value={String(ro.id)}>{ro.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Branch */}
            {filteredBranches.length > 0 && (
                <Select value={branchId || 'all'} onValueChange={setBranchId}>
                    <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All branches</SelectItem>
                        {filteredBranches.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* From Date */}
            <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">From date</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 border-slate-200" />
            </div>

            {/* To Date */}
            <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">To date</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 border-slate-200" />
            </div>
        </div>
    );

    return (
        <Layout>
            <Head title="Log Book Register" />

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

                <div className="mb-3 flex flex-col gap-2.5 border-b border-slate-200 pb-3 md:mb-4 md:pb-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 md:text-2xl">
                                Log Book Register
                            </h1>
                            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                                {showScopeTabs && scopeView === 'mine'
                                    ? `Your log book — unpaid until monthly payment approved (৳${ratePerKm}/km official)`
                                    : showScopeTabs
                                        ? `Team log book register — unpaid until monthly payment approved (৳${ratePerKm}/km official)`
                                        : `Log book register — unpaid until monthly payment approved (৳${ratePerKm}/km official)`}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Button variant="outline" size="sm" className="hidden h-9 gap-1.5 border-slate-200 sm:inline-flex" onClick={handlePrint}>
                                <Printer className="h-4 w-4" /> Print
                            </Button>
                            <Button variant="outline" size="sm" className="hidden h-9 gap-1.5 border-slate-200 sm:inline-flex" onClick={handleDownloadXlsx}>
                                <Download className="h-4 w-4" /> XLSX
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 sm:hidden" onClick={handlePrint} title="Print">
                                <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 sm:hidden" onClick={handleDownloadXlsx} title="Download XLSX">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <LogBookScopeTabs
                        view={scopeView}
                        showTabs={showScopeTabs}
                        indexRoute={route('movement-log-books.index')}
                        filterParams={buildFilterParams()}
                    />
                </div>

                {/* Summary cards */}
                <div className="mb-2 flex items-baseline gap-2">
                    <h2 className="text-sm font-semibold text-slate-700">
                        {fromDate && toDate && fromDate.slice(0, 7) === toDate.slice(0, 7)
                            ? format(new Date(fromDate), 'MMMM yyyy')
                            : fromDate || toDate
                                ? `${fromDate || '...'} — ${toDate || '...'}`
                                : 'All time'}
                    </h2>
                    <span className="text-xs text-slate-400">Summary</span>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 md:mb-4">
                    {[
                        { label: 'Total', value: summary.total, icon: BookOpen, color: 'text-slate-700', bg: 'bg-slate-50' },
                        { label: 'Unpaid', value: summary.unpaid, icon: Clock, color: 'text-slate-700', bg: 'bg-slate-50' },
                        { label: 'Paid', value: summary.paid, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                        { label: 'Total KM', value: formatSmartKm(summary.totalKm), icon: Route, color: 'text-blue-700', bg: 'bg-blue-50', raw: true },
                        { label: 'Official KM', value: formatSmartKm(summary.officialKm), icon: Gauge, color: 'text-emerald-700', bg: 'bg-emerald-50', raw: true },
                        { label: 'Personal KM', value: formatSmartKm(summary.personalKm), icon: MapPin, color: 'text-orange-700', bg: 'bg-orange-50', raw: true },
                    ].map((card) => (
                        <div key={card.label} className={cn('flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5', card.bg)}>
                            <card.icon className={cn('h-4 w-4 shrink-0', card.color)} />
                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium text-slate-500">{card.label}</p>
                                <p className={cn('text-sm font-bold', card.color)}>
                                    {'raw' in card ? card.value : card.value.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {singleEmployee && (
                    <Card className="mb-3 overflow-hidden rounded-xl border-emerald-100 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/50 shadow-sm md:mb-4">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-sm shadow-emerald-200 text-base">
                                        {singleEmployee.name_en ? singleEmployee.name_en.charAt(0).toUpperCase() : 'E'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="truncate text-base font-bold text-slate-900">
                                                {employeeDisplayName(singleEmployee)}
                                            </h2>
                                            <Badge variant="outline" className="border-emerald-200 bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold">
                                                {scopeView === 'mine' ? 'My Log Book' : 'Single Employee View'}
                                            </Badge>
                                        </div>
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                            {singleEmployee.designation?.name || 'Designation N/A'} • {singleEmployee.department?.name || 'Department N/A'}
                                        </p>
                                    </div>
                                </div>

                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="self-start text-xs text-slate-500 hover:text-slate-800 sm:self-center"
                                    >
                                        <X className="mr-1 h-3.5 w-3.5" /> Reset filter
                                    </Button>
                                )}
                            </div>

                            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4">
                                <div className="rounded-lg border border-slate-100 bg-white/90 p-2.5">
                                    <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">PIN / ID</span>
                                    <span className="mt-0.5 block font-mono font-bold text-slate-900">
                                        {singleEmployee.pin || singleEmployee.employee_id || '—'}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-white/90 p-2.5">
                                    <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Branch</span>
                                    <span className="mt-0.5 block truncate font-semibold text-slate-900">
                                        {singleEmployee.branch?.name || '—'}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-white/90 p-2.5">
                                    <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Department</span>
                                    <span className="mt-0.5 block truncate font-semibold text-slate-900">
                                        {singleEmployee.department?.name || '—'}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-white/90 p-2.5">
                                    <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Designation</span>
                                    <span className="mt-0.5 block truncate font-semibold text-slate-900">
                                        {singleEmployee.designation?.name || '—'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 md:px-4 md:py-2.5">
                        <form
                            className="relative min-w-0 flex-1"
                            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                        >
                            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search employee, destination, place..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                className="h-8 rounded-lg border-slate-200 bg-slate-50/80 pr-8 pl-8 text-sm focus-visible:ring-emerald-500 md:h-9"
                            />
                            {search && (
                                <button type="button" onClick={() => setSearch('')} className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Mobile filter toggle */}
                        <Button
                            type="button" variant="outline" size="icon"
                            className={cn(
                                'relative h-8 w-8 shrink-0 rounded-lg border-slate-200 md:hidden',
                                (filterSheetOpen || activeFilterCount > 0) && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setFilterSheetOpen(true)} title="Filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{activeFilterCount}</span>
                            )}
                        </Button>

                        {/* Desktop filter toggle */}
                        <Button
                            type="button" variant="outline" size="icon"
                            className={cn(
                                'relative hidden h-9 w-9 shrink-0 rounded-lg border-slate-200 md:inline-flex',
                                showFilters && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setShowFilters((v) => !v)} title="Toggle filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && !showFilters && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{activeFilterCount}</span>
                            )}
                        </Button>

                        <Button type="button" size="sm" className="hidden h-9 shrink-0 bg-emerald-600 px-3 hover:bg-emerald-700 sm:inline-flex" onClick={handleSearch}>
                            <Search className="mr-1 h-4 w-4" /> Search
                        </Button>
                    </div>

                    {/* Desktop filter panel */}
                    {showFilters && (
                        <div className="hidden border-b border-slate-100 bg-slate-50/40 px-4 py-3 md:block">
                            {filterFields}
                            <div className="mt-3 flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8" onClick={resetFilters}>
                                    <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Reset
                                </Button>
                                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSearch}>
                                    <Search className="mr-1 h-3.5 w-3.5" /> Apply
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Mobile filter sheet */}
                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl px-4 pb-6">
                            <SheetHeader className="text-left">
                                <SheetTitle>Filter log book</SheetTitle>
                                <SheetDescription>Filter entries by status, date, zone, branch, etc.</SheetDescription>
                            </SheetHeader>
                            <div className="mt-4 py-1">{filterFields}</div>
                            <SheetFooter className="mt-4 flex flex-row gap-2 sm:justify-stretch">
                                <Button variant="outline" className="flex-1" onClick={resetFilters}>Reset</Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleSearch(); setFilterSheetOpen(false); }}>
                                    Apply filters
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    {/* Mobile card list */}
                    <div className="space-y-3 p-3 md:hidden">
                        {logBooks.data.length > 0 ? (
                            logBooks.data.map((row) => (
                                <LogBookMobileCard key={row.id} row={row} canManageLogBook={canManageLogBook} />
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
                                No log book entries found.
                                {hasActiveFilters && (
                                    <Button variant="link" onClick={resetFilters} className="px-2 font-normal">Clear filters</Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop table */}
                    <CardContent className="hidden p-0 md:block">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                        <TableHead className="h-11 pl-6 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Date</TableHead>
                                        {showEmployeeColumn && (
                                            <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">PIN</TableHead>
                                        )}
                                        {showEmployeeColumn && (
                                            <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Employee</TableHead>
                                        )}
                                        {showEmployeeColumn && (
                                            <TableHead className="hidden h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase lg:table-cell">Branch</TableHead>
                                        )}
                                        <TableHead className="hidden h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase xl:table-cell">Start place</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Destination</TableHead>
                                        <TableHead className="h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Start meter</TableHead>
                                        <TableHead className="h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">End meter</TableHead>
                                        <TableHead className="hidden h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase lg:table-cell">Total</TableHead>
                                        <TableHead className="hidden h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase xl:table-cell">Personal</TableHead>
                                        <TableHead className="h-11 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Official</TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Payment</TableHead>
                                        <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logBooks.data.length > 0 ? (
                                        <>
                                            {logBooks.data.map((row) => (
                                                <TableRow key={row.id} className="group border-b border-slate-100 transition-colors hover:bg-slate-50">
                                                    <TableCell className="whitespace-nowrap pl-6 text-[13px] text-slate-600">{format(new Date(row.date), 'dd MMM yyyy')}</TableCell>
                                                    {showEmployeeColumn && (
                                                        <TableCell className="whitespace-nowrap font-mono text-[13px] text-slate-700">{row.employee.pin || row.employee.employee_id}</TableCell>
                                                    )}
                                                    {showEmployeeColumn && (
                                                        <TableCell>
                                                            <div className="flex min-w-[180px] items-center">
                                                                <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                                                    <BookOpen className="h-4 w-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <Link href={route('movement-log-books.show', row.id)} className="block truncate text-[13px] font-semibold text-slate-800 transition-colors hover:text-emerald-600">
                                                                        {employeeDisplayName(row.employee)}
                                                                    </Link>
                                                                    <div className="truncate text-xs text-slate-500">
                                                                        {row.employee.department?.name || '—'} • {row.employee.designation?.name || '—'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                    {showEmployeeColumn && (
                                                        <TableCell className="hidden whitespace-nowrap text-[13px] text-slate-600 lg:table-cell">{row.employee.branch?.name || '—'}</TableCell>
                                                    )}
                                                    <TableCell className="hidden max-w-[140px] truncate text-[13px] text-slate-600 xl:table-cell">{row.start_place}</TableCell>
                                                    <TableCell><span className="block max-w-[140px] truncate text-[13px] text-slate-600">{row.destination || '—'}</span></TableCell>
                                                    <TableCell className="whitespace-nowrap text-right font-mono text-[13px] text-slate-700">{formatSmartNumber(row.start_meter_reading)}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-right font-mono text-[13px] text-slate-700">{formatSmartNumber(row.end_meter_reading)}</TableCell>
                                                    <TableCell className="hidden whitespace-nowrap text-right text-[13px] text-slate-600 lg:table-cell">{formatSmartKm(row.distance_km)}</TableCell>
                                                    <TableCell className="hidden whitespace-nowrap text-right text-[13px] text-slate-600 xl:table-cell">
                                                        {row.personal_km != null && Number(row.personal_km) > 0 ? formatSmartKm(row.personal_km) : '—'}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-right text-[13px] font-semibold text-emerald-700">{formatSmartKm(row.official_km)}</TableCell>
                                                    <TableCell>{getPaymentBadge(row)}</TableCell>
                                                    <TableCell className="pr-6 text-right">
                                                        <LogBookActionButtons row={row} canManageLogBook={canManageLogBook} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-slate-50/80">
                                                <TableCell colSpan={showEmployeeColumn ? 8 : 5} className="pl-6 text-[13px] font-semibold text-slate-800">
                                                    Total
                                                </TableCell>
                                                <TableCell className="hidden whitespace-nowrap text-right text-[13px] font-semibold text-slate-800 lg:table-cell">
                                                    {formatSmartKm(summary.totalKm)}
                                                </TableCell>
                                                <TableCell className="hidden whitespace-nowrap text-right text-[13px] font-semibold text-slate-800 xl:table-cell">
                                                    {formatSmartKm(summary.personalKm)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right text-[13px] font-semibold text-emerald-700">
                                                    {formatSmartKm(summary.officialKm)}
                                                </TableCell>
                                                <TableCell />
                                                <TableCell className="pr-6" />
                                            </TableRow>
                                        </>
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={showEmployeeColumn ? 13 : 10} className="h-24 text-center">
                                                No log book entries found.
                                                {hasActiveFilters && (
                                                    <Button variant="link" onClick={resetFilters} className="px-2 font-normal">Clear filters</Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    {/* Pagination */}
                    {hasPagination && logBooks.meta && (
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
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-[13px] text-slate-500">
                                    Showing{' '}
                                    <span className="font-semibold text-slate-700">{logBooks.meta.total > 0 ? (logBooks.meta.current_page - 1) * logBooks.meta.per_page + 1 : 0}</span>
                                    {' '}to{' '}
                                    <span className="font-semibold text-slate-700">{Math.min(logBooks.meta.current_page * logBooks.meta.per_page, logBooks.meta.total)}</span>
                                    {' '}of <span className="font-semibold text-slate-700">{logBooks.meta.total}</span> entries
                                </p>
                            </div>

                            {logBooks.meta.last_page > 1 && (
                                <div className="flex items-center justify-center sm:justify-end">
                                    <nav className="isolate inline-flex gap-1.5" aria-label="Pagination">
                                        {logBooks.meta.current_page > 1 && logBooks.links?.prev && (
                                            <Link href={logBooks.links.prev} preserveState className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600">
                                                <span className="sr-only">Previous</span>
                                                <ChevronLeft className="h-4 w-4" />
                                            </Link>
                                        )}
                                        {logBooks.meta.links.slice(1, -1).map((link, i) => {
                                            if (link.label === '...') {
                                                return <span key={i} className="relative inline-flex h-8 w-8 items-center justify-center text-[13px] font-medium text-slate-400">...</span>;
                                            }
                                            return (
                                                <Link
                                                    key={i} href={link.url || '#'} preserveState
                                                    className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm ${
                                                        link.active
                                                            ? 'z-10 border border-emerald-600 bg-emerald-600 text-white'
                                                            : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        })}
                                        {logBooks.meta.current_page < logBooks.meta.last_page && logBooks.links?.next && (
                                            <Link href={logBooks.links.next} preserveState className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600">
                                                <span className="sr-only">Next</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        )}
                                    </nav>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </PageSurface>
        </Layout>
    );
}
