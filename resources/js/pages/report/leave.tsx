import React, { useState, useEffect } from 'react';
import Layout from '@/layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { formatPayrollBranchLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import {
    FileText,
    CheckCircle,
    Clock,
    XCircle,
    Calendar,
    Filter,
    Search,
    Download,
    Users,
    Building2,
    User,
    CalendarDays
} from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Branch {
    id: number;
    name: string;
    branch_code: string;
}

interface Department {
    id: number;
    name: string;
    branch_id?: number;
}

interface Designation {
    id: number;
    name: string;
    department_id: number;
}

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    department: {
        id: number;
        name: string;
    };
    designation: {
        id: number;
        name: string;
    };
    current_branch_id: number;
}

interface LeaveType {
    id: number;
    name: string;
    days_allowed: number;
    is_paid: boolean;
}

interface LeaveApplication {
    id: number;
    employee: Employee;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    days: number;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
    applied_at: string;
    approved_by?: {
        id: number;
        name: string;
    };
    rejection_reason?: string;
}

interface Props {
    applications: {
        data: LeaveApplication[];
        links?: any[];
        meta?: {
            from?: number;
            to?: number;
            total?: number;
            current_page?: number;
            last_page?: number;
            per_page?: number;
        };
    };
    departments: Department[];
    employees: Employee[];
    leaveTypes: LeaveType[];
    branches?: Branch[];
    filters: {
        start_date?: string;
        end_date?: string;
        status?: string;
        department_id?: string;
        leave_type_id?: string;
        employee_id?: string;
        branch_id?: string;
    };
    startDate: string;
    endDate: string;
    summary: {
        total: number;
        approved: number;
        rejected: number;
        pending: number;
        totalDays: number;
    };
}

const LeaveReport: React.FC<Props> = ({
    applications = { data: [], links: [], meta: {} },
    departments = [],
    employees = [],
    leaveTypes = [],
    branches = [],
    filters = {},
    startDate,
    endDate,
    summary = { total: 0, approved: 0, rejected: 0, pending: 0, totalDays: 0 }
}) => {
    const [localFilters, setLocalFilters] = useState(filters);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Ensure applications data is properly structured
    const applicationsData = applications?.data || [];
    const paginationLinks = applications?.links || [];
    const paginationMeta = applications?.meta || {};

    // Debug logging to see the actual structure
    useEffect(() => {
        console.log('=== LEAVE REPORT DEBUG ===');
        console.log('Applications structure:', applications);
        console.log('Applications.meta:', applications?.meta);
        console.log('PaginationMeta:', paginationMeta);
        console.log('Applications.data length:', applicationsData.length);
        console.log('==========================');
    }, [applications]);

    // Completely safe pagination render function
    const renderPaginationInfo = () => {
        try {
            const from = paginationMeta?.from || (applicationsData.length > 0 ? 1 : 0);
            const to = paginationMeta?.to || applicationsData.length;
            const total = paginationMeta?.total || applicationsData.length;

            return (
                <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{from}</span> to{' '}
                    <span className="font-medium">{to}</span> of{' '}
                    <span className="font-medium">{total}</span> results
                </p>
            );
        } catch (error) {
            console.error('Error rendering pagination info:', error);
            return (
                <p className="text-sm text-gray-700">
                    Showing results
                </p>
            );
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        // Remove empty filters
        const cleanFilters = Object.fromEntries(
            Object.entries(newFilters).filter(([_, v]) => v !== '')
        );

        router.get(route('reports.leave'), cleanFilters, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                // Update local variables after successful request
                console.log('Filters applied successfully');
            }
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                border: 'border-yellow-200',
                icon: Clock
            },
            approved: {
                bg: 'bg-green-100',
                text: 'text-green-800',
                border: 'border-green-200',
                icon: CheckCircle
            },
            rejected: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                border: 'border-red-200',
                icon: XCircle
            },
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        const IconComponent = config.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                <IconComponent className="w-3 h-3 mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const clearFilters = () => {
        router.get(route('reports.leave'));
    };

    const exportData = () => {
        // Create URL with current filters
        const params = new URLSearchParams();

        Object.entries(localFilters).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });

        // Add date range if not in filters
        if (!params.get('start_date')) {
            params.append('start_date', startDate);
        }
        if (!params.get('end_date')) {
            params.append('end_date', endDate);
        }

        // Create download URL
        const downloadUrl = route('reports.leave.pdf') + '?' + params.toString();

        // Trigger download
        window.open(downloadUrl, '_blank');
    };

    const getEmployeeFullName = (employee: Employee) => employeeDisplayName(employee);

    return (
        <Layout>
            <Head title="Leave Report" />

            <div className="py-6">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                    <FileText className="w-8 h-8 mr-3 text-blue-600" />
                                    Leave Report
                                </h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    Comprehensive overview of leave applications and statistics
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={exportData}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </button>

                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Applications</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Approved</p>
                                    <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-yellow-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                                    <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <CalendarDays className="w-4 h-4 text-purple-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Days</p>
                                    <p className="text-2xl font-bold text-purple-600">{summary.totalDays}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    {showAdvancedFilters && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                    <Filter className="w-5 h-5 mr-2" />
                                    Filters
                                </h3>
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Clear all filters
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={localFilters.start_date || startDate}
                                        onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={localFilters.end_date || endDate}
                                        onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={localFilters.status || ''}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                        <Building2 className="w-4 h-4 mr-1" />
                                        Department
                                    </label>
                                    <select
                                        value={localFilters.department_id || ''}
                                        onChange={(e) => handleFilterChange('department_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                        <User className="w-4 h-4 mr-1" />
                                        Employee
                                    </label>
                                    <select
                                        value={localFilters.employee_id || ''}
                                        onChange={(e) => handleFilterChange('employee_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All Employees</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {getEmployeeFullName(emp)} ({emp.employee_id})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                                    <select
                                        value={localFilters.leave_type_id || ''}
                                        onChange={(e) => handleFilterChange('leave_type_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All Types</option>
                                        {leaveTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {branches.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                            <Building2 className="w-4 h-4 mr-1" />
                                            Branch
                                        </label>
                                        <select
                                            value={localFilters.branch_id || ''}
                                            onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">All Branches</option>
                                            {sortPayrollBranches(branches).map((branch) => (
                                                <option key={branch.id} value={branch.id}>
                                                    {formatPayrollBranchLabel(branch)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                        <Users className="w-5 h-5 mr-2" />
                                        Leave Applications
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {(() => {
                                            try {
                                                const from = paginationMeta?.from || (applicationsData.length > 0 ? 1 : 0);
                                                const to = paginationMeta?.to || applicationsData.length;
                                                const total = paginationMeta?.total || applicationsData.length;
                                                return `${from}-${to} of ${total} applications`;
                                            } catch (error) {
                                                console.error('Error in pagination text:', error);
                                                return `${applicationsData.length} applications`;
                                            }
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Department & Designation
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Leave Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Duration
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Days
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Applied Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reason
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {applicationsData.length > 0 ? (
                                        applicationsData.map((application) => (
                                            <tr key={application.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                                <User className="h-5 w-5 text-gray-600" />
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {getEmployeeFullName(application.employee)}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                ID: {application.employee.employee_id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {application.employee.department.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {application.employee.designation.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${application.leave_type.is_paid
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {application.leave_type.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {application.leave_type.is_paid ? 'Paid' : 'Unpaid'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex flex-col space-y-1">
                                                        <div className="flex items-center text-sm">
                                                            <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                                                            {formatDate(application.start_date)}
                                                        </div>
                                                        <div className="text-gray-500 text-xs text-center">to</div>
                                                        <div className="flex items-center text-sm">
                                                            <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                                                            {formatDate(application.end_date)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        <CalendarDays className="w-3 h-3 mr-1" />
                                                        {application.days} {application.days === 1 ? 'day' : 'days'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(application.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center">
                                                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                                                        {formatDate(application.applied_at)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="text-sm text-gray-900 truncate" title={application.reason}>
                                                        {application.reason || 'No reason provided'}
                                                    </div>
                                                    {application.rejection_reason && application.status === 'rejected' && (
                                                        <div className="text-xs text-red-600 mt-1 truncate" title={application.rejection_reason}>
                                                            Rejection: {application.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <Search className="w-12 h-12 text-gray-400 mb-4" />
                                                    <h3 className="text-sm font-medium text-gray-900 mb-1">No leave applications found</h3>
                                                    <p className="text-sm text-gray-500">Try adjusting your filters or date range.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {applications.data.length > 0 && (
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        {applications.links[0].url && (
                                            <a
                                                href={applications.links[0].url}
                                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Previous
                                            </a>
                                        )}
                                        {applications.links[applications.links.length - 1].url && (
                                            <a
                                                href={applications.links[applications.links.length - 1].url}
                                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Next
                                            </a>
                                        )}
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                {applications?.meta ? (
                                                    <>
                                                        Showing <span className="font-medium">{applications.meta.from}</span> to{' '}
                                                        <span className="font-medium">{applications.meta.to}</span> of{' '}
                                                        <span className="font-medium">{applications.meta.total}</span> results
                                                    </>
                                                ) : (
                                                    <>
                                                        Showing <span className="font-medium">{applications?.data?.length || 0}</span> results
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                {applications.links.map((link, index) => (
                                                    <a
                                                        key={index}
                                                        href={link.url || '#'}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${link.active
                                                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                            } ${index === 0 ? 'rounded-l-md' : ''} ${index === applications.links.length - 1 ? 'rounded-r-md' : ''
                                                            } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                ))}
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default LeaveReport;
