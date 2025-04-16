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
        Schema::table('attendances', function (Blueprint $table) {
            // স্ট্যাটাস এনামে "on_duty" অপশন যোগ করুন
            $table->enum('status', ['present', 'absent', 'late', 'half_day', 'leave', 'on_duty'])
                ->default('absent')
                ->change();

            // মুভমেন্টের সাথে লিংক করার জন্য কলাম যোগ করুন
            $table->foreignId('movement_id')->nullable()->constrained()->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropForeign(['movement_id']);
            $table->dropColumn('movement_id');

            $table->enum('status', ['present', 'absent', 'late', 'half_day', 'leave'])
                ->default('absent')
                ->change();
        });
    }
};
