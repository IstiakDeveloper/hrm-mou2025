import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, CalendarClock, MapPin, ClipboardList, Clock, User, Building2, ArrowRightLeft, Check, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { CloseMovementModal } from '@/components/close-movement-modal';

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    department?: {
        id: number;
        name: string;
    };
    designation?: {
        id: number;
        name: string;
    };
    branch?: {
        id: number;
        name: string;
    } | null;
}

interface Movement {
    id: number;
    employee_id: number;
    employee: Employee;
    movement_type: string;
    from_datetime: string;
    to_datetime: string;
    purpose: string;
    destination: string;
    remarks: string | null;
    work_result: string | null;
    status: string;
    is_returned: boolean;
    actual_return_datetime: string | null;
    created_at: string;
    updated_at: string;
}

interface ShowMovementProps {
    movement: Movement;
    canClose: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function ShowMovement({ movement, canClose, canEdit = false, canDelete = false }: ShowMovementProps) {
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const branchFallbackName = movement.employee?.branch?.name || '';

    const handleDelete = () => {
        if (!confirm('Delete this movement permanently? Linked attendance will be unlinked from this movement.')) {
            return;
        }
        router.delete(route('movements.destroy', movement.id));
    };

    // Format dates for display
    const fromDate = format(new Date(movement.from_datetime), 'MMM dd, yyyy h:mm a');
    const toDate = format(new Date(movement.to_datetime), 'MMM dd, yyyy h:mm a');
    const actualReturnDate = movement.actual_return_datetime
        ? format(new Date(movement.actual_return_datetime), 'MMM dd, yyyy h:mm a')
        : null;

    // Status badge color
    const getStatusColor = () => {
        switch (movement.status) {
            case 'active':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'completed':
                return 'bg-green-50 text-green-700 border-green-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <Layout>
            <Head title="Movement Details" />

            <PageSurface className="max-w-7xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-2">
                    <Link href={route('movements.index')} className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800">
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        <span>Back to Movement Requests</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 md:mb-0">Movement Details</h1>

                    <div className="flex flex-wrap gap-2">
                        {canEdit && (
                            <Link href={route('movements.edit', movement.id)}>
                                <Button variant="outline" type="button">
                                    <Pencil className="mr-1 h-4 w-4" />
                                    Edit
                                </Button>
                            </Link>
                        )}
                        {canDelete && (
                            <Button variant="destructive" type="button" onClick={handleDelete}>
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                            </Button>
                        )}
                        {canClose && (
                            <Button
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => setShowCloseDialog(true)}
                            >
                                <Check className="mr-1 h-4 w-4" />
                                Close Movement
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Movement Request #{movement.id}</CardTitle>
                                    <Badge variant="outline" className={getStatusColor()}>
                                        {movement.status === 'active' ? 'Active' : movement.status.charAt(0).toUpperCase() + movement.status.slice(1)}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Employee</h3>
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">
                                                    {employeeDisplayName(movement.employee)}
                                                </p>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {movement.employee.employee_id}
                                            </p>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Department</h3>
                                            <div className="flex items-center">
                                                <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">
                                                    {movement.employee.department?.name || 'No Department'}
                                                </p>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {movement.employee.designation?.name || 'No Designation'}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">From Date/Time</h3>
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">{fromDate}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">To Date/Time</h3>
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                <p className="font-medium">{toDate}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {movement.status === 'completed' && actualReturnDate && (
                                        <Alert variant="default" className="bg-green-50 border-green-200">
                                            <Clock className="h-4 w-4 text-green-600" />
                                            <AlertDescription className="text-green-700">
                                                <span className="font-semibold">Actual Return:</span> {actualReturnDate}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 mb-1">Movement Type</h3>
                                        <div className="flex items-center">
                                            <ArrowRightLeft className="h-4 w-4 mr-2 text-gray-400" />
                                            <p className="font-medium capitalize">
                                                {movement.movement_type}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 mb-1">Destination</h3>
                                        <div className="flex items-center">
                                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                            <p className="font-medium">
                                                {movement.destination}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 mb-1">Purpose</h3>
                                        <div className="flex">
                                            <ClipboardList className="h-4 w-4 mr-2 text-gray-400 mt-1 flex-shrink-0" />
                                            <p className="font-medium">
                                                {movement.purpose}
                                            </p>
                                        </div>
                                    </div>

                                    {movement.remarks && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Remarks</h3>
                                            <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                                                {movement.remarks}
                                            </p>
                                        </div>
                                    )}

                                    {movement.work_result && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-1">Work Result / Feedback</h3>
                                            <p className="text-gray-700 bg-green-50 border border-green-100 p-3 rounded-md whitespace-pre-wrap">
                                                {movement.work_result}
                                            </p>
                                        </div>
                                    )}

                                    <Separator />

                                    <div className="text-sm text-gray-500">
                                        <p>Created: {format(new Date(movement.created_at), 'MMM dd, yyyy h:mm a')}</p>
                                        <p>Last Updated: {format(new Date(movement.updated_at), 'MMM dd, yyyy h:mm a')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Movement Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative pl-8 border-l-2 border-blue-200 space-y-6 py-2">
                                    <div className="relative">
                                        <div className="absolute -left-[25px] p-1 rounded-full bg-blue-100 border-2 border-blue-300">
                                            <CalendarClock className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <h3 className="text-sm font-medium">Created</h3>
                                        <p className="text-xs text-gray-500">
                                            {format(new Date(movement.created_at), 'MMM dd, yyyy h:mm a')}
                                        </p>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute -left-[25px] p-1 rounded-full bg-green-100 border-2 border-green-300">
                                            <ArrowRightLeft className="h-4 w-4 text-green-600" />
                                        </div>
                                        <h3 className="text-sm font-medium">Began Movement</h3>
                                        <p className="text-xs text-gray-500">{fromDate}</p>
                                    </div>

                                    {movement.status === 'completed' && actualReturnDate && (
                                        <div className="relative">
                                            <div className="absolute -left-[25px] p-1 rounded-full bg-indigo-100 border-2 border-indigo-300">
                                                <Check className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <h3 className="text-sm font-medium">Movement Completed</h3>
                                            <p className="text-xs text-gray-500">{actualReturnDate}</p>
                                        </div>
                                    )}

                                    {movement.status === 'active' && (
                                        <div className="relative">
                                            <div className="absolute -left-[25px] p-1 rounded-full bg-gray-100 border-2 border-gray-300">
                                                <Clock className="h-4 w-4 text-gray-500" />
                                            </div>
                                            <h3 className="text-sm font-medium">Expected Return</h3>
                                            <p className="text-xs text-gray-500">{toDate}</p>
                                        </div>
                                    )}
                                </div>

                                {movement.status === 'active' && canClose && (
                                    <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                                        <div className="flex items-center mb-2">
                                            <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                                            <p className="text-sm font-medium text-amber-600">Remember to close this movement</p>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            When you return to the office, please close this movement to record your actual return time.
                                        </p>
                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={() => setShowCloseDialog(true)}
                                        >
                                            <Check className="mr-1 h-4 w-4" />
                                            Close Movement
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageSurface>

            {/* Close Movement Dialog */}
            <CloseMovementModal
                open={showCloseDialog}
                onOpenChange={setShowCloseDialog}
                movementId={movement.id}
                branchFallbackName={branchFallbackName}
            />
        </Layout>
    );
}
