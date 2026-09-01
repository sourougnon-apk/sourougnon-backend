<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Remise extends Model
{
    protected $fillable = [
        'uuid', 'agent_id', 'montant_declare', 'statut', 'reference', 'sync_uuid'
    ];

    protected $casts = [
        'montant_declare' => 'decimal:2',
    ];

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function mouvements()
    {
        return $this->hasMany(MouvementCaisse::class);
    }
}
