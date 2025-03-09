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
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2, Download, FileText, Paperclip, User, UserX, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';

interface Department {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: Department;
  designation: {
    id: number;
    name: string;
  };
}

interface LeaveType {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

interface LeaveApproval {
  id: number;
  leave_application_id: number;
  approved_by: number;
  level: number;
  status: 'approved' | 'rejected';
  comments: string | null;
  approved_at: string;
  approver: User;
}

interface Document {
  name: string;
  path: string;
  type: string;
}

interface LeaveApplication {
  id: number;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applied_at: string;
  approved_by: number | null;
  rejection_reason: string | null;
  documents: Document[] | null;
  employee: Employee;
  leaveType: LeaveType;
  approver: User | null;
  approvals: LeaveApproval[];
}

interface ShowProps {
  application: LeaveApplication;
  canApprove: boolean;
}

export default function Show({ application, canApprove }: ShowProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = () => {
    setSubmitting(true);
    router.post(route('leave.applications.approve', application.id), {
      comments
    }, {
      onFinish: () => {
        setSubmitting(false);
        setApproveOpen(false);
      }
    });
  };

  const handleReject = () => {
    setSubmitting(true);
    router.post(route('leave.applications.reject', application.id), {
      rejection_reason: rejectionReason
    }, {
      onFinish: () => {
        setSubmitting(false);
        setRejectOpen(false);
      }
    });
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this leave application?')) {
      router.post(route('leave.applications.cancel', application.id));
    }
  };

  const downloadDocument = (index: number) => {
    window.open(route('leave.applications.download-document', [application.id, index]), '_blank');
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'cancelled': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const statusIcons: Record<string, React.ReactNode> = {
      'pending': <FileText className="mr-1 h-4 w-4" />,
      'approved': <CheckCircle2 className="mr-1 h-4 w-4" />,
      'rejected': <XCircle className="mr-1 h-4 w-4" />,
      'cancelled': <UserX className="mr-1 h-4 w-4" />
    };

    return (
      <Badge variant="outline" className={`${statusStyles[status]} flex items-center`}>
        {statusIcons[status]}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </Badge>
    );
  };

  return (
    <Layout>
      <Head title="Leave Application Details" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('leave.applications.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leave Applications
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Leave Application Details</h1>
          <div className="flex items-center space-x-2">
            {application.status === 'pending' && canApprove && (
              <>
                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approve Leave Application</DialogTitle>
                      <DialogDescription>
                        You are about to approve this leave application. Please add any comments if necessary.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="comments">Comments (Optional)</Label>
                        <Textarea
                          id="comments"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Add any additional comments..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setApproveOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleApprove} disabled={submitting}>
                        {submitting ? 'Processing...' : 'Approve Leave'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-600">
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Leave Application</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for rejecting this leave application.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="rejectionReason">Rejection Reason</Label>
                        <Textarea
                          id="rejectionReason"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Enter the reason for rejection..."
                          rows={4}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRejectOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={submitting || !rejectionReason.trim()}
                      >
                        {submitting ? 'Processing...' : 'Reject Leave'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {application.status === 'pending' &&
              application.employee_id === (window as any).auth?.user?.employee_id && (
                <Button variant="outline" className="text-gray-600" onClick={handleCancel}>
                  <UserX className="mr-1 h-4 w-4" />
                  Cancel Application
                </Button>
              )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Leave Details</CardTitle>
                <div className="flex items-center justify-between">
                  <CardDescription>
                    Applied on {format(new Date(application.applied_at), 'PPP')}
                  </CardDescription>
                  {getStatusBadge(application.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Leave Type</h3>
                  <p className="mt-1">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {application.leave_type?.name}
                    </Badge>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Date Range</h3>
                    <p className="mt-1 font-medium">
                      {format(new Date(application.start_date), 'PPP')} - {format(new Date(application.end_date), 'PPP')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                    <p className="mt-1 font-medium">
                      {application.days} {application.days > 1 ? 'days' : 'day'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Reason for Leave</h3>
                  <p className="mt-1 whitespace-pre-line">
                    {application.reason}
                  </p>
                </div>

                {application.documents && application.documents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Supporting Documents</h3>
                    <div className="mt-1 space-y-2">
                      {application.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center">
                            <Paperclip className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="truncate max-w-xs">{doc.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(index)}
                          >
                            <Download className="h-4 w-4 text-blue-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {application.rejection_reason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                    <p className="mt-1 text-red-700">
                      {application.rejection_reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {application.approvals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {application.approvals.map((approval, index) => (
                      <div key={approval.id} className="border rounded-md p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="font-medium">{approval.approver.name}</span>
                          </div>
                          <Badge variant="outline" className={
                            approval.status === 'approved'
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }>
                            {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          {format(new Date(approval.approved_at), 'PPP p')}
                        </div>
                        {approval.comments && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Comments:</span> {approval.comments}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="font-medium">{application.employee.first_name} {application.employee.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Employee ID</p>
                    <p>{application.employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Department</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {application.employee.department.name}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Designation</p>
                    <p>{application.employee.designation.name}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                {application.approved_by && application.approver && (
                  <div>
                    <h3 className="font-medium mb-2">Approval Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Approved/Rejected By</p>
                        <p>{application.approver.name}</p>
                      </div>
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
}
