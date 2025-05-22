<?php

namespace App\Mail;

use App\Models\Movement;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class MovementCompletedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $movement;
    public $returnDateTime;

    /**
     * Create a new message instance.
     *
     * @param Movement $movement
     * @param Carbon $returnDateTime
     */
    public function __construct(Movement $movement, $returnDateTime)
    {
        $this->movement = $movement;
        $this->returnDateTime = $returnDateTime;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $employee = $this->movement->employee;
        $employeeName = $employee->first_name . ' ' . $employee->last_name;
        $fromDate = Carbon::parse($this->movement->from_datetime)->format('M d, Y h:i A');
        $toDate = Carbon::parse($this->movement->to_datetime)->format('M d, Y h:i A');
        $returnDate = $this->returnDateTime->format('M d, Y h:i A');

        return $this->subject('Movement Completed: ' . $employeeName)
            ->view('emails.movement-completed')
            ->with([
                'movement' => $this->movement,
                'employee' => $employee,
                'employeeName' => $employeeName,
                'fromDate' => $fromDate,
                'toDate' => $toDate,
                'returnDate' => $returnDate,
                'purpose' => $this->movement->purpose,
                'destination' => $this->movement->destination,
                'movementType' => $this->movement->movement_type,
            ]);
    }
}
