<<<<<<< HEAD
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
=======
import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
>>>>>>> feature/flutter-mobile-app
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
<<<<<<< HEAD
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
=======
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
>>>>>>> feature/flutter-mobile-app
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
<<<<<<< HEAD
    SelectValue
=======
    SelectValue,
>>>>>>> feature/flutter-mobile-app
} from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
<<<<<<< HEAD
    PaginationPrevious
} from '@/components/ui/pagination';
import {
    Calendar as CalendarIcon,
    Filter,
    Download,
    RefreshCcw,
    FileDown,
    FileBarChart2,
    Building,
    ArrowRight,
    Users,
    Calendar as CalendarFull,
    ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
=======
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Filter, Printer, RefreshCcw, FileBarChart2, Building2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
>>>>>>> feature/flutter-mobile-app

interface Transfer {
    id: number;
    employee_id: number;
    effective_date: string;
<<<<<<< HEAD
    reason: string;
    from_branch_id: number;
    to_branch_id: number;
    from_department_id: number;
    to_department_id: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    employee: {
        id: number;
        employee_id: string;
        first_name: string;
        last_name: string;
        department: {
            id: number;
            name: string;
        };
        designation: {
            id: number;
            name: string;
        };
    };
    fromBranch: {
        id: number;
        name: string;
    };
    toBranch: {
        id: number;
        name: string;
    };
    fromDepartment: {
        id: number;
        name: string;
    };
    toDepartment: {
        id: number;
        name: string;
    };
    approver: {
        id: number;
        first_name: string;
        last_name: string;
    } | null;
=======
    reason: string | null;
    transfer_order_no?: string | null;
    from_branch_id: number;
    to_branch_id: number;
    status: string;
    employee: EmployeeNameFields & {
        id: number;
        employee_id: string;
        department?: { id: number; name: string } | null;
        designation?: { id: number; name: string } | null;
    };
    fromBranch: { id: number; name: string } | null;
    toBranch: { id: number; name: string } | null;
    fromDepartment?: { id: number; name: string } | null;
    toDepartment?: { id: number; name: string } | null;
    approver: { id: number; name?: string; first_name?: string; last_name?: string } | null;
}

interface BranchFlowRow {
    id: number;
    name: string;
    outgoing: number;
    incoming: number;
    total: number;
>>>>>>> feature/flutter-mobile-app
}

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

<<<<<<< HEAD
interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
=======
interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
>>>>>>> feature/flutter-mobile-app
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

interface TransferResponse {
    data: Transfer[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface TransferReportProps {
    transfers: TransferResponse;
    departments: Department[];
    branches: Branch[];
    employees: Employee[];
<<<<<<< HEAD
=======
    branchFlow: BranchFlowRow[];
>>>>>>> feature/flutter-mobile-app
    filters: {
        start_date?: string;
        end_date?: string;
        status?: string;
        department_id?: string;
        from_branch_id?: string;
        to_branch_id?: string;
        employee_id?: string;
<<<<<<< HEAD
=======
        search?: string;
>>>>>>> feature/flutter-mobile-app
    };
    startDate: string;
    endDate: string;
    summary: {
        total: number;
        approved: number;
        rejected: number;
        pending: number;
        completed: number;
    };
}

<<<<<<< HEAD
=======
function statusBadge(status: string) {
    switch (status) {
        case 'approved':
            return <Badge className="border-0 bg-emerald-600 text-white">Approved</Badge>;
        case 'rejected':
            return <Badge className="border-0 bg-rose-600 text-white">Rejected</Badge>;
        case 'pending':
            return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
        case 'completed':
            return <Badge className="border-0 bg-sky-600 text-white">Completed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

function approverLabel(t: Transfer): string {
    const a = t.approver;
    if (!a) return '—';
    if (a.name) return a.name;
    return employeeDisplayName(a, '—');
}

function branchName(obj: any, kind: 'from' | 'to'): string {
    const camel = kind === 'from' ? obj?.fromBranch : obj?.toBranch;
    const snake = kind === 'from' ? obj?.from_branch : obj?.to_branch;
    return camel?.name ?? snake?.name ?? '—';
}

>>>>>>> feature/flutter-mobile-app
export default function TransferReport({
    transfers,
    departments,
    branches,
    employees,
<<<<<<< HEAD
    filters,
    startDate,
    endDate,
    summary
}: TransferReportProps) {
    // Local state for filters
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.start_date ? parseISO(filters.start_date) : parseISO(startDate)
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.end_date ? parseISO(filters.end_date) : parseISO(endDate)
=======
    branchFlow = [],
    filters,
    startDate,
    endDate,
    summary,
}: TransferReportProps) {
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.start_date ? parseISO(filters.start_date) : parseISO(startDate),
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.end_date ? parseISO(filters.end_date) : parseISO(endDate),
>>>>>>> feature/flutter-mobile-app
    );
    const [status, setStatus] = useState(filters.status || 'all');
    const [department, setDepartment] = useState(filters.department_id || 'all');
    const [fromBranch, setFromBranch] = useState(filters.from_branch_id || 'all');
    const [toBranch, setToBranch] = useState(filters.to_branch_id || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
<<<<<<< HEAD
    const [showDetailed, setShowDetailed] = useState(false);

    // Handle filter application
    const applyFilters = () => {
        router.get(route('reports.transfer'), {
=======
    const [search, setSearch] = useState(filters.search || '');

    const filterPayload = useMemo(
        () => ({
>>>>>>> feature/flutter-mobile-app
            start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            status: status !== 'all' ? status : '',
            department_id: department !== 'all' ? department : '',
            from_branch_id: fromBranch !== 'all' ? fromBranch : '',
            to_branch_id: toBranch !== 'all' ? toBranch : '',
            employee_id: employeeId !== 'all' ? employeeId : '',
<<<<<<< HEAD
        }, { preserveState: true });
    };

    // Reset filters
=======
            search: search.trim(),
        }),
        [fromDate, toDate, status, department, fromBranch, toBranch, employeeId, search],
    );

    const applyFilters = () => {
        router.get(route('reports.transfer'), filterPayload, { preserveState: true });
    };

>>>>>>> feature/flutter-mobile-app
    const resetFilters = () => {
        setFromDate(parseISO(startDate));
        setToDate(parseISO(endDate));
        setStatus('all');
        setDepartment('all');
        setFromBranch('all');
        setToBranch('all');
        setEmployeeId('all');
<<<<<<< HEAD

        router.get(route('reports.transfer'), {}, { preserveState: true });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Export handlers
    const handleExportPdf = () => {
        router.post(route('reports.export-pdf'), {
            report_type: 'transfer',
            ...filters
        });
    };

    const handleExportExcel = () => {
        router.post(route('reports.export-excel'), {
            report_type: 'transfer',
            ...filters
        });
    };

    // Calculate percentages for visualizations
    const totalTransfers = summary.total || 1; // Avoid division by zero
    const approvedPercentage = Math.round((summary.approved / totalTransfers) * 100);
    const rejectedPercentage = Math.round((summary.rejected / totalTransfers) * 100);
    const pendingPercentage = Math.round((summary.pending / totalTransfers) * 100);
    const completedPercentage = Math.round((summary.completed / totalTransfers) * 100);

    // Get branch transfer data for visualization
    // This would typically come from backend aggregation
    // We're mocking some data for visualization purposes
    const branchTransferCounts = branches.reduce((acc, branch) => {
        acc[branch.id] = {
            incoming: Math.floor(Math.random() * 10),
            outgoing: Math.floor(Math.random() * 10)
        };
        return acc;
    }, {} as Record<number, { incoming: number, outgoing: number }>);

    // Get top branches with most transfers
    const topBranches = Object.entries(branchTransferCounts)
        .map(([id, counts]) => ({
            id: Number(id),
            name: branches.find(b => b.id === Number(id))?.name || 'Unknown',
            total: counts.incoming + counts.outgoing
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return (
        <Layout>
            <Head title="Transfer Report" />

            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Transfer Report</h1>
                        <p className="mt-1 text-gray-500">
                            Track and analyze employee transfers between branches and departments
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
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-gray-500">Total Transfers</span>
                                <span className="text-3xl font-bold">{summary.total}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-green-700">Approved</span>
                                <span className="text-3xl font-bold text-green-700">{summary.approved}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-yellow-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-yellow-700">Pending</span>
                                <span className="text-3xl font-bold text-yellow-700">{summary.pending}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-red-700">Rejected</span>
                                <span className="text-3xl font-bold text-red-700">{summary.rejected}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-blue-700">Completed</span>
                                <span className="text-3xl font-bold text-blue-700">{summary.completed}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Status distribution chart */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle>Transfer Status Distribution</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center text-xs"
                                    onClick={() => setShowDetailed(!showDetailed)}
                                >
                                    {showDetailed ? 'Show Simple' : 'Show Detailed'}
                                    <ChevronDown className={cn(
                                        "ml-1 h-4 w-4 transition-transform",
                                        showDetailed && "rotate-180"
                                    )} />
                                </Button>
                            </div>
                            <CardDescription>
                                Distribution of transfers by approval status
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {showDetailed ? (
                                // Detailed view with progress bars
                                <div className="space-y-5">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="flex items-center">
                                                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                                                Pending
                                            </span>
                                            <span>{summary.pending} ({pendingPercentage}%)</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-500 rounded-full flex items-center justify-end pr-2"
                                                style={{ width: `${pendingPercentage}%` }}
                                            >
                                                {pendingPercentage >= 10 && (
                                                    <span className="text-xs font-medium text-white">{pendingPercentage}%</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="flex items-center">
                                                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                                Approved
                                            </span>
                                            <span>{summary.approved} ({approvedPercentage}%)</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full flex items-center justify-end pr-2"
                                                style={{ width: `${approvedPercentage}%` }}
                                            >
                                                {approvedPercentage >= 10 && (
                                                    <span className="text-xs font-medium text-white">{approvedPercentage}%</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="flex items-center">
                                                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                                Rejected
                                            </span>
                                            <span>{summary.rejected} ({rejectedPercentage}%)</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full flex items-center justify-end pr-2"
                                                style={{ width: `${rejectedPercentage}%` }}
                                            >
                                                {rejectedPercentage >= 10 && (
                                                    <span className="text-xs font-medium text-white">{rejectedPercentage}%</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="flex items-center">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                                                Completed
                                            </span>
                                            <span>{summary.completed} ({completedPercentage}%)</span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2"
                                                style={{ width: `${completedPercentage}%` }}
                                            >
                                                {completedPercentage >= 10 && (
                                                    <span className="text-xs font-medium text-white">{completedPercentage}%</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <div className="text-sm font-medium mb-2 text-center">Transfer Processing Rate</div>
                                        <div className="relative pt-2">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Low</span>
                                                <span>Moderate</span>
                                                <span>High</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-100 rounded-full">
                                                <div
                                                    className="absolute h-4 w-4 bg-blue-600 rounded-full -mt-1 border-2 border-white"
                                                    style={{
                                                        left: `${Math.min(
                                                            100,
                                                            ((summary.approved + summary.completed) / (summary.total || 1)) * 100
                                                        )}%`,
                                                        transform: 'translateX(-50%)'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Simple donut chart using CSS
                                <div className="flex flex-col items-center h-64">
                                    <div className="relative w-48 h-48 my-4">
                                        {/* Background circle */}
                                        <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div>

                                        {/* Colored segments */}
                                        {totalTransfers > 0 && (
                                            <div
                                                className="absolute inset-0 rounded-full border-8"
                                                style={{
                                                    borderColor: 'transparent',
                                                    background: `conic-gradient(
                            #eab308 0% ${pendingPercentage}%,
                            #22c55e ${pendingPercentage}% ${pendingPercentage + approvedPercentage}%,
                            #ef4444 ${pendingPercentage + approvedPercentage}% ${pendingPercentage + approvedPercentage + rejectedPercentage}%,
                            #3b82f6 ${pendingPercentage + approvedPercentage + rejectedPercentage}% 100%
                          )`
                                                }}
                                            ></div>
                                        )}

                                        {/* Center hole */}
                                        <div className="absolute inset-0 m-4 rounded-full bg-white flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-lg font-bold">{summary.total}</div>
                                                <div className="text-xs text-gray-500">Transfers</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                                            <span className="text-sm">Pending ({summary.pending})</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                            <span className="text-sm">Approved ({summary.approved})</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                            <span className="text-sm">Rejected ({summary.rejected})</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                                            <span className="text-sm">Completed ({summary.completed})</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Branch Transfer Flow */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Branch Transfer Flow</CardTitle>
                            <CardDescription>
                                Analysis of transfers between branches
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Top Branches */}
                                <div>
                                    <h3 className="text-sm font-medium mb-2">Top Branches with Transfers</h3>
                                    <div className="space-y-2">
                                        {topBranches.map((branch, index) => (
                                            <div key={branch.id}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>{branch.name}</span>
                                                    <span>{branch.total} transfers</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${(branch.total / (topBranches[0].total || 1)) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Branch Flow Visualization */}
                                <div>
                                    <h3 className="text-sm font-medium mb-4">Transfer Flow Visualization</h3>
                                    <div className="relative">
                                        {/* Flow arrows between branches */}
                                        <div className="flex justify-between items-center h-20 my-4">
                                            <div className="w-24 p-2 bg-blue-100 rounded-lg text-center text-sm">
                                                Branch A
                                            </div>

                                            <div className="flex-1 relative">
                                                <div className="absolute top-0 w-full border-t-2 border-blue-400 border-dashed"></div>
                                                <div className="absolute top-1/2 w-full border-t-2 border-green-400 border-dashed -translate-y-1/2"></div>
                                                <div className="absolute bottom-0 w-full border-t-2 border-purple-400 border-dashed"></div>

                                                <div className="absolute right-0 top-0 -mr-2 -mt-2">
                                                    <ArrowRight className="h-4 w-4 text-blue-500" />
                                                </div>
                                                <div className="absolute right-0 top-1/2 -mr-2 -mt-2">
                                                    <ArrowRight className="h-4 w-4 text-green-500" />
                                                </div>
                                                <div className="absolute right-0 bottom-0 -mr-2 -mb-2">
                                                    <ArrowRight className="h-4 w-4 text-purple-500" />
                                                </div>
                                            </div>

                                            <div className="w-24 p-2 bg-green-100 rounded-lg text-center text-sm">
                                                Branch B
                                            </div>
                                        </div>

                                        <div className="text-center text-xs text-gray-500 mt-2">
                                            The arrows represent employee transfers between branches
                                        </div>
                                    </div>
                                </div>

                                {/* Transfer Direction Stats */}
                                <div>
                                    <h3 className="text-sm font-medium mb-2">Transfer Direction</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <div className="font-medium text-blue-800 mb-1">Outgoing</div>
                                            <div className="text-2xl font-bold">48%</div>
                                            <div className="text-xs text-blue-600 mt-1">
                                                Employees leaving branches
                                            </div>
                                        </div>

                                        <div className="bg-green-50 p-3 rounded-lg">
                                            <div className="font-medium text-green-800 mb-1">Incoming</div>
                                            <div className="text-2xl font-bold">52%</div>
                                            <div className="text-xs text-green-600 mt-1">
                                                Employees joining branches
                                            </div>
                                        </div>
                                    </div>
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
                        <CardDescription>Filter transfer records by date range, branches, departments, status, or employee</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date Range</label>
                                <div className="flex gap-2">
                                    <div className="w-1/2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {fromDate ? format(fromDate, 'MMM dd, yyyy') : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={fromDate}
                                                    onSelect={setFromDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-1/2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {toDate ? format(toDate, 'MMM dd, yyyy') : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={toDate}
                                                    onSelect={setToDate}
                                                    initialFocus
                                                    disabled={(date) => date < (fromDate || new Date(2020, 0, 1))}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
=======
        setSearch('');
        router.get(route('reports.transfer'), {}, { preserveState: true });
    };

    const setPresetRange = (from: Date, to: Date) => {
        setFromDate(from);
        setToDate(to);
        router.get(
            route('reports.transfer'),
            {
                start_date: format(from, 'yyyy-MM-dd'),
                end_date: format(to, 'yyyy-MM-dd'),
                status: status !== 'all' ? status : '',
                department_id: department !== 'all' ? department : '',
                from_branch_id: fromBranch !== 'all' ? fromBranch : '',
                to_branch_id: toBranch !== 'all' ? toBranch : '',
                employee_id: employeeId !== 'all' ? employeeId : '',
                search: search.trim(),
            },
            { preserveState: true },
        );
    };

    const handlePrint = () => {
        window.print();
    };

    const maxFlow = useMemo(() => Math.max(1, ...branchFlow.map((b) => b.total)), [branchFlow]);

    return (
        <Layout>
            <Head title="Branch transfer register" />

            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 12mm;
                }
                @media print {
                    html, body { background: #fff !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .print-break { break-inside: avoid; }
                    /* Make the report look like a document */
                    .print-doc {
                        max-width: none !important;
                        padding: 0 !important;
                        background: #fff !important;
                    }
                    .print-card {
                        border: 1px solid #e5e7eb !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    table { border-collapse: collapse !important; width: 100% !important; }
                    th, td { border: 1px solid #e5e7eb !important; padding: 6px 8px !important; vertical-align: top; }
                    th { background: #f8fafc !important; color: #111827 !important; }
                    td { color: #111827 !important; }
                    a { color: #111827 !important; text-decoration: none !important; }
                }
                .print-only { display: none; }
            `}</style>

            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6 print-doc">
                <div className="print-only mb-4 text-sm text-zinc-700">
                    <p className="font-semibold">Branch transfer register</p>
                    <p>
                        Effective date range: {fromDate ? format(fromDate, 'dd MMM yyyy') : '—'} —{' '}
                        {toDate ? format(toDate, 'dd MMM yyyy') : '—'}
                    </p>
                    <p className="text-xs text-zinc-500">Printed {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                </div>

                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between no-print">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Branch transfer register</h1>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
                            Official postings between branches (and departments where recorded). Filters use{' '}
                            <strong>effective date</strong> — the date the transfer takes effect in payroll / attendance scope.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handlePrint}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Print
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={route('reports.index')}>
                                <FileBarChart2 className="mr-1.5 h-3.5 w-3.5" />
                                All reports
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Quick date presets */}
                <div className="no-print mb-4 flex flex-wrap gap-2">
                    <span className="self-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Quick range</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPresetRange(subDays(new Date(), 6), new Date())}
                    >
                        Last 7 days
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPresetRange(subDays(new Date(), 29), new Date())}
                    >
                        Last 30 days
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPresetRange(startOfMonth(new Date()), endOfMonth(new Date()))}
                    >
                        This month
                    </Button>
                </div>

                {/* KPI */}
                <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 print-break">
                    {(
                        [
                            { label: 'Total', value: summary.total, className: 'border-zinc-200' },
                            { label: 'Pending', value: summary.pending, className: 'border-amber-200 bg-amber-50/80' },
                            { label: 'Approved', value: summary.approved, className: 'border-emerald-200 bg-emerald-50/80' },
                            { label: 'Rejected', value: summary.rejected, className: 'border-rose-200 bg-rose-50/80' },
                            { label: 'Completed', value: summary.completed, className: 'border-sky-200 bg-sky-50/80' },
                        ] as const
                    ).map((k) => (
                        <div
                            key={k.label}
                            className={cn(
                                'rounded-xl border bg-white p-3 shadow-sm',
                                k.className,
                            )}
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{k.label}</p>
                            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">{k.value.toLocaleString()}</p>
                        </div>
                    ))}
                </section>

                {/* Branch activity — real data */}
                {branchFlow.length > 0 && (
                    <Card className="mb-6 border-zinc-200/90 shadow-sm print-break">
                        <CardHeader className="border-b border-zinc-100 py-3">
                            <CardTitle className="text-sm font-semibold text-zinc-900">Branch activity in this range</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Outgoing = transfers leaving this branch; incoming = transfers joining this branch (same filters as the table).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-3">
                                {branchFlow.map((b) => (
                                    <div key={b.id}>
                                        <div className="mb-1 flex justify-between text-xs">
                                            <span className="font-medium text-zinc-800">{b.name}</span>
                                            <span className="tabular-nums text-zinc-600">
                                                Out {b.outgoing} · In {b.incoming}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                            <div
                                                className="h-full rounded-full bg-violet-500"
                                                style={{ width: `${Math.min(100, (b.total / maxFlow) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Filters */}
                <Card className="no-print mb-6 border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                            <Filter className="h-4 w-4 text-zinc-500" />
                            Filters
                        </CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Narrow by effective dates, branches, department (employee&apos;s current dept), status, or search (name, PIN,
                            order no., reason).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <label htmlFor="transfer-filter-from" className="text-xs font-medium text-zinc-700">
                                    From (effective)
                                </label>
                                <DatePicker
                                    id="transfer-filter-from"
                                    selected={fromDate ?? null}
                                    onSelect={(d) => {
                                        setFromDate(d ?? undefined);
                                        if (d && toDate && toDate < d) {
                                            setToDate(d);
                                        }
                                    }}
                                    placeholderText="DD-MM-YYYY"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="transfer-filter-to" className="text-xs font-medium text-zinc-700">
                                    To (effective)
                                </label>
                                <DatePicker
                                    id="transfer-filter-to"
                                    selected={toDate ?? null}
                                    onSelect={(d) => setToDate(d ?? undefined)}
                                    placeholderText="DD-MM-YYYY"
                                    minDate={fromDate}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
>>>>>>> feature/flutter-mobile-app
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
<<<<<<< HEAD

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Department</label>
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
=======
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Employee</label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All employees</SelectItem>
                                        {employees.map((e) => (
                                            <SelectItem key={e.id} value={e.id.toString()}>
                                                {e.employee_id} — {employeeDisplayName(e)}
>>>>>>> feature/flutter-mobile-app
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

<<<<<<< HEAD
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Branch</label>
                                <Select value={fromBranch} onValueChange={setFromBranch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Branches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.name}
=======
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Department (employee)</label>
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All departments</SelectItem>
                                        {departments.map((d) => (
                                            <SelectItem key={d.id} value={d.id.toString()}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">From branch</label>
                                <Select value={fromBranch} onValueChange={setFromBranch}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All branches</SelectItem>
                                        {sortPayrollBranches(branches).map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {formatBranchSelectLabel(b)}
>>>>>>> feature/flutter-mobile-app
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
<<<<<<< HEAD

                            <div className="space-y-2">
                                <label className="text-sm font-medium">To Branch</label>
                                <Select value={toBranch} onValueChange={setToBranch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Branches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.name}
=======
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">To branch</label>
                                <Select value={toBranch} onValueChange={setToBranch}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All branches</SelectItem>
                                        {sortPayrollBranches(branches).map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {formatBranchSelectLabel(b)}
>>>>>>> feature/flutter-mobile-app
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
<<<<<<< HEAD

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Employee</label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Employees" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id.toString()}>
                                                {employee.employee_id} - {employee.first_name} {employee.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button onClick={applyFilters} className="flex-1">
                                    Apply Filters
                                </Button>
                                <Button variant="outline" onClick={resetFilters}>
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
=======
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-700">Search</label>
                                <Input
                                    className="h-9 text-xs"
                                    placeholder="Name, PIN, order no., reason…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="h-8 bg-violet-600 text-xs hover:bg-violet-700" onClick={applyFilters}>
                                Apply filters
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={resetFilters}>
                                <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                                Reset
                            </Button>
>>>>>>> feature/flutter-mobile-app
                        </div>
                    </CardContent>
                </Card>

<<<<<<< HEAD
                {/* Transfers Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>From Branch</TableHead>
                                    <TableHead>To Branch</TableHead>
                                    <TableHead>From Department</TableHead>
                                    <TableHead>To Department</TableHead>
                                    <TableHead>Effective Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Approver</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transfers.data.length > 0 ? (
                                    transfers.data.map((transfer) => (
                                        <TableRow key={transfer.id}>
                                            <TableCell className="font-medium">
                                                {transfer.employee.first_name} {transfer.employee.last_name}
                                                <div className="text-xs text-gray-500">{transfer.employee.employee_id}</div>
                                            </TableCell>
                                            <TableCell>{transfer.fromBranch.name}</TableCell>
                                            <TableCell>{transfer.toBranch.name}</TableCell>
                                            <TableCell>{transfer.fromDepartment.name}</TableCell>
                                            <TableCell>{transfer.toDepartment.name}</TableCell>
                                            <TableCell>{format(parseISO(transfer.effective_date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                                            <TableCell>
                                                {transfer.approver ? (
                                                    `${transfer.approver.first_name} ${transfer.approver.last_name}`
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
                                                <ArrowRight className="h-12 w-12 text-gray-400 mb-2" />
                                                <p>No transfer records found for the selected criteria.</p>
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
                {transfers.meta && transfers.meta.last_page > 1 && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {transfers.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={transfers.links.prev || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.prev || '', filters, { preserveState: true });
=======
                {/* Table */}
                <Card id="transfer-report-print" className="border-zinc-200/90 shadow-sm print-card print:border-0 print:shadow-none">
                    <CardHeader className="border-b border-zinc-100 py-3 print:border-zinc-200">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Transfer lines</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Open a row in the transfer module for full history and documents.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                                        <TableHead className="text-xs font-semibold">Employee</TableHead>
                                        <TableHead className="text-xs font-semibold">Order / reason</TableHead>
                                        <TableHead className="text-xs font-semibold">Route</TableHead>
                                        <TableHead className="text-xs font-semibold">Dept change</TableHead>
                                        <TableHead className="text-xs font-semibold">Effective</TableHead>
                                        <TableHead className="text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-xs font-semibold">Approved by</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfers.data.length > 0 ? (
                                        transfers.data.map((t) => (
                                            <TableRow key={t.id} className="text-xs">
                                                <TableCell className="align-top font-medium text-zinc-900">
                                                    <Link
                                                        href={route('transfers.show', t.id)}
                                                        className="hover:text-violet-700 hover:underline"
                                                    >
                                                        {employeeDisplayName(t.employee)}
                                                    </Link>
                                                    <div className="mt-0.5 font-normal text-[10px] text-zinc-500">{t.employee.employee_id}</div>
                                                </TableCell>
                                                <TableCell className="align-top text-zinc-700">
                                                    <div className="font-mono text-[11px]">{t.transfer_order_no || '—'}</div>
                                                    <div className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{t.reason || '—'}</div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <div className="flex flex-wrap items-center gap-1 text-zinc-800">
                                                        <Building2 className="h-3 w-3 shrink-0 text-zinc-400" />
                                                        <span>{branchName(t, 'from')}</span>
                                                        <ArrowRight className="h-3 w-3 shrink-0 text-zinc-400" />
                                                        <span>{branchName(t, 'to')}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top text-zinc-600">
                                                    <div>{t.fromDepartment?.name ?? '—'}</div>
                                                    <div className="text-[10px] text-zinc-400">→ {t.toDepartment?.name ?? '—'}</div>
                                                </TableCell>
                                                <TableCell className="align-top whitespace-nowrap tabular-nums text-zinc-700">
                                                    {format(parseISO(t.effective_date), 'dd MMM yyyy')}
                                                </TableCell>
                                                <TableCell className="align-top">{statusBadge(t.status)}</TableCell>
                                                <TableCell className="align-top text-zinc-600">{approverLabel(t)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-28 text-center text-xs text-zinc-500">
                                                No transfers match these filters. Try widening the date range or clearing search.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {transfers.meta && transfers.meta.last_page > 1 && (
                    <div className="no-print mt-6">
                        <Pagination>
                            <PaginationContent>
                                {transfers.meta.current_page > 1 && transfers.links.prev && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={transfers.links.prev}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.prev!, {}, { preserveState: true });
>>>>>>> feature/flutter-mobile-app
                                            }}
                                        />
                                    </PaginationItem>
                                )}

<<<<<<< HEAD
                                {transfers.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                                                        router.get(link.url, filters, { preserveState: true });
                                                    }
                                                }}
                                            >
                                                {link.label}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {transfers.meta.current_page < transfers.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={transfers.links.next || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.next || '', filters, { preserveState: true });
=======
                                {transfers.meta.links
                                    .filter((link) => !link.label.includes('&laquo;') && !link.label.includes('&raquo;'))
                                    .map((link, i) => {
                                        const isPageNumber = !Number.isNaN(Number(link.label));
                                        if (!isPageNumber && link.label === '...') {
                                            return (
                                                <PaginationItem key={`e-${i}`}>
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
                                                        if (link.url) router.get(link.url, {}, { preserveState: true });
                                                    }}
                                                >
                                                    {link.label}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}

                                {transfers.meta.current_page < transfers.meta.last_page && transfers.links.next && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={transfers.links.next}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.next!, {}, { preserveState: true });
>>>>>>> feature/flutter-mobile-app
                                            }}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
<<<<<<< HEAD

                {/* Transfer Trends Analysis */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Transfer Trends & Insights</CardTitle>
                        <CardDescription>
                            Analysis of transfer patterns and trends
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Department Transfers Heatmap */}
                            <div>
                                <h3 className="text-sm font-medium mb-3">Inter-Department Transfer Heatmap</h3>
                                <div className="overflow-x-auto">
                                    <div className="min-w-max bg-gray-50 p-4 rounded-lg">
                                        <table className="min-w-full text-xs">
                                            <thead>
                                                <tr>
                                                    <th className="py-1 px-2"></th>
                                                    <th className="py-1 px-2">HR</th>
                                                    <th className="py-1 px-2">Finance</th>
                                                    <th className="py-1 px-2">IT</th>
                                                    <th className="py-1 px-2">Sales</th>
                                                    <th className="py-1 px-2">Operations</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="py-1 px-2 font-medium">HR</td>
                                                    <td className="py-1 px-2 bg-blue-100 text-center">-</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">3</td>
                                                    <td className="py-1 px-2 bg-blue-300 text-center">5</td>
                                                    <td className="py-1 px-2 bg-blue-500 text-center text-white">8</td>
                                                    <td className="py-1 px-2 bg-blue-400 text-center text-white">6</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1 px-2 font-medium">Finance</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">2</td>
                                                    <td className="py-1 px-2 bg-blue-100 text-center">-</td>
                                                    <td className="py-1 px-2 bg-blue-300 text-center">4</td>
                                                    <td className="py-1 px-2 bg-blue-300 text-center">5</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">3</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1 px-2 font-medium">IT</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">2</td>
                                                    <td className="py-1 px-2 bg-blue-100 text-center">1</td>
                                                    <td className="py-1 px-2 bg-blue-100 text-center">-</td>
                                                    <td className="py-1 px-2 bg-blue-300 text-center">5</td>
                                                    <td className="py-1 px-2 bg-blue-400 text-center text-white">7</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1 px-2 font-medium">Sales</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">2</td>
                                                    <td className="py-1 px-2 bg-blue-300 text-center">4</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">3</td>
                                                    <td className="py-1 px-2 bg-blue-100 text-center">-</td>
                                                    <td className="py-1 px-2 bg-blue-400 text-center text-white">6</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1 px-2 font-medium">Operations</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">3</td>
                                                    <td className="py-1 px-2 bg-blue-200 text-center">2</td>
                                                    <td className="py-1 px-2 bg-blue-400 text-center text-white">7</td>
                                                    <td className="py-1 px-2 bg-blue-300 text-center">5</td>
                                                    <td className="py-1 px-2 bg-blue-100 text-center">-</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className="text-center text-xs mt-2 text-gray-500">
                                            Rows represent source departments, columns represent destination departments
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transfer Timeline */}
                            <div>
                                <h3 className="text-sm font-medium mb-3">Monthly Transfer Trend</h3>
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-10 text-xs text-right pr-1">Jan</span>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-sm"
                                                style={{ width: '35%' }}
                                            ></div>
                                        </div>
                                        <span className="w-8 text-xs text-right pl-1">7</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-10 text-xs text-right pr-1">Feb</span>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-sm"
                                                style={{ width: '30%' }}
                                            ></div>
                                        </div>
                                        <span className="w-8 text-xs text-right pl-1">6</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-10 text-xs text-right pr-1">Mar</span>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-sm"
                                                style={{ width: '50%' }}
                                            ></div>
                                        </div>
                                        <span className="w-8 text-xs text-right pl-1">10</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-10 text-xs text-right pr-1">Apr</span>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-sm"
                                                style={{ width: '40%' }}
                                            ></div>
                                        </div>
                                        <span className="w-8 text-xs text-right pl-1">8</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-10 text-xs text-right pr-1">May</span>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-sm"
                                                style={{ width: '65%' }}
                                            ></div>
                                        </div>
                                        <span className="w-8 text-xs text-right pl-1">13</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-10 text-xs text-right pr-1">Jun</span>
                                        <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-sm"
                                                style={{ width: '45%' }}
                                            ></div>
                                        </div>
                                        <span className="w-8 text-xs text-right pl-1">9</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Insights */}
                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-sm font-medium mb-4">Key Insights</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <Users className="h-5 w-5 text-blue-500 mr-2" />
                                        <span className="font-medium">Top Transfer Path</span>
                                    </div>
                                    <p className="text-sm">
                                        HR to Sales department is the most common transfer path, making up 8% of all transfers.
                                    </p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <Building className="h-5 w-5 text-blue-500 mr-2" />
                                        <span className="font-medium">Branch Movement</span>
                                    </div>
                                    <p className="text-sm">
                                        52% of transfers involve employees moving to a different branch location.
                                    </p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <CalendarFull className="h-5 w-5 text-blue-500 mr-2" />
                                        <span className="font-medium">Peak Season</span>
                                    </div>
                                    <p className="text-sm">
                                        May has the highest transfer activity, suggesting a seasonal pattern.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
=======
            </PageSurface>
>>>>>>> feature/flutter-mobile-app
        </Layout>
    );
}
