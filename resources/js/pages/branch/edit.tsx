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

interface Branch {
  id: number;
  name: string;
  address: string | null;
  contact_number: string | null;
  branch_code: string;
  head_employee_id: number | null;
  is_head_office: boolean;
  geofence_enabled?: boolean;
  geofence_latitude?: number | null;
  geofence_longitude?: number | null;
  geofence_radius_meters?: number | null;
  geofence_max_accuracy_meters?: number | null;
}

interface BranchEditProps {
  branch: Branch;
  employees: Employee[];
}

export default function BranchEdit({ branch, employees }: BranchEditProps) {
  const { data, setData, put, processing, errors } = useForm({
    name: branch.name || '',
    address: branch.address || '',
    contact_number: branch.contact_number || '',
    branch_code: branch.branch_code || '',
    head_employee_id: branch.head_employee_id ? branch.head_employee_id.toString() : null,
    is_head_office: Boolean(branch.is_head_office),
    geofence_enabled: Boolean(branch.geofence_enabled),
    geofence_latitude: branch.geofence_latitude ?? '',
    geofence_longitude: branch.geofence_longitude ?? '',
    geofence_radius_meters: branch.geofence_radius_meters ?? '',
    geofence_max_accuracy_meters: branch.geofence_max_accuracy_meters ?? 50,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('branches.update', branch.id));
  };

  return (
    <Layout>
      <Head title={`Edit Branch: ${branch.name}`} />

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
          <h1 className="text-3xl font-bold text-gray-900">Edit Branch</h1>
          <p className="mt-1 text-gray-500">
            Update information for {branch.name}
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
                  <CardDescription>Update branch office details</CardDescription>
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

              <div className="border-t pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="geofence_enabled"
                    checked={Boolean(data.geofence_enabled)}
                    onCheckedChange={(checked) => setData('geofence_enabled', checked as boolean)}
                  />
                  <Label htmlFor="geofence_enabled" className="text-sm font-medium leading-none cursor-pointer">
                    Enable Geo-fence Attendance (PWA)
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="geofence_latitude">Latitude</Label>
                    <Input
                      id="geofence_latitude"
                      value={data.geofence_latitude as any}
                      onChange={(e) => setData('geofence_latitude', e.target.value)}
                      placeholder="e.g., 23.7808875"
                      inputMode="decimal"
                    />
                    {(errors as any).geofence_latitude && (
                      <p className="mt-1 text-sm text-red-500">{(errors as any).geofence_latitude}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="geofence_longitude">Longitude</Label>
                    <Input
                      id="geofence_longitude"
                      value={data.geofence_longitude as any}
                      onChange={(e) => setData('geofence_longitude', e.target.value)}
                      placeholder="e.g., 90.2792371"
                      inputMode="decimal"
                    />
                    {(errors as any).geofence_longitude && (
                      <p className="mt-1 text-sm text-red-500">{(errors as any).geofence_longitude}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="geofence_radius_meters">Allowed Radius (meters)</Label>
                    <Input
                      id="geofence_radius_meters"
                      value={data.geofence_radius_meters as any}
                      onChange={(e) => setData('geofence_radius_meters', e.target.value)}
                      placeholder="e.g., 100"
                      inputMode="numeric"
                    />
                    {(errors as any).geofence_radius_meters && (
                      <p className="mt-1 text-sm text-red-500">{(errors as any).geofence_radius_meters}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="geofence_max_accuracy_meters">Max Accuracy Required (meters)</Label>
                    <Input
                      id="geofence_max_accuracy_meters"
                      value={data.geofence_max_accuracy_meters as any}
                      onChange={(e) => setData('geofence_max_accuracy_meters', e.target.value)}
                      placeholder="e.g., 50"
                      inputMode="numeric"
                    />
                    {(errors as any).geofence_max_accuracy_meters && (
                      <p className="mt-1 text-sm text-red-500">{(errors as any).geofence_max_accuracy_meters}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Smaller value = stricter GPS quality (recommended 30–50m).
                    </p>
                  </div>
                </div>
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
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? 'Updating...' : 'Update Branch'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
