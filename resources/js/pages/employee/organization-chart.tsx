import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Search,
  Building
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Designation {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: Designation;
  photo: string | null;
}

interface Department {
  id: number;
  name: string;
  headEmployee: Employee | null;
  employees: Employee[];
}

interface OrganizationChartProps {
  departments: Department[];
}

export default function OrganizationChart({ departments }: OrganizationChartProps) {
  const [expandedDepts, setExpandedDepts] = useState<number[]>(departments.map(dept => dept.id));
  const [searchTerm, setSearchTerm] = useState('');

  // Toggle department expansion
  const toggleDepartment = (deptId: number) => {
    setExpandedDepts(prev =>
      prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  // Filter departments based on search term
  const filteredDepartments = departments.filter(dept => {
    const deptNameMatch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
    const employeeMatch = dept.employees.some(emp =>
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return deptNameMatch || employeeMatch;
  });

  // Get employee initials for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <Layout>
      <Head title="Organization Chart" />

      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>
          <p className="mt-1 text-gray-500">
            View the organizational structure by department
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search by name, ID, or position..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Departments and employees */}
        <div className="space-y-6">
          {filteredDepartments.length > 0 ? (
            filteredDepartments.map((department) => (
              <Card key={department.id} className="shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50 border-b px-6 py-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleDepartment(department.id)}
                  >
                    <div className="flex items-center">
                      <div className="rounded-full bg-blue-100 p-1.5 mr-3">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{department.name}</CardTitle>
                        <CardDescription>
                          {department.employees.length} {department.employees.length === 1 ? 'employee' : 'employees'}
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="rounded-full p-0 w-8 h-8">
                      {expandedDepts.includes(department.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {expandedDepts.includes(department.id) && (
                  <CardContent className="p-0">
                    {/* Department head if exists */}
                    {department.headEmployee && (
                      <div className="p-6 border-b">
                        <div className="flex items-start">
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
                            <h4 className="text-sm font-medium flex items-center">
                              {department.headEmployee.first_name} {department.headEmployee.last_name}
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                                Department Head
                              </span>
                            </h4>
                            <p className="text-sm text-gray-500">{department.headEmployee.designation?.name}</p>
                            <p className="text-xs text-gray-400 mt-1">ID: {department.headEmployee.employee_id}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Department employees */}
                    <ScrollArea className="max-h-96">
                      <div className="divide-y">
                        {department.employees
                          .filter(emp => department.headEmployee?.id !== emp.id) // Filter out department head
                          .sort((a, b) => a.first_name.localeCompare(b.first_name))
                          .map((employee) => (
                            <div key={employee.id} className="p-4 hover:bg-gray-50">
                              <Link href={route('employees.show', employee.id)} className="flex items-center">
                                <Avatar className="h-10 w-10 border border-gray-200">
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
                                <div className="ml-3">
                                  <h4 className="text-sm font-medium">
                                    {employee.first_name} {employee.last_name}
                                  </h4>
                                  <div className="flex items-center mt-1">
                                    <p className="text-xs text-gray-500">{employee.designation?.name}</p>
                                    <span className="mx-2 text-gray-300">•</span>
                                    <p className="text-xs text-gray-400">ID: {employee.employee_id}</p>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          ))}

                        {department.employees
                          .filter(emp => department.headEmployee?.id !== emp.id)
                          .length === 0 && (
                          <div className="p-6 text-center text-gray-500">
                            <User className="h-10 w-10 mx-auto text-gray-300" />
                            <p className="mt-2">No other employees in this department</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card className="shadow-sm">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Results Found</h3>
                <p className="text-gray-500">
                  No departments or employees match your search criteria.
                </p>
                {searchTerm && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
