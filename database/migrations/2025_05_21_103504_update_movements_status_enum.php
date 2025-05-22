<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class UpdateMovementsStatusEnum extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Add a temporary column
        Schema::table('movements', function (Blueprint $table) {
            $table->string('status_new')->default('active')->after('status');
        });

        // Copy data from old column to new column with appropriate mapping
        DB::statement("UPDATE movements SET status_new = 'active' WHERE status IN ('pending', 'approved', 'rejected')");
        DB::statement("UPDATE movements SET status_new = 'completed' WHERE status = 'completed'");

        // Drop the old column
        Schema::table('movements', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        // Rename the new column to the original name
        Schema::table('movements', function (Blueprint $table) {
            $table->renameColumn('status_new', 'status');
        });

        // Change the column type to enum
        DB::statement("ALTER TABLE movements MODIFY status ENUM('active', 'completed') NOT NULL DEFAULT 'active'");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Add a temporary column with the old structure
        Schema::table('movements', function (Blueprint $table) {
            $table->string('status_old')->default('pending')->after('status');
        });

        // Copy data with appropriate mapping
        DB::statement("UPDATE movements SET status_old = 'pending' WHERE status = 'active'");
        DB::statement("UPDATE movements SET status_old = 'completed' WHERE status = 'completed'");

        // Drop the new column
        Schema::table('movements', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        // Rename the old column back to status
        Schema::table('movements', function (Blueprint $table) {
            $table->renameColumn('status_old', 'status');
        });

        // Change the column type back to the original enum
        DB::statement("ALTER TABLE movements MODIFY status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending'");
    }
}
