import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Card,
    CardContent,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, CalendarClock, MapPin, ClipboardList, Clock, User, Building2, ArrowRightLeft, Check, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

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
    const [forgotReturnTime, setForgotReturnTime] = useState(false);
    const [customReturnTime, setCustomReturnTime] = useState(
        format(new Date(), "yyyy-MM-dd'T'HH:mm")
    );
    const [closeError, setCloseError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleClose = () => {
        setCloseError(null);
        if (forgotReturnTime && !customReturnTime?.trim()) {
            setCloseError('Please select the actual date and time you returned.');
            return;
        }

        setSubmitting(true);

        router.post(route('movements.complete', movement.id), {
            forgot_return_time: forgotReturnTime ? '1' : '0',
            actual_return_datetime: forgotReturnTime ? customReturnTime : null,
        }, {
            onFinish: () => {
                setSubmitting(false);
                setShowCloseDialog(false);
            }
        });
    };

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

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('movements.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Movement Requests
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
            </div>

            {/* Close Movement Dialog */}
            <Dialog
                open={showCloseDialog}
                onOpenChange={(open) => {
                    setShowCloseDialog(open);
                    if (open) {
                        setForgotReturnTime(false);
                        setCloseError(null);
                        setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Close Movement</DialogTitle>
                        <DialogDescription>
                            You are confirming that you have returned from your movement. Your actual return time will be recorded.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            By default, your return is recorded at <strong>the current time</strong> when you confirm.
                        </p>

                        <div className="flex items-start space-x-3 rounded-md border p-3">
                            <Checkbox
                                id="forgotReturnTime"
                                checked={forgotReturnTime}
                                onCheckedChange={(checked) => {
                                    setForgotReturnTime(checked === true);
                                    setCloseError(null);
                                    if (checked === true) {
                                        setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                                    }
                                }}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="forgotReturnTime" className="cursor-pointer font-medium">
                                    I forgot to close earlier — set actual return date &amp; time
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Check this if you already returned but did not close the movement. Then pick when you actually came back.
                                </p>
                            </div>
                        </div>

                        {forgotReturnTime && (
                            <div className="space-y-2">
                                <Label htmlFor="customTime">Actual return date &amp; time</Label>
                                <Input
                                    id="customTime"
                                    type="datetime-local"
                                    value={customReturnTime}
                                    onChange={(e) => setCustomReturnTime(e.target.value)}
                                />
                            </div>
                        )}

                        {closeError && (
                            <p className="text-sm font-medium text-red-600">{closeError}</p>
                        )}

                        <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm text-blue-700">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                This will mark your movement as completed and update your attendance records.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleClose}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={submitting}
                        >
                            {submitting ? 'Processing...' : 'Confirm Return'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
