<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('leave_approval_rules');

        Schema::create('leave_approval_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('context', 20)->index(); // head_office | branch
            $table->unsignedSmallInteger('max_leave_days');
            $table->string('approver_type', 40);
            $table->foreignId('designation_id')->nullable()->constrained('designations')->nullOnDelete();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->unique(['context', 'max_leave_days']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_approval_tiers');
    }
};
