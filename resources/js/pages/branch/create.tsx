import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Building, MapPin, Phone, Hash, User } from 'lucide-react';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface BranchCreateProps {
  employees: Employee[];
}

export default function BranchCreate({ employees }: BranchCreateProps) {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    address: '',
    contact_number: '',
    branch_code: '',
    head_employee_id: null as string | null,
    is_head_office: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('branches.store'));
  };

  return (
    <Layout>
      <Head title="Create Branch" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('branches.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Branches</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Branch</h1>
          <p className="mt-1 text-gray-500">
            Add a new office location to your organization
          </p>
        </div>

        <form onSubmit={submit}>
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-green-100 p-1.5">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Branch Information</CardTitle>
                  <CardDescription>Basic details about the branch office</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Branch Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={e => setData('name', e.target.value)}
                  placeholder="Enter branch name"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_code">
                  Branch Code <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="branch_code"
                    value={data.branch_code}
                    onChange={e => setData('branch_code', e.target.value)}
                    placeholder="Enter branch code (e.g., HQ, BR001)"
                    className="pl-10"
                    required
                  />
                </div>
                {errors.branch_code && <p className="mt-1 text-sm text-red-500">{errors.branch_code}</p>}
                <p className="text-xs text-gray-500">
                  A unique identifier for this branch
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Textarea
                    id="address"
                    value={data.address}
                    onChange={e => setData('address', e.target.value)}
                    placeholder="Enter branch address"
                    className="pl-10"
                    rows={3}
                  />
                </div>
                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_number">
                  Contact Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="contact_number"
                    value={data.contact_number}
                    onChange={e => setData('contact_number', e.target.value)}
                    placeholder="Enter contact number"
                    className="pl-10"
                  />
                </div>
                {errors.contact_number && <p className="mt-1 text-sm text-red-500">{errors.contact_number}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="head_employee_id">
                  Branch Head
                </Label>
                <Select
                  value={data.head_employee_id || undefined}
                  onValueChange={(value) => setData('head_employee_id', value === "null" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch head (optional)" />
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
                  The employee who manages this branch
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_head_office"
                  checked={data.is_head_office}
                  onCheckedChange={(checked) => setData('is_head_office', checked as boolean)}
                />
                <Label
                  htmlFor="is_head_office"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Mark as Head Office
                </Label>
              </div>
              {errors.is_head_office && <p className="mt-1 text-sm text-red-500">{errors.is_head_office}</p>}
              <p className="text-xs text-gray-500 ml-6">
                Designate this location as the organization's head office
              </p>
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
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? 'Creating...' : 'Create Branch'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
