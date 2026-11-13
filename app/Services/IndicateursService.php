<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Source unique des indicateurs du dashboard.
 *  - Encaissé  : mouvements de caisse "encaissement" validés, à la date du mouvement.
 *  - Épargne / Pénalités : mouvements "epargne" / "penalite" validés (indicateurs distincts).
 *  - Attendu   : somme des montants prévus des échéances de la période.
 *  - Taux      : montants réglés sur ces échéances / attendu, plafonné à 100 %.
 *  - Retard    : reste dû des échéances antérieures à aujourd'hui, ventes en cours.
 *  - Créances  : reste à payer des ventes en cours (règle de Vente::resteAPayer).
 */
class IndicateursService
{
    public function groupe(?int $agenceId, CarbonInterface $debut, CarbonInterface $fin): array
    {
        $d1 = $debut->toDateString();
        $d2 = $fin->toDateString();
        $jours = (int) round(abs(Carbon::parse($d1)->diffInDays(Carbon::parse($d2)))) + 1;
        $p2 = Carbon::parse($d1)->subDay()->toDateString();
        $p1 = Carbon::parse($d1)->subDays($jours)->toDateString();
        $aujourdhui = now()->toDateString();

        $agences = DB::table('agences')->orderBy('nom')->get(['id', 'nom', 'actif']);
        $cur = $this->flux($agenceId, $d1, $d2);
        $prev = $this->flux($agenceId, $p1, $p2);
        $etat = $this->etat($agenceId, $aujourdhui);

        $ptsTaux = ($cur['taux'] !== null && $prev['taux'] !== null)
            ? round($cur['taux'] - $prev['taux'], 1) : null;

        return [
            'meta' => [
                'agence_id' => $agenceId,
                'agence_nom' => $agenceId ? $agences->firstWhere('id', $agenceId)?->nom : null,
                'debut' => $d1,
                'fin' => $d2,
                'jours' => $jours,
                'precedent' => ['debut' => $p1, 'fin' => $p2],
                'genere_le' => now()->toIso8601String(),
            ],
            'agences_liste' => $agences,
            'kpis' => [
                'encaisse' => [
                    'valeur' => $cur['encaisse'],
                    'variation' => $this->variation($cur['encaisse'], $prev['encaisse']),
                ],
                'taux' => [
                    'valeur' => $cur['taux'],
                    'variation_pts' => $ptsTaux,
                    'attendu' => $cur['attendu'],
                    'regle' => $cur['regle'],
                ],
                'creances' => $etat['creances'],
                'retard' => $etat['retard'],
                'attendu' => [
                    'valeur' => $cur['attendu'],
                    'variation' => $this->variation($cur['attendu'], $prev['attendu']),
                ],
                'ventes' => [
                    'nombre' => $cur['ventes_nb'],
                    'volume' => $cur['ventes_volume'],
                    'variation' => $this->variation($cur['ventes_volume'], $prev['ventes_volume']),
                ],
                'epargne' => [
                    'valeur' => $cur['epargne'],
                    'variation' => $this->variation($cur['epargne'], $prev['epargne']),
                ],
                'penalites' => [
                    'valeur' => $cur['penalites'],
                    'variation' => $this->variation($cur['penalites'], $prev['penalites']),
                ],
                'a_valider' => $etat['a_valider'],
                'stocks_faibles' => $etat['stocks_faibles'],
                'debiteurs_actifs' => $etat['debiteurs_actifs'],
            ],
            'serie' => $this->serie($agenceId, $d1, $d2, $aujourdhui),
            'agences' => $agenceId ? [] : $this->parAgence($agences, $d1, $d2, $aujourdhui),
            'top_agents' => $this->topAgents($agenceId, $d1, $d2),
            'dossiers_retard' => $this->dossiersRetard($agenceId, $aujourdhui),
            'produits' => $this->produits($agenceId, $d1, $d2),
        ];
    }

    // ---------- Requêtes de base (filtre agence appliqué ici) ----------

    private function mouvements(string $d1, string $d2, string $type, ?int $agenceId = null, string $statut = 'valide')
    {
        return DB::table('mouvements_caisse')
            ->where('mouvements_caisse.type', $type)
            ->where('mouvements_caisse.statut_validation', $statut)
            ->whereBetween('mouvements_caisse.date_mouvement', [$d1 . ' 00:00:00', $d2 . ' 23:59:59'])
            ->when($agenceId, fn ($q) => $q->where('mouvements_caisse.agence_id', $agenceId));
    }

    private function echeances(string $d1, string $d2, ?int $agenceId = null)
    {
        return DB::table('echeances as e')
            ->join('ventes as v', 'v.id', '=', 'e.vente_id')
            ->where('v.statut', '!=', 'annule')
            ->where('e.statut', '!=', 'annule')
            ->whereBetween('e.date_echeance', [$d1, $d2])
            ->when($agenceId, fn ($q) => $q->where('v.agence_id', $agenceId));
    }

    private function retardBase(?int $agenceId, string $aujourdhui)
    {
        return DB::table('echeances as e')
            ->join('ventes as v', 'v.id', '=', 'e.vente_id')
            ->where('v.statut', 'en_cours')
            ->whereNotIn('e.statut', ['paye', 'annule'])
            ->where('e.date_echeance', '<', $aujourdhui)
            ->whereRaw('COALESCE(e.montant_paye, 0) < e.montant_prevu')
            ->when($agenceId, fn ($q) => $q->where('v.agence_id', $agenceId));
    }

    private function creancesBase(?int $agenceId)
    {
        $paye = DB::table('recouvrements')->where('statut', 'paye')
            ->selectRaw('vente_id, SUM(montant) as paye')->groupBy('vente_id');

        return DB::table('ventes as v')
            ->leftJoinSub($paye, 'r', 'r.vente_id', '=', 'v.id')
            ->where('v.statut', 'en_cours')
            ->when($agenceId, fn ($q) => $q->where('v.agence_id', $agenceId));
    }

    // ---------- Indicateurs de période ----------

    private function flux(?int $agenceId, string $d1, string $d2): array
    {
        $encaisse = (float) $this->mouvements($d1, $d2, 'encaissement', $agenceId)->sum('mouvements_caisse.montant');
        $epargne = (float) $this->mouvements($d1, $d2, 'epargne', $agenceId)->sum('mouvements_caisse.montant');
        $penalites = (float) $this->mouvements($d1, $d2, 'penalite', $agenceId)->sum('mouvements_caisse.montant');

        $ech = $this->echeances($d1, $d2, $agenceId)
            ->selectRaw('COALESCE(SUM(e.montant_prevu), 0) as attendu, COALESCE(SUM(COALESCE(e.montant_paye, 0)), 0) as regle')
            ->first();

        $ventes = $this->ventes($d1, $d2, $agenceId)
            ->selectRaw('COUNT(*) as nb, COALESCE(SUM(v.montant_total - COALESCE(v.epargne_total, v.epargne, 0)), 0) as volume')
            ->first();

        $attendu = (float) $ech->attendu;
        $regle = (float) $ech->regle;

        return [
            'encaisse' => $encaisse,
            'epargne' => $epargne,
            'penalites' => $penalites,
            'attendu' => $attendu,
            'regle' => $regle,
            'taux' => $this->taux($regle, $attendu),
            'ventes_nb' => (int) $ventes->nb,
            'ventes_volume' => (float) $ventes->volume,
        ];
    }

    private function ventes(string $d1, string $d2, ?int $agenceId = null)
    {
        return DB::table('ventes as v')
            ->where('v.statut', '!=', 'annule')
            ->whereBetween('v.date_debut', [$d1, $d2])
            ->when($agenceId, fn ($q) => $q->where('v.agence_id', $agenceId));
    }

    // ---------- Indicateurs d'état (à ce jour) ----------

    private function etat(?int $agenceId, string $aujourdhui): array
    {
        $cre = $this->creancesBase($agenceId)->selectRaw(
            'COUNT(*) as ventes, COUNT(DISTINCT v.debiteur_id) as debiteurs, '
            . 'COALESCE(SUM(GREATEST(0, v.montant_total - COALESCE(r.paye, 0))), 0) as total'
        )->first();

        $ret = $this->retardBase($agenceId, $aujourdhui)->selectRaw(
            'COALESCE(SUM(e.montant_prevu - COALESCE(e.montant_paye, 0)), 0) as montant, '
            . 'COUNT(DISTINCT v.id) as dossiers, COUNT(DISTINCT v.debiteur_id) as debiteurs'
        )->first();

        $attente = DB::table('mouvements_caisse')
            ->where('statut_validation', 'en_attente')
            ->whereIn('type', ['encaissement', 'epargne', 'penalite'])
            ->when($agenceId, fn ($q) => $q->where('agence_id', $agenceId))
            ->selectRaw('COUNT(*) as nb, COALESCE(SUM(montant), 0) as montant')->first();

        $remises = DB::table('mouvements_caisse')
            ->where('statut_validation', 'en_attente')->where('type', 'remise')
            ->when($agenceId, fn ($q) => $q->where('agence_id', $agenceId))->count();

        return [
            'creances' => [
                'valeur' => (float) $cre->total,
                'ventes' => (int) $cre->ventes,
                'debiteurs' => (int) $cre->debiteurs,
            ],
            'retard' => [
                'montant' => (float) $ret->montant,
                'dossiers' => (int) $ret->dossiers,
                'debiteurs' => (int) $ret->debiteurs,
            ],
            'a_valider' => [
                'montant' => (float) $attente->montant,
                'nombre' => (int) $attente->nb,
                'remises' => (int) $remises,
            ],
            'stocks_faibles' => (int) DB::table('stocks_agences')
                ->join('produits', 'produits.id', '=', 'stocks_agences.produit_id')
                ->where('produits.actif', 1)
                ->whereColumn('stocks_agences.quantite', '<=', 'stocks_agences.seuil_alerte')
                ->when($agenceId, fn ($q) => $q->where('stocks_agences.agence_id', $agenceId))
                ->count(),
            'debiteurs_actifs' => (int) DB::table('debiteurs')->where('actif', 1)
                ->when($agenceId, fn ($q) => $q->where('agence_id', $agenceId))->count(),
        ];
    }

    // ---------- Série journalière ----------

    private function serie(?int $agenceId, string $d1, string $d2, string $aujourdhui): array
    {
        // Au minimum 7 jours affichés, même pour la période "Aujourd'hui"
        $c1 = min($d1, Carbon::parse($d2)->subDays(6)->toDateString());

        $enc = $this->mouvements($c1, $d2, 'encaissement', $agenceId)
            ->selectRaw('DATE(mouvements_caisse.date_mouvement) as j, SUM(mouvements_caisse.montant) as t')
            ->groupBy('j')->pluck('t', 'j');

        $ech = $this->echeances($c1, $d2, $agenceId)
            ->selectRaw('e.date_echeance as j, SUM(e.montant_prevu) as attendu, '
                . 'SUM(GREATEST(e.montant_prevu - COALESCE(e.montant_paye, 0), 0)) as impaye')
            ->groupBy('e.date_echeance')->get()->keyBy('j');

        $labels = [];
        $e = [];
        $a = [];
        $i = [];
        $jour = Carbon::parse($c1);
        $fin = Carbon::parse($d2);
        while ($jour->lte($fin)) {
            $k = $jour->toDateString();
            $r = $ech[$k] ?? null;
            $labels[] = $jour->format('d/m');
            $e[] = (float) ($enc[$k] ?? 0);
            $a[] = $r ? (float) $r->attendu : 0.0;
            $i[] = ($r && $k < $aujourdhui) ? (float) $r->impaye : 0.0;
            $jour->addDay();
        }

        return ['debut' => $c1, 'fin' => $d2, 'labels' => $labels, 'encaisse' => $e, 'attendu' => $a, 'impaye' => $i];
    }

    // ---------- Comparatif par agence ----------

    private function parAgence($agences, string $d1, string $d2, string $aujourdhui): array
    {
        $enc = $this->mouvements($d1, $d2, 'encaissement')
            ->selectRaw('mouvements_caisse.agence_id as aid, SUM(mouvements_caisse.montant) as t')
            ->groupBy('mouvements_caisse.agence_id')->pluck('t', 'aid');

        $ech = $this->echeances($d1, $d2)
            ->selectRaw('v.agence_id as aid, SUM(e.montant_prevu) as attendu, SUM(COALESCE(e.montant_paye, 0)) as regle')
            ->groupBy('v.agence_id')->get()->keyBy('aid');

        $ret = $this->retardBase(null, $aujourdhui)
            ->selectRaw('v.agence_id as aid, SUM(e.montant_prevu - COALESCE(e.montant_paye, 0)) as montant, COUNT(DISTINCT v.debiteur_id) as debiteurs')
            ->groupBy('v.agence_id')->get()->keyBy('aid');

        $cre = $this->creancesBase(null)
            ->selectRaw('v.agence_id as aid, SUM(GREATEST(0, v.montant_total - COALESCE(r.paye, 0))) as total')
            ->groupBy('v.agence_id')->pluck('total', 'aid');

        $agents = DB::table('users')->where('role', 'agent')->where('actif', 1)
            ->selectRaw('agence_id as aid, COUNT(*) as n')->groupBy('agence_id')->pluck('n', 'aid');

        $chefs = DB::table('users')->where('role', 'chef_agence')->where('actif', 1)
            ->orderBy('id')->get(['agence_id', 'nom', 'prenom'])->groupBy('agence_id');

        $construire = function ($id, $nom, $actif) use ($enc, $ech, $ret, $cre, $agents, $chefs) {
            $k = $id ?? '';
            $e = $ech[$k] ?? null;
            $r = $ret[$k] ?? null;
            $attendu = $e ? (float) $e->attendu : 0.0;
            $regle = $e ? (float) $e->regle : 0.0;
            $chef = null;
            if ($id !== null && isset($chefs[$id])) {
                $c = $chefs[$id]->first();
                $chef = trim(($c->prenom ?? '') . ' ' . ($c->nom ?? ''));
            }

            return [
                'id' => $id,
                'nom' => $nom,
                'actif' => (bool) $actif,
                'chef' => $chef ?: null,
                'agents' => (int) ($agents[$k] ?? 0),
                'encaisse' => (float) ($enc[$k] ?? 0),
                'attendu' => $attendu,
                'taux' => $this->taux($regle, $attendu),
                'retard_montant' => $r ? (float) $r->montant : 0.0,
                'retard_debiteurs' => $r ? (int) $r->debiteurs : 0,
                'creances' => (float) ($cre[$k] ?? 0),
            ];
        };

        $lignes = [];
        foreach ($agences as $a) {
            $lignes[] = $construire((int) $a->id, $a->nom, $a->actif);
        }

        // Données sans agence (siège ou anomalie) : visibles, jamais perdues
        $orphelin = $construire(null, 'Sans agence', true);
        if ($orphelin['encaisse'] > 0 || $orphelin['attendu'] > 0 || $orphelin['retard_montant'] > 0 || $orphelin['creances'] > 0) {
            $lignes[] = $orphelin;
        }

        usort($lignes, fn ($a, $b) => [$b['encaisse'], $a['nom']] <=> [$a['encaisse'], $b['nom']]);
        foreach ($lignes as $n => $l) {
            $lignes[$n]['rang'] = $n + 1;
        }

        return $lignes;
    }

    // ---------- Listes ----------

    private function topAgents(?int $agenceId, string $d1, string $d2): array
    {
        return $this->mouvements($d1, $d2, 'encaissement', $agenceId)
            ->join('users as u', 'u.id', '=', 'mouvements_caisse.user_id')
            ->leftJoin('agences as a', 'a.id', '=', 'u.agence_id')
            ->where('u.role', 'agent')
            ->selectRaw('u.id as agent_id, u.nom, u.prenom, a.nom as agence, SUM(mouvements_caisse.montant) as encaisse, COUNT(*) as nb')
            ->groupBy('u.id', 'u.nom', 'u.prenom', 'a.nom')
            ->orderByDesc('encaisse')->limit(8)->get()
            ->map(fn ($r) => [
                'agent_id' => $r->agent_id,
                'nom' => $r->nom,
                'prenom' => $r->prenom,
                'agence' => $r->agence,
                'encaisse' => (float) $r->encaisse,
                'nb' => (int) $r->nb,
            ])->values()->all();
    }

    private function dossiersRetard(?int $agenceId, string $aujourdhui): array
    {
        return $this->retardBase($agenceId, $aujourdhui)
            ->leftJoin('debiteurs as d', 'd.id', '=', 'v.debiteur_id')
            ->leftJoin('users as u', 'u.id', '=', 'v.agent_id')
            ->leftJoin('agences as a', 'a.id', '=', 'v.agence_id')
            ->selectRaw(
                'v.id as vente_id, d.nom, d.prenom, d.quartier, u.nom as agent_nom, u.prenom as agent_prenom, a.nom as agence, '
                . 'SUM(e.montant_prevu - COALESCE(e.montant_paye, 0)) as montant, DATEDIFF(?, MIN(e.date_echeance)) as jours',
                [$aujourdhui]
            )
            ->groupBy('v.id', 'd.nom', 'd.prenom', 'd.quartier', 'u.nom', 'u.prenom', 'a.nom')
            ->orderByDesc('jours')->orderByDesc('montant')->limit(8)->get()
            ->map(fn ($r) => [
                'vente_id' => $r->vente_id,
                'nom' => $r->nom,
                'prenom' => $r->prenom,
                'quartier' => $r->quartier,
                'agent_nom' => $r->agent_nom,
                'agent_prenom' => $r->agent_prenom,
                'agence' => $r->agence,
                'montant' => (float) $r->montant,
                'jours' => (int) $r->jours,
            ])->values()->all();
    }

    private function produits(?int $agenceId, string $d1, string $d2): array
    {
        return DB::table('vente_produits as vp')
            ->join('ventes as v', 'v.id', '=', 'vp.vente_id')
            ->join('produits as p', 'p.id', '=', 'vp.produit_id')
            ->where('v.statut', '!=', 'annule')
            ->whereBetween('v.date_debut', [$d1, $d2])
            ->when($agenceId, fn ($q) => $q->where('v.agence_id', $agenceId))
            ->selectRaw('p.nom, SUM(vp.quantite) as quantite, SUM(vp.quantite * vp.prix_unitaire) as total')
            ->groupBy('vp.produit_id', 'p.nom')
            ->orderByDesc('quantite')->limit(5)->get()
            ->map(fn ($r) => ['nom' => $r->nom, 'quantite' => (int) $r->quantite, 'total' => (float) $r->total])
            ->values()->all();
    }

    // ---------- Utilitaires ----------

    private function taux(float $regle, float $attendu): ?float
    {
        return $attendu > 0 ? min(100.0, round($regle / $attendu * 100, 1)) : null;
    }

    private function variation(float $cur, float $prev): ?float
    {
        return $prev > 0 ? round(($cur - $prev) / $prev * 100, 1) : null;
    }
}
