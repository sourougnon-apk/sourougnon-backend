<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Vente;
use App\Models\Debiteur;
use App\Models\Produit;
use App\Models\User;
use Illuminate\Http\Request;

class RechercheController extends Controller
{
    public function globale(Request $request)
    {
        $q = $request->q;
        if (!$q || strlen($q) < 2) {
            return response()->json(['debiteurs' => [], 'agents' => [], 'ventes' => [], 'produits' => []]);
        }

        $debiteurs = Debiteur::where('actif', true)
            ->where(function($sql) use ($q) {
                $sql->where('nom', 'LIKE', "%$q%")
                    ->orWhere('prenom', 'LIKE', "%$q%")
                    ->orWhere('telephone', 'LIKE', "%$q%")
                    ->orWhere('quartier', 'LIKE', "%$q%");
            })
            ->limit(10)->get()
            ->map(function($d) {
                return ['uuid' => $d->uuid, 'nom' => $d->nom, 'prenom' => $d->prenom, 'telephone' => $d->telephone, 'quartier' => $d->quartier];
            });

        $agents = User::whereIn('role', ['agent', 'chef_agence', 'gerante'])
            ->where('actif', true)
            ->where(function($sql) use ($q) {
                $sql->where('nom', 'LIKE', "%$q%")->orWhere('prenom', 'LIKE', "%$q%")->orWhere('email', 'LIKE', "%$q%");
            })
            ->limit(5)->get()
            ->map(function($a) {
                return ['uuid' => $a->uuid, 'nom' => $a->nom, 'prenom' => $a->prenom, 'email' => $a->email, 'role' => $a->role];
            });

        $produits = Produit::where('actif', true)
            ->where(function($sql) use ($q) {
                $sql->where('nom', 'LIKE', "%$q%")->orWhere('code', 'LIKE', "%$q%")->orWhere('categorie', 'LIKE', "%$q%");
            })
            ->limit(5)->get()
            ->map(function($p) {
                return ['uuid' => $p->uuid, 'nom' => $p->nom, 'stock' => $p->stock, 'prix_vente' => $p->prix_vente, 'categorie' => $p->categorie];
            });

        $ventes = Vente::where('uuid', 'LIKE', "%$q%")
            ->orWhereHas('debiteur', function($sql) use ($q) {
                $sql->where('nom', 'LIKE', "%$q%")->orWhere('prenom', 'LIKE', "%$q%");
            })
            ->with('debiteur')
            ->limit(5)->get()
            ->map(function($v) {
                return [
                    'uuid' => $v->uuid,
                    'debiteur_nom' => $v->debiteur?->nom . ' ' . $v->debiteur?->prenom,
                    'type_vente' => $v->type_vente,
                    'montant_total' => $v->montant_total,
                    'statut' => $v->statut,
                ];
            });

        return response()->json([
            'debiteurs' => $debiteurs,
            'agents' => $agents,
            'ventes' => $ventes,
            'produits' => $produits,
            'query' => $q,
        ]);
    }
}
