<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('activity_log')) {
            Schema::create('activity_log', function (Blueprint $table) {
                $table->id();
                $table->string('log_name')->nullable()->index();
                $table->text('description');
                $table->nullableMorphs('subject', 'subject');
                $table->string('event')->nullable();
                $table->nullableMorphs('causer', 'causer');
                $table->json('properties')->nullable();
                $table->uuid('batch_uuid')->nullable()->index();
                $table->timestamps();
                $table->index('created_at');
            });
        } else {
            Schema::table('activity_log', function (Blueprint $table) {
                if (! Schema::hasColumn('activity_log', 'batch_uuid')) {
                    $table->uuid('batch_uuid')->nullable()->index()->after('properties');
                }
                if (! Schema::hasColumn('activity_log', 'event')) {
                    $table->string('event')->nullable()->after('subject_id');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }
};
