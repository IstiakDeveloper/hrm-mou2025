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
import { ArrowLeft, Shield, Check, AlertTriangle, Users, Building2, ClipboardList, Calendar, Activity, BarChart, Settings, Award, Edit3, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Types matching the RoleController structure
interface PermissionCategory {
  label: string;
  description: string;
  color: string;
}

interface PermissionCategories {
  [key: string]: PermissionCategory;
}

interface AvailablePermissions {
  [key: string]: string;
}

interface AvailableSections {
  [key: string]: {
    label: string;
    description: string;
  };
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: unknown;
  blocked_sections?: unknown;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

interface RoleEditProps {
  role: Role;
  permissions: AvailablePermissions;
  permissions_by_category: Record<string, AvailablePermissions>;
  permission_categories: PermissionCategories;
  sections: AvailableSections;
  supports_section_locks: boolean;
  errors: {
    [key: string]: string;
  };
}

export default function RoleEdit({ role, permissions, permissions_by_category, permission_categories, sections, supports_section_locks, errors }: RoleEditProps) {
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
  });

  const [activeTab, setActiveTab] = useState<string>(Object.keys(permission_categories)[0] || 'admin');
  const [hasChanges, setHasChanges] = useState(false);

  const isDefaultRole = Boolean(role.is_default);
  const isSystemRole = isDefaultRole;

  // Track changes
  React.useEffect(() => {
    const originalData = {
      name: role.name,
      description: role.description || '',
      permissions: normalizePermissions(role.permissions),
      blocked_sections: normalizeBlockedSections(role.blocked_sections),
    };

    const hasDataChanged =
      data.name !== originalData.name ||
      data.description !== originalData.description ||
      (!isDefaultRole && JSON.stringify([...data.permissions].sort()) !== JSON.stringify([...originalData.permissions].sort())) ||
      JSON.stringify([...data.blocked_sections].sort()) !== JSON.stringify([...originalData.blocked_sections].sort());

    setHasChanges(hasDataChanged);
  }, [data, role, isDefaultRole]);

  // Full catalog from config/permissions.php (via PermissionRegistry), not a hardcoded subset
  const getPermissionsByCategory = (category: string): AvailablePermissions => {
    return permissions_by_category[category] || {};
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (isDefaultRole) return;
    const newPermissions = checked
      ? [...data.permissions, permission]
      : data.permissions.filter(p => p !== permission);

    setData('permissions', newPermissions);
  };

  const handleSectionChange = (sectionId: string, checked: boolean) => {
    const newSections = checked
      ? [...data.blocked_sections, sectionId]
      : data.blocked_sections.filter(id => id !== sectionId);

    setData('blocked_sections', newSections);
  };

  const handleSelectAllInCategory = (category: string, checked: boolean) => {
    if (isDefaultRole) return;
    const categoryPermissions = Object.keys(getPermissionsByCategory(category));

    if (checked) {
      // Add all permissions from this category
      const newPermissions = [...data.permissions];
      categoryPermissions.forEach(permission => {
        if (!newPermissions.includes(permission)) {
          newPermissions.push(permission);
        }
      });
      setData('permissions', newPermissions);
    } else {
      // Remove all permissions from this category
      const newPermissions = data.permissions.filter(
        permission => !categoryPermissions.includes(permission)
      );
      setData('permissions', newPermissions);
    }
  };

  const isCategoryFullySelected = (category: string): boolean => {
    const categoryPermissions = Object.keys(getPermissionsByCategory(category));
    return categoryPermissions.length > 0 && categoryPermissions.every(permission => data.permissions.includes(permission));
  };

  const isCategoryPartiallySelected = (category: string): boolean => {
    const categoryPermissions = Object.keys(getPermissionsByCategory(category));
    return categoryPermissions.some(permission => data.permissions.includes(permission)) &&
           !isCategoryFullySelected(category);
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      admin: <Shield className="h-4 w-4" />,
      users: <Users className="h-4 w-4" />,
      roles: <Settings className="h-4 w-4" />,
      employees: <Users className="h-4 w-4" />,
      organization: <Building2 className="h-4 w-4" />,
      attendance: <ClipboardList className="h-4 w-4" />,
      leave: <Calendar className="h-4 w-4" />,
      movement: <Activity className="h-4 w-4" />,
      holidays: <Award className="h-4 w-4" />,
      reports: <BarChart className="h-4 w-4" />
    };

    return iconMap[category] || <Shield className="h-4 w-4" />;
  };

  const getCategoryColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      red: 'bg-red-100 text-red-700 border-red-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
      teal: 'bg-teal-100 text-teal-700 border-teal-200'
    };

    return colorMap[color] || 'bg-gray-100 text-gray-700 border-gray-200';
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
              ? <>Default role permissions for <span className="font-medium">{role.name}</span> come from <code className="text-sm">config/default_roles.php</code> (Sync Default Roles). Section Access can still be customized here.</>
              : <>Modify role permissions and details for <span className="font-medium">{role.name}</span></>}
          </p>
        </div>

        {/* System Role Warning */}
        {isDefaultRole && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Default system role:</strong> Granular permissions are read-only (refresh via Sync Default Roles).
              <strong> Section Access is editable</strong> and is not reset by sync.
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
                          {isDefaultRole
                            ? 'Synced from config/default_roles.php — editing disabled'
                            : 'Modify system access permissions by category'}
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
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    {/* Category Tabs - Proper Horizontal Scrolling */}
                    <div className="border-b bg-gray-50/30 overflow-x-auto">
                      <div className="flex min-w-max">
                        <TabsList className="flex h-auto w-auto justify-start rounded-none bg-transparent p-0 min-w-max">
                          {Object.entries(permission_categories).map(([categoryKey, category]) => {
                            const categoryPermissions = getPermissionsByCategory(categoryKey);
                            const permissionCount = Object.keys(categoryPermissions).length;
                            const selectedInCategory = Object.keys(categoryPermissions).filter(p => data.permissions.includes(p)).length;

                            return (
                              <TabsTrigger
                                key={categoryKey}
                                value={categoryKey}
                                className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap flex-shrink-0"
                              >
                                {getCategoryIcon(categoryKey)}
                                <div className="flex flex-col items-start">
                                  <span className="font-medium text-sm">{category.label}</span>
                                  <span className="text-xs text-gray-500">
                                    {selectedInCategory}/{permissionCount} selected
                                  </span>
                                </div>

                                {/* Status indicator */}
                                {isCategoryFullySelected(categoryKey) && (
                                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                                )}
                                {isCategoryPartiallySelected(categoryKey) && (
                                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 border-2 border-white" />
                                )}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                      </div>
                    </div>

                    {/* Permission Content for each Category */}
                    {Object.entries(permission_categories).map(([categoryKey, category]) => {
                      const categoryPermissions = getPermissionsByCategory(categoryKey);

                      return (
                        <TabsContent
                          key={categoryKey}
                          value={categoryKey}
                          className="border-none p-0 mt-0"
                        >
                          {/* Category Header with Select All */}
                          <div className={`border-b px-6 py-4 ${getCategoryColorClasses(category.color)}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  id={`select-all-${categoryKey}`}
                                  checked={isCategoryFullySelected(categoryKey)}
                                  disabled={isDefaultRole}
                                  onCheckedChange={(checked) =>
                                    handleSelectAllInCategory(categoryKey, checked === true)
                                  }
                                />
                                <div>
                                  <Label
                                    htmlFor={`select-all-${categoryKey}`}
                                    className="font-semibold cursor-pointer"
                                  >
                                    Select All {category.label}
                                  </Label>
                                  <p className="text-sm opacity-90 mt-0.5">
                                    {category.description}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-white/50">
                                {Object.keys(categoryPermissions).filter(p => data.permissions.includes(p)).length} / {Object.keys(categoryPermissions).length}
                              </Badge>
                            </div>
                          </div>

                          {/* Permissions Grid */}
                          <div className="p-6">
                            {Object.keys(categoryPermissions).length > 0 ? (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {Object.entries(categoryPermissions).map(([key, label]) => {
                                  const isSelected = data.permissions.includes(key);
                                  const wasOriginallySelected = originalPermissions.includes(key);
                                  const hasChanged = isSelected !== wasOriginallySelected;

                                  return (
                                    <div
                                      key={key}
                                      className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-gray-50 ${
                                        isSelected
                                          ? 'border-blue-300 bg-blue-50'
                                          : 'border-gray-200'
                                      } ${hasChanged ? 'ring-2 ring-amber-200' : ''}`}
                                    >
                                      <Checkbox
                                        id={key}
                                        checked={isSelected}
                                        disabled={isDefaultRole}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(key, checked === true)
                                        }
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Label
                                            htmlFor={key}
                                            className="cursor-pointer text-sm font-medium"
                                          >
                                            {label}
                                          </Label>
                                          {hasChanged && (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                                              {isSelected ? 'Added' : 'Removed'}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {key}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No permissions available in this category</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>

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
                  {isDefaultRole ? 'Save Description & Section Access' : 'Update Role'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
