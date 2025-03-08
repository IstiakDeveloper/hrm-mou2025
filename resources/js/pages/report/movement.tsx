import React, { useState } from 'react';
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
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeftRight,
  Briefcase,
  User,
  Clock3,
  ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Movement {
  id: number;
  employee_id: number;
  movement_type: 'official' | 'personal';
  purpose: string;
  from_datetime: string;
  to_datetime: string;
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
  approver: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
}

interface Department {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
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

interface MovementResponse {
  data: Movement[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface MovementReportProps {
  movements: MovementResponse;
  departments: Department[];
  employees: Employee[];
  filters: {
    start_date?: string;
    end_date?: string;
    status?: string;
    department_id?: string;
    movement_type?: string;
    employee_id?: string;
  };
  startDate: string;
  endDate: string;
  summary: {
    total: number;
    official: number;
    personal: number;
    approved: number;
    rejected: number;
    pending: number;
    completed: number;
  };
  movementTypes: string[];
}

export default function MovementReport({
  movements,
  departments,
  employees,
  filters,
  startDate,
  endDate,
  summary,
  movementTypes
}: MovementReportProps) {
  // Local state for filters
  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.start_date ? parseISO(filters.start_date) : parseISO(startDate)
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.end_date ? parseISO(filters.end_date) : parseISO(endDate)
  );
  const [status, setStatus] = useState(filters.status || 'all');
  const [department, setDepartment] = useState(filters.department_id || 'all');
  const [movementType, setMovementType] = useState(filters.movement_type || 'all');
  const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
  const [expandedView, setExpandedView] = useState(false);

  // Handle filter application
  const applyFilters = () => {
    router.get(route('reports.movement'), {
      start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
      end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
      status: status !== 'all' ? status : '',
      department_id: department !== 'all' ? department : '',
      movement_type: movementType !== 'all' ? movementType : '',
      employee_id: employeeId !== 'all' ? employeeId : '',
    }, { preserveState: true });
  };

  // Reset filters
  const resetFilters = () => {
    setFromDate(parseISO(startDate));
    setToDate(parseISO(endDate));
    setStatus('all');
    setDepartment('all');
    setMovementType('all');
    setEmployeeId('all');

    router.get(route('reports.movement'), {}, { preserveState: true });
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

  // Get movement type badge
  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'official':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Official</Badge>;
      case 'personal':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Personal</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Export handlers
  const handleExportPdf = () => {
    router.post(route('reports.export-pdf'), {
      report_type: 'movement',
      ...filters
    });
  };

  const handleExportExcel = () => {
    router.post(route('reports.export-excel'), {
      report_type: 'movement',
      ...filters
    });
  };

  // Calculate percentages for visualization
  const totalMovements = summary.total || 1; // Avoid division by zero
  const officialPercentage = Math.round((summary.official / totalMovements) * 100);
  const personalPercentage = Math.round((summary.personal / totalMovements) * 100);

  const totalStatuses = summary.approved + summary.rejected + summary.pending + summary.completed || 1;
  const approvedPercentage = Math.round((summary.approved / totalStatuses) * 100);
  const rejectedPercentage = Math.round((summary.rejected / totalStatuses) * 100);
  const pendingPercentage = Math.round((summary.pending / totalStatuses) * 100);
  const completedPercentage = Math.round((summary.completed / totalStatuses) * 100);

  return (
    <Layout>
      <Head title="Movement Report" />

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Movement Report</h1>
            <p className="mt-1 text-gray-500">
              Track and analyze employee movements during work hours
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
                <span className="text-sm font-medium text-gray-500">Total Movements</span>
                <span className="text-3xl font-bold">{summary.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-purple-700">Official</span>
                <span className="text-3xl font-bold text-purple-700">{summary.official}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-orange-700">Personal</span>
                <span className="text-3xl font-bold text-orange-700">{summary.personal}</span>
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

          <Card className="bg-green-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-green-700">Approved</span>
                <span className="text-3xl font-bold text-green-700">{summary.approved}</span>
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
          {/* Movement Type Distribution */}
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>Movement Type Distribution</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center text-xs"
                  onClick={() => setExpandedView(!expandedView)}
                >
                  {expandedView ? 'Simple View' : 'Detailed View'}
                  <ChevronDown className={cn(
                    "ml-1 h-4 w-4 transition-transform",
                    expandedView && "rotate-180"
                  )} />
                </Button>
              </div>
              <CardDescription>
                Distribution of movement requests by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expandedView ? (
                // Detailed view with comparison bars
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center mb-4">
                    <h3 className="text-sm font-medium mb-2">Comparison of Movement Types</h3>
                    <div className="w-full max-w-md">
                      <div className="flex items-center mb-2">
                        <div className="w-24 text-sm text-right pr-2">Official</div>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full flex items-center justify-end px-2"
                            style={{ width: `${officialPercentage}%` }}
                          >
                            <span className="text-xs font-medium text-white">{summary.official}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center mb-2">
                        <div className="w-24 text-sm text-right pr-2">Personal</div>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full flex items-center justify-end px-2"
                            style={{ width: `${personalPercentage}%` }}
                          >
                            <span className="text-xs font-medium text-white">{summary.personal}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="flex items-baseline space-x-1">
                      <div
                        className="w-16 bg-purple-500 rounded-md"
                        style={{ height: `${officialPercentage * 2}px`, maxHeight: '150px', minHeight: '20px' }}
                      ></div>
                      <div
                        className="w-16 bg-orange-500 rounded-md"
                        style={{ height: `${personalPercentage * 2}px`, maxHeight: '150px', minHeight: '20px' }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                      <span className="text-sm">Official ({officialPercentage}%)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
                      <span className="text-sm">Personal ({personalPercentage}%)</span>
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
                    {totalMovements > 0 && (
                      <div
                        className="absolute inset-0 rounded-full border-8"
                        style={{
                          borderColor: 'transparent',
                          background: `conic-gradient(
                            #9333ea 0% ${officialPercentage}%,
                            #f97316 ${officialPercentage}% 100%
                          )`
                        }}
                      ></div>
                    )}

                    {/* Center hole */}
                    <div className="absolute inset-0 m-4 rounded-full bg-white flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold">{summary.total}</div>
                        <div className="text-xs text-gray-500">Movements</div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex gap-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
                      <span className="text-sm">Official ({summary.official})</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
                      <span className="text-sm">Personal ({summary.personal})</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>
                Distribution of movement requests by status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                        <span>Approved</span>
                      </div>
                      <span>{summary.approved} ({approvedPercentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${approvedPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                        <span>Pending</span>
                      </div>
                      <span>{summary.pending} ({pendingPercentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${pendingPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                        <span>Rejected</span>
                      </div>
                      <span>{summary.rejected} ({rejectedPercentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${rejectedPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                        <span>Completed</span>
                      </div>
                      <span>{summary.completed} ({completedPercentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${completedPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Vertical bar chart */}
                <div className="flex justify-center items-end h-32 mt-8 gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 bg-yellow-500 rounded-t-md"
                      style={{ height: `${pendingPercentage * 1}px`, minHeight: '10px' }}
                    ></div>
                    <span className="text-xs mt-1">Pending</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 bg-green-500 rounded-t-md"
                      style={{ height: `${approvedPercentage * 1}px`, minHeight: '10px' }}
                    ></div>
                    <span className="text-xs mt-1">Approved</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 bg-red-500 rounded-t-md"
                      style={{ height: `${rejectedPercentage * 1}px`, minHeight: '10px' }}
                    ></div>
                    <span className="text-xs mt-1">Rejected</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 bg-blue-500 rounded-t-md"
                      style={{ height: `${completedPercentage * 1}px`, minHeight: '10px' }}
                    ></div>
                    <span className="text-xs mt-1">Completed</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Movement Analysis Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Movement Analysis</CardTitle>
            <CardDescription>
              Insights and statistics about employee movements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Type ratio */}
              <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium">Type Ratio</h3>
                  <p className="text-xs text-gray-500 mt-1">Official vs Personal</p>
                </div>
                <div className="flex items-center">
                  <div className="flex-none w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-orange-500 text-white font-bold">
                    {officialPercentage > 0 && personalPercentage > 0
                      ? `${Math.round(summary.official / summary.personal * 10) / 10 || 0}:1`
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>

              {/* Approval Rate */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium">Approval Rate</h3>
                <div className="flex items-center mt-2">
                  <div className="w-full h-2 bg-gray-200 rounded-full mr-2">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${approvedPercentage + completedPercentage}%` }}
                    ></div>
                  </div>
                  <span className="flex-none text-sm font-medium">{approvedPercentage + completedPercentage}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.approved + summary.completed} of {summary.total} movements approved
                </p>
              </div>

              {/* Average Response Time */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium">Status Distribution</h3>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                      {Math.round(pendingPercentage)}%
                    </div>
                    <span className="mt-1">Pending</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-700">
                      {Math.round(approvedPercentage)}%
                    </div>
                    <span className="mt-1">Approved</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-700">
                      {Math.round(rejectedPercentage)}%
                    </div>
                    <span className="mt-1">Rejected</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      {Math.round(completedPercentage)}%
                    </div>
                    <span className="mt-1">Completed</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </CardTitle>
            <CardDescription>Filter movement records by date range, type, status, department, or employee</CardDescription>
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
                <label className="text-sm font-medium">Movement Type</label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {movementTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>
          </CardContent>
        </Card>

        {/* Movements Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Approver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.data.length > 0 ? (
                  movements.data.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">
                        {movement.employee.first_name} {movement.employee.last_name}
                        <div className="text-xs text-gray-500">{movement.employee.employee_id}</div>
                      </TableCell>
                      <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                      <TableCell className="max-w-xs truncate">{movement.purpose}</TableCell>
                      <TableCell>{format(parseISO(movement.from_datetime), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>{format(parseISO(movement.to_datetime), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>{getStatusBadge(movement.status)}</TableCell>
                      <TableCell>{movement.employee.department.name}</TableCell>
                      <TableCell>
                        {movement.approver ? (
                          `${movement.approver.first_name} ${movement.approver.last_name}`
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
                        <ArrowLeftRight className="h-12 w-12 text-gray-400 mb-2" />
                        <p>No movement records found for the selected criteria.</p>
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
        {movements.meta && movements.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {movements.meta.current_page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={movements.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(movements.links.prev || '', filters, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {movements.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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

                {movements.meta.current_page < movements.meta.last_page && (
                  <PaginationItem>
                    <PaginationNext
                      href={movements.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(movements.links.next || '', filters, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Movement Duration Analysis */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Movement Duration Analysis</CardTitle>
            <CardDescription>
              Analysis of time spent on movements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Duration Distribution */}
              <div>
                <h3 className="text-sm font-medium mb-3">Duration Distribution</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Less than 1 hour</span>
                      <span>35%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>1-2 hours</span>
                      <span>42%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>2-4 hours</span>
                      <span>15%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Over 4 hours</span>
                      <span>8%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '8%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type Comparison */}
              <div>
                <h3 className="text-sm font-medium mb-3">Movement Type Comparison</h3>
                <div className="flex items-stretch space-x-8 h-40">
                  {/* Official movements column */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-sm text-center mb-2">Official</div>
                    <div className="relative w-full flex-1 bg-gray-100 rounded-md overflow-hidden">
                      <div className="absolute bottom-0 w-full bg-purple-500" style={{ height: `${officialPercentage}%` }}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-white bg-purple-700 bg-opacity-70 px-2 py-1 rounded">
                          {summary.official} movements
                        </span>
                      </div>
                    </div>
                    <div className="text-sm mt-2">{officialPercentage}%</div>
                  </div>

                  {/* Personal movements column */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-sm text-center mb-2">Personal</div>
                    <div className="relative w-full flex-1 bg-gray-100 rounded-md overflow-hidden">
                      <div className="absolute bottom-0 w-full bg-orange-500" style={{ height: `${personalPercentage}%` }}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-white bg-orange-700 bg-opacity-70 px-2 py-1 rounded">
                          {summary.personal} movements
                        </span>
                      </div>
                    </div>
                    <div className="text-sm mt-2">{personalPercentage}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time of Day Stats */}
            <div className="mt-8">
              <h3 className="text-sm font-medium mb-3">Movement by Time of Day</h3>
              <div className="flex items-end justify-between h-24 bg-gray-50 rounded-lg p-4">
                {/* Morning */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 bg-blue-400 rounded-t-md"
                    style={{ height: '70px' }}
                  ></div>
                  <span className="text-xs mt-1">Morning</span>
                  <span className="text-xs text-gray-500">28%</span>
                </div>

                {/* Mid-day */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 bg-blue-500 rounded-t-md"
                    style={{ height: '40px' }}
                  ></div>
                  <span className="text-xs mt-1">Mid-day</span>
                  <span className="text-xs text-gray-500">16%</span>
                </div>

                {/* Afternoon */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 bg-blue-600 rounded-t-md"
                    style={{ height: '90px' }}
                  ></div>
                  <span className="text-xs mt-1">Afternoon</span>
                  <span className="text-xs text-gray-500">36%</span>
                </div>

                {/* Evening */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 bg-blue-700 rounded-t-md"
                    style={{ height: '50px' }}
                  ></div>
                  <span className="text-xs mt-1">Evening</span>
                  <span className="text-xs text-gray-500">20%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
