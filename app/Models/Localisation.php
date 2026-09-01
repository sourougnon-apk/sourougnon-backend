<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Localisation extends Model
{
    protected $fillable = ['type', 'nom', 'parent_nom', 'parent_type'];
}
