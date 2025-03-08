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
    HelpCircle,
    MapPin,
    Phone,
    Briefcase,
    Users,
    User,
    Building2
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
    designation: {
        id: number;
        name: string;
    };
}

interface Branch {
    id: number;
    name: string;
}

interface ParentDepartment {
    id: number;
    name: string;
}

interface HeadEmployee {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    photo: string | null;
}

interface Department {
    id: number;
    name: string;
    description: string | null;
    branch: Branch;
    parentDepartment: ParentDepartment | null;
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

interface DepartmentShowProps {
    department: Department;
    employees: EmployeesResponse;
}

export default function DepartmentShow({ department, employees }: DepartmentShowProps) {
    // Get initials for avatar fallback
    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    };
    const hasPagination = employees.meta && employees.links;
    const totalEmployees = employees.meta?.total || employees.data.length;


    return (
        <Layout>
            <Head title={`Department: ${department.name}`} />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link
                        href={route('departments.index')}
                        className="flex w-fit items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span>Back to Departments</span>
                    </Link>
                </div>

                {/* Department Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{department.name}</h1>
                        <div className="mt-2 flex items-center flex-wrap gap-2">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                {department.branch.name}
                            </Badge>
                            {department.parentDepartment && (
                                <Badge variant="outline" className="border-gray-300">
                                    Sub-department of {department.parentDepartment.name}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 md:mt-0">
                        <Link href={route('departments.edit', department.id)}>
                            <Button className="flex items-center">
                                <Edit className="mr-1 h-4 w-4" />
                                Edit Department
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {/* Department Information */}
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-2">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-full bg-blue-100 p-1.5">
                                    <Building className="h-5 w-5 text-blue-600" />
                                </div>
                                <CardTitle>Department Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {department.description && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                                    <p className="text-gray-900">{department.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Branch</h3>
                                    <div className="flex items-center">
                                        <Building2 className="h-4 w-4 text-gray-400 mr-1" />
                                        <span className="text-gray-900">{department.branch.name}</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Parent Department</h3>
                                    <div className="flex items-center">
                                        {department.parentDepartment ? (
                                            <>
                                                <Building className="h-4 w-4 text-gray-400 mr-1" />
                                                <Link
                                                    href={route('departments.show', department.parentDepartment.id)}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {department.parentDepartment.name}
                                                </Link>
                                            </>
                                        ) : (
                                            <span className="text-gray-500">None</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Department Head */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-full bg-purple-100 p-1.5">
                                    <User className="h-5 w-5 text-purple-600" />
                                </div>
                                <CardTitle>Department Head</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {department.headEmployee ? (
                                <div className="flex items-center">
                                    <Avatar className="h-12 w-12 border border-gray-200">
                                        {department.headEmployee.photo ? (
                                            <AvatarImage
                                                src={`/storage/${department.headEmployee.photo}`}
                                                alt={`${department.headEmployee.first_name} ${department.headEmployee.last_name}`}
                                            />
                                        ) : (
                                            <AvatarFallback className="bg-purple-100 text-purple-600">
                                                {getInitials(department.headEmployee.first_name, department.headEmployee.last_name)}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div className="ml-4">
                                        <Link
                                            href={route('employees.show', department.headEmployee.id)}
                                            className="text-base font-medium text-gray-900 hover:text-blue-600"
                                        >
                                            {department.headEmployee.first_name} {department.headEmployee.last_name}
                                        </Link>
                                        <p className="text-sm text-gray-500">ID: {department.headEmployee.employee_id}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center text-gray-500">
                                    <HelpCircle className="h-5 w-5 mr-2" />
                                    <span>No department head assigned</span>
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
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No employees in this department
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    {hasPagination && employees.meta.last_page > 1 && (
                        <div className="mt-6">
                            <Pagination>
                                <PaginationContent>
                                    {employees.meta.current_page > 1 && (
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={employees.links.prev || '#'}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    router.get(employees.links.prev || '');
                                                }}
                                            />
                                        </PaginationItem>
                                    )}

                                    {employees.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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

                                    {employees.meta.current_page < employees.meta.last_page && (
                                        <PaginationItem>
                                            <PaginationNext
                                                href={employees.links.next || '#'}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    router.get(employees.links.next || '');
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
