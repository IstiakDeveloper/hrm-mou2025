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
import { ArrowLeft, Building, MapPin, Phone, Hash } from 'lucide-react';

interface BranchCreateProps {
  zones: { id: number; name: string; code: string }[];
  regionalOffices: { id: number; zone_id: number; name: string; code: string }[];
  designations: { id: number; name: string }[];
}

export default function BranchCreate({ zones, regionalOffices, designations }: BranchCreateProps) {
  const { data, setData, post, processing, errors } = useForm({
    zone_id: null as string | null,
    regional_office_id: null as string | null,
    name: '',
    address: '',
    contact_number: '',
    email: '',
    branch_code: '',
    branch_head_designation_id: null as string | null,
    is_head_office: false,
    is_active: true,
    geofence_enabled: false,
    geofence_latitude: '' as string | number,
    geofence_longitude: '' as string | number,
    geofence_radius_meters: '' as string | number,
    geofence_max_accuracy_meters: 150 as string | number,
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zone_id">Zone</Label>
                  <Select
                    value={data.zone_id || undefined}
                    onValueChange={(value) => {
                      const zoneId = value === 'null' ? null : value;
                      setData('zone_id', zoneId);
                      setData('regional_office_id', null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">None</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id.toString()}>
                          {zone.name} ({zone.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(errors as any).zone_id && <p className="mt-1 text-sm text-red-500">{(errors as any).zone_id}</p>}
                  <p className="text-xs text-gray-500">
                    Head Office → Zone → Regional Office → Branch
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regional_office_id">Regional Office</Label>
                  <Select
                    value={data.regional_office_id || undefined}
                    onValueChange={(value) => setData('regional_office_id', value === 'null' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select regional office (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">None</SelectItem>
                      {regionalOffices
                        .filter((ro) => !data.zone_id || String(ro.zone_id) === String(data.zone_id))
                        .map((ro) => (
                          <SelectItem key={ro.id} value={ro.id.toString()}>
                            {ro.name} ({ro.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.regional_office_id && (
                    <p className="mt-1 text-sm text-red-500">{errors.regional_office_id as any}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Regional Office (আগের “Area” layer)
                  </p>
                </div>
              </div>

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
                <Label htmlFor="email">
                  Branch Email
                </Label>
                <Input
                  id="email"
                  value={data.email}
                  onChange={e => setData('email', e.target.value)}
                  placeholder="Enter branch email (optional)"
                  inputMode="email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_head_designation_id">
                  Branch Head Designation
                </Label>
                <Select
                  value={data.branch_head_designation_id || undefined}
                  onValueChange={(value) => setData('branch_head_designation_id', value === 'null' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select head designation (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(errors as any).branch_head_designation_id && (
                  <p className="mt-1 text-sm text-red-500">{(errors as any).branch_head_designation_id}</p>
                )}
                <p className="text-xs text-gray-500">
                  Branch Head is determined by designation (transfer safe)
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={Boolean(data.is_active)}
                  onCheckedChange={(checked) => setData('is_active', checked as boolean)}
                />
                <Label htmlFor="is_active" className="text-sm font-medium leading-none cursor-pointer">
                  Active
                </Label>
              </div>
              {errors.is_active && <p className="mt-1 text-sm text-red-500">{errors.is_active}</p>}

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
                      value={data.geofence_latitude}
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
                      value={data.geofence_longitude}
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
                      value={data.geofence_radius_meters}
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
                      value={data.geofence_max_accuracy_meters}
                      onChange={(e) => setData('geofence_max_accuracy_meters', e.target.value)}
                      placeholder="e.g., 50"
                      inputMode="numeric"
                    />
                    {(errors as any).geofence_max_accuracy_meters && (
                      <p className="mt-1 text-sm text-red-500">{(errors as any).geofence_max_accuracy_meters}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Extra GPS margin added to branch radius (recommended 100–150m).
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
