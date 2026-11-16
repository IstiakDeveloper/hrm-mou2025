import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
<<<<<<< HEAD
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardCheck,
  Building2,
  BriefcaseBusiness
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: {
    id: number;
    name: string;
  } | null;
  designation: {
    id: number;
    name: string;
  } | null;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Movement {
  id: number;
  employee_id: number;
  movement_type: 'official' | 'personal';
  from_datetime: string;
  to_datetime: string;
  purpose: string;
  destination: string;
  remarks: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  approved_by: number | null;
  created_at: string;
  employee: Employee;
  approver: User | null;
}

interface ShowMovementProps {
  movement: Movement;
  canApprove: boolean;
}

export default function ShowMovement({ movement, canApprove }: ShowMovementProps) {
  const [remarks, setRemarks] = useState(movement.remarks || '');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = () => {
    setSubmitting(true);
    router.post(route('movements.approve', movement.id),
      { remarks: remarks || null },
      {
        onFinish: () => {
          setSubmitting(false);
          setIsApproveDialogOpen(false);
        }
      }
    );
  };

  const handleReject = () => {
    setSubmitting(true);
    router.post(route('movements.reject', movement.id),
      { remarks },
      {
        onFinish: () => {
          setSubmitting(false);
          setIsRejectDialogOpen(false);
        }
      }
    );
  };

  const handleComplete = () => {
    if (confirm('Mark this movement as completed?')) {
      router.post(route('movements.complete', movement.id));
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this movement request?')) {
      router.post(route('movements.cancel', movement.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="h-3.5 w-3.5 mr-1" />Pending
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3.5 w-3.5 mr-1" />Rejected
        </Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <XCircle className="h-3.5 w-3.5 mr-1" />Cancelled
        </Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />Completed
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'official':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
          <BriefcaseBusiness className="h-3.5 w-3.5 mr-1" />Official
        </Badge>;
      case 'personal':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <User className="h-3.5 w-3.5 mr-1" />Personal
        </Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const fromDate = new Date(movement.from_datetime);
  const toDate = new Date(movement.to_datetime);
  const duration = formatDistance(toDate, fromDate, { addSuffix: false });
  const createdAt = new Date(movement.created_at);

  // Calculate hours difference
  const hoursDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60));

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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Movement Request Details</h1>
            <p className="mt-1 text-gray-500">
              Request #{movement.id} • Created on {format(createdAt, 'MMMM d, yyyy')}
            </p>
          </div>

          <div className="flex space-x-2">
            {movement.status === 'pending' && (
              <Link href={route('movements.edit', movement.id)}>
                <Button variant="outline">Edit Request</Button>
              </Link>
            )}

            {movement.status === 'pending' && canApprove && (
              <>
                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approve Movement Request</DialogTitle>
                      <DialogDescription>
                        You are about to approve this movement request. You may add remarks if needed.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Add any remarks (optional)"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
                      <Button
                        onClick={handleApprove}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {submitting ? 'Processing...' : 'Approve Request'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Movement Request</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for rejecting this request.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Reason for rejection"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!remarks.trim() || submitting}
                      >
                        {submitting ? 'Processing...' : 'Reject Request'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {movement.status === 'approved' && (
              <Button onClick={handleComplete}>
                <ClipboardCheck className="mr-1 h-4 w-4" />
                Mark as Completed
              </Button>
            )}

            {movement.status === 'pending' && (
              <Button variant="destructive" onClick={handleCancel}>
                <XCircle className="mr-1 h-4 w-4" />
                Cancel Request
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Movement Details</CardTitle>
                    <CardDescription>
                      Created on {format(createdAt, 'MMMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end">
                    {getStatusBadge(movement.status)}
                    <span className="text-sm text-gray-500 mt-1">
                      Request #{movement.id}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Movement Type</p>
                    <p className="font-medium flex items-center">
                      {getMovementTypeBadge(movement.movement_type)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {movement.destination}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">From</p>
                    <div className="font-medium flex items-center">
                      <CalendarClock className="h-4 w-4 mr-1 text-gray-400" />
                      {format(fromDate, 'MMMM d, yyyy h:mm a')}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">To</p>
                    <div className="font-medium flex items-center">
                      <CalendarClock className="h-4 w-4 mr-1 text-gray-400" />
                      {format(toDate, 'MMMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-md flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-500" />
                    <span className="text-blue-800 font-medium">Duration</span>
                  </div>
                  <div className="text-blue-800 font-medium">
                    {duration} ({hoursDiff} hours)
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Purpose</p>
                  <div className="bg-gray-50 p-3 rounded-md">
                    {movement.purpose}
                  </div>
                </div>

                {movement.remarks && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Remarks</p>
                    <div className="bg-gray-50 p-3 rounded-md">
                      {movement.remarks}
                    </div>
                  </div>
                )}

                {movement.status === 'rejected' && (
                  <Alert variant="destructive" className="bg-red-50 text-red-800 border border-red-200">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      <strong>Rejection Reason:</strong> {movement.remarks || 'No reason provided'}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Timeline */}
                <div className="mt-6 pt-4 border-t">
                  <h3 className="font-medium mb-4">Request Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="rounded-full h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-600">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="h-full w-0.5 bg-gray-200 my-1"></div>
                      </div>
                      <div>
                        <p className="font-medium">Request Created</p>
                        <p className="text-sm text-gray-500">{format(createdAt, 'MMMM d, yyyy h:mm a')}</p>
                      </div>
                    </div>

                    {(movement.status === 'approved' || movement.status === 'rejected') && movement.approver && (
                      <div className="flex">
                        <div className="flex flex-col items-center mr-4">
                          <div className={cn(
                            "rounded-full h-8 w-8 flex items-center justify-center",
                            movement.status === 'approved'
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          )}>
                            {movement.status === 'approved'
                              ? <CheckCircle2 className="h-4 w-4" />
                              : <XCircle className="h-4 w-4" />}
                          </div>
                          {movement.status === 'completed' && <div className="h-full w-0.5 bg-gray-200 my-1"></div>}
                        </div>
                        <div>
                          <p className="font-medium">
                            Request {movement.status === 'approved' ? 'Approved' : 'Rejected'} by {movement.approver.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {/* Assuming there's an updated_at field, fall back to created_at */}
                            {format(new Date(movement.created_at), 'MMMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    )}

                    {movement.status === 'completed' && (
                      <div className="flex">
                        <div className="flex flex-col items-center mr-4">
                          <div className="rounded-full h-8 w-8 flex items-center justify-center bg-green-100 text-green-600">
                            <ClipboardCheck className="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Movement Completed</p>
                          <p className="text-sm text-gray-500">
                            {/* Assuming there's an updated_at field, fall back to created_at */}
                            {format(new Date(movement.created_at), 'MMMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    )}

                    {movement.status === 'cancelled' && (
                      <div className="flex">
                        <div className="flex flex-col items-center mr-4">
                          <div className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-100 text-gray-600">
                            <XCircle className="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Request Cancelled</p>
                          <p className="text-sm text-gray-500">
                            {/* Assuming there's an updated_at field, fall back to created_at */}
                            {format(new Date(movement.created_at), 'MMMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval Information */}
            {(movement.status === 'approved' || movement.status === 'rejected') && movement.approver && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Approval Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <User className="h-5 w-5 mt-0.5 mr-3 text-gray-500" />
                      <div>
                        <p className="font-medium">{movement.approver.name}</p>
                        <p className="text-sm text-gray-500">{movement.approver.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Status</p>
                      <p>{getStatusBadge(movement.status)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="font-medium">{movement.employee.first_name} {movement.employee.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Employee ID</p>
                    <p>{movement.employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Department</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Building2 className="h-3.5 w-3.5 mr-1" />
                      {movement.employee.department?.name || 'No Department'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Designation</p>
                    <p>{movement.employee.designation?.name || 'No Designation'}</p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <div className="flex items-center mb-3">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    <h3 className="font-medium">Movement Duration</h3>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Start:</span>
                      <span className="font-medium">
                        {format(fromDate, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">End:</span>
                      <span className="font-medium">
                        {format(toDate, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="bg-blue-50 p-2 rounded mt-2 text-center">
                      <span className="text-blue-700 font-medium">
                        {hoursDiff} hours
                      </span>
                    </div>
                  </div>
                </div>

                {movement.status === 'pending' && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="font-medium mb-3">Quick Actions</h3>

                    <div className="space-y-2">
                      <Link href={route('movements.edit', movement.id)} className="w-full">
                        <Button variant="outline" className="w-full justify-start">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit Movement
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        className="w-full justify-start text-red-600 hover:text-red-700"
                        onClick={handleCancel}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Movement
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
=======
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
    start_meter_reading?: number | string | null;
    last_end_meter_reading?: number | string | null;
    start_place?: string | null;
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
                movementType={movement.movement_type}
                startMeterReading={movement.last_end_meter_reading ?? movement.start_meter_reading}
                startPlace={movement.start_place}
                branchFallbackName={branchFallbackName}
            />
        </Layout>
    );
>>>>>>> feature/flutter-mobile-app
}
