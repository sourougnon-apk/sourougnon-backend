<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    protected $fillable = ['sync_uuid', 'agent_id', 'status', 'payload'];
    protected $casts = ['payload' => 'array'];
    public function agent() { return $this->belongsTo(User::class, 'agent_id'); }
}
