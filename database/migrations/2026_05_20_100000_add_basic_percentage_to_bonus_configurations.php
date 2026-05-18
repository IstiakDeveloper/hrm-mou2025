<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bonus_configurations', function (Blueprint $table) {
            $table->decimal('basic_percentage', 8, 2)->default(0)->after('month');
        });

        if (Schema::hasTable('bonus_configuration_lines')) {
            $configs = DB::table('bonus_configurations')->pluck('id');

            foreach ($configs as $configId) {
                $line = DB::table('bonus_configuration_lines')
                    ->where('bonus_configuration_id', $configId)
                    ->where('amount_type', 'percentage')
                    ->orderBy('sort_order')
                    ->first();

                if ($line) {
                    DB::table('bonus_configurations')
                        ->where('id', $configId)
                        ->update([
                            'basic_percentage' => $line->amount,
                            'calculation_base' => 'basic',
                        ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('bonus_configurations', function (Blueprint $table) {
            $table->dropColumn('basic_percentage');
        });
    }
};
