<?php
namespace App\Services;

use App\Models\Debiteur;
use App\Models\Vente;
use App\Models\Echeance;
use App\Models\Recouvrement;
use App\Models\Penalite;
use App\Models\ScoreSolvabilite;
use App\Models\DerogationSolvabilite;
use Illuminate\Http\Request;

class ScoreSolvabiliteService
{
    private array $poids = [
        'comportement_paiement' => 50,
        'severite_retards'      => 20,
        'credits_termines'     => 15,
        'anciennete'           => 10,
        'regularite'           => 5,
    ];

    public function calculer(Debiteur $debiteur): array
    {
        // 1. Mettre à jour proactivement les statuts des échéances du débiteur
        $ventesCredit = Vente::where('debiteur_id', $debiteur->id)
            ->where('type_vente', 'credit')
            ->get();
        
        $ventesCreditIds = $ventesCredit->pluck('id');
        
        $echeances = Echeance::whereIn('vente_id', $ventesCreditIds)->get();
        foreach ($echeances as $echeance) {
            if (method_exists($echeance, 'mettreAJourStatut')) {
                $echeance->mettreAJourStatut();
            }
        }
        // Recharger la collection après mise à jour
        $echeances = Echeance::whereIn('vente_id', $ventesCreditIds)->get();

        $recouvrementsCredit = Recouvrement::whereIn('vente_id', $ventesCreditIds)->get();
        $penalites = Penalite::where('debiteur_id', $debiteur->id)->get();

        // Cold start : < 5 échéances observées
        if ($echeances->count() < 5) {
            return $this->scoreNeutre($debiteur, $echeances->count());
        }

        $comportement     = $this->calculerComportementPaiement($echeances);
        $severite         = $this->calculerSeveriteRetards($echeances);
        $creditsTermines = $this->calculerCreditsTermines($ventesCredit);
        $anciennete       = $this->calculerAnciennete($debiteur);
        $regularite       = $this->calculerRegularite($recouvrementsCredit);

        $score = (
            $comportement * $this->poids['comportement_paiement'] / 100 +
            $severite * $this->poids['severite_retards'] / 100 +
            $creditsTermines * $this->poids['credits_termines'] / 100 +
            $anciennete * $this->poids['anciennete'] / 100 +
            $regularite * $this->poids['regularite'] / 100
        );

        $score = max(0, min(100, round($score, 2)));

        $details = [
            'comportement_paiement' => round($comportement, 2),
            'severite_retards'      => round($severite, 2),
            'credits_termines'     => round($creditsTermines, 2),
            'anciennete'           => round($anciennete, 2),
            'regularite'           => round($regularite, 2),
            'nb_echeances'          => $echeances->count(),
            'nb_retards'            => $echeances->whereIn('statut', ['en_retard'])->count(),
            'nb_partiels_tardifs'   => $echeances->where('statut', 'partiel')->where('date_echeance', '<', now())->count(),
            'nb_penalites'          => $penalites->count(),
            'poids'                 => $this->poids,
        ];

        ScoreSolvabilite::updateOrCreate(
            ['debiteur_id' => $debiteur->id],
            [
                'score'                  => $score,
                'nb_credits_total'       => $ventesCredit->count(),
                'nb_credits_termines'    => $ventesCredit->where('statut', 'termine')->count(),
                'nb_retards'             => $echeances->whereIn('statut', ['en_retard'])->count(),
                'montant_total_rembourse' => $recouvrementsCredit->where('statut', 'paye')->sum('montant'),
                'montant_total_du'       => $ventesCredit->sum('montant_total'),
                'details_calcul'         => $details,
                'historique_insuffisant' => false,
                'date_calcul'            => now(),
            ]
        );

        // Sécurisation : le score doit rester entre 0 et 100
        $score = max(0, min(100, $score));
        
        $debiteur->score_solvabilite = $score;
        $debiteur->save();

        return [
            'score'   => $score,
            'details' => $details,
            'label'   => $this->getLabel($score),
        ];
    }

    private function scoreNeutre(Debiteur $debiteur, int $nbEcheances): array
    {
        ScoreSolvabilite::updateOrCreate(
            ['debiteur_id' => $debiteur->id],
            [
                'score'                  => 50,
                'historique_insuffisant' => true,
                'details_calcul'         => ['raison' => 'Historique insuffisant (' . $nbEcheances . ' echeances)', 'score_neutre' => 50],
                'date_calcul'            => now(),
            ]
        );

        $debiteur->update(['score_solvabilite' => 50]);

        return ['score' => 50, 'details' => ['historique_insuffisant' => true], 'label' => 'Neutre'];
    }

    private function calculerComportementPaiement($echeances): float
    {
        $score = 0;
        $totalPoids = 0;
        $now = now();

        foreach ($echeances as $echeance) {
            $joursEcoules = $echeance->date_echeance->diffInDays($now);
            $poidsRecence = exp(-$joursEcoules / 90);

            $scorePonctuel = match($echeance->statut) {
                'paye'    => 100,
                'partiel' => 50,
                default   => 0,
            };

            $score += $scorePonctuel * $poidsRecence;
            $totalPoids += $poidsRecence;
        }

        return $totalPoids > 0 ? $score / $totalPoids : 0;
    }

    private function calculerSeveriteRetards($echeances): float
    {
        $now = now();
        $retards = $echeances->filter(function($e) use ($now) {
            return $e->statut === 'en_retard' || 
                   ($e->statut === 'partiel' && $e->date_echeance->isPast());
        });

        if ($retards->isEmpty()) return 100;

        $score = 0;
        $totalPoids = 0;

        foreach ($retards as $retard) {
            // Sévérité basée sur les jours de retard réels (stockés ou calculés)
            $joursRetard = $retard->jours_retard ?: max(1, $retard->date_echeance->diffInDays($now));
            
            // Pondération temporelle (récence de l'échéance)
            $joursDepuisEcheance = max(0, $retard->date_echeance->diffInDays($now));
            $poidsRecence = exp(-$joursDepuisEcheance / 90);

            // Pénalité progressive selon la durée du retard (perte de 10 points par jour de retard)
            $severite = max(0, 100 - ($joursRetard * 10));
            
            $score += $severite * $poidsRecence;
            $totalPoids += $poidsRecence;
        }

        return $totalPoids > 0 ? $score / $totalPoids : 0;
    }

    private function calculerCreditsTermines($ventesCredit): float
    {
        $creditsTermines = $ventesCredit->where('statut', 'termine')->count();
        $ratio = min($creditsTermines / 5, 1);
        return $ratio * 100;
    }

    private function calculerAnciennete(Debiteur $debiteur): float
    {
        $mois = $debiteur->created_at->diffInMonths(now());
        $ratio = min($mois / 24, 1);
        return $ratio * 100;
    }

    private function calculerRegularite($recouvrementsCredit): float
    {
        $montants = $recouvrementsCredit
            ->where('statut', 'paye')
            ->pluck('montant')
            ->toArray();

        if (count($montants) < 2) return 50;

        $moyenne = array_sum($montants) / count($montants);
        $variance = array_sum(array_map(fn($m) => pow($m - $moyenne, 2), $montants)) / count($montants);
        $ecartType = sqrt($variance);

        $ratio = max(0, 1 - ($ecartType / max($moyenne, 1)));
        return $ratio * 100;
    }

    private function getLabel(float $score): string
    {
        if ($score >= 80) return 'Excellent';
        if ($score >= 60) return 'Bon';
        if ($score >= 40) return 'Moyen';
        if ($score >= 20) return 'Risqué';
        return 'Critique';
    }

    public function enregistrerDerogation(Debiteur $debiteur, $venteId, $motif, Request $request): void
    {
        DerogationSolvabilite::create([
            'debiteur_id'      => $debiteur->id,
            'vente_id'         => $venteId,
            'user_id'          => $request->user()->id,
            'score_au_moment'  => $debiteur->score_solvabilite ?? 0,
            'motif'            => $motif,
            'resultat_credit'  => 'en_cours',
        ]);
    }

    public function mettreAJourResultatDerogation($venteId): void
    {
        $vente = Vente::findOrFail($venteId);
        $derogation = DerogationSolvabilite::where('vente_id', $venteId)->first();
        if (!$derogation) return;

        if ($vente->statut === 'termine') {
            $aDesRetards = Echeance::where('vente_id', $venteId)
                ->where(function($q) {
                    $q->where('statut', 'en_retard')
                      ->orWhere(function($q2) {
                          $q2->where('statut', 'partiel')
                             ->where('date_echeance', '<', now());
                      });
                })
                ->exists();
            $derogation->resultat_credit = $aDesRetards ? 'termine_avec_retard' : 'termine_sans_retard';
        } elseif ($vente->statut === 'annule') {
            $derogation->resultat_credit = 'defaut';
        }
        $derogation->save();
    }
}
