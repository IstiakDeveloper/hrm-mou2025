<?php

namespace App\Mail;

use App\Models\LeaveApplication;
use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LeaveApplicationNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $leaveApplication;
    public $employee;
    public $leaveType;
    public $recipient;

    /**
     * Create a new message instance.
     */
    public function __construct(LeaveApplication $leaveApplication, Employee $employee, LeaveType $leaveType, User $recipient)
    {
        $this->leaveApplication = $leaveApplication;
        $this->employee = $employee;
        $this->leaveType = $leaveType;
        $this->recipient = $recipient;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('New Leave Application Requires Your Approval')
            ->markdown('emails.leave.new-application', [
                'leaveApplication' => $this->leaveApplication,
                'employee' => $this->employee,
                'leaveType' => $this->leaveType,
                'recipient' => $this->recipient,
                'approveUrl' => route('leave.applications.show', $this->leaveApplication->id)
            ]);
    }
}