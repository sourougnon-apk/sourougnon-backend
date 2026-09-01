<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Journal extends Model
{
    protected $table = 'journals';
    protected $fillable = ['uuid','numero_ecriture','date_ecriture','compte_debit','compte_credit','montant','libelle','reference','recouvrement_id','vente_id','mouvement_caisse_id','user_id','type_compta'];
    protected $casts = ['date_ecriture' => 'date'];

    public function user() { return $this->belongsTo(User::class); }
}
