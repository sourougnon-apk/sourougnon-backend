<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompteBancaire;
use App\Models\OperationBancaire;
use App\Models\MouvementCaisse;
use App\Services\CaisseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BancaireController extends Controller
{
    public function comptes()
    {
        return response()->json(CompteBancaire::where('actif', true)->get());
    }

    public function storeCompte(Request $request)
    {
        $request->validate([
            'nom' => 'required|string',
            'type' => 'required|in:courant,epargne,caisse',
            'solde_initial' => 'numeric|min:0',
        ]);

        $compte = CompteBancaire::create([
            'uuid' => (string) Str::uuid(),
            'nom' => $request->nom,
            'type' => $request->type,
            'solde_initial' => $request->solde_initial ?? 0,
        ]);

        return response()->json(['success' => true, 'compte' => $compte]);
    }

    public function solde($uuid)
    {
        $compte = CompteBancaire::where('uuid', $uuid)->firstOrFail();
        return response()->json([
            'solde' => $compte->soldeCourant(),
            'derniere_operation' => optional($compte->operationsDebit()->latest('date_operation')->first())->date_operation
                ?? optional($compte->operationsCredit()->latest('date_operation')->first())->date_operation,
        ]);
    }

    public function historique(Request $request)
    {
        $query = OperationBancaire::with(['compteDebit', 'compteCredit', 'user:id,uuid,nom,prenom'])
            ->orderByDesc('date_operation');

        if ($request->type) $query->where('type', $request->type);
        if ($request->compte_uuid) {
            $compte = CompteBancaire::where('uuid', $request->compte_uuid)->first();
            if ($compte) {
                $query->where(function($q) use ($compte) {
                    $q->where('compte_debit_id', $compte->id)
                      ->orWhere('compte_credit_id', $compte->id);
                });
            }
        }
        if ($request->debut && $request->fin) {
            $query->whereBetween('date_operation', [$request->debut . ' 00:00:00', $request->fin . ' 23:59:59']);
        }

        return response()->json($query->limit(200)->get());
    }

    public function depot(Request $request)
    {
        $request->validate([
            'compte_destinataire_uuid' => 'required|exists:comptes_bancaires,uuid',
            'montant' => 'required|numeric|min:0',
            'source' => 'required|in:caisse,externe',
            'motif' => 'nullable|string',
            'beneficiaire' => 'nullable|string',
            'beneficiaire' => 'nullable|string',
            'beneficiaire' => 'nullable|string',
        ]);

        $compteDest = CompteBancaire::where('uuid', $request->compte_destinataire_uuid)->first();
        $user = $request->user();

        return DB::transaction(function() use ($request, $compteDest, $user) {
            $mouvementCaisseId = null;

            if ($request->source === 'caisse') {
                $caisse = CaisseService::getCaisseActive($user->id, 'jour');
                if ($caisse->solde_theorique < $request->montant) {
                    return response()->json(['error' => 'Solde de caisse insuffisant.'], 422);
                }

                $mouvement = MouvementCaisse::create([
                    'uuid' => (string) Str::uuid(),
                    'caisse_id' => $caisse->id,
                    'user_id' => $user->id,
                    'type' => 'depot',
                    'montant' => $request->montant,
                    'motif' => $request->motif ?? 'Dépôt bancaire',
                    'date_mouvement' => now(),
                    'statut_validation' => 'valide',
                ]);
                $mouvementCaisseId = $mouvement->id;
                CaisseService::recalculer($caisse);
            }

            $operation = OperationBancaire::create([
                'uuid' => (string) Str::uuid(),
                'compte_credit_id' => $compteDest->id,
                'type' => 'depot',
                'montant' => $request->montant,
                'date_operation' => now(),
                'user_id' => $user->id,
                'source' => $request->source,
                'mouvement_caisse_id' => $mouvementCaisseId,
                'motif' => $request->motif,
                'beneficiaire' => $request->beneficiaire,
                'beneficiaire' => $request->beneficiaire,
                'beneficiaire' => $request->beneficiaire,
            ]);

            return response()->json(['success' => true, 'operation' => $operation]);
        });
    }

    public function retrait(Request $request)
    {
        $request->validate([
            'compte_source_uuid' => 'required|exists:comptes_bancaires,uuid',
            'montant' => 'required|numeric|min:0',
            'source' => 'required|in:caisse,externe',
            'motif' => 'nullable|string',
        ]);

        $compteSrc = CompteBancaire::where('uuid', $request->compte_source_uuid)->first();
        $user = $request->user();

        if ($compteSrc->soldeCourant() < $request->montant) {
            return response()->json(['error' => 'Solde du compte bancaire insuffisant.'], 422);
        }

        return DB::transaction(function() use ($request, $compteSrc, $user) {
            $mouvementCaisseId = null;

            if ($request->source === 'caisse') {
                $caisse = CaisseService::getCaisseActive($user->id, 'jour');
                $mouvement = MouvementCaisse::create([
                    'uuid' => (string) Str::uuid(),
                    'caisse_id' => $caisse->id,
                    'user_id' => $user->id,
                    'type' => 'retrait',
                    'montant' => $request->montant,
                    'motif' => $request->motif ?? 'Retrait bancaire',
                    'date_mouvement' => now(),
                    'statut_validation' => 'valide',
                ]);
                $mouvementCaisseId = $mouvement->id;
                CaisseService::recalculer($caisse);
            }

            $operation = OperationBancaire::create([
                'uuid' => (string) Str::uuid(),
                'compte_debit_id' => $compteSrc->id,
                'type' => 'retrait',
                'montant' => $request->montant,
                'date_operation' => now(),
                'user_id' => $user->id,
                'source' => $request->source,
                'mouvement_caisse_id' => $mouvementCaisseId,
                'motif' => $request->motif,
            ]);

            return response()->json(['success' => true, 'operation' => $operation]);
        });
    }

    public function transfert(Request $request)
    {
        $request->validate([
            'compte_source_uuid' => 'required|exists:comptes_bancaires,uuid',
            'compte_destinataire_uuid' => 'required|exists:comptes_bancaires,uuid|different:compte_source_uuid',
            'montant' => 'required|numeric|min:0',
            'motif' => 'nullable|string',
        ]);

        $src = CompteBancaire::where('uuid', $request->compte_source_uuid)->first();
        $dest = CompteBancaire::where('uuid', $request->compte_destinataire_uuid)->first();
        $user = $request->user();

        if ($src->soldeCourant() < $request->montant) {
            return response()->json(['error' => 'Solde du compte source insuffisant.'], 422);
        }

        $group = (string) Str::uuid();

        return DB::transaction(function() use ($src, $dest, $user, $request, $group) {
            $opDebit = OperationBancaire::create([
                'uuid' => (string) Str::uuid(),
                'compte_debit_id' => $src->id,
                'type' => 'transfert',
                'montant' => $request->montant,
                'date_operation' => now(),
                'user_id' => $user->id,
                'source' => 'externe',
                'transfert_group' => $group,
                'motif' => $request->motif,
            ]);

            $opCredit = OperationBancaire::create([
                'uuid' => (string) Str::uuid(),
                'compte_credit_id' => $dest->id,
                'type' => 'transfert',
                'montant' => $request->montant,
                'date_operation' => now(),
                'user_id' => $user->id,
                'source' => 'externe',
                'transfert_group' => $group,
                'motif' => $request->motif,
            ]);

            return response()->json(['success' => true, 'operations' => [$opDebit, $opCredit]]);
        });
    }
}
