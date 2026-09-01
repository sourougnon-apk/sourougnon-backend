<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Alerte extends Model
{
    protected $fillable = [
        'uuid', 'vente_id', 'debiteur_id', 'produit_id',
        'type', 'titre', 'message', 'niveau', 'lue', 'date_alerte',
    ];
    protected $casts = ['lue' => 'boolean', 'date_alerte' => 'datetime'];

    public function vente() { return $this->belongsTo(Vente::class); }
    public function debiteur() { return $this->belongsTo(Debiteur::class); }
    public function produit() { return $this->belongsTo(Produit::class); }
}
