import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface EmployeeLite extends EmployeeNameFields {
  id: number;
  employee_id: string;
}

interface Props {
  employees: EmployeeLite[];
}

export default function ZoneCreate({ employees }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    code: '',
    description: '',
    is_active: true,
    zone_manager_employee_id: null as string | null,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('zones.store'));
  };

  return (
    <Layout>
      <Head title="Create Zone" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('zones.index')} className="flex w-fit items-center text-gray-500 hover:text-gray-700">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Zones</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Zone</h1>
          <p className="mt-1 text-gray-500">Add a new zone</p>
        </div>

        <form onSubmit={submit}>
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle>Zone Information</CardTitle>
              <CardDescription>Basic information about the zone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Zone Code <span className="text-red-500">*</span></Label>
                <Input id="code" value={data.code} onChange={(e) => setData('code', e.target.value)} required />
                {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={Boolean(data.is_active)}
                  onCheckedChange={(checked) => setData('is_active', checked as boolean)}
                />
                <Label htmlFor="is_active" className="text-sm font-medium leading-none cursor-pointer">Active</Label>
              </div>
              {errors.is_active && <p className="mt-1 text-sm text-red-500">{errors.is_active}</p>}

              <div className="space-y-2">
                <Label htmlFor="zone_manager_employee_id">Zone Manager</Label>
                <Select
                  value={data.zone_manager_employee_id || 'none'}
                  onValueChange={(value) => setData('zone_manager_employee_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {employeeDisplayName(e)} ({e.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(errors as any).zone_manager_employee_id && (
                  <p className="mt-1 text-sm text-red-500">{(errors as any).zone_manager_employee_id}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-end">
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                <Button type="submit" disabled={processing} className="bg-green-600 hover:bg-green-700">
                  {processing ? 'Creating...' : 'Create Zone'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}

