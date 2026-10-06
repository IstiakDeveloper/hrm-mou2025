<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotion_evaluation_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_evaluation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->enum('stage', ['initiator', 'rm', 'zm', 'director_mf', 'director_fa', 'hr', 'ed']);
            $table->enum('action', ['submitted', 'forwarded', 'sent_back', 'approved', 'rejected'])->nullable();
            
            $table->text('comments')->nullable();
            $table->timestamp('signed_at')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_evaluation_signatures');
    }
};
