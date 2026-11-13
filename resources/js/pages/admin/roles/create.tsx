import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Shield, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PermissionPicker, type PermissionSectionTree } from './permission-picker';

interface AvailablePermissions {
  [key: string]: string;
}

interface AvailableSections {
  [key: string]: {
    label: string;
    description: string;
  };
}

interface RoleCreateProps {
  permissions: AvailablePermissions;
  permission_sections: PermissionSectionTree;
  sections: AvailableSections;
  supports_section_locks: boolean;
  errors: {
    [key: string]: string;
  };
}

export default function RoleCreate({ permissions, permission_sections, sections, supports_section_locks, errors }: RoleCreateProps) {
  const { data, setData, post, processing } = useForm({
    name: '',
    description: '',
    permissions: [] as string[],
    blocked_sections: [] as string[],
    block_payroll_module: false,
  });

  const handleSectionChange = (sectionId: string, checked: boolean) => {
    const newSections = checked
      ? [...data.blocked_sections, sectionId]
      : data.blocked_sections.filter(id => id !== sectionId);

    setData('blocked_sections', newSections);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure permissions are valid array of strings
    const cleanPermissions = data.permissions.filter(p =>
      typeof p === 'string' && p.trim() !== '' && Object.keys(permissions).includes(p)
    );
    const cleanBlockedSections = data.blocked_sections.filter(id =>
      typeof id === 'string' && id.trim() !== '' && Object.keys(sections).includes(id)
    );

    const submitData = {
      name: data.name.trim(),
      description: data.description.trim(),
      permissions: cleanPermissions,
      blocked_sections: cleanBlockedSections,
      block_payroll_module: data.block_payroll_module,
    };

    // Debug log to check data
    console.log('Submitting role creation:', {
      originalData: data,
      cleanedData: submitData,
      availablePermissions: Object.keys(permissions)
    });

    post(route('admin.roles.store'), {
      data: submitData,
      onSuccess: (page) => {
        console.log('Creation successful:', page);
      },
      onError: (errors) => {
        console.log('Creation errors:', errors);
        console.log('Invalid permissions found:', cleanPermissions.filter(p => !Object.keys(permissions).includes(p)));
      },
      onFinish: () => {
        console.log('Creation finished');
      }
    });
  };

  return (
    <Layout>
      <Head title="Create Role" />

      <div className="container mx-auto py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={route('admin.roles.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Back to Roles</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Role</h1>
          <p className="mt-2 text-gray-600">
            Define a new role with specific permissions for system access control
          </p>
        </div>

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Role Information Card */}
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-purple-100 p-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Role Information</CardTitle>
                      <CardDescription>Basic role details and description</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Role Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Role Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={e => setData('name', e.target.value)}
                      placeholder="e.g., HR Manager, Department Head"
                      className={errors.name ? 'border-red-300 focus:border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={data.description}
                      onChange={e => setData('description', e.target.value)}
                      placeholder="Brief description about this role and its responsibilities"
                      rows={4}
                      className={errors.description ? 'border-red-300 focus:border-red-500' : ''}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border border-gray-200 p-4">
                    <Checkbox
                      id="block_payroll_module"
                      checked={data.block_payroll_module}
                      onCheckedChange={(checked) => setData('block_payroll_module', checked === true)}
                    />
                    <div>
                      <Label htmlFor="block_payroll_module" className="text-sm font-medium cursor-pointer">
                        Block payroll, loan, and staff fund
                      </Label>
                      <p className="mt-1 text-xs text-gray-500">
                        When on, this role cannot open payroll, employee loan, or staff fund even if those keys are checked.
                      </p>
                    </div>
                  </div>

                  {/* Permission Count Info */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {data.permissions.length} Permission{data.permissions.length !== 1 ? 's' : ''} Selected
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-blue-700">
                      Configure permissions from the panel on the right
                    </p>
                  </div>

                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-900">Section Locks</span>
                      <Badge variant="outline" className="bg-white/70 border-amber-200 text-amber-800">
                        {data.blocked_sections.length} blocked
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-amber-700">
                      {supports_section_locks
                        ? 'Use section locks to hide and block full modules for this role.'
                        : 'Run the latest migration to enable saving section locks. Until then, the old default behavior stays active.'}
                    </p>
                  </div>

                  {/* Info Alert */}
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Carefully select permissions as they control user access to system features
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Permissions Card */}
            <div className="lg:col-span-2">
              <div className="space-y-8">
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-full bg-green-100 p-2">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Role Permissions</CardTitle>
                        <CardDescription>Tick a menu group to open those pages for this role</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {data.permissions.length} / {Object.keys(permissions).length} permissions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <PermissionPicker
                    sections={permission_sections}
                    selected={data.permissions}
                    onChange={(next) => setData('permissions', next)}
                  />

                  {/* Global permission error */}
                  {errors.permissions && (
                    <div className="p-4 bg-red-50 border-t border-red-200">
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.permissions}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Section Access</CardTitle>
                      <CardDescription>Block entire ERP sections for this role without changing its action permissions</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {data.blocked_sections.length} / {Object.keys(sections).length} blocked
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {!supports_section_locks && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Section locks will become active after running `php artisan migrate`.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(sections).map(([sectionId, section]) => {
                      const isBlocked = data.blocked_sections.includes(sectionId);

                      return (
                        <label
                          key={sectionId}
                          htmlFor={`section-${sectionId}`}
                          className={`flex min-h-[136px] cursor-pointer flex-col rounded-xl border p-3 transition-colors hover:bg-gray-50 ${
                            isBlocked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
                          } ${!supports_section_locks ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{section.label}</p>
                              <p className="mt-1 text-[11px] text-gray-400">{sectionId}</p>
                            </div>
                            <Checkbox
                              id={`section-${sectionId}`}
                              checked={isBlocked}
                              disabled={!supports_section_locks}
                              onCheckedChange={(checked) => handleSectionChange(sectionId, checked === true)}
                            />
                          </div>

                          <p className="mt-3 flex-1 text-xs leading-5 text-gray-500">{section.description}</p>

                          <div className="mt-3 flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={isBlocked
                                ? 'bg-amber-100 text-amber-700 border-amber-300 text-xs'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'}
                            >
                              {isBlocked ? 'Blocked' : 'Allowed'}
                            </Badge>
                            <span className="text-[11px] text-gray-400">Module access</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {errors.blocked_sections && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.blocked_sections}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end space-x-4">
            <Link href={route('admin.roles.index')}>
              <Button type="button" variant="outline" className="border-gray-300 hover:bg-gray-50">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={processing || !data.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Role...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Create Role
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
