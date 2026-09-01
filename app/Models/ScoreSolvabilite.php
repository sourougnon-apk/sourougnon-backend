<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class ScoreSolvabilite extends Model
{
    protected $table = 'scores_solvabilite';
    protected $fillable = [
        'debiteur_id', 'score', 'nb_credits_total', 'nb_credits_termines',
        'nb_retards', 'montant_total_rembourse', 'montant_total_du', 'date_calcul',
    ];
    
    protected $casts = ['date_calcul' => 'datetime'];
    
    public function debiteur() { return $this->belongsTo(Debiteur::class); }
}
