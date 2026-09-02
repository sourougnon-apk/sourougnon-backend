<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientComptant extends Model
{
    protected $table = 'clients_comptant';

    protected $fillable = [
        'uuid', 'nom', 'telephone', 'quartier', 'agent_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function ventes()
    {
        return $this->hasMany(Vente::class, 'client_comptant_id');
    }
}
