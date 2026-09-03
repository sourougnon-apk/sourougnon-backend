<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FichePaieConfig extends Model
{
    protected $fillable = ['user_id', 'retenues', 'mentions_libres'];

    protected $casts = [
        'retenues' => 'array',
        'mentions_libres' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
