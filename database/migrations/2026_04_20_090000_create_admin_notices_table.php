<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('type', 20)->default('info');
            $table->string('link', 2048)->nullable();
            $table->string('audience', 20);
            $table->json('department_ids')->nullable();
            $table->json('user_ids')->nullable();
            $table->unsignedInteger('recipient_count')->default(0);
            $table->boolean('push_sent')->default(false);
            $table->timestamps();

            $table->index(['created_at']);
            $table->index(['type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notices');
    }
};
