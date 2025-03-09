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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  Search,
  Clock,
  UserCheck,
  Edit,
  Trash2,
  MoreHorizontal,
  Plus,
  Download,
  Calendar,
  BarChart,
  RefreshCw,
  Building,
  Users,
  AlertCircle,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Department {
  id: number;
  name: string;
}

interface Branch {
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

interface Device {
  id: number;
  name: string;
}

interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  device_id: number | null;
  location_coordinates: string | null;
  remarks: string | null;
  employee: Employee;
  device: Device | null;
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

interface AttendancesResponse {
  data: Attendance[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface UserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSyncDevices: boolean;
  isEmployee: boolean;
  isBranchManager: boolean;
  isDepartmentHead: boolean;
}

interface AttendanceIndexProps {
  attendances: AttendancesResponse;
  branches: Branch[];
  departments: Department[];
  filters: {
    date: string;
    branch_id: string;
    department_id: string;
    status: string;
    search: string;
  };
  date: string;
  userPermissions: UserPermissions;
}

export default function AttendanceIndex({ attendances, branches, departments, filters, date, userPermissions }: AttendanceIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [branchId, setBranchId] = useState(filters.branch_id || null);
  const [departmentId, setDepartmentId] = useState(filters.department_id || null);
  const [status, setStatus] = useState(filters.status || null);
  const [currentDate, setCurrentDate] = useState(date);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSearch = () => {
    router.get(route('attendance.index'), {
      search,
      date: currentDate,
      branch_id: branchId || '',
      department_id: departmentId || '',
      status: status || ''
    }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setBranchId(null);
    setDepartmentId(null);
    setStatus(null);
    router.get(route('attendance.index'), { date: currentDate }, { preserveState: true });
  };

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setCurrentDate(formattedDate);
      setCalendarOpen(false);
      router.get(route('attendance.index'), {
        date: formattedDate,
        search,
        branch_id: branchId || '',
        department_id: departmentId || '',
        status: status || ''
      }, { preserveState: true });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
      router.delete(route('attendance.destroy', id));
    }
  };

  const syncAttendance = () => {
    router.post(route('attendance.sync-devices'));
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-orange-100 text-orange-800',
      half_day: 'bg-yellow-100 text-yellow-800',
      leave: 'bg-blue-100 text-blue-800'
    };

    const statusColor = statusColors[status] || 'bg-gray-100 text-gray-800';

    return (
      <Badge variant="outline" className={`${statusColor} border-0`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  // Check if pagination data exists
  const hasPagination = attendances.meta && attendances.links;

  // Check if user can see branch/department filters
  const canFilterByBranch = userPermissions.isBranchManager || !userPermissions.isEmployee;
  const canFilterByDepartment = userPermissions.isDepartmentHead || userPermissions.isBranchManager || !userPermissions.isEmployee;

  return (
    <Layout>
      <Head title="Daily Attendance" />

      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Attendance</h1>
            <p className="mt-1 text-gray-500">
              View and manage daily attendance records
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentDate ? format(new Date(currentDate), 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={currentDate ? new Date(currentDate) : undefined}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {userPermissions.canCreate && (
              <Link href={route('attendance.create')}>
                <Button className="flex items-center">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Attendance
                </Button>
              </Link>
            )}

            {userPermissions.canSyncDevices && (
              <Button variant="outline" className="flex items-center" onClick={syncAttendance}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Sync Devices
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <MoreHorizontal className="mr-1 h-4 w-4" />
                  <span>Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href={route('attendance.monthly')}>
                  <DropdownMenuItem className="cursor-pointer">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Monthly View</span>
                  </DropdownMenuItem>
                </Link>
                <Link href={route('attendance.report')}>
                  <DropdownMenuItem className="cursor-pointer">
                    <BarChart className="mr-2 h-4 w-4" />
                    <span>Attendance Report</span>
                  </DropdownMenuItem>
                </Link>
                {/* Only show device management for users with sync permission */}
                {userPermissions.canSyncDevices && (
                  <>
                    <Link href={route('attendance.devices.index')}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Manage Devices</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href={route('attendance.settings.index')}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Role-based Context Message */}
        {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You are viewing your own attendance records.
              {userPermissions.canCreate && " You can add your own attendance records."}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead
                ? "Filter your attendance records"
                : "Filter attendance by name, branch, department or status"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search by name or employee ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Only show branch filter if user can filter by branch */}
              {canFilterByBranch && branches.length > 1 && (
                <div className="w-full md:w-64">
                  <Select
                    value={branchId || undefined}
                    onValueChange={(value) => setBranchId(value === "all" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
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
              )}

              {/* Only show department filter if user can filter by department */}
              {canFilterByDepartment && departments.length > 1 && (
                <div className="w-full md:w-64">
                  <Select
                    value={departmentId || undefined}
                    onValueChange={(value) => setDepartmentId(value === "all" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
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
              )}

              <div className="w-full md:w-64">
                <Select
                  value={status || undefined}
                  onValueChange={(value) => setStatus(value === "all" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <Button onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Remarks</TableHead>
                  {(userPermissions.canEdit || userPermissions.canDelete) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.data && attendances.data.length > 0 ? (
                  attendances.data.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        <div className="font-medium">
                          {attendance.employee.first_name} {attendance.employee.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {attendance.employee.employee_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {attendance.employee.department.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attendance.check_in ? (
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4 text-gray-400" />
                            {attendance.check_in}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {attendance.check_out ? (
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4 text-gray-400" />
                            {attendance.check_out}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(attendance.status)}
                      </TableCell>
                      <TableCell>
                        {attendance.device ? attendance.device.name : '-'}
                      </TableCell>
                      <TableCell>
                        {attendance.remarks || '-'}
                      </TableCell>
                      {(userPermissions.canEdit || userPermissions.canDelete) && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {userPermissions.canEdit && (
                                <DropdownMenuItem
                                  onClick={() => router.get(route('attendance.edit', attendance.id))}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                              )}
                              {userPermissions.canDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(attendance.id)}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={userPermissions.canEdit || userPermissions.canDelete ? 8 : 7} className="h-24 text-center">
                      No attendance records found for this day.
                      {(search || branchId || departmentId || status) && (
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
        {hasPagination && attendances.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {attendances.meta.current_page > 1 && attendances.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={attendances.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(attendances.links.prev || '', {
                          search,
                          date: currentDate,
                          branch_id: branchId || '',
                          department_id: departmentId || '',
                          status: status || ''
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {attendances.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                              search,
                              date: currentDate,
                              branch_id: branchId || '',
                              department_id: departmentId || '',
                              status: status || ''
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {attendances.meta.current_page < attendances.meta.last_page && attendances.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={attendances.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(attendances.links.next || '', {
                          search,
                          date: currentDate,
                          branch_id: branchId || '',
                          department_id: departmentId || '',
                          status: status || ''
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
