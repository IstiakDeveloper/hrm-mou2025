import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    Building,
    User,
    CreditCard,
    AlertTriangle,
    Pencil,
    UserCheck,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    XCircle,
    Timer,
    CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface Department {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Manager {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
}

interface BankAccountDetails {
    account_name: string;
    account_number: string;
    bank_name: string;
    branch_name: string;
}

interface LeaveType {
    id: number;
    name: string;
    days_allowed: number;
    is_paid: boolean;
    description: string | null;
    carry_forward: boolean;
}

interface LeaveBalance {
    id: number;
    employee_id: number;
    leave_type_id: number;
    year: number;
    allocated_days: number;
    used_days: number;
    remaining_days: number;
    leave_type: LeaveType;
}

interface LeaveApplication {
    id: number;
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    days: number;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    approved_by: number | null;
    applied_at: string;
    documents: string[] | null;
    rejection_reason: string | null;
    leave_type: LeaveType;
    created_at: string;
}

interface Movement {
    id: number;
    employee_id: number;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    to_datetime: string;
    purpose: string;
    destination: string | null;
    remarks: string | null;
    approved_by: number | null;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    created_at: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    gender: string;
    blood_group: string;
    date_of_birth: string;
    joining_date: string;
    address: string;
    photo: string | null;
    nid: string;
    emergency_contact: string;
    department: Department;
    designation: Designation;
    branch: Branch;
    manager: Manager | null;
    status: string;
    basic_salary: number;
    bank_account_details: string | null;
}

interface EmployeeShowProps {
    employee: Employee;
    currentYearLeaveBalances: LeaveBalance[];
    recentLeaveApplications: LeaveApplication[];
    recentMovements: Movement[];
}

// Helper function to get status badge for leave applications
const getLeaveStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
        <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

// Helper function to get status badge for movements
const getMovementStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
        completed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
        <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

// Format date range for leaves
const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.toDateString() === end.toDateString()) {
        return format(start, 'PPP');
    }

    return `${format(start, 'PP')} - ${format(end, 'PP')}`;
};

// Format datetime range for movements
const formatDateTimeRange = (fromDatetime: string, toDatetime: string) => {
    const from = new Date(fromDatetime);
    const to = new Date(toDatetime);

    const sameDay = from.toDateString() === to.toDateString();

    if (sameDay) {
        return `${format(from, 'PP')}, ${format(from, 'p')} - ${format(to, 'p')}`;
    }

    return `${format(from, 'PP p')} - ${format(to, 'PP p')}`;
};

export default function EmployeeShow({
    employee,
    currentYearLeaveBalances,
    recentLeaveApplications,
    recentMovements
}: EmployeeShowProps) {
    // Parse bank account details from JSON string
    let bankDetails: BankAccountDetails | null = null;

    if (employee.bank_account_details) {
        try {
            bankDetails = JSON.parse(employee.bank_account_details);
        } catch (e) {
            console.error('Error parsing bank account details:', e);
        }
    }

    // Get initials for avatar fallback
    const getInitials = () => {
        return `${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}`;
    };

    // Format status for display
    const getStatusBadge = () => {
        const statusColors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            on_leave: 'bg-blue-100 text-blue-800',
            terminated: 'bg-red-100 text-red-800',
        };

        const statusColor = statusColors[employee.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

        return (
            <Badge variant="outline" className={`${statusColor} border-0`}>
                {employee.status.charAt(0).toUpperCase() + employee.status.slice(1).replace('_', ' ')}
            </Badge>
        );
    };

    // Component for leave balances
    const LeaveBalancesTab = () => (
        <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-green-100 p-1.5">
                            <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <CardTitle>Leave Balances</CardTitle>
                            <CardDescription>Current year leave allocation and usage</CardDescription>
                        </div>
                    </div>
                    <Link href={route('employees.leaves.index', employee.id)}>
                        <Button variant="outline" size="sm" className="flex items-center">
                            <FileText className="mr-1 h-4 w-4" />
                            View All Leaves
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {currentYearLeaveBalances.length > 0 ? (
                    <div className="space-y-6">
                        {currentYearLeaveBalances.map((balance) => (
                            <div key={balance.id} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-medium text-sm text-gray-900">{balance.leave_type.name}</h4>
                                        <p className="text-xs text-gray-500">
                                            {balance.leave_type.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-medium">
                                            {balance.remaining_days} / {balance.allocated_days} days
                                        </span>
                                        <p className="text-xs text-gray-500">Remaining</p>
                                    </div>
                                </div>
                                <Progress
                                    value={(balance.used_days / balance.allocated_days) * 100}
                                    className="h-2"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No leave balances found for current year.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // Component for leave applications
    const LeaveApplicationsTab = () => (
        <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-blue-100 p-1.5">
                            <CalendarIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle>Leave Applications</CardTitle>
                            <CardDescription>Recent leave requests and their status</CardDescription>
                        </div>
                    </div>
                    <Link href={route('employees.leaves.index', employee.id)}>
                        <Button variant="outline" size="sm" className="flex items-center">
                            <FileText className="mr-1 h-4 w-4" />
                            View All Leaves
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {recentLeaveApplications.length > 0 ? (
                    <div className="space-y-4">
                        {recentLeaveApplications.map((leave) => (
                            <div key={leave.id} className="border rounded-md p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900">{leave.leave_type.name}</h4>
                                    {getLeaveStatusBadge(leave.status)}
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mb-1">
                                    <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                                    <span>{formatDateRange(leave.start_date, leave.end_date)}</span>
                                    <span className="mx-1.5">•</span>
                                    <span>{leave.days} day{leave.days !== 1 ? 's' : ''}</span>
                                </div>
                                {leave.reason && (
                                    <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>
                                )}
                                <div className="flex items-center text-xs text-gray-400 mt-2">
                                    <Clock className="h-3 w-3 mr-1" />
                                    <span>Applied on {format(new Date(leave.created_at), 'PP')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No recent leave applications found.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // Component for movements
    const MovementsTab = () => (
        <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-purple-100 p-1.5">
                            <Briefcase className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <CardTitle>Movements</CardTitle>
                            <CardDescription>Recent official and personal movements</CardDescription>
                        </div>
                    </div>
                    <Link href={route('employees.movements.index', employee.id)}>
                        <Button variant="outline" size="sm" className="flex items-center">
                            <FileText className="mr-1 h-4 w-4" />
                            View All Movements
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {recentMovements.length > 0 ? (
                    <div className="space-y-4">
                        {recentMovements.map((movement) => (
                            <div key={movement.id} className="border rounded-md p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center">
                                        <Badge variant="outline" className={`${movement.movement_type === 'official' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'} border-0 mr-2`}>
                                            {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                                        </Badge>
                                        <h4 className="font-medium text-gray-900">{movement.purpose}</h4>
                                    </div>
                                    {getMovementStatusBadge(movement.status)}
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mb-1">
                                    <Timer className="h-4 w-4 mr-1.5 text-gray-400" />
                                    <span>{formatDateTimeRange(movement.from_datetime, movement.to_datetime)}</span>
                                </div>
                                {movement.destination && (
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                                        <span>{movement.destination}</span>
                                    </div>
                                )}
                                {movement.remarks && (
                                    <p className="text-sm text-gray-600 mt-2">{movement.remarks}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No recent movements found.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Layout>
            <Head title={`Employee: ${employee.first_name} ${employee.last_name}`} />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link
                        href={route('employees.index')}
                        className="flex w-fit items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span>Back to Employees</span>
                    </Link>
                </div>

                {/* Header with employee summary */}
                <div className="mb-8 bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
                        <div className="absolute -bottom-16 left-8">
                            <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                                {employee.photo ? (
                                    <AvatarImage src={`/storage/${employee.photo}`} alt={`${employee.first_name} ${employee.last_name}`} />
                                ) : (
                                    <AvatarFallback className="text-3xl bg-blue-200">
                                        {getInitials()}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                        </div>
                    </div>

                    <div className="pt-20 pb-6 px-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {employee.first_name} {employee.last_name}
                                </h1>
                                <div className="mt-1 flex items-center space-x-4">
                                    <span className="text-gray-500">{employee.designation?.name}</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-500">{employee.department?.name}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{getStatusBadge()}</span>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                                <Link href={route('employees.documents.index', employee.id)}>
                                    <Button variant="outline" className="flex items-center">
                                        <FileText className="mr-1 h-4 w-4" />
                                        Documents
                                    </Button>
                                </Link>
                                <Link href={route('employees.edit', employee.id)}>
                                    <Button variant="outline" className="flex items-center">
                                        <Pencil className="mr-1 h-4 w-4" />
                                        Edit
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee details tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="mb-8">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="leave_movement">Leave & Movement</TabsTrigger>
                        <TabsTrigger value="personal">Personal Details</TabsTrigger>
                        <TabsTrigger value="employment">Employment Details</TabsTrigger>
                        <TabsTrigger value="financial">Financial Details</TabsTrigger>
                        <TabsTrigger value="documents" onClick={() => window.location.href = route('employees.documents.index', employee.id)}>
                            Documents
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Basic Info Card */}
                            <Card className="shadow-sm">
                                <CardHeader className="bg-gray-50 border-b">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-blue-100 p-1.5">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <CardTitle className="text-lg">Basic Information</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <dl className="space-y-4">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Employee Pin</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{employee.employee_id}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {employee.first_name} {employee.last_name}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                                            <dd className="mt-1 text-sm text-gray-900 flex items-center">
                                                <Mail className="mr-1 h-4 w-4 text-gray-400" />
                                                {employee.email}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                            <dd className="mt-1 text-sm text-gray-900 flex items-center">
                                                <Phone className="mr-1 h-4 w-4 text-gray-400" />
                                                {employee.phone || 'Not provided'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Gender</dt>
                                            <dd className="mt-1 text-sm text-gray-900 capitalize">
                                                {employee.gender || 'Not specified'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Blood Group</dt>
                                            <dd className="mt-1 text-sm text-gray-900 capitalize">
                                                {employee.blood_group || 'Not specified'}
                                            </dd>
                                        </div>
                                    </dl>
                                </CardContent>
                            </Card>

                            {/* Employment Card */}
                            <Card className="shadow-sm">
                                <CardHeader className="bg-gray-50 border-b">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-purple-100 p-1.5">
                                            <Briefcase className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <CardTitle className="text-lg">Employment Details</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <dl className="space-y-4">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Department</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{employee.department?.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Position</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{employee.designation?.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Branch</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{employee.branch?.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Reports To</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {employee.manager ? (
                                                    <div className="flex items-center">
                                                        <UserCheck className="mr-1 h-4 w-4 text-gray-400" />
                                                        {employee.manager.first_name} {employee.manager.last_name}
                                                    </div>
                                                ) : (
                                                    'None'
                                                )}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Joining Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900 flex items-center">
                                                <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                                                {employee.joining_date ? format(new Date(employee.joining_date), 'PPP') : 'Not specified'}
                                            </dd>
                                        </div>
                                    </dl>
                                </CardContent>
                            </Card>

                            {/* Documents and Emergency Contact Card */}
                            <div className="space-y-6">
                                {/* Documents Quick Access */}
                                <Card className="shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b">
                                        <div className="flex items-center space-x-3">
                                            <div className="rounded-full bg-blue-100 p-1.5">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <CardTitle className="text-lg">Documents</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <p className="text-sm text-gray-500 mb-3">
                                                Manage employee documents such as ID, contract, certificates
                                            </p>
                                            <Link href={route('employees.documents.index', employee.id)}>
                                                <Button className="flex items-center">
                                                    <FileText className="mr-1 h-4 w-4" />
                                                    View Documents
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Emergency Contact Card */}
                                <Card className="shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b">
                                        <div className="flex items-center space-x-3">
                                            <div className="rounded-full bg-red-100 p-1.5">
                                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                            </div>
                                            <CardTitle className="text-lg">Emergency Contact</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {employee.emergency_contact ? (
                                            <p className="text-sm text-gray-900">{employee.emergency_contact}</p>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No emergency contact provided</p>
                                        )}

                                        <Separator className="my-4" />

                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                                            {employee.address ? (
                                                <div className="flex text-sm text-gray-900">
                                                    <MapPin className="mr-1 h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <span>{employee.address}</span>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No address provided</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Leave & Movement Tab */}
                    <TabsContent value="leave_movement">
                        <Tabs defaultValue="leave_balances" className="w-full">
                            <TabsList className="mb-6">
                                <TabsTrigger value="leave_balances">Leave Balances</TabsTrigger>
                                <TabsTrigger value="leave_applications">Leave Applications</TabsTrigger>
                                <TabsTrigger value="movements">Movements</TabsTrigger>
                            </TabsList>

                            <TabsContent value="leave_balances">
                                <LeaveBalancesTab />
                            </TabsContent>

                            <TabsContent value="leave_applications">
                                <LeaveApplicationsTab />
                            </TabsContent>

                            <TabsContent value="movements">
                                <MovementsTab />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    {/* Personal Details Tab */}
                    <TabsContent value="personal">
                        <Card className="shadow-sm">
                            <CardHeader className="bg-gray-50 border-b">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-full bg-blue-100 p-1.5">
                                        <User className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Personal Information</CardTitle>
                                        <CardDescription>Detailed personal information</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Details</h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.first_name} {employee.last_name}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Employee Pin</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.employee_id}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                                                <dd className="mt-1 text-sm text-gray-900 capitalize">
                                                    {employee.gender || 'Not specified'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Blood Group</dt>
                                                <dd className="mt-1 text-sm text-gray-900 capitalize">
                                                    {employee.blood_group || 'Not specified'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.date_of_birth
                                                        ? format(new Date(employee.date_of_birth), 'PPP')
                                                        : 'Not provided'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">National ID</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.nid || 'Not provided'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Email</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.email}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.phone || 'Not provided'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Address</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.address || 'Not provided'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.emergency_contact || 'Not provided'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Employment Details Tab */}
                    <TabsContent value="employment">
                        <Card className="shadow-sm">
                            <CardHeader className="bg-gray-50 border-b">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-full bg-purple-100 p-1.5">
                                        <Briefcase className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Employment Information</CardTitle>
                                        <CardDescription>Job and organizational details</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Job Details</h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Department</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.department?.name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Designation</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.designation?.name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Branch</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.branch?.name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Reports To</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.manager
                                                        ? `${employee.manager.first_name} ${employee.manager.last_name} (${employee.manager.employee_id})`
                                                        : 'None'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Status</h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                                <dd className="mt-1">
                                                    {getStatusBadge()}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Joining Date</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.joining_date
                                                        ? format(new Date(employee.joining_date), 'PPP')
                                                        : 'Not specified'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Employment Duration</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {employee.joining_date
                                                        ? calculateDuration(new Date(employee.joining_date), new Date())
                                                        : 'Not available'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Financial Details Tab */}
                    <TabsContent value="financial">
                        <Card className="shadow-sm">
                            <CardHeader className="bg-gray-50 border-b">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-full bg-amber-100 p-1.5">
                                        <CreditCard className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <CardTitle>Financial Information</CardTitle>
                                        <CardDescription>Salary and banking details</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Salary Information</h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Basic Salary</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD'
                                                    }).format(employee.basic_salary || 0)}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Account Details</h3>
                                        {bankDetails ? (
                                            <dl className="space-y-4">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Account Holder</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {bankDetails.account_name || 'Not provided'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Account Number</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {bankDetails.account_number ?
                                                            `xxxx-xxxx-${bankDetails.account_number.slice(-4)}` :
                                                            'Not provided'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {bankDetails.bank_name || 'Not provided'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Branch</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {bankDetails.branch_name || 'Not provided'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No bank account details provided</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Documents Tab (This is just a placeholder - it will redirect) */}
                    <TabsContent value="documents">
                        <div className="flex justify-center items-center py-12">
                            <p>Redirecting to documents page...</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}

// Helper function to calculate duration between two dates
function calculateDuration(startDate: Date, endDate: Date): string {
    const diffInYears = endDate.getFullYear() - startDate.getFullYear();
    const diffInMonths = endDate.getMonth() - startDate.getMonth();

    let years = diffInYears;
    let months = diffInMonths;

    if (months < 0) {
        years--;
        months += 12;
    }

    let result = '';

    if (years > 0) {
        result += `${years} year${years > 1 ? 's' : ''}`;
    }

    if (months > 0) {
        if (result.length > 0) result += ' ';
        result += `${months} month${months > 1 ? 's' : ''}`;
    }

    if (result.length === 0) {
        const diffInDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        result = `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
    }

    return result;
}
