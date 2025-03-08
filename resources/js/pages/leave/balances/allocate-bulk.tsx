import React, { useState, FormEvent } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Checkbox
} from '@/components/ui/checkbox';
import { ArrowLeft, CalendarDays, Search, Users, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: {
    id: number;
    name: string;
  };
  designation: {
    id: number;
    name: string;
  };
}

interface Department {
  id: number;
  name: string;
}

interface LeaveType {
  id: number;
  name: string;
  days_allowed: number;
}

interface BulkAllocateProps {
  employees: Employee[];
  departments: Department[];
  leaveTypes: LeaveType[];
  currentYear: number;
  years: number[];
}

export default function AllocateBulk({
  employees,
  departments,
  leaveTypes,
  currentYear,
  years
}: BulkAllocateProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [year, setYear] = useState(currentYear?.toString() || new Date().getFullYear().toString());
  const [allocatedDays, setAllocatedDays] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Safely filter employees based on department and search with null checks
  const filteredEmployees = employees?.filter(employee => {
    // Skip employees with missing properties
    if (!employee || !employee.department || !employee.first_name ||
        !employee.last_name || !employee.employee_id) {
      return false;
    }

    const matchesDepartment = departmentFilter === 'all' ||
      (employee.department?.id?.toString() === departmentFilter);

    const matchesSearch = search === '' ||
      employee.first_name.toLowerCase().includes(search.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(search.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(search.toLowerCase());

    return matchesDepartment && matchesSearch;
  }) || [];

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  // Handle individual employee selection
  const handleEmployeeSelect = (employeeId: number, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  // Handle leave type change - autofill days allowed
  const handleLeaveTypeChange = (value: string) => {
    setLeaveTypeId(value);
    const selectedLeaveType = leaveTypes?.find(lt => lt.id.toString() === value);
    if (selectedLeaveType) {
      setAllocatedDays(selectedLeaveType.days_allowed.toString());
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (selectedEmployees.length === 0) newErrors.employees = 'Please select at least one employee';
    if (!leaveTypeId) newErrors.leaveTypeId = 'Leave type is required';
    if (!year) newErrors.year = 'Year is required';
    if (!allocatedDays.trim()) newErrors.allocatedDays = 'Allocated days is required';
    else if (parseInt(allocatedDays) < 0) newErrors.allocatedDays = 'Allocated days must be a positive number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    router.post(route('leave.balances.store-bulk'), {
      employee_ids: selectedEmployees,
      leave_type_id: parseInt(leaveTypeId),
      year: parseInt(year),
      allocated_days: parseInt(allocatedDays),
    }, {
      onError: (errors) => {
        setErrors(errors);
        setSubmitting(false);
      },
      onFinish: () => setSubmitting(false)
    });
  };

  // Check if we have the required data
  if (!employees || !departments || !leaveTypes) {
    return (
      <Layout>
        <Head title="Bulk Allocate Leave Balances" />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <Link href={route('leave.balances.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Leave Balances
            </Link>
          </div>
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-6">
              <p className="text-center">Loading data...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head title="Bulk Allocate Leave Balances" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('leave.balances.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leave Balances
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Allocate Leave Balances</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Allocation Settings</CardTitle>
                <CardDescription>Configure leave allocation for multiple employees</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Leave Type</Label>
                    <Select
                      value={leaveTypeId}
                      onValueChange={handleLeaveTypeChange}
                    >
                      <SelectTrigger id="leaveType">
                        <SelectValue placeholder="Select Leave Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((leaveType) => (
                          <SelectItem key={leaveType.id} value={leaveType.id.toString()}>
                            {leaveType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.leaveTypeId && (
                      <p className="text-sm font-medium text-red-500">{errors.leaveTypeId}</p>
                    )}
                    {errors.leave_type_id && (
                      <p className="text-sm font-medium text-red-500">{errors.leave_type_id}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select
                      value={year}
                      onValueChange={setYear}
                    >
                      <SelectTrigger id="year" className="flex items-center">
                        <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years && years.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.year && (
                      <p className="text-sm font-medium text-red-500">{errors.year}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allocatedDays">Allocated Days</Label>
                    <Input
                      id="allocatedDays"
                      type="number"
                      min="0"
                      value={allocatedDays}
                      onChange={(e) => setAllocatedDays(e.target.value)}
                    />
                    {errors.allocatedDays && (
                      <p className="text-sm font-medium text-red-500">{errors.allocatedDays}</p>
                    )}
                    {errors.allocated_days && (
                      <p className="text-sm font-medium text-red-500">{errors.allocated_days}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Total number of days to allocate to each selected employee
                    </p>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Selected Employees:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedEmployees.length}
                      </Badge>
                    </div>
                    {errors.employees && (
                      <p className="text-sm font-medium text-red-500 mt-2">{errors.employees}</p>
                    )}
                    {errors.employee_ids && (
                      <p className="text-sm font-medium text-red-500 mt-2">{errors.employee_ids}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Allocating...' : 'Allocate Leave Balances'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  <span>Select Employees</span>
                </CardTitle>
                <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        placeholder="Search employees..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="w-full md:w-64">
                    <Select
                      value={departmentFilter}
                      onValueChange={setDepartmentFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments && departments.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <div className="flex items-center p-4 border-b bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="selectAll"
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="selectAll" className="cursor-pointer font-medium">
                        Select All ({filteredEmployees.length})
                      </Label>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center p-4 border-b last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`employee-${employee.id}`}
                              checked={selectedEmployees.includes(employee.id)}
                              onCheckedChange={(checked) => handleEmployeeSelect(employee.id, checked as boolean)}
                            />
                            <Label
                              htmlFor={`employee-${employee.id}`}
                              className="cursor-pointer"
                            >
                              <div className="font-medium">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <span>{employee.employee_id}</span>
                                <span>•</span>
                                {employee.department && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {employee.department.name}
                                  </Badge>
                                )}
                              </div>
                            </Label>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        No employees found matching the current filters.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
