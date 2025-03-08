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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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
  CalendarIcon,
  Download,
  Eye,
  FilePieChart,
  Printer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface Department {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: Department;
  designation: {
    id: number;
    name: string;
  };
}

interface LeaveType {
  id: number;
  name: string;
}

interface LeaveApplication {
  id: number;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applied_at: string;
  employee: Employee;
  leaveType: LeaveType;
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

interface ApplicationsResponse {
  data: LeaveApplication[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface SummaryStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
  totalDays: number;
}

interface ReportProps {
  applications: ApplicationsResponse;
  departments: Department[];
  leaveTypes: LeaveType[];
  employees: Employee[];
  filters: {
    start_date: string;
    end_date: string;
    status: string;
    department_id: string;
    leave_type_id: string;
    employee_id: string;
  };
  startDate: string;
  endDate: string;
  summary: SummaryStats;
}

export default function Report({
  applications,
  departments,
  leaveTypes,
  employees,
  filters,
  startDate,
  endDate,
  summary
}: ReportProps) {
  const [status, setStatus] = useState(filters.status || 'all');
  const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');
  const [leaveTypeId, setLeaveTypeId] = useState(filters.leave_type_id || 'all');
  const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.start_date ? new Date(filters.start_date) : new Date(startDate)
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.end_date ? new Date(filters.end_date) : new Date(endDate)
  );
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  // Prepare data for charts
  const statusData = [
    { name: 'Approved', value: summary.approved, color: '#22c55e' },
    { name: 'Pending', value: summary.pending, color: '#eab308' },
    { name: 'Rejected', value: summary.rejected, color: '#ef4444' },
    { name: 'Cancelled', value: summary.cancelled || 0, color: '#6b7280' }
  ];

  // Aggregate leaves by department
  const departmentData = applications.data.reduce((acc, app) => {
    const dept = app.employee.department.name;
    const existingDept = acc.find(d => d.name === dept);

    if (existingDept) {
      existingDept.value += app.days;
    } else {
      acc.push({ name: dept, value: app.days });
    }

    return acc;
  }, [] as { name: string, value: number }[]);

  // Aggregate leaves by type
  const leaveTypeData = applications.data.reduce((acc, app) => {
    const type = app.leaveType.name;
    const existingType = acc.find(t => t.name === type);

    if (existingType) {
      existingType.value += app.days;
    } else {
      acc.push({ name: type, value: app.days });
    }

    return acc;
  }, [] as { name: string, value: number }[]);

  const handleSearch = () => {
    router.get(route('leave.applications.report'), {
      status: status === 'all' ? '' : status,
      department_id: departmentId === 'all' ? '' : departmentId,
      leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId,
      employee_id: employeeId === 'all' ? '' : employeeId,
      start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
      end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
    }, { preserveState: true });
  };

  const resetFilters = () => {
    setStatus('all');
    setDepartmentId('all');
    setLeaveTypeId('all');
    setEmployeeId('all');

    // Keep date filters as they are essential for the report
    router.get(route('leave.applications.report'), {
      start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
      end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'cancelled': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <Badge variant="outline" className={statusStyles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadCSV = () => {
    // Generate CSV content
    const headers = ['Employee', 'Employee ID', 'Department', 'Leave Type', 'From', 'To', 'Days', 'Status'];
    const dataRows = applications.data.map(app => [
      `${app.employee.first_name} ${app.employee.last_name}`,
      app.employee.employee_id,
      app.employee.department.name,
      app.leaveType.name,
      app.start_date,
      app.end_date,
      app.days,
      app.status
    ]);

    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => row.join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border shadow-sm">
          <p className="font-medium">{payload[0].name}: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <Head title="Leave Report" />

      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Report</h1>
            <p className="mt-1 text-gray-500">
              Analysis of leave applications for the selected period
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex space-x-2">
            <Button variant="outline" onClick={handlePrint} className="flex items-center">
              <Printer className="mr-1 h-4 w-4" />
              Print Report
            </Button>

            <Button variant="outline" onClick={downloadCSV} className="flex items-center">
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>

            <Link href={route('leave.applications.index')}>
              <Button variant="outline" className="flex items-center">
                <Eye className="mr-1 h-4 w-4" />
                View Applications
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 print:hidden">
          <CardHeader className="pb-3">
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Filter leave data by date range, status, department or employee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={(date) => {
                        setToDate(date);
                        setToDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Select
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                >
                  <SelectTrigger>
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
              </div>

              <div>
                <Select
                  value={leaveTypeId}
                  onValueChange={setLeaveTypeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Leave Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leave Types</SelectItem>
                    {leaveTypes.map((leaveType) => (
                      <SelectItem key={leaveType.id} value={leaveType.id.toString()}>
                        {leaveType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={employeeId}
                  onValueChange={setEmployeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <Button onClick={handleSearch}>
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <FilePieChart className="mr-2 h-5 w-5 text-blue-500" />
              <CardTitle>Summary</CardTitle>
            </div>
            <CardDescription>Leave statistics for {fromDate && toDate ? `${format(fromDate, 'MMM d, yyyy')} - ${format(toDate, 'MMM d, yyyy')}` : 'the selected period'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-medium text-blue-600 uppercase">Total Applications</p>
                <p className="mt-2 text-2xl font-bold text-blue-700">{summary.total}</p>
              </div>

              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-green-600 uppercase">Approved</p>
                <p className="mt-2 text-2xl font-bold text-green-700">{summary.approved}</p>
              </div>

              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-xs font-medium text-yellow-600 uppercase">Pending</p>
                <p className="mt-2 text-2xl font-bold text-yellow-700">{summary.pending}</p>
              </div>

              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-medium text-red-600 uppercase">Rejected</p>
                <p className="mt-2 text-2xl font-bold text-red-700">{summary.rejected}</p>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <p className="text-xs font-medium text-purple-600 uppercase">Total Leave Days</p>
                <p className="mt-2 text-2xl font-bold text-purple-700">{summary.totalDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave Days by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Days" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Applications</CardTitle>
            <CardDescription>
              Showing data from {format(fromDate || new Date(startDate), 'PPP')} to {format(toDate || new Date(endDate), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.data && applications.data.length > 0 ? (
                  applications.data.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="font-medium">
                          {application.employee.first_name} {application.employee.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {application.employee.employee_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {application.employee.department.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{application.leaveType.name}</TableCell>
                      <TableCell>{format(new Date(application.start_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(application.end_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{application.days}</TableCell>
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
                      <TableCell className="text-right print:hidden">
                        <Link href={route('leave.applications.show', application.id)}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No leave applications found for the selected period.
                      {(status !== 'all' || departmentId !== 'all' || leaveTypeId !== 'all' || employeeId !== 'all') && (
                        <Button
                          variant="link"
                          onClick={resetFilters}
                          className="px-2 font-normal"
                        >
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {applications.meta && applications.meta.last_page > 1 && (
          <div className="mt-6 print:hidden">
            <Pagination>
              <PaginationContent>
                {applications.meta.current_page > 1 && applications.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={applications.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(applications.links.prev || '', {
                          search: '',
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId,
                          employee_id: employeeId === 'all' ? '' : employeeId,
                          start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                          end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {applications.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                              search: '',
                              status: status === 'all' ? '' : status,
                              department_id: departmentId === 'all' ? '' : departmentId,
                              leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId,
                              employee_id: employeeId === 'all' ? '' : employeeId,
                              start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                              end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {applications.meta.current_page < applications.meta.last_page && applications.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={applications.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(applications.links.next || '', {
                          search: '',
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId,
                          employee_id: employeeId === 'all' ? '' : employeeId,
                          start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                          end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </Layout>
  );
}
