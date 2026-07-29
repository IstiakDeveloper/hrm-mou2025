import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Download, ArrowLeft, Search, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { PageSurface } from '@/components/page-surface';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface LeaveType {
  id: number;
  name: string;
  days_allowed: number;
  is_paid: boolean;
  description: string | null;
  carry_forward: boolean;
}

interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  leave_type: LeaveType;
}

interface User {
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
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: User | null;
  applied_at: string;
  documents: string[] | null;
  rejection_reason: string | null;
  leave_type: LeaveType;
  created_at: string;
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
  department: Department;
  designation: Designation;
}

interface Pagination {
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

interface EmployeeLeavesProps {
    employee: Employee;
    leaveBalances: LeaveBalance[];
    leaveTypes: LeaveType[];
    leaveApplications: {
      data: LeaveApplication[];
    } & Pagination;
    currentYear: number;
    filters: {
      start_date: string | null;
      end_date: string | null;
      status: string | null;
      leave_type_id: string | null;
    };
  }

  export default function EmployeeLeaves({
    employee,
    leaveBalances,
    leaveTypes,
    leaveApplications,
    currentYear,
    filters
  }: EmployeeLeavesProps) {
    // State for filters
    const [filterValues, setFilterValues] = useState({
      status: filters.status || 'all',
      leaveType: filters.leave_type_id || 'all',
      startDate: filters.start_date ? new Date(filters.start_date) : null,
      endDate: filters.end_date ? new Date(filters.end_date) : null,
      search: '',
    });

    // Helper function to get status badge for leave applications
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

    // Format date range for leaves
    const formatDateRange = (startDate: string, endDate: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start.toDateString() === end.toDateString()) {
        return format(start, 'PPP');
      }

      return `${format(start, 'PP')} - ${format(end, 'PP')}`;
    };

    // Apply filters
    const applyFilters = () => {
      router.get(route('employees.leaves.index', employee.id), {
        start_date: filterValues.startDate ? format(filterValues.startDate, 'yyyy-MM-dd') : null,
        end_date: filterValues.endDate ? format(filterValues.endDate, 'yyyy-MM-dd') : null,
        status: filterValues.status,
        leave_type_id: filterValues.leaveType,
      }, {
        preserveState: true,
        replace: true,
      });
    };

    // Reset filters
    const resetFilters = () => {
      setFilterValues({
        status: 'all',
        leaveType: 'all',
        startDate: null,
        endDate: null,
        search: '',
      });

      router.get(route('employees.leaves.index', employee.id), {}, {
        preserveState: true,
        replace: true,
      });
    };

    // Download PDF report
    const downloadPdf = () => {
      const params = new URLSearchParams();

      if (filterValues.startDate) {
        params.append('start_date', format(filterValues.startDate, 'yyyy-MM-dd'));
      }

      if (filterValues.endDate) {
        params.append('end_date', format(filterValues.endDate, 'yyyy-MM-dd'));
      }

      if (filterValues.status !== 'all') {
        params.append('status', filterValues.status);
      }

      if (filterValues.leaveType !== 'all') {
        params.append('leave_type_id', filterValues.leaveType);
      }

      const url = `${route('employees.leaves.download', employee.id)}?${params.toString()}`;
      window.open(url, '_blank');
    };

    // Apply filters when enter is pressed in search
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        applyFilters();
      }
    };

    return (
      <Layout>
        <Head title={`Leaves - ${employeeDisplayName(employee)}`} />

        <PageSurface className="max-w-7xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
          <div className="mb-2">
            <Link
              href={route('employees.show', employee.id)}
              className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              <span>Back to Employee Profile</span>
            </Link>
          </div>

          <div className="mb-3">
            <h1 className="text-base sm:text-lg font-bold text-gray-900">
              Leave Management: {employeeDisplayName(employee)}
            </h1>
            <div className="mt-0.5 text-xs text-gray-500">
              {employee.designation.name} • {employee.department.name} • {employee.employee_id}
            </div>
          </div>

          {/* Leave Balances */}
          <Card className="shadow-xs">
            <CardHeader className="bg-gray-50/80 px-3 py-2 sm:px-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold tracking-wider text-gray-900 uppercase">Leave Balances</CardTitle>
                  <CardDescription className="text-[10px] text-gray-500">Allocation and usage for {currentYear}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2.5 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {leaveBalances.length > 0 ? (
                  leaveBalances.map((balance) => (
                    <div key={balance.id} className="bg-white rounded-lg border p-2.5 sm:p-3.5 shadow-xs">
                      <div className="flex justify-between items-start mb-2 gap-1">
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-gray-900 truncate">{balance.leave_type.name}</h3>
                          <p className="text-[9px] text-gray-500">
                            {balance.leave_type.is_paid ? 'Paid' : 'Unpaid'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-700 tabular-nums">
                            {balance.remaining_days} <span className="text-[10px] font-normal text-gray-500">/ {balance.allocated_days}</span>
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={(balance.used_days / balance.allocated_days) * 100}
                        className="h-1.5"
                      />
                      <div className="flex justify-between mt-1.5 text-[9px] text-gray-500">
                        <span>Used: {balance.used_days}d</span>
                        <span>Avail: {balance.remaining_days}d</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-4 text-xs text-gray-500">
                    No leave balances found for the current year.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leave Applications */}
          <Card className="shadow-xs">
            <CardHeader className="bg-gray-50/80 px-3 py-2 sm:px-4 border-b">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xs font-bold tracking-wider text-gray-900 uppercase">Leave Applications</CardTitle>
                  <CardDescription className="text-[10px] text-gray-500">History of all leave requests</CardDescription>
                </div>
                <Button onClick={downloadPdf} variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs">
                  <Download className="mr-1 h-3 w-3" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>

            <div className="p-2.5 sm:p-4 border-b bg-gray-50/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-2.5">
                <div>
                  <Label htmlFor="start_date" className="text-[10px]">Start Date</Label>
                  <DatePicker
                    id="start_date"
                    selected={filterValues.startDate}
                    onSelect={(date) => setFilterValues({ ...filterValues, startDate: date })}
                    placeholderText="From date"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date" className="text-[10px]">End Date</Label>
                  <DatePicker
                    id="end_date"
                    selected={filterValues.endDate}
                    onSelect={(date) => setFilterValues({ ...filterValues, endDate: date })}
                    placeholderText="To date"
                    minDate={filterValues.startDate || undefined}
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-[10px]">Status</Label>
                  <Select
                    value={filterValues.status}
                    onValueChange={(value) => setFilterValues({ ...filterValues, status: value })}
                  >
                    <SelectTrigger id="status" className="h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="leave_type" className="text-[10px]">Leave Type</Label>
                  <Select
                    value={filterValues.leaveType}
                    onValueChange={(value) => setFilterValues({ ...filterValues, leaveType: value })}
                  >
                    <SelectTrigger id="leave_type" className="h-8 text-xs">
                      <SelectValue placeholder="Leave Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leave Types</SelectItem>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 justify-end">
                <Button onClick={resetFilters} variant="outline" size="sm" className="h-6.5 text-[10px] px-2">
                  Reset
                </Button>
                <Button onClick={applyFilters} size="sm" className="h-6.5 bg-emerald-600 text-[10px] px-2.5 hover:bg-emerald-700">
                  Filter
                </Button>
              </div>
            </div>

            <CardContent className="p-0">
              {/* Mobile Card List View (sm:hidden) */}
              <div className="p-2 space-y-2 sm:hidden">
                {leaveApplications.data.length > 0 ? (
                  leaveApplications.data.map((leave) => (
                    <div key={leave.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-gray-900">{leave.leave_type.name}</span>
                        {getLeaveStatusBadge(leave.status)}
                      </div>
                      <div className="text-[11px] font-medium text-gray-700">
                        {formatDateRange(leave.start_date, leave.end_date)}
                        <span className="ml-1 text-emerald-700 font-bold">({leave.days} day{leave.days !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                        <span>Applied: {format(new Date(leave.created_at), 'PP')}</span>
                        {leave.reason && (
                          <span className="truncate max-w-[150px] text-gray-400" title={leave.reason}>
                            {leave.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-gray-500">
                    No leave applications found
                  </div>
                )}
              </div>

              {/* Desktop Table View (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 text-[10px] uppercase">
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Applied On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveApplications.data.length > 0 ? (
                      leaveApplications.data.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="font-medium text-xs">{leave.leave_type.name}</TableCell>
                          <TableCell className="text-xs">{formatDateRange(leave.start_date, leave.end_date)}</TableCell>
                          <TableCell className="text-xs">{leave.days} day{leave.days !== 1 ? 's' : ''}</TableCell>
                          <TableCell className="text-xs">{format(new Date(leave.created_at), 'PP')}</TableCell>
                          <TableCell>{getLeaveStatusBadge(leave.status)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate text-xs" title={leave.reason || ''}>
                              {leave.reason || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-gray-500">
                          No leave applications found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {leaveApplications.last_page > 1 && (
                <div className="flex items-center justify-between p-2.5 border-t text-xs">
                  <span className="text-gray-500 text-[11px]">
                    Page {leaveApplications.current_page} of {leaveApplications.last_page}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link
                      href={leaveApplications.prev_page_url || '#'}
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${
                        !leaveApplications.prev_page_url
                          ? 'text-gray-300 cursor-not-allowed border-gray-100 bg-gray-50'
                          : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                      preserveScroll
                    >
                      Prev
                    </Link>
                    <Link
                      href={leaveApplications.next_page_url || '#'}
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${
                        !leaveApplications.next_page_url
                          ? 'text-gray-300 cursor-not-allowed border-gray-100 bg-gray-50'
                          : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                      preserveScroll
                    >
                      Next
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSurface>
      </Layout>
    );
  }
