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
import { ArrowLeft, CalendarDays, User } from 'lucide-react';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface LeaveType {
  id: number;
  name: string;
}

interface CreateProps {
  employees: Employee[];
  leaveTypes: LeaveType[];
  currentYear: number;
  years: number[];
}

export default function Create({ employees, leaveTypes, currentYear, years }: CreateProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [year, setYear] = useState(currentYear.toString());
  const [allocatedDays, setAllocatedDays] = useState('0');
  const [usedDays, setUsedDays] = useState('0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!employeeId) newErrors.employeeId = 'Employee is required';
    if (!leaveTypeId) newErrors.leaveTypeId = 'Leave type is required';
    if (!year) newErrors.year = 'Year is required';
    if (!allocatedDays.trim()) newErrors.allocatedDays = 'Allocated days is required';
    else if (parseInt(allocatedDays) < 0) newErrors.allocatedDays = 'Allocated days must be a positive number';
    if (!usedDays.trim()) newErrors.usedDays = 'Used days is required';
    else if (parseInt(usedDays) < 0) newErrors.usedDays = 'Used days must be a positive number';
    else if (parseInt(usedDays) > parseInt(allocatedDays)) newErrors.usedDays = 'Used days cannot exceed allocated days';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    router.post(route('leave.balances.store'), {
      employee_id: parseInt(employeeId),
      leave_type_id: parseInt(leaveTypeId),
      year: parseInt(year),
      allocated_days: parseInt(allocatedDays),
      used_days: parseInt(usedDays),
    }, {
      onError: (errors) => {
        setErrors(errors);
        setSubmitting(false);
      },
      onFinish: () => setSubmitting(false)
    });
  };

  return (
    <Layout>
      <Head title="Create Leave Balance" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('leave.balances.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leave Balances
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Leave Balance</h1>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Leave Balance Details</CardTitle>
            <CardDescription>Allocate leave days to an employee</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={employeeId}
                  onValueChange={setEmployeeId}
                >
                  <SelectTrigger id="employee" className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-gray-500" />
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.first_name} {employee.last_name} ({employee.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employeeId && (
                  <p className="text-sm font-medium text-red-500">{errors.employeeId}</p>
                )}
                {errors.employee_id && (
                  <p className="text-sm font-medium text-red-500">{errors.employee_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={leaveTypeId}
                  onValueChange={setLeaveTypeId}
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
                    {years.map((y) => (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Total number of days allocated for this leave type
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usedDays">Used Days</Label>
                  <Input
                    id="usedDays"
                    type="number"
                    min="0"
                    value={usedDays}
                    onChange={(e) => setUsedDays(e.target.value)}
                  />
                  {errors.usedDays && (
                    <p className="text-sm font-medium text-red-500">{errors.usedDays}</p>
                  )}
                  {errors.used_days && (
                    <p className="text-sm font-medium text-red-500">{errors.used_days}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Number of days already used
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Remaining Days</Label>
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-lg font-medium">
                    {Math.max(0, parseInt(allocatedDays || '0') - parseInt(usedDays || '0'))} days
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Calculated automatically (Allocated Days - Used Days)
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Link href={route('leave.balances.index')}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Leave Balance'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
