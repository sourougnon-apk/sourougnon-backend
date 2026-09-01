<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Agence extends Model
{
    protected $fillable = ['uuid', 'nom', 'adresse', 'telephone', 'actif'];
    protected $casts = ['actif' => 'boolean'];
}
