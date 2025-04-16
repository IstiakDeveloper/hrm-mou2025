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
import { ArrowLeft, Shield, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PermissionSection {
  [key: string]: {
    [key: string]: string;
  };
}

interface RoleCreateProps {
  permissions: PermissionSection;
  errors: {
    [key: string]: string;
  };
}

export default function RoleCreate({ permissions, errors }: RoleCreateProps) {
  const { data, setData, post, processing } = useForm({
    name: '',
    description: '',
    permissions: [] as string[],
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('admin.roles.store'));
  };

  return (
    <Layout>
      <Head title="Create Role" />

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
          <h1 className="text-3xl font-bold text-gray-900">Create New Role</h1>
          <p className="mt-1 text-gray-500">
            Define a new role with specific permissions for system access
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
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      Select permissions from the right panel to define role access
                    </AlertDescription>
                  </Alert>
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
                                  checked={data.permissions.includes(key)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(key, checked === true)
                                  }
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
            <Button type="submit" disabled={processing}>
              {processing ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
