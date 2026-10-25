<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $table = 'probation_increment_evaluation_signatures';

        Schema::table($table, function (Blueprint $blueprint) use ($table) {
            if (! Schema::hasColumn($table, 'comment_updated_at')) {
                $blueprint->timestamp('comment_updated_at')->nullable()->after('comment_updated_by');
            }
        });

        $foreign = collect(Schema::getForeignKeys($table))->contains(
            fn (array $key) => ($key['name'] ?? '') === 'pie_sig_comment_by_fk'
        );

        if (! $foreign) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreign('comment_updated_by', 'pie_sig_comment_by_fk')
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('probation_increment_evaluation_signatures', function (Blueprint $blueprint) {
            $blueprint->dropForeign('pie_sig_comment_by_fk');
            $blueprint->dropColumn('comment_updated_at');
        });
    }
};
