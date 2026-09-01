<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class MouvementStock extends Model
{
    protected $table = 'mouvements_stock';
    
    protected $fillable = [
        'uuid', 'produit_id', 'user_id', 'type', 'action', 'date_mouvement',
        'quantite', 'prix_unitaire', 'stock_avant', 'stock_apres',
        'fournisseur', 'reference', 'motif', 'created_at',
    ];
    
    protected $casts = ['created_at' => 'datetime'];
    
    public function produit() { return $this->belongsTo(Produit::class); }
    public function user() { return $this->belongsTo(User::class); }
}
