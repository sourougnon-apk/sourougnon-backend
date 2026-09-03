<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Absence extends Model
{
    protected $fillable = [
        'uuid', 'employe_id', 'date_debut', 'date_fin', 'type', 'motif',
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
    ];

    protected static function booted()
    {
        static::creating(function ($a) {
            if (!$a->uuid) $a->uuid = (string) Str::uuid();
        });
    }

    public function employe()
    {
        return $this->belongsTo(Employe::class);
    }
}
