<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Echeance extends Model
{
    protected $fillable = ['uuid','vente_id','date_echeance','montant_prevu','montant_paye','statut','jours_retard','date_paiement'];
    protected $casts = ['date_echeance' => 'date', 'date_paiement' => 'date'];

    public function vente() { return $this->belongsTo(Vente::class); }

    public function restant(): float
    {
        return max(0, $this->montant_prevu - $this->montant_paye);
    }

    public function mettreAJourStatut(): void
    {
        if ($this->montant_paye >= $this->montant_prevu) {
            $this->statut = 'paye';
            $this->jours_retard = 0;
        } elseif ($this->montant_paye > 0) {
            $this->statut = 'partiel';
        } elseif ($this->date_echeance->startOfDay()->lessThanOrEqualTo(now()->startOfDay())) {
            $this->statut = 'en_retard';
            $this->jours_retard = $this->date_echeance->startOfDay()->diffInDays(now()->startOfDay());
        } else {
            $this->statut = 'en_attente';
            $this->jours_retard = 0;
        }
        $this->save();
    }
}
