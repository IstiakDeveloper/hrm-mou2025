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
        Schema::create('location_villages', function (Blueprint $table) {
            $table->id();
            $table->string('division', 100);
            $table->string('district', 100);
            $table->string('upazila', 120)->nullable();
            $table->string('union', 120)->nullable();
            $table->string('name', 150);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['division', 'district', 'upazila', 'union', 'name'], 'location_villages_unique_path_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('location_villages');
    }
};
