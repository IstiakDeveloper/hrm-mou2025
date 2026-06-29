<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('loan_policies')
            ->where('loan_type', 'pf_loan')
            ->update([
                'calculation_method' => 'flat',
                'collection_method' => 'flat',
            ]);
    }

    public function down(): void
    {
        DB::table('loan_policies')
            ->where('loan_type', 'pf_loan')
            ->update([
                'calculation_method' => 'reducing',
                'collection_method' => 'reducing',
            ]);
    }
};
