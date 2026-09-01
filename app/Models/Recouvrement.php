<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Recouvrement extends Model
{
    protected $fillable = [
        'uuid', 'vente_id', 'agent_id', 'montant',
        'date_recouvrement', 'mode_paiement', 'statut',
        'commentaire', 'synced', 'sync_uuid', 'heure_recouvrement',
    ];
    protected $casts = ['synced' => 'boolean', 'date_recouvrement' => 'date', 'montant' => 'decimal:2'];
    public function vente() { return $this->belongsTo(Vente::class); }
    public function agent() { return $this->belongsTo(User::class, 'agent_id'); }

    public function mouvementCaisse() { return $this->hasOne(\App\Models\MouvementCaisse::class, 'recouvrement_id'); }
}