<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Approvisionnement extends Model
{
    protected $fillable = [
        'uuid', 'produit_id', 'quantite', 'prix_achat_unitaire',
        'prix_vente_unitaire', 'fournisseur', 'reference', 'user_id',
    ];
    
    public function produit() { return $this->belongsTo(Produit::class); }
    public function user() { return $this->belongsTo(User::class); }
}
