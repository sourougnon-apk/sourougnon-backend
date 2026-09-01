<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = ['uuid','user_id','type','titre','message','lien','lue','envoyee_whatsapp','date_envoi'];
    protected $casts = ['lue' => 'boolean', 'envoyee_whatsapp' => 'boolean', 'date_envoi' => 'datetime'];
    public function user() { return $this->belongsTo(User::class); }
}
