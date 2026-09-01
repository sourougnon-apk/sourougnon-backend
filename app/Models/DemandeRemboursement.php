<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DemandeRemboursement extends Model
{
    protected $table = 'demandes_remboursement';

    protected $fillable = [
        'uuid', 'vente_id', 'demandeur_id', 'validateur_id',
        'montant_credit_paye', 'montant_rembourse', 'montant_epargne_rembourse',
        'statut', 'commentaire_gerante', 'date_validation',
    ];

    protected $casts = [
        'date_validation' => 'datetime',
    ];

    public function vente()
    {
        return $this->belongsTo(Vente::class);
    }

    public function demandeur()
    {
        return $this->belongsTo(User::class, 'demandeur_id');
    }

    public function validateur()
    {
        return $this->belongsTo(User::class, 'validateur_id');
    }
}
