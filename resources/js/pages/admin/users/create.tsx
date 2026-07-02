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
import { EyeIcon, EyeOffIcon, ArrowLeft, User as UserIcon, Lock, Building, Users, Briefcase } from 'lucide-react';
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

interface UserCreateProps {
    roles: Role[];
    employees: Employee[];
    branches: Branch[];
    autoEmailDomain: string;
    errors: {
        [key: string]: string;
    };
}

export default function UserCreate({ roles, employees, branches, autoEmailDomain, errors }: UserCreateProps) {
    const { data, setData, post, processing } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_ids: [] as number[],
        primary_role_id: '',
        employee_id: '',
        branch_id: '',
        active_status: true,
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

    // Handle employee selection and auto-populate email
    const handleEmployeeChange = (value: string) => {
        const employeeId = value === 'none' ? '' : value;
        setData('employee_id', employeeId);

        // Find the selected employee
        if (employeeId) {
            const selectedEmployee = employees.find(emp => emp.id.toString() === employeeId);
            if (selectedEmployee) {
                setData('name', employeeFullName(selectedEmployee));
                const resolvedEmail = resolveEmployeeEmail(selectedEmployee, autoEmailDomain);
                if (resolvedEmail) {
                    setData('email', resolvedEmail);
                }
            }
        }
    };

    const checkPasswordStrength = (password: string) => {
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
            const newRoles = currentRoles.filter(id => id !== roleId);
            setData('role_ids', newRoles);

            // If we're removing the primary role, update primary_role_id
            if (data.primary_role_id === roleId) {
                setData('primary_role_id', newRoles.length > 0 ? newRoles[0] : '');
            }
        } else {
            // Add role if not selected
            const newRoles = [...currentRoles, roleId];
            setData('role_ids', newRoles);

            // If this is the first role, set it as primary automatically
            if (newRoles.length === 1 || !data.primary_role_id) {
                setData('primary_role_id', roleId);
            }
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // If there are roles selected but no primary role, use the first role as primary
        if (data.role_ids.length > 0 && !data.primary_role_id) {
            setData('primary_role_id', data.role_ids[0]);
        }

        post(route('admin.users.store'));
    };

    return (
        <Layout>
            <Head title="Add New User" />

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
                    <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
                    <p className="mt-1 text-gray-500">
                        Create a new user account with specific roles and permissions
                    </p>
                </div>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Reordered to put Employee Selection first */}
                        <Card className="shadow-sm">
                            <CardHeader className="border-b bg-gray-50">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-full bg-purple-100 p-1.5">
                                        <Briefcase className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Employee Association</CardTitle>
                                        <CardDescription>Link this user to an employee record</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="employee_id" className="flex items-center gap-1">
                                            <Briefcase className="h-4 w-4" />
                                            <span>Select Employee <span className="text-red-500">*</span></span>
                                        </Label>
                                        <Select
                                            value={data.employee_id ? data.employee_id.toString() : undefined}
                                            onValueChange={handleEmployeeChange}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select an employee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(employee => (
                                                    <SelectItem key={employee.id} value={employee.id.toString()}>
                                                        {employeeFullName(employee)} ({employee.employee_id})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.employee_id && <p className="mt-1 text-sm text-red-500">{errors.employee_id}</p>}
                                        <p className="text-xs text-gray-500">
                                            Select an employee to link with this user account. Email will be auto-populated.
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

                                    <div className="space-y-2">
                                        <Label htmlFor="roles">
                                            System Roles <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="space-y-4 border rounded-md p-3">
                                            {roles.map(role => (
                                                <div key={role.id} className="space-y-1">
                                                    <div className="flex items-center space-x-2">
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
                                                    {data.role_ids.includes(role.id) && (
                                                        <div className="pl-6">
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="radio"
                                                                    id={`primary-${role.id}`}
                                                                    name="primary_role"
                                                                    value={role.id}
                                                                    checked={data.primary_role_id === role.id}
                                                                    onChange={() => setData('primary_role_id', role.id)}
                                                                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                                                                />
                                                                <Label
                                                                    htmlFor={`primary-${role.id}`}
                                                                    className="text-xs text-gray-600 font-normal cursor-pointer"
                                                                >
                                                                    Set as primary role
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {errors.role_ids && <p className="mt-1 text-sm text-red-500">{errors.role_ids}</p>}
                                        {errors.primary_role_id && <p className="mt-1 text-sm text-red-500">{errors.primary_role_id}</p>}
                                        {data.role_ids.length > 0 && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                {data.role_ids.length} role(s) selected
                                                {data.primary_role_id && ` (Primary: ${roles.find(r => r.id === data.primary_role_id)?.name})`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Account Information */}
                        <Card className="shadow-sm">
                            <CardHeader className="border-b bg-gray-50">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-full bg-blue-100 p-1.5">
                                        <UserIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Account Information</CardTitle>
                                        <CardDescription>Basic user account details</CardDescription>
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
                                        <Label htmlFor="login-username-preview">Login username</Label>
                                        <Input
                                            id="login-username-preview"
                                            type="text"
                                            readOnly
                                            value={loginUsernamePreview}
                                            placeholder="Select an employee first"
                                            className="bg-gray-50 font-mono text-sm"
                                            spellCheck={false}
                                        />
                                        <p className="text-xs text-gray-500">
                                            Same as the employee&apos;s ID in the system (e.g. 5 → username 5). If ID is empty, biometric PIN is used.
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
                                            readOnly={!!data.employee_id} // Make it read-only if an employee is selected
                                            className={data.employee_id ? "bg-gray-50" : ""}
                                        />
                                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                                        {!!data.employee_id && (
                                            <p className="text-xs text-gray-500">
                                                Email is taken from the selected employee, or auto-generated if none is set
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">
                                            Password <span className="text-red-500">*</span>
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
                                                placeholder="Enter password"
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
                                            Confirm Password <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="password_confirmation"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={data.password_confirmation}
                                                onChange={e => setData('password_confirmation', e.target.value)}
                                                placeholder="Confirm password"
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
                                        <Label htmlFor="active_status" className="flex items-center space-x-2 font-normal">
                                            <span>Active Account</span>
                                        </Label>
                                        <Switch
                                            id="active_status"
                                            checked={data.active_status}
                                            onCheckedChange={(checked) => setData('active_status', checked)}
                                        />
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
                        <Button type="submit" disabled={processing || !data.employee_id}>
                            {processing ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
