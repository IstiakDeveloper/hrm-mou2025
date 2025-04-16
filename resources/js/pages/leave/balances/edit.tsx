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
import { ArrowLeft, User, FileText, CalendarDays } from 'lucide-react';
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

interface LeaveType {
  id: number;
  name: string;
}

interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  employee: Employee;
  leaveType: LeaveType;
}

interface EditProps {
  leaveBalance: LeaveBalance;
  employees: Employee[];
  leaveTypes: LeaveType[];
  years: number[];
}

export default function Edit({ leaveBalance, employees, leaveTypes, years }: EditProps) {
  const [allocatedDays, setAllocatedDays] = useState(leaveBalance?.allocated_days?.toString() || '0');
  const [usedDays, setUsedDays] = useState(leaveBalance?.used_days?.toString() || '0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!allocatedDays.trim()) newErrors.allocatedDays = 'Allocated days is required';
    else if (parseInt(allocatedDays) < 0) newErrors.allocatedDays = 'Allocated days must be a positive number';
    if (!usedDays.trim()) newErrors.usedDays = 'Used days is required';
    else if (parseInt(usedDays) < 0) newErrors.usedDays = 'Used days must be a positive number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    router.put(route('leave.balances.update', leaveBalance.id), {
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

  // Check if we have valid data
  if (!leaveBalance) {
    return (
      <Layout>
        <Head title="Edit Leave Balance" />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <Link href={route('leave.balances.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Leave Balances
            </Link>
          </div>
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-6">
              <p className="text-center">Loading leave balance data...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head title="Edit Leave Balance" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('leave.balances.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leave Balances
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Leave Balance</h1>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Leave Balance Details</CardTitle>
            <CardDescription>Update leave balance for the employee</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <div className="flex items-center p-2 border rounded-md bg-gray-50">
                    <User className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {leaveBalance.employee && `${leaveBalance.employee.first_name} ${leaveBalance.employee.last_name}`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Employee ID: {leaveBalance.employee && leaveBalance.employee.employee_id}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <div className="flex items-center p-2 border rounded-md bg-gray-50">
                    <FileText className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {leaveBalance.leaveType && leaveBalance.leaveType.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <div className="flex items-center p-2 border rounded-md bg-gray-50">
                    <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {leaveBalance.year}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <div className="p-2 border rounded-md bg-gray-50">
                    {leaveBalance.employee && leaveBalance.employee.department && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {leaveBalance.employee.department.name}
                      </Badge>
                    )}
                  </div>
                </div>
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
                  {submitting ? 'Updating...' : 'Update Leave Balance'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
