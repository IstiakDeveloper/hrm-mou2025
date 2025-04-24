<?php

namespace App\Mail;

use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LeaveApprovedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $application;
    public $employee;
    public $leaveType;
    public $startDate;
    public $endDate;
    public $approver;

    /**
     * Create a new message instance.
     *
     * @param LeaveApplication $application
     * @param Employee $employee
     * @param LeaveType $leaveType
     * @return void
     */
    public function __construct(LeaveApplication $application, Employee $employee, LeaveType $leaveType)
    {
        $this->application = $application;
        $this->employee = $employee;
        $this->leaveType = $leaveType;
        $this->startDate = Carbon::parse($application->start_date)->format('M d, Y');
        $this->endDate = Carbon::parse($application->end_date)->format('M d, Y');

        // Get approver information
        $this->approver = null;
        if ($application->approved_by) {
            $this->approver = \App\Models\User::find($application->approved_by);
        }
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $subject = 'Leave Application Approved';
        $employeeName = $this->employee->first_name . ' ' . $this->employee->last_name;

        return $this->subject($subject)
            ->markdown('emails.leave.approved')
            ->with([
                'application' => $this->application,
                'employee' => $this->employee,
                'leaveType' => $this->leaveType,
                'startDate' => $this->startDate,
                'endDate' => $this->endDate,
                'days' => $this->application->days,
                'employeeName' => $employeeName,
                'approver' => $this->approver,
                'viewUrl' => route('leave.applications.show', $this->application->id),
            ]);
    }
}
