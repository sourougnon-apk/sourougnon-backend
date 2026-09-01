<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SyntheseJournaliere extends Model
{
    protected $table = 'synthese_journaliere';
    protected $fillable = ['date', 'agent_id', 'nb_debiteurs', 'montant_attendu', 'montant_encaisse', 'montant_impaye', 'taux_recouvrement'];
    protected $casts = ['date' => 'date'];
    public function agent() { return $this->belongsTo(User::class, 'agent_id'); }
}
