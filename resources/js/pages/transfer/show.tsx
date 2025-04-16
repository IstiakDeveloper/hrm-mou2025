import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Building,
  Briefcase,
  User,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  CheckCircle,
  XOctagon,
  AlertTriangle
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

interface Branch {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface Designation {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Transfer {
  id: number;
  employee_id: number;
  from_branch_id: number;
  to_branch_id: number;
  from_department_id: number | null;
  to_department_id: number | null;
  from_designation_id: number | null;
  to_designation_id: number | null;
  effective_date: string;
  transfer_order_no: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  approved_by: number | null;
  employee: Employee;
  fromBranch: Branch;
  toBranch: Branch;
  fromDepartment: Department | null;
  toDepartment: Department | null;
  fromDesignation: Designation | null;
  toDesignation: Designation | null;
  approver: User | null;
}

interface ShowTransferProps {
  transfer: Transfer;
  canApprove: boolean;
}

export default function ShowTransfer({ transfer, canApprove }: ShowTransferProps) {
  const [reason, setReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = () => {
    if (confirm('Are you sure you want to approve this transfer request?')) {
      router.post(route('transfers.approve', transfer.id));
    }
  };

  const handleReject = () => {
    setSubmitting(true);
    router.post(route('transfers.reject', transfer.id), { reason }, {
      onFinish: () => {
        setSubmitting(false);
        setIsRejectDialogOpen(false);
      }
    });
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this transfer request?')) {
      router.post(route('transfers.cancel', transfer.id));
    }
  };

  const handleComplete = () => {
    if (confirm('Complete this transfer? This will update the employee records.')) {
      router.post(route('transfers.complete', transfer.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center">
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />Pending
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center">
          <XCircle className="h-3.5 w-3.5 mr-1" />Rejected
        </Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center">
          <XOctagon className="h-3.5 w-3.5 mr-1" />Cancelled
        </Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
          <CheckCircle className="h-3.5 w-3.5 mr-1" />Completed
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const effectiveDate = new Date(transfer.effective_date);

  return (
    <Layout>
      <Head title="Transfer Details" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('transfers.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Transfers
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transfer Request Details</h1>
            <p className="mt-1 text-gray-500">
              Request #{transfer.id}
            </p>
          </div>

          <div className="flex space-x-2">
            {transfer.status === 'pending' && (
              <Link href={route('transfers.edit', transfer.id)}>
                <Button variant="outline">Edit Request</Button>
              </Link>
            )}

            {transfer.status === 'pending' && canApprove && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Approve
                </Button>

                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Transfer Request</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for rejecting this transfer request.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Reason for rejection"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!reason.trim() || submitting}
                      >
                        {submitting ? 'Processing...' : 'Reject Request'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {transfer.status === 'approved' && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleComplete}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Complete Transfer
              </Button>
            )}

            {transfer.status === 'pending' && (
              <Button
                variant="destructive"
                onClick={handleCancel}
              >
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
                    <CardTitle>Transfer Details</CardTitle>
                    <CardDescription>
                      Effective Date: {format(effectiveDate, 'MMMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end">
                    {getStatusBadge(transfer.status)}
                    {transfer.transfer_order_no && (
                      <span className="text-sm text-gray-500 mt-1">
                        Order #{transfer.transfer_order_no}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <h3 className="text-base font-medium mb-4 flex items-center">
                      <Building className="h-4 w-4 mr-2 text-blue-600" />
                      Current Location
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Branch</p>
                        <p className="font-medium">{transfer.fromBranch?.name}</p>
                      </div>

                      {transfer.fromDepartment && (
                        <div>
                          <p className="text-sm text-gray-500">Department</p>
                          <p className="font-medium">{transfer.fromDepartment.name}</p>
                        </div>
                      )}

                      {transfer.fromDesignation && (
                        <div>
                          <p className="text-sm text-gray-500">Designation</p>
                          <p className="font-medium">{transfer.fromDesignation.name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-medium mb-4 flex items-center">
                      <ArrowRight className="h-4 w-4 mr-2 text-green-600" />
                      New Location
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Branch</p>
                        <p className="font-medium">{transfer.toBranch?.name}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Department</p>
                        <p className="font-medium">
                          {transfer.toDepartment?.name || (
                            <span className="text-gray-400">Same as current</span>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Designation</p>
                        <p className="font-medium">
                          {transfer.toDesignation?.name || (
                            <span className="text-gray-400">Same as current</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-medium mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-600" />
                    Reason for Transfer
                  </h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    {transfer.reason}
                  </div>
                </div>

                {transfer.status === 'rejected' && transfer.reason && (
                  <Alert variant="destructive" className="bg-red-50 text-red-800 border border-red-200">
                    <XCircle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      <strong>Rejection Reason:</strong> {transfer.reason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Timeline */}
                <div className="pt-4 border-t">
                  <h3 className="text-base font-medium mb-4">Request Timeline</h3>
                  <div className="space-y-6">
                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="rounded-full h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-600">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="h-full w-0.5 bg-gray-200 my-1"></div>
                      </div>
                      <div>
                        <p className="font-medium">Request Created</p>
                        <p className="text-sm text-gray-500">
                          Created by admin for {transfer.employee.first_name} {transfer.employee.last_name}
                        </p>
                      </div>
                    </div>

                    {(transfer.status === 'approved' || transfer.status === 'rejected') && transfer.approver && (
                      <div className="flex">
                        <div className="flex flex-col items-center mr-4">
                          <div className={cn(
                            "rounded-full h-8 w-8 flex items-center justify-center",
                            transfer.status === 'approved'
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          )}>
                            {transfer.status === 'approved'
                              ? <CheckCircle2 className="h-4 w-4" />
                              : <XCircle className="h-4 w-4" />}
                          </div>
                          {transfer.status === 'completed' && <div className="h-full w-0.5 bg-gray-200 my-1"></div>}
                        </div>
                        <div>
                          <p className="font-medium">
                            Request {transfer.status === 'approved' ? 'Approved' : 'Rejected'} by {transfer.approver.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {transfer.status === 'completed' && (
                      <div className="flex">
                        <div className="flex flex-col items-center mr-4">
                          <div className="rounded-full h-8 w-8 flex items-center justify-center bg-green-100 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Transfer Completed</p>
                          <p className="text-sm text-gray-500">
                            Employee records have been updated
                          </p>
                        </div>
                      </div>
                    )}

                    {transfer.status === 'cancelled' && (
                      <div className="flex">
                        <div className="flex flex-col items-center mr-4">
                          <div className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-100 text-gray-600">
                            <XOctagon className="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Request Cancelled</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
                    <p className="font-medium">{transfer.employee.first_name} {transfer.employee.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Employee ID</p>
                    <p>{transfer.employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Department</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {transfer.employee.department?.name || 'No Department'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Designation</p>
                    <p>{transfer.employee.designation?.name || 'No Designation'}</p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="font-medium mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Transfer Information
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Effective Date:</span>
                      <span className="font-medium">
                        {format(effectiveDate, 'MMMM d, yyyy')}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span>
                        {getStatusBadge(transfer.status)}
                      </span>
                    </div>

                    {transfer.transfer_order_no && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order Number:</span>
                        <span className="font-medium">{transfer.transfer_order_no}</span>
                      </div>
                    )}
                  </div>
                </div>

                {transfer.status === 'approved' && (
                  <Alert className="mt-6 bg-blue-50 border-blue-200">
                    <AlertTriangle className="h-4 w-4 text-blue-700" />
                    <AlertDescription className="text-blue-700">
                      This transfer has been approved but not yet completed. The employee's records will be updated when the transfer is completed.
                    </AlertDescription>
                  </Alert>
                )}

                {transfer.status === 'completed' && (
                  <Alert className="mt-6 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-700" />
                    <AlertDescription className="text-green-700">
                      This transfer has been completed. The employee's records have been updated with the new location information.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {(transfer.status === 'approved' || transfer.status === 'rejected') && transfer.approver && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Approval Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <User className="h-5 w-5 mt-0.5 mr-3 text-gray-500" />
                      <div>
                        <p className="font-medium">{transfer.approver.name}</p>
                        <p className="text-sm text-gray-500">{transfer.approver.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Status</p>
                      <p>{getStatusBadge(transfer.status)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

