<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Epargne extends Model
{
    protected $fillable = [
        'uuid', 'vente_id', 'debiteur_id', 'montant',
        'date_collecte', 'statut', 'recuperee_par',
        'date_recuperation', 'confirmation_client',
    ];

    protected $casts = [
        'date_collecte' => 'date',
        'date_recuperation' => 'date',
        'confirmation_client' => 'boolean',
    ];

    public function vente() { return $this->belongsTo(Vente::class); }
    public function debiteur() { return $this->belongsTo(Debiteur::class); }
    public function recupereePar() { return $this->belongsTo(User::class, 'recuperee_par'); }
}
