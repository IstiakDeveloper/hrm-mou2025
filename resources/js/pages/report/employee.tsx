import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import {
    Calendar as CalendarIcon,
    Filter,
    Download,
    RefreshCcw,
    FileDown,
    FileBarChart2,
    Users,
    Building,
    Search,
    Mail,
    Phone,
    CalendarDays,
    User2,
    ChevronDown,
    UserCheck,
    UserMinus,
    UserX,
    Briefcase
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    joining_date: string;
    status: 'active' | 'inactive' | 'on_leave' | 'terminated';
    current_branch_id: number;
    department_id: number;
    designation_id: number;
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
    };
    manager: {
        id: number;
        first_name: string;
        last_name: string;
    } | null;
}

interface Branch {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
    department_id: number;
}

interface DepartmentWithDesignations {
    id: number;
    name: string;
    designations: Designation[];
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

interface EmployeeResponse {
    data: Employee[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface EmployeeReportProps {
    employees: EmployeeResponse;
    branches: Branch[];
    departments: Department[];
    designations: DepartmentWithDesignations[];
    filters: {
        branch_id?: string;
        department_id?: string;
        designation_id?: string;
        status?: string;
        gender?: string;
        join_start_date?: string;
        join_end_date?: string;
        search?: string;
    };
    statuses: string[];
    genders: string[];
    summary: {
        total: number;
        active: number;
        inactive: number;
        onLeave: number;
        terminated: number;
        male: number;
        female: number;
    };
}

export default function EmployeeReport({
    employees,
    branches,
    departments,
    designations,
    filters,
    statuses,
    genders,
    summary
}: EmployeeReportProps) {
    // Local state for filters
    const [search, setSearch] = useState(filters.search || '');
    const [branch, setBranch] = useState(filters.branch_id || 'all');
    const [department, setDepartment] = useState(filters.department_id || 'all');
    const [designation, setDesignation] = useState(filters.designation_id || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [gender, setGender] = useState(filters.gender || 'all');
    const [joinStartDate, setJoinStartDate] = useState<Date | undefined>(
        filters.join_start_date ? parseISO(filters.join_start_date) : undefined
    );
    const [joinEndDate, setJoinEndDate] = useState<Date | undefined>(
        filters.join_end_date ? parseISO(filters.join_end_date) : undefined
    );
    const [showDetailed, setShowDetailed] = useState(false);

    // Get filtered designations based on selected department
    const filteredDesignations = department !== 'all'
        ? designations.find(d => d.id.toString() === department)?.designations || []
        : designations.flatMap(d => d.designations);

    // Handle filter application
    const applyFilters = () => {
        router.get(route('reports.employee'), {
            search,
            branch_id: branch !== 'all' ? branch : '',
            department_id: department !== 'all' ? department : '',
            designation_id: designation !== 'all' ? designation : '',
            status: status !== 'all' ? status : '',
            gender: gender !== 'all' ? gender : '',
            join_start_date: joinStartDate ? format(joinStartDate, 'yyyy-MM-dd') : '',
            join_end_date: joinEndDate ? format(joinEndDate, 'yyyy-MM-dd') : '',
        }, { preserveState: true });
    };

    // Handle search on enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    // Reset filters
    const resetFilters = () => {
        setSearch('');
        setBranch('all');
        setDepartment('all');
        setDesignation('all');
        setStatus('all');
        setGender('all');
        setJoinStartDate(undefined);
        setJoinEndDate(undefined);

        router.get(route('reports.employee'), {}, { preserveState: true });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
            case 'inactive':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactive</Badge>;
            case 'on_leave':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">On Leave</Badge>;
            case 'terminated':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Terminated</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Export handlers
    const handleExportPdf = () => {
        router.post(route('reports.export-pdf'), {
            report_type: 'employee',
            ...filters
        });
    };

    const handleExportExcel = () => {
        router.post(route('reports.export-excel'), {
            report_type: 'employee',
            ...filters
        });
    };

    // Calculate percentages for visualizations
    const totalEmployees = summary.total || 1; // Avoid division by zero

    // Status percentages
    const activePercentage = Math.round((summary.active / totalEmployees) * 100);
    const inactivePercentage = Math.round((summary.inactive / totalEmployees) * 100);
    const onLeavePercentage = Math.round((summary.onLeave / totalEmployees) * 100);
    const terminatedPercentage = Math.round((summary.terminated / totalEmployees) * 100);

    // Calculate other count directly
    const otherCount = summary.total - summary.male - summary.female;

    // Gender percentages
    const malePercentage = Math.round((summary.male / totalEmployees) * 100);
    const femalePercentage = Math.round((summary.female / totalEmployees) * 100);
    const otherPercentage = 100 - malePercentage - femalePercentage;

    return (
        <Layout>
            <Head title="Employee Report" />

            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Employee Report</h1>
                        <p className="mt-1 text-gray-500">
                            View and analyze comprehensive employee data
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportPdf} className="flex items-center">
                            <FileDown className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                        <Button variant="outline" onClick={handleExportExcel} className="flex items-center">
                            <Download className="mr-2 h-4 w-4" />
                            Export Excel
                        </Button>
                        <Link href={route('reports.index')}>
                            <Button variant="outline" className="flex items-center">
                                <FileBarChart2 className="mr-2 h-4 w-4" />
                                All Reports
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-gray-500">Total Employees</span>
                                <span className="text-3xl font-bold">{summary.total}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-green-700">Active</span>
                                <span className="text-3xl font-bold text-green-700">{summary.active}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-gray-700">Inactive</span>
                                <span className="text-3xl font-bold text-gray-700">{summary.inactive}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-blue-700">On Leave</span>
                                <span className="text-3xl font-bold text-blue-700">{summary.onLeave}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-red-700">Terminated</span>
                                <span className="text-3xl font-bold text-red-700">{summary.terminated}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-blue-700">Male</span>
                                <span className="text-3xl font-bold text-blue-700">{summary.male}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-pink-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-pink-700">Female</span>
                                <span className="text-3xl font-bold text-pink-700">{summary.female}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Employee Status Distribution */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle>Employee Status Distribution</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center text-xs"
                                    onClick={() => setShowDetailed(!showDetailed)}
                                >
                                    {showDetailed ? 'Simple View' : 'Detailed View'}
                                    <ChevronDown className={cn(
                                        "ml-1 h-4 w-4 transition-transform",
                                        showDetailed && "rotate-180"
                                    )} />
                                </Button>
                            </div>
                            <CardDescription>
                                Distribution of employees by current status
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {showDetailed ? (
                                // Detailed view with icons and percentages
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col items-center p-4 rounded-lg bg-green-50">
                                            <UserCheck className="h-8 w-8 text-green-500 mb-2" />
                                            <span className="text-lg font-bold">{summary.active}</span>
                                            <span className="text-sm">Active</span>
                                            <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${activePercentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs mt-1">{activePercentage}%</span>
                                        </div>

                                        <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50">
                                            <UserMinus className="h-8 w-8 text-gray-500 mb-2" />
                                            <span className="text-lg font-bold">{summary.inactive}</span>
                                            <span className="text-sm">Inactive</span>
                                            <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                                                <div
                                                    className="h-full bg-gray-500 rounded-full"
                                                    style={{ width: `${inactivePercentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs mt-1">{inactivePercentage}%</span>
                                        </div>

                                        <div className="flex flex-col items-center p-4 rounded-lg bg-blue-50">
                                            <CalendarDays className="h-8 w-8 text-blue-500 mb-2" />
                                            <span className="text-lg font-bold">{summary.onLeave}</span>
                                            <span className="text-sm">On Leave</span>
                                            <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${onLeavePercentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs mt-1">{onLeavePercentage}%</span>
                                        </div>

                                        <div className="flex flex-col items-center p-4 rounded-lg bg-red-50">
                                            <UserX className="h-8 w-8 text-red-500 mb-2" />
                                            <span className="text-lg font-bold">{summary.terminated}</span>
                                            <span className="text-sm">Terminated</span>
                                            <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                                                <div
                                                    className="h-full bg-red-500 rounded-full"
                                                    style={{ width: `${terminatedPercentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs mt-1">{terminatedPercentage}%</span>
                                        </div>
                                    </div>

                                    <div className="text-center text-sm text-gray-500">
                                        Based on total of {summary.total} employees
                                    </div>
                                </div>
                            ) : (
                                // Simple stacked bar chart
                                <div className="flex flex-col items-center h-64">
                                    <div className="w-full h-16 flex mb-4 rounded-lg overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 flex items-center justify-center text-white text-sm font-medium"
                                            style={{ width: `${activePercentage}%` }}
                                        >
                                            {activePercentage >= 15 ? `${activePercentage}%` : ''}
                                        </div>
                                        <div
                                            className="h-full bg-gray-500 flex items-center justify-center text-white text-sm font-medium"
                                            style={{ width: `${inactivePercentage}%` }}
                                        >
                                            {inactivePercentage >= 15 ? `${inactivePercentage}%` : ''}
                                        </div>
                                        <div
                                            className="h-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium"
                                            style={{ width: `${onLeavePercentage}%` }}
                                        >
                                            {onLeavePercentage >= 15 ? `${onLeavePercentage}%` : ''}
                                        </div>
                                        <div
                                            className="h-full bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                                            style={{ width: `${terminatedPercentage}%` }}
                                        >
                                            {terminatedPercentage >= 15 ? `${terminatedPercentage}%` : ''}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                                <span className="text-sm">Active</span>
                                            </div>
                                            <span className="text-lg font-bold">{summary.active}</span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
                                                <span className="text-sm">Inactive</span>
                                            </div>
                                            <span className="text-lg font-bold">{summary.inactive}</span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                                                <span className="text-sm">On Leave</span>
                                            </div>
                                            <span className="text-lg font-bold">{summary.onLeave}</span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                                <span className="text-sm">Terminated</span>
                                            </div>
                                            <span className="text-lg font-bold">{summary.terminated}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Gender Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Gender Distribution</CardTitle>
                            <CardDescription>
                                Distribution of employees by gender
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center h-64">
                                {/* Split-view visualization */}
                                <div className="relative w-64 h-64">
                                    {/* Male side (left) */}
                                    <div className="absolute top-0 left-0 bottom-0 w-1/2 bg-blue-100 rounded-l-full overflow-hidden">
                                        <div
                                            className="absolute bottom-0 w-full bg-blue-500"
                                            style={{ height: `${malePercentage}%` }}
                                        ></div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <Users className="h-8 w-8 text-blue-700 mb-1" />
                                            <div className="text-xl font-bold text-blue-900">{malePercentage}%</div>
                                            <div className="text-sm text-blue-800">Male</div>
                                            <div className="text-xs text-blue-800 mt-1">{summary.male} employees</div>
                                        </div>
                                    </div>

                                    {/* Female side (right) */}
                                    <div className="absolute top-0 right-0 bottom-0 w-1/2 bg-pink-100 rounded-r-full overflow-hidden">
                                        <div
                                            className="absolute bottom-0 w-full bg-pink-500"
                                            style={{ height: `${femalePercentage}%` }}
                                        ></div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <Users className="h-8 w-8 text-pink-700 mb-1" />
                                            <div className="text-xl font-bold text-pink-900">{femalePercentage}%</div>
                                            <div className="text-sm text-pink-800">Female</div>
                                            <div className="text-xs text-pink-800 mt-1">{summary.female} employees</div>
                                        </div>
                                    </div>

                                    {/* Show "Other" category only if there are employees with 'other' gender */}
                                    {otherCount > 0 && (
                                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-2">
                                            <div className="bg-purple-100 px-3 py-1 rounded-full text-center">
                                                <div className="text-xs text-purple-800">Other: {otherPercentage}%</div>
                                                <div className="text-xs text-purple-800">{otherCount} employees</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </CardTitle>
                        <CardDescription>Filter employee records by various criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <Input
                                    placeholder="Search by name, email, or employee ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Branch</label>
                                <Select value={branch} onValueChange={setBranch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Branches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Department</label>
                                <Select value={department} onValueChange={(value) => {
                                    setDepartment(value);
                                    setDesignation('all'); // Reset designation when department changes
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Designation</label>
                                <Select value={designation} onValueChange={setDesignation}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Designations" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Designations</SelectItem>
                                        {filteredDesignations.map((desig) => (
                                            <SelectItem key={desig.id} value={desig.id.toString()}>
                                                {desig.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Gender</label>
                                <Select value={gender} onValueChange={setGender}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Genders" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Genders</SelectItem>
                                        {genders.map((gender) => (
                                            <SelectItem key={gender} value={gender}>
                                                {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Joining Date (From)</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {joinStartDate ? format(joinStartDate, 'MMM dd, yyyy') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={joinStartDate}
                                            onSelect={setJoinStartDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Joining Date (To)</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {joinEndDate ? format(joinEndDate, 'MMM dd, yyyy') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={joinEndDate}
                                            onSelect={setJoinEndDate}
                                            initialFocus
                                            disabled={(date) => date < (joinStartDate || new Date(2000, 0, 1))}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button onClick={applyFilters} className="flex-1">
                                    Apply Filters
                                </Button>
                                <Button variant="outline" onClick={resetFilters}>
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Department and Branch Distribution */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Organizational Distribution</CardTitle>
                        <CardDescription>
                            Distribution of employees across departments and branches
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Department Distribution */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">Department Distribution</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {departments.map(dept => {
                                        // Count employees in this department from the current data set
                                        // Using the first page as a sample since we don't have the full dataset
                                        const deptCount = employees.data.filter(emp => emp.department_id === dept.id).length;
                                        const deptPercentage = (deptCount / employees.data.length) * 100;

                                        return (
                                            <div key={dept.id}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>{dept.name}</span>
                                                    <span>{deptCount} employees</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${deptPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Branch Distribution */}
                            <div>
                                <h3 className="text-sm font-medium mb-2">Branch Distribution</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {branches.map(branch => {
                                        // Count employees in this branch from the current data set
                                        const branchCount = employees.data.filter(emp => emp.current_branch_id === branch.id).length;
                                        const branchPercentage = (branchCount / employees.data.length) * 100;

                                        return (
                                            <div key={branch.id}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>{branch.name}</span>
                                                    <span>{branchCount} employees</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{ width: `${branchPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Employees Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Joining Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Manager</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.data.length > 0 ? (
                                    employees.data.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <User2 className="h-4 w-4 mr-2 text-gray-500" />
                                                    <div>
                                                        <div>{employee.first_name} {employee.last_name}</div>
                                                        <div className="text-xs text-gray-500">{employee.employee_id}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center text-xs">
                                                        <Mail className="h-3 w-3 mr-1 text-gray-500" />
                                                        {employee.email}
                                                    </div>
                                                    <div className="flex items-center text-xs">
                                                        <Phone className="h-3 w-3 mr-1 text-gray-500" />
                                                        {employee.phone}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{employee.department.name}</TableCell>
                                            <TableCell>{employee.designation.name}</TableCell>
                                            <TableCell>{employee.branch.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <CalendarDays className="h-3 w-3 mr-1 text-gray-500" />
                                                    {format(parseISO(employee.joining_date), 'MMM dd, yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(employee.status)}</TableCell>
                                            <TableCell>
                                                {employee.manager ? (
                                                    `${employee.manager.first_name} ${employee.manager.last_name}`
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Users className="h-12 w-12 text-gray-400 mb-2" />
                                                <p>No employees found for the selected criteria.</p>
                                                <Button
                                                    variant="link"
                                                    onClick={resetFilters}
                                                    className="px-2 font-normal mt-2"
                                                >
                                                    Clear filters
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {employees.meta && employees.meta.last_page > 1 && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {employees.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={employees.links.prev || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(employees.links.prev || '', {
                                                    ...filters,
                                                    branch_id: branch !== 'all' ? branch : '',
                                                    department_id: department !== 'all' ? department : '',
                                                    designation_id: designation !== 'all' ? designation : '',
                                                    status: status !== 'all' ? status : '',
                                                    gender: gender !== 'all' ? gender : ''
                                                }, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}

                                {employees.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
                                    const isPageNumber = !isNaN(Number(link.label));

                                    if (!isPageNumber && link.label === '...') {
                                        return (
                                            <PaginationItem key={i}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        );
                                    }

                                    return (
                                        <PaginationItem key={i}>
                                            <PaginationLink
                                                href={link.url || '#'}
                                                isActive={link.active}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (link.url) {
                                                        router.get(link.url, {
                                                            ...filters,
                                                            branch_id: branch !== 'all' ? branch : '',
                                                            department_id: department !== 'all' ? department : '',
                                                            designation_id: designation !== 'all' ? designation : '',
                                                            status: status !== 'all' ? status : '',
                                                            gender: gender !== 'all' ? gender : ''
                                                        }, { preserveState: true });
                                                    }
                                                }}
                                            >
                                                {link.label}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {employees.meta.current_page < employees.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={employees.links.next || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(employees.links.next || '', {
                                                    ...filters,
                                                    branch_id: branch !== 'all' ? branch : '',
                                                    department_id: department !== 'all' ? department : '',
                                                    designation_id: designation !== 'all' ? designation : '',
                                                    status: status !== 'all' ? status : '',
                                                    gender: gender !== 'all' ? gender : ''
                                                }, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Employee Insights */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Employee Insights</CardTitle>
                        <CardDescription>
                            Key metrics and trends about your workforce
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Active Rate */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <UserCheck className="h-5 w-5 text-green-500 mr-2" />
                                    <span className="font-medium">Active Rate</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-full h-2 bg-gray-200 rounded-full mr-2">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${activePercentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{activePercentage}%</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {summary.active} out of {summary.total} employees are currently active
                                </p>
                            </div>

                            {/* Gender Ratio */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                                    <span className="font-medium">Gender Ratio</span>
                                </div>
                                <div className="flex h-5 mb-2">
                                    <div
                                        className="h-full bg-blue-500 text-xs text-white flex items-center justify-center"
                                        style={{ width: `${malePercentage}%` }}
                                    >
                                        {malePercentage >= 15 ? 'Male' : ''}
                                    </div>
                                    <div
                                        className="h-full bg-pink-500 text-xs text-white flex items-center justify-center"
                                        style={{ width: `${femalePercentage}%` }}
                                    >
                                        {femalePercentage >= 15 ? 'Female' : ''}
                                    </div>
                                    {otherCount > 0 && (
                                        <div
                                            className="h-full bg-purple-500 text-xs text-white flex items-center justify-center"
                                            style={{ width: `${otherPercentage}%` }}
                                        >
                                            {otherPercentage >= 15 ? 'Other' : ''}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {malePercentage}% Male, {femalePercentage}% Female
                                    {otherCount > 0 ? `, ${otherPercentage}% Other` : ''}
                                </p>
                            </div>

                            {/* Department Breakdown */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <Briefcase className="h-5 w-5 text-purple-500 mr-2" />
                                    <span className="font-medium">Department Breakdown</span>
                                </div>
                                <div className="text-xs space-y-1">
                                    {departments.slice(0, 3).map(dept => {
                                        const deptCount = employees.data.filter(emp => emp.department_id === dept.id).length;
                                        return (
                                            <div key={dept.id} className="flex justify-between">
                                                <span>{dept.name}</span>
                                                <span>{deptCount} employees</span>
                                            </div>
                                        );
                                    })}
                                    {departments.length > 3 && (
                                        <div className="text-center text-xs text-blue-500 mt-1">
                                            +{departments.length - 3} more departments
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
