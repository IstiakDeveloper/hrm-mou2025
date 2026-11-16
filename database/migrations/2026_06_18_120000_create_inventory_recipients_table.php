<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['branch_id', 'name']);
        });

        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->foreignId('recipient_id')->nullable()->after('employee_id')
                ->constrained('inventory_recipients')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recipient_id');
        });

        Schema::dropIfExists('inventory_recipients');
    }
};
