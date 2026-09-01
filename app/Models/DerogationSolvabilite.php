<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DerogationSolvabilite extends Model
{
    protected $fillable = [
        'debiteur_id',
        'vente_id',
        'user_id',
        'motif',
        'score_au_moment'
    ];

    public function debiteur()
    {
        return $this->belongsTo(Debiteur::class);
    }

    public function vente()
    {
        return $this->belongsTo(Vente::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
