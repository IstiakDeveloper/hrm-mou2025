import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building, Users } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface Department {
  id: number;
  name: string;
  description: string | null;
  branch_id: number;
  head_employee_id: number | null;
  parent_department_id: number | null;
}

interface DepartmentEditProps {
  department: Department;
  branches: Branch[];
  employees: Employee[];
  departments: Department[];
}

export default function DepartmentEdit({ department, branches, employees, departments }: DepartmentEditProps) {
  const { data, setData, put, processing, errors } = useForm({
    name: department.name || '',
    description: department.description || '',
    head_employee_id: department.head_employee_id ? department.head_employee_id.toString() : null,
    branch_id: department.branch_id ? department.branch_id.toString() : null,
    parent_department_id: department.parent_department_id ? department.parent_department_id.toString() : null,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('departments.update', department.id));
  };

  return (
    <Layout>
      <Head title={`Edit Department: ${department.name}`} />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('departments.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Departments</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Department</h1>
          <p className="mt-1 text-gray-500">
            Update information for {department.name}
          </p>
        </div>

        <form onSubmit={submit}>
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-blue-100 p-1.5">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Department Information</CardTitle>
                  <CardDescription>Update department details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Department Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={e => setData('name', e.target.value)}
                  placeholder="Enter department name"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={e => setData('description', e.target.value)}
                  placeholder="Enter department description"
                  rows={3}
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_id">
                  Branch <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={data.branch_id || undefined}
                  onValueChange={(value) => setData('branch_id', value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branch_id && <p className="mt-1 text-sm text-red-500">{errors.branch_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_department_id">
                  Parent Department
                </Label>
                <Select
                  value={data.parent_department_id || undefined}
                  onValueChange={(value) => setData('parent_department_id', value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem
                        key={dept.id}
                        value={dept.id.toString()}
                        disabled={dept.id === department.id} // Can't select itself as parent
                      >
                        {dept.name} {dept.id === department.id ? '(Current)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parent_department_id && <p className="mt-1 text-sm text-red-500">{errors.parent_department_id}</p>}
                <p className="text-xs text-gray-500">
                  Optional. Select a parent department if this is a sub-department.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="head_employee_id">
                  Department Head
                </Label>
                <Select
                  value={data.head_employee_id || undefined}
                  onValueChange={(value) => setData('head_employee_id', value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department head (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.first_name} {employee.last_name} ({employee.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.head_employee_id && <p className="mt-1 text-sm text-red-500">{errors.head_employee_id}</p>}
                <p className="text-xs text-gray-500">
                  Optional. The employee who leads this department.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-end">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? 'Updating...' : 'Update Department'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
