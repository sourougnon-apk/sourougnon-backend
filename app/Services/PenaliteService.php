<?php

namespace App\Services;

use App\Models\Vente;
use App\Models\Recouvrement;
use App\Models\Echeance;
use App\Models\Penalite;
use Illuminate\Support\Str;

class PenaliteService
{
    /**
     * Recalculer les pénalités en attente de façon idempotente.
     * Une seule pénalité par échéance.
     */
    public static function genererEnAttente(): void
    {
        $aujourdhui = now()->toDateString();

        $echeances = Echeance::whereDate('date_echeance', '<', $aujourdhui)
            ->whereIn('statut', ['en_retard', 'partiel'])
            ->get();

        foreach ($echeances as $echeance) {
            $jours = max(1, $echeance->date_echeance->diffInDays(now()->startOfDay()));
            $montant = $jours * $echeance->vente->penalite_par_jour;

            Penalite::updateOrCreate(
                ['echeance_id' => $echeance->id],
                [
                    'vente_id'       => $echeance->vente_id,
                    'debiteur_id'    => $echeance->vente->debiteur_id,
                    'montant'        => $montant,
                    'jours_retard'   => $jours,
                    'date_appliquee' => $aujourdhui,
                    'statut'         => 'en_attente',
                ]
            );
        }
    }

    /**
     * Générer les pénalités pour les échéances payées en retard.
     */
    /**
     * Désactivée temporairement : la génération de pénalités sur échéances payées
     * crée des pénalités fantômes en cas de paiement groupé.
     * À réactiver après correction du rattachement des recouvrements aux échéances.
     */
    public static function genererPenalitesRetardPaye(): void
    {
        // Ne fait volontairement rien.
    }

    /**
     * Appliquer les pénalités lors d'un paiement.
     */
    public static function appliquer(Vente $vente, Recouvrement $recouvrement): void
    {
        $aujourdhui = now()->toDateString();
        $echeancesRetard = Echeance::where('vente_id', $vente->id)
            ->whereDate('date_echeance', '<', $aujourdhui)
            ->whereNotIn('statut', ['paye'])
            ->get();

        foreach ($echeancesRetard as $echeance) {
            $jours = $echeance->date_echeance->diffInDays(now());
            if ($jours <= 0) continue;

            Penalite::updateOrCreate(
                ['echeance_id' => $echeance->id],
                [
                    'vente_id'       => $vente->id,
                    'recouvrement_id' => $recouvrement->id,
                    'debiteur_id'    => $vente->debiteur_id,
                    'montant'        => $jours * $vente->penalite_par_jour,
                    'jours_retard'   => $jours,
                    'date_appliquee' => $aujourdhui,
                    'statut'         => 'en_attente',
                ]
            );
        }
    }
}
