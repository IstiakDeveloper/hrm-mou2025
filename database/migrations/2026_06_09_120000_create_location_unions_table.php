<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('location_unions', function (Blueprint $table) {
            $table->id();
            $table->string('division', 100);
            $table->string('district', 100);
            $table->string('upazila', 120);
            $table->string('name', 120);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['division', 'district', 'upazila', 'name'], 'location_unions_unique_path_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_unions');
    }
};
