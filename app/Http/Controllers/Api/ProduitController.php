<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Produit;
use App\Models\StockAgence;
use App\Models\Approvisionnement;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProduitController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $agenceId = $user->agence_id ?? 1;

        $produits = Produit::with('categorie')->where('actif', true)->orderBy('nom')->get();

        // Si ce n'est pas la gérante, on affiche le stock de son agence
        if ($user->role !== 'gerante') {
            $stocks = StockAgence::where('agence_id', $agenceId)->get()->keyBy('produit_id');
            $produits->each(function($p) use ($stocks) {
                $stock = $stocks->get($p->id);
                $p->stock = $stock ? $stock->quantite : 0;
                $p->seuil_alerte = $stock ? $stock->seuil_alerte : 5;
            });
        }

        return response()->json($produits);
    }

    public function store(Request $request)
    {
        $request->validate(['nom' => 'required|string']);
        
        $produit = Produit::create([
            'uuid' => Str::uuid(),
            'nom' => $request->nom,
            'code' => $request->code ?: strtoupper(substr(Str::slug($request->nom), 0, 10)),
            'description' => $request->description,
            'conditionnement' => $request->conditionnement,
            'unite' => $request->unite,
            'prix_achat' => $request->prix_achat ?? 0,
            'prix_vente' => $request->prix_vente ?? 0,
            'stock' => 0,
            'stock_initial' => $request->stock_initial ?? 0,
            'seuil_alerte' => $request->seuil_alerte ?? 5,
            'actif' => true,
        ]);
        
        return response()->json(['success' => true, 'uuid' => $produit->uuid]);
    }

    public function show($uuid)
    {
        return Produit::where('uuid', $uuid)->firstOrFail();
    }

    public function update(Request $request, string $uuid)
    {
        $produit = Produit::where('uuid', $uuid)->firstOrFail();
        
        // Gestion de la categorie
        if ($request->has('categorie_nom')) {
            $categorie = \App\Models\Categorie::firstOrCreate(['nom' => $request->categorie_nom]);
            $produit->categorie_id = $categorie->id;
        }
        
        $produit->update($request->only(['nom','code','description','conditionnement','unite','prix_achat','prix_vente','seuil_alerte','stock_initial']));
        
        return response()->json(['success' => true]);
    }

    public function destroy(string $uuid)
    {
        Produit::where('uuid', $uuid)->update(['actif' => false]);
        return response()->json(['success' => true]);
    }

    public function approvisionner(Request $request, $uuid)
    {
        $produit = Produit::where('uuid', $uuid)->firstOrFail();
        
        $request->validate([
            'quantite' => 'required|numeric|min:0',
            'prix_achat_unitaire' => 'nullable|numeric|min:0',
            'prix_vente_unitaire' => 'nullable|numeric|min:0',
            'fournisseur' => 'nullable|string',
            'reference' => 'nullable|string',
        ]);
        
        $appro = Approvisionnement::create([
            'uuid' => Str::uuid(),
            'produit_id' => $produit->id,
            'quantite' => $request->quantite,
            'prix_achat_unitaire' => $request->prix_achat_unitaire ?? $produit->prix_achat,
            'prix_vente_unitaire' => $request->prix_vente_unitaire ?? $produit->prix_vente,
            'fournisseur' => $request->fournisseur,
            'reference' => $request->reference,
            'user_id' => $request->user()->id,
        ]);
        
        if ($request->prix_achat_unitaire) $produit->prix_achat = $request->prix_achat_unitaire;
        if ($request->prix_vente_unitaire) $produit->prix_vente = $request->prix_vente_unitaire;
        $produit->stock = $produit->stockLogique();
        $produit->save();
        
        return response()->json(['success' => true, 'stock_logique' => $produit->stockLogique()]);
    }
}
