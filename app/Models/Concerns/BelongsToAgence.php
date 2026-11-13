<?php

namespace App\Models\Concerns;

use App\Models\User;

trait BelongsToAgence
{
    public static function bootBelongsToAgence(): void
    {
        static::creating(function ($model) {
            if (!empty($model->agence_id)) {
                return;
            }
            $model->agence_id = static::resoudreAgenceId($model);
        });
    }

    protected static function resoudreAgenceId($model): ?int
    {
        foreach (['agent_id', 'user_id'] as $colonne) {
            $userId = $model->getAttribute($colonne);
            if ($userId) {
                $agenceId = User::whereKey($userId)->value('agence_id');
                if ($agenceId) {
                    return (int) $agenceId;
                }
            }
        }

        $auth = request()->user() ?: auth()->user();
        return ($auth && $auth->agence_id) ? (int) $auth->agence_id : null;
    }
}
