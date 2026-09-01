<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vente;
use App\Models\Recouvrement;
use App\Models\Echeance;
use App\Models\TourneeDemarrage;
use App\Services\PaiementService;
use App\Services\CaisseService;
use App\Services\ComptabiliteService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentSpaceController extends Controller
{
    public function tournee(Request $request)
    {
        $user = $request->user();
        $aujourdhui = now()->toDateString();
        $query = Vente::where('statut', 'en_cours')
            ->whereDate('date_debut', '<=', $aujourdhui)
            ->whereDate('date_fin', '>=', $aujourdhui)
            ->with(['debiteur', 'echeances' => fn($q) => $q->whereDate('date_echeance', $aujourdhui)]);

        if ($user->role === 'agent') {
            $query->where('agent_id', $user->id);
        }

        $ventesModeles = $query->get();

        $ventes = $ventesModeles->map(function($v) use ($aujourdhui) {
            $echeance = $v->echeances->first();
            $enRetard = $v->echeances()
                ->whereDate('date_echeance', '<', $aujourdhui)
                ->whereNotIn('statut', ['paye'])
                ->exists();

            $joursTotal = max(1, $v->nombre_jours);
            $joursPayes = $v->echeances()->where('statut', 'paye')->count();

            return [
                'uuid' => $v->uuid,
                'debiteur_uuid' => $v->debiteur?->uuid,
                'debiteur' => $v->debiteur?->nom.' '.$v->debiteur?->prenom,
                'telephone' => $v->debiteur?->telephone,
                'quartier' => $v->debiteur?->quartier,
                'montant_journalier' => $echeance?->montant_prevu ?? $v->montant_journalier,
                'reste_a_payer' => $v->resteAPayer(),
                'statut_visite' => $echeance?->statut ?? 'en_attente',
                'statut_global' => $enRetard ? 'en_retard' : 'a_jour',
                'epargne_par_jour' => $v->epargne_par_jour,
                'penalite_par_jour' => $v->penalite_par_jour,
                'jours_payes' => $joursPayes,
                'jours_total' => $joursTotal,
                'peut_encaisser' => $v->echeances()
                    ->whereIn('statut', ['en_retard', 'partiel', 'en_attente'])
                    ->whereDate('date_echeance', '<=', $aujourdhui)
                    ->exists(),
            ];
        });

        $aVisiter = $ventes->whereIn('statut_visite', ['en_attente', 'en_retard'])->values();
        $paye = $ventes->where('statut_visite', 'paye')->values();
        $absent = $ventes->where('statut_visite', 'absent')->values();
        $refus = $ventes->where('statut_visite', 'refus')->values();
        $promesse = $ventes->where('statut_visite', 'promesse')->values();

        $venteIds = $ventesModeles->pluck('id');

        // Montant collecté AUJOURD'HUI : uniquement les échéances du jour payées
        $montantCollecteAujourdhui = $ventesModeles->filter(function($v) use ($aujourdhui) {
            $echeanceJour = $v->echeances->first();
            return $echeanceJour && $echeanceJour->statut === 'paye';
        })->sum(function($v) {
            return $v->echeances->first()->montant_paye;
        });

        $nbRetard = Vente::whereIn('id', $venteIds)
            ->whereHas('echeances', fn($q) => $q->whereDate('date_echeance', '<', $aujourdhui)->whereIn('statut', ['en_retard', 'partiel']))
            ->distinct('debiteur_id')
            ->count('debiteur_id');

        $soldeImpaye = $ventesModeles->sum(fn($v) => $v->resteAPayer());

        $montantRetard = Echeance::whereIn('vente_id', $venteIds)
            ->whereDate('date_echeance', '<', $aujourdhui)
            ->whereIn('statut', ['en_retard', 'partiel'])
            ->selectRaw('SUM(montant_prevu - montant_paye) as total')
            ->value('total') ?? 0;

        return response()->json([
            'a_visiter' => $aVisiter,
            'paye' => $paye,
            'absent' => $absent,
            'refus' => $refus,
            'promesse' => $promesse,
            'stats' => [
                'nb_total' => $ventes->count(),
                'nb_paye' => $paye->count(),
                'nb_absent' => $absent->count(),
                'nb_refus' => $refus->count(),
                'nb_promesse' => $promesse->count(),
                'nb_a_visiter' => $aVisiter->count(),
                'nb_retard' => $nbRetard,
                'montant_attendu' => $ventes->sum('montant_journalier'),
                'montant_collecte_aujourdhui' => $montantCollecteAujourdhui,
                'solde_impaye' => $soldeImpaye,
                'montant_retard' => $montantRetard,
            ]
        ]);
    }

    public function encaisser(Request $request)
    {
        $request->validate([
            'vente_id' => 'required|exists:ventes,uuid',
            'montant' => 'required|numeric|min:0',
            'mode_paiement' => 'required|in:especes,mobile,autre',
            'statut' => 'required|in:paye,partiel,absent,refus,promesse',
            'commentaire' => 'nullable|string|required_if:statut,absent,refus,promesse',
            'sync_uuid' => 'nullable|string|max:36',
        ]);

        $user = $request->user();
        $aujourdhui = now()->toDateString();
        $tourneeEnCours = TourneeDemarrage::where('agent_id', $user->id)
            ->where('date_tournee', $aujourdhui)
            ->where('statut', 'en_cours')
            ->exists();

        if (!$tourneeEnCours) {
            return response()->json(['error' => 'Démarrez votre tournée avant d\'encaisser.'], 422);
        }

        // Idempotence : retry offline avec le même sync_uuid -> ne jamais dupliquer
        if ($request->sync_uuid) {
            $existant = Recouvrement::where('sync_uuid', $request->sync_uuid)->first();
            if ($existant) {
                return response()->json(['success' => true, 'deja_traite' => true]);
            }
        }

        // Garde-fou : un paiement paye/partiel doit avoir un montant > 0
        if (in_array($request->statut, ['paye', 'partiel']) && $request->montant <= 0) {
            return response()->json(['error' => 'Le montant doit être supérieur à 0 pour un paiement payé ou partiel.'], 422);
        }

        $vente = Vente::where('uuid', $request->vente_id)->firstOrFail();

        $rec = Recouvrement::create([
            'uuid' => Str::uuid(),
            'sync_uuid' => $request->sync_uuid,
            'vente_id' => $vente->id,
            'agent_id' => $vente->debiteur->agent_id ?? $user->id,
            'montant' => $request->montant,
            'date_recouvrement' => now()->toDateString(),
            'heure_recouvrement' => now()->toTimeString(),
            'mode_paiement' => $request->mode_paiement,
            'statut' => $request->statut,
            'commentaire' => $request->commentaire,
            'synced' => true,
        ]);

        PaiementService::affecterPaiement($rec);

        if (in_array($request->statut, ['paye', 'partiel']) && $request->montant > 0) {
            CaisseService::enregistrerRecouvrement($rec);
            ComptabiliteService::ecrireRecouvrement($rec);
        }

        NotificationService::generer();

        return response()->json([
            'success' => true,
            'reste' => $vente->resteAPayer(),
            'message' => self::messageStatut($request->statut),
        ]);
    }

    private static function messageStatut($statut): string
    {
        return [
            'paye' => 'Paiement enregistré.',
            'partiel' => 'Paiement partiel enregistré.',
            'absent' => 'Client absent signalé.',
            'refus' => 'Refus de payer signalé.',
            'promesse' => 'Promesse de paiement enregistrée.',
        ][$statut] ?? 'OK';
    }
}
