import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { EyeIcon, EyeOffIcon, ArrowLeft, User as UserIcon, Lock, Building, Users, Briefcase, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
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
  email: string;
  role_id: number | null;
  employee_id: number | null;
  branch_id: number | null;
  active_status: boolean;
  role?: Role;
  employee?: Employee;
  branch?: Branch;
}

interface UserEditProps {
  user: User;
  roles: Role[];
  employees: Employee[];
  branches: Branch[];
  errors: {
    [key: string]: string;
  };
}

export default function UserEdit({ user, roles, employees, branches, errors }: UserEditProps) {
  const { data, setData, put, processing } = useForm({
    name: user.name || '',
    email: user.email || '',
    password: '',
    password_confirmation: '',
    role_id: user.role_id ? user.role_id.toString() : '',
    employee_id: user.employee_id ? user.employee_id.toString() : '',
    branch_id: user.branch_id ? user.branch_id.toString() : '',
    active_status: user.active_status,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(0);
      return 0;
    }

    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

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
                    <Label htmlFor="email">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={e => setData('email', e.target.value)}
                      placeholder="user@example.com"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
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
                    <CardTitle>Role & Association</CardTitle>
                    <CardDescription>Update user system role and associations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="role">
                      System Role <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={data.role_id ? data.role_id.toString() : undefined}
                      onValueChange={value => setData('role_id', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.role_id && <p className="mt-1 text-sm text-red-500">{errors.role_id}</p>}
                    {data.role_id && (
                      <p className="mt-1 text-xs text-gray-500">
                        {roles.find(r => r.id.toString() === data.role_id)?.description || ''}
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
                      value={data.employee_id ? data.employee_id.toString() : undefined}
                      onValueChange={value => setData('employee_id', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.first_name} {employee.last_name} ({employee.employee_id})
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
                        {branches.map(branch => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name}
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
