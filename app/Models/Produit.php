<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Produit extends Model
{
    protected $fillable = [
        'uuid', 'categorie_id', 'code', 'nom', 'description',
        'conditionnement', 'unite', 'prix_achat', 'prix_vente',
        'stock', 'stock_initial', 'seuil_alerte', 'actif',
    ];
    
    protected $casts = ['actif' => 'boolean'];
    
    public function categorie() { return $this->belongsTo(Categorie::class); }
    public function approvisionnements() { return $this->hasMany(Approvisionnement::class); }
    public function ventes() { return $this->hasMany(Vente::class); }
    
    // Stock logique = stock_initial + total approvisionnements - total ventes
    public function stockLogique(): float
    {
        $totalAppros = $this->approvisionnements()->sum('quantite');
        $totalVentes = $this->ventes()->sum('quantite') ?? 0;
        return $this->stock_initial + $totalAppros - $totalVentes;
    }
}
