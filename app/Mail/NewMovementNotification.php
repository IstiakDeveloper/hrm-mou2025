<?php

namespace App\Mail;

use App\Models\Movement;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewMovementNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $movement;
    public $employee;
    public $recipient;

    /**
     * Create a new message instance.
     */
    public function __construct(Movement $movement, Employee $employee, User $recipient)
    {
        $this->movement = $movement;
        $this->employee = $employee;
        $this->recipient = $recipient;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('New Movement Request Requires Your Approval')
            ->view('emails.movements.new-request', [
                'movement' => $this->movement,
                'employee' => $this->employee,
                'recipient' => $this->recipient,
                'approveUrl' => route('movements.show', $this->movement->id)
            ]);
    }
}