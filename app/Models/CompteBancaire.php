<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CompteBancaire extends Model
{
    protected $fillable = ['uuid', 'nom', 'type', 'solde_initial', 'actif'];

    protected $casts = ['actif' => 'boolean'];

    protected static function booted()
    {
        static::creating(function ($compte) {
            if (!$compte->uuid) $compte->uuid = (string) Str::uuid();
        });
    }

    public function operationsDebit()
    {
        return $this->hasMany(OperationBancaire::class, 'compte_debit_id');
    }

    public function operationsCredit()
    {
        return $this->hasMany(OperationBancaire::class, 'compte_credit_id');
    }

    public function soldeCourant(): float
    {
        $debits = $this->operationsDebit()->sum('montant');
        $credits = $this->operationsCredit()->sum('montant');
        return round($this->solde_initial + $debits - $credits, 2);
    }
}
