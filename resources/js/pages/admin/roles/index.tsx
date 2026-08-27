import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash,
  Check,
  Shield,
  Users,
  UserPlus
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageSurface } from '@/components/page-surface';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[] | null;
  permissions_array?: string[];
  permission_count?: number;
  users_count?: number;
  is_default?: boolean;
}

interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
}

interface RolesIndexProps {
  roles: {
    data: Role[];
  } & PaginationData;
  filters: {
    search?: string;
  };
  success?: string;
  can_sync_defaults?: boolean;
}

export default function RolesIndex({ roles, filters, success, can_sync_defaults = true }: RolesIndexProps) {
  const { data, setData, get, processing } = useForm({
    search: filters.search || '',
  });

  const syncForm = useForm({});
  const lineRoleForm = useForm({});
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    get(route('admin.roles.index'), {
      preserveState: true,
    });
  };

  const handleSyncDefaults = () => {
    syncForm.post(route('admin.roles.sync-defaults'), {
      preserveScroll: true,
    });
  };

  const handleSyncLineRoles = () => {
    lineRoleForm.post(route('admin.roles.sync-line-roles'), {
      preserveScroll: true,
    });
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;

    const form = useForm({});
    form.delete(route('admin.roles.destroy', roleToDelete.id), {
      preserveScroll: true,
      onSuccess: () => setRoleToDelete(null),
    });
  };

  const countPermissions = (role: Role): number => {
    if (typeof role.permission_count === 'number') return role.permission_count;
    if (role.permissions_array) return role.permissions_array.length;
    return role.permissions ? role.permissions.length : 0;
  };

  return (
    <Layout>
      <Head title="Role Management" />

      <PageSurface>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
            <p className="mt-1 text-gray-500">
              Assign Line Roles gives BM / RM / ZM from designation. Sync Default Roles refreshes permissions only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {can_sync_defaults && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-1"
                  disabled={lineRoleForm.processing}
                  onClick={handleSyncLineRoles}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{lineRoleForm.processing ? 'Assigning…' : 'Assign Line Roles'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-1"
                  disabled={syncForm.processing}
                  onClick={handleSyncDefaults}
                >
                  <Shield className="h-4 w-4" />
                  <span>{syncForm.processing ? 'Syncing…' : 'Sync Default Roles'}</span>
                </Button>
              </>
            )}
            <Link href={route('admin.roles.create')}>
              <Button className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span>Add Role</span>
              </Button>
            </Link>
          </div>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>System Roles</CardTitle>

              <form onSubmit={handleSearch} className="flex w-80 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    name="search"
                    placeholder="Search roles..."
                    value={data.search}
                    onChange={e => setData('search', e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="ml-2"
                  disabled={processing}
                >
                  Search
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Permissions</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Shield className="h-8 w-8 text-gray-400" />
                          <h3 className="mt-2 text-lg font-medium text-gray-900">No Roles Found</h3>
                          <p className="mt-1 text-gray-500">
                            {filters.search ? 'Try a different search term' : 'Get started by adding a new role'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.data.map((role) => (
                      <TableRow key={role.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                role.name === 'Super Admin' ? 'default' :
                                role.name === 'HR Admin' ? 'secondary' : 'outline'
                              }
                              className="font-normal"
                            >
                              {role.name}
                            </Badge>
                            {role.is_default && (
                              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {role.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-800">
                            {countPermissions(role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Badge variant="outline" className="bg-green-50 text-green-800">
                              {role.users_count || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={route('admin.roles.edit', role.id)}>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                              </Link>

                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setRoleToDelete(role)}
                                disabled={Boolean(role.is_default) || role.name === 'Super Admin' || Boolean(role.users_count && role.users_count > 0)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination — Laravel `link.url` carries correct page + query (never `i + 1`). */}
            {roles.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(roles.current_page - 1) * roles.per_page + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(roles.current_page * roles.per_page, roles.total)}
                      </span>{' '}
                      of <span className="font-medium">{roles.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      {roles.current_page > 1 && roles.links[0]?.url ? (
                        <Link
                          href={roles.links[0].url}
                          preserveState
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      ) : null}

                      {roles.links.slice(1, -1).map((link, i) => {
                        const isActive = link.active;
                        const isDots = link.label === '...';

                        if (isDots) {
                          return (
                            <span
                              key={i}
                              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-400 ring-1 ring-inset ring-gray-300"
                            >
                              ...
                            </span>
                          );
                        }

                        if (isActive && !link.url) {
                          return (
                            <span
                              key={i}
                              className="relative inline-flex items-center px-4 py-2 text-sm font-medium z-10 bg-primary text-white focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                              dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                          );
                        }

                        return (
                          <Link
                            key={i}
                            href={link.url || '#'}
                            preserveState
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                              link.active
                                ? 'z-10 bg-primary text-white focus:outline-2 focus:outline-offset-2 focus:outline-primary'
                                : 'text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                          />
                        );
                      })}

                      {roles.current_page < roles.last_page && roles.links[roles.links.length - 1]?.url ? (
                        <Link
                          href={roles.links[roles.links.length - 1].url!}
                          preserveState
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSurface>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the role{' '}
              <span className="font-medium text-gray-900">
                {roleToDelete?.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
