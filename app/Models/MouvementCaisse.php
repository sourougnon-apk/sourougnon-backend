<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class MouvementCaisse extends Model
{
    protected $table = 'mouvements_caisse';
    protected $fillable = [
        'uuid','caisse_id','user_id','recouvrement_id','remise_id','sync_uuid',
        'type','montant','mode_paiement','reference','motif','date_mouvement',
        'beneficiaire','heure_mouvement','statut_validation','valide_par','valide_le',
        'montant_declare','montant_recu','ecart_remise','motif_rejet'
    ];
    protected $casts = ['date_mouvement'=>'datetime','valide_le'=>'datetime'];

    public function caisse() { return $this->belongsTo(Caisse::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function recouvrement() { return $this->belongsTo(Recouvrement::class); }
    public function remise() { return $this->belongsTo(\App\Models\Remise::class); }
}
