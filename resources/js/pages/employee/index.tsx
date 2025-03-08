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
  Users,
  Eye,
  Filter
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  photo: string | null;
  department: {
    id: number;
    name: string;
  };
  designation: {
    id: number;
    name: string;
  };
  branch: {
    id: number;
    name: string;
  };
}

interface Department {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
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

interface EmployeeIndexProps {
  employees: {
    data: Employee[];
  } & PaginationData;
  departments: Department[];
  branches: Branch[];
  filters: {
    search?: string;
    department_id?: string;
    branch_id?: string;
    status?: string;
  };
  success?: string;
}

export default function EmployeeIndex({
  employees,
  departments,
  branches,
  filters,
  success
}: EmployeeIndexProps) {
  const { data, setData, get, processing } = useForm({
    search: filters.search || '',
    department_id: filters.department_id || '',
    branch_id: filters.branch_id || '',
    status: filters.status || '',
  });

  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [showFilters, setShowFilters] = useState(
    !!(filters.department_id || filters.branch_id || filters.status)
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    get(route('employees.index'), {
      preserveState: true,
    });
  };

  const handleDeleteEmployee = () => {
    if (!employeeToDelete) return;

    const form = useForm({});
    form.delete(route('employees.destroy', employeeToDelete.id), {
      preserveScroll: true,
      onSuccess: () => setEmployeeToDelete(null),
    });
  };

  const handleClearFilters = () => {
    setData({
      search: '',
      department_id: '',
      branch_id: '',
      status: '',
    });

    get(route('employees.index'), {
      preserveState: true,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'on_leave':
        return <Badge className="bg-blue-100 text-blue-800">On Leave</Badge>;
      case 'terminated':
        return <Badge className="bg-red-100 text-red-800">Terminated</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getEmployeeInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Layout>
      <Head title="Employee Management" />

      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="mt-1 text-gray-500">
              Manage all employees across branches and departments
            </p>
          </div>
          <Link href={route('employees.create')}>
            <Button className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              <span>Add Employee</span>
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
              <CardTitle>Employees Directory</CardTitle>

              <div className="flex items-center gap-2">
                <form onSubmit={handleSearch} className="flex items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="search"
                      name="search"
                      placeholder="Search employees..."
                      value={data.search}
                      onChange={e => setData('search', e.target.value)}
                      className="pl-8 w-60 md:w-80"
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

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-gray-100' : ''}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <Select
                    value={data.department_id}
                    onValueChange={value => {
                      setData('department_id', value);
                      get(route('employees.index'), { preserveState: true });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Departments</SelectItem>
                      {departments.map(department => (
                        <SelectItem key={department.id} value={department.id.toString()}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={data.branch_id}
                    onValueChange={value => {
                      setData('branch_id', value);
                      get(route('employees.index'), { preserveState: true });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Branches</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={data.status}
                    onValueChange={value => {
                      setData('status', value);
                      get(route('employees.index'), { preserveState: true });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    disabled={processing}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="h-8 w-8 text-gray-400" />
                          <h3 className="mt-2 text-lg font-medium text-gray-900">No Employees Found</h3>
                          <p className="mt-1 text-gray-500">
                            {data.search || data.department_id || data.branch_id || data.status
                              ? 'Try different search filters'
                              : 'Get started by adding a new employee'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.data.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-9 w-9">
                              {employee.photo ? (
                                <AvatarImage src={employee.photo} alt={`${employee.first_name} ${employee.last_name}`} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getEmployeeInitials(employee.first_name, employee.last_name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {employee.designation.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.employee_id}</TableCell>
                        <TableCell>{employee.department.name}</TableCell>
                        <TableCell>{employee.branch.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{employee.email}</div>
                            {employee.phone && <div className="text-gray-500">{employee.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(employee.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={route('employees.show', employee.id)}>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>View</span>
                                </DropdownMenuItem>
                              </Link>

                              <Link href={route('employees.edit', employee.id)}>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                              </Link>

                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setEmployeeToDelete(employee)}
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
            {employees.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(employees.current_page - 1) * employees.per_page + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(employees.current_page * employees.per_page, employees.total)}
                      </span>{' '}
                      of <span className="font-medium">{employees.total}</span> employees
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      {employees.current_page > 1 && (
                        <Link
                          href={route('employees.index', {
                            page: employees.current_page - 1,
                            ...filters,
                          })}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      )}

                      {employees.links.slice(1, -1).map((link, i) => (
                        <Link
                          key={i}
                          href={route('employees.index', {
                            page: i + 1,
                            ...filters,
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

                      {employees.current_page < employees.last_page && (
                        <Link
                          href={route('employees.index', {
                            page: employees.current_page + 1,
                            ...filters,
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
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the employee record for{' '}
              <span className="font-medium text-gray-900">
                {employeeToDelete?.first_name} {employeeToDelete?.last_name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
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
