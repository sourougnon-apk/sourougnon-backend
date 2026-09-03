<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OperationBancaire extends Model
{
    protected $fillable = [
        'uuid', 'compte_debit_id', 'compte_credit_id', 'type',
        'montant', 'date_operation', 'user_id', 'source',
        'mouvement_caisse_id', 'transfert_group', 'reference', 'motif',
    ];

    protected $casts = [
        'date_operation' => 'datetime',
        'montant' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($op) {
            if (!$op->uuid) $op->uuid = (string) Str::uuid();
            if (!$op->reference) $op->reference = 'OP-' . strtoupper(Str::random(8));
        });
    }

    public function compteDebit()
    {
        return $this->belongsTo(CompteBancaire::class, 'compte_debit_id');
    }

    public function compteCredit()
    {
        return $this->belongsTo(CompteBancaire::class, 'compte_credit_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function mouvementCaisse()
    {
        return $this->belongsTo(MouvementCaisse::class);
    }
}
