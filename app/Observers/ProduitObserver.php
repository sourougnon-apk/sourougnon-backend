<?php

namespace App\Observers;

use App\Models\Produit;
use App\Models\Agence;
use App\Models\StockAgence;

class ProduitObserver
{
    public function created(Produit $produit)
    {
        // Lorsqu'un nouveau produit est créé, on initialise son stock à 0 pour toutes les agences
        $agences = Agence::all();
        foreach ($agences as $agence) {
            StockAgence::create([
                'agence_id' => $agence->id,
                'produit_id' => $produit->id,
                'quantite' => 0,
                'seuil_alerte' => $produit->seuil_alerte ?? 5,
            ]);
        }
    }
}
