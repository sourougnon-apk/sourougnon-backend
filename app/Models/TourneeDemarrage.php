<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TourneeDemarrage extends Model
{
    protected $fillable = [
        'uuid', 'agent_id', 'date_tournee', 'heure_demarrage',
        'heure_fin', 'statut', 'gps_depart', 'gps_arrivee',
        'synced', 'sync_uuid',
    ];

    protected $casts = [
        'heure_demarrage' => 'datetime',
        'heure_fin' => 'datetime',
        'date_tournee' => 'date',
        'synced' => 'boolean',
    ];

    public function agent() { return $this->belongsTo(User::class, 'agent_id'); }
}
