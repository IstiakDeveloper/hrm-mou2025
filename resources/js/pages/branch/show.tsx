import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ArrowLeft,
  Building,
  Edit,
  ExternalLink,
  MapPin,
  Phone,
  Hash,
  User,
  Briefcase,
  Users
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  photo: string | null;
  department: {
    id: number;
    name: string;
  };
  designation: {
    id: number;
    name: string;
  };
}

interface HeadEmployee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  photo: string | null;
}

interface Branch {
  id: number;
  name: string;
  address: string | null;
  contact_number: string | null;
  branch_code: string;
  is_head_office: boolean;
  headEmployee: HeadEmployee | null;
}

interface PaginationLinks {
  url: string | null;
  label: string;
  active: boolean;
}

interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  links: PaginationLinks[];
  path: string;
  per_page: number;
  to: number;
  total: number;
}

interface EmployeesResponse {
  data: Employee[];
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: PaginationMeta;
}

interface BranchShowProps {
  branch: Branch;
  employees: EmployeesResponse;
}

export default function BranchShow({ branch, employees }: BranchShowProps) {
  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Check if pagination data exists
  const hasPagination = employees.meta && employees.links;
  const totalEmployees = employees.meta?.total || employees.data.length;

  return (
    <Layout>
      <Head title={`Branch: ${branch.name}`} />

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

        {/* Branch Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">{branch.name}</h1>
              {branch.is_head_office && (
                <Badge className="ml-3 bg-green-100 text-green-800 hover:bg-green-100">
                  Head Office
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center">
              <Hash className="mr-1 h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Branch Code: {branch.branch_code}</span>
            </div>
          </div>

          <div className="mt-4 md:mt-0">
            <Link href={route('branches.edit', branch.id)}>
              <Button className="flex items-center">
                <Edit className="mr-1 h-4 w-4" />
                Edit Branch
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Branch Information */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-green-100 p-1.5">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle>Branch Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {branch.address && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Address</h3>
                      <p className="text-gray-900">{branch.address}</p>
                    </div>
                  </div>
                )}

                {branch.contact_number && (
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Contact Number</h3>
                      <p className="text-gray-900">{branch.contact_number}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Branch Head */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-purple-100 p-1.5">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle>Branch Head</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {branch.headEmployee ? (
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 border border-gray-200">
                    {branch.headEmployee.photo ? (
                      <AvatarImage
                        src={`/storage/${branch.headEmployee.photo}`}
                        alt={`${branch.headEmployee.first_name} ${branch.headEmployee.last_name}`}
                      />
                    ) : (
                      <AvatarFallback className="bg-purple-100 text-purple-600">
                        {getInitials(branch.headEmployee.first_name, branch.headEmployee.last_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="ml-4">
                    <Link
                      href={route('employees.show', branch.headEmployee.id)}
                      className="text-base font-medium text-gray-900 hover:text-blue-600"
                    >
                      {branch.headEmployee.first_name} {branch.headEmployee.last_name}
                    </Link>
                    <p className="text-sm text-gray-500">ID: {branch.headEmployee.employee_id}</p>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 flex flex-col items-center justify-center py-4">
                  <User className="h-10 w-10 text-gray-300 mb-2" />
                  <p>No branch head assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
            <Users className="h-5 w-5 mr-2 text-gray-500" />
            Employees at this Branch ({totalEmployees})
          </h2>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.data.length > 0 ? (
                    employees.data.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              {employee.photo ? (
                                <AvatarImage
                                  src={`/storage/${employee.photo}`}
                                  alt={`${employee.first_name} ${employee.last_name}`}
                                />
                              ) : (
                                <AvatarFallback className="bg-gray-100 text-gray-600">
                                  {getInitials(employee.first_name, employee.last_name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="font-medium">
                              {employee.first_name} {employee.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{employee.employee_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {employee.department.name}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.designation.name}</TableCell>
                        <TableCell className="text-right">
                          <Link href={route('employees.show', employee.id)}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">View employee</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No employees at this branch
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination - Only render if pagination data exists */}
          {hasPagination && employees.meta && employees.meta.last_page > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  {employees.meta.current_page > 1 && employees.links?.prev && (
                    <PaginationItem>
                      <PaginationPrevious
                        href={employees.links.prev || '#'}
                        onClick={(e) => {
                          e.preventDefault();
                          if (employees.links?.prev) {
                            router.get(employees.links.prev);
                          }
                        }}
                      />
                    </PaginationItem>
                  )}

                  {employees.meta.links && employees.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
                    const isPageNumber = !isNaN(Number(link.label));

                    if (!isPageNumber && link.label === '...') {
                      return (
                        <PaginationItem key={i}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href={link.url || '#'}
                          isActive={link.active}
                          onClick={(e) => {
                            e.preventDefault();
                            if (link.url) {
                              router.get(link.url);
                            }
                          }}
                        >
                          {link.label}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {employees.meta.current_page < employees.meta.last_page && employees.links?.next && (
                    <PaginationItem>
                      <PaginationNext
                        href={employees.links.next || '#'}
                        onClick={(e) => {
                          e.preventDefault();
                          if (employees.links?.next) {
                            router.get(employees.links.next);
                          }
                        }}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
