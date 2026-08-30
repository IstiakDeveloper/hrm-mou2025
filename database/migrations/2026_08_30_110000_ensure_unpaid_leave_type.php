<?php

use App\Models\LeaveType;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        LeaveType::firstOrCreate(
            ['name' => 'Unpaid Leave'],
            [
                'days_allowed' => 0,
                'is_paid' => false,
                'description' => 'Leave Without Pay (বিনা বেতনে ছুটি) - Unlimited days upon approval',
                'carry_forward' => false,
            ]
        );
    }

    public function down(): void
    {
        // Don't drop existing leave types to preserve historical leave applications
    }
};
