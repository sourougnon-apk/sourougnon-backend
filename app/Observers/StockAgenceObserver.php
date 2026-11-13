<?php

namespace App\Observers;

use App\Models\StockAgence;
use App\Models\Produit;

class StockAgenceObserver
{
    /**
     * Synchronise le stock global du produit (somme de toutes les agences).
     */
    private function synchroniserStockGlobal(StockAgence $stockAgence)
    {
        if ($stockAgence->produit_id) {
            $total = StockAgence::where('produit_id', $stockAgence->produit_id)->sum('quantite');
            Produit::where('id', $stockAgence->produit_id)->update(['stock' => $total]);
        }
    }

    public function created(StockAgence $stockAgence)
    {
        $this->synchroniserStockGlobal($stockAgence);
    }

    public function updated(StockAgence $stockAgence)
    {
        $this->synchroniserStockGlobal($stockAgence);
    }

    public function deleted(StockAgence $stockAgence)
    {
        $this->synchroniserStockGlobal($stockAgence);
    }
}
