<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Caisse extends Model
{
    protected $fillable = ['uuid','user_id','date_ouverture','date_fermeture','solde_initial','solde_theorique','solde_reel','ecart','statut','notes','periode','total_encaissements','total_decaissements','total_salaires','total_epargnes','total_penalites'];
    protected $casts = ['date_ouverture'=>'date','date_fermeture'=>'date'];

    public function user() { return $this->belongsTo(User::class); }
    public function mouvements() { return $this->hasMany(MouvementCaisse::class)->orderByDesc('date_mouvement'); }
}
