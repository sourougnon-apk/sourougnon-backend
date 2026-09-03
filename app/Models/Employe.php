<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Employe extends Model
{
    protected $fillable = [
        'uuid', 'user_id', 'poste', 'date_embauche',
        'salaire_base', 'mode_calcul',
    ];

    protected $casts = [
        'date_embauche' => 'date',
        'salaire_base' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function ($e) {
            if (!$e->uuid) $e->uuid = (string) Str::uuid();
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function salaires()
    {
        return $this->hasMany(Salaire::class);
    }

    public function absences()
    {
        return $this->hasMany(Absence::class);
    }

    public function fichePaieConfig()
    {
        return $this->hasOne(FichePaieConfig::class, 'user_id', 'user_id');
    }
}
