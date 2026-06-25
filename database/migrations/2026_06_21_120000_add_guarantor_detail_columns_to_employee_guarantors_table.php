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
        Schema::table('employee_guarantors', function (Blueprint $table) {
            $table->string('father_name', 200)->nullable()->after('name');
            $table->string('nid', 30)->nullable()->after('phone');
            $table->string('organization', 200)->nullable()->after('occupation');
            $table->string('designation', 150)->nullable()->after('organization');
            $table->text('address')->nullable()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_guarantors', function (Blueprint $table) {
            $table->dropColumn(['father_name', 'nid', 'organization', 'designation', 'address']);
        });
    }
};
