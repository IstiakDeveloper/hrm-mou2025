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
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash,
  Check,
  X,
  User
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserData {
  id: number;
  name: string;
  email: string;
  active_status: boolean;
  role: {
    name: string;
  } | null;
  employee: {
    employee_id: string;
    first_name: string;
    last_name: string;
  } | null;
  branch: {
    name: string;
  } | null;
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

interface UsersIndexProps {
  users: {
    data: UserData[];
  } & PaginationData;
  filters: {
    search?: string;
  };
  success?: string;
}

export default function UsersIndex({ users, filters, success }: UsersIndexProps) {
  const { data, setData, get, processing } = useForm({
    search: filters.search || '',
  });

  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    get(route('admin.users.index'), {
      preserveState: true,
    });
  };

  const handleStatusChange = (user: UserData, status: boolean) => {
    // Update user status via API
    const form = useForm({
      active_status: status,
    });

    form.put(route('admin.users.update', user.id), {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;

    const form = useForm({});
    form.delete(route('admin.users.destroy', userToDelete.id), {
      preserveScroll: true,
      onSuccess: () => setUserToDelete(null),
    });
  };

  const getUserFullName = (user: UserData) => {
    if (user.employee) {
      return `${user.employee.first_name} ${user.employee.last_name}`;
    }
    return user.name;
  };

  return (
    <Layout>
      <Head title="User Management" />

      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-gray-500">
              Manage system users, their roles and permissions
            </p>
          </div>
          <Link href={route('admin.users.create')}>
            <Button className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </Button>
          </Link>
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
              <CardTitle>System Users</CardTitle>

              <form onSubmit={handleSearch} className="flex w-80 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    name="search"
                    placeholder="Search users..."
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                          <h3 className="mt-2 text-lg font-medium text-gray-900">No Users Found</h3>
                          <p className="mt-1 text-gray-500">
                            {filters.search ? 'Try a different search term' : 'Get started by adding a new user'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.data.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{getUserFullName(user)}</span>
                            {user.employee && (
                              <span className="text-xs text-gray-500">
                                ID: {user.employee.employee_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge
                              variant={
                                user.role.name === 'Super Admin' ? 'default' :
                                user.role.name === 'HR Admin' ? 'secondary' : 'outline'
                              }
                              className="font-normal"
                            >
                              {user.role.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.branch ? user.branch.name : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={user.active_status}
                              onCheckedChange={(checked) => handleStatusChange(user, checked)}
                              aria-label="Select active status"
                            />
                            <span className={user.active_status ? 'text-green-600' : 'text-gray-500'}>
                              {user.active_status ? 'Active' : 'Inactive'}
                            </span>
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
                              <Link href={route('admin.users.edit', user.id)}>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                              </Link>

                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setUserToDelete(user)}
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

            {/* Pagination */}
            {users.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(users.current_page - 1) * users.per_page + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(users.current_page * users.per_page, users.total)}
                      </span>{' '}
                      of <span className="font-medium">{users.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      {users.current_page > 1 && (
                        <Link
                          href={route('admin.users.index', {
                            page: users.current_page - 1,
                            search: data.search,
                          })}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      )}

                      {users.links.slice(1, -1).map((link, i) => (
                        <Link
                          key={i}
                          href={route('admin.users.index', {
                            page: i + 1,
                            search: data.search,
                          })}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                            link.active
                              ? 'z-10 bg-primary text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary'
                              : 'text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}

                      {users.current_page < users.last_page && (
                        <Link
                          href={route('admin.users.index', {
                            page: users.current_page + 1,
                            search: data.search,
                          })}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      )}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the user account for{' '}
              <span className="font-medium text-gray-900">
                {userToDelete?.name || userToDelete?.email}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
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
