<?php

namespace App\Mail;

use App\Models\Movement;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class MovementApprovedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $movement;
    public $fromDate;
    public $toDate;
    public $approver;

    /**
     * Create a new message instance.
     *
     * @param Movement $movement
     * @return void
     */
    public function __construct(Movement $movement)
    {
        $this->movement = $movement;
        $this->fromDate = Carbon::parse($movement->from_datetime)->format('M d, Y h:i A');
        $this->toDate = Carbon::parse($movement->to_datetime)->format('M d, Y h:i A');

        // Get approver information
        $this->approver = null;
        if ($movement->approved_by) {
            $this->approver = \App\Models\User::find($movement->approved_by);
        }
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $subject = 'Movement Request Approved';
        $employeeName = $this->movement->employee->first_name . ' ' . $this->movement->employee->last_name;

        return $this->subject($subject)
            ->markdown('emails.movements.approved')
            ->with([
                'movement' => $this->movement,
                'fromDate' => $this->fromDate,
                'toDate' => $this->toDate,
                'employeeName' => $employeeName,
                'approver' => $this->approver,
                'viewUrl' => route('movements.show', $this->movement->id),
            ]);
    }
}
