<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Observers\StockAgenceObserver;

class StockAgence extends Model
{
    protected static function booted()
    {
        static::observe(StockAgenceObserver::class);
    }

    protected $table = 'stocks_agences';

    protected $fillable = ['agence_id', 'produit_id', 'quantite', 'seuil_alerte'];

    public function agence()
    {
        return $this->belongsTo(Agence::class);
    }

    public function produit()
    {
        return $this->belongsTo(Produit::class);
    }
}
