<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemandeRemboursement;
use App\Models\Vente;
use App\Services\ComptabiliteService;
use App\Services\ScoreSolvabiliteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RemboursementController extends Controller
{
    public function index(Request $request)
    {
        $demandes = DemandeRemboursement::with(['vente.debiteur', 'demandeur:id,nom,prenom', 'validateur:id,nom,prenom'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($demandes);
    }

    public function store(Request $request)
    {
        $request->validate([
            'vente_id' => 'required|exists:ventes,uuid',
        ]);

        $vente = Vente::where('uuid', $request->vente_id)->firstOrFail();

        if ($vente->montantCreditPaye() <= 0) { abort(422, 'Aucun paiement à rembourser.'); }
        if ($vente->statut !== 'en_cours') {
            abort(422, 'Vente non éligible au remboursement.');
        }

        if ($vente->demandeRemboursement()->whereIn('statut', ['en_attente','validee'])->exists()) {
            abort(422, 'Une demande est déjà en cours ou validée pour cette vente.');
        }

        $demande = DemandeRemboursement::create([
            'uuid' => Str::uuid(),
            'vente_id' => $vente->id,
            'demandeur_id' => auth()->id(),
            'montant_credit_paye' => $vente->montantCreditPaye(),
            'montant_rembourse' => round($vente->montantCreditPaye() * 0.5, 2),
            'montant_epargne_rembourse' => $vente->montantEpargnePaye(),
            'statut' => 'en_attente',
        ]);

        return response()->json([
            'success' => true,
            'demande' => $demande,
        ]);
    }

    public function valider(Request $request, string $uuid)
    {
        $demande = null;

        DB::transaction(function () use ($uuid, $request, &$demande) {
            $demande = DemandeRemboursement::where('uuid', $uuid)->lockForUpdate()->firstOrFail();

            if ($demande->statut !== 'en_attente') {
                abort(422, 'Demande déjà traitée.');
            }

            $vente = $demande->vente()->lockForUpdate()->first();

            // 1. Restitution stock + traçage
            foreach ($vente->venteProduits as $vp) {
                if ($vp->produit) {
                    $avant = (int) $vp->produit->stock;
                    $vp->produit->increment('stock', $vp->quantite);
                    \App\Models\MouvementStock::create([
                        'uuid' => Str::uuid(),
                        'produit_id' => $vp->produit_id,
                        'user_id' => auth()->id(),
                        'type' => 'retour',
                        'action' => 'remboursement',
                        'quantite' => $vp->quantite,
                        'prix_unitaire' => $vp->prix_unitaire,
                        'stock_avant' => $avant,
                        'stock_apres' => $avant + $vp->quantite,
                        'motif' => 'Remboursement vente #' . substr($vente->uuid, 0, 8),
                        'created_at' => now(),
                    ]);
                }
            }

            // 2. Échéances restantes annulées
            $vente->echeances()
                ->whereIn('statut', ['en_attente', 'en_retard'])
                ->update(['statut' => 'annule', 'jours_retard' => 0]);

            // 3. Recouvrements marqués remboursés
            $vente->recouvrements()
                ->where('statut', 'paye')
                ->update(['statut' => 'rembourse']);

            // 4. Comptabilité
            ComptabiliteService::contrepasserVente($vente, auth()->id());
            ComptabiliteService::ecrireRemboursement($vente, $demande, auth()->id());

            // 5. Vente annulée
            $vente->update([
                'statut' => 'annule',
                'motif_annulation' => 'incapacite_paiement',
            ]);

            $demande->update([
                'statut' => 'validee',
                'validateur_id' => auth()->id(),
                'date_validation' => now(),
                'commentaire_gerante' => $request->commentaire,
            ]);
        });

        if ($demande->vente->debiteur) {
            app(ScoreSolvabiliteService::class)->calculer($demande->vente->debiteur);
        }

        return response()->json(['success' => true, 'message' => 'Remboursement validé.']);
    }

    public function rejeter(Request $request, string $uuid)
    {
        $demande = DemandeRemboursement::where('uuid', $uuid)->firstOrFail();

        if ($demande->statut !== 'en_attente') {
            abort(422, 'Demande déjà traitée.');
        }

        $demande->update([
            'statut' => 'rejetee',
            'validateur_id' => auth()->id(),
            'date_validation' => now(),
            'commentaire_gerante' => $request->commentaire,
        ]);

        return response()->json(['success' => true, 'message' => 'Demande rejetée.']);
    }
}
