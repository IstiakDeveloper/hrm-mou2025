import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Calendar,
    CheckCircle,
    AlertCircle,
    XCircle,
    Search,
    Download,
    MapPin,
    Timer,
    Briefcase,
    Clock,
    User,
    CalendarDays,
    BarChart3,
    FileText,
    Navigation,
    Building2,
    Info,
    MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import LeavePdfExport from '@/pages/employee/LeavePdfExport';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

// Enhanced type definitions
interface AttendanceRecord {
    date: string;
    day: string;
    status: 'present' | 'absent' | 'leave' | 'on_duty' | 'weekend' | 'holiday';
    check_in: string | null;
    check_out: string | null;
    remarks: string | null;
    device: {
        id: number;
        name: string;
    } | null;
    // Movement fields
    has_movement?: boolean;
    multiple_movements?: boolean;
    total_movements?: number;
    movements?: Array<{
        id: number;
        movement_type: string;
        purpose: string;
        destination: string;
        from_datetime: string;
        to_datetime: string;
        actual_return_datetime?: string;
        status: string;
    }>;
    movement_type?: string;
    movement_purpose?: string;
    movement_destination?: string;
    movement_from?: string;
    movement_to?: string;
    movement_status?: string;
    movement_id?: number;
    auto_remarks?: string;



}


interface Department {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
}

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    email: string;
    department: Department | null;
    designation: Designation | null;
}

interface EmployeeOption {
    id: number;
    employee_id: string;
    name: string;
    department: string;
    designation: string;
}

interface LeaveRecord {
    id: number;
    type: string;
    start_date: string;
    end_date: string;
    days: number;
    status: 'pending' | 'approved' | 'rejected';
    reason: string | null;
    date_range: string;
    is_paid: boolean;
}

interface LeaveBalance {
    id: number | null;
    type: string;
    allocated_days: number;
    used_days: number;
    remaining_days: number;
    is_paid: boolean;
}

interface LeaveSummary {
    year: number;
    balances: LeaveBalance[];
}

interface MovementRecord {
    id: number;
    type: 'official' | 'personal';
    purpose: string;
    destination: string | null;
    from_datetime: string;
    to_datetime: string;
    planned_to_datetime?: string;
    actual_return_datetime?: string | null;
    status: 'active' | 'completed';
    is_returned?: boolean;
    remarks: string | null;
    formatted_time_range: string;
    duration_hours: number;
}

interface AttendanceSummary {
    total_days: number;
    present: number;
    absent: number;
    leave: number;
    on_duty: number;
    weekend: number;
    holiday: number;
    late: number;
    early_departure: number;
    overtime: number;
    attendance_percentage: number;
}

interface DateRange {
    from: string | null;
    to: string | null;
}

interface EmployeeDashboardProps {
    employees: EmployeeOption[];
    selectedEmployee: Employee | null;
    attendanceData: AttendanceRecord[];
    leaveData: LeaveRecord[];
    movementData: MovementRecord[];
    dateRange: DateRange;
    filterType: 'custom' | 'year' | 'all';
    filterYear: number;
    years: number[];
    attendanceSummary: AttendanceSummary | null;
    leaveSummary: LeaveSummary | null;
    dashboardContext?: {
        mode: 'self' | 'department_head' | 'branch_manager' | 'organogram';
        label: string;
        scopedEmployeeCount: number;
        departmentNames: string[];
    };
    userPermissions: {
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canViewReports: boolean;
        isEmployee: boolean;
        isBranchManager: boolean;
        isDepartmentHead: boolean;
        hasOrganogramLineRole?: boolean;
    };
}

export default function EmployeeDashboard({
    employees,
    selectedEmployee,
    attendanceData,
    leaveData,
    movementData,
    dateRange,
    filterType,
    filterYear,
    years,
    attendanceSummary,
    leaveSummary,
    dashboardContext,
    userPermissions,
}: EmployeeDashboardProps) {
    const canPickEmployees = employees.length > 1;
    const scopeLabel = dashboardContext?.label ?? (
        userPermissions.isDepartmentHead
            ? 'Department head — your department team'
            : userPermissions.isBranchManager
              ? 'Branch manager — employees in your branch'
              : 'Your employee profile'
    );
    const [activeTab, setActiveTab] = useState('summary');

    // State for filter form
    const [filters, setFilters] = useState({
        employeeId: selectedEmployee?.id || '',
        filterType: filterType,
        year: filterYear.toString(),
        fromDate: dateRange.from ? new Date(dateRange.from) : null,
        toDate: dateRange.to ? new Date(dateRange.to) : null,
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState(employees);
    const [showSearchResults, setShowSearchResults] = useState(false);

    useEffect(() => {
        if (employees.length !== 1 || selectedEmployee) {
            return;
        }
        const only = employees[0];
        setFilters((prev) => ({ ...prev, employeeId: only.id }));
        setSearchQuery(only.name);
    }, [employees, selectedEmployee]);

    useEffect(() => {
        if (!selectedEmployee) {
            return;
        }
        const opt = employees.find((e) => e.id === selectedEmployee.id);
        setSearchQuery(opt?.name ?? employeeDisplayName(selectedEmployee));
        setFilters((prev) => ({
            ...prev,
            employeeId: selectedEmployee.id,
            filterType,
            year: filterYear.toString(),
            fromDate: dateRange.from ? new Date(dateRange.from) : null,
            toDate: dateRange.to ? new Date(dateRange.to) : null,
        }));
    }, [selectedEmployee, employees, filterType, filterYear, dateRange.from, dateRange.to]);

    // Helper function to handle employee search
    useEffect(() => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const filtered = employees.filter(
                (employee) =>
                    employee.name.toLowerCase().includes(q) ||
                    employee.employee_id.toLowerCase().includes(q),
            );
            setFilteredEmployees(filtered);
            setShowSearchResults(true);
        } else {
            setFilteredEmployees(employees);
            setShowSearchResults(false);
        }
    }, [searchQuery, employees]);

    // Handle employee selection from search results
    const handleEmployeeSelect = (employeeId: string) => {
        setFilters({ ...filters, employeeId: employeeId });

        // Update search box with selected employee's name
        const selectedEmp = employees.find(emp => emp.id.toString() === employeeId);
        if (selectedEmp) {
            setSearchQuery(selectedEmp.name);
        }

        // Close search results
        setShowSearchResults(false);
    };

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.getElementById('search-container');
            if (searchContainer && !searchContainer.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Helper function to get status badge for attendance
    const getAttendanceStatusBadge = (status: string) => {
        const statusConfig = {
            present: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
            absent: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
            leave: { color: 'bg-yellow-100 text-yellow-800', icon: <Calendar className="h-3 w-3 mr-1" /> },
            on_duty: { color: 'bg-blue-100 text-blue-800', icon: <Briefcase className="h-3 w-3 mr-1" /> },
            weekend: { color: 'bg-gray-100 text-gray-800', icon: <Calendar className="h-3 w-3 mr-1" /> },
            holiday: { color: 'bg-purple-100 text-purple-800', icon: <Calendar className="h-3 w-3 mr-1" /> },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.absent;

        return (
            <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
                {config.icon}
                <span className="capitalize">{status.replace('_', ' ')}</span>
            </Badge>
        );
    };

    // Helper function to get status badge for leave
    const getLeaveStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
            approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
            rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
                {config.icon}
                <span className="capitalize">{status}</span>
            </Badge>
        );
    };

    // Helper function to get status badge for movements
    const getMovementStatusBadge = (status: string) => {
        const statusConfig = {
            active: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3 mr-1" /> },
            completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
            approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
            rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

        return (
            <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
                {config.icon}
                <span className="capitalize">{status}</span>
            </Badge>
        );
    };

    // Helper function to get movement type badge
    const getMovementTypeBadge = (type: 'official' | 'personal') => {
        return (
            <Badge variant="outline" className={`${type === 'official' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'} border-0`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
        );
    };

    // Apply filters to update the dashboard
    const applyFilters = () => {
        if (!filters.employeeId) {
            return;
        }

        // Prepare query parameters
        const params: Record<string, string | number> = {
            employee_id: Number(filters.employeeId),
            filter_type: filters.filterType,
        };

        // Add specific filter parameters based on filter type
        if (filters.filterType === 'year') {
            params.year = filters.year;
        } else if (filters.filterType === 'custom' && filters.fromDate && filters.toDate) {
            params.from_date = format(filters.fromDate, 'yyyy-MM-dd');
            params.to_date = format(filters.toDate, 'yyyy-MM-dd');
        }

        // Navigate to the dashboard with the updated filters
        router.get(route('employee.dashboard'), params);
    };

    // Download PDF functions
    const downloadPdf = () => {
        const params = new URLSearchParams();
        params.append('employee_id', filters.employeeId.toString());
        params.append('filter_type', filters.filterType);

        if (filters.filterType === 'year') {
            params.append('year', filters.year);
        } else if (filters.filterType === 'custom' && filters.fromDate && filters.toDate) {
            params.append('from_date', format(filters.fromDate, 'yyyy-MM-dd'));
            params.append('to_date', format(filters.toDate, 'yyyy-MM-dd'));
        } else if (dateRange.from && dateRange.to) {
            params.append('from_date', dateRange.from);
            params.append('to_date', dateRange.to);
        }

        const url = `${route('employee.dashboard.pdf')}?${params.toString()}`;
        window.open(url, '_blank');
    };

    const downloadMovementPdf = () => {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.employeeId) {
                params.append('employee_id', filters.employeeId.toString());
            }
            params.append('filter_type', filters.filterType);
            if (filters.filterType === 'year') {
                params.append('year', filters.year);
            } else if (filters.filterType === 'custom' && filters.fromDate && filters.toDate) {
                params.append('from_date', format(filters.fromDate, 'yyyy-MM-dd'));
                params.append('to_date', format(filters.toDate, 'yyyy-MM-dd'));
            } else if (dateRange && dateRange.from && dateRange.to) {
                params.append('from_date', dateRange.from);
                params.append('to_date', dateRange.to);
            }
        }
        const url = `${route('employee.dashboard.movement.pdf')}?${params.toString()}`;
        window.open(url, '_blank');
    };

    const downloadAttendancePdf = () => {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.employeeId) {
                params.append('employee_id', filters.employeeId.toString());
            }
            params.append('filter_type', filters.filterType);
            if (filters.filterType === 'year') {
                params.append('year', filters.year);
            } else if (filters.filterType === 'custom' && filters.fromDate && filters.toDate) {
                params.append('from_date', format(filters.fromDate, 'yyyy-MM-dd'));
                params.append('to_date', format(filters.toDate, 'yyyy-MM-dd'));
            } else if (dateRange && dateRange.from && dateRange.to) {
                params.append('from_date', dateRange.from);
                params.append('to_date', dateRange.to);
            }
        }
        const url = `${route('employee.dashboard.attendance.pdf')}?${params.toString()}`;
        window.open(url, '_blank');
    };

    return (
        <Layout>
            <Head title="Employee report" />

            <PageSurface className="px-4 sm:px-6">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Employee report</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            {userPermissions.isDepartmentHead
                                ? 'View attendance, leave, and movements for employees in your department.'
                                : userPermissions.isBranchManager
                                  ? 'View attendance, leave, and movements for employees in your branch.'
                                  : 'Attendance, leave, and movements for one employee. Dates cannot extend past today.'}
                        </p>
                    </div>
                    {(userPermissions.hasOrganogramLineRole || userPermissions.isEmployee) && (
                        <Badge variant="outline" className="w-fit text-xs text-zinc-600">
                            {scopeLabel}
                            {dashboardContext && dashboardContext.scopedEmployeeCount > 0
                                ? ` (${dashboardContext.scopedEmployeeCount})`
                                : ''}
                        </Badge>
                    )}
                </div>

                {/* Filter Card */}
                <Card className="mb-6 border-slate-200 bg-white shadow-sm overflow-visible">
                    <CardHeader className="bg-slate-50/55 border-b border-slate-100 py-4 px-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-semibold text-slate-800">Select Employee & Date Range</CardTitle>
                                <CardDescription className="text-xs text-slate-500">View attendance, leave, and movement data for an employee</CardDescription>
                            </div>
                            {selectedEmployee && (
                                <Button onClick={downloadPdf} variant="outline" size="sm" className="w-full sm:w-auto flex items-center justify-center border-emerald-600/30 text-emerald-700 hover:bg-emerald-50">
                                    <Download className="mr-1.5 h-4 w-4" />
                                    Export PDF
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1.5 relative">
                                <Label htmlFor="employee_search" className="text-xs font-semibold text-slate-600">
                                    {canPickEmployees ? 'Employee' : 'Profile'}
                                </Label>
                                {canPickEmployees ? (
                                <div id="search-container" className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="employee_search"
                                        type="text"
                                        placeholder="Search by name or employee ID…"
                                        className="pl-9 h-9 text-sm border-slate-200 focus-visible:ring-emerald-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => searchQuery && setShowSearchResults(true)}
                                        autoComplete="off"
                                    />

                                    {/* Search results dropdown */}
                                    {showSearchResults && filteredEmployees.length > 0 && (
                                        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                                            {filteredEmployees.map((employee) => (
                                                <div
                                                    key={employee.id}
                                                    className="flex cursor-pointer items-center justify-between border-b border-slate-50 px-4 py-2.5 last:border-0 hover:bg-emerald-50/50 transition-colors"
                                                    onClick={() => handleEmployeeSelect(employee.id.toString())}
                                                >
                                                    <div className="min-w-0 pr-4">
                                                        <div className="font-semibold text-sm text-slate-800 truncate">{employee.name}</div>
                                                        <div className="text-xs text-slate-500 truncate">{employee.department}</div>
                                                    </div>
                                                    <div className="text-xs font-medium text-slate-400 shrink-0 text-right">{employee.designation}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                ) : (
                                    <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                                        {employees[0]?.name ?? 'Your profile'}
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-400">
                                    {canPickEmployees
                                        ? 'Pick an employee from the list, then apply dates.'
                                        : 'Your own profile is selected automatically.'}
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="filter_type" className="text-xs font-semibold text-slate-600">Filter Type</Label>
                                <Select
                                    value={filters.filterType}
                                    onValueChange={(value) => setFilters({
                                        ...filters,
                                        filterType: value as 'custom' | 'year' | 'all'
                                    })}
                                >
                                    <SelectTrigger id="filter_type" className="h-9 border-slate-200 text-sm focus:ring-emerald-500">
                                        <SelectValue placeholder="Select filter type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom" className="text-sm">Custom Date Range</SelectItem>
                                        <SelectItem value="year" className="text-sm">Yearly</SelectItem>
                                        <SelectItem value="all" className="text-sm">All Time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {filters.filterType === 'custom' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="from_date" className="text-xs font-semibold text-slate-600">From Date</Label>
                                    <DatePicker
                                        id="from_date"
                                        selected={filters.fromDate}
                                        onSelect={(date) => setFilters({ ...filters, fromDate: date })}
                                        placeholderText="Select start date"
                                        className="w-full h-9 border-slate-200 rounded-md"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="to_date" className="text-xs font-semibold text-slate-600">To Date</Label>
                                    <DatePicker
                                        id="to_date"
                                        selected={filters.toDate}
                                        onSelect={(date) => setFilters({ ...filters, toDate: date })}
                                        placeholderText="Select end date"
                                        minDate={filters.fromDate || undefined}
                                        className="w-full h-9 border-slate-200 rounded-md"
                                    />
                                </div>
                            </div>
                        )}

                        {filters.filterType === 'year' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="year" className="text-xs font-semibold text-slate-600">Select Year</Label>
                                    <Select
                                        value={filters.year}
                                        onValueChange={(value) => setFilters({ ...filters, year: value })}
                                    >
                                        <SelectTrigger id="year" className="h-9 border-slate-200 text-sm focus:ring-emerald-500">
                                            <SelectValue placeholder="Select year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((year) => (
                                                <SelectItem key={year} value={year.toString()} className="text-sm">
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-slate-50">
                            <Button onClick={applyFilters} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6">
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Employee Dashboard Content */}
                {selectedEmployee && (
                    <>
                        {/* Employee Header */}
                        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-xl shadow-md overflow-hidden mb-6 text-white border border-emerald-900/20">
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-xl bg-white/10 p-3 text-emerald-100 ring-1 ring-white/20 shrink-0">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate font-sans">
                                                {employeeDisplayName(selectedEmployee)}
                                            </h2>
                                            <div className="text-xs sm:text-sm text-emerald-100/90 font-medium truncate mt-0.5">
                                                {selectedEmployee.designation?.name ?? '—'} · {selectedEmployee.department?.name ?? '—'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:flex sm:flex-col gap-x-6 gap-y-1 sm:text-right border-t border-white/10 sm:border-0 pt-3 sm:pt-0 w-full sm:w-auto text-xs">
                                        <div>
                                            <span className="text-emerald-200/70 block sm:inline font-medium">Employee ID:</span>{' '}
                                            <span className="font-semibold text-white">{selectedEmployee.employee_id}</span>
                                        </div>
                                        <div className="sm:mt-0.5">
                                            <span className="text-emerald-200/70 block sm:inline font-medium">Period:</span>{' '}
                                            <span className="font-semibold text-white">
                                                {dateRange.from ? format(new Date(dateRange.from), 'MMM dd, yyyy') : ''} - {dateRange.to ? format(new Date(dateRange.to), 'MMM dd, yyyy') : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dashboard Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-slate-100 border border-slate-200 rounded-lg">
                                <TabsTrigger value="summary" className="text-xs sm:text-sm py-2 px-1 sm:px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">Summary</TabsTrigger>
                                <TabsTrigger value="attendance" className="text-xs sm:text-sm py-2 px-1 sm:px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">Attendance</TabsTrigger>
                                <TabsTrigger value="leave" className="text-xs sm:text-sm py-2 px-1 sm:px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">Leave</TabsTrigger>
                                <TabsTrigger value="movement" className="text-xs sm:text-sm py-2 px-1 sm:px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">Movement</TabsTrigger>
                            </TabsList>

                            {/* Summary Tab */}
                            <TabsContent value="summary">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    {/* Attendance Summary Card */}
                                    <Card className="border-slate-200/80 bg-white shadow-sm">
                                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5 px-4">
                                            <div className="flex items-center space-x-2.5">
                                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                                                    <CalendarDays className="h-4.5 w-4.5" />
                                                </div>
                                                <CardTitle className="text-sm font-bold text-slate-800">Attendance Overview</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            {attendanceSummary && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100/60">
                                                            <div className="text-[10px] text-slate-500 font-medium truncate">Total Days</div>
                                                            <div className="text-lg font-bold text-slate-800 mt-0.5">{attendanceSummary.total_days}</div>
                                                        </div>
                                                        <div className="bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-100/40">
                                                            <div className="text-[10px] text-emerald-600 font-medium truncate">Present</div>
                                                            <div className="text-lg font-bold text-emerald-700 mt-0.5">{attendanceSummary.present}</div>
                                                        </div>
                                                        <div className="bg-rose-50/50 rounded-lg p-2.5 border border-rose-100/40">
                                                            <div className="text-[10px] text-rose-600 font-medium truncate">Absent</div>
                                                            <div className="text-lg font-bold text-rose-700 mt-0.5">{attendanceSummary.absent}</div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <div className="flex justify-between items-center mb-1.5 text-xs">
                                                            <span className="font-semibold text-slate-600">Attendance Rate</span>
                                                            <span className="font-bold text-emerald-700">{attendanceSummary.attendance_percentage}%</span>
                                                        </div>
                                                        <Progress value={attendanceSummary.attendance_percentage} className="h-2" />
                                                    </div>

                                                    <Separator className="bg-slate-100 my-3" />

                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-slate-600">
                                                        <div className="flex justify-between border-b border-slate-50 pb-1">
                                                            <span className="text-slate-400">On Leave:</span>
                                                            <span className="font-semibold text-slate-800">{attendanceSummary.leave}</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-slate-50 pb-1">
                                                            <span className="text-slate-400">On Duty:</span>
                                                            <span className="font-semibold text-slate-800">{attendanceSummary.on_duty}</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-slate-50 pb-1">
                                                            <span className="text-slate-400">Weekend:</span>
                                                            <span className="font-semibold text-slate-800">{attendanceSummary.weekend}</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-slate-50 pb-1">
                                                            <span className="text-slate-400">Holiday:</span>
                                                            <span className="font-semibold text-slate-800">{attendanceSummary.holiday}</span>
                                                        </div>
                                                        <div className="flex justify-between pb-0.5">
                                                            <span className="text-slate-400">Late Arrivals:</span>
                                                            <span className="font-semibold text-amber-700">{attendanceSummary.late}</span>
                                                        </div>
                                                        <div className="flex justify-between pb-0.5">
                                                            <span className="text-slate-400">Early Out:</span>
                                                            <span className="font-semibold text-amber-700">{attendanceSummary.early_departure}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Leave Summary Card */}
                                    <Card className="border-slate-200/80 bg-white shadow-sm">
                                        <CardHeader className="bg-slate-50/55 border-b border-slate-100 py-3.5 px-4">
                                            <div className="flex items-center space-x-2.5">
                                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                                                    <Calendar className="h-4.5 w-4.5" />
                                                </div>
                                                <CardTitle className="text-sm font-bold text-slate-800">Leave Overview</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            {leaveSummary && (
                                                <div className="space-y-4">
                                                    <div className="text-xs font-bold text-slate-600">Leave Balances ({leaveSummary.year})</div>

                                                    <div className="space-y-3">
                                                        {leaveSummary.balances.filter(balance => balance.allocated_days > 0).map((balance, index) => (
                                                            <div key={index} className="space-y-1">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="font-medium text-slate-700">{balance.type} {balance.is_paid ? '(Paid)' : '(Unpaid)'}</span>
                                                                    <span className="font-bold text-slate-900">
                                                                        {balance.remaining_days} / {balance.allocated_days}
                                                                    </span>
                                                                </div>
                                                                <Progress
                                                                    value={
                                                                        balance.allocated_days > 0
                                                                            ? Math.min(
                                                                                  100,
                                                                                  (balance.used_days / balance.allocated_days) * 100,
                                                                              )
                                                                            : 0
                                                                    }
                                                                    className="h-1.5"
                                                                />
                                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                                    <span>Used: {balance.used_days}d</span>
                                                                    <span>Remaining: {balance.remaining_days}d</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <Separator className="bg-slate-100 my-3" />

                                                    <div className="space-y-2">
                                                        <div className="text-xs font-bold text-slate-600">Recent Leave Applications</div>
                                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                                            {leaveData.slice(0, 3).map((leave, index) => (
                                                                <div key={index} className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/60 text-xs">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <div className="font-semibold text-slate-700 truncate">{leave.type}</div>
                                                                        <div className="shrink-0">{getLeaveStatusBadge(leave.status)}</div>
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 mt-1">
                                                                        {leave.date_range} • {leave.days} {leave.days > 1 ? 'days' : 'day'}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {leaveData.length === 0 && (
                                                                <div className="text-xs text-slate-400 italic py-2">No leave applications found</div>
                                                            )}
                                                        </div>

                                                        {leaveData.length > 3 && (
                                                            <div className="text-center pt-1">
                                                                <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-700 hover:text-emerald-800" onClick={() => setActiveTab('leave')}>
                                                                    View all ({leaveData.length})
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Movement Summary Card */}
                                    <Card className="border-slate-200/80 bg-white shadow-sm">
                                        <CardHeader className="bg-slate-50/55 border-b border-slate-100 py-3.5 px-4">
                                            <div className="flex items-center space-x-2.5">
                                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                                                    <Briefcase className="h-4.5 w-4.5" />
                                                </div>
                                                <CardTitle className="text-sm font-bold text-slate-800">Movement Overview</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3 text-center">
                                                    <div className="bg-sky-50/40 rounded-lg p-2.5 border border-sky-100/50">
                                                        <div className="text-[10px] text-sky-600 font-medium">Official</div>
                                                        <div className="text-lg font-bold text-sky-700 mt-0.5">
                                                            {movementData.filter(m => m.type === 'official').length}
                                                        </div>
                                                    </div>
                                                    <div className="bg-purple-50/40 rounded-lg p-2.5 border border-purple-100/50">
                                                        <div className="text-[10px] text-purple-600 font-medium font-sans">Personal</div>
                                                        <div className="text-lg font-bold text-purple-700 mt-0.5">
                                                            {movementData.filter(m => m.type === 'personal').length}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Separator className="bg-slate-100 my-3" />

                                                <div className="space-y-2">
                                                    <div className="text-xs font-bold text-slate-600 font-sans">Recent Movements</div>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {movementData.slice(0, 3).map((movement, index) => (
                                                            <div key={index} className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/60 text-xs">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <div className="font-semibold text-slate-700 truncate">{movement.purpose}</div>
                                                                    <div className="shrink-0">{getMovementTypeBadge(movement.type)}</div>
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 mt-1">
                                                                    {movement.formatted_time_range} • {movement.duration_hours}h
                                                                </div>
                                                                {movement.destination && (
                                                                    <div className="flex items-center text-[10px] text-slate-400 mt-1">
                                                                        <MapPin className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                                                                        <span className="truncate">{movement.destination}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {movementData.length === 0 && (
                                                            <div className="text-xs text-slate-400 italic py-2">No movements found</div>
                                                        )}
                                                    </div>

                                                    {movementData.length > 3 && (
                                                        <div className="text-center pt-1">
                                                            <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-700 hover:text-emerald-800" onClick={() => setActiveTab('movement')}>
                                                                View all ({movementData.length})
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>


                            {/* Enhanced Attendance Tab with Movement Integration */}
                            <TabsContent value="attendance">
                                <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
                                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                                                    <CalendarDays className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-bold text-slate-800">Attendance Records</CardTitle>
                                                    <CardDescription className="text-xs text-slate-500">Daily attendance for the selected period</CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 text-xs shrink-0">
                                                    {attendanceSummary?.total_days || 0} Days · {attendanceSummary?.attendance_percentage || 0}% Attendance Rate
                                                </Badge>
                                                {attendanceData.length > 0 && (
                                                    <Button onClick={downloadAttendancePdf} variant="outline" size="sm" className="h-8 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 text-xs py-1">
                                                        <Download className="mr-1 h-3.5 w-3.5" />
                                                        Export PDF
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table className="min-w-[800px]">
                                                <TableHeader className="bg-slate-50/75">
                                                    <TableRow className="border-b border-slate-100">
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Date</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Day</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Status</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Check In</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Check Out</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Movement</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Remarks</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {attendanceData.length > 0 ? (
                                                        attendanceData.map((record, index) => (
                                                                <TableRow
                                                                    key={index}
                                                                    className={cn(
                                                                        "border-b border-slate-100 transition-colors",
                                                                        record.has_movement
                                                                            ? "bg-emerald-50/10 hover:bg-emerald-50/20 border-l-2 border-l-emerald-500"
                                                                            : "hover:bg-slate-50/50"
                                                                    )}
                                                                >
                                                                    <TableCell className="text-xs sm:text-sm font-semibold text-slate-700 py-3 px-4">
                                                                        {format(new Date(record.date), 'dd MMM yyyy')}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs sm:text-sm text-slate-600 py-3 px-4">{record.day}</TableCell>
                                                                    <TableCell className="text-xs sm:text-sm py-3 px-4">{getAttendanceStatusBadge(record.status)}</TableCell>
                                                                    <TableCell className="text-xs sm:text-sm font-mono text-slate-700 py-3 px-4">{record.check_in || '-'}</TableCell>
                                                                    <TableCell className="text-xs sm:text-sm font-mono text-slate-700 py-3 px-4">{record.check_out || '-'}</TableCell>

                                                                    {/* Enhanced Movement Column */}
                                                                    <TableCell className="py-2.5 px-4">
                                                                        {record.has_movement ? (
                                                                            <div className="space-y-1.5">
                                                                                {record.multiple_movements ? (
                                                                                    <Popover>
                                                                                        <PopoverTrigger asChild>
                                                                                            <div className="cursor-pointer hover:bg-emerald-50/80 p-2 rounded-lg border border-emerald-100 bg-emerald-50/30 transition-all duration-200">
                                                                                                <div className="flex items-center justify-between gap-2">
                                                                                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0.5 px-1.5">
                                                                                                        <Navigation className="mr-1 h-2.5 w-2.5" />
                                                                                                        {record.total_movements} Movements
                                                                                                    </Badge>
                                                                                                    <Info className="h-3.5 w-3.5 text-emerald-600" />
                                                                                                </div>
                                                                                                <div className="text-[10px] text-emerald-800 font-medium mt-1">
                                                                                                    Multiple movements today
                                                                                                </div>
                                                                                            </div>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent className="w-[calc(100vw-32px)] sm:w-96 p-4 rounded-xl shadow-xl border border-slate-100" sideOffset={5} align="start">
                                                                                            <div className="space-y-3">
                                                                                                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                                                                    <Navigation className="h-4.5 w-4.5 text-emerald-600" />
                                                                                                    {record.total_movements} Movements Today
                                                                                                </h4>

                                                                                                <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                                                                                                    {Array.isArray(record.movements) && record.movements.map((movement, movIndex) => (
                                                                                                        <div key={movement.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                                                                                                            <div className="flex items-center justify-between mb-1.5">
                                                                                                                <Badge variant="outline" className={cn(
                                                                                                                    "text-[10px] py-0.5 px-1.5 font-semibold",
                                                                                                                    movement.movement_type === 'official'
                                                                                                                        ? 'bg-sky-50 text-sky-700 border-sky-100'
                                                                                                                        : 'bg-purple-50 text-purple-700 border-purple-100'
                                                                                                                )}>
                                                                                                                    {movIndex + 1}. {movement.movement_type}
                                                                                                                </Badge>
                                                                                                                <Badge variant="outline" className={cn(
                                                                                                                    "text-[10px] py-0.5 px-1.5 font-semibold",
                                                                                                                    movement.status === 'completed'
                                                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                                                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                                                                                                )}>
                                                                                                                    {movement.status}
                                                                                                                </Badge>
                                                                                                            </div>

                                                                                                            <div className="text-xs space-y-1.5">
                                                                                                                <div>
                                                                                                                    <span className="text-slate-400 font-medium">Purpose:</span>
                                                                                                                    <div className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-xs text-slate-700 font-sans border border-slate-100">
                                                                                                                        {movement.purpose || '—'}
                                                                                                                    </div>
                                                                                                                </div>

                                                                                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                                                                                    <div>
                                                                                                                        <span className="text-slate-400">Destination:</span>
                                                                                                                        <div className="font-semibold text-slate-700 flex items-center mt-0.5 truncate">
                                                                                                                            <MapPin className="mr-1 h-3 w-3 text-slate-400 shrink-0" />
                                                                                                                            {movement.destination}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                    <div>
                                                                                                                        <span className="text-slate-400">Time Range:</span>
                                                                                                                        <div className="font-semibold text-slate-700 flex items-center mt-0.5">
                                                                                                                            <Clock className="mr-1 h-3 w-3 text-slate-400 shrink-0" />
                                                                                                                            {new Date(movement.from_datetime).toLocaleTimeString('en-US', {
                                                                                                                                hour: '2-digit',
                                                                                                                                minute: '2-digit',
                                                                                                                                hour12: true
                                                                                                                            })} - {new Date(movement.actual_return_datetime || movement.to_datetime).toLocaleTimeString('en-US', {
                                                                                                                                hour: '2-digit',
                                                                                                                                minute: '2-digit',
                                                                                                                                hour12: true
                                                                                                                            })}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>

                                                                                                <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                                                                                                    <span>{record.total_movements} movements</span>
                                                                                                    <span>Click outside to close</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                ) : (
                                                                                    // Single movement display
                                                                                    <Popover>
                                                                                        <PopoverTrigger asChild>
                                                                                            <div className="cursor-pointer hover:bg-emerald-50/80 p-2 rounded-lg border border-transparent hover:border-emerald-100 transition-all duration-200">
                                                                                                <div className="flex items-center justify-between gap-2">
                                                                                                    <div className="flex items-center space-x-1.5 min-w-0">
                                                                                                        <Badge variant="outline" className={cn(
                                                                                                            "text-[9px] py-0 px-1 font-semibold",
                                                                                                            record.movement_type === 'official'
                                                                                                                ? 'bg-sky-50 text-sky-700 border-sky-100'
                                                                                                                : 'bg-purple-50 text-purple-700 border-purple-100'
                                                                                                        )}>
                                                                                                            {record.movement_type}
                                                                                                        </Badge>
                                                                                                        <span className="text-xs font-semibold text-slate-700 truncate">Movement</span>
                                                                                                    </div>
                                                                                                    <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                                                                </div>
                                                                                                <div className="text-[10px] text-slate-500 truncate mt-1">
                                                                                                    <Navigation className="inline mr-1 h-2.5 w-2.5 text-slate-400" />
                                                                                                    {record.movement_purpose?.length > 30
                                                                                                        ? `${record.movement_purpose.substring(0, 30)}...`
                                                                                                        : record.movement_purpose
                                                                                                    }
                                                                                                </div>
                                                                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                                                                    <Clock className="inline mr-1 h-2.5 w-2.5 text-slate-400" />
                                                                                                    {record.movement_from} - {record.movement_to}
                                                                                                </div>
                                                                                            </div>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent className="w-[calc(100vw-32px)] sm:w-80 p-4 rounded-xl shadow-xl border border-slate-100" sideOffset={5} align="start">
                                                                                            <div className="space-y-3">
                                                                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                                                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                                                                                        <Navigation className="h-4.5 w-4.5 text-emerald-600" />
                                                                                                        Movement Details
                                                                                                    </h4>
                                                                                                    <Badge variant="outline" className={cn(
                                                                                                        "text-[10px] py-0.5 px-1.5 font-semibold",
                                                                                                        record.movement_status === 'completed'
                                                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                                                                                    )}>
                                                                                                        {record.movement_status}
                                                                                                    </Badge>
                                                                                                </div>

                                                                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                                                                    <div className="space-y-2">
                                                                                                        <div>
                                                                                                            <span className="text-slate-400">Type:</span>
                                                                                                            <div className="mt-0.5">
                                                                                                                <Badge variant="outline" className={cn(
                                                                                                                    "text-[9px] py-0 px-1 font-semibold",
                                                                                                                    record.movement_type === 'official'
                                                                                                                        ? 'bg-sky-50 text-sky-700 border-sky-100'
                                                                                                                        : 'bg-purple-50 text-purple-700 border-purple-100'
                                                                                                                )}>
                                                                                                                    {record.movement_type}
                                                                                                                </Badge>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <div>
                                                                                                            <span className="text-slate-400">Time Range:</span>
                                                                                                            <div className="mt-0.5 flex items-center text-slate-700 font-semibold text-[11px]">
                                                                                                                <Clock className="mr-1 h-3 w-3 text-slate-400 shrink-0" />
                                                                                                                {record.movement_from} - {record.movement_to}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="space-y-2">
                                                                                                        <div>
                                                                                                            <span className="text-slate-400">Destination:</span>
                                                                                                            <div className="mt-0.5 flex items-center text-slate-700 font-semibold text-[11px] truncate">
                                                                                                                <MapPin className="mr-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                                                                {record.movement_destination}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div>
                                                                                                    <span className="text-slate-400 text-xs">Purpose:</span>
                                                                                                    <div className="mt-1 p-2 bg-slate-50 rounded-lg text-xs text-slate-700 font-sans border border-slate-100 whitespace-pre-wrap">
                                                                                                        {record.movement_purpose}
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                                                                                                    <button
                                                                                                        className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 transition-colors"
                                                                                                        onClick={() =>
                                                                                                            record.movement_id &&
                                                                                                            window.open(route('movements.show', record.movement_id), '_blank')
                                                                                                        }
                                                                                                    >
                                                                                                        <FileText className="h-3.5 w-3.5" />
                                                                                                        View Full Movement Record
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                )}

                                                                                {/* Auto Remarks for movement records */}
                                                                                {record.auto_remarks && (
                                                                                    <div className="flex items-center text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-md border border-slate-100/60 font-sans">
                                                                                        <MessageSquare className="mr-1 h-3 w-3 text-slate-400 shrink-0" />
                                                                                        <span className="truncate">{record.auto_remarks}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center text-xs text-slate-400 gap-1.5">
                                                                                <Navigation className="h-3.5 w-3.5 shrink-0" />
                                                                                <span>No movement</span>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>

                                                                    <TableCell className="text-xs text-slate-500 py-3 px-4">
                                                                        <div className="max-w-[150px] sm:max-w-xs truncate" title={record.remarks || ''}>
                                                                            {record.remarks || '-'}
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                                                                No attendance records found for the selected period
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="leave">
                                <div className="space-y-6">
                                    {/* Leave Balances */}
                                    <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
                                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                                                        <BarChart3 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-base font-bold text-slate-800">Leave Balances ({leaveSummary?.year || new Date().getFullYear()})</CardTitle>
                                                        <CardDescription className="text-xs text-slate-500">Available leave balance for the current year</CardDescription>
                                                    </div>
                                                </div>
                                                {(leaveData.length > 0 || leaveSummary?.balances?.length > 0) && (
                                                    <LeavePdfExport
                                                        leaveData={leaveData}
                                                        leaveSummary={leaveSummary}
                                                        employee={{
                                                            id: selectedEmployee?.id || 0,
                                                            report_from_date: dateRange.from || '',
                                                            report_to_date: dateRange.to || ''
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                {leaveSummary?.balances.map((balance, index) => (
                                                    <div key={index} className="bg-slate-50/45 rounded-xl border border-slate-200/60 p-4 hover:shadow-sm transition-shadow">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <h3 className="font-bold text-sm text-slate-800">{balance.type}</h3>
                                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                                    {balance.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <span className="text-sm font-bold text-slate-800">
                                                                    {balance.remaining_days} / {balance.allocated_days}
                                                                </span>
                                                                <p className="text-[10px] text-slate-400 mt-0.5">Days Available</p>
                                                            </div>
                                                        </div>
                                                        <Progress
                                                            value={
                                                                balance.allocated_days > 0
                                                                    ? Math.min(100, (balance.used_days / balance.allocated_days) * 100)
                                                                    : 0
                                                            }
                                                            className="h-1.5"
                                                        />
                                                        <div className="flex justify-between mt-2.5 text-[11px] text-slate-500 font-medium">
                                                            <span>Used: {balance.used_days} day{balance.used_days !== 1 ? 's' : ''}</span>
                                                            <span>Remaining: {balance.remaining_days} day{balance.remaining_days !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                ))}

                                                {leaveSummary?.balances.length === 0 && (
                                                    <div className="col-span-full text-center py-8 text-slate-400 text-xs">
                                                        No leave balances found for the current year
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Leave Applications */}
                                    <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
                                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-bold text-slate-800">Leave Applications</CardTitle>
                                                    <CardDescription className="text-xs text-slate-500">History of leave requests in the selected period</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <Table className="min-w-[700px]">
                                                    <TableHeader className="bg-slate-50/75">
                                                        <TableRow className="border-b border-slate-100">
                                                            <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Leave Type</TableHead>
                                                            <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Period</TableHead>
                                                            <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Days</TableHead>
                                                            <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Status</TableHead>
                                                            <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Reason</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {leaveData.length > 0 ? (
                                                            leaveData.map((leave, index) => (
                                                                <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                                    <TableCell className="font-semibold text-xs sm:text-sm text-slate-700 py-3 px-4">{leave.type}</TableCell>
                                                                    <TableCell className="text-xs sm:text-sm text-slate-600 py-3 px-4">{leave.date_range}</TableCell>
                                                                    <TableCell className="text-xs sm:text-sm text-slate-700 font-medium py-3 px-4">{leave.days} day{leave.days !== 1 ? 's' : ''}</TableCell>
                                                                    <TableCell className="py-3 px-4">{getLeaveStatusBadge(leave.status)}</TableCell>
                                                                    <TableCell className="text-xs text-slate-500 py-3 px-4">
                                                                        <div className="max-w-[200px] sm:max-w-xs truncate" title={leave.reason || ''}>
                                                                            {leave.reason || '-'}
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                                                                    No leave applications found for the selected period
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* Movement Tab */}
                            <TabsContent value="movement">
                                <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
                                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100">
                                                    <Briefcase className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-bold text-slate-800">Movement Records</CardTitle>
                                                    <CardDescription className="text-xs text-slate-500">Official and personal movements during the selected period</CardDescription>
                                                </div>
                                            </div>
                                            {movementData.length > 0 && (
                                                <Button onClick={downloadMovementPdf} variant="outline" size="sm" className="h-8 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 text-xs py-1">
                                                    <Download className="mr-1 h-3.5 w-3.5" />
                                                    Export PDF
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table className="min-w-[800px]">
                                                <TableHeader className="bg-slate-50/75">
                                                    <TableRow className="border-b border-slate-100">
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Type</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Purpose</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Time Period</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Duration</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Destination</TableHead>
                                                        <TableHead className="text-xs font-bold text-slate-500 py-3 px-4">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {movementData.length > 0 ? (
                                                        movementData.map((movement, index) => (
                                                            <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                                <TableCell className="py-3 px-4">{getMovementTypeBadge(movement.type)}</TableCell>
                                                                <TableCell className="font-semibold text-xs sm:text-sm text-slate-700 py-3 px-4">
                                                                    <div className="max-w-[200px] sm:max-w-xs truncate" title={movement.purpose}>
                                                                        {movement.purpose}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-3 px-4">
                                                                    <div className="flex items-center text-xs text-slate-600 gap-1.5">
                                                                        <Timer className="h-4 w-4 text-slate-400 shrink-0" />
                                                                        <div>
                                                                            <span className="truncate">{movement.formatted_time_range}</span>
                                                                            {movement.status === 'active' && (
                                                                                <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                                                                    (In Progress)
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-xs sm:text-sm text-slate-700 py-3 px-4">
                                                                    <div>
                                                                        {movement.duration_hours} hours
                                                                        {movement.status === 'completed' && movement.actual_return_datetime && (
                                                                            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                                                                (Actual duration)
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-3 px-4">
                                                                    <div className="flex items-center text-xs text-slate-600 gap-1.5">
                                                                        {movement.destination ? (
                                                                            <>
                                                                                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                                                                                <span className="truncate">{movement.destination}</span>
                                                                            </>
                                                                        ) : (
                                                                            '-'
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-3 px-4">{getMovementStatusBadge(movement.status)}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                                                                No movement records found for the selected period
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </>
                )}

                {/* Empty State */}
                {!selectedEmployee && (
                    <div className="flex flex-col items-center justify-center bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center">
                        <div className="rounded-2xl bg-emerald-50 p-4 mb-4 ring-1 ring-emerald-100/50 shrink-0">
                            <User className="h-10 w-10 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Select an Employee</h2>
                        <p className="text-xs text-slate-500 mb-6 max-w-sm leading-relaxed">
                            Choose an employee and a date range to load their comprehensive attendance, leave, and movement data.
                        </p>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
