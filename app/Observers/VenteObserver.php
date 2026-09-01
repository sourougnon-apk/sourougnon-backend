<?php

namespace App\Observers;

use App\Models\Vente;

class VenteObserver
{
    public function deleted(Vente $vente): void
    {
        if ($vente->debiteur) {
            app(\App\Services\ScoreSolvabiliteService::class)->calculer($vente->debiteur);
        }
    }
}
