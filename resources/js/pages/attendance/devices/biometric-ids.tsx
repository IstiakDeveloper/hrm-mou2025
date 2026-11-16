import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import {
  Search,
  Fingerprint,
  UserCheck,
  Building,
  Briefcase
} from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Department {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Employee extends EmployeeNameFields {
  id: number;
  employee_id: string;
  biometric_id: string | null;
  department_id: number;
  current_branch_id: number;
  department: Department;
  branch: Branch;
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
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface BiometricIdsProps {
  employees: EmployeesResponse;
}

export default function BiometricIds({ employees }: BiometricIdsProps) {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [biometricId, setBiometricId] = useState('');

  const handleSearch = () => {
    router.get(route('attendance.devices.biometric-ids'), {
      search
    }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setBiometricId(employee.biometric_id || '');
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedEmployee) return;

    router.put(route('attendance.employees.biometric-id', selectedEmployee.id), {
      biometric_id: biometricId
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setSelectedEmployee(null);
      }
    });
  };

  return (
    <Layout>
      <Head title="Employee Biometric IDs" />

      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Biometric IDs</h1>
            <p className="mt-1 text-gray-500">
              Map employees to their biometric fingerprint IDs from ZKTeco devices
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Search Employees</CardTitle>
            <CardDescription>Find employees to manage their biometric IDs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search by name or employee ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Button onClick={handleSearch}>
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Biometric ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.data && employees.data.length > 0 ? (
                  employees.data.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="font-medium">{employee.employee_id}</div>
                      </TableCell>
                      <TableCell>
                        {employeeDisplayName(employee)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Briefcase className="mr-2 h-4 w-4 text-gray-400" />
                          <span>{employee.department?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4 text-gray-400" />
                          <span>{employee.branch?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.biometric_id ? (
                          <div className="flex items-center">
                            <Fingerprint className="mr-2 h-4 w-4 text-green-500" />
                            <span>{employee.biometric_id}</span>
                          </div>
                        ) : (
                          <div className="text-gray-400 flex items-center">
                            <Fingerprint className="mr-2 h-4 w-4" />
                            <span>Not assigned</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(employee)}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Assign ID
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {employees.meta && employees.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {employees.meta.current_page > 1 && employees.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={employees.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(employees.links.prev || '', {
                          search
                        }, { preserveState: true });
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
                            router.get(link.url, {
                              search
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {employees.meta.current_page < employees.meta.last_page && employees.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={employees.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(employees.links.next || '', {
                          search
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Edit Biometric ID Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Biometric ID</DialogTitle>
            <DialogDescription>
              Enter the biometric ID for {employeeDisplayName(selectedEmployee ?? undefined)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label htmlFor="biometricId" className="block text-sm font-medium text-gray-700 mb-1">
              Biometric ID
            </label>
            <Input
              id="biometricId"
              value={biometricId}
              onChange={(e) => setBiometricId(e.target.value)}
              placeholder="Enter biometric ID from ZKTeco device"
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
