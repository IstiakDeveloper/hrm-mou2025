<?php

namespace App\Services\Appraisal;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class AppraisalListQuery
{
    /**
     * One aggregate instead of four separate COUNT queries.
     *
     * @param  array<string, string>  $cases  alias => trusted SQL boolean expression
     * @return array<string, int>
     */
    public static function summarize(Builder $query, array $cases): array
    {
        $select = 'COUNT(*) as total';
        foreach ($cases as $alias => $expression) {
            $select .= ", SUM(CASE WHEN {$expression} THEN 1 ELSE 0 END) as {$alias}";
        }

        $base = (clone $query)->toBase();
        $base->columns = null;
        $base->orders = null;
        $row = $base->selectRaw($select)->first();

        $metrics = ['total' => (int) ($row->total ?? 0)];
        foreach ($cases as $alias => $expression) {
            $metrics[$alias] = (int) ($row->{$alias} ?? 0);
        }

        return $metrics;
    }

    /**
     * List rows only need the current user's signature and the latest send-back note.
     *
     * @return array<string, callable>
     */
    public static function listSignatures(User $user, string $foreignKey): array
    {
        return [
            'signatures' => function ($query) use ($user, $foreignKey) {
                $query->select(['id', $foreignKey, 'user_id', 'action', 'comments', 'signed_at'])
                    ->where(function ($inner) use ($user) {
                        $inner->where('user_id', $user->id)
                            ->orWhere('action', 'sent_back');
                    });
            },
        ];
    }

    /**
     * Show/print only need the signer's name, designation, and signature file.
     *
     * @return list<string>
     */
    public static function signerWith(): array
    {
        return [
            'signatures.user:id,name,employee_id,signature',
            'signatures.user.employee:id,name_en,name_bn,designation_id,signature',
            'signatures.user.employee.designation:id,name',
        ];
    }

    public static function hideNarratives(object $model): void
    {
        if (method_exists($model, 'makeHidden')) {
            $model->makeHidden([
                'strengths',
                'weaknesses',
                'training_need',
                'other_remarks',
                'initiator_remarks',
            ]);
        }
    }
}
