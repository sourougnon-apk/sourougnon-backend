<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Penalite extends Model
{
    protected static function booted(): void
    {
        static::creating(function (self $penalite) {
            if (blank($penalite->uuid)) {
                $penalite->uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    protected $fillable = [
        'uuid', 'vente_id', 'echeance_id', 'recouvrement_id',
        'debiteur_id', 'montant', 'jours_retard', 'date_appliquee',
        'statut', 'date_paiement', 'mode_paiement', 'refus_defalque_epargne',
    ];

    protected $casts = ['date_appliquee' => 'date'];

    public function vente() { return $this->belongsTo(Vente::class); }
    public function echeance() { return $this->belongsTo(Echeance::class); }
    public function recouvrement() { return $this->belongsTo(Recouvrement::class); }
    public function debiteur() { return $this->belongsTo(Debiteur::class); }
}
