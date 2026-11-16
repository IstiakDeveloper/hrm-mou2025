import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComboSelect } from '@/components/ComboSelect';
import { ArrowLeft } from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface ZoneLite {
  id: number;
  name: string;
  code: string;
}

interface EmployeeLite extends EmployeeNameFields {
  id: number;
  employee_id: string;
}

interface Props {
  zones: ZoneLite[];
  employees: EmployeeLite[];
}

export default function RegionalOfficeCreate({ zones, employees }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    zone_id: null as string | null,
    name: '',
    code: '',
    description: '',
    is_active: true,
    regional_manager_employee_id: null as string | null,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('regional-offices.store'));
  };

  const managerItems = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.employee_id} — ${employeeDisplayName(e)}`.trim(),
        keywords: `${e.employee_id} ${employeeDisplayName(e)}`,
      })),
    [employees],
  );

  return (
    <Layout>
      <Head title="Create Regional Office" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('regional-offices.index')} className="flex w-fit items-center text-gray-500 hover:text-gray-700">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Regional Offices</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Regional Office</h1>
          <p className="mt-1 text-gray-500">Add a new regional office under a zone</p>
        </div>

        <form onSubmit={submit}>
          <Card className="max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle>Regional Office Information</CardTitle>
              <CardDescription>Basic information about the regional office</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="zone_id">Zone <span className="text-red-500">*</span></Label>
                <Select
                  value={data.zone_id || undefined}
                  onValueChange={(value) => setData('zone_id', value === 'null' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Select...</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id.toString()}>
                        {z.name} ({z.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(errors as any).zone_id && <p className="mt-1 text-sm text-red-500">{(errors as any).zone_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Regional Office Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Regional Office Code <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="regional_manager_employee_id">Regional Manager</Label>
                <ComboSelect<number>
                  value={data.regional_manager_employee_id ? Number(data.regional_manager_employee_id) : null}
                  onChange={(value) => setData('regional_manager_employee_id', value != null ? String(value) : null)}
                  placeholder="Search employee (PIN / name)…"
                  items={managerItems}
                />
                {(errors as any).regional_manager_employee_id && (
                  <p className="mt-1 text-sm text-red-500">{(errors as any).regional_manager_employee_id}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50 px-6 py-4 flex justify-end">
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                <Button type="submit" disabled={processing} className="bg-green-600 hover:bg-green-700">
                  {processing ? 'Creating...' : 'Create Regional Office'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}

