<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = ['gerante_id', 'ancien_agent_id', 'nouvel_agent_id', 'nb_debiteurs_transferes', 'details'];
    protected $casts = ['details' => 'array'];

    public function gerante() { return $this->belongsTo(User::class, 'gerante_id'); }
    public function ancienAgent() { return $this->belongsTo(User::class, 'ancien_agent_id'); }
    public function nouvelAgent() { return $this->belongsTo(User::class, 'nouvel_agent_id'); }
}
