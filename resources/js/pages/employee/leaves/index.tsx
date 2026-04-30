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

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
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
        <Head title={`Leaves - ${employee.first_name} ${employee.last_name}`} />

        <PageSurface>
          <div className="mb-6">
            <Link
              href={route('employees.show', employee.id)}
              className="flex w-fit items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              <span>Back to Employee Profile</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Leave Management: {employee.first_name} {employee.last_name}
            </h1>
            <div className="mt-1 text-gray-500">
              {employee.designation.name} • {employee.department.name} • {employee.employee_id}
            </div>
          </div>

          {/* Leave Balances */}
          <Card className="mb-8 shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leave Balances</CardTitle>
                  <CardDescription>Leave allocation and usage for {currentYear}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaveBalances.length > 0 ? (
                  leaveBalances.map((balance) => (
                    <div key={balance.id} className="bg-white rounded-lg border p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{balance.leave_type.name}</h3>
                          <p className="text-xs text-gray-500">
                            {balance.leave_type.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">
                            {balance.remaining_days} / {balance.allocated_days}
                          </span>
                          <p className="text-xs text-gray-500">Days Available</p>
                        </div>
                      </div>
                      <Progress
                        value={(balance.used_days / balance.allocated_days) * 100}
                        className="h-2"
                      />
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Used: {balance.used_days} day{balance.used_days !== 1 ? 's' : ''}</span>
                        <span>Remaining: {balance.remaining_days} day{balance.remaining_days !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-6 text-gray-500">
                    No leave balances found for the current year.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leave Applications */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <CardTitle>Leave Applications</CardTitle>
                  <CardDescription>History of all leave requests</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={downloadPdf} variant="outline" size="sm" className="flex items-center">
                    <Download className="mr-1 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>

            <div className="p-4 border-b">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <DatePicker
                    id="start_date"
                    selected={filterValues.startDate}
                    onSelect={(date) => setFilterValues({ ...filterValues, startDate: date })}
                    placeholderText="Filter from date"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <DatePicker
                    id="end_date"
                    selected={filterValues.endDate}
                    onSelect={(date) => setFilterValues({ ...filterValues, endDate: date })}
                    placeholderText="Filter to date"
                    minDate={filterValues.startDate || undefined}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filterValues.status}
                    onValueChange={(value) => setFilterValues({ ...filterValues, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Filter by Status" />
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
                  <Label htmlFor="leave_type">Leave Type</Label>
                  <Select
                    value={filterValues.leaveType}
                    onValueChange={(value) => setFilterValues({ ...filterValues, leaveType: value })}
                  >
                    <SelectTrigger id="leave_type">
                      <SelectValue placeholder="Filter by Leave Type" />
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

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Reset Filters
                </Button>
                <Button onClick={applyFilters} size="sm">
                  Apply Filters
                </Button>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                          <TableCell className="font-medium">{leave.leave_type.name}</TableCell>
                          <TableCell>{formatDateRange(leave.start_date, leave.end_date)}</TableCell>
                          <TableCell>{leave.days} day{leave.days !== 1 ? 's' : ''}</TableCell>
                          <TableCell>{format(new Date(leave.created_at), 'PP')}</TableCell>
                          <TableCell>{getLeaveStatusBadge(leave.status)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={leave.reason || ''}>
                              {leave.reason || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                          No leave applications found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {leaveApplications.last_page > 1 && (
                <div className="flex items-center justify-end p-4 border-t">
                  <Pagination>
                    <Link
                      href={leaveApplications.prev_page_url || '#'}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border ${
                        !leaveApplications.prev_page_url
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      preserveScroll
                    >
                      Previous
                    </Link>
                    <span className="mx-2 text-sm text-gray-700">
                      Page {leaveApplications.current_page} of {leaveApplications.last_page}
                    </span>
                    <Link
                      href={leaveApplications.next_page_url || '#'}
                      className={`relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium rounded-md border ${
                        !leaveApplications.next_page_url
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      preserveScroll
                    >
                      Next
                    </Link>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSurface>
      </Layout>
    );
  }
