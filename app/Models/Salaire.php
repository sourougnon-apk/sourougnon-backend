<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Salaire extends Model
{
    protected $fillable = [
        'uuid', 'employe_id', 'user_id', 'periode', 'numero',
        'nb_jours_travailles', 'nb_jours_ouvrables',
        'salaire_brut', 'salaire_net', 'lignes_retenues',
        'statut', 'date_paiement', 'created_by',
    ];

    protected $casts = [
        'lignes_retenues' => 'array',
        'date_paiement' => 'datetime',
        'salaire_brut' => 'decimal:2',
        'salaire_net' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($s) {
            if (!$s->uuid) $s->uuid = (string) Str::uuid();
            if (!$s->numero) {
                $last = self::where('periode', $s->periode)->orderByDesc('id')->first();
                $num = $last ? intval(substr($last->numero, -4)) + 1 : 1;
                $s->numero = sprintf('FP-%s-%04d', $s->periode, $num);
            }
        });
    }

    public function employe()
    {
        return $this->belongsTo(Employe::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function createur()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
