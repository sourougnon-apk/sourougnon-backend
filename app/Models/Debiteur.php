<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Debiteur extends Model
{
    protected $attributes = [
        'credits_autorises' => 1,
        'actif' => true,
    ];

    protected $fillable = [
        'uuid', 'code_client', 'agent_id', 'nom', 'prenom', 'telephone',
        'quartier', 'adresse', 'personne_reference_nom', 'personne_reference_tel',
        'activite', 'score_solvabilite', 'credits_autorises', 'actif',
        'ancien_agent_id', 'date_transfert',
        'taux_recouvrement_au_transfert', 'reste_a_payer_au_transfert',
    ];

    protected $casts = [
        'actif' => 'boolean',
        'date_transfert' => 'datetime',
        'score_solvabilite' => 'float',
        'credits_autorises' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $d) {
            $d->uuid = $d->uuid ?: (string) \Illuminate\Support\Str::uuid();
            if (blank($d->code_client)) {
                do {
                    $code = 'CLI-' . strtoupper(\Illuminate\Support\Str::random(8));
                } while (self::where('code_client', $code)->exists());
                $d->code_client = $code;
            }
        });
    }

    public function agent() { return $this->belongsTo(User::class, 'agent_id'); }
    public function ancienAgent() { return $this->belongsTo(User::class, 'ancien_agent_id'); }
    public function ventes() { return $this->hasMany(Vente::class); }
    public function score() { return $this->hasOne(ScoreSolvabilite::class); }
}
