<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndex('promotion_evaluations', ['branch_id', 'created_at'], 'pe_branch_created_idx');
        $this->addIndex('promotion_evaluations', ['regional_office_id', 'created_at'], 'pe_ro_created_idx');
        $this->addIndex('promotion_evaluations', ['zone_id', 'created_at'], 'pe_zone_created_idx');
        $this->addIndex('promotion_evaluations', ['status', 'created_at'], 'pe_status_created_idx');

        $this->addIndex('confirmation_evaluations', ['branch_id', 'created_at'], 'ce_branch_created_idx');
        $this->addIndex('confirmation_evaluations', ['regional_office_id', 'created_at'], 'ce_ro_created_idx');
        $this->addIndex('confirmation_evaluations', ['zone_id', 'created_at'], 'ce_zone_created_idx');
        $this->addIndex('confirmation_evaluations', ['status', 'created_at'], 'ce_status_created_idx');

        $this->addIndex('probation_increment_evaluations', ['branch_id', 'created_at'], 'pie_branch_created_idx');
        $this->addIndex('probation_increment_evaluations', ['regional_office_id', 'created_at'], 'pie_ro_created_idx');
        $this->addIndex('probation_increment_evaluations', ['zone_id', 'created_at'], 'pie_zone_created_idx');
        $this->addIndex('probation_increment_evaluations', ['status', 'created_at'], 'pie_status_created_idx');

        $this->addIndex('trainee_evaluations', ['branch_id', 'created_at'], 'te_branch_created_idx');
        $this->addIndex('trainee_evaluations', ['regional_office_id', 'created_at'], 'te_ro_created_idx');
        $this->addIndex('trainee_evaluations', ['zone_id', 'created_at'], 'te_zone_created_idx');
        $this->addIndex('trainee_evaluations', ['status', 'created_at'], 'te_status_created_idx');
    }

    public function down(): void
    {
        $this->dropIndex('promotion_evaluations', 'pe_branch_created_idx');
        $this->dropIndex('promotion_evaluations', 'pe_ro_created_idx');
        $this->dropIndex('promotion_evaluations', 'pe_zone_created_idx');
        $this->dropIndex('promotion_evaluations', 'pe_status_created_idx');

        $this->dropIndex('confirmation_evaluations', 'ce_branch_created_idx');
        $this->dropIndex('confirmation_evaluations', 'ce_ro_created_idx');
        $this->dropIndex('confirmation_evaluations', 'ce_zone_created_idx');
        $this->dropIndex('confirmation_evaluations', 'ce_status_created_idx');

        $this->dropIndex('probation_increment_evaluations', 'pie_branch_created_idx');
        $this->dropIndex('probation_increment_evaluations', 'pie_ro_created_idx');
        $this->dropIndex('probation_increment_evaluations', 'pie_zone_created_idx');
        $this->dropIndex('probation_increment_evaluations', 'pie_status_created_idx');

        $this->dropIndex('trainee_evaluations', 'te_branch_created_idx');
        $this->dropIndex('trainee_evaluations', 'te_ro_created_idx');
        $this->dropIndex('trainee_evaluations', 'te_zone_created_idx');
        $this->dropIndex('trainee_evaluations', 'te_status_created_idx');
    }

    private function addIndex(string $table, array $columns, string $name): void
    {
        if (! Schema::hasTable($table) || Schema::hasIndex($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
            $blueprint->index($columns, $name);
        });
    }

    private function dropIndex(string $table, string $name): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasIndex($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($name) {
            $blueprint->dropIndex($name);
        });
    }
};
