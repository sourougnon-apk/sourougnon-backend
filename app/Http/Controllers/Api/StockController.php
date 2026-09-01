<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MouvementStock;
use App\Models\Produit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StockController extends Controller
{
    public function index()
    {
        $produits = Produit::where('actif', true)->get();
        $nbProduits = $produits->count();
        
        // Calcul basé sur les produits actifs (source de vérité unique)
        $valeurAchat = $produits->sum(function($p) { 
            return ($p->stock ?? 0) * ($p->prix_achat ?? 0); 
        });
        
        $valeurVente = $produits->sum(function($p) { 
            return ($p->stock ?? 0) * ($p->prix_vente ?? 0); 
        });
        
        $caAttendu = $valeurVente - $valeurAchat;

        return response()->json([
            'nb_produits' => $nbProduits,
            'valeur_totale_achat' => $valeurAchat,
            'valeur_totale_vente' => $valeurVente,
            'ca_attendu' => $caAttendu,
            'produits' => $produits
        ]);
    }

    public function mouvements()
    {
        $mouvements = MouvementStock::with(['produit', 'user'])->latest()->get();
        return response()->json($mouvements);
    }

    public function entree(Request $request)
    {
        $request->validate([
            'produit_id' => 'required|exists:produits,uuid',
            'quantite' => 'required|numeric|min:0.01',
        ]);

        $produit = Produit::where('uuid', $request->produit_id)->firstOrFail();
        $quantite = $request->quantite;
        $prixAchat = $request->prix_achat ?? $produit->prix_achat ?? 0;
        $prixVente = $request->prix_vente ?? $produit->prix_vente ?? 0;

        $stockAvant = $produit->stock;
        $stockApres = $stockAvant + $quantite;

        MouvementStock::create([
            'uuid' => Str::uuid(),
            'produit_id' => $produit->id,
            'user_id' => $request->user()->id,
            'type' => 'entree',
            'action' => 'creation',
            'quantite' => $quantite,
            'prix_unitaire' => $prixAchat,
            'stock_avant' => $stockAvant,
            'stock_apres' => $stockApres,
            'fournisseur' => $request->fournisseur,
            'reference' => $request->reference,
            'created_at' => now(),
        ]);

        $produit->prix_achat = $prixAchat;
        $produit->prix_vente = $prixVente;
        $produit->stock = $stockApres;
        $produit->save();

        return response()->json(['success' => true, 'stock' => $stockApres]);
    }

    public function sortie(Request $request)
    {
        $request->validate([
            'produit_id' => 'required|exists:produits,uuid',
            'quantite' => 'required|numeric|min:0.01',
        ]);

        $produit = Produit::where('uuid', $request->produit_id)->firstOrFail();
        $quantite = $request->quantite;
        $stockAvant = $produit->stock;
        $stockApres = $stockAvant - $quantite;
        if ($stockApres < 0) {
            return response()->json(['error' => 'Stock insuffisant. Stock actuel : ' . $stockAvant], 422);
        }

        MouvementStock::create([
            'uuid' => Str::uuid(),
            'produit_id' => $produit->id,
            'user_id' => $request->user()->id,
            'type' => 'sortie',
            'action' => 'creation',
            'quantite' => $quantite,
            'prix_unitaire' => $request->prix_vente_unitaire ?? $produit->prix_vente ?? 0,
            'stock_avant' => $stockAvant,
            'stock_apres' => $stockApres,
            'motif' => $request->motif,
            'created_at' => now(),
        ]);

        $produit->stock = $stockApres;
        $produit->save();

        return response()->json(['success' => true, 'stock' => $stockApres]);
    }

    public function inventaire(Request $request)
    {
        $request->validate([
            'produit_id' => 'required|exists:produits,uuid',
            'stock_reel' => 'required|numeric|min:0',
        ]);

        $produit = Produit::where('uuid', $request->produit_id)->firstOrFail();
        $stockAvant = $produit->stock;
        $stockReel = $request->stock_reel;
        $ecart = $stockReel - $stockAvant;

        MouvementStock::create([
            'uuid' => Str::uuid(),
            'produit_id' => $produit->id,
            'user_id' => $request->user()->id,
            'type' => 'inventaire',
            'action' => 'inventaire',
            'quantite' => abs($ecart),
            'prix_unitaire' => $request->prix_achat ?? $produit->prix_achat ?? 0,
            'stock_avant' => $stockAvant,
            'stock_apres' => $stockReel,
            'motif' => $request->motif ?? 'Inventaire',
            'created_at' => now(),
        ]);

        $produit->stock = $stockReel;
        if ($request->prix_achat) $produit->prix_achat = $request->prix_achat;
        if ($request->prix_vente) $produit->prix_vente = $request->prix_vente;
        $produit->save();

        return response()->json(['success' => true, 'ecart' => $ecart]);
    }

    public function updateMouvement(Request $request, $id)
    {
        $mouvement = MouvementStock::findOrFail($id);
        
        // Créer un nouveau mouvement de type modification
        $newMouvement = MouvementStock::create([
            'uuid' => Str::uuid(),
            'produit_id' => $mouvement->produit_id,
            'user_id' => $request->user()->id,
            'type' => $mouvement->type,
            'action' => 'modification',
            'quantite' => $request->quantite ?? $mouvement->quantite,
            'prix_unitaire' => $request->prix_unitaire ?? $mouvement->prix_unitaire,
            'stock_avant' => $mouvement->stock_avant,
            'stock_apres' => $mouvement->stock_apres,
            'fournisseur' => $request->fournisseur ?? $mouvement->fournisseur,
            'motif' => 'Modification du mouvement #' . $mouvement->id,
            'created_at' => now(),
        ]);
        
        // Mettre à jour le mouvement original
        if ($request->has('quantite')) {
            $diff = $request->quantite - $mouvement->quantite;
            if ($mouvement->produit) {
                $mouvement->produit->stock += $diff;
                $mouvement->produit->save();
            }
            $mouvement->quantite = $request->quantite;
            $mouvement->stock_apres = $mouvement->stock_avant + $request->quantite;
        }
        if ($request->has('prix_unitaire')) $mouvement->prix_unitaire = $request->prix_unitaire;
        if ($request->has('fournisseur')) $mouvement->fournisseur = $request->fournisseur;
        $mouvement->save();
        
        return response()->json(['success' => true]);
    }

    public function deleteMouvement($id)
    {
        $mouvement = MouvementStock::find($id);

        if (!$mouvement) {
            return response()->json([
                "success" => false,
                "error" => "Mouvement de stock non trouvé."
            ], 404);
        }

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $produit = $mouvement->produit;

            if ($produit) {
                if (in_array($mouvement->type, ["entree", "retour"])) {
                    $produit->stock = max(0, $produit->stock - $mouvement->quantite);
                } elseif (in_array($mouvement->type, ["sortie", "vente", "perte"])) {
                    $produit->stock += $mouvement->quantite;
                }
                $produit->save();
            }

            $mouvement->delete();

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                "success" => true,
                "message" => "Mouvement supprimé avec succès."
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                "success" => false,
                "error" => "Erreur lors de la suppression : " . $e->getMessage()
            ], 500);
        }
    }
}