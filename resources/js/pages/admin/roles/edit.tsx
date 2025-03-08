import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Shield, Check, AlertTriangle, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface PermissionSection {
  [key: string]: {
    [key: string]: string;
  };
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[] | null;
  users_count?: number;
}

interface RoleEditProps {
  role: Role;
  permissions: PermissionSection;
  errors: {
    [key: string]: string;
  };
}

export default function RoleEdit({ role, permissions, errors }: RoleEditProps) {
  const { data, setData, put, processing } = useForm({
    name: role.name || '',
    description: role.description || '',
    permissions: role.permissions || [] as string[],
  });

  const [activeTab, setActiveTab] = useState<string>(Object.keys(permissions)[0] || 'users');

  const handlePermissionChange = (permission: string, checked: boolean) => {
    const newPermissions = checked
    ? [...data.permissions, permission]
    : data.permissions.filter(p => p !== permission);

  setData('permissions', newPermissions);
};

const handleSelectAllInModule = (module: string, checked: boolean) => {
  const modulePermissions = Object.keys(permissions[module]);

  if (checked) {
    // Add all permissions from this module
    const newPermissions = [...data.permissions];
    modulePermissions.forEach(permission => {
      if (!newPermissions.includes(permission)) {
        newPermissions.push(permission);
      }
    });
    setData('permissions', newPermissions);
  } else {
    // Remove all permissions from this module
    const newPermissions = data.permissions.filter(
      permission => !modulePermissions.includes(permission)
    );
    setData('permissions', newPermissions);
  }
};

const isModuleFullySelected = (module: string): boolean => {
  const modulePermissions = Object.keys(permissions[module]);
  return modulePermissions.every(permission => data.permissions.includes(permission));
};

const isModulePartiallySelected = (module: string): boolean => {
  const modulePermissions = Object.keys(permissions[module]);
  return modulePermissions.some(permission => data.permissions.includes(permission)) &&
         !isModuleFullySelected(module);
};

const isSuperAdminRole = role.name === 'Super Admin';

const submit = (e: React.FormEvent) => {
  e.preventDefault();
  put(route('admin.roles.update', role.id));
};

return (
  <Layout>
    <Head title={`Edit Role - ${role.name}`} />

    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link
          href={route('admin.roles.index')}
          className="flex w-fit items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          <span>Back to Roles</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Role</h1>
        <p className="mt-1 text-gray-500">
          Update role details and permissions for <span className="font-medium">{role.name}</span>
        </p>
      </div>

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Role Information */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-purple-100 p-1.5">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Role Information</CardTitle>
                    <CardDescription>Basic role details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Role Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    placeholder="Enter role name"
                    disabled={isSuperAdminRole}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    placeholder="Brief description about this role"
                    rows={4}
                    disabled={isSuperAdminRole}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                </div>

                {role.users_count !== undefined && role.users_count > 0 && (
                  <div className="rounded-md bg-amber-50 p-4 text-amber-800">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Users className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium">Role in use</h3>
                        <div className="mt-2 text-sm">
                          <p>
                            This role is currently assigned to <Badge className="ml-1">{role.users_count}</Badge> user{role.users_count !== 1 ? 's' : ''}. Any changes to permissions will affect these users.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isSuperAdminRole && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      The Super Admin role cannot be modified as it has full system access
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Permissions */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-green-100 p-1.5">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Role Permissions</CardTitle>
                      <CardDescription>Configure access permissions</CardDescription>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{data.permissions.length}</span> permissions selected
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="flex h-auto w-full justify-start overflow-auto rounded-none border-b bg-gray-100 px-4 py-2">
                    {Object.keys(permissions).map(module => (
                      <TabsTrigger
                        key={module}
                        value={module}
                        className="relative data-[state=active]:bg-white"
                        disabled={isSuperAdminRole}
                      >
                        <span className="capitalize">{module}</span>
                        {isModuleFullySelected(module) && (
                          <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-green-500" />
                        )}
                        {isModulePartiallySelected(module) && (
                          <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-amber-500" />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.keys(permissions).map(module => (
                    <TabsContent
                      key={module}
                      value={module}
                      className="border-none p-0 pt-0"
                    >
                      <div className="border-b bg-gray-50 px-6 py-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`select-all-${module}`}
                            checked={isModuleFullySelected(module)}
                            onCheckedChange={(checked) =>
                              handleSelectAllInModule(module, checked === true)
                            }
                            disabled={isSuperAdminRole}
                          />
                          <Label
                            htmlFor={`select-all-${module}`}
                            className="font-medium capitalize"
                          >
                            Select All {module} Permissions
                          </Label>
                        </div>
                      </div>

                      <ScrollArea className="h-[300px] p-6">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
                          {Object.entries(permissions[module]).map(([key, label]) => (
                            <div
                              key={key}
                              className="flex items-center space-x-2 rounded-md border p-3 shadow-sm"
                            >
                              <Checkbox
                                id={key}
                                checked={data.permissions.includes(key) || isSuperAdminRole}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(key, checked === true)
                                }
                                disabled={isSuperAdminRole}
                              />
                              <Label htmlFor={key} className="flex-1 cursor-pointer text-sm">
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
                {errors.permissions && <p className="p-4 text-sm text-red-500">{errors.permissions}</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Link href={route('admin.roles.index')}>
            <Button type="button" variant="outline" className="border-gray-300">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={processing || isSuperAdminRole}>
            {processing ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  </Layout>
);
}
