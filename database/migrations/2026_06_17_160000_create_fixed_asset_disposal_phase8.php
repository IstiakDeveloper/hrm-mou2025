<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_disposal_reasons', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sl')->default(0);
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::table('asset_disposals', function (Blueprint $table) {
            $table->foreignId('asset_disposal_reason_id')
                ->nullable()
                ->after('fixed_asset_id')
                ->constrained('asset_disposal_reasons')
                ->nullOnDelete();
            $table->date('request_date')->nullable()->after('status');
            $table->string('photo_path')->nullable()->after('notes');
            $table->string('batch_reference', 40)->nullable()->after('photo_path');
            $table->timestamp('disposed_at')->nullable()->after('reviewed_at');

            $table->index('batch_reference');
        });

        $now = now();
        $defaults = [
            ['sl' => 1, 'code' => 'OBSOLETE', 'name' => 'Obsolete / end of life', 'sort_order' => 10],
            ['sl' => 2, 'code' => 'DAMAGED', 'name' => 'Damaged beyond repair', 'sort_order' => 20],
            ['sl' => 3, 'code' => 'SOLD', 'name' => 'Sold', 'sort_order' => 30],
            ['sl' => 4, 'code' => 'LOST', 'name' => 'Lost / stolen', 'sort_order' => 40],
            ['sl' => 5, 'code' => 'DONATED', 'name' => 'Donated', 'sort_order' => 50],
            ['sl' => 6, 'code' => 'OTHER', 'name' => 'Other', 'sort_order' => 99],
        ];

        foreach ($defaults as $row) {
            DB::table('asset_disposal_reasons')->insert([
                ...$row,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('asset_disposals', function (Blueprint $table) {
            $table->dropIndex(['batch_reference']);
            $table->dropConstrainedForeignId('asset_disposal_reason_id');
            $table->dropColumn(['request_date', 'photo_path', 'batch_reference', 'disposed_at']);
        });

        Schema::dropIfExists('asset_disposal_reasons');
    }
};
