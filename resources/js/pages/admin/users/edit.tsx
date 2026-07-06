import React, { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { EyeIcon, EyeOffIcon, ArrowLeft, User as UserIcon, Lock, Building, Users, Briefcase, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { resolveEmployeeEmail, type UserFormEmployee } from '@/lib/user-employee-email';

interface Employee extends UserFormEmployee {
  first_name?: string | null;
  last_name?: string | null;
  name_en?: string | null;
}

function employeeFullName(employee: Employee): string {
  const nameEn = (employee.name_en ?? '').trim();
  if (nameEn) {
    return nameEn;
  }

  return [employee.first_name, employee.last_name]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function previewLoginUsername(emp: Employee | undefined): string {
  if (!emp) {
    return '';
  }
  const id = (emp.employee_id ?? '').trim();
  if (id !== '') {
    return id.slice(0, 191);
  }
  const pin = (emp.biometric_id != null ? String(emp.biometric_id) : '').trim();
  if (pin !== '') {
    return pin.slice(0, 191);
  }
  return `emp_${emp.id}`;
}

interface Branch {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  employee_id: number | null;
  branch_id: number | null;
  active_status: boolean;
  roles?: Role[]; // Changed from role to roles array
  employee?: Employee;
  branch?: Branch;
}

interface UserEditProps {
  user: User;
  roles: Role[];
  employees: Employee[];
  branches: Branch[];
  autoEmailDomain: string;
  errors: {
    [key: string]: string;
  };
}

export default function UserEdit({ user, roles, employees, branches, autoEmailDomain, errors }: UserEditProps) {
  // Extract role IDs from user.roles
  const userRoleIds = user.roles ? user.roles.map(role => role.id) : [];

  const linkedEmployeeOnLoad = employees.find((emp) => emp.id === user.employee_id);
  const initialUsername =
    user.username != null && String(user.username).trim() !== ''
      ? String(user.username).trim()
      : previewLoginUsername(linkedEmployeeOnLoad);
  const initialEmail = linkedEmployeeOnLoad
    ? resolveEmployeeEmail(linkedEmployeeOnLoad, autoEmailDomain)
    : (user.email || '');

  const { data, setData, put, processing } = useForm({
    name: user.name || '',
    username: initialUsername,
    email: initialEmail,
    password: '',
    password_confirmation: '',
    role_ids: userRoleIds, // Use the array of role IDs
    employee_id: user.employee_id ? user.employee_id.toString() : '',
    branch_id: user.branch_id ? user.branch_id.toString() : '',
    active_status: user.active_status,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  const selectedEmployeeForLogin = useMemo(
    () => employees.find(emp => emp.id.toString() === data.employee_id),
    [employees, data.employee_id],
  );
  const loginUsernamePreview = useMemo(
    () => previewLoginUsername(selectedEmployeeForLogin),
    [selectedEmployeeForLogin],
  );

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(0);
      return 0;
    }

    let score = 0;

    // Length check
    if (password.length >= 4) score += 1;
    if (password.length >= 8) score += 1;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;  // Has uppercase
    if (/[a-z]/.test(password)) score += 1;  // Has lowercase
    if (/[0-9]/.test(password)) score += 1;  // Has number
    if (/[^A-Za-z0-9]/.test(password)) score += 1;  // Has special char

    // Normalize to 0-5 range
    score = Math.min(5, score);

    setPasswordStrength(score);
    return score;
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return '';
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return 'bg-red-500';
      case 1: return 'bg-red-400';
      case 2: return 'bg-amber-400';
      case 3: return 'bg-amber-300';
      case 4: return 'bg-green-400';
      case 5: return 'bg-green-500';
      default: return 'bg-gray-200';
    }
  };

  // Handle role selection
  const handleRoleToggle = (roleId: number) => {
    const currentRoles = [...data.role_ids];
    
    if (currentRoles.includes(roleId)) {
      // Remove role if already selected
      setData('role_ids', currentRoles.filter(id => id !== roleId));
    } else {
      // Add role if not selected
      setData('role_ids', [...currentRoles, roleId]);
    }
  };

  const handleEmployeeChange = (value: string) => {
    const employeeId = value === 'none' ? '' : value;
    setData('employee_id', employeeId);

    const selectedEmployee = employees.find(employee => employee.id.toString() === employeeId);
    if (selectedEmployee) {
      const fullName = employeeFullName(selectedEmployee);
      if (fullName) {
        setData('name', fullName);
      }
      const resolvedEmail = resolveEmployeeEmail(selectedEmployee, autoEmailDomain);
      if (resolvedEmail) {
        setData('email', resolvedEmail);
      }
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('admin.users.update', user.id));
  };

  return (
    <Layout>
      <Head title={`Edit User - ${user.name}`} />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('admin.users.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Users</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
          <p className="mt-1 text-gray-500">
            Update user account information and permissions for <span className="font-medium">{user.name}</span>
          </p>
        </div>

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Account Information */}
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-blue-100 p-1.5">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Update user account details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={data.name}
                      onChange={e => setData('name', e.target.value)}
                      placeholder="Enter full name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">
                      Username <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={data.username}
                      onChange={(e) => setData('username', e.target.value)}
                      placeholder="Login username"
                      className="font-mono text-sm"
                      spellCheck={false}
                      autoComplete="username"
                    />
                    {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
                    <p className="text-xs text-gray-500">
                      Suggested from linked employee:{' '}
                      <span className="font-mono text-gray-700">{loginUsernamePreview || '—'}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={e => setData('email', e.target.value)}
                      placeholder="user@example.com"
                      readOnly={!!data.employee_id}
                      className={data.employee_id ? 'bg-gray-50' : ''}
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                    {!!data.employee_id && (
                      <p className="text-xs text-gray-500">
                        Email is taken from the linked employee, or auto-generated if none is set
                      </p>
                    )}
                  </div>

                  <Separator className="my-2" />

                  <Alert variant="outline" className="bg-amber-50 border-amber-200 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700">
                      Leave password fields empty to keep the current password
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={data.password}
                        onChange={e => {
                          setData('password', e.target.value);
                          checkPasswordStrength(e.target.value);
                        }}
                        placeholder="Enter new password (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        )}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}

                    {/* Password Strength Meter */}
                    {data.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full ${getPasswordStrengthColor()}`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Strength:</span>
                          <span className={passwordStrength >= 3 ? 'text-green-600' : 'text-amber-600'}>
                            {getPasswordStrengthText()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={data.password_confirmation}
                        onChange={e => setData('password_confirmation', e.target.value)}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                        )}
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <p className="mt-1 text-sm text-red-500">{errors.password_confirmation}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="active_status"
                      checked={data.active_status}
                      onCheckedChange={(checked) => setData('active_status', checked)}
                    />
                    <Label htmlFor="active_status" className="flex items-center space-x-2 font-normal">
                      <span>Active Account</span>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Role & Association */}
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-purple-100 p-1.5">
                    <Lock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Roles & Association</CardTitle>
                    <CardDescription>Update user system roles and associations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="roles">
                      System Roles <span className="text-red-500">*</span>
                    </Label>
                    <div className="space-y-2 border rounded-md p-3">
                      {roles.map(role => (
                        <div key={role.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`role-${role.id}`} 
                            checked={data.role_ids.includes(role.id)}
                            onCheckedChange={() => handleRoleToggle(role.id)}
                          />
                          <Label 
                            htmlFor={`role-${role.id}`} 
                            className="font-normal cursor-pointer"
                          >
                            {role.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.role_ids && <p className="mt-1 text-sm text-red-500">{errors.role_ids}</p>}
                    {data.role_ids.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {data.role_ids.length} role(s) selected
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="employee_id" className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>Link to Employee (Optional)</span>
                    </Label>
                    <Select
                      value={data.employee_id ? data.employee_id.toString() : 'none'}
                      onValueChange={handleEmployeeChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employeeFullName(employee)} ({employee.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.employee_id && <p className="mt-1 text-sm text-red-500">{errors.employee_id}</p>}
                    <p className="text-xs text-gray-500">
                      Associate this user account with an employee record
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch_id" className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>Branch (Optional)</span>
                    </Label>
                    <Select
                      value={data.branch_id ? data.branch_id.toString() : undefined}
                      onValueChange={value => setData('branch_id', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {sortPayrollBranches(branches).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {formatBranchSelectLabel(branch)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.branch_id && <p className="mt-1 text-sm text-red-500">{errors.branch_id}</p>}
                    <p className="text-xs text-gray-500">
                      Associate this user account with a specific branch
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Link href={route('admin.users.index')}>
              <Button type="button" variant="outline" className="border-gray-300">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={processing}>
              {processing ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}