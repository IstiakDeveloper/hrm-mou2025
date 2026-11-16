<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('movements', function (Blueprint $table) {
            // কর্মচারী ফিরে এসেছে কিনা তা ট্র্যাক করার জন্য
            $table->boolean('is_returned')->default(false);

            // বাস্তবিক ফেরত সময় ট্র্যাক করার জন্য
            $table->dateTime('actual_return_datetime')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movements', function (Blueprint $table) {
            $table->dropColumn(['is_returned', 'actual_return_datetime']);
        });
    }
};
