import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
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
import {
  ArrowLeft,
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
} from 'lucide-react';
import { format } from 'date-fns';

// Type definitions
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

interface EmployeeOption {
  id: number;
  name: string;
  department: string;
  designation: string;
}

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
  status: 'pending' | 'approved' | 'rejected' | 'completed';
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
  userPermissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewReports: boolean;
    isEmployee: boolean;
    isBranchManager: boolean;
    isDepartmentHead: boolean;
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
  userPermissions,
}: EmployeeDashboardProps) {
  // State for filter form
  const [filters, setFilters] = useState({
    employeeId: selectedEmployee?.id || '',
    filterType: filterType,
    year: filterYear.toString(),
    fromDate: dateRange.from ? new Date(dateRange.from) : null,
    toDate: dateRange.to ? new Date(dateRange.to) : null,
  });

  // State for employee search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState(employees);

  // Helper function to handle employee search
  useEffect(() => {
    if (searchQuery) {
      const filtered = employees.filter(employee =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchQuery, employees]);

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
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
      completed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

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
    const params: Record<string, any> = {
      employee_id: filters.employeeId,
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

  // Download PDF report
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

  return (
    <Layout>
      <Head title="Employee Dashboard" />

      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Employee Dashboard
        </h1>

        {/* Filter Card */}
        <Card className="mb-8 shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Employee & Date Range</CardTitle>
                <CardDescription>View attendance, leave, and movement data for an employee</CardDescription>
              </div>
              {selectedEmployee && (
                <Button onClick={downloadPdf} variant="outline" size="sm" className="flex items-center">
                  <Download className="mr-1 h-4 w-4" />
                  Export PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="employee_select">Select Employee</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search employee by name or ID..."
                    className="pl-8 mb-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={filters.employeeId.toString()}
                  onValueChange={(value) => setFilters({ ...filters, employeeId: value })}
                >
                  <SelectTrigger id="employee_select">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter_type">Filter Type</Label>
                <Select
                  value={filters.filterType}
                  onValueChange={(value) => setFilters({
                    ...filters,
                    filterType: value as 'custom' | 'year' | 'all'
                  })}
                >
                  <SelectTrigger id="filter_type">
                    <SelectValue placeholder="Select filter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filters.filterType === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="from_date">From Date</Label>
                  <DatePicker
                    id="from_date"
                    selected={filters.fromDate}
                    onSelect={(date) => setFilters({ ...filters, fromDate: date })}
                    placeholderText="Select start date"
                  />
                </div>
                <div>
                  <Label htmlFor="to_date">To Date</Label>
                  <DatePicker
                    id="to_date"
                    selected={filters.toDate}
                    onSelect={(date) => setFilters({ ...filters, toDate: date })}
                    placeholderText="Select end date"
                    minDate={filters.fromDate || undefined}
                  />
                </div>
              </div>
            )}

            {filters.filterType === 'year' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="year">Select Year</Label>
                  <Select
                    value={filters.year}
                    onValueChange={(value) => setFilters({ ...filters, year: value })}
                  >
                    <SelectTrigger id="year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={applyFilters}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee Dashboard Content */}
        {selectedEmployee && (
          <>
            {/* Employee Header */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="bg-gray-50 p-6 border-b">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center">
                    <div className="rounded-full bg-blue-100 p-3 mr-4">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </h2>
                      <div className="text-sm text-gray-500">
                        {selectedEmployee.designation.name} • {selectedEmployee.department.name}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Employee ID:</span> {selectedEmployee.employee_id}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Period:</span> {dateRange.from ? format(new Date(dateRange.from), 'MMM dd, yyyy') : ''} - {dateRange.to ? format(new Date(dateRange.to), 'MMM dd, yyyy') : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="summary" className="space-y-6">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="leave">Leave</TabsTrigger>
                <TabsTrigger value="movement">Movement</TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Attendance Summary Card */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-blue-100 p-1.5">
                          <CalendarDays className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle>Attendance Overview</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {attendanceSummary && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded p-3 text-center">
                              <div className="text-sm text-gray-500">Total Days</div>
                              <div className="text-2xl font-bold">{attendanceSummary.total_days}</div>
                            </div>
                            <div className="bg-green-50 rounded p-3 text-center">
                              <div className="text-sm text-gray-500">Present</div>
                              <div className="text-2xl font-bold text-green-700">{attendanceSummary.present}</div>
                            </div>
                            <div className="bg-red-50 rounded p-3 text-center">
                              <div className="text-sm text-gray-500">Absent</div>
                              <div className="text-2xl font-bold text-red-700">{attendanceSummary.absent}</div>
                            </div>
                          </div>

                          <div className="mt-6">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Attendance Rate</span>
                              <span className="text-sm font-medium">{attendanceSummary.attendance_percentage}%</span>
                            </div>
                            <Progress value={attendanceSummary.attendance_percentage} className="h-2" />
                          </div>

                          <Separator className="my-4" />

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">On Leave:</span>
                              <span className="font-medium">{attendanceSummary.leave}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">On Duty:</span>
                              <span className="font-medium">{attendanceSummary.on_duty}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Weekend:</span>
                              <span className="font-medium">{attendanceSummary.weekend}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Holiday:</span>
                              <span className="font-medium">{attendanceSummary.holiday}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Late Arrivals:</span>
                              <span className="font-medium">{attendanceSummary.late}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Early Departures:</span>
                              <span className="font-medium">{attendanceSummary.early_departure}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Leave Summary Card */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-yellow-100 p-1.5">
                          <Calendar className="h-5 w-5 text-yellow-600" />
                        </div>
                        <CardTitle>Leave Overview</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {leaveSummary && (
                        <div className="space-y-4">
                          <div className="text-sm font-medium text-gray-600 mb-2">Leave Balances ({leaveSummary.year})</div>

                          {leaveSummary.balances.filter(balance => balance.allocated_days > 0).map((balance, index) => (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{balance.type} {balance.is_paid ? '(Paid)' : '(Unpaid)'}</span>
                                <span className="text-sm font-medium">
                                  {balance.remaining_days} / {balance.allocated_days}
                                </span>
                              </div>
                              <Progress
                                value={(balance.used_days / balance.allocated_days) * 100}
                                className="h-2"
                              />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Used: {balance.used_days}</span>
                                <span>Remaining: {balance.remaining_days}</span>
                              </div>
                            </div>
                          ))}

                          <Separator className="my-4" />

                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-600">Recent Leave Applications</div>
                            {leaveData.slice(0, 3).map((leave, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded">
                                <div className="flex justify-between items-start">
                                  <div className="text-sm font-medium">{leave.type}</div>
                                  {getLeaveStatusBadge(leave.status)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {leave.date_range} • {leave.days} {leave.days > 1 ? 'days' : 'day'}
                                </div>
                              </div>
                            ))}

                            {leaveData.length === 0 && (
                              <div className="text-sm text-gray-500 italic">No leave applications in this period</div>
                            )}

                            {leaveData.length > 3 && (
                              <div className="text-center mt-2">
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => document.querySelector('[data-value="leave"]')?.click()}>
                                  View All ({leaveData.length})
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Movement Summary Card */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-purple-100 p-1.5">
                          <Briefcase className="h-5 w-5 text-purple-600" />
                        </div>
                        <CardTitle>Movement Overview</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded p-3 text-center">
                            <div className="text-sm text-gray-500">Official</div>
                            <div className="text-2xl font-bold text-blue-700">
                              {movementData.filter(m => m.type === 'official').length}
                            </div>
                          </div>
                          <div className="bg-purple-50 rounded p-3 text-center">
                            <div className="text-sm text-gray-500">Personal</div>
                            <div className="text-2xl font-bold text-purple-700">
                              {movementData.filter(m => m.type === 'personal').length}
                            </div>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-600">Recent Movements</div>
                          {movementData.slice(0, 3).map((movement, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-start">
                                <div className="text-sm font-medium">{movement.purpose}</div>
                                {getMovementTypeBadge(movement.type)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {movement.formatted_time_range} • {movement.duration_hours} hours
                              </div>
                              {movement.destination && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                  {movement.destination}
                                </div>
                              )}
                            </div>
                          ))}

                          {movementData.length === 0 && (
                            <div className="text-sm text-gray-500 italic">No movements in this period</div>
                          )}

                          {movementData.length > 3 && (
                            <div className="text-center mt-2">
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => document.querySelector('[data-value="movement"]')?.click()}>
                                View All ({movementData.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance">
                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-blue-100 p-1.5">
                          <CalendarDays className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle>Attendance Records</CardTitle>
                          <CardDescription>Daily attendance for the selected period</CardDescription>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {attendanceSummary?.total_days || 0} Days • {attendanceSummary?.attendance_percentage || 0}% Attendance Rate
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Day</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Check In</TableHead>
                            <TableHead>Check Out</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceData.length > 0 ? (
                            attendanceData.map((record, index) => (
                              <TableRow key={index}>
                                <TableCell>{format(new Date(record.date), 'dd MMM yyyy')}</TableCell>
                                <TableCell>{record.day}</TableCell>
                                <TableCell>{getAttendanceStatusBadge(record.status)}</TableCell>
                                <TableCell>{record.check_in || '-'}</TableCell>
                                <TableCell>{record.check_out || '-'}</TableCell>
                                <TableCell>
                                  <div className="max-w-xs truncate" title={record.remarks || ''}>
                                    {record.remarks || '-'}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-gray-500">
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

              {/* Leave Tab */}
              <TabsContent value="leave">
                <div className="space-y-6">
                  {/* Leave Balances */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-yellow-100 p-1.5">
                          <BarChart3 className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <CardTitle>Leave Balances ({leaveSummary?.year || new Date().getFullYear()})</CardTitle>
                          <CardDescription>Available leave balance for the current year</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {leaveSummary?.balances.map((balance, index) => (
                          <div key={index} className="bg-white rounded-lg border p-4">
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <h3 className="font-medium text-gray-900">{balance.type}</h3>
                                <p className="text-xs text-gray-500">
                                  {balance.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
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
                        ))}

                        {leaveSummary?.balances.length === 0 && (
                          <div className="col-span-full text-center py-6 text-gray-500">
                            No leave balances found for the current year
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Leave Applications */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-blue-100 p-1.5">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle>Leave Applications</CardTitle>
                          <CardDescription>History of leave requests in the selected period</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Leave Type</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Days</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaveData.length > 0 ? (
                              leaveData.map((leave, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{leave.type}</TableCell>
                                  <TableCell>{leave.date_range}</TableCell>
                                  <TableCell>{leave.days} day{leave.days !== 1 ? 's' : ''}</TableCell>
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
                                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
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
                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-full bg-purple-100 p-1.5">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle>Movement Records</CardTitle>
                        <CardDescription>Official and personal movements during the selected period</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead>Time Period</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movementData.length > 0 ? (
                            movementData.map((movement, index) => (
                              <TableRow key={index}>
                                <TableCell>{getMovementTypeBadge(movement.type)}</TableCell>
                                <TableCell className="font-medium">
                                  <div className="max-w-xs truncate" title={movement.purpose}>
                                    {movement.purpose}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center text-sm">
                                    <Timer className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{movement.formatted_time_range}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{movement.duration_hours} hours</TableCell>
                                <TableCell>
                                  <div className="flex items-center text-sm">
                                    {movement.destination ? (
                                      <>
                                        <MapPin className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{movement.destination}</span>
                                      </>
                                    ) : (
                                      '-'
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{getMovementStatusBadge(movement.status)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-gray-500">
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
          <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="rounded-full bg-blue-100 p-4 mb-4">
              <User className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Select an Employee</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Choose an employee and date range to view their attendance, leave, and movement data.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
