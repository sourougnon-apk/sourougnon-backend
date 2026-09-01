<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'uuid', 'nom', 'prenom', 'email', 'telephone',
        'role', 'password', 'token', 'token_expires_at', 'actif',
    ];

    protected $hidden = ['password', 'token'];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'actif' => 'boolean',
    ];

    public function debiteurs() { return $this->hasMany(Debiteur::class, 'agent_id'); }
    public function ventes() { return $this->hasMany(Vente::class, 'agent_id'); }
    public function recouvrements() { return $this->hasMany(Recouvrement::class, 'agent_id'); }
    public function isGerante(): bool { return $this->role === 'gerante'; }
    public function isChefAgence(): bool { return $this->role === 'chef_agence'; }
    public function isAgent(): bool { return $this->role === 'agent'; }
}
