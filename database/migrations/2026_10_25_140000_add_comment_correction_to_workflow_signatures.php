<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MySQL identifier names are limited to 64 characters, so each foreign key
     * uses a short explicit name.
     *
     * @var array<string, string>
     */
    private array $tables = [
        'promotion_evaluation_signatures' => 'promo_sig_comment_by_fk',
        'confirmation_evaluation_signatures' => 'conf_sig_comment_by_fk',
        'probation_increment_evaluation_signatures' => 'pie_sig_comment_by_fk',
        'trainee_evaluation_signatures' => 'trainee_sig_comment_by_fk',
        'final_clearance_signatures' => 'fc_sig_comment_by_fk',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table => $foreignName) {
            if (Schema::hasColumn($table, 'comment_updated_by')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($foreignName) {
                $blueprint->unsignedBigInteger('comment_updated_by')->nullable()->after('comments');
                $blueprint->timestamp('comment_updated_at')->nullable()->after('comment_updated_by');
                $blueprint->foreign('comment_updated_by', $foreignName)->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table => $foreignName) {
            if (! Schema::hasColumn($table, 'comment_updated_by')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($foreignName) {
                $blueprint->dropForeign($foreignName);
                $blueprint->dropColumn(['comment_updated_by', 'comment_updated_at']);
            });
        }
    }
};
