import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
<<<<<<< HEAD
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
=======
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
>>>>>>> feature/flutter-mobile-app
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
<<<<<<< HEAD
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
=======
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Shield, AlertTriangle, Edit3, Save } from 'lucide-react';
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
>>>>>>> feature/flutter-mobile-app
  };
}

interface Role {
  id: number;
  name: string;
  description: string;
<<<<<<< HEAD
  permissions: string[] | null;
  users_count?: number;
=======
  permissions: unknown;
  blocked_sections?: unknown;
  block_payroll_module?: boolean | number;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
>>>>>>> feature/flutter-mobile-app
}

interface RoleEditProps {
  role: Role;
<<<<<<< HEAD
  permissions: PermissionSection;
=======
  permissions: AvailablePermissions;
  permission_sections: PermissionSectionTree;
  sections: AvailableSections;
  supports_section_locks: boolean;
>>>>>>> feature/flutter-mobile-app
  errors: {
    [key: string]: string;
  };
}

<<<<<<< HEAD
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
=======
export default function RoleEdit({ role, permissions, permission_sections, sections, supports_section_locks, errors }: RoleEditProps) {
  const normalizePermissions = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
      return raw.filter((p): p is string => typeof p === 'string' && p.trim() !== '');
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed === '') return [];
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return normalizePermissions(parsed);
      } catch {
        // Fallback: comma-separated string
        return trimmed
          .split(',')
          .map((s) => s.trim())
          .filter((p) => p !== '');
      }
    }
    if (raw && typeof raw === 'object') {
      // In case it arrives as an object (e.g., from legacy serialization)
      return Object.values(raw as Record<string, unknown>).filter((p): p is string => typeof p === 'string' && p.trim() !== '');
    }
    return [];
  };

  const normalizeBlockedSections = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
      return raw.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed === '') return [];
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return normalizeBlockedSections(parsed);
      } catch {
        return trimmed
          .split(',')
          .map((s) => s.trim())
          .filter((id) => id !== '');
      }
    }

    return [];
  };

  const originalPermissions = React.useMemo(() => normalizePermissions(role.permissions), [role.permissions]);
  const originalBlockedSections = React.useMemo(() => normalizeBlockedSections(role.blocked_sections), [role.blocked_sections]);

  const { data, setData, put, processing } = useForm({
    name: role.name,
    description: role.description || '',
    permissions: normalizePermissions(role.permissions),
    blocked_sections: normalizeBlockedSections(role.blocked_sections),
    block_payroll_module: role.block_payroll_module === true || role.block_payroll_module === 1,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const isDefaultRole = Boolean(role.is_default);
  const isSystemRole = isDefaultRole;

  // Track changes
  React.useEffect(() => {
    const originalPayrollBlocked = role.block_payroll_module === true || role.block_payroll_module === 1;
    const originalData = {
      name: role.name,
      description: role.description || '',
      permissions: normalizePermissions(role.permissions),
      blocked_sections: normalizeBlockedSections(role.blocked_sections),
    };

    const hasDataChanged =
      data.name !== originalData.name ||
      data.description !== originalData.description ||
      data.block_payroll_module !== originalPayrollBlocked ||
      JSON.stringify([...data.permissions].sort()) !== JSON.stringify([...originalData.permissions].sort()) ||
      JSON.stringify([...data.blocked_sections].sort()) !== JSON.stringify([...originalData.blocked_sections].sort());

    setHasChanges(hasDataChanged);
  }, [data, role]);

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
    console.log('Submitting role update:', {
      roleId: role.id,
      originalData: data,
      cleanedData: submitData,
      availablePermissions: Object.keys(permissions),
      hasChanges: hasChanges
    });

    put(route('admin.roles.update', role.id), {
      data: submitData,
      onSuccess: (page) => {
        console.log('Update successful:', page);
      },
      onError: (errors) => {
        console.log('Update errors:', errors);
        console.log('Invalid permissions found:', cleanPermissions.filter(p => !Object.keys(permissions).includes(p)));
      },
      onFinish: () => {
        console.log('Update finished');
      }
    });
  };

  return (
    <Layout>
      <Head title={`Edit Role: ${role.name}`} />

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
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Edit Role</h1>
            {isSystemRole && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                System Role
              </Badge>
            )}
          </div>
          <p className="text-gray-600">
            {isDefaultRole
              ? <>Permissions for <span className="font-medium">{role.name}</span> can be edited here. The role name stays fixed. Sync Default Roles only creates missing roles.</>
              : <>Modify role permissions and details for <span className="font-medium">{role.name}</span></>}
          </p>
        </div>

        {/* System Role Warning */}
        {isDefaultRole && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Default system role:</strong> the name cannot be renamed or deleted.
              Permissions and the payroll block can be saved here. Reset Default Roles on the roles list restores the config list. Section access is not reset.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Role Information Card */}
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="border-b bg-gray-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-blue-100 p-2">
                      <Edit3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Role Information</CardTitle>
                      <CardDescription>Update role details and description</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Role ID and timestamps */}
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Role ID:</span>
                      <span className="font-medium">#{role.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium">{new Date(role.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Modified:</span>
                      <span className="font-medium">{new Date(role.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

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
                      disabled={isDefaultRole}
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
                        When on, this role cannot open payroll, employee loan, or staff fund even if those keys are checked. Super Admin is never blocked.
                      </p>
                    </div>
                  </div>

                  {/* Permission Count Info */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Permission Summary</span>
                      {hasChanges && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                          Unsaved Changes
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Current:</span>
                        <span className="font-medium text-blue-900">{data.permissions.length} permissions</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Original:</span>
                        <span className="font-medium text-blue-900">{role.permissions?.length || 0} permissions</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Blocked sections:</span>
                        <span className="font-medium text-blue-900">
                          {supports_section_locks ? data.blocked_sections.length : 'Migration required'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Change Warning */}
                  {hasChanges && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        You have unsaved changes. Remember to save your modifications.
                      </AlertDescription>
                    </Alert>
                  )}
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
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Role Permissions</CardTitle>
                        <CardDescription>
                          Tick a menu group to open those pages for this role
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        {data.permissions.length} / {Object.keys(permissions).length} permissions
                      </Badge>
                      {hasChanges && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                          Modified
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <PermissionPicker
                    sections={permission_sections}
                    selected={data.permissions}
                    original={originalPermissions}
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
                      <CardDescription>
                        Block entire ERP sections for this role. Independently editable — not reset by Sync Default Roles.
                      </CardDescription>
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
                        Section locks will save only after running `php artisan migrate`. Until then, the previous default access rules remain active.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(sections).map(([sectionId, section]) => {
                      const isBlocked = data.blocked_sections.includes(sectionId);
                      const wasOriginallyBlocked = originalBlockedSections.includes(sectionId);
                      const hasChanged = isBlocked !== wasOriginallyBlocked;

                      return (
                        <label
                          key={sectionId}
                          htmlFor={`section-${sectionId}`}
                          className={`flex min-h-[136px] cursor-pointer flex-col rounded-xl border p-3 transition-colors hover:bg-gray-50 ${
                            isBlocked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
                          } ${hasChanged ? 'ring-2 ring-amber-200' : ''} ${!supports_section_locks ? 'cursor-not-allowed opacity-70' : ''}`}
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

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={isBlocked
                                ? 'bg-amber-100 text-amber-700 border-amber-300 text-xs'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'}
                            >
                              {isBlocked ? 'Blocked' : 'Allowed'}
                            </Badge>
                            {hasChanged && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                                {isBlocked ? 'Added' : 'Removed'}
                              </Badge>
                            )}
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
          <div className="mt-8 flex justify-between">
            <div className="flex items-center space-x-4">
              <Link href={route('admin.roles.index')}>
                <Button type="button" variant="outline" className="border-gray-300 hover:bg-gray-50">
                  Cancel
                </Button>
              </Link>

              {hasChanges && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  You have unsaved changes
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={processing || !data.name.trim() || !hasChanges}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Updating Role...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isDefaultRole ? 'Save Role' : 'Update Role'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
>>>>>>> feature/flutter-mobile-app
}
